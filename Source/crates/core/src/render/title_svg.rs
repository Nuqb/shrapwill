use crate::Title;

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

struct Design {
    x: f64,
    y: f64,
    font: f64,
    anchor: &'static str,
    family: String,
    weight: u32,
    spacing: f64,
}
fn design(title: &Title, width: f64) -> Design {
    let (x, y, anchor) = match title.style.as_str() {
        "lower" => (width * 0.075, 853.2, "start"),
        "label" => (width * 0.075, 918., "start"),
        "caption" => (width * 0.5, 875., "middle"),
        "credits" => (width * 0.5, 680., "middle"),
        _ => (width * 0.5, 518.4, "middle"),
    };
    let family = match title.style.as_str() {
        "cinematic" | "quote" | "retro" => "Georgia",
        _ => "Segoe UI",
    };
    let weight = match title.style.as_str() {
        "caption" | "headline" | "outline" => 800,
        "minimal" | "credits" => 400,
        _ => 600,
    };
    let spacing = match title.style.as_str() {
        "cinematic" => 8.,
        "minimal" => 3.,
        "label" => 4.,
        _ => 0.,
    };
    Design {
        x,
        y,
        font: title.font_size,
        anchor,
        family: family.into(),
        weight,
        spacing,
    }
}

fn decoration(style: &str, d: &Design, width: f64, lines: usize) -> String {
    let x = d.x;
    let y = d.y;
    let f = d.font;
    let height = f * (lines as f64 * 1.2 + 0.7);
    match style {
        "lower" => format!("<rect x='{}' y='{}' width='{}' height='{height}' rx='6' fill='#12151d' fill-opacity='0.8'/><rect x='{}' y='{}' width='6' height='{height}' fill='#38dfc3'/>",x-24.,y-f*1.15,width*0.62,x-24.,y-f*1.15),
        "label" => format!("<rect x='{}' y='{}' width='{}' height='{height}' rx='12' fill='#12151d' fill-opacity='0.85'/><circle cx='{}' cy='{}' r='6' fill='#38dfc3'/>",x-32.,y-f*1.15,width*0.56,x-18.,y-f*0.34),
        "caption" => format!("<rect x='{}' y='{}' width='{}' height='{height}' rx='14' fill='#10131b' fill-opacity='0.78'/>",width*0.08,y-f*1.15,width*0.84),
        "headline" => format!("<rect x='{}' y='{}' width='{}' height='8' fill='#38dfc3'/>",width*0.3,y+f*(lines as f64-1.)*1.2+32.,width*0.4),
        "quote" => format!("<path d='M {} {} h -42 v {} h 42' fill='none' stroke='#38dfc3' stroke-width='6'/>",width*0.12,y-f*1.1,height),
        "cinematic" => format!("<path d='M {} {} H {} M {} {} H {}' stroke='#ffffff' stroke-opacity='0.6' stroke-width='2'/>",width*0.35,y-f-36.,width*0.65,width*0.35,y+f*(lines as f64-1.)*1.2+40.,width*0.65),
        _ => String::new(),
    }
}

fn text_svg(title: &Title, d: &Design, line: &str, index: usize) -> String {
    let color = &title.color;
    let attrs = format!("x='{}' y='{}' text-anchor='{}' font-family='{}' font-weight='{}' font-size='{}' letter-spacing='{}'", d.x, d.y+index as f64*d.font*1.2,d.anchor,d.family,d.weight,d.font,d.spacing);
    let text = escape_xml(line);
    if let Some(paint) = crate::creative::titles()
        .iter()
        .find(|preset| preset.style == title.style)
        .and_then(|preset| preset.paint.as_ref())
    {
        return painted_text(&attrs, &text, color, paint);
    }
    match title.style.as_str() {
        "outline" => format!("<text {attrs} fill='none' stroke='{color}' stroke-width='3' stroke-linejoin='round'>{text}</text>"),
        "neon" => format!("<text {attrs} fill='none' stroke='{color}' stroke-opacity='0.2' stroke-width='16'>{text}</text><text {attrs} fill='none' stroke='{color}' stroke-opacity='0.4' stroke-width='7'>{text}</text><text {attrs} fill='{color}'>{text}</text>"),
        "retro" => format!("<g transform='translate(5,6)'><text {attrs} fill='#a64c42'>{text}</text></g><text {attrs} fill='{color}'>{text}</text>"),
        _ => format!("<text {attrs} fill='{color}'>{text}</text>"),
    }
}

