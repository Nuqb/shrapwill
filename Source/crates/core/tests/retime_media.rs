use cutline_core::media::{
    self,
    retime::{RetimeRequest, SpeedOptions},
};
use std::{
    path::PathBuf,
    sync::{atomic::AtomicBool, Arc},
};
#[test]
fn actual_media_speed_reverse_pitch_and_ramps() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../App");
    let ffmpeg = root.join("ffmpeg.exe");
    let ffprobe = root.join("ffprobe.exe");
    assert!(
        ffmpeg.is_file() && ffprobe.is_file(),
        "Bundled media tools are required for this integration check"
    );
    let temp = std::env::temp_dir().join(format!("shrapwill-speed-test-{}", cutline_core::id()));
    std::fs::create_dir_all(&temp).unwrap();
    let source = temp.join("source.mp4");
    let cancel = Arc::new(AtomicBool::new(false));
    let args = [
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=64x64:rate=30:duration=3",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=3",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-shortest",
    ]
    .map(str::to_string)
    .into_iter()
    .chain([source.to_string_lossy().into_owned()])
    .collect::<Vec<_>>();
    media::capture(&ffmpeg, &args, &cancel, 1024).unwrap();
    let asset = media::probe(&ffprobe, &source, &cancel).unwrap();
    for (index, options, expected) in [
        (
            0,
            SpeedOptions {
                rate: 2.,
                reverse: false,
                maintain_pitch: true,
                points: vec![],
            },
            1.5,
        ),
        (
            1,
            SpeedOptions {
                rate: 0.5,
                reverse: true,
                maintain_pitch: false,
                points: vec![],
            },
            6.,
        ),
        (
            2,
            SpeedOptions {
                rate: 1.,
                reverse: false,
                maintain_pitch: true,
                points: vec![[0., 2.], [1., 2.]],
            },
            1.5,
        ),
    ] {
        let destination = temp.join(index.to_string());
        let result = media::retime::render(RetimeRequest {
            ffmpeg: &ffmpeg,
            ffprobe: &ffprobe,
            asset: &asset,
            source_in: 0.,
            seconds: 3.,
            destination: &destination,
            options: &options,
            cancel: &cancel,
        })
        .unwrap();
        assert!(
            (result.duration - expected).abs() < 0.4,
            "duration {} expected {}",
            result.duration,
            expected
        );
        assert!(result.has_audio);
        assert!(PathBuf::from(result.preview_path.unwrap()).is_file());
    }
    std::fs::remove_dir_all(temp).unwrap();
}
