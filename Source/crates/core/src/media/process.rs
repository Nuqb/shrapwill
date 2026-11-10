use super::*;
pub fn clean_path(path: &Path) -> PathBuf {
    let s = path.to_string_lossy();
    if let Some(rest) = s.strip_prefix("\\\\?\\UNC\\") {
        PathBuf::from(format!("\\\\{rest}"))
    } else if let Some(rest) = s.strip_prefix("\\\\?\\") {
        PathBuf::from(rest)
    } else {
        path.to_owned()
    }
}
pub fn same_path(a: &Path, b: &Path) -> bool {
    let a = clean_path(&fs::canonicalize(a).unwrap_or_else(|_| a.to_owned()));
    let b = clean_path(&fs::canonicalize(b).unwrap_or_else(|_| b.to_owned()));
    #[cfg(windows)]
    {
        a.to_string_lossy()
            .eq_ignore_ascii_case(&b.to_string_lossy())
    }
    #[cfg(not(windows))]
    {
        a == b
    }
}
pub fn command(exe: &Path) -> Command {
    let mut c = Command::new(exe);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        c.creation_flags(0x08000000);
    }
    c
}
pub fn capture(
    exe: &Path,
    args: &[String],
    cancel: &Cancel,
    max_bytes: usize,
) -> Result<Vec<u8>, String> {
    let mut child = command(exe)
        .args(["-protocol_whitelist", "file,pipe,crypto,data"])
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Cannot start media tool: {e}"))?;
    let out = child.stdout.take().unwrap();
    let err = child.stderr.take().unwrap();
    let reader = thread::spawn(move || {
        let mut data = vec![];
        out.take(max_bytes as u64 + 1)
            .read_to_end(&mut data)
            .map(|_| data)
    });
    let errors = thread::spawn(move || {
        let mut s = String::new();
        let _ = err.take(65536).read_to_string(&mut s);
        s
    });
    let status = loop {
        if cancel.load(Ordering::Relaxed) {
            let _ = child.kill();
            let _ = child.wait();
            break Err("Cancelled".to_string());
        }
        match child.try_wait() {
            Ok(Some(s)) => break Ok(s),
            Ok(None) => thread::sleep(Duration::from_millis(30)),
            Err(e) => break Err(e.to_string()),
        }
    };
    let output = reader
        .join()
        .map_err(|_| "Media reader stopped.")?
        .map_err(|e| e.to_string())?;
    let stderr = errors.join().unwrap_or_default();
    let status = status?;
    if !status.success() {
        return Err(format!(
            "Media operation failed: {}",
            stderr
                .chars()
                .rev()
                .take(1600)
                .collect::<String>()
                .chars()
                .rev()
                .collect::<String>()
        ));
    }
    if output.len() > max_bytes {
        return Err("Media metadata exceeded the supported size.".into());
    }
    Ok(output)
}
pub fn run_progress(
    exe: &Path,
    args: &[String],
    cancel: &Cancel,
    duration: f64,
    progress: &dyn Fn(f64),
) -> Result<(), String> {
    let mut child = command(exe)
        .args(["-protocol_whitelist", "file,pipe,crypto,data"])
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;
    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    let (tx, rx) = std::sync::mpsc::channel();
    let reader = thread::spawn(move || {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            if let Some(v) = line
                .strip_prefix("out_time_us=")
                .and_then(|s| s.parse::<f64>().ok())
            {
                let _ = tx.send(v / 1_000_000.);
            }
        }
    });
    let errors = thread::spawn(move || {
        let mut tail = String::new();
        for line in BufReader::new(stderr).lines().map_while(Result::ok) {
            tail.push_str(&line);
            tail.push('\n');
            if tail.len() > 16384 {
                let mut n = tail.len() - 8192;
                while !tail.is_char_boundary(n) {
                    n += 1
                }
                tail.drain(..n);
            }
        }
        tail
    });
    let status = loop {
        while let Ok(t) = rx.try_recv() {
            progress((t / duration.max(0.001)).clamp(0., 0.99));
        }
        if cancel.load(Ordering::Relaxed) {
            let _ = child.kill();
            let _ = child.wait();
            break Err("Cancelled".to_string());
        }
        match child.try_wait() {
            Ok(Some(s)) => break Ok(s),
            Ok(None) => thread::sleep(Duration::from_millis(40)),
            Err(e) => break Err(e.to_string()),
        }
    };
    let _ = reader.join();
    let stderr = errors.join().unwrap_or_default();
    if !status?.success() {
        return Err(format!(
            "Media operation failed: {}",
            stderr
                .chars()
                .rev()
                .take(1400)
                .collect::<String>()
                .chars()
                .rev()
                .collect::<String>()
        ));
    }
    progress(1.);
    Ok(())
}
pub fn strings(args: &[&str]) -> Vec<String> {
    args.iter().map(|s| s.to_string()).collect()
}
