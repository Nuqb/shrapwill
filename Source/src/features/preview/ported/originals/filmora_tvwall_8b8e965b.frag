/*{
	"GUID":"b1ac79de-98b0-56d8-c9e2-f024e7a2893e",
	"INPUTS":[
		{
			"TYPE":"image",
			"FILE":"Thriller.png"
		}
	],
	"PARAMS":[
		{
		}
	]
}*/
float intensity = float(PREFIX(alpha))/100.0;
float horizonetalCnts = float(PREFIX(splite));

vec4 FUNCNAME(vec2 tc) 
{
	 vec4 origCol = INPUT(tc);	 
	 int W = int(iResolution.x);
	 int H = int(iResolution.y);
	 int w = int(tc.x * iResolution.x);
	 int h = int(tc.y * iResolution.y);
	 int blockWidth = W / int(horizonetalCnts);
	 int blockHeight = H / int(horizonetalCnts);
	 vec2 uv = mod(vec2(tc.x * horizonetalCnts,tc.y * horizonetalCnts),vec2(1.0));
     vec4 scaleCol = INPUT(uv);
	 
	 if(w == 0 || w == blockWidth || w == (blockWidth*2) || h == 0 || h == blockHeight || h == (blockHeight*2))
		 scaleCol.rgb = vec3(0.0);
     
	 return scaleCol*intensity + origCol*(1.0 - intensity);
}