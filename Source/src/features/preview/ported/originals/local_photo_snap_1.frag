vec3 clamps(vec3 img){
    img.r = clamp(img.r, 0.0, 1.0);
    img.g = clamp(img.g, 0.0, 1.0);
    img.b = clamp(img.b, 0.0, 1.0);
    return img;
}
vec4 FUNCNAME(vec2 tc) {
	vec2 uv = tc;
    float uGlow = PREFIX(uGlow);
    float uCamera = PREFIX(uCamera);
    vec4 res = INPUT1(uv);
    vec4 res2 = vec4(vec3(uGlow), 1.0);
    res.r = clamp(res.r * res2.r, 0.0, 1.0);
    res.g = clamp(res.g * res2.g, 0.0, 1.0);
    res.b = clamp(res.b * res2.b, 0.0, 1.0);
    vec4 CameraTexture = INPUT2(vec2(uv.x, 1.0 - uv.y));
    CameraTexture.rgb *= CameraTexture.a;
    
    CameraTexture.rgb += res.rgb;
    CameraTexture.a = CameraTexture.r;
    CameraTexture.rgb = clamps(CameraTexture.rgb);
    res = mix(res, CameraTexture, uCamera);
    return res;
}
