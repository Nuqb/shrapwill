//! Cross-language release-format fixture runner; never executes package files.
use base64::{engine::general_purpose::STANDARD, Engine};
use shrapwill_updater::{manifest, network, portable};
use std::{env, fs, path::Path, sync::atomic::AtomicBool};

fn main() -> Result<(), String> {
    let args: Vec<_> = env::args().collect();
    if args.len() != 5 {
        return Err("Expected manifest, public key, archive and application directory.".into());
    }
    let key = STANDARD.decode(&args[2]).map_err(|e| e.to_string())?;
    let release = manifest::verify(
        &fs::read(&args[1]).map_err(|e| e.to_string())?,
        &key,
        "Nuqb/shrapwill",
    )?;
    network::verify_file(Path::new(&args[3]), &release.portable)?;
    let staged = portable::stage(
        Path::new(&args[4]),
        Path::new(&args[3]),
        portable::Stage {
            artifact: &release.portable,
            version: &release.version,
            nonce: "0123456789abcdef0123456789abcdef",
            cancel: &AtomicBool::new(false),
        },
    )?;
    println!("{}", staged.display());
    Ok(())
}
