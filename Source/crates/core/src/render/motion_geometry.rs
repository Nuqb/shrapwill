use crate::creative::MotionDesign;

pub(super) fn setup(d: &MotionDesign, progress: &str) -> String {
    let angle = format!("({})*ld(1)", d.spin);
    let factor = format!(
        "(1+({})*(ld(2)*ld(2)+ld(3)*ld(3))*ld(1))/(1+({})*ld(1))",
        d.warp, d.zoom
    );
    let mut code = format!("st(0,{progress});st(1,pow(1-ld(0),2));st(2,(X+0.5)/W-0.5);st(3,(Y+0.5)/H-0.5);st(4,cos({angle}));st(5,sin({angle}));st(6,{factor});st(7,(ld(2)*ld(4)-ld(3)*ld(5))*ld(6)+0.5+({})*ld(1));st(8,(ld(2)*ld(5)+ld(3)*ld(4))*ld(6)+0.5+({})*ld(1));", d.dx, d.dy);
    if d.pixel > 0. {
        code.push_str(&format!("st(6,max(0.0001,{}*ld(1)));st(7,(floor(ld(7)/ld(6))+0.5)*ld(6));st(8,(floor(ld(8)/ld(6))+0.5)*ld(6));", d.pixel));
    }
    if d.glitch > 0. {
        code.push_str(&format!(
            "st(7,ld(7)+{}*ld(1)*sin(floor((ld(3)+0.5)*24)*12+{}+ld(0)*25));",
            d.glitch, d.seed
        ));
    }
    code
}
pub(super) fn coverage(d: &MotionDesign) -> String {
    let x = "((X+0.5)/W)";
    let y = "((Y+0.5)/H)";
    let angle = format!("atan2({y}-0.5,{x}-0.5)");
    let threshold = match d.mask {
        0 => return "ld(0)".into(),
        1 => format!("abs({x}-0.5)*2"),
        2 => format!("({x}+{y})*0.5"),
        3 => format!("({angle}+PI)/(2*PI)"),
        4 => format!("mod(floor({x}*31)*17+floor({y}*23)*13+{},97)/97", d.seed),
        5 => format!("clip(hypot({x}-0.5,{y}-0.5)*sqrt(2)*(1+0.2*cos({angle}*6)),0,1)"),
        6 => format!("max(abs({x}-0.5),abs({y}-0.5))*2"),
        _ => unreachable!("only bundled mask enums are accepted"),
    };
    format!("if(gte(ld(0),1),1,gt(ld(0),{threshold}))")
}
pub(super) fn samples(d: &MotionDesign, channel: &str) -> String {
    let (dx, dy) = if d.dx == 0. && d.dy == 0. {
        ("ld(2)".into(), "ld(3)".into())
    } else {
        (d.dx.to_string(), d.dy.to_string())
    };
    (-2..=2)
        .map(|i| {
            let trail = f64::from(i) * 0.5 * d.blur;
            let x = format!("clip((ld(7)+({dx})*({trail})*ld(1))*W-0.5,0,W-1)");
            let y = format!("clip((ld(8)+({dy})*({trail})*ld(1))*H-0.5,0,H-1)");
            format!("{channel}({x},{y})/5")
        })
        .collect::<Vec<_>>()
        .join("+")
}
