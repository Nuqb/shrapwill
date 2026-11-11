//! Local desktop state transport. Project persistence is deliberately unchanged.
use crate::{render::RenderPlan, Clip, MediaAsset, Project, Track};
use serde::Serialize;
use serde_json::{json, Value};
use std::collections::HashMap;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub project: Project,
    pub path: Option<String>,
    pub dirty: bool,
    pub revision: u64,
    pub can_undo: bool,
    pub can_redo: bool,
    pub can_paste: bool,
    pub render: Option<RenderPlan>,
    pub session_id: String,
    pub sequence: u64,
}

#[derive(Serialize)]
pub struct EntityPatch<T> {
    pub upsert: Vec<T>,
    pub removed: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub order: Option<Vec<String>>,
}
fn entities<'a, T: Clone + PartialEq + 'a>(
    old: impl IntoIterator<Item = &'a T>,
    new: impl IntoIterator<Item = &'a T>,
    id: impl Fn(&T) -> &str,
) -> EntityPatch<T> {
    let old: Vec<_> = old.into_iter().collect();
    let new: Vec<_> = new.into_iter().collect();
    let previous: HashMap<_, _> = old.iter().map(|entry| (id(entry), entry)).collect();
    let next: HashMap<_, _> = new.iter().map(|entry| (id(entry), entry)).collect();
    EntityPatch {
        upsert: new
            .iter()
            .filter(|entry| previous.get(id(entry)).is_none_or(|old| **old != **entry))
            .map(|entry| (*entry).clone())
            .collect(),
        removed: old
            .iter()
            .filter(|entry| !next.contains_key(id(entry)))
            .map(|entry| id(entry).into())
            .collect(),
        order: (!old
            .iter()
            .map(|entry| id(entry))
            .eq(new.iter().map(|entry| id(entry))))
        .then(|| new.iter().map(|entry| id(entry).into()).collect()),
    }
}

#[derive(Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TrackHeader {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub locked: bool,
    pub muted: bool,
    pub visible: bool,
    pub clip_ids: Vec<String>,
}
impl From<&Track> for TrackHeader {
    fn from(track: &Track) -> Self {
        Self {
            id: track.id.clone(),
            name: track.name.clone(),
            kind: track.kind.clone(),
            locked: track.locked,
            muted: track.muted,
            visible: track.visible,
            clip_ids: track.clips.iter().map(|c| c.id.clone()).collect(),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Delta {
    pub base_sequence: u64,
    pub session_id: String,
    pub sequence: u64,
    pub project: Value,
    pub flags: Value,
    pub assets: EntityPatch<MediaAsset>,
    pub tracks: EntityPatch<TrackHeader>,
    pub clips: EntityPatch<Clip>,
    pub render: Value,
}
#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum Update {
    Full { snapshot: Box<Snapshot> },
    Delta { delta: Box<Delta> },
}

fn project_header(p: &Project) -> Value {
    json!({"id":p.id,"version":p.version,"magneticTimeline":p.magnetic_timeline,"autoRipple":p.auto_ripple,
        "name":p.name,"width":p.width,"height":p.height,"fps":p.fps})
}
fn render_delta(old: &Option<RenderPlan>, new: &Option<RenderPlan>) -> Value {
    match (old, new) {
        (_, None) => Value::Null,
        (old, Some(new)) => {
            let mut patch = json!({"width":new.width,"height":new.height,"fps":new.fps,"duration":new.duration,
                "clips":entities(old.iter().flat_map(|p| &p.clips), &new.clips, |c| &c.clip.id)});
            if old.as_ref().and_then(|p| p.playback_index.as_ref()) != new.playback_index.as_ref() {
                patch["playbackIndex"] =
                    serde_json::to_value(&new.playback_index).expect("playback index");
            }
            patch
        }
    }
}
fn delta(old: &Snapshot, new: &Snapshot) -> Delta {
    Delta {
        base_sequence: old.sequence,
        session_id: new.session_id.clone(),
        sequence: new.sequence,
        project: project_header(&new.project),
        flags: json!({"path":new.path,"dirty":new.dirty,"revision":new.revision,"canUndo":new.can_undo,"canRedo":new.can_redo,"canPaste":new.can_paste}),
        assets: entities(&old.project.assets, &new.project.assets, |a| &a.id),
        tracks: track_headers(&old.project.tracks, &new.project.tracks),
        clips: entities(
            old.project.tracks.iter().flat_map(|t| &t.clips),
            new.project.tracks.iter().flat_map(|t| &t.clips),
            |c| &c.id,
        ),
        render: render_delta(&old.render, &new.render),
    }
}
fn same_track_header(old: &Track, new: &Track) -> bool {
    old.name == new.name
        && old.kind == new.kind
        && old.locked == new.locked
        && old.muted == new.muted
        && old.visible == new.visible
        && old
            .clips
            .iter()
            .map(|c| &c.id)
            .eq(new.clips.iter().map(|c| &c.id))
}
fn track_headers(old: &[Track], new: &[Track]) -> EntityPatch<TrackHeader> {
    let previous: HashMap<_, _> = old.iter().map(|track| (&track.id, track)).collect();
    let next: HashMap<_, _> = new.iter().map(|track| (&track.id, track)).collect();
    EntityPatch {
        upsert: new
            .iter()
            .filter(|track| {
                previous
                    .get(&track.id)
                    .is_none_or(|old| !same_track_header(old, track))
            })
            .map(TrackHeader::from)
            .collect(),
        removed: old
            .iter()
            .filter(|track| !next.contains_key(&track.id))
            .map(|track| track.id.clone())
            .collect(),
        order: (!old.iter().map(|t| &t.id).eq(new.iter().map(|t| &t.id)))
            .then(|| new.iter().map(|track| track.id.clone()).collect()),
    }
}

pub struct PublishedState {
    pub session_id: String,
    pub sequence: u64,
    current: Option<Snapshot>,
}
impl Default for PublishedState {
    fn default() -> Self {
        Self {
            session_id: crate::id(),
            sequence: 0,
            current: None,
        }
    }
}
impl PublishedState {
    pub fn reset_session(&mut self) {
        self.session_id = crate::id();
        self.current = None;
    }
    pub fn publish(&mut self, mut snapshot: Snapshot) -> Update {
        self.sequence += 1;
        snapshot.sequence = self.sequence;
        snapshot.session_id.clone_from(&self.session_id);
        let update = match &self.current {
            Some(old) if old.project.id == snapshot.project.id => Update::Delta {
                delta: Box::new(delta(old, &snapshot)),
            },
            _ => Update::Full {
                snapshot: Box::new(snapshot.clone()),
            },
        };
        self.current = Some(snapshot);
        update
    }
    pub fn current(&self) -> Option<&Snapshot> {
        self.current.as_ref()
    }
}
#[cfg(test)]
mod tests;
