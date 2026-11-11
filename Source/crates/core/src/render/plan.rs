use super::*;
#[derive(Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RenderClip {
    pub clip: Clip,
    pub track_id: String,
    pub kind: String,
    pub source: String,
    pub width: u32,
    pub height: u32,
    pub audible: bool,
    pub preview_ready: bool,
}
#[derive(Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RenderPlan {
    pub width: u32,
    pub height: u32,
    pub fps: crate::FrameRate,
    pub duration: i64,
    pub clips: Vec<RenderClip>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub playback_index: Option<shrapwill_kernels::PlaybackIndex>,
}
pub fn plan(p: &Project, preview: bool) -> Result<RenderPlan, String> {
    p.validate()?;
    let mut clips = vec![];
    for track in p.tracks.iter().rev() {
        for c in &track.clips {
            if let Some(clip) = render_clip(p, track, c, preview)? {
                clips.push(clip);
            }
        }
    }
    sort_clips(p, &mut clips);
    Ok(RenderPlan {
        playback_index: (preview && clips.len() >= 32).then(|| {
            shrapwill_kernels::PlaybackIndex::build(
                clips
                    .iter()
                    .map(|c| (c.clip.start, c.clip.start + c.clip.duration)),
            )
        }),
        width: p.width,
        height: p.height,
        fps: p.fps.clone(),
        duration: p.duration(),
        clips,
    })
}
fn sort_clips(p: &Project, clips: &mut [RenderClip]) {
    // Earlier clips are below later clips within a track, including incoming dissolves.
    let order: std::collections::HashMap<_, _> = p
        .tracks
        .iter()
        .rev()
        .enumerate()
        .map(|(i, t)| (t.id.as_str(), i))
        .collect();
    clips.sort_by_key(|c| (*order.get(c.track_id.as_str()).unwrap_or(&0), c.clip.start));
}
fn render_clip(
    p: &Project,
    track: &crate::Track,
    clip: &Clip,
    preview: bool,
) -> Result<Option<RenderClip>, String> {
    let (source, width, height, audio) = clip_source(p, clip, preview)?;
    let audible = audio && clip.audio_enabled && !track.muted;
    if (track.kind == "video" && !track.visible || track.kind == "audio") && !audible {
        return Ok(None);
    }
    let ready = !preview
        || clip.title.is_some()
        || clip
            .media_id
            .as_ref()
            .and_then(|id| p.assets.iter().find(|a| &a.id == id))
            .and_then(|a| a.preview_path.as_ref())
            .is_some_and(|path| Path::new(path).is_file());
    Ok(Some(RenderClip {
        clip: {
            let mut c = clip.clone();
            c.props = c.props.effective_picture();
            c
        },
        track_id: track.id.clone(),
        kind: if track.kind == "video" && !track.visible {
            "audio".into()
        } else {
            track.kind.clone()
        },
        source,
        width,
        height,
        audible,
        preview_ready: ready,
    }))
}
fn clip_source(
    p: &Project,
    clip: &Clip,
    preview: bool,
) -> Result<(String, u32, u32, bool), String> {
    if let Some(title) = &clip.title {
        return Ok((
            title
                .image_path
                .clone()
                .ok_or("Title image is not ready.")?,
            p.width,
            p.height,
            false,
        ));
    }
    let asset = p
        .assets
        .iter()
        .find(|a| Some(&a.id) == clip.media_id.as_ref())
        .ok_or("Media is not in the project.")?;
    if asset.missing {
        return Err(format!("Relink {} before rendering.", asset.name));
    }
    let source = if preview {
        asset
            .preview_path
            .clone()
            .filter(|path| Path::new(path).is_file())
            .unwrap_or(asset.path.clone())
    } else {
        asset.path.clone()
    };
    Ok((source, asset.width, asset.height, asset.has_audio))
}
