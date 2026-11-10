vec4 FUNCNAME(vec2 tc) {
	float iGlobalTime = PREFIX(global_time);
    float frequency = 100.001 - PREFIX(frequency);
	frequency *= 0.005;

	float process = fract(iGlobalTime / frequency);
	
	vec2 center = vec2(0.5);
	float scale = 1.0 - process * 0.5;	
	vec2 uv = (tc - center) * scale + center;
	vec4 retCol = INPUT(uv);
	
	float factor = 0.5 - process * 0.5;		
	vec4 origCol = INPUT(tc);
	retCol = mix(origCol, retCol, factor);

	return retCol;
}