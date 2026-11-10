use crate::{manifest::Artifact, network, package};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::AtomicBool,
};

pub fn root(executable: &Path) -> Option<PathBuf> {
    let parent = executable.parent()?;
    let filename = executable.file_name()?.to_str()?;
    if filename.starts_with("shrapwill-") && parent.join("current-release.txt").is_file() {
        return Some(parent.to_path_buf());
    }
    let releases = parent.parent()?;
    let root = releases.parent()?;
    (filename == "shrapwill.exe"
        && releases.file_name()? == "releases"
        && root.join("current-release.txt").is_file()
        && root.join("shrapwill.exe").is_file())
    .then(|| root.to_path_buf())
}
/// Creates an immutable version directory. The caller atomically switches the
/// launcher reference only after every file and the launcher have been verified.
pub struct Stage<'a> {
    pub artifact: &'a Artifact,
    pub version: &'a str,
    pub nonce: &'a str,
    pub cancel: &'a AtomicBool,
}
pub fn stage(root: &Path, archive: &Path, options: Stage<'_>) -> Result<PathBuf, String> {
    let Stage {
        artifact,
        version,
        nonce,
        cancel,
    } = options;
    let parsed = semver::Version::parse(version).map_err(|_| "Invalid update version.")?;
    if !parsed.pre.is_empty() || !parsed.build.is_empty() {
        return Err("Only stable updates can be installed.".into());
    }
    if nonce.len() != 32 || !nonce.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err("Invalid update staging identifier.".into());
    }
    network::verify_file(archive, artifact)?;
    let root = root.canonicalize().map_err(|e| e.to_string())?;
    let releases = root.join("releases");
    fs::create_dir_all(&releases)
        .map_err(|_| "The application folder is not writable. Nothing was installed.")?;
    if !releases
        .canonicalize()
        .map_err(|e| e.to_string())?
        .starts_with(&root)
    {
        return Err("The releases folder points outside this application.".into());
    }
    let staging = root.join(format!(".shrapwill-update-{nonce}"));
    fs::create_dir(&staging).map_err(|e| e.to_string())?;
    let outcome = package::extract(archive, &staging, version, cancel).and_then(|_| {
        network::cancelled(cancel)?;
        let destination = releases.join(format!("shrapwill-{version}-{nonce}"));
        fs::rename(&staging, &destination).map_err(|e| e.to_string())?;
        Ok(destination)
    });
    if outcome.is_err() && staging.parent() == Some(root.as_path()) {
        // Only this freshly created, uniquely named updater directory is removed.
        let _ = fs::remove_dir_all(&staging);
    }
    outcome
}
pub fn reference(root: &Path, release: &Path) -> Result<String, String> {
    let root = root.canonicalize().map_err(|e| e.to_string())?;
    let release = release.canonicalize().map_err(|e| e.to_string())?;
    let relative = release
        .strip_prefix(&root)
        .map_err(|_| "The new release is outside this application.")?;
    let parts: Vec<_> = relative.components().collect();
    if parts.len() != 2 || parts[0].as_os_str() != "releases" {
        return Err("Invalid release location.".into());
    }
    Ok(format!(
        "{}/shrapwill.exe",
        relative.to_string_lossy().replace('\\', "/")
    ))
}
