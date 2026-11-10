use cutline_core::{media, render, *};
use std::{
    fs,
    path::PathBuf,
    sync::{atomic::AtomicBool, Arc},
};
fn main() -> Result<(), String> {
    let out = PathBuf::from(std::env::args().nth(1).unwrap_or("../qa".into()));
    fs::create_dir_all(&out).map_err(|e| e.to_string())?;
    let out = media::clean_path(&fs::canonicalize(out).map_err(|e| e.to_string())?);
    let bin = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../src-tauri/binaries");
    let ff = bin.join("ffmpeg-x86_64-pc-windows-msvc.exe");
    let fp = bin.join("ffprobe-x86_64-pc-windows-msvc.exe");
    let cancel = Arc::new(AtomicBool::new(false));
    let video = out.join("1080p reference.mp4");
    let audio = out.join("Reference audio.wav");
    if !video.exists() {
        media::capture(
            &ff,
            &media::strings(&[
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-f",
                "lavfi",
                "-i",
                "testsrc2=s=1920x1080:r=30:d=12",
                "-c:v",
                "libx264",
                "-preset",
                "ultrafast",
                "-crf",
                "25",
                "-pix_fmt",
                "yuv420p",
                "-threads",
                "4",
                &video.to_string_lossy(),
            ]),
            &cancel,
            65536,
        )?;
    }
    if !audio.exists() {
        media::capture(
            &ff,
            &media::strings(&[
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-f",
                "lavfi",
                "-i",
                "sine=frequency=220:sample_rate=48000:duration=60",
                "-c:a",
                "pcm_s16le",
                &audio.to_string_lossy(),
            ]),
            &cancel,
            65536,
        )?;
    }
    let mut p = Project {
        name: "Ten-minute reference · 100 clips".into(),
        ..Default::default()
    };
    for src in [&video, &audio] {
        let a = media::probe(&fp, src, &cancel)?;
        p.assets.push(media::prepare(
            &ff,
            &out.join("reference-cache"),
            a,
            720,
            &cancel,
            &|_| {},
        )?);
    }
    let v = p.assets[0].id.clone();
    let a = p.assets[1].id.clone();
    let clip = |mid: String, name: &str, start, duration, props: Properties| Clip {
        id: model::id(),
        media_id: Some(mid),
        name: name.into(),
        start,
        duration,
        source_in: 0.,
        link: None,
        audio_enabled: true,
        props,
        title: None,
        transition: None,
    };
    p.tracks[0].clips = (0..50)
        .map(|i| {
            clip(
                v.clone(),
                "Main picture",
                i * 360,
                360,
                Properties::default(),
            )
        })
        .collect();
    p.tracks.insert(
        0,
        Track {
            id: model::id(),
            name: "Picture in picture".into(),
            kind: "video".into(),
            locked: false,
            muted: false,
            visible: true,
            clips: (0..25)
                .map(|i| {
                    clip(
                        v.clone(),
                        "Second angle",
                        i * 720,
                        360,
                        Properties {
                            scale: 0.35,
                            x: 530.,
                            y: 300.,
                            rotation: -4.,
                            ..Default::default()
                        },
                    )
                })
                .collect(),
        },
    );
    p.tracks[2].clips = (0..10)
        .map(|i| {
            clip(
                a.clone(),
                "Music bed",
                i * 1800,
                1800,
                Properties {
                    gain_db: -12.,
                    ..Default::default()
                },
            )
        })
        .collect();
    p.tracks.push(Track {
        id: model::id(),
        name: "Audio 2".into(),
        kind: "audio".into(),
        locked: false,
        muted: false,
        visible: true,
        clips: (0..10)
            .map(|i| {
                clip(
                    a.clone(),
                    "Second audio layer",
                    i * 1800,
                    1800,
                    Properties {
                        gain_db: -18.,
                        fade_in: 30,
                        fade_out: 30,
                        ..Default::default()
                    },
                )
            })
            .collect(),
    });
    p.tracks.insert(
        0,
        Track {
            id: model::id(),
            name: "Titles".into(),
            kind: "video".into(),
            locked: false,
            muted: false,
            visible: true,
            clips: (0..5)
                .map(|i| Clip {
                    id: model::id(),
                    media_id: None,
                    name: "A new perspective".into(),
                    start: i * 3600 + 150,
                    duration: 150,
                    source_in: 0.,
                    link: None,
                    audio_enabled: false,
                    props: Properties::default(),
                    title: Some(Title {
                        text: format!("A NEW PERSPECTIVE / 0{}", i + 1),
                        style: "lower".into(),
                        font_size: 64.,
                        color: "#ffffff".into(),
                        image_path: None,
                    }),
                    transition: None,
                })
                .collect(),
        },
    );
    render::prepare_titles(&mut p, &out.join("reference-cache"))?;
    p.validate()?;
    assert_eq!(p.duration(), 18000);
    assert_eq!(p.tracks.iter().map(|t| t.clips.len()).sum::<usize>(), 100);
    model::atomic_write(
        &out.join("Reference-100-clips.cutline"),
        &serde_json::to_vec_pretty(&p).unwrap(),
    )?;
    println!("Reference project ready: {}", out.display());
    Ok(())
}
