use crate::Properties;

fn sample(channel: &str, x: &str, y: &str) -> String {
    format!("{channel}(clip(({x})*W-0.5,0,W-1),clip(({y})*H-0.5,0,H-1))")
}
fn coordinates(p: &Properties) -> (String, String) {
    let x = "((X+0.5)/W)";
    let y = "((Y+0.5)/H)";
    let vx = format!("({x}-0.5)");
    let vy = format!("({y}-0.5)");
    let radius = format!("hypot({vx},{vy})");
    let a = p.effect_amount;
    match p.effect_style {
        8 => {
            let factor = format!("(1+{a}*2*({vx}*{vx}+{vy}*{vy}))");
            (format!("0.5+{vx}*{factor}"), format!("0.5+{vy}*{factor}"))
        }
        9 => {
            let angle = format!("({a}*5*max(0,0.75-{radius}))");
            (
                format!("0.5+{vx}*cos({angle})-{vy}*sin({angle})"),
                format!("0.5+{vx}*sin({angle})+{vy}*cos({angle})"),
            )
        }
        10 => {
            let angle = format!("abs(mod(atan2({vy},{vx})+2*PI,2*PI/6)-PI/6)");
            (
                format!("{x}*(1-{a})+(0.5+{radius}*cos({angle}))*{a}"),
                format!("{y}*(1-{a})+(0.5+{radius}*sin({angle}))*{a}"),
            )
        }
        _ => (x.into(), y.into()),
    }
}
fn detail(p: &Properties, channel: &str) -> String {
    let x = "((X+0.5)/W)";
    let y = "((Y+0.5)/H)";
    let a = p.effect_amount;
    let step = 0.003 + a * 0.012;
    let c = sample(channel, x, y);
    let left = sample(channel, &format!("{x}-{step}"), y);
    let right = sample(channel, &format!("{x}+{step}"), y);
    let up = sample(channel, x, &format!("{y}-{step}"));
    let down = sample(channel, x, &format!("{y}+{step}"));
    if p.effect_style == 4 {
        return format!("({c})*(1-{a})+(abs(({right})-({left}))+abs(({down})-({up})))*2*{a}");
    }
    if p.effect_style == 5 {
        return format!("({c})*(1-{a})+(127.5+({right})-({left})+({down})-({up}))*{a}");
    }
    let taps: Vec<_> = (-1..=1)
        .flat_map(|dx| {
            (-1..=1).map(move |dy| {
                sample(
                    channel,
                    &format!("{x}+({dx})*{step}"),
                    &format!("{y}+({dy})*{step}"),
                )
            })
        })
        .collect();
    let blur = format!("(({})/9)", taps.join("+"));
    match p.effect_style {
        1 => format!("({c})*(1-{a})+{blur}*{a}"),
        2 => format!("({c})+{blur}*{blur}/255*{a}*0.8"),
        _ => format!("({c})+(({c})-{blur})*{a}*2"),
    }
}
fn channel(p: &Properties, channel: &str, offset: i64) -> String {
    if p.effect_style <= 5 {
        return detail(p, channel);
    }
    let (x, y) = coordinates(p);
    let c = sample(channel, &x, &y);
    let a = p.effect_amount;
    if p.effect_style == 6 {
        return format!("({c})+(mod((floor({x}*320)*17+floor({y}*180)*131+(N+{offset})*23)/127,1)*2-1)*{a}*0.15*255");
    }
    if p.effect_style == 7 {
        let r = sample("r", &x, &y);
        let g = sample("g", &x, &y);
        let b = sample("b", &x, &y);
        let light = format!("(({r})*0.2126+({g})*0.7152+({b})*0.0722)/255");
        return format!("({c})*(1-{a})+lt(hypot(mod({x}*40,1)-0.5,mod({y}*22.5,1)-0.5),sqrt(max(0,{light}))*0.65)*255*{a}");
    }
    c
}
pub(super) fn filter(p: &Properties, offset: i64) -> String {
    if p.effect_style == 0 || p.effect_amount == 0. {
        return String::new();
    }
    let rgb: Vec<_> = ["r", "g", "b"]
        .iter()
        .map(|c| format!("{c}='clip({},0,255)'", channel(p, c, offset)))
        .collect();
    let (x, y) = coordinates(p);
    let alpha = sample("alpha", &x, &y);
    format!(
        ",format=gbrap,geq={}:a='{alpha}':interpolation=bilinear,format=rgba",
        rgb.join(":")
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn styles_render_distinct_pictures_without_unrequested_camera_motion() {
        let ffmpeg = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe");
        let mut pictures = std::collections::HashSet::new();
        let frame_size = 64 * 48 * 4;
        for style in 1..=10 {
            let p = Properties {
                effect_style: style,
                effect_amount: 0.8,
                ..Default::default()
            };
            let graph = format!("format=rgba{}", filter(&p, 0));
            let result = std::process::Command::new(&ffmpeg)
                .args([
                    "-v",
                    "error",
                    "-f",
                    "lavfi",
                    "-i",
                    "testsrc2=s=64x48:r=1:d=1,loop=loop=2:size=1:start=0",
                    "-vf",
                    &graph,
                    "-frames:v",
                    "3",
                    "-pix_fmt",
                    "rgba",
                    "-f",
                    "rawvideo",
                    "-",
                ])
                .output()
                .unwrap();
            assert!(
                result.status.success(),
                "style {style}: {}",
                String::from_utf8_lossy(&result.stderr)
            );
            assert_eq!(result.stdout.len(), frame_size * 3);
            let first = &result.stdout[..frame_size];
            assert!(
                pictures.insert(first.to_vec()),
                "style {style} duplicates another algorithm"
            );
            if style != 6 {
                assert_eq!(
                    first,
                    &result.stdout[frame_size..frame_size * 2],
                    "static style {style} moved the image"
                );
            }
        }
    }
}
