pub(super) fn shader(kind: &str) -> Option<&'static crate::transition_sources::OriginalShader> {
    crate::transition_sources::source(kind).filter(|entry| entry.status == "shader")
}
