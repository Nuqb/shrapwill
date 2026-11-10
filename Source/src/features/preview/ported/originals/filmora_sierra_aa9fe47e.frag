/*{
	"GUID":"BB101941-A116-4332-B70F-22DD4B4236BD",
	"INPUTS":[
		{
			"TYPE":"image",
			"FILE":"sierraVignette.png"
		},
		{
			"TYPE":"image",
			"FILE":"overlayMap.png"
		},
		{
			"TYPE":"image",
			"FILE":"sierraMap.png"
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
	 vec4 texel = orig;
     vec3 bbTexel = INPUT2(tc).rgb;
     
     texel.r = INPUT3(vec2(bbTexel.r, texel.r)).r;
     texel.g = INPUT3(vec2(bbTexel.g, texel.g)).g;
     texel.b = INPUT3(vec2(bbTexel.b, texel.b)).b;
     
     vec4 mapped;
     mapped.r = INPUT4(vec2(texel.r, .16666)).r;
     mapped.g = INPUT4(vec2(texel.g, .5)).g;
     mapped.b = INPUT4(vec2(texel.b, .83333)).b;
     mapped.a = orig.a;
     
     return mix(mapped, orig, 1.0 - float(alpha)/100.0);
}