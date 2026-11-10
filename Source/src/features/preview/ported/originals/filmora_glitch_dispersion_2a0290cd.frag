float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec4 FUNCNAME(vec2 tc) 
{
	float iGlobalTime = PREFIX(global_time);
	float iTotalTime = PREFIX(total_time);
	float process = iGlobalTime / iTotalTime;
	float iStrength = PREFIX(strength) * 0.1;

	float rnd = pow(random(vec2(process)), 10.0);
	float offset = rnd * iStrength;
	float randSign = sign(2.0 * random(vec2(process * 2.0)) - 1.0);
	
    vec4 retCol;
	retCol.ga = INPUT(vec2(tc.x + offset * randSign, tc.y)).ga;
	retCol.r = INPUT(tc).r;
	retCol.b = INPUT(tc).b;
	
	retCol = clamp(retCol, 0.0, 1.0);
	
	vec4 origCol = INPUT(tc);
	vec4 outCol = vec4(mix(origCol.rgb, retCol.rgb, float(PREFIX(alpha))/100.0), retCol.a);
	outCol.rgb *= outCol.a;
	
    return outCol;
}