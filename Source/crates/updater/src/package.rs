use crate::network::cancelled;
use flate2::read::GzDecoder;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashSet,
    fs::File,
    io::{Read, Write},
    path::Path,
    sync::atomic::AtomicBool,
};

pub const MAGIC: &[u8] = b"SHRAPWILL-UPDATE-1\n";
const MAX_TOTAL: u64 = 8 * 1024 * 1024 * 1024;
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Entry {
    pub path: String,
    pub size: u64,
    pub sha256: String,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Package {
    pub version: String,
    pub files: Vec<Entry>,
}
pub fn allowed_path(path: &str) -> bool {
    matches!(
        path,
        "shrapwill.exe" | "shrapwill-launcher.exe" | "ffmpeg.exe" | "ffprobe.exe"
    ) || (path.starts_with("notices/") || path.starts_with("icons/"))
        && path.split('/').count() == 2
        && path.len() < 180
        && path.split('/').all(safe_part)
}
fn safe_part(part: &str) -> bool {
    let stem = part.split('.').next().unwrap_or("").to_ascii_uppercase();
    !part.is_empty()
        && part != "."
        && part != ".."
        && !part.ends_with('.')
        && !matches!(
            stem.as_str(),
            "CON"
                | "PRN"
                | "AUX"
                | "NUL"
                | "COM1"
                | "COM2"
                | "COM3"
                | "COM4"
                | "COM5"
                | "COM6"
                | "COM7"
                | "COM8"
                | "COM9"
                | "LPT1"
                | "LPT2"
                | "LPT3"
                | "LPT4"
                | "LPT5"
                | "LPT6"
                | "LPT7"
                | "LPT8"
                | "LPT9"
        )
        && part
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'.' | b'_' | b'-'))
}
fn header(input: &mut impl Read, version: &str) -> Result<Package, String> {
    let mut magic = vec![0; MAGIC.len()];
    input.read_exact(&mut magic).map_err(|e| e.to_string())?;
    if magic != MAGIC {
        return Err("Unsupported update package.".into());
    }
    let mut length = [0; 4];
    input.read_exact(&mut length).map_err(|e| e.to_string())?;
    let length = u32::from_le_bytes(length) as usize;
    if length > 128 * 1024 {
        return Err("The update package header is too large.".into());
    }
    let mut bytes = vec![0; length];
    input.read_exact(&mut bytes).map_err(|e| e.to_string())?;
    let package: Package =
        serde_json::from_slice(&bytes).map_err(|_| "Invalid update package header.")?;
    validate(&package, version)?;
    Ok(package)
}
pub fn validate(package: &Package, version: &str) -> Result<(), String> {
    let mut paths = HashSet::new();
    let mut total = 0u64;
    if package.version != version || package.files.len() > 128 {
        return Err("The update package version or file count is invalid.".into());
    }
    for file in &package.files {
        total = total
            .checked_add(file.size)
            .ok_or("Update package size overflow.")?;
        if !allowed_path(&file.path)
            || !paths.insert(file.path.to_ascii_lowercase())
            || total > MAX_TOTAL
            || file.size == 0
            || file.sha256.len() != 64
            || !file.sha256.bytes().all(|b| b.is_ascii_hexdigit())
        {
            return Err("The update package contains an unsafe file or invalid size.".into());
        }
    }
    if ![
        "shrapwill.exe",
        "shrapwill-launcher.exe",
        "ffmpeg.exe",
        "ffprobe.exe",
    ]
    .iter()
    .all(|name| paths.contains(*name))
    {
        return Err("The update package is missing required application files.".into());
    }
    Ok(())
}
pub fn extract(
    archive: &Path,
    destination: &Path,
    version: &str,
    cancel: &AtomicBool,
) -> Result<Package, String> {
    let mut input = GzDecoder::new(File::open(archive).map_err(|e| e.to_string())?);
    let package = header(&mut input, version)?;
    for entry in &package.files {
        extract_entry(&mut input, destination, entry, cancel)?;
    }
    let mut extra = [0u8; 1];
    if input.read(&mut extra).map_err(|e| e.to_string())? != 0 {
        return Err("Unexpected data after the update package.".into());
    }
    Ok(package)
}
fn extract_entry(
    input: &mut impl Read,
    destination: &Path,
    entry: &Entry,
    cancel: &AtomicBool,
) -> Result<(), String> {
    let path = destination.join(&entry.path);
    std::fs::create_dir_all(path.parent().ok_or("Invalid update directory.")?)
        .map_err(|e| e.to_string())?;
    let mut output = File::options()
        .write(true)
        .create_new(true)
        .open(path)
        .map_err(|e| e.to_string())?;
    let mut remaining = entry.size;
    let mut digest = Sha256::new();
    let mut buffer = [0u8; 64 * 1024];
    while remaining > 0 {
        cancelled(cancel)?;
        let count = remaining.min(buffer.len() as u64) as usize;
        input
            .read_exact(&mut buffer[..count])
            .map_err(|e| e.to_string())?;
        output
            .write_all(&buffer[..count])
            .map_err(|e| e.to_string())?;
        digest.update(&buffer[..count]);
        remaining -= count as u64;
    }
    if format!("{:x}", digest.finalize()) != entry.sha256.to_ascii_lowercase() {
        return Err("An application file failed verification.".into());
    }
    output.sync_all().map_err(|e| e.to_string())
}
