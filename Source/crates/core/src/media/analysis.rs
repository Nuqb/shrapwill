use super::*;

fn waveform_bytes(ffmpeg: &Path, a: &MediaAsset, cancel: &Cancel) -> Result<Vec<u8>, String> {
    capture(
        ffmpeg,
        &strings(&[
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            &a.path,
            "-vn",
            "-ac",
            "1",
            "-ar",
            "1000",
            "-f",
            "u8",
            "pipe:1",
        ]),
        cancel,
        16 * 1024 * 1024,
    )
}

pub(super) fn waveform(
    ffmpeg: &Path,
    dir: &Path,
    a: &mut MediaAsset,
    cancel: &Cancel,
) -> Result<(), String> {
    if !a.has_audio {
        return Ok(());
    }
    {
        let wave = dir.join("waveform.json");
        if let Ok(bytes) = fs::read(&wave) {
            a.waveform = serde_json::from_slice(&bytes).unwrap_or_default();
        }
        if a.waveform.is_empty() {
            let bytes = waveform_bytes(ffmpeg, a, cancel)?;
            let bucket = bytes.len().div_ceil(1800).max(1);
            a.waveform = bytes
                .chunks(bucket)
                .map(|chunk| {
                    chunk
                        .iter()
                        .map(|&v| (v as f32 - 128.).abs() / 128.)
                        .fold(0., f32::max)
                })
                .collect();
            let _ = fs::write(wave, serde_json::to_vec(&a.waveform).unwrap());
        }
    }
    Ok(())
}
