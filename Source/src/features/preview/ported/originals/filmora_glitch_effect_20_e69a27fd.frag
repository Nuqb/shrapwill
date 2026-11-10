/*vec4 camera(int frameID,vec4 blend2,vec4 blend3,vec4 blend4,vec4 blend5,vec4 blend6,vec4 blend7,vec4 blend8,vec4 blend9,vec4 blend10)
{
	vec4 m = vec4(0.0);
	if(frameID%14 == 0)
		m = blend2;
	if(frameID%14 == 1)
		m = blend3;
	if(frameID%14 == 2)
		m = blend4;
	if(frameID%14 == 3)
		m = blend5;
	if(frameID%14 == 4)
		m = blend6;
	if(frameID%14 == 5)
		m = blend7;
	if(frameID%14 == 6)
		m = blend8;
	if (frameID%14 == 7)
		m = blend9;
	if (frameID%14 == 8)
		m = blend8;
	if (frameID%14 == 9)
		m = blend10;
	if (frameID%14 == 10)
		m = blend9;
	if (frameID%14 == 11)
		m = blend3;
	if (frameID%14 == 12)
		m = blend10;
	if (frameID%14 == 13)
		m = blend8;
	return m;
}

float blob(float x,float y,float fx,float fy){
   float speed= 0.1;
   float time = PREFIX(global_time);
   float xx = x+sin(time*fx/speed);
   float yy = y+cos(time*fy/speed)*99.9;

   return 25.0/sqrt(xx*xx+yy*yy);
}

vec4 FUNCNAME(vec2 tc) 
{
	float iGlobalTime = PREFIX(global_time);
	float totalTime = PREFIX(total_time);
	float process = min(iGlobalTime / totalTime, 1.0);
	float iPro = (3.0 * process * process - 2.0 * process * process * process* process);
	//
	vec4 y1 = vec4(0.0);//INPUT1(tc);
	vec4 y2 = vec4(0.0);//INPUT2(tc);
	float frequency = 40.0;
    //vec4 ret = vec4(0.0);
	vec4 retCol = vec4(0.0);
	vec3 flash = vec3(0.0);
    vec3 blackCol = vec3(1.0);
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
  
	//vec4 y1 = INPUT1(tc);
	//vec4 y2 = INPUT2(tc);
	vec2 uv = tc;

	vec4 blend2 = INPUT3(uv);
	vec4 blend3 = INPUT4(uv);
	vec4 blend4 = INPUT5(uv);
	vec4 blend5 = INPUT6(uv);
	vec4 blend6 = INPUT7(uv);
	vec4 blend7 = INPUT8(uv);
	vec4 blend8 = INPUT9(uv);
	vec4 blend9 = INPUT10(uv);
	vec4 blend10 = INPUT11(uv);
	//vec4 blend11 = INPUT12(uv);
	
	int frameID = int(iPro*14.0);
	vec4 base = camera(frameID,blend2,blend3,blend4,blend5,blend6,blend7,blend8,blend9,blend10);
	
	//if(iPro<=0.5){
	color.r = INPUT1(vec2(tc.x + splitAmout, tc.y)).r;
	color.g = INPUT1(tc).g;
	color.b = INPUT1(vec2(tc.x - splitAmout, tc.y)).b;
	retCol.rgb = mix(color, blackCol, strength);
	retCol.a = INPUT1(tc).a;
	
	retCol.rgb = (retCol.rgb+base.rgb)*0.9;
	
	retCol.rgb *= retCol.a;
	return retCol;
}*/
vec3 admix(vec3 src1,vec3 src2){
    return vec3(1.0)-(vec3(1.0)-src1)*(vec3(1.0)-src2);
}

float blob(float x,float y,float fx,float fy){
   float speed= 0.1;
   float time = PREFIX(global_time);
   float xx = x+sin(time*fx/speed);
   float yy = y+cos(time*fy/speed)*99.9;

   return 25.0/sqrt(xx*xx+yy*yy);
}

vec4 FUNCNAME(vec2 tc) {
    vec4 src = INPUT1(tc);
    vec4 maskAlpha = INPUT2(tc);
	float iGlobalTime = PREFIX(global_time);
	float frequency = 10.0;
    
	vec3 retCol = vec3(0.0);
	vec3 flash = vec3(0.0);
    vec3 blackCol = vec3(1.0);
	float strength = 0.5 + 0.5 * sin(iGlobalTime * frequency);
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

	color.r = INPUT1(vec2(tc.x + splitAmout, tc.y)).r;
	color.g = INPUT1(tc).g;
	color.b = INPUT1(vec2(tc.x - splitAmout, tc.y)).b;
	retCol.rgb = mix(color, blackCol, strength);
	//retCol.a = INPUT(tc).a;

//
    vec4 ret = vec4(admix(src.rgb,maskAlpha.rgb)+flash,src.a);
    ret.rgb *= src.a;    
	return ret;
}
