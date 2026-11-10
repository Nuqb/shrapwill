use super::Title;

impl Title {
    pub(super) fn preset(style: String) -> Self {
        if let Some(preset) = crate::creative::titles().iter().find(|p| p.style == style) {
            return Self {
                text: preset.sample.clone(),
                style,
                font_size: preset.font_size,
                color: preset.color.clone(),
                image_path: None,
            };
        }
        let (text, font_size, color) = match style.as_str() {
            "cinematic" => ("AFTER HOURS", 64., "#ffffff"),
            "caption" => ("MAKE IT HAPPEN", 86., "#ffffff"),
            "headline" => ("THE NEXT CHAPTER", 92., "#ffffff"),
            "outline" => ("STAND OUT", 110., "#ffffff"),
            "neon" => ("NIGHT LIGHTS", 90., "#76f7df"),
            "label" => ("SOMEWHERE NEW", 44., "#ffffff"),
            "quote" => ("Find your own way.", 68., "#ffffff"),
            "minimal" => ("less, but better", 52., "#ffffff"),
            "retro" => ("GOOD TIMES", 100., "#ffdf9e"),
            "credits" => ("MADE BY YOU\nThanks for watching", 48., "#ffffff"),
            _ => ("Your title", 72., "#ffffff"),
        };
        Self {
            text: text.into(),
            style,
            font_size,
            color: color.into(),
            image_path: None,
        }
    }
}
