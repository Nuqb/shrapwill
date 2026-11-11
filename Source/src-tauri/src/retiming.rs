//! Materialize a source range outside the session lock, then commit atomically.
use crate::{session::changed, state::AppState};
use cutline_core::{
    media::{
        self,
        retime::{RetimeRequest, SpeedOptions},
    },
    Edit, MediaAsset, Project, SpeedSettings,
};
use std::{
    path::PathBuf,
    sync::{atomic::Ordering, Arc},
};
use tauri::Manager;

struct Context {
    project: Project,
    revision: u64,
    session_id: String,
    id: String,
    ripple: bool,
}
struct SourceRange<'a> {
    asset: &'a MediaAsset,
    source_in: f64,
    duration: i64,
}
struct Prepared {
    asset: MediaAsset,
    settings: Box<SpeedSettings>,
    destination: PathBuf,
}

pub(crate) fn apply(
    app: &tauri::AppHandle,
    id: String,
    options: SpeedOptions,
    ripple: bool,
) -> Result<(), String> {
    options.validate()?;
    let state = app.state::<AppState>();
    let context = Context::read(&state, id, ripple)?;
    let prepared = context.prepare(&state, &options)?;
    context.commit(app, &state, prepared)
}
impl Context {
    fn read(state: &AppState, id: String, ripple: bool) -> Result<Self, String> {
        let session = state.session.lock().unwrap();
        if state.closing.load(Ordering::Acquire) {
            return Err("The editor is closing. Wait for Shrapwill to restart.".into());
        }
        Ok(Self {
            project: session.editor.project.clone(),
            revision: session.editor.revision,
            session_id: session.updates.session_id.clone(),
            id,
            ripple,
        })
    }
    fn source(&self) -> Result<SourceRange<'_>, String> {
        let (track, clip) = self.project.clip(&self.id).ok_or("Clip not found.")?;
        if track.locked {
            return Err("Unlock the track before changing speed.".into());
        }
        let baseline = clip
            .props
            .speed
            .as_ref()
            .filter(|s| clip.source_in == 0. && clip.duration == s.rendered_duration);
        let media_id = baseline.map(|s| &s.media_id).or(clip.media_id.as_ref());
        let asset = self
            .project
            .assets
            .iter()
            .find(|a| Some(&a.id) == media_id)
            .ok_or("Select a media clip.")?;
        Ok(SourceRange {
            asset,
            source_in: baseline.map_or(clip.source_in, |s| s.source_in),
            duration: baseline.map_or(clip.duration, |s| s.duration),
        })
    }
    fn prepare(&self, state: &AppState, options: &SpeedOptions) -> Result<Prepared, String> {
        let source = self.source()?;
        let destination = state.data.join("retimed").join(cutline_core::id());
        let cancel = Arc::new(std::sync::atomic::AtomicBool::new(false));
        let asset = media::retime::render(RetimeRequest {
            ffmpeg: &state.ffmpeg,
            ffprobe: &state.ffprobe,
            asset: source.asset,
            source_in: source.source_in,
            seconds: self.project.fps.seconds(source.duration),
            destination: &destination,
            options,
            cancel: &cancel,
        })?;
        let settings = Box::new(SpeedSettings {
            media_id: source.asset.id.clone(),
            source_in: source.source_in,
            duration: source.duration,
            rendered_duration: self.project.fps.frames(asset.duration).max(1),
            rate: options.rate,
            reverse: options.reverse,
            maintain_pitch: options.maintain_pitch,
            points: options.points.clone(),
        });
        Ok(Prepared {
            asset,
            settings,
            destination,
        })
    }
    fn commit(
        self,
        app: &tauri::AppHandle,
        state: &AppState,
        prepared: Prepared,
    ) -> Result<(), String> {
        let mut session = state.session.lock().unwrap();
        if session.editor.revision != self.revision
            || session.editor.project.id != self.project.id
            || session.updates.session_id != self.session_id
            || state.closing.load(Ordering::Acquire)
        {
            let _ = std::fs::remove_dir_all(&prepared.destination);
            return Err(
                "The project changed during speed processing. Retry your speed change.".into(),
            );
        }
        if let Err(error) = session.editor.apply(Edit::Retime {
            id: self.id,
            asset: prepared.asset,
            settings: Some(prepared.settings),
            ripple: self.ripple,
        }) {
            let _ = std::fs::remove_dir_all(&prepared.destination);
            return Err(error);
        }
        changed(app, &mut session)
    }
}
