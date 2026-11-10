/*{
	"GUID":"BB101941-A066-4332-B70F-22DD4B4236BD",
	"INPUTS":[
		{
			"TYPE":"image",
			"FILE":"inkwellMap.png"
		}
	],
	"PARAMS":[
		{
			"NAME":"alpha",
			"TYPE":"int",
			"DEFAULT":100,
			"MIN":0,
			"MAX":100
		}
	]
}*/

int alpha = PREFIX(alpha);
vec4 FUNCNAME(vec2 tc) 
{
	vec4 orig = INPUT1(tc);
	 vec3 texel = orig.rgb;
	 
     texel = vec3(dot(vec3(0.3, 0.6, 0.1), texel));
	
     texel = vec3(INPUT2(vec2(texel.r, .16666)).r);
	 
	 return mix(vec4(texel, orig.a), orig, 1.0 - float(alpha)/100.0);
}