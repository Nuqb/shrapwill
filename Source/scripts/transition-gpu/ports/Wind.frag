// Port of Wind.cl, author RuanShengQiang, 2017/6/21.
// Only OpenCL image I/O, vector constructors and scalar suffixes are adapted.
const float size = 0.2;
float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}
vec4 FUNCNAME(vec2 uv) {
    float progress = PREFIX(global_time) / PREFIX(total_time);
    float iPro = 3.0 * progress * progress - 2.0 * progress * progress * progress;
    float r = rand(vec2(iPro, uv.y));
    float m = smoothstep(0.0, -size, uv.x * (1.0-size) + size*r - iPro*(1.0+size));
    return mix(INPUT1(uv + vec2(-0.2*r*iPro, 0.0)), INPUT2(uv), m);
}
