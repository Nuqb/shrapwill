float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec4 FUNCNAME(vec2 tc) 
{
	float iGlobalTime = PREFIX(global_time);
	float strength = PREFIX(strength);
	
	float time = random(vec2(iGlobalTime + 200.0));
	float amount = time * strength * 0.005;
	float frequency = 0.5;
	
	frequency = 6.0 * frequency * frequency + 1.0;
	float curve = 0.5 + 0.5 * cos(iGlobalTime * frequency);

	float rnd = random(vec2(tc.y * 100.0, iGlobalTime + 100.0)) * 2.0 - 1.0;
	float offset = rnd * step(1.0 - amount, abs(rnd));
	offset *= pow(random(vec2(iGlobalTime + 200.0)), 3.0) * curve * 0.1;
	
	float split = (time * 2.0 - 1.0) * 0.025;
	
	vec4 retCol = INPUT(vec2(tc.x + offset, tc.y));
	retCol.ga = INPUT(vec2(tc.x + offset + split, tc.y)).ga;
	retCol.rgb *= retCol.a;
	
    return retCol;
}