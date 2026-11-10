use crate::transition_sources::OriginalShader;
use std::{
    fs,
    path::{Path, PathBuf},
};

pub(super) fn runtime(directory: &Path) -> Result<PathBuf, String> {
    let helper = directory.join("transition-gpu.exe");
    #[cfg(windows)]
    if !helper.exists() {
        fs::write(
            &helper,
            include_bytes!(concat!(env!("OUT_DIR"), "/transition-gpu.exe")),
        )
        .map_err(|e| e.to_string())?;
    }
    for (name, bytes) in [
        (
            "libEGL.dll",
            include_bytes!("../../../../src-tauri/binaries/ported-angle/libEGL.dll").as_slice(),
        ),
        (
            "libGLESv2.dll",
            include_bytes!("../../../../src-tauri/binaries/ported-angle/libGLESv2.dll").as_slice(),
        ),
    ] {
        let file = directory.join(name);
        if !file.exists() {
            fs::write(file, bytes).map_err(|e| e.to_string())?;
        }
    }
    Ok(helper)
}
pub(super) fn shader(directory: &Path, entry: &OriginalShader) -> Result<PathBuf, String> {
    shader_with_strength(directory, entry, 1.)
}
pub(super) fn shader_with_strength(
    directory: &Path,
    entry: &OriginalShader,
    strength: f64,
) -> Result<PathBuf, String> {
    let file = directory.join(format!("{}.frag", entry.kind));
    fs::write(&file, format!("{}\n{}", entry.preamble, entry.body)).map_err(|e| e.to_string())?;
    if !entry.analysis.is_empty() {
        vision(directory)?;
    }
    let recipe = serde_json::json!({"sceneInputs":entry.scene_inputs,"textures":entry.textures,"passes":entry.passes,"analysis":entry.analysis,"switchInput":entry.switch_input,"curves":entry.curves,"strength":strength});
    fs::write(file.with_extension("frag.json"), recipe.to_string()).map_err(|e| e.to_string())?;
    for group in &entry.textures {
        for name in &group.files {
            let asset = directory.join(name);
            if !asset.exists() {
                fs::write(
                    asset,
                    crate::texture_assets::get(name).ok_or("Missing original texture")?,
                )
                .map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(file)
}
pub(super) fn vision(directory: &Path) -> Result<(), String> {
    for (name, bytes) in [
        (
            "onnxruntime.dll",
            include_bytes!("../../../../src-tauri/binaries/vision/onnxruntime.dll").as_slice(),
        ),
        (
            "onnxruntime_providers_shared.dll",
            include_bytes!(
                "../../../../src-tauri/binaries/vision/onnxruntime_providers_shared.dll"
            )
            .as_slice(),
        ),
        (
            "human_segmentation_pphumanseg_2023mar.onnx",
            include_bytes!(
                "../../../../src-tauri/binaries/vision/human_segmentation_pphumanseg_2023mar.onnx"
            )
            .as_slice(),
        ),
        (
            "face_detection_yunet_2023mar.onnx",
            include_bytes!(
                "../../../../src-tauri/binaries/vision/face_detection_yunet_2023mar.onnx"
            )
            .as_slice(),
        ),
    ] {
        let file = directory.join(name);
        if !file.exists() {
            fs::write(file, bytes).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
