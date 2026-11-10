

vec4 FUNCNAME(vec2 tc) 
{
	float iGlobalTime = PREFIX(global_time);
	float totalTime = PREFIX(total_time);
	
	float process = min(iGlobalTime / totalTime, 1.0);
	float iPro = (3.0 * process * process - 2.0 * process * process * process* process);
	
	vec4 y1 = INPUT1(tc);
	vec4 y2 = INPUT2(tc);
	
	float diff = abs((y2.r + y2.g + y2.b)/3.0- (y1.r + y1.g + y1.b)/3.0);
    float alpha = clamp((diff-process)/(process + 0.00000001), 0.0, 1.0);
	
	vec4 ret = mix(y1, y2, 1.0 - alpha);

    //vec4 ret = mix(y1, y2, process);
	// ret = vec4(ret.rgb,1.0);
	
	return ret;
}