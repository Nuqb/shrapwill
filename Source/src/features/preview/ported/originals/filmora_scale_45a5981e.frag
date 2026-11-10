vec4 FUNCNAME(vec2 tc) {
	float iGlobalTime = PREFIX(global_time);
	float iDuration = PREFIX(duration);

	float process = min(iGlobalTime / iDuration, 1.0);
	process = (3.0 * process * process - 2.0 * process * process * process);
	float scale = process;
	
	if(process < 0.05)
		scale = 1.0;
	else if(process <= 0.15)
		scale = 0.55;
	else if(process > 0.15 && process < 0.5)
		scale = 0.5;
	
	vec2 center = vec2(0.5);
	vec2 uv = (tc - center) * scale + center;

	vec4 retCol = INPUT(uv);
	
	return retCol;
}