//! Generated in-memory workloads; never opens personal projects or media.
use cutline_core::{Clip, Edit, Editor, MediaAsset, Project, Properties, Track};
use std::{
    alloc::{GlobalAlloc, Layout, System},
    hint::black_box,
    sync::atomic::{AtomicUsize, Ordering},
    time::Instant,
};

struct MeasuredAllocator;
static LIVE: AtomicUsize = AtomicUsize::new(0);
static PEAK: AtomicUsize = AtomicUsize::new(0);
fn added(bytes: usize) {
    let current = LIVE.fetch_add(bytes, Ordering::Relaxed) + bytes;
    PEAK.fetch_max(current, Ordering::Relaxed);
}
unsafe impl GlobalAlloc for MeasuredAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let pointer = unsafe { System.alloc(layout) };
        if !pointer.is_null() {
            added(layout.size());
        }
        pointer
    }
    unsafe fn dealloc(&self, pointer: *mut u8, layout: Layout) {
        LIVE.fetch_sub(layout.size(), Ordering::Relaxed);
        unsafe {
            System.dealloc(pointer, layout);
        }
    }
    unsafe fn realloc(&self, pointer: *mut u8, layout: Layout, size: usize) -> *mut u8 {
        let next = unsafe { System.realloc(pointer, layout, size) };
        if !next.is_null() {
            LIVE.fetch_sub(layout.size(), Ordering::Relaxed);
            added(size);
        }
        next
    }
}
#[global_allocator]
static ALLOCATOR: MeasuredAllocator = MeasuredAllocator;

fn fixture(count: usize) -> Project {
    let mut project = Project {
        id: "benchmark".into(),
        ..Project::default()
    };
    project.assets = (0..(count / 10).clamp(1, 100))
        .map(|i| MediaAsset {
            id: format!("media-{i}"),
            path: format!("generated-{i}.mp4"),
            name: format!("Generated {i}"),
            kind: "video".into(),
            duration: 3600.,
            width: 1280,
            height: 720,
            has_audio: true,
            preview_path: None,
            thumbnail_path: None,
            missing: false,
            waveform: (0..1800)
                .map(|sample| ((sample + i) % 100) as f32 / 100.)
                .collect::<Vec<_>>()
                .into(),
        })
        .collect();
    project.tracks = (0..4)
        .map(|i| Track {
            id: format!("track-{i}"),
            name: format!("Track {i}"),
            kind: if i % 2 == 0 { "video" } else { "audio" }.into(),
            locked: false,
            muted: false,
            visible: true,
            clips: vec![],
        })
        .collect();
    for i in 0..count {
        project.tracks[i % 4].clips.push(Clip {
            id: format!("clip-{i}"),
            media_id: Some(format!("media-{}", (i / 2) % project.assets.len())),
            name: format!("Clip {i}"),
            start: (i / 4) as i64 * 30,
            duration: 30,
            source_in: 0.,
            link: Some(format!("link-{}", i / 2)),
            audio_enabled: true,
            props: Properties::default(),
            title: None,
            transition: None,
        });
    }
    project
}

fn main() {
    let count = std::env::args()
        .nth(1)
        .unwrap_or("1000".into())
        .parse::<usize>()
        .unwrap();
    if std::env::args().nth(2).as_deref() == Some("transport") {
        transport(count);
        return;
    }
    if std::env::args().nth(2).as_deref() == Some("index") {
        index_fixture(count);
        return;
    }
    if std::env::args().nth(2).as_deref() == Some("replay") {
        replay(count);
        return;
    }
    let mut editor = Editor::new(fixture(count));
    editor.project.validate().unwrap();
    let initial = LIVE.load(Ordering::Relaxed);
    PEAK.store(initial, Ordering::Relaxed);
    let mut times = vec![];
    for i in 0..100 {
        let props = Properties {
            brightness: (i % 20) as f64 / 100.,
            ..Properties::default()
        };
        let start = Instant::now();
        editor
            .apply(Edit::Properties {
                id: "clip-0".into(),
                props,
            })
            .unwrap();
        times.push(start.elapsed().as_secs_f64() * 1000.);
        black_box(&editor.project);
    }
    let retained = LIVE.load(Ordering::Relaxed);
    let peak = PEAK.load(Ordering::Relaxed);
    times.sort_by(f64::total_cmp);
    println!(
        "{}",
        serde_json::json!({"clips": count, "edits": 100, "editMedianMs": times[50], "editP95Ms": times[95], "initialHeapBytes": initial, "retainedHeapBytes": retained, "peakHeapBytes": peak})
    );
}

