#define bmp 170.0

vec2 uvp(vec2 uv) {
	return clamp(uv, 0.0, 1.0);
}

float outCirc(float t) {
    return sqrt(-t * t + 2.0 * t);
}

float rand(vec2 co) {
	return fract(sin(dot(co.xy,vec2(12.9898,78.233))) * 43758.5453);
}

vec4 FUNCNAME(vec2 tc){ 
    vec3 col = vec3(0.0);
	vec4 ret = vec4(0.0);
	vec4 texOrig = vec4(0.0);
	vec4 orig = INPUT(tc);
	
	float time = PREFIX(global_time)/PREFIX(total_time);
    float amp = (1.0 - outCirc(fract(time/60.0*bmp)));
	
	vec2 uv1 = tc;
	vec2 uv2 = tc;		
	vec2 uv3 = tc;			
	
	texOrig = INPUT(uvp(tc));
	uv1.x = tc.x + (rand(vec2(tc.y, time)) * 2.0 - 1.0) * amp * 0.08 * (texOrig.r + 0.2);
	col.r = INPUT(uvp(uv1)).r;
		

	uv2.x = tc.x + (rand(vec2(tc.y+1.0, time)) * 2.0 - 1.0) * amp * 0.08 * (texOrig.g + 0.2);
	col.g = INPUT(uvp(uv2)).g;	
		
		
	uv3.x = tc.x + (rand(vec2(tc.y+2.0, time)) * 2.0 - 1.0) * amp * 0.08 * (texOrig.b + 0.2);
	col.b = INPUT(uvp(uv3)).b;	
	
    ret = vec4(col,1.0);
	ret.rgb *= orig.a;
    return ret;
}