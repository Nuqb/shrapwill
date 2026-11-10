use super::{MediaAsset, Properties, Title};
use serde::{Deserialize, Serialize};
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Edit {
    SetMagneticTimeline {
        enabled: bool,
    },
    Rename {
        name: String,
    },
    AddTrack {
        kind: String,
    },
    DeleteTracks {
        ids: Vec<String>,
    },
    SetTrack {
        id: String,
        locked: Option<bool>,
        muted: Option<bool>,
        visible: Option<bool>,
    },
    AddClip {
        media_id: String,
        track_id: String,
        start: i64,
    },
    AddTitle {
        track_id: String,
        start: i64,
        style: String,
    },
    Move {
        ids: Vec<String>,
        delta: i64,
        target_track: Option<String>,
    },
    Trim {
        id: String,
        edge: String,
        frame: i64,
    },
    Split {
        ids: Vec<String>,
        frame: i64,
    },
    Delete {
        ids: Vec<String>,
        ripple: bool,
    },
    Properties {
        id: String,
        props: Properties,
    },
    SetTitle {
        id: String,
        title: Title,
    },
    SetTransition {
        id: String,
        kind: String,
        frames: i64,
    },
    DetachAudio {
        id: String,
    },
    Relink {
        media_id: String,
        asset: MediaAsset,
    },
}
