#ifdef GL_ES
precision highp float;
#endif

vec4 FUNCNAME(vec2 tc) {	
	float progress = PREFIX(global_time)/PREFIX(total_time);
	vec2 resolution = iResolution;
	float interpolationPower = 5.0;

	vec2 p = tc;
	vec4 fTex = INPUT1(p);
	vec4 tTex = INPUT2(p);
	return mix(distance(fTex,tTex)>progress?fTex:tTex,tTex,pow(progress,interpolationPower));
}
