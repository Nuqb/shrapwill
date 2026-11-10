float blob(float x,float y,float fx,float fy){
   float speed= 0.5;
   float time = PREFIX(global_time);
   float xx = x+sin(time*fx/speed);
   float yy = y+cos(time*fy/speed)*99.9;

   return 25.0/sqrt(xx*xx+yy*yy);
}

vec4 FUNCNAME(vec2 tc){ 
	//float progress = PREFIX(global_time)/PREFIX(total_time);
	float iGlobalTime = PREFIX(global_time);
	float frequency = 40.0;
	//vec4 y1 = INPUT1(tc);
	//vec4 y2 = INPUT2(tc);
    vec4 ret = vec4(0.0);
	vec3 flash = vec3(0.0);
    vec3 blackCol = vec3(0.0);
	//vec4 RGBglit = vec4(0.0);
	float strength = 0.5 + 0.5 * sin(iGlobalTime * frequency);
    //
	vec2 position = tc-0.5;
    float x = position.x*2.0;
    float y = position.y*2.0;

    float a = blob(x,y,3.3,3.2) + blob(x,y,3.9,3.0);
    float b = blob(x,y,3.2,2.9) + blob(x,y,2.7,2.7);
    float c = blob(x,y,2.4,3.3) + blob(x,y,2.8,2.3);
   
    vec3 d = vec3(a,b,c)/50.0;
	flash = vec3(d.x,d.y,d.z);
   //
	float Amount = 0.3;
    float splitAmout = (1.0 + sin(iGlobalTime * 16.0)) * 0.5;
    splitAmout *= (0.05 * Amount);
    vec3 color = vec3(0.0);
   //
	//if(progress<0.5){
		//vec4 y1 = INPUT1(tc);
	color.r = INPUT(vec2(tc.x + splitAmout, tc.y)).r;
	color.g = INPUT(tc).g;
	color.b = INPUT(vec2(tc.x - splitAmout, tc.y)).b;
	ret.rgb = mix(color, blackCol, strength);
	ret.a = INPUT(tc).a;
	/*}
    else{
		//vec4 y2 = INPUT2(tc);
		color.r = INPUT2(vec2(tc.x + splitAmout, tc.y)).r;
		color.g = INPUT2(tc).g;
		color.b = INPUT2(vec2(tc.x - splitAmout, tc.y)).b;
		ret.rgb = color + flash;
		ret.a = INPUT2(tc).a;
	}*/
    return ret;
}


