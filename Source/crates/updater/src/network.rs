use crate::manifest::{Artifact, MAX_MANIFEST_BYTES};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File},
    io::{Read, Write},
    path::Path,
    sync::atomic::{AtomicBool, Ordering},
    time::Duration,
};
use url::Url;

pub fn cancelled(cancel: &AtomicBool) -> Result<(), String> {
    if cancel.load(Ordering::Relaxed) {
        Err("Update download cancelled.".into())
    } else {
        Ok(())
    }
}
fn agent(timeout: Duration) -> ureq::Agent {
    ureq::Agent::config_builder()
        .https_only(true)
        .max_redirects(0)
        .http_status_as_error(false)
        .timeout_global(Some(timeout))
        .timeout_connect(Some(Duration::from_secs(10)))
        .timeout_recv_response(Some(Duration::from_secs(20)))
        .timeout_per_read(Some(Duration::from_secs(10)))
        .build()
        .into()
}
fn response(url: &str, timeout: Duration) -> Result<ureq::http::Response<ureq::Body>, String> {
    let agent = agent(timeout);
    let mut url = Url::parse(url).map_err(|e| e.to_string())?;
    for _ in 0..6 {
        if url.scheme() != "https"
            || !matches!(
                url.host_str(),
                Some(
                    "github.com"
                        | "release-assets.githubusercontent.com"
                        | "objects.githubusercontent.com"
                )
            )
        {
            return Err(
                "The update server redirected outside GitHub's secure download hosts.".into(),
            );
        }
        let result = agent
            .get(url.as_str())
            .header("User-Agent", "Shrapwill-Updater/1")
            .call()
            .map_err(|_| "Could not reach GitHub. Check your connection and try again.")?;
        if !result.status().is_redirection() {
            return Ok(result);
        }
        let location = result
            .headers()
            .get("location")
            .and_then(|value| value.to_str().ok())
            .ok_or("Invalid GitHub redirect.")?;
        url = url.join(location).map_err(|_| "Invalid GitHub redirect.")?;
    }
    Err("GitHub returned too many redirects.".into())
}
pub fn manifest(repository: &str) -> Result<Option<Vec<u8>>, String> {
    let url =
        format!("https://github.com/{repository}/releases/latest/download/shrapwill-update.json");
    let mut result = response(&url, Duration::from_secs(20))?;
    if result.status().as_u16() == 404 || result.status().as_u16() == 204 {
        return Ok(None);
    }
    if !result.status().is_success() {
        return Err("GitHub could not provide update information. Try again later.".into());
    }
    let mut bytes = vec![];
    result
        .body_mut()
        .as_reader()
        .take(MAX_MANIFEST_BYTES as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() > MAX_MANIFEST_BYTES {
        return Err("The update information exceeds the size limit.".into());
    }
    Ok(Some(bytes))
}
pub fn download(
    artifact: &Artifact,
    destination: &Path,
    cancel: &AtomicBool,
    progress: impl Fn(u64, u64),
) -> Result<(), String> {
    cancelled(cancel)?;
    let mut result = response(&artifact.url, Duration::from_secs(3600))?;
    if !result.status().is_success() {
        return Err("The update download is not available yet. Try again later.".into());
    }
    let length = result
        .headers()
        .get("content-length")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<u64>().ok());
    if length.is_some_and(|length| length != artifact.size) {
        return Err("The update download has an unexpected size.".into());
    }
    copy_verified(
        result.body_mut().as_reader(),
        artifact,
        destination,
        Transfer { cancel, progress },
    )
}
pub struct Transfer<'a, F: Fn(u64, u64)> {
    pub cancel: &'a AtomicBool,
    pub progress: F,
}
pub fn copy_verified(
    input: impl Read,
    artifact: &Artifact,
    destination: &Path,
    transfer: Transfer<'_, impl Fn(u64, u64)>,
) -> Result<(), String> {
    let mut file = File::options()
        .write(true)
        .create_new(true)
        .open(destination)
        .map_err(|e| e.to_string())?;
    let outcome = write_verified(input, artifact, &mut file, transfer);
    drop(file);
    // A failed create_new above never authorizes deleting an existing file.
    if outcome.is_err() {
        let _ = fs::remove_file(destination);
    }
    outcome
}
fn write_verified(
    mut input: impl Read,
    artifact: &Artifact,
    file: &mut File,
    transfer: Transfer<'_, impl Fn(u64, u64)>,
) -> Result<(), String> {
    let mut digest = Sha256::new();
    let mut downloaded = 0u64;
    let mut buffer = [0u8; 64 * 1024];
    loop {
        cancelled(transfer.cancel)?;
        let count = input.read(&mut buffer).map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        downloaded = downloaded
            .checked_add(count as u64)
            .ok_or("Invalid update size.")?;
        if downloaded > artifact.size {
            return Err("The update download exceeds its signed size.".into());
        }
        digest.update(&buffer[..count]);
        file.write_all(&buffer[..count])
            .map_err(|e| e.to_string())?;
        (transfer.progress)(downloaded, artifact.size);
    }
    if downloaded != artifact.size
        || format!("{:x}", digest.finalize()) != artifact.sha256.to_ascii_lowercase()
    {
        return Err(
            "The update download failed its integrity check. Nothing was installed.".into(),
        );
    }
    file.sync_all().map_err(|e| e.to_string())
}
pub fn verify_file(path: &Path, artifact: &Artifact) -> Result<(), String> {
    if fs::metadata(path).map_err(|e| e.to_string())?.len() != artifact.size {
        return Err("The downloaded update has changed. Download it again.".into());
    }
    let hash = file_hash(path)?;
    if hash != artifact.sha256.to_ascii_lowercase() {
        return Err("The downloaded update failed verification. Download it again.".into());
    }
    Ok(())
}
pub fn file_hash(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let mut digest = Sha256::new();
    let mut buffer = [0u8; 64 * 1024];
    loop {
        let count = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        digest.update(&buffer[..count]);
    }
    Ok(format!("{:x}", digest.finalize()))
}
