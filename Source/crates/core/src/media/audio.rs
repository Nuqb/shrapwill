//! Shared full-clip DSP for preview and export; originals are never rewritten.
use super::*;
use crate::AudioSettings;

const FREQUENCIES: [u32; 10] = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

pub fn filters(a: &AudioSettings) -> Result<String, String> {
    if !a.valid() {
        return Err("Invalid audio settings.".into());
    }
    let effective = a.effective();
    let a = &effective;
    let mut f = vec![
        "aresample=48000".to_string(),
        "aformat=channel_layouts=stereo".into(),
    ];
    let routing = match a.channels.as_str() {
        "mono" => "pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1",
        "left" => "pan=stereo|c0=c0|c1=c0",
        "right" => "pan=stereo|c0=c1|c1=c1",
        "swap" => "pan=stereo|c0=c1|c1=c0",
        _ => "anull",
    };
    f.push(routing.into());
    cleanup(a, &mut f);
    voice(a, &mut f);
    for (hz, db) in FREQUENCIES.iter().zip(a.equalizer) {
        if db != 0. {
            f.push(format!("equalizer=f={hz}:t=o:w=1:g={db}"));
        }
    }
    if a.normalize {
        f.push(format!("loudnorm=I={}:TP=-1.5:LRA=11", a.normalize_target));
    }
    f.push(format!(
        "pan=stereo|c0={}*c0|c1={}*c1",
        1. - a.balance.max(0.),
        1. + a.balance.min(0.)
    ));
    Ok(f.join(","))
}

fn cleanup(a: &AudioSettings, f: &mut Vec<String>) {
    if a.wind_removal {
        f.push("highpass=f=120:p=2".into());
    }
    if a.hiss > 0. {
        f.push(format!(
            "afftdn=nt=w:nr={}:nf={}",
            1. + a.hiss * 29.,
            -70. + a.hiss_noise_volume * 5.
        ));
    }
    if a.denoise > 0. {
        f.push(format!("afftdn=nr={}:nf=-50:tn=1", 1. + a.denoise * 29.));
    }
    if a.dehum > 0 {
        for multiple in 1..=4 {
            let mix = if a.hum_reduction <= -60. {
                1.
            } else {
                1. - 10_f64.powf(a.hum_reduction / 20.)
            };
            f.push(format!(
                "bandreject=f={}:t=h:w=4:mix={mix}",
                a.dehum * multiple
            ));
        }
    }
    if a.reverb_reduction > 0. {
        f.push(format!(
            "agate=threshold={}:ratio={}:range=0.2:attack=5:release=120:detection=rms",
            0.001 + a.reverb_reduction * 0.019,
            1. + a.reverb_reduction * 5.
        ));
    }
    if a.deess > 0. {
        f.push(format!("deesser=i={}:m=0.5:f=0.5", a.deess));
    }
}

fn voice(a: &AudioSettings, f: &mut Vec<String>) {
    let shift = match a.voice_character.as_str() {
        "chipmunk" => 7.,
        "deep" => -5.,
        "male-mix" => -2.,
        "hacker" => -4.,
        "monster" => -9.,
        "child" => 5.,
        "man" => -3.,
        "woman" => 3.,
        "husky" => -2.,
        "transformer" => -6.,
        "helium" => 10.,
        "evil" => -7.,
        _ => 0.,
    } + a.pitch;
    pitch(shift, f);
    if a.voice_character == "robot" {
        f.push("tremolo=f=40:d=0.9".into());
    }
    if a.voice_character == "monster" {
        f.push("aecho=0.8:0.8:25:0.3".into());
    }
    match a.voice_character.as_str() {
        "male-mix" => f.push("chorus=0.5:0.8:20|35:0.2|0.15:0.3|0.4:1|1.5".into()),
        "hacker" => f.push("highpass=f=150,lowpass=f=4200,tremolo=f=24:d=0.6".into()),
        "rotating-voice" => f.push("apulsator=mode=sine:hz=0.5:amount=0.8".into()),
        "trembling-voice" => f.push("vibrato=f=6:d=0.4".into()),
        "husky" => f.push("lowpass=f=5500,acompressor=threshold=0.1:ratio=3:makeup=1.5".into()),
        "robot-2" | "transformer" => f.push("aphaser=in_gain=0.4:out_gain=0.74:delay=3:decay=0.4:speed=0.5:type=t,tremolo=f=30:d=0.7".into()),
        "water" => f.push("aphaser=delay=3:decay=0.4:speed=1,vibrato=f=4:d=0.3".into()),
        "evil" => f.push("aecho=0.8:0.8:60|120:0.3|0.15".into()),
        _ => {}
    }
    f.push(voice_filter(&a.voice_filter).into());
}

fn pitch(shift: f64, f: &mut Vec<String>) {
    if shift != 0. {
        let ratio = 2_f64.powf(shift / 12.);
        f.push(format!("asetrate={},aresample=48000", 48000. * ratio));
        let mut tempo = 1. / ratio;
        while tempo < 0.5 {
            f.push("atempo=0.5".into());
            tempo /= 0.5;
        }
        while tempo > 2. {
            f.push("atempo=2".into());
            tempo /= 2.;
        }
        f.push(format!("atempo={tempo}"));
    }
}

