use super::{manifest::*, network, package, portable};
use base64::{engine::general_purpose::STANDARD, Engine};
use flate2::{write::GzEncoder, Compression};
use ring::signature::{Ed25519KeyPair, KeyPair};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{Cursor, Write},
    sync::atomic::AtomicBool,
};

fn artifact(name: &str, bytes: &[u8]) -> Artifact {
    Artifact {
        url: format!("https://github.com/Nuqb/shrapwill/releases/download/v1.2.3/{name}"),
        size: bytes.len() as u64,
        sha256: format!("{:x}", Sha256::digest(bytes)),
    }
}
fn release() -> Release {
    Release {
        schema_version: 1,
        repository: "Nuqb/shrapwill".into(),
        version: "1.2.3".into(),
        tag: "v1.2.3".into(),
        notes: "Generated test release".into(),
        portable: artifact("release.shrapwill.gz", b"test"),
        installer: artifact("setup.exe", b"test"),
    }
}
#[test]
fn signatures_reject_tampering_wrong_keys_and_downgrades() {
    let key = Ed25519KeyPair::from_seed_unchecked(&[42; 32]).unwrap();
    let payload = serde_json::to_vec(&release()).unwrap();
    let envelope = SignedRelease {
        payload: STANDARD.encode(&payload),
        signature: STANDARD.encode(key.sign(&payload).as_ref()),
    };
    let encoded = serde_json::to_vec(&envelope).unwrap();
    let verified = verify(&encoded, key.public_key().as_ref(), "Nuqb/shrapwill").unwrap();
    assert!(newer(&verified, "1.2.2").unwrap());
    assert!(!newer(&verified, "1.2.3").unwrap());
    assert!(!newer(&verified, "2.0.0").unwrap());
    let other = Ed25519KeyPair::from_seed_unchecked(&[43; 32]).unwrap();
    assert!(verify(&encoded, other.public_key().as_ref(), "Nuqb/shrapwill").is_err());
    let changed = SignedRelease {
        payload: STANDARD.encode(b"tampered"),
        ..envelope
    };
    assert!(verify(
        &serde_json::to_vec(&changed).unwrap(),
        key.public_key().as_ref(),
        "Nuqb/shrapwill"
    )
    .is_err());
}
#[test]
fn manifests_reject_other_repositories_insecure_urls_and_prereleases() {
    for url in [
        "http://github.com/Nuqb/shrapwill/releases/download/v1.2.3/a.exe",
        "https://github.com/other/repo/releases/download/v1.2.3/a.exe",
        "https://github.com@evil.example/a.exe",
        "https://github.com/Nuqb/shrapwill/releases/download/v1.2.3/../a.exe",
    ] {
        let mut candidate = release();
        candidate.installer.url = url.into();
        assert!(validate(&candidate, "Nuqb/shrapwill").is_err());
    }
    let mut candidate = release();
    candidate.version = "1.2.3-beta".into();
    assert!(validate(&candidate, "Nuqb/shrapwill").is_err());
    candidate.version = "1.2.3".into();
    candidate.portable.size = MAX_ARTIFACT_BYTES + 1;
    assert!(validate(&candidate, "Nuqb/shrapwill").is_err());
}
fn archive(files: &[(&str, &[u8])], version: &str) -> Vec<u8> {
    let header = package::Package {
        version: version.into(),
        files: files
            .iter()
            .map(|(path, bytes)| package::Entry {
                path: (*path).into(),
                size: bytes.len() as u64,
                sha256: format!("{:x}", Sha256::digest(bytes)),
            })
            .collect(),
    };
    let header = serde_json::to_vec(&header).unwrap();
    let mut output = GzEncoder::new(vec![], Compression::fast());
    output.write_all(package::MAGIC).unwrap();
    output
        .write_all(&(header.len() as u32).to_le_bytes())
        .unwrap();
    output.write_all(&header).unwrap();
    for (_, bytes) in files {
        output.write_all(bytes).unwrap();
    }
    output.finish().unwrap()
}
fn files() -> Vec<(&'static str, &'static [u8])> {
    vec![
        ("shrapwill.exe", b"new editor"),
        ("shrapwill-launcher.exe", b"launcher"),
        ("ffmpeg.exe", b"media tool"),
        ("ffprobe.exe", b"probe"),
    ]
}
#[test]
fn portable_staging_preserves_existing_editor_and_original_media() {
    let root = tempfile::tempdir().unwrap();
    fs::write(
        root.path().join("current-release.txt"),
        "shrapwill-1.0.0.exe\n",
    )
    .unwrap();
    fs::write(root.path().join("shrapwill-1.0.0.exe"), b"running editor").unwrap();
    fs::write(root.path().join("original.mp4"), b"original media").unwrap();
    let bytes = archive(&files(), "1.2.3");
    let source = root.path().join("download.gz");
    fs::write(&source, &bytes).unwrap();
    let staged = portable::stage(
        root.path(),
        &source,
        portable::Stage {
            artifact: &artifact("release.gz", &bytes),
            version: "1.2.3",
            nonce: "0123456789abcdef0123456789abcdef",
            cancel: &AtomicBool::new(false),
        },
    )
    .unwrap();
    assert_eq!(
        fs::read(staged.join("shrapwill.exe")).unwrap(),
        b"new editor"
    );
    assert_eq!(
        fs::read(root.path().join("shrapwill-1.0.0.exe")).unwrap(),
        b"running editor"
    );
    assert_eq!(
        fs::read(root.path().join("original.mp4")).unwrap(),
        b"original media"
    );
    assert_eq!(
        fs::read_to_string(root.path().join("current-release.txt")).unwrap(),
        "shrapwill-1.0.0.exe\n"
    );
    assert!(portable::reference(root.path(), &staged)
        .unwrap()
        .starts_with("releases/shrapwill-1.2.3-"));
}
#[test]
fn extraction_rejects_traversal_duplicates_wrong_versions_and_truncation() {
    for extra in ["../original.mp4", "notices/CON.txt", "shrapwill.exe"] {
        let root = tempfile::tempdir().unwrap();
        let mut entries = files();
        entries.push((extra, b"bad"));
        let source = root.path().join("bad.gz");
        fs::write(&source, archive(&entries, "1.2.3")).unwrap();
        assert!(package::extract(
            &source,
            &root.path().join("stage"),
            "1.2.3",
            &AtomicBool::new(false)
        )
        .is_err());
        assert!(!root.path().join("original.mp4").exists());
    }
    let root = tempfile::tempdir().unwrap();
    let source = root.path().join("bad.gz");
    let mut bytes = archive(&files(), "1.2.3");
    bytes.truncate(bytes.len() - 8);
    fs::write(&source, bytes).unwrap();
    assert!(package::extract(
        &source,
        &root.path().join("stage"),
        "1.2.3",
        &AtomicBool::new(false)
    )
    .is_err());
    assert!(package::extract(
        &source,
        &root.path().join("other"),
        "1.2.4",
        &AtomicBool::new(false)
    )
    .is_err());
}
#[test]
fn downloads_reject_corruption_size_overruns_and_cancellation() {
    let root = tempfile::tempdir().unwrap();
    let expected = artifact("setup.exe", b"expected");
    for (bytes, cancelled) in [
        (b"tampered".as_slice(), false),
        (b"expected-too-long".as_slice(), false),
        (b"expected".as_slice(), true),
    ] {
        let file = root
            .path()
            .join(format!("download-{}-{}", bytes.len(), cancelled));
        assert!(network::copy_verified(
            Cursor::new(bytes),
            &expected,
            &file,
            network::Transfer {
                cancel: &AtomicBool::new(cancelled),
                progress: |_, _| {}
            }
        )
        .is_err());
        assert!(
            !file.exists(),
            "failed downloads must remove their own partial file"
        );
    }
    let existing = root.path().join("existing");
    fs::write(&existing, b"preserved").unwrap();
    assert!(network::copy_verified(
        Cursor::new(b"expected"),
        &expected,
        &existing,
        network::Transfer {
            cancel: &AtomicBool::new(false),
            progress: |_, _| {}
        }
    )
    .is_err());
    assert_eq!(fs::read(existing).unwrap(), b"preserved");
}
