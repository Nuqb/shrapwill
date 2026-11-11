//! Materialized timing keeps audio, reverse playback, preview, and export in sync.
use super::*;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeedOptions {
    pub rate: f64,
    pub reverse: bool,
    pub maintain_pitch: bool,
    pub points: Vec<[f64; 2]>,
}
impl SpeedOptions {
    pub fn validate(&self) -> Result<(), String> {
        if !self.rate.is_finite() || !(0.1..=16.).contains(&self.rate) || self.points.len() > 16 {
            return Err("Speed must be between 0.1 and 16 times.".into());
        }
        if !self.points.is_empty()
            && (self.points.len() < 2
                || self.points[0][0] != 0.
                || self.points.last().unwrap()[0] != 1.)
        {
            return Err("A speed ramp must begin at 0% and end at 100%.".into());
        }
        for (i, point) in self.points.iter().enumerate() {
            if !point[0].is_finite()
                || !point[1].is_finite()
                || !(0.1..=16.).contains(&point[1])
                || !(0. ..=1.).contains(&point[0])
                || (i > 0 && point[0] <= self.points[i - 1][0])
            {
                return Err("Invalid speed ramp points.".into());
            }
        }
        Ok(())
    }
    fn at(&self, position: f64) -> f64 {
        let Some(pair) = self.points.windows(2).find(|p| position <= p[1][0]) else {
            return self.rate;
        };
        let t = ((position - pair[0][0]) / (pair[1][0] - pair[0][0])).clamp(0., 1.);
        pair[0][1] + (pair[1][1] - pair[0][1]) * t
    }
}
fn tempo(mut rate: f64) -> String {
    let mut filters = Vec::new();
    while rate > 2. {
        filters.push("atempo=2".to_string());
        rate /= 2.;
    }
    while rate < 0.5 {
        filters.push("atempo=0.5".to_string());
        rate /= 0.5;
    }
    filters.push(format!("atempo={rate}"));
    filters.join(",")
}
pub struct RetimeRequest<'a> {
    pub ffmpeg: &'a Path,
    pub ffprobe: &'a Path,
    pub asset: &'a MediaAsset,
    pub source_in: f64,
    pub seconds: f64,
    pub destination: &'a Path,
    pub options: &'a SpeedOptions,
    pub cancel: &'a Cancel,
}
pub fn render(request: RetimeRequest<'_>) -> Result<MediaAsset, String> {
    let r = request;
    r.options.validate()?;
    if r.asset.kind == "image" || !r.seconds.is_finite() || r.seconds <= 0. {
        return Err("Select a video or audio clip for speed editing.".into());
    }
    fs::create_dir_all(r.destination).map_err(|e| e.to_string())?;
    let result = render_parts(&r);
    if result.is_err() {
        let _ = fs::remove_dir_all(r.destination);
    }
    result
}
fn render_parts(r: &RetimeRequest<'_>) -> Result<MediaAsset, String> {
    let chunk = if r.options.points.is_empty() {
        2.
    } else {
        0.25
    };
    let count = (r.seconds / chunk).ceil() as usize;
    if count > 14400 {
        return Err("Split this clip into shorter sections before speed processing.".into());
    }
    let mut names = Vec::new();
    for index in 0..count {
        names.push(encode_part(r, index, chunk)?);
    }
    if r.options.reverse {
        names.reverse();
    }
    assemble(r, &names)
}
fn encode_part(r: &RetimeRequest<'_>, index: usize, chunk: f64) -> Result<String, String> {
    let offset = index as f64 * chunk;
    let seconds = chunk.min(r.seconds - offset);
    let rate = r.options.at((offset + seconds / 2.) / r.seconds);
    let output = r.destination.join(format!("part-{index:06}.mkv"));
    let mut args = strings(&[
        "-v",
        "error",
        "-y",
        "-threads",
        "2",
        "-ss",
        &(r.source_in + offset).to_string(),
        "-t",
        &seconds.to_string(),
        "-i",
        &r.asset.path,
    ]);
    if r.asset.kind == "video" {
        let reverse = if r.options.reverse { "reverse," } else { "" };
        args.extend(strings(&[
            "-vf",
            &format!("{reverse}setpts=(PTS-STARTPTS)/{rate},pad=ceil(iw/2)*2:ceil(ih/2)*2"),
            "-c:v",
            "libx264",
            "-bf",
            "0",
            "-preset",
            "veryfast",
            "-crf",
            "14",
            "-pix_fmt",
            "yuv420p",
            "-threads",
            "2",
        ]));
    }
    if r.asset.has_audio {
        let reverse = if r.options.reverse { "areverse," } else { "" };
        let speed = if r.options.maintain_pitch {
            tempo(rate)
        } else {
            format!("asetrate=48000*{rate},aresample=48000")
        };
        args.extend(strings(&[
            "-af",
            &format!("aresample=48000,{reverse}{speed},asetpts=PTS-STARTPTS"),
            "-c:a",
            "pcm_s16le",
        ]));
    }
    args.extend(strings(&["-t", &(seconds / rate).to_string()]));
    args.push(output.to_string_lossy().into_owned());
    capture(r.ffmpeg, &args, r.cancel, 1024)?;
    Ok(format!("file 'part-{index:06}.mkv'"))
}
fn assemble(r: &RetimeRequest<'_>, names: &[String]) -> Result<MediaAsset, String> {
    let list = r.destination.join("parts.txt");
    fs::write(&list, names.join("\n")).map_err(|e| e.to_string())?;
    let output = r.destination.join("speed.mkv");
    capture(
        r.ffmpeg,
        &strings(&[
            "-v",
            "error",
            "-y",
            "-f",
            "concat",
            "-safe",
            "1",
            "-i",
            &list.to_string_lossy(),
            "-c",
            "copy",
            &output.to_string_lossy(),
        ]),
        r.cancel,
        1024,
    )?;
    let preview = prepare_browser_preview(r, &output)?;
    let mut asset = probe(r.ffprobe, &output, r.cancel)?;
    asset.name = format!("{} · speed", r.asset.name);
    asset.preview_path = Some(preview.to_string_lossy().into_owned());
    for index in 0..names.len() {
        let _ = fs::remove_file(r.destination.join(format!("part-{index:06}.mkv")));
    }
    let _ = fs::remove_file(list);
    Ok(asset)
}
// Browser preview uses an MP4 with AAC audio; PCM remains in the export master.
fn prepare_browser_preview(r: &RetimeRequest<'_>, output: &Path) -> Result<PathBuf, String> {
    let preview = r.destination.join("preview.mp4");
    capture(
        r.ffmpeg,
        &strings(&[
            "-v",
            "error",
            "-y",
            "-i",
            &output.to_string_lossy(),
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            &preview.to_string_lossy(),
        ]),
        r.cancel,
        1024,
    )?;
    Ok(preview)
}
