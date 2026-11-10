use super::*;
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock, TryLockError, Weak};

pub(super) fn entry_lock(path: &Path) -> Arc<Mutex<()>> {
    static ENTRIES: OnceLock<Mutex<HashMap<PathBuf, Weak<Mutex<()>>>>> = OnceLock::new();
    let mut entries = ENTRIES.get_or_init(Default::default).lock().unwrap();
    entries.retain(|_, entry| entry.strong_count() > 0);
    if let Some(lock) = entries.get(path).and_then(Weak::upgrade) {
        return lock;
    }
    let lock = Arc::new(Mutex::new(()));
    entries.insert(path.to_owned(), Arc::downgrade(&lock));
    lock
}
pub(super) fn acquire<'a>(
    lock: &'a Mutex<()>,
    cancel: &Cancel,
) -> Result<std::sync::MutexGuard<'a, ()>, String> {
    loop {
        if cancel.load(Ordering::Relaxed) {
            return Err("Cancelled".into());
        }
        match lock.try_lock() {
            Ok(guard) => return Ok(guard),
            Err(TryLockError::Poisoned(error)) => return Ok(error.into_inner()),
            Err(TryLockError::WouldBlock) => thread::sleep(Duration::from_millis(30)),
        }
    }
}
