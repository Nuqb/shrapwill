use super::*;
pub fn cache_key(asset: &MediaAsset, quality: u32) -> String {
    let mut h = DefaultHasher::new();
    asset.path.hash(&mut h);
    quality.hash(&mut h);
    "cutline-cache-v3".hash(&mut h);
    if let Ok(m) = fs::metadata(&asset.path) {
        m.len().hash(&mut h);
        m.modified().ok().hash(&mut h)
    }
    format!("{:016x}", h.finish())
}
pub fn prepare(
    ffmpeg: &Path,
    cache: &Path,
    mut a: MediaAsset,
    quality: u32,
    cancel: &Cancel,
    progress: &dyn Fn(f64),
) -> Result<MediaAsset, String> {
    let dir = cache.join(cache_key(&a, quality));
    let lock = preparation_lock::entry_lock(&dir);
    let _guard = preparation_lock::acquire(&lock, cancel)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let preparing = dir.join(".preparing");
    fs::write(&preparing, b"").map_err(|e| e.to_string())?;
    struct Preparing(PathBuf);
    impl Drop for Preparing {
        fn drop(&mut self) {
            let _ = fs::remove_file(&self.0);
        }
    }
    let _preparing = Preparing(preparing);
    // The marker is refreshed when the entry is used, making eviction independent of Windows access-time settings.
    let _ = fs::write(dir.join("last-used"), b"");
    let input = Path::new(&a.path);
    if a.kind != "audio" {
        let thumb = dir.join("thumbnail.jpg");
        if !thumb.is_file() {
            let temporary = dir.join("thumbnail.partial.jpg");
            let mut args = strings(&["-hide_banner", "-loglevel", "error", "-y"]);
            if a.kind == "video" {
                args.extend(strings(&[
                    "-ss",
                    &format!("{}", (a.duration * 0.1).min(1.)),
                ]));
            }
            args.extend(strings(&[
                "-i",
                &input.to_string_lossy(),
                "-frames:v",
                "1",
                "-vf",
                "scale=320:180:force_original_aspect_ratio=decrease",
                "-threads",
                "1",
                &temporary.to_string_lossy(),
            ]));
            let result = capture(ffmpeg, &args, cancel, 65536);
            if result.is_err() {
                let _ = fs::remove_file(&temporary);
            }
            result?;
            crate::model::replace_file(&temporary, &thumb)?;
        }
        a.thumbnail_path = Some(thumb.to_string_lossy().into_owned());
    }
    progress(0.05);
    if a.preview_path.as_deref() == Some(a.path.as_str()) {
        // Compatible originals are ready immediately; only derived artwork needs preparing.
    } else if a.kind == "image" {
        let preview = dir.join("preview.png");
        if !preview.exists() {
            let temporary = dir.join("preview.partial.png");
            let result = capture(
                ffmpeg,
                &strings(&[
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-y",
                    "-i",
                    &a.path,
                    "-frames:v",
                    "1",
                    &temporary.to_string_lossy(),
                ]),
                cancel,
                65536,
            );
            if result.is_err() {
                let _ = fs::remove_file(&temporary);
            }
            result?;
            crate::model::replace_file(&temporary, &preview)?;
        }
        a.preview_path = Some(preview.to_string_lossy().into_owned());
    } else {
        let preview = dir.join(if a.kind == "audio" {
            "preview.m4a"
        } else {
            "preview.mp4"
        });
        if !preview.is_file() {
            let temp = dir.join(if a.kind == "audio" {
                "partial.m4a"
            } else {
                "partial.mp4"
            });
            let mut args = strings(&["-hide_banner", "-loglevel", "error", "-y", "-i", &a.path]);
            if a.kind == "video" {
                let filter=format!("scale={}:{}:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30,format=yuv420p",quality*16/9,quality);
                args.extend(strings(&[
                    "-map", "0:v:0", "-map", "0:a:0?", "-vf", &filter, "-c:v", "libx264",
                    "-preset", "veryfast", "-crf", "24", "-threads", "2",
                ]));
            } else {
                args.extend(strings(&["-vn"]));
            }
            args.extend(strings(&[
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-ac",
                "2",
                "-ar",
                "48000",
                "-movflags",
                "+faststart",
                "-progress",
                "pipe:1",
                "-nostats",
                &temp.to_string_lossy(),
            ]));
            let result = run_progress(ffmpeg, &args, cancel, a.duration, &|v| {
                progress(0.05 + v * 0.85)
            });
            if result.is_err() {
                let _ = fs::remove_file(&temp);
            }
            result?;
            crate::model::replace_file(&temp, &preview)?;
        }
        a.preview_path = Some(preview.to_string_lossy().into_owned());
    }
    analysis::waveform(ffmpeg, &dir, &mut a, cancel)?;
    evict_cache(cache, std::slice::from_ref(&dir), 10 * 1024 * 1024 * 1024);
    if managed_cache_size(cache) > 10 * 1024 * 1024 * 1024 {
        if let Some(path) = a
            .preview_path
            .as_ref()
            .filter(|path| path.as_str() != a.path)
        {
            let _ = fs::remove_file(path);
        }
        return Err("The preview cache is full. Choose a lower preview resolution or retry after the other media job finishes.".into());
    }
    progress(1.);
    Ok(a)
}
