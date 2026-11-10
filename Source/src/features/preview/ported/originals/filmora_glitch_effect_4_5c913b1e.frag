#define PI 3.141592653

vec4 FUNCNAME(vec2 tc){ 
	vec4 origCol = INPUT(tc);
	//float time = PREFIX(global_time)/PREFIX(total_time);
	float iGlobalTime = PREFIX(global_time);
	float totalTime = PREFIX(total_time);
	
	float frequency = PREFIX(speed);
	float strength = 0.5 + 0.5 * sin(iGlobalTime * frequency - PI * 0.5);
	vec4 fragcolor = vec4(0.0);
	vec2 uv  = tc;
	vec3 blackCol = vec3(0.8);
	
	vec3 acc = vec3(0.0);
    float delta = 0.1;
    float range = acos(-1.0);
	float width = 0.01*uv.x*uv.x+0.05;
	
	for(float i = -1.0; i <= 1.0; i += delta)
    {
		vec3 mask = 0.5 + 0.5 * cos(range * i + vec3(1.0, 0.0, 1.0));
		acc += mask * INPUT(uv - vec2(width * i, -width * i)).rgb;
    }
	
	fragcolor = vec4(delta * acc,1.0);
	fragcolor.rgb = mix(fragcolor.rgb, blackCol, strength);
	fragcolor.rgb *= origCol.a;
	return fragcolor;
}