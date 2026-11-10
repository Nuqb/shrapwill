use serde::Deserialize;
use std::{
    fs,
    path::{Path, PathBuf},
    sync::{Mutex, OnceLock},
    time::{Duration, Instant},
};

#[derive(Deserialize)]
pub struct AnalysisFrame {
    pub mode: String,
    pub width: u32,
    pub height: u32,
    pub pixels: Vec<u8>,
}

// Bounded ephemeral frames only. No media is sent outside this computer.
pub fn analyze_frame(cache: &Path, frame: AnalysisFrame) -> Result<serde_json::Value, String> {
    if !["face", "person"].contains(&frame.mode.as_str())
        || frame.width == 0
        || frame.height == 0
        || frame.width > 512
        || frame.height > 512
        || frame.pixels.len() != (frame.width * frame.height * 4) as usize
    {
        return Err("Invalid local analysis frame".into());
    }
    static WORKER: Mutex<()> = Mutex::new(());
    let _guard = WORKER
        .lock()
        .map_err(|_| "Local analysis worker unavailable")?;
    static RUNTIME: OnceLock<PathBuf> = OnceLock::new();
    let directory =
        RUNTIME.get_or_init(|| cache.join(format!("analysis-runtime-{}", crate::model::id())));
    fs::create_dir_all(directory).map_err(|e| e.to_string())?;
    let result = run(directory, frame);
    for name in ["input.rgba", "output.json"] {
        let _ = fs::remove_file(directory.join(name));
    }
    result
}
fn run(directory: &Path, frame: AnalysisFrame) -> Result<serde_json::Value, String> {
    let executable = super::original_resources::runtime(directory)?;
    super::original_resources::vision(directory)?;
    let input = directory.join("input.rgba");
    let output = directory.join("output.json");
    fs::write(&input, frame.pixels).map_err(|e| e.to_string())?;
    let mut child = crate::media::command(&executable)
        .args([
            "--analyze",
            &frame.mode,
            &frame.width.to_string(),
            &frame.height.to_string(),
            &input.to_string_lossy(),
            &output.to_string_lossy(),
        ])
        .spawn()
        .map_err(|e| e.to_string())?;
    let started = Instant::now();
    loop {
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
            if !status.success() {
                return Err("Local subject analysis failed".into());
            }
            break;
        }
        if started.elapsed() > Duration::from_secs(15) {
            let _ = child.kill();
            let _ = child.wait();
            return Err("Local subject analysis timed out".into());
        }
        std::thread::sleep(Duration::from_millis(10));
    }
    serde_json::from_slice(&fs::read(output).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}
