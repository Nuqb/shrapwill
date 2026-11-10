use crate::media::{self, Cancel};
use std::{io::Read, path::Path, process::Stdio, sync::atomic::Ordering, thread, time::Duration};

pub(super) fn run(executable: &Path, args: &[String], cancel: &Cancel) -> Result<(), String> {
    let mut child = media::command(executable)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;
    let error = child.stderr.take().unwrap();
    let reader = thread::spawn(move || {
        let mut text = String::new();
        let _ = error.take(65536).read_to_string(&mut text);
        text
    });
    let result = loop {
        if cancel.load(Ordering::Relaxed) {
            let _ = child.kill();
            let _ = child.wait();
            break Err("Cancelled".to_string());
        }
        match child.try_wait() {
            Ok(Some(status)) => break Ok(status),
            Ok(None) => thread::sleep(Duration::from_millis(30)),
            Err(error) => break Err(error.to_string()),
        }
    };
    let errors = reader.join().unwrap_or_default();
    if result?.success() {
        Ok(())
    } else {
        Err(format!("Original rendering failed: {errors}"))
    }
}