fn voice_filter(name: &str) -> &'static str {
    match name {
        "roadside" => "highpass=f=100,aecho=0.8:0.8:35:0.12",
        "forest" => "aecho=0.8:0.8:85|150:0.12|0.08,lowpass=f=9000",
        "glacier" => "aecho=0.8:0.8:180|360:0.28|0.15,highpass=f=120",
        "surround-music" => "stereotools=mlev=0.8:slev=1.7",
        "haas" => "adelay=0|18",
        "rain" => "lowpass=f=6500,aecho=0.8:0.8:45:0.14",
        "desert" => "highpass=f=180,aecho=0.8:0.8:140:0.08",
        "wind" => "highpass=f=100,tremolo=f=0.6:d=0.2",
        "electrical" => "tremolo=f=50:d=0.7,aphaser=delay=2:decay=0.3:speed=0.5",
        "diving-suit" => "lowpass=f=1500,aecho=0.8:0.8:25:0.25",
        "telephone" => "highpass=f=300,lowpass=f=3400",
        "radio" => "highpass=f=200,lowpass=f=5000,acompressor=threshold=0.1:ratio=4:makeup=2",
        "echo" => "aecho=0.8:0.8:350:0.5",
        "large-room" => "aecho=0.8:0.8:60|110|170:0.35|0.25|0.15",
        "small-room" => "aecho=0.8:0.8:20|40:0.25|0.15",
        "lobby" => "aecho=0.8:0.8:90|140|210:0.3|0.25|0.15",
        "corridor" => "aecho=0.8:0.8:90|180|270:0.4|0.25|0.15",
        "cave" => "aecho=0.8:0.8:240|480|720:0.45|0.3|0.2",
        "church" => "aecho=0.8:0.8:120|240|480|960:0.35|0.3|0.2|0.1",
        "megaphone" => "highpass=f=400,lowpass=f=3000,volume=4,asoftclip=type=tanh",
        "phonograph" => "highpass=f=250,lowpass=f=3500,vibrato=f=0.8:d=0.2",
        "vinyl" => "highpass=f=100,lowpass=f=7000,vibrato=f=0.5:d=0.15",
        "surround" => "stereotools=mlev=1:slev=1.5",
        "rotating" => "apulsator=mode=sine:hz=0.5:amount=0.8",
        "trembling" => "vibrato=f=6:d=0.4",
        "walkie-talkie" => {
            "highpass=f=400,lowpass=f=2500,acompressor=threshold=0.05:ratio=6:makeup=2"
        }
        _ => "anull",
    }
}

pub struct AudioRequest<'a> {
    pub ffmpeg: &'a Path,
    pub source: &'a Path,
    pub source_in: f64,
    pub duration: f64,
    pub settings: &'a AudioSettings,
    pub cache: &'a Path,
    pub cancel: &'a Cancel,
}

pub fn prepare(r: AudioRequest<'_>) -> Result<PathBuf, String> {
    let chain = filters(r.settings)?;
    if !r.source_in.is_finite() || r.source_in < 0. || !r.duration.is_finite() || r.duration <= 0. {
        return Err("Invalid audio timing.".into());
    }
    let output = cache_path(r.source, (r.source_in, r.duration), r.settings, r.cache)?;
    let dir = output.parent().ok_or("Invalid audio cache path.")?;
    let lock = preparation_lock::entry_lock(dir);
    let _guard = preparation_lock::acquire(&lock, r.cancel)?;
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    fs::write(dir.join("last-used"), []).map_err(|e| e.to_string())?;
    if output.is_file() {
        return Ok(output);
    }
    encode(&r, &chain, dir)?;
    Ok(output)
}

pub fn cache_path(
    source: &Path,
    timing: (f64, f64),
    settings: &AudioSettings,
    cache: &Path,
) -> Result<PathBuf, String> {
    let chain = filters(settings)?;
    let metadata = fs::metadata(source).map_err(|e| e.to_string())?;
    let mut hash = DefaultHasher::new();
    (
        "audio-v1",
        source,
        metadata.modified().ok(),
        metadata.len(),
        timing.0.to_bits(),
        timing.1.to_bits(),
        &chain,
    )
        .hash(&mut hash);
    Ok(cache
        .join(format!("audio-{:016x}", hash.finish()))
        .join("audio.flac"))
}

fn encode(r: &AudioRequest<'_>, chain: &str, dir: &Path) -> Result<(), String> {
    let temporary = dir.join("pending.flac");
    fs::write(dir.join(".preparing"), []).map_err(|e| e.to_string())?;
    let args = strings(&[
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-threads",
        "2",
        "-filter_threads",
        "2",
        "-ss",
        &r.source_in.to_string(),
        "-t",
        &r.duration.to_string(),
        "-i",
        &r.source.to_string_lossy(),
        "-map",
        "0:a:0",
        "-vn",
        "-af",
        &format!("{chain},apad,atrim=duration={}", r.duration),
        "-c:a",
        "flac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-progress",
        "pipe:1",
        "-nostats",
        &temporary.to_string_lossy(),
    ]);
    let result = run_progress(r.ffmpeg, &args, r.cancel, r.duration, &|_| {})
        .and_then(|()| fs::rename(&temporary, dir.join("audio.flac")).map_err(|e| e.to_string()));
    let _ = fs::remove_file(dir.join(".preparing"));
    if result.is_err() {
        let _ = fs::remove_file(temporary);
    }
    result
}
