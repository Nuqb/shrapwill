use super::*;
pub fn export(
    ffmpeg: &Path,
    p: &Project,
    settings: &ExportSettings,
    destination: &Path,
    cache: &Path,
    cancel: &Cancel,
    progress: &dyn Fn(f64),
) -> Result<(), String> {
    if p.duration() == 0 {
        return Err("Add something to the timeline before exporting.".into());
    }
    if !["software", "h264_nvenc", "h264_qsv", "h264_amf"].contains(&settings.encoder.as_str())
        || !["draft", "balanced", "high"].contains(&settings.quality.as_str())
    {
        return Err("Unsupported export setting.".into());
    }
    if settings.width < 64
        || settings.height < 64
        || settings.width > 1920
        || settings.height > 1920
        || !settings.width.is_multiple_of(2)
        || !settings.height.is_multiple_of(2)
    {
        return Err("Choose an even output size up to 1920 pixels per side.".into());
    }
    if p.assets
        .iter()
        .any(|a| media::same_path(Path::new(&a.path), destination))
    {
        return Err("Choose an export path different from your source media.".into());
    }
    let plan = plan(p, false)?;
    let parent = destination.parent().ok_or("Invalid export path.")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let tempdir = cache.join(format!("export-{}", id()));
    fs::create_dir_all(&tempdir).map_err(|e| e.to_string())?;
    let temporary = parent.join(format!(".cutline-export-{}.mp4", id()));
    let result = (|| {
        // Render bounded intervals so long timelines do not open every source decoder at once.
        let mut boundaries = vec![0, plan.duration];
        for rc in &plan.clips {
            boundaries.push(rc.clip.start);
            boundaries.push(rc.clip.start + rc.clip.duration);
            if let Some(tr) = &rc.clip.transition {
                boundaries.push((rc.clip.start + tr.frames).min(rc.clip.start + rc.clip.duration));
            }
            super::ported_export::add_boundaries(&mut boundaries, &rc.clip, p, settings);
        }
        let step = p.fps.frames(15.).max(1);
        let mut at = step;
        while at < plan.duration {
            boundaries.push(at);
            at += step
        }
        boundaries.sort();
        boundaries.dedup();
        let mut concat = String::new();
        for (part, window) in boundaries.windows(2).enumerate() {
            if cancel.load(Ordering::Relaxed) {
                return Err("Cancelled".into());
            }
            let (start, end) = (window[0], window[1]);
            if end <= start {
                continue;
            }
            let duration = p.fps.seconds(end - start);
            let start_sec = p.fps.seconds(start);
            let active: Vec<_> = plan
                .clips
                .iter()
                .filter(|rc| rc.clip.start < end && rc.clip.start + rc.clip.duration > start)
                .collect();
            let w = settings.width;
            let h = settings.height;
            let mut original_request = super::ported_export::Request {
                ffmpeg,
                project: p,
                active: &active,
                start,
                end,
                size: (w, h),
                directory: &tempdir,
                cancel,
                source_inputs: &[],
            };
            let source_inputs = super::source_effects::prepare(&original_request)?;
            original_request.source_inputs = &source_inputs;
            let original = super::ported_export::prepare(&original_request)?;
            let mut args = encoding::input_args(&active, start, end, p);
            super::source_effects::input_args(&mut args, &source_inputs);
            if let Some((file, _)) = &original {
                args.extend(media::strings(&[
                    "-threads",
                    "2",
                    "-i",
                    &file.to_string_lossy(),
                ]));
            }
            let scale = h as f64 / p.height as f64;
            let fps = format!("{}/{}", p.fps.num, p.fps.den);
            let format = compositing_format(&active, p, settings);
            let base_filter = if original.is_some() {
                format!(
                    "[{}:v]setpts=PTS-STARTPTS,format={format}[base]",
                    active.len() + source_inputs.len()
                )
            } else {
                format!("color=c=black:s={w}x{h}:r={fps}:d={duration},format={format}[base]")
            };
            let mut filters = vec![
                base_filter,
                format!("anullsrc=r=48000:cl=stereo,atrim=duration={duration}[silence]"),
            ];
            let mut base = "base".to_string();
            let mut audio = vec!["[silence]".to_string()];
            for (i, rc) in active.iter().enumerate() {
                let c = &rc.clip;
                let cp = &c.props;
                let local = p.fps.seconds(start - c.start);
                if rc.kind == "video" && !original.as_ref().is_some_and(|(_, last)| i <= *last) {
                    let lut = tempdir.join(format!("lut-{i}.cube"));
                    let lut = if color::is_neutral(cp) {
                        None
                    } else {
                        write_lut(c, &lut)?;
                        Some(lut.as_path())
                    };
                    let chain = video::chain(video::VideoInput {
                        index: i,
                        source_index: source_inputs
                            .iter()
                            .position(|(layer, _)| *layer == i)
                            .map(|offset| active.len() + offset),
                        clip: rc,
                        project: p,
                        size: (w, h),
                        start,
                        lut,
                    });
                    filters.push(chain);
                    let next = format!("o{i}");
                    filters.push(format!("[{base}][v{i}]overlay=x=(W-w)/2+{}:y=(H-h)/2+{}:shortest=1:format=auto[{next}]",cp.x*scale,cp.y*scale));
                    base = next;
                }
                if rc.audible {
                    let fi = p.fps.seconds(cp.fade_in.min(c.duration));
                    let fo = p.fps.seconds(cp.fade_out.min(c.duration));
                    let full = p.fps.seconds(c.duration);
                    let mut chain = format!(
                        "[{i}:a]asetpts=PTS-STARTPTS,aresample=48000,volume={}dB",
                        cp.gain_db
                    );
                    // Evaluate fades in source-clip time, retaining their envelope when a render interval starts midway through a clip.
                    if fi > 0. || fo > 0. {
                        let mut envelope = "1".to_string();
                        if fi > 0. {
                            envelope.push_str(&format!("*min(1,max(0,(t+{local})/{fi}))"));
                        }
                        if fo > 0. {
                            envelope.push_str(&format!("*min(1,max(0,({full}-t-{local})/{fo}))"));
                        }
                        chain.push_str(&format!(",volume='{envelope}':eval=frame"));
                    }
                    chain.push_str(&format!(",apad,atrim=duration={duration}[a{i}]"));
                    filters.push(chain);
                    audio.push(format!("[a{i}]"));
                }
            }
            filters.push(format!(
                "[{base}]trim=end_frame={},format=yuv420p[vout]",
                end - start
            ));
            filters.push(format!("{}amix=inputs={}:duration=first:normalize=0,alimiter=limit=0.98:latency=1,atrim=duration={duration}[aout]",audio.join(""),audio.len()));
            let script = tempdir.join("filters.txt");
            fs::write(&script, filters.join(";\n")).map_err(|e| e.to_string())?;
            let segment = tempdir.join(format!("segment-{part:05}.mkv"));
            args.extend(encoding::output_args(settings, &script, &segment, duration));
            media::run_progress(ffmpeg, &args, cancel, duration, &|v| {
                progress((start_sec + duration * v) / p.fps.seconds(p.duration()) * 0.75)
            })?;
            if let Some((file, _)) = &original {
                let _ = fs::remove_file(file);
            }
            for (_, file) in source_inputs {
                let _ = fs::remove_file(file);
            }
            concat.push_str(&format!(
                "file '{}'\nduration {duration:.12}\n",
                media::clean_path(&segment)
                    .to_string_lossy()
                    .replace('\\', "/")
                    .replace('\'', "'\\''")
            ));
        }
        let concatpath = tempdir.join("concat.txt");
        fs::write(&concatpath, concat).map_err(|e| e.to_string())?;
        let mut args = media::strings(&[
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            &concatpath.to_string_lossy(),
            "-c:v",
            "copy",
        ]);
        args.extend(media::strings(&[
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "48000",
            "-ac",
            "2",
            "-movflags",
            "+faststart",
            "-t",
            &p.fps.seconds(p.duration()).to_string(),
            "-progress",
            "pipe:1",
            "-nostats",
            &temporary.to_string_lossy(),
        ]));
        media::run_progress(ffmpeg, &args, cancel, p.fps.seconds(p.duration()), &|v| {
            progress(0.75 + v * 0.25)
        })?;
        crate::model::replace_file(&temporary, destination)?;
        Ok(())
    })();
    let _ = fs::remove_dir_all(&tempdir);
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result
}

// Keep the full RGBA path for titles, images, grading, effects, and alpha transforms.
// Neutral video can composite directly in the encoder's pixel format; overlay still respects source alpha.
fn compositing_format(
    active: &[&plan::RenderClip],
    p: &Project,
    settings: &ExportSettings,
) -> &'static str {
    let simple = active.iter().filter(|rc| rc.kind == "video").all(|rc| {
        let cp = &rc.clip.props;
        color::is_neutral(cp)
            && spatial::is_neutral(cp)
            && cp.opacity == 1.
            && cp.rotation == 0.
            && cp.x == 0.
            && cp.y == 0.
            && cp.scale == 1.
            && [cp.crop_left, cp.crop_right, cp.crop_top, cp.crop_bottom]
                .iter()
                .all(|value| *value == 0.)
            && u64::from(rc.width) * u64::from(settings.height)
                == u64::from(rc.height) * u64::from(settings.width)
            && rc.clip.transition.is_none()
            && rc
                .clip
                .media_id
                .as_ref()
                .and_then(|id| p.assets.iter().find(|a| &a.id == id))
                .is_some_and(|a| a.kind == "video")
    });
    if simple {
        "yuv420p"
    } else {
        "rgba"
    }
}
