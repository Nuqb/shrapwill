#define SQRT3 1.732050807
#define PI 3.141592653
vec4 FUNCNAME(vec2 tc) 
{
	vec4 c = INPUT1(tc);
   
    int alpha = PREFIX(alpha);
    vec2 uv = tc;
    vec2 fragCoord = tc.xy * iResolution.xy;
	vec2 block = floor(fragCoord.xy / vec2(16));
	vec2 uv_noise = block / vec2(96);
    float iTime = PREFIX(global_time) ;
	uv_noise += floor(vec2(iTime) * vec2(1234.0, 3543.0)) / vec2(96);
	
	float block_thresh = pow(fract(iTime * 1236.0453), 2.0) * 0.2;
	float line_thresh = pow(fract(iTime * 2236.0453), 3.0) * 0.7;
	
	vec2 uv_r = uv, uv_g = uv, uv_b = uv;

	// glitch some blocks and lines
	if (INPUT2(uv_noise).b < block_thresh ||
		INPUT2(vec2(uv_noise.y, 0.0)).g < line_thresh) {

		vec2 dist = (fract(uv_noise) - 0.5) * 0.3;
		uv_r += dist * 0.1;
		uv_g += dist * 0.2;
		uv_b += dist * 0.125;
	}
    vec4 fragColor = c;
	fragColor.b = INPUT1(uv_r).b;
	fragColor.g = INPUT1(uv_g).g;
	fragColor.r = INPUT1(uv_b).r;

	// loose luma for some blocks
	if (INPUT2(uv_noise).g < block_thresh)
		fragColor.rgb = fragColor.ggg;

	// discolor block lines
	if (INPUT2(vec2(uv_noise.y, 0.0)).b * 3.5 < line_thresh)
		fragColor.rgb = vec3(0.0, dot(fragColor.rgb, vec3(1.0)), 0.0);

	// interleave lines in some blocks
	if (INPUT2(uv_noise).g * 1.5 < block_thresh ||
		INPUT2(vec2(uv_noise.y, 0.0)).g * 2.5 < line_thresh) {
		float line = fract(fragCoord.y / 3.0);
		vec3 mask = vec3(3.0, 0.0, 0.0);
		if (line > 0.333)
			mask = vec3(0.0, 3.0, 0.0);
		if (line > 0.666)
			mask = vec3(0.0, 0.0, 3.0);
		
		fragColor.xyz *= mask;
	}

    return mix( fragColor, c, 1.0 - float(alpha)/100.0 );
   
   
}