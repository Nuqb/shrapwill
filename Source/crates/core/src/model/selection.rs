use super::*;
pub(super) fn linked_ids(p: &Project, ids: &[String]) -> Vec<String> {
    let links: Vec<_> = p
        .tracks
        .iter()
        .flat_map(|t| &t.clips)
        .filter(|c| ids.contains(&c.id))
        .filter_map(|c| c.link.clone())
        .collect();
    p.tracks
        .iter()
        .flat_map(|t| &t.clips)
        .filter(|c| ids.contains(&c.id) || c.link.as_ref().is_some_and(|l| links.contains(l)))
        .map(|c| c.id.clone())
        .collect()
}
pub(super) fn ensure_unlocked(p: &Project, ids: &[String]) -> Result<(), String> {
    if p.tracks
        .iter()
        .any(|t| t.locked && t.clips.iter().any(|c| ids.contains(&c.id)))
    {
        Err("Unlock the linked tracks before editing.".into())
    } else {
        Ok(())
    }
}
pub(super) fn find_mut<'a>(p: &'a mut Project, cid: &str) -> Result<&'a mut Clip, String> {
    p.tracks
        .iter_mut()
        .flat_map(|t| &mut t.clips)
        .find(|c| c.id == cid)
        .ok_or("Clip not found.".into())
}
