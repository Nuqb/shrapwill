//! Verify the public update feed through the same HTTPS/signature path as the app.
use base64::{engine::general_purpose::STANDARD, Engine};
use shrapwill_updater::{manifest, network};

fn main() -> Result<(), String> {
    let expected = std::env::args()
        .nth(1)
        .ok_or("Provide the expected release version.")?;
    let config: serde_json::Value =
        serde_json::from_str(include_str!("../../../config/updates.json"))
            .map_err(|error| error.to_string())?;
    let repository = config["repository"].as_str().ok_or("Missing repository.")?;
    let key = STANDARD
        .decode(config["publicKey"].as_str().ok_or("Missing public key.")?)
        .map_err(|error| error.to_string())?;
    let bytes = network::manifest(repository)?.ok_or("No published signed update feed.")?;
    let release = manifest::verify(&bytes, &key, repository)?;
    if release.version != expected {
        return Err("The public feed does not match the expected version.".into());
    }
    println!(
        "{}",
        serde_json::json!({
            "version": release.version, "signatureVerified": true,
            "offeredToVersion090": manifest::newer(&release, "0.9.0")?,
            "installerBytes": release.installer.size, "portableBytes": release.portable.size,
        })
    );
    Ok(())
}
