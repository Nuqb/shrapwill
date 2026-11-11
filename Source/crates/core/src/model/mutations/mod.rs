use super::*;
mod creation;
mod links;
mod properties;
mod retime;
mod timeline;
mod tracks;
pub(super) fn apply(p: &mut Project, edit: Edit) -> Result<(), String> {
    match edit {
        Edit::Retime {
            id,
            asset,
            settings,
            ripple,
        } => retime::apply(p, id, asset, settings, ripple),
        Edit::SetAutoRipple { enabled } => {
            p.auto_ripple = enabled;
            Ok(())
        }
        Edit::SetMagneticTimeline { enabled } => {
            p.magnetic_timeline = enabled;
            Ok(())
        }
        op @ (Edit::Rename { .. }
        | Edit::AddTrack { .. }
        | Edit::DeleteTracks { .. }
        | Edit::SetTrack { .. }) => tracks::apply(p, op),
        op @ (Edit::AddClip { .. } | Edit::AddTitle { .. }) => creation::apply(p, op),
        op @ (Edit::Move { .. } | Edit::Trim { .. } | Edit::Split { .. }) => timeline::apply(p, op),
        op @ (Edit::Delete { .. } | Edit::DetachAudio { .. }) => links::apply(p, op),
        op @ (Edit::Properties { .. }
        | Edit::SetTitle { .. }
        | Edit::SetTransition { .. }
        | Edit::Relink { .. }) => properties::apply(p, op),
    }
}
