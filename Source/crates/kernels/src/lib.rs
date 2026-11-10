//! Platform-independent computation. No file, media, UI, or desktop dependencies.
use serde::Serialize;

/// An implicit balanced interval tree, in source-start order. `order` retains
/// composition order; each midpoint stores its subtree's maximum end frame.
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackIndex {
    pub order: Vec<usize>,
    pub max_ends: Vec<i64>,
}
impl PlaybackIndex {
    pub fn build(intervals: impl IntoIterator<Item = (i64, i64)>) -> Self {
        let mut sorted: Vec<_> = intervals.into_iter().enumerate().collect();
        // Render plans contain sorted track runs; stable sort exploits those runs.
        sorted.sort_by_key(|&(order, (start, _))| (start, order));
        let mut index = Self {
            order: sorted.iter().map(|(order, _)| *order).collect(),
            max_ends: vec![0; sorted.len()],
        };
        index.fill_maxima(&sorted, 0, sorted.len());
        index
    }
    fn fill_maxima(&mut self, sorted: &[(usize, (i64, i64))], first: usize, end: usize) -> i64 {
        if first == end {
            return i64::MIN;
        }
        let mid = first + (end - first) / 2;
        let maximum = sorted[mid]
            .1
             .1
            .max(self.fill_maxima(sorted, first, mid))
            .max(self.fill_maxima(sorted, mid + 1, end));
        self.max_ends[mid] = maximum;
        maximum
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn index_preserves_composition_order_and_subtree_bounds() {
        let index = PlaybackIndex::build([(30, 60), (0, 300), (30, 40), (10, 20)]);
        assert_eq!(index.order, [1, 3, 0, 2]);
        assert_eq!(index.max_ends, [300, 300, 300, 40]);
        assert!(PlaybackIndex::build([]).order.is_empty());
    }
}
