use super::*;
use crate::Title;
use std::hash::{Hash, Hasher};

fn title_path(title: &Title, size: (u32, u32), dir: &Path) -> std::path::PathBuf {
    let mut hash = std::collections::hash_map::DefaultHasher::new();
    // Include the renderer revision so cache entries never reuse a previous design.
    4_u32.hash(&mut hash);
    title.text.hash(&mut hash);
    title.style.hash(&mut hash);
    title.color.hash(&mut hash);
    title.font_size.to_bits().hash(&mut hash);
    size.hash(&mut hash);
    dir.join(format!("{:016x}.png", hash.finish()))
}

pub(super) fn rasterize(
    svg: &str,
    path: &Path,
    options: &resvg::usvg::Options,
) -> Result<(), String> {
    let tree = resvg::usvg::Tree::from_str(svg, options).map_err(|e| e.to_string())?;
    let size = tree.size().to_int_size();
    let mut pixmap = resvg::tiny_skia::Pixmap::new(size.width(), size.height())
        .ok_or("Cannot allocate title image.")?;
    resvg::render(
        &tree,
        resvg::tiny_skia::Transform::identity(),
        &mut pixmap.as_mut(),
    );
    pixmap.save_png(path).map_err(|e| e.to_string())
}

fn needs_image(title: &Title) -> bool {
    title
        .image_path
        .as_ref()
        .is_none_or(|path| !Path::new(path).is_file())
}

pub fn prepare_titles(p: &mut Project, cache: &Path) -> Result<(), String> {
    if !p
        .tracks
        .iter()
        .flat_map(|t| &t.clips)
        .filter_map(|c| c.title.as_ref())
        .any(needs_image)
    {
        return Ok(());
    }
    let mut fontdb = resvg::usvg::fontdb::Database::new();
    fontdb.load_system_fonts();
    fontdb.set_sans_serif_family("Segoe UI");
    let options = resvg::usvg::Options {
        fontdb: std::sync::Arc::new(fontdb),
        ..Default::default()
    };
    let dir = cache.join("titles");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let size = (p.width, p.height);
    for title in p
        .tracks
        .iter_mut()
        .flat_map(|t| &mut t.clips)
        .filter_map(|c| c.title.as_mut())
    {
        let path = title_path(title, size, &dir);
        if !path.exists() {
            rasterize(
                &title_svg::title_svg(title, size.0, size.1),
                &path,
                &options,
            )?;
        }
        title.image_path = Some(path.to_string_lossy().into_owned());
    }
    Ok(())
}
