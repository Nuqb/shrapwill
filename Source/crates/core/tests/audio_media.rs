use cutline_core::{
    media::{
        self,
        audio::{self, AudioRequest},
    },
    AudioSettings,
};
use std::{
    path::{Path, PathBuf},
    sync::{atomic::AtomicBool, Arc},
};

struct Fixture {
    dir: PathBuf,
    ffmpeg: PathBuf,
    source: PathBuf,
    cancel: media::Cancel,
}
impl Fixture {
    fn new() -> Self {
        let dir = std::env::temp_dir().join(format!("shrapwill-audio-test-{}", cutline_core::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let ffmpeg = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../App/ffmpeg.exe");
        let source = dir.join("original.wav");
        let cancel = Arc::new(AtomicBool::new(false));
        let mut args = media::strings(&[
            "-v",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "aevalsrc=0.1*sin(2*PI*440*t)|0.05*sin(2*PI*880*t):s=48000:d=4",
            "-c:a",
            "pcm_f32le",
        ]);
        args.push(source.to_string_lossy().into_owned());
        media::capture(&ffmpeg, &args, &cancel, 1024).unwrap();
        Self {
            dir,
            ffmpeg,
            source,
            cancel,
        }
    }
    fn prepare(&self, settings: &AudioSettings) -> PathBuf {
        audio::prepare(AudioRequest {
            ffmpeg: &self.ffmpeg,
            source: &self.source,
            source_in: 0.5,
            duration: 3.,
            settings,
            cache: &self.dir,
            cancel: &self.cancel,
        })
        .unwrap()
    }
    fn samples(&self, path: &Path) -> Vec<f32> {
        let args = media::strings(&[
            "-v",
            "error",
            "-i",
            &path.to_string_lossy(),
            "-map",
            "0:a:0",
            "-f",
            "f32le",
            "-ar",
            "48000",
            "-ac",
            "2",
            "pipe:1",
        ]);
        media::capture(&self.ffmpeg, &args, &self.cancel, 4_000_000)
            .unwrap()
            .as_chunks::<4>()
            .0
            .iter()
            .map(|b| f32::from_le_bytes(*b))
            .collect()
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.dir);
    }
}
fn energy(samples: &[f32], channel: usize) -> f64 {
    samples
        .iter()
        .skip(channel)
        .step_by(2)
        .map(|v| (*v as f64).powi(2))
        .sum::<f64>()
        / (samples.len() / 2) as f64
}
fn frequency(samples: &[f32]) -> f64 {
    let left: Vec<_> = samples.iter().step_by(2).copied().collect();
    let crossings = left[4800..96000]
        .windows(2)
        .filter(|p| p[0] <= 0. && p[1] > 0.)
        .count();
    crossings as f64 / 1.9
}

#[test]
fn routing_balance_pitch_eq_normalization_and_original_preservation() {
    let f = Fixture::new();
    let original = std::fs::read(&f.source).unwrap();
    let baseline = f.samples(&f.prepare(&AudioSettings::default()));
    assert_eq!(baseline.len(), 3 * 48000 * 2);
    for channel in ["left", "right", "mono", "swap"] {
        let a = AudioSettings {
            channels: channel.into(),
            ..Default::default()
        };
        let samples = f.samples(&f.prepare(&a));
        if channel == "swap" {
            assert!((energy(&samples, 0) / energy(&baseline, 1) - 1.).abs() < 0.01);
        } else {
            assert!(samples
                .as_chunks::<2>()
                .0
                .iter()
                .all(|p| (p[0] - p[1]).abs() < 1e-5));
        }
    }
    let samples = f.samples(&f.prepare(&AudioSettings {
        balance: -1.,
        ..Default::default()
    }));
    assert!(energy(&samples, 1) < 1e-12);
    let samples = f.samples(&f.prepare(&AudioSettings {
        pitch: 12.,
        ..Default::default()
    }));
    assert_eq!(samples.len(), baseline.len());
    assert!((frequency(&samples) - 880.).abs() < 3.);
    let mut eq = AudioSettings::default();
    eq.equalizer[4] = 12.;
    assert!(energy(&f.samples(&f.prepare(&eq)), 0) > energy(&baseline, 0) * 4.);
    let normalized = f.samples(&f.prepare(&AudioSettings {
        normalize: true,
        ..Default::default()
    }));
    assert!(energy(&normalized, 0) > energy(&baseline, 0) * 2.);
    assert!(normalized.iter().all(|v| v.abs() <= 0.85));
    assert_eq!(std::fs::read(&f.source).unwrap(), original);
}

#[test]
fn all_local_voice_and_cleanup_filters_render_and_keep_duration() {
    let f = Fixture::new();
    let catalog: serde_json::Value =
        serde_json::from_str(include_str!("../../../src/features/audio/presets.json")).unwrap();
    for voice_filter in catalog["filters"].as_object().unwrap().keys() {
        for voice_character in catalog["characters"].as_object().unwrap().keys() {
            let settings = AudioSettings {
                voice_filter: voice_filter.clone(),
                voice_character: voice_character.clone(),
                denoise: 0.5,
                reverb_reduction: 0.5,
                dehum: 60,
                deess: 0.3,
                wind_removal: true,
                hiss: 0.2,
                ..Default::default()
            };
            let path = f.prepare(&settings);
            assert_eq!(f.samples(&path).len(), 3 * 48000 * 2);
            assert_eq!(f.prepare(&settings), path);
        }
    }
}

#[test]
fn export_uses_processed_audio_and_ducking_across_render_boundaries() {
    use cutline_core::{render, Clip, Project, Properties};
    let f = Fixture::new();
    let ffprobe = f.ffmpeg.with_file_name("ffprobe.exe");
    let asset = media::probe(&ffprobe, &f.source, &f.cancel).unwrap();
    let mut project = Project {
        width: 64,
        height: 64,
        ..Default::default()
    };
    project.assets.push(asset.clone());
    let mut props = Properties::default();
    props.audio.pitch = 12.;
    props.audio.balance = -1.;
    let target = Clip {
        id: cutline_core::id(),
        media_id: Some(asset.id),
        name: "Music".into(),
        start: 0,
        duration: 90,
        source_in: 0.5,
        link: None,
        audio_enabled: true,
        props,
        title: None,
        transition: None,
    };
    let mut foreground = target.clone();
    foreground.id = cutline_core::id();
    foreground.start = 30;
    foreground.duration = 30;
    foreground.props = Properties::default();
    foreground.props.audio.ducking = true;
    foreground.props.audio.duck_amount = 12.;
    foreground.props.gain_db = -60.;
    project
        .tracks
        .iter_mut()
        .find(|t| t.kind == "audio")
        .unwrap()
        .clips = vec![target, foreground];
    let settings = media::ExportSettings {
        width: 64,
        height: 64,
        quality: "draft".into(),
        encoder: "software".into(),
    };
    let destination = f.dir.join("export.mp4");
    render::export(
        &f.ffmpeg,
        &project,
        &settings,
        &destination,
        &f.dir,
        &f.cancel,
        &|_| {},
    )
    .unwrap();
    let samples = f.samples(&destination);
    let before = energy(&samples[19200..76800], 0);
    let during = energy(&samples[115200..153600], 0);
    let after = energy(&samples[211200..268800], 0);
    assert!(
        (during / before - 10_f64.powf(-12. / 10.)).abs() < 0.015,
        "Ducking gain: {}",
        during / before
    );
    assert!(
        (after / before - 1.).abs() < 0.1,
        "Gain after ducking: {}",
        after / before
    );
    assert!(
        energy(&samples, 1) < 1e-7,
        "Processed balance was not used during export"
    );
    assert!((frequency(&samples) - 880.).abs() < 3.);
    // Fade Position shifts the duck interval, including past the foreground's end
    // and across the exporter's interval boundaries.
    project
        .tracks
        .iter_mut()
        .flat_map(|t| &mut t.clips)
        .find(|c| c.props.audio.ducking)
        .unwrap()
        .props
        .audio
        .duck_fade_position = 0.5;
    let shifted = f.dir.join("shifted-duck.mp4");
    render::export(
        &f.ffmpeg,
        &project,
        &settings,
        &shifted,
        &f.dir,
        &f.cancel,
        &|_| {},
    )
    .unwrap();
    let shifted = f.samples(&shifted);
    let early = energy(&shifted[105600..124800], 0);
    let late = energy(&shifted[192000..211200], 0);
    assert!((early / before - 1.).abs() < 0.1);
    assert!((late / before - 10_f64.powf(-12. / 10.)).abs() < 0.015);
}
