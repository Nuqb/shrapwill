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
        self.past.push(self.project.clone());
        let weight = |p: &Project| {
            p.assets
                .iter()
                .map(|a| a.waveform.len() * 4 + a.path.len() + a.name.len() + 256)
                .sum::<usize>()
                + p.tracks.iter().map(|t| t.clips.len() * 1024).sum::<usize>()
        };
        let mut bytes = self.past.iter().map(weight).sum::<usize>();
        while self.past.len() > 1 && (self.past.len() > 100 || bytes > 64 * 1024 * 1024) {
            bytes = bytes.saturating_sub(weight(&self.past.remove(0)));
        }
        self.project = p;
        self.future.clear();
        self.dirty = true;
        self.revision += 1;
        Ok(())
    }
    pub fn undo(&mut self) {
        if let Some(p) = self.past.pop() {
            self.future.push(self.project.clone());
            self.project = p;
            self.dirty = true;
            self.revision += 1;
        }
    }
    pub fn redo(&mut self) {
        if let Some(p) = self.future.pop() {
            self.past.push(self.project.clone());
            self.project = p;
            self.dirty = true;
            self.revision += 1;
        }
    }
    pub fn apply(&mut self, edit: Edit) -> Result<(), String> {
        let mut p = self.project.clone();
        let context = magnetic::MagneticEdit::capture(&p, &edit);
        mutations::apply(&mut p, edit)?;
        context.finish(&self.project, &mut p)?;
        self.commit(p)
    }
}
// New video/title tracks are inserted above the original main video track.