fn transport_snapshot(project: Project) -> cutline_core::sync::Snapshot {
    cutline_core::sync::Snapshot {
        render: cutline_core::render::plan(&project, true).ok(),
        project,
        path: None,
        dirty: true,
        revision: 1,
        can_undo: true,
        can_redo: false,
        can_paste: false,
        session_id: String::new(),
        sequence: 0,
    }
}

fn transport(count: usize) {
    let mut project = fixture(count);
    let mut state = cutline_core::sync::PublishedState::default();
    state.publish(transport_snapshot(project.clone()));
    let mut full_bytes = 0;
    let mut delta_bytes = 0;
    let mut full_times = vec![];
    let mut delta_times = vec![];
    for i in 0..105 {
        project.tracks[0].clips[0].props.brightness = (i % 20) as f64 / 100.;
        let snapshot = transport_snapshot(project.clone());
        let mut legacy = snapshot.clone();
        if let Some(render) = &mut legacy.render {
            render.playback_index = None;
        }
        let start = Instant::now();
        let first = serde_json::to_vec(&legacy).unwrap();
        let second = serde_json::to_vec(&legacy).unwrap();
        let full_ms = start.elapsed().as_secs_f64() * 1000.;
        let start = Instant::now();
        let update = state.publish(snapshot);
        let compact = serde_json::to_vec(&update).unwrap();
        let ack = serde_json::to_vec(
            &serde_json::json!({"updateSequence":state.sequence,"sessionId":state.session_id}),
        )
        .unwrap();
        let delta_ms = start.elapsed().as_secs_f64() * 1000.;
        if i >= 5 {
            full_bytes += first.len() + second.len();
            delta_bytes += compact.len() + ack.len();
            full_times.push(full_ms);
            delta_times.push(delta_ms);
        }
        black_box((first, second, compact, ack));
    }
    full_times.sort_by(f64::total_cmp);
    delta_times.sort_by(f64::total_cmp);
    println!(
        "{}",
        serde_json::json!({"clips":count,"edits":100,"legacyBytes":full_bytes,"deltaBytes":delta_bytes,
        "legacyMedianMs":full_times[50],"deltaMedianMs":delta_times[50],"legacyP95Ms":full_times[95],"deltaP95Ms":delta_times[95]})
    );
}

fn index_fixture(count: usize) {
    let plan = cutline_core::render::plan(&fixture(count), true).unwrap();
    let intervals: Vec<_> = plan
        .clips
        .iter()
        .map(|c| (c.clip.start, c.clip.start + c.clip.duration))
        .collect();
    let mut build = vec![];
    let mut serialize = vec![];
    for _ in 0..105 {
        let start = Instant::now();
        let index = shrapwill_kernels::PlaybackIndex::build(intervals.iter().copied());
        build.push(start.elapsed().as_secs_f64() * 1000.);
        let start = Instant::now();
        black_box(serde_json::to_vec(&index).unwrap());
        serialize.push(start.elapsed().as_secs_f64() * 1000.);
    }
    build.drain(..5);
    serialize.drain(..5);
    build.sort_by(f64::total_cmp);
    serialize.sort_by(f64::total_cmp);
    println!(
        "{}",
        serde_json::json!({"width":plan.width,"height":plan.height,"duration":plan.duration,"fps":plan.fps,
        "clips":plan.clips.iter().map(|c| serde_json::json!({"clip":{"start":c.clip.start,"duration":c.clip.duration}})).collect::<Vec<_>>(),
        "playbackIndex":plan.playback_index,"rustBuildMedianMs":build[50],"rustSerializeMedianMs":serialize[50]})
    );
}

fn replay(count: usize) {
    let mut project = fixture(count);
    let mut state = cutline_core::sync::PublishedState::default();
    let mut records = vec![];
    for step in 0..10 {
        match step {
            1 => project.tracks[0].clips[0].props.brightness = 0.25,
            2 => project.assets[0].waveform = vec![0.2, 0.7, 0.1].into(),
            3 => project.tracks[0].clips[0].start = 90,
            4 => project.tracks.reverse(),
            5 => {
                project.tracks.remove(0);
            }
            6 => project.tracks[0].clips.reverse(),
            8 => state.reset_session(),
            _ => {}
        }
        let mut snapshot = transport_snapshot(project.clone());
        if step >= 7 {
            snapshot.dirty = false;
            snapshot.path = Some("generated.cutline".into());
        }
        if step == 9 {
            snapshot.render = None;
        }
        let update = state.publish(snapshot);
        records.push(serde_json::json!({"update":update,"expected":state.current()}));
    }
    println!("{}", serde_json::to_string(&records).unwrap());
}
