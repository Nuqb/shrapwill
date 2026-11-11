use crate::{Clip, Properties};

fn coordinates(p: &Properties, offset: i64) -> (String, String) {
    if [p.mirror, p.mosaic, p.shake, p.wave]
        .iter()
        .all(|v| *v == 0.)
    {
        return ("X".into(), "Y".into());
    }
    let mut x = "((X+0.5)/W)".to_string();
    let mut y = "((Y+0.5)/H)".to_string();
    if p.mirror == 1. {
        x = format!("abs(2*{x}-1)");
    }
    if p.mosaic > 0. {
        let b = p.mosaic;
        x = format!("((floor(({x})/{b})+0.5)*{b})");
        y = format!("((floor(({y})/({b}*W/H))+0.5)*{b}*W/H)");
    }
    if p.shake > 0. {
        let s = p.shake;
        x = format!("(({x}-0.5)*(1-2*{s})+0.5+{s}*sin((N+{offset})*1.7))");
        y = format!("(({y}-0.5)*(1-2*{s})+0.5+{s}*0.6*sin((N+{offset})*2.3))");
    }
    if p.wave > 0. {
        x = format!("({x}+{}*sin(({y})*40+(N+{offset})*0.12))", p.wave);
    }
    (format!("(({x})*W-0.5)"), format!("(({y})*H-0.5)"))
}

fn legacy_neutral(p: &Properties) -> bool {
    [
        p.mosaic,
        p.rgb_split,
        p.shake,
        p.mirror,
        p.wave,
        p.vignette,
        p.scanlines,
    ]
    .iter()
    .all(|v| *v == 0.)
        && p.grade.vignette_settings[3] == 0.
}

pub(super) fn is_neutral(p: &Properties) -> bool {
    p.effect_strength == 0. || (legacy_neutral(p) && (p.effect_style == 0 || p.effect_amount == 0.))
}
pub(super) fn filter(clip: &Clip, offset: i64) -> String {
    let p = &clip.props;
    if p.effect_strength == 0. {
        return String::new();
    }
    let creative = super::creative_effects::filter(p, offset);
    if legacy_neutral(p) {
        return creative;
    }
    let (x, y) = coordinates(p, offset);
    let shift = p.rgb_split;
    // Explicit clamping matches WebGL's CLAMP_TO_EDGE sampling.
    let sample = |channel: &str, x: String| format!("{channel}(clip({x},0,W-1),clip({y},0,H-1))");
    let [size, roundness, feather, exposure, highlight] = p.grade.vignette_settings;
    let radius = format!("((pow((X+0.5)/W-0.5,2)+pow((Y+0.5)/H-0.5,2))*2*(1-{roundness})+pow(abs((X+0.5)/W-0.5)+abs((Y+0.5)/H-0.5),2)*{roundness})");
    let mask = format!(
        "pow(clip(({radius})/{},0,1),{})",
        size.max(0.05),
        (2. - 2. * feather).max(0.1)
    );
    let shade = |channel: &str| {
        format!("st(0,{channel});st(1,{mask});ld(0)*(1-{}*ld(1)*max(0,1-({highlight}-0.5)*2*ld(0)/255)+{exposure}*ld(1))*(1-{}*(0.5+0.5*cos((Y+0.5)/H*180*PI)))",p.vignette,p.scanlines)
    };
    let red = sample("r", format!("{x}+{shift}*W"));
    let green = sample("g", x.clone());
    let blue = sample("b", format!("{x}-{shift}*W"));
    let alpha = sample("alpha", x);
    let (rs, gs, bs) = (shade(&red), shade(&green), shade(&blue));
    format!("{creative},format=gbrap,geq=r='{rs}':g='{gs}':b='{bs}':a='{alpha}':interpolation=bilinear,format=rgba")
}
