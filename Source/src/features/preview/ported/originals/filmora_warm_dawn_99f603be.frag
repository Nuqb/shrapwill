/*{
	"GUID":"3266e53a-35fe-e8cc-be78-5b0cf4ecff58",
	"INPUTS":[
		{
			"TYPE":"image",
			"FILE":"WarmDawn.png"
		}
	],
	"PARAMS":[
		{
		}
	]
}*/

vec4 FUNCNAME(vec2 tc) 
{
     float intensity = float(PREFIX(alpha))/100.0;
     vec4 outputFragCol;
     vec4 textureColor = INPUT1(vec2(tc.x,tc.y));
     
     float blueColor = textureColor.r * 63.0;
     
     vec2 quad1;
     quad1.y = floor(floor(blueColor) / 8.0);
     quad1.x = floor(blueColor) - (quad1.y * 8.0);
     
     vec2 quad2;
     quad2.y = floor(ceil(blueColor) / 8.0);
     quad2.x = ceil(blueColor) - (quad2.y * 8.0);
     
     vec2 texPos1;
     texPos1.x = (quad1.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.b);
     texPos1.y = (quad1.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g);
     
     vec2 texPos2;
     texPos2.x = (quad2.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.b);
     texPos2.y = (quad2.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g);
     
     vec4 newColor1 = INPUT2(vec2(texPos1.x,texPos1.y));
     vec4 newColor2 = INPUT2(vec2(texPos1.x,texPos1.y));
     
     vec4 newColor = mix(newColor1, newColor2, fract(blueColor));
 
     outputFragCol = mix(textureColor, vec4(newColor.rgb, textureColor.s), intensity);
	 outputFragCol.a = textureColor.a;
	 return outputFragCol;
}