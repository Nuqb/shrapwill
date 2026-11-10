vec4 FUNCNAME(vec2 tc) {
	float iGlobalTime = PREFIX(global_time);
	float frequency = PREFIX(frequency);

	vec4 origCol = INPUT(tc);
	vec4 blackCol = vec4(0.0);
	
	float strength = 0.5 + 0.5 * sin(iGlobalTime * frequency);
	
	vec4 retCol = mix(origCol, blackCol, strength);
	retCol.a = origCol.a;
	
	return retCol;
}
