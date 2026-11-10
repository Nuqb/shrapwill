use super::*;
pub fn evict_cache(cache: &Path, protected: &[PathBuf], budget: u64) {
    let mut entries: Vec<_> = fs::read_dir(cache)
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .filter(|e| {
            e.path().is_dir()
                && !e.file_name().to_string_lossy().starts_with("export-")
                && !e.path().join(".preparing").exists()
        })
        .map(|e| {
            let p = e.path();
            let time = fs::metadata(p.join("last-used"))
                .and_then(|m| m.modified())
                .ok();
            let size = dir_size(&p);
            (p, time, size)
        })
        .collect();
    let mut total: u64 = managed_cache_size(cache);
    entries.sort_by_key(|e| e.1);
    for (p, _, size) in entries {
        if total <= budget {
            break;
        }
        if protected.iter().any(|x| x.starts_with(&p)) {
            continue;
        }
        if fs::remove_dir_all(&p).is_ok() {
            total = total.saturating_sub(size)
        }
    }
}
fn dir_size(dir: &Path) -> u64 {
    fs::read_dir(dir)
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .map(|e| {
            let p = e.path();
            if p.is_dir() {
                dir_size(&p)
            } else {
                e.metadata().map(|m| m.len()).unwrap_or(0)
            }
        })
        .sum()
}
pub fn managed_cache_size(cache: &Path) -> u64 {
    fs::read_dir(cache)
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .filter(|e| e.path().is_dir() && !e.file_name().to_string_lossy().starts_with("export-"))
        .map(|e| dir_size(&e.path()))
        .sum()
}