fn painted_text(
    attrs: &str,
    text: &str,
    color: &str,
    paint: &crate::creative::TitlePaint,
) -> String {
    let shadow = &paint.shadow;
    let stroke = &paint.stroke;
    let blur = paint.shadow_blur / 2.;
    let opacity = paint.opacity;
    let stroke_opacity = paint.stroke_opacity;
    let shadow_opacity = paint.shadow_opacity;
    // SVG strokes straddle the glyph contour; double the outward border radius.
    let stroke_width = paint.stroke_width * 2.;
    format!("<defs><filter id='title-shadow' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='{blur}'/></filter></defs><text {attrs} fill='{shadow}' stroke='{shadow}' stroke-width='{stroke_width}' opacity='{shadow_opacity}' filter='url(#title-shadow)'>{text}</text><text {attrs} fill='none' stroke='{stroke}' stroke-width='{stroke_width}' stroke-opacity='{stroke_opacity}' stroke-linejoin='round'>{text}</text><text {attrs} fill='{color}' fill-opacity='{opacity}'>{text}</text>")
}

fn styled_design(title: &Title, width: f64) -> (Title, Design) {
    let preset = crate::creative::titles()
        .iter()
        .find(|p| p.style == title.style);
    let mut styled = title.clone();
    if let Some(p) = preset {
        if p.paint.is_none() {
            styled.style = p.base.clone();
        }
    }
    let mut d = design(&styled, width);
    if let Some(p) = preset {
        d.y = p.position * 1080.;
        d.spacing = p.spacing;
        d.weight = p.weight;
        d.family = p.family.clone();
        let longest = title
            .text
            .lines()
            .take(8)
            .map(|line| line.chars().count())
            .max()
            .unwrap_or(1)
            .max(1) as f64;
        let available = width * 0.82 - (longest - 1.) * d.spacing;
        d.font = d.font.min((available / (longest * 0.7)).max(8.));
    }
    (styled, d)
}

pub(super) fn title_svg(title: &Title, width: u32, height: u32) -> String {
    let scale = height as f64 / 1080.;
    let canvas_width = width as f64 / scale;
    let (styled, d) = styled_design(title, canvas_width);
    let preset = crate::creative::titles()
        .iter()
        .find(|p| p.style == title.style);
    let lines: Vec<_> = title.text.lines().take(8).collect();
    let mut backdrop = decoration(&styled.style, &d, canvas_width, lines.len().max(1));
    if let Some(p) = preset {
        backdrop = backdrop.replace("#38dfc3", &p.accent);
    }
    let text = lines
        .iter()
        .enumerate()
        .map(|(i, line)| text_svg(&styled, &d, line, i))
        .collect::<String>();
    format!("<svg xmlns='http://www.w3.org/2000/svg' width='{width}' height='{height}' viewBox='0 0 {canvas_width} 1080'>{backdrop}{text}</svg>")
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn title_markup_escapes_text_and_bounds_lines() {
        let title = Title {
            text: "<script> & \"hello\"\n2\n3\n4\n5\n6\n7\n8\n9".into(),
            style: "outline".into(),
            font_size: 72.,
            color: "#ffffff".into(),
            image_path: None,
        };
        let svg = title_svg(&title, 1920, 1080);
        assert!(svg.contains("&lt;script&gt; &amp; &quot;hello&quot;"));
        assert!(!svg.contains(">9</text>"));
        assert!(svg.contains("fill='none' stroke='#ffffff'"));
    }

    #[test]
    fn imported_treatment_reaches_title_renderer() {
        let preset = crate::creative::titles()
            .iter()
            .find(|p| p.paint.is_some())
            .unwrap();
        let title = Title {
            text: "Imported <title>".into(),
            style: preset.style.clone(),
            font_size: preset.font_size,
            color: preset.color.clone(),
            image_path: None,
        };
        let svg = title_svg(&title, 1920, 1080);
        assert!(svg.contains("feGaussianBlur"));
        assert!(svg.contains("stroke-opacity='0.7411764705882353'"));
        assert!(svg.contains("Imported &lt;title&gt;"));
        let tree = resvg::usvg::Tree::from_str(&svg, &resvg::usvg::Options::default());
        assert!(tree.is_ok(), "imported title must remain valid SVG");
    }
}
