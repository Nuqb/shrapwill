use super::*;

use crate::{Properties, Title};
#[test]
fn identity_lut() {
    let c = Clip {
        id: id(),
        media_id: None,
        name: "Title".into(),
        start: 0,
        duration: 30,
        source_in: 0.,
        link: None,
        audio_enabled: false,
        props: Properties::default(),
        title: Some(Title {
            text: "Test".into(),
            style: "plain".into(),
            font_size: 72.,
            color: "#ffffff".into(),
            image_path: None,
        }),
        transition: None,
    };
    let l = color_lut(&c);
    assert_eq!(&l[0..3], &[0., 0., 0.]);
    assert_eq!(&l[l.len() - 3..], &[1., 1., 1.]);
}
