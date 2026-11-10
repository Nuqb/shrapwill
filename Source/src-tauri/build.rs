fn main() {
    println!("cargo:rerun-if-changed=../scripts/update-helper/UpdateHelper.cs");
    println!("cargo:rerun-if-changed=../config/updates.json");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        let compiler = std::path::PathBuf::from(std::env::var_os("WINDIR").unwrap())
            .join("Microsoft.NET/Framework64/v4.0.30319/csc.exe");
        let output = std::path::PathBuf::from(std::env::var_os("OUT_DIR").unwrap())
            .join("shrapwill-update-helper.exe");
        let status = std::process::Command::new(compiler)
            .args([
                "/nologo",
                "/target:winexe",
                "/optimize+",
                "/reference:System.Windows.Forms.dll",
            ])
            .arg(format!("/out:{}", output.display()))
            .arg("UpdateHelper.cs")
            .current_dir(
                std::path::PathBuf::from(std::env::var_os("CARGO_MANIFEST_DIR").unwrap())
                    .join("..")
                    .join("scripts")
                    .join("update-helper"),
            )
            .status()
            .expect("Windows update helper compiler");
        assert!(
            status.success(),
            "Could not build the update handoff helper"
        );
    }
    tauri_build::build()
}
