vec4 FUNCNAME(vec2 tc) {
	float iGlobalTime = PREFIX(global_time);
	float iTotalTime = PREFIX(total_time);
	float iDuration = PREFIX(duration);

	vec4 origCol = INPUT(tc);
	vec4 retCol = origCol;
	vec4 blackCol = vec4(0.0);
	
	float process = min(iGlobalTime / min(iDuration, iTotalTime), 1.0);
	float iPro = (3.0 * process * process - 2.0 * process * process * process); 
	
	if (abs(0.5 - tc.y) >= iPro * 0.5)
		retCol = blackCol;
	
	if(iGlobalTime > iDuration)
		retCol = origCol;
	
	return retCol;
}
