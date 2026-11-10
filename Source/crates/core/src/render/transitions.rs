use super::*;

// Coordinates are pixel centers normalized after crop/scale and before rotation.
// Keep these masks in sync with features/preview/transitions.ts.
fn legacy_threshold(kind: &str) -> Option<&'static str> {
    match kind {
        "wipe_left" => Some("1-(X+0.5)/W"),
        "wipe_right" => Some("(X+0.5)/W"),
        "wipe_up" => Some("1-(Y+0.5)/H"),
        "wipe_down" => Some("(Y+0.5)/H"),
        "iris_open" => Some("hypot((X+0.5)/W-0.5,(Y+0.5)/H-0.5)*sqrt(2)"),
        "iris_close" => Some("1-hypot((X+0.5)/W-0.5,(Y+0.5)/H-0.5)*sqrt(2)"),
        "blinds" => Some("mod((Y+0.5)/H*8,1)"),
        "checker" => {
            Some("mod(floor((X+0.5)/W*8)+floor((Y+0.5)/H*6),2)*0.5+mod((X+0.5)/W*8,1)*0.5")
        }
        _ => None,
    }
}

fn threshold(kind: &str) -> Option<String> {
    if let Some(mask) = legacy_threshold(kind) {
        return Some(mask.into());
    }
    let d = crate::creative::reveals().iter().find(|d| d.kind == kind)?;
    let (x, y) = if d.axis == 1 && d.family != "shape" {
        ("((Y+0.5)/H)", "((X+0.5)/W)")
    } else {
        ("((X+0.5)/W)", "((Y+0.5)/H)")
    };
    let n = d.count;
    let center = if n == 4 { 0.5 } else { 0.33 };
    let radius = if n == 4 { 0.5 } else { 0.67 };
    let c = if n == 4 { 0.5 } else { 0.2 };
    let edge = 1. - c;
    let mask = match d.family.as_str() {
        "diagonal" => {
            let yy = if d.axis == 1 {
                format!("(1-{y})")
            } else {
                y.into()
            };
            format!("({x}+{yy}*{n}/4)/(1+{n}/4)")
        }
        "door" => format!("abs({x}-{center})/{radius}"),
        "shape" if d.axis == 1 => format!("max(abs({x}-{c}),abs({y}-{c}))/{edge}"),
        "shape" => format!("(abs({x}-{c})+abs({y}-{c}))/(2*{edge})"),
        "stripe" => format!("mod({x}*{n},1)"),
        "zigzag" => format!("({x}+abs(mod({y}*{n},1)*2-1)*0.2)/1.2"),
        "tile" => format!("(floor({y}*{n})*{n}+floor({x}*{n})+mod({x}*{n},1))/({n}*{n})"),
        _ => return None,
    };
    Some(if d.reverse {
        format!("1-({mask})")
    } else {
        mask
    })
}

pub(super) fn transition_filter(c: &Clip, local: f64, fps: &crate::FrameRate) -> String {
    let Some(tr) = &c.transition else {
        return String::new();
    };
    if super::ported::shader(&tr.kind).is_some() {
        return String::new();
    }
    let td = fps.seconds(tr.frames);
    if tr.kind != "fade" && local >= td {
        return String::new();
    }
    if let Some(design) = crate::creative::motions()
        .iter()
        .find(|d| d.kind == tr.kind)
    {
        return super::motion_transitions::filter(design, local, td);
    }
    let progress = format!("min(1,max(0,({local}+T)/{td}))");
    let incoming = threshold(&tr.kind)
        .map(|mask| format!("if(gte({progress},1),1,gt({progress},{mask}))"))
        .unwrap_or(progress);
    let alpha = if tr.kind == "fade" {
        let remaining = fps.seconds(c.duration) - local;
        format!("{incoming}*min(1,max(0,({remaining}-T)/{td}))")
    } else {
        incoming
    };
    format!(",geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*({alpha})'")
}
