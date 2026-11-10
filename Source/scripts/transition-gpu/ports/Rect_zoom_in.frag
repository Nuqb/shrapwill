// Port of Rect_zoom_in.cl, author RuanShengQiang, 2017/6/21.
// Pixel-center coordinates are supplied by the host's interpolated UV.
vec4 FUNCNAME(vec2 uv) {
    float progress = PREFIX(global_time) / PREFIX(total_time);
    float iPro = 3.0 * progress * progress - 2.0 * progress * progress * progress;
    float zoomDis = 0.5 * iPro;
    float matt = step(zoomDis, uv.x) * step(uv.x, 1.0-zoomDis)
        * step(zoomDis, uv.y) * step(uv.y, 1.0-zoomDis);
    return mix(INPUT2(uv), INPUT1(uv), matt);
}
