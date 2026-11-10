
vec4 screen(vec4 base, vec4 blend)
{
    vec4 white = vec4(1.0);
    vec4 result = white - ((white - blend) * (white - base));
	
    return result;
}

vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d)
{
	return a + b*cos( 6.28318*(c*t+d) );
}

vec4 FUNCNAME(vec2 tc)
{    
	int alpha = PREFIX(alpha); 
	float time = PREFIX(global_time);
	
	vec4 orig = INPUT(tc);		
    vec2 uv = 2.0f * tc - vec2(1.0f);
	vec3 a = vec3(0.5,0.5,0.5);
	vec3 b = vec3(0.5,0.5,0.5);
	vec3 c = vec3(1.0,1.0,1.0);
	vec3 d = vec3(0.0,0.33,0.67);
	
	float speed = PREFIX(speed);
	vec3 colX = pal( tc.x + fract(speed*time) * sign( uv.y), a, b, c, d );
	vec3 colY = pal( tc.y + fract(speed*time) * sign(-uv.x), a, b, c, d );			
	
	vec4 retColor = vec4(0.0);	
	float p = 10.0;
	
	if(uv.x < 0.0) uv.x = -uv.x;
	if(uv.y < 0.0) uv.y = -uv.y;
	
    retColor.rgb += (pow(uv.x, p)*colY + pow(uv.y, p)*colX -pow(uv.x,p)*pow(uv.y, p)*colX*colY);
	
	retColor.a = 1.0;
	retColor = screen(orig, retColor);	
	
	return mix(orig, retColor, float(alpha)/100.0);
}