use super::*;
#[derive(Clone, Serialize)]
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
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderPlan {
    pub width: u32,
    pub height: u32,
    pub fps: crate::FrameRate,
    pub duration: i64,
    pub clips: Vec<RenderClip>,
}
pub fn plan(p: &Project, preview: bool) -> Result<RenderPlan, String> {
    p.validate()?;
    let mut clips = vec![];
    for track in p.tracks.iter().rev() {
        for c in &track.clips {
            let (source, w, h, has_audio) = if let Some(title) = &c.title {
                (
                    title
                        .image_path
                        .clone()
                        .ok_or("Title image is not ready.")?,
                    p.width,
                    p.height,
                    false,
                )
            } else {
                let a = p
                    .assets
                    .iter()
                    .find(|a| Some(&a.id) == c.media_id.as_ref())
                    .ok_or("Media is not in the project.")?;
                if a.missing {
                    return Err(format!("Relink {} before rendering.", a.name));
                }
                (
                    if preview {
                        a.preview_path
                            .clone()
                            .filter(|path| Path::new(path).is_file())
                            .unwrap_or(a.path.clone())
                    } else {
                        a.path.clone()
                    },
                    a.width,
                    a.height,
                    a.has_audio,
                )
            };
            let audible = has_audio && c.audio_enabled && !track.muted;
            if (track.kind == "video" && !track.visible || track.kind == "audio") && !audible {
                continue;
            }
            clips.push(RenderClip {
                preview_ready: !preview
                    || c.title.is_some()
                    || c.media_id
                        .as_ref()
                        .and_then(|id| p.assets.iter().find(|a| &a.id == id))
                        .and_then(|a| a.preview_path.as_ref())
                        .is_some_and(|path| Path::new(path).is_file()),
                clip: c.clone(),
                track_id: track.id.clone(),
                kind: if track.kind == "video" && !track.visible {
                    "audio".into()
                } else {
                    track.kind.clone()
                },
                source,
                width: w,
                height: h,
                audible,
            });
        }
    }
    // Earlier clips are below later clips within a track, including incoming dissolves.
    let order: std::collections::HashMap<_, _> = p
        .tracks
        .iter()
        .rev()
        .enumerate()
        .map(|(i, t)| (t.id.as_str(), i))
        .collect();
    clips.sort_by_key(|c| (*order.get(c.track_id.as_str()).unwrap_or(&0), c.clip.start));
    Ok(RenderPlan {
        width: p.width,
        height: p.height,
        fps: p.fps.clone(),
        duration: p.duration(),
        clips,
    })
}
