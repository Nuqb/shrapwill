use super::*;
pub struct Editor {
    pub project: Project,
    pub(super) past: Vec<Project>,
    pub(super) future: Vec<Project>,
    pub dirty: bool,
    pub revision: u64,
    pub(super) clipboard: Vec<(String, Clip)>,
}
impl Default for Editor {
    fn default() -> Self {
        Self::new(Project::default())
    }
}
impl Editor {
    pub fn new(project: Project) -> Self {
        Self {
            project,
            past: vec![],
            future: vec![],
            dirty: false,
            revision: 0,
            clipboard: vec![],
        }
    }
    pub fn history(&self) -> (bool, bool) {
        (!self.past.is_empty(), !self.future.is_empty())
    }
    pub fn commit(&mut self, p: Project) -> Result<(), String> {
        p.validate()?;
        self.past.push(std::mem::replace(&mut self.project, p));
        let mut bytes = history_weight(&self.past);
        while self.past.len() > 1 && (self.past.len() > 100 || bytes > 64 * 1024 * 1024) {
            self.past.remove(0);
            bytes = history_weight(&self.past);
        }
        self.future.clear();
        self.dirty = true;
        self.revision += 1;
        Ok(())
    }
    pub fn undo(&mut self) {
        if let Some(p) = self.past.pop() {
            self.future.push(std::mem::replace(&mut self.project, p));
            self.dirty = true;
            self.revision += 1;
        }
    }
    pub fn redo(&mut self) {
        if let Some(p) = self.future.pop() {
            self.past.push(std::mem::replace(&mut self.project, p));
            self.dirty = true;
            self.revision += 1;
        }
    }
    pub fn apply(&mut self, edit: Edit) -> Result<(), String> {
        let mut p = self.project.clone();
        let context = magnetic::MagneticEdit::capture(&p, &edit);
        mutations::apply(&mut p, edit.clone())?;
        timeline_rules::auto_ripple(&self.project, &mut p, &edit)?;
        context.finish(&self.project, &mut p)?;
        if p.auto_ripple && matches!(edit, Edit::AddClip { .. } | Edit::AddTitle { .. }) {
            timeline_rules::ripple_insert(&self.project, &mut p)?;
        }
        timeline_rules::check_placement(&self.project, &p, &edit)?;
        self.commit(p)
    }
}
// Waveforms are immutable and shared across history states. Other sizes remain
// conservative estimates, preserving the existing bounded-history policy.
fn history_weight(projects: &[Project]) -> usize {
    let mut waveforms = std::collections::HashSet::new();
    projects
        .iter()
        .map(|p| {
            let assets = p
                .assets
                .iter()
                .map(|a| {
                    let wave = if waveforms.insert(a.waveform.as_ptr()) {
                        a.waveform.len() * 4
                    } else {
                        0
                    };
                    wave + a.path.len() + a.name.len() + 256
                })
                .sum::<usize>();
            assets + p.tracks.iter().map(|t| t.clips.len() * 1024).sum::<usize>()
        })
        .sum()
}
// New video/title tracks are inserted above the original main video track.
