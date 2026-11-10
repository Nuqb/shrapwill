#ifdef GL_ES
precision highp float;
#endif
 
vec3 grayscale (vec3 color) {
  return vec3(0.2126*color.r + 0.7152*color.g + 0.0722*color.b);
}
 
vec4 FUNCNAME(vec2 tc) {
	float progress = PREFIX(global_time)/PREFIX(total_time);

	float grayPhase = 0.3; // if 0.0, the image directly turn grayscale, if 0.9, the grayscale transition phase is very important	vec4 fragOutColor;
	vec2 p = tc;
	vec4 fc = INPUT1(p);
	vec4 tc1 = INPUT2(p);
    fragOutColor = mix(
    mix(vec4(grayscale(fc.rgb), fc.a), INPUT1(p), smoothstep(1.0-grayPhase, 0.0, progress)),
    mix(vec4(grayscale(tc1.rgb), tc1.a), INPUT2(p), smoothstep(    grayPhase, 1.0, progress)),
					  progress);
	
	return fragOutColor;
}
