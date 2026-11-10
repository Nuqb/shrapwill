vec3 unpremultiply (vec3 color, float alpha) {
    float eq0 = step(0.0, -alpha);
    return color / (alpha + eq0) * (1.0 - eq0);
}

vec3 blendover (vec3 dst, vec3 src) {
	vec3 C1 = vec3(1.0);
    return C1 - (C1 - dst) * (C1 - src);
}

vec4 FUNCNAME(vec2 tc){ 
	float progress = PREFIX(global_time)/PREFIX(total_time);
	/*tc.y = 1.0 - tc.y;
	vec4 y3 = INPUT3(tc);	
	tc.y = 1.0 - tc.y;
	float strength = 0.5;
    float displacement = y3.r * strength;
    vec2 uvFrom = vec2(tc.x + progress * displacement, tc.y);
    vec2 uvTo = vec2(tc.x - (1.0 - progress) * displacement, tc.y);
   
    vec4 y1 = INPUT1(uvFrom);
	vec4 y2 = INPUT2(uvTo);*/
	
	//============
	vec4 base = vec4(1.0);
	float u_opacity1 = 1.0;
	float u_opacity2 = 1.0;
	if(progress<0.5)
		base = INPUT1(tc);
	else
		base = INPUT2(tc);
	
    vec4 src1 = INPUT3(tc) * u_opacity1;
    vec4 src2 = INPUT4(tc) * u_opacity2;

    base = src1 + base * (1.0 - src1.a);

    vec3 dst = unpremultiply(base.rgb, base.a);
    vec3 src = unpremultiply(src2.rgb, src2.a);
    vec3 res = blendover(dst, src);
    dst = mix(dst, res, src2.a);
	vec4 ret = vec4(dst,base.a);

	//============
    return ret;
}