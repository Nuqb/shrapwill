use super::*;
impl Editor {
    pub fn can_paste(&self) -> bool {
        !self.clipboard.is_empty()
    }
    pub fn copy_clips(&mut self, ids: &[String]) -> Result<(), String> {
        let selected = linked_ids(&self.project, ids);
        let clips = self
            .project
            .tracks
            .iter()
            .flat_map(|t| {
                t.clips
                    .iter()
                    .filter(|c| selected.contains(&c.id))
                    .map(|c| (t.id.clone(), c.clone()))
            })
            .collect::<Vec<_>>();
        if clips.is_empty() {
            return Err("Select a clip to copy.".into());
        }
        self.clipboard = clips;
        Ok(())
    }
    pub fn paste_clips(&mut self, frame: i64) -> Result<Vec<String>, String> {
        if self.clipboard.is_empty() {
            return Err("Copy or cut some clips first.".into());
        }
        let mut p = self.project.clone();
        let origin = self
            .clipboard
            .iter()
            .map(|(_, c)| c.start)
            .min()
            .unwrap_or(0);
        let mut links = std::collections::HashMap::new();
        let mut added = vec![];
        for (track, original) in &self.clipboard {
            let destination = p
                .tracks
                .iter_mut()
                .find(|t| &t.id == track)
                .ok_or("The copied track no longer exists.")?;
            if destination.locked {
                return Err("Unlock the destination tracks before pasting.".into());
            }
            let mut c = original.clone();
            c.id = id();
            c.start = frame
                .max(0)
                .checked_add(original.start - origin)
                .ok_or("Paste position is too large.")?;
            c.link = original
                .link
                .as_ref()
                .map(|l| links.entry(l.clone()).or_insert_with(id).clone());
            added.push(c.id.clone());
            destination.clips.push(c);
        }
        if p.magnetic_timeline && main_timing(&p) != main_timing(&self.project) {
            p.validate()?;
            insert_main_clips(&mut p, &added)?;
            close_main_gaps(&mut p)?;
        }
        if p.auto_ripple {
            timeline_rules::ripple_insert(&self.project, &mut p)?;
        }
        self.commit(p)?;
        Ok(added)
    }
    pub fn clipboard_action(
        &mut self,
        direction: &str,
        ids: &[String],
        frame: i64,
    ) -> Result<Vec<String>, String> {
        match direction {
            "copy" => {
                self.copy_clips(ids)?;
                Ok(ids.to_vec())
            }
            "cut" => {
                let all = linked_ids(&self.project, ids);
                ensure_unlocked(&self.project, &all)?;
                self.copy_clips(ids)?;
                self.apply(Edit::Delete {
                    ids: ids.to_vec(),
                    ripple: false,
                })?;
                Ok(vec![])
            }
            "paste" => self.paste_clips(frame),
            "duplicate" => {
                self.copy_clips(ids)?;
                let end = self
                    .clipboard
                    .iter()
                    .map(|(_, c)| c.start + c.duration)
                    .max()
                    .unwrap_or(frame);
                self.paste_clips(end)
            }
            _ => Err("Unknown clipboard action.".into()),
        }
    }
}
