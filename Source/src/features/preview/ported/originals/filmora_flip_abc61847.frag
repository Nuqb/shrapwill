
int alpha = PREFIX(alpha); 
vec4 FUNCNAME(vec2 tc) 
{
	vec4 color = INPUT(vec2(1.0-tc.x,tc.y));
	vec4 origCol = INPUT(vec2(tc.x, tc.y));
    return mix(color, origCol, 1.0 - float(alpha)/100.0);
}