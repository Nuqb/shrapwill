fn main() {
    for name in [
        "OrtApiIndex.cs",
        "OrtSession.cs",
        "VisionModels.cs",
        "ShaderVision.cs",
        "AnimationCurves.cs",
    ] {
        println!("cargo:rerun-if-changed=../../scripts/transition-gpu/{name}");
    }
    println!("cargo:rerun-if-changed=../../scripts/transition-gpu/TransitionGpu.cs");
    println!("cargo:rerun-if-changed=../../scripts/transition-gpu/EglContext.cs");
    println!("cargo:rerun-if-changed=../../scripts/transition-gpu/ShaderTextures.cs");
    println!("cargo:rerun-if-changed=../../scripts/transition-gpu/ShaderGraph.cs");
    println!("cargo:rerun-if-changed=../../scripts/transition-gpu/ShaderVideo.cs");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("windows") {
        return;
    }
    let destination =
        std::path::PathBuf::from(std::env::var_os("OUT_DIR").unwrap()).join("transition-gpu.exe");
    let compiler =
        std::path::PathBuf::from(std::env::var_os("WINDIR").unwrap_or("C:/Windows".into()))
            .join("Microsoft.NET/Framework64/v4.0.30319/csc.exe");
    let source = std::fs::canonicalize(
        std::path::PathBuf::from(std::env::var_os("CARGO_MANIFEST_DIR").unwrap())
            .join("../../scripts/transition-gpu/TransitionGpu.cs"),
    )
    .expect("transition renderer source");
    let source = source
        .to_string_lossy()
        .trim_start_matches("\\\\?\\")
        .to_string();
    let egl = std::path::PathBuf::from(&source)
        .parent()
        .unwrap()
        .join("EglContext.cs");
    let status = std::process::Command::new(compiler)
        .args([
            "/nologo",
            "/target:exe",
            "/platform:x64",
            "/optimize+",
            "/unsafe",
            "/reference:System.Windows.Forms.dll",
            "/reference:System.Drawing.dll",
            "/reference:System.Web.Extensions.dll",
            &format!("/out:{}", destination.display()),
            &source,
            &egl.to_string_lossy(),
            &egl.with_file_name("ShaderTextures.cs").to_string_lossy(),
            &egl.with_file_name("ShaderGraph.cs").to_string_lossy(),
            &egl.with_file_name("ShaderVideo.cs").to_string_lossy(),
            &egl.with_file_name("OrtApiIndex.cs").to_string_lossy(),
            &egl.with_file_name("OrtSession.cs").to_string_lossy(),
            &egl.with_file_name("VisionModels.cs").to_string_lossy(),
            &egl.with_file_name("ShaderVision.cs").to_string_lossy(),
            &egl.with_file_name("AnimationCurves.cs").to_string_lossy(),
        ])
        .status()
        .expect("Windows transition renderer compiler");
    assert!(
        status.success(),
        "transition GPU renderer compilation failed"
    );
}
