use base64::{engine::general_purpose::STANDARD, Engine};
use ring::signature::{UnparsedPublicKey, ED25519};
use semver::Version;
use serde::{Deserialize, Serialize};
use url::Url;

pub const MAX_MANIFEST_BYTES: usize = 128 * 1024;
pub const MAX_ARTIFACT_BYTES: u64 = 2 * 1024 * 1024 * 1024 - 1;

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Artifact {
    pub url: String,
    pub sha256: String,
    pub size: u64,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Release {
    pub schema_version: u32,
    pub repository: String,
    pub version: String,
    pub tag: String,
    pub notes: String,
    pub portable: Artifact,
    pub installer: Artifact,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct SignedRelease {
    pub payload: String,
    pub signature: String,
}
pub fn verify(bytes: &[u8], public_key: &[u8], repository: &str) -> Result<Release, String> {
    if bytes.len() > MAX_MANIFEST_BYTES {
        return Err("The update information is too large.".into());
    }
    let envelope: SignedRelease =
        serde_json::from_slice(bytes).map_err(|_| "Invalid update information.")?;
    let payload = STANDARD
        .decode(envelope.payload)
        .map_err(|_| "Invalid update payload.")?;
    let signature = STANDARD
        .decode(envelope.signature)
        .map_err(|_| "Invalid update signature.")?;
    UnparsedPublicKey::new(&ED25519, public_key)
        .verify(&payload, &signature)
        .map_err(|_| "The update signature could not be verified. Nothing was installed.")?;
    let release: Release =
        serde_json::from_slice(&payload).map_err(|_| "Unsupported update information.")?;
    validate(&release, repository)?;
    Ok(release)
}
pub fn validate(release: &Release, repository: &str) -> Result<(), String> {
    let version = Version::parse(&release.version).map_err(|_| "Invalid update version.")?;
    if release.schema_version != 1
        || release.repository != repository
        || !version.pre.is_empty()
        || !version.build.is_empty()
        || release.tag.strip_prefix('v').unwrap_or(&release.tag) != release.version
        || release.notes.len() > 16 * 1024
    {
        return Err("This release is not a supported stable Shrapwill update.".into());
    }
    validate_artifact(&release.portable, repository, &release.tag)?;
    validate_artifact(&release.installer, repository, &release.tag)
}
fn validate_artifact(artifact: &Artifact, repository: &str, tag: &str) -> Result<(), String> {
    let url = Url::parse(&artifact.url).map_err(|_| "Invalid update download address.")?;
    let prefix = format!("/{repository}/releases/download/{tag}/");
    if url.scheme() != "https"
        || url.host_str() != Some("github.com")
        || url.port().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
        || !url.path().starts_with(&prefix)
        || url.path()[prefix.len()..].is_empty()
        || !url.path()[prefix.len()..]
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'.' | b'_' | b'-'))
        || artifact.size == 0
        || artifact.size > MAX_ARTIFACT_BYTES
        || artifact.sha256.len() != 64
        || !artifact.sha256.bytes().all(|b| b.is_ascii_hexdigit())
    {
        return Err(
            "The update download does not match this repository or its size limits.".into(),
        );
    }
    Ok(())
}
pub fn newer(release: &Release, current: &str) -> Result<bool, String> {
    let available = Version::parse(&release.version).map_err(|e| e.to_string())?;
    let installed = Version::parse(current).map_err(|e| e.to_string())?;
    Ok(available > installed)
}
