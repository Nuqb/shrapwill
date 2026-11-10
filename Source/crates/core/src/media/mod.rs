//! Local media processes, probing, preview generation, and bounded cache.
use crate::{id, MediaAsset};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::hash_map::DefaultHasher,
    fs,
    hash::{Hash, Hasher},
    io::{BufRead, BufReader, Read},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread,
    time::Duration,
};

pub type Cancel = Arc<AtomicBool>;
mod analysis;
mod cache;
mod direct;
mod preparation_lock;
mod preview;
mod probe;
mod process;
mod settings;
pub use cache::{evict_cache, managed_cache_size};
pub use preview::{cache_key, prepare};
pub use probe::probe;
pub use process::*;
pub use settings::ExportSettings;
#[cfg(test)]
mod direct_tests;
#[cfg(test)]
mod tests;
