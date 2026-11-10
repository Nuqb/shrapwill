const PHOTOS: &[(&str, &[u8])] = &[
    (
        "harbor-portrait.jpg",
        include_bytes!("../../../../src/features/library/art/assets/harbor-portrait.jpg"),
    ),
    (
        "alpine-portrait.jpg",
        include_bytes!("../../../../src/features/library/art/assets/alpine-portrait.jpg"),
    ),
    (
        "city-cyclist.jpg",
        include_bytes!("../../../../src/features/library/art/assets/city-cyclist.jpg"),
    ),
    (
        "beach-surfer.jpg",
        include_bytes!("../../../../src/features/library/art/assets/beach-surfer.jpg"),
    ),
    (
        "garden-portrait.jpg",
        include_bytes!("../../../../src/features/library/art/assets/garden-portrait.jpg"),
    ),
    (
        "desert-traveler.jpg",
        include_bytes!("../../../../src/features/library/art/assets/desert-traveler.jpg"),
    ),
    (
        "cafe-still-life.jpg",
        include_bytes!("../../../../src/features/library/art/assets/cafe-still-life.jpg"),
    ),
    (
        "forest-dog.jpg",
        include_bytes!("../../../../src/features/library/art/assets/forest-dog.jpg"),
    ),
    (
        "sports-car.jpg",
        include_bytes!("../../../../src/features/library/art/assets/sports-car.jpg"),
    ),
    (
        "night-market.jpg",
        include_bytes!("../../../../src/features/library/art/assets/night-market.jpg"),
    ),
    (
        "coastal-sunset.jpg",
        include_bytes!("../../../../src/features/library/art/assets/coastal-sunset.jpg"),
    ),
    (
        "mountain-road.jpg",
        include_bytes!("../../../../src/features/library/art/assets/mountain-road.jpg"),
    ),
    (
        "street-dancer.jpg",
        include_bytes!("../../../../src/features/library/art/assets/street-dancer.jpg"),
    ),
    (
        "city-river.jpg",
        include_bytes!("../../../../src/features/library/art/assets/city-river.jpg"),
    ),
];

pub(super) const COUNT: usize = PHOTOS.len();

pub(super) fn photo(index: usize) -> Result<(&'static str, &'static [u8]), String> {
    PHOTOS
        .get(index)
        .copied()
        .ok_or_else(|| "Unknown preview photo".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_photos_match_the_browser_catalog_and_reject_unknown_indices() {
        let catalog: Vec<String> = serde_json::from_str(include_str!(
            "../../../../src/features/library/art/photo-catalog.json"
        ))
        .unwrap();
        assert_eq!(catalog.len(), COUNT);
        for (index, name) in catalog.iter().enumerate() {
            let (embedded_name, bytes) = photo(index).unwrap();
            assert_eq!(embedded_name, name);
            assert!(bytes.starts_with(&[0xff, 0xd8, 0xff]));
        }
        assert!(photo(COUNT).is_err());
        assert!(photo(usize::MAX).is_err());
    }
}
