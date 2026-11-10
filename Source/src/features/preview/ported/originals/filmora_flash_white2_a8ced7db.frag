vec4 FUNCNAME(vec2 tc) {
	float iGlobalTime = PREFIX(global_time);
	float frequency = PREFIX(frequency);

	vec4 origCol = INPUT(tc);
	vec4 whiteCol = vec4(1.0);
	
	float strength = 0.5 + 0.5 * sin(iGlobalTime * frequency);
	strength *= 0.2;
	
	vec4 retCol = mix(origCol, whiteCol, strength);
	retCol.a = origCol.a;
	retCol.rgb *= retCol.a;
	
	return retCol;
}
