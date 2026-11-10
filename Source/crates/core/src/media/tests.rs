use super::*;

#[test]
fn cache_evicts_old_entries_and_protects_in_progress() {
    let root = std::env::temp_dir().join(crate::model::id());
    fs::create_dir_all(&root).unwrap();
    for name in ["old", "busy", "current"] {
        fs::create_dir_all(root.join(name)).unwrap();
        fs::write(root.join(name).join("media.bin"), [0u8; 60]).unwrap();
    }
    fs::write(root.join("busy/.preparing"), b"").unwrap();
    evict_cache(&root, &[root.join("current")], 120);
    assert!(!root.join("old").exists());
    assert!(root.join("busy").exists());
    assert!(root.join("current").exists());
    fs::remove_file(root.join("busy/.preparing")).unwrap();
    evict_cache(&root, &[root.join("current")], 70);
    assert_eq!(managed_cache_size(&root), 60);
    fs::remove_dir_all(root).unwrap();
}
