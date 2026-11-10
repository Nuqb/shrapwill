float random (vec2 st)
{
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float gaussianWeight(float dist, float stdDev)
{
    return exp(-dist / (2.0 * stdDev));
}

vec4 lut3D_filter(vec4 textureColor, float opacity){
    float blueColor = textureColor.r * 63.0;
    vec2 quad1;
    quad1.y = floor(floor(blueColor) / 8.0);
    quad1.x = floor(blueColor) - (quad1.y * 8.0);
    vec2 quad2;
    quad2.y = floor(ceil(blueColor) /8.0);
    quad2.x = ceil(blueColor) - (quad2.y * 8.0);
    vec2 texPos1;
    texPos1.x = (quad1.x * 1.0/8.0) + 0.5/512.0 + ((1.0/8.0 - 1.0/512.0) * textureColor.b);
    texPos1.y = (quad1.y * 1.0/8.0) + 0.5/512.0 + ((1.0/8.0 - 1.0/512.0) * textureColor.g);
    // texPos1.y = 1.0 - texPos1.y;
    vec2 texPos2;
    texPos2.x = (quad2.x * 1.0/8.0) + 0.5/512.0 + ((1.0/8.0 - 1.0/512.0) * textureColor.b);
    texPos2.y = (quad2.y * 1.0/8.0) + 0.5/512.0 + ((1.0/8.0 - 1.0/512.0) * textureColor.g);
    // texPos2.y = 1.0 - texPos2.y;
    vec4 newColor1 = INPUT2(texPos1);
    vec4 newColor2 = INPUT2(texPos2);
    vec4 newColor = mix(newColor1, newColor2, fract(blueColor));
    vec4 fragOutCol = vec4(mix(textureColor.rgb, newColor.rgb, opacity), textureColor.a);
    fragOutCol.rgb *= fragOutCol.a;
    return fragOutCol;
}

vec4 blendFunc(vec4 srcImg, vec4 blendImg, int mode, float opacity){
	vec3 src = srcImg.rgb;
	vec3 blend = blendImg.rgb;
	vec3 res = vec3(0.0);
	if(mode == 1){ // Normal
		float alp = srcImg.a;
		res = alp == 1.0 ? src : alp*src+(1.0-alp)*blend;
	}else if(mode == 2){ // Darken
	    res = min(src, blend);
	}else if(mode == 3){ // Lighten
	    res = max(src, blend);
	}else if(mode == 4){ // Multiply
	    res = src*blend;
	}else if(mode == 5){ // screen
	    res = 1.0-(1.0-blend)*(1.0-src);
	}else if(mode == 6){ // color burn;
	    res = 1.0-(1.0-blend)/src;
	}else if(mode == 7){ // color Dodge;
	    res = blend/(1.0-src);
	}else if(mode == 8){ // Linear Burn;
	    res = src+blend-1.0;
	}else if(mode == 9){ // Linear Dodge;
	    res = clamp(src+blend,0.0,1.0);
	}else if(mode == 10){ // Overlay;
	    res = vec3(
					blend.r <= 0.5 ? 2.0*src.r*blend.r : 1.0-2.0*(1.0-src.r)*(1.0-blend.r),
					blend.g <= 0.5 ? 2.0*src.g*blend.g : 1.0-2.0*(1.0-src.g)*(1.0-blend.g),
					blend.b <= 0.5 ? 2.0*src.b*blend.b : 1.0-2.0*(1.0-src.b)*(1.0-blend.b)
				  );
	}else if(mode == 11){ // Hard Light;
	    res = vec3(
					src.r <= 0.5 ? 2.0*src.r*blend.r : 1.0-2.0*(1.0-src.r)*(1.0-blend.r),
					src.g <= 0.5 ? 2.0*src.g*blend.g : 1.0-2.0*(1.0-src.g)*(1.0-blend.g),
					src.b <= 0.5 ? 2.0*src.b*blend.b : 1.0-2.0*(1.0-src.b)*(1.0-blend.b)
				 );
	}else if(mode == 12){ // soft Light;
	    res = vec3(
					src.r <= 0.5 ? 2.0*src.r*blend.r+blend.r*blend.r*(1.0-2.0*src.r) 
							     : 2.0*blend.r*(1.0-src.r)+sqrt(blend.r)*(2.0*src.r-1.0),
					src.g <= 0.5 ? 2.0*src.g*blend.g+blend.g*blend.g*(1.0-2.0*src.g) 
							     : 2.0*blend.g*(1.0-src.g)+sqrt(blend.g)*(2.0*src.g-1.0),
					src.b <= 0.5 ? 2.0*src.b*blend.b+blend.b*blend.b*(1.0-2.0*src.b) 
						         : 2.0*blend.b*(1.0-src.b)+sqrt(blend.b)*(2.0*src.b-1.0)
				  );
	}else if(mode == 13){ // vivid Light;
	    res = vec3( 
					src.r <= 0.5 ? 1.0+(blend.r-1.0)/(2.0*src.r) : blend.r/(2.0*(1.0-src.r)),
					src.g <= 0.5 ? 1.0+(blend.g-1.0)/(2.0*src.g) : blend.g/(2.0*(1.0-src.g)),
					src.b <= 0.5 ? 1.0+(blend.b-1.0)/(2.0*src.b) : blend.b/(2.0*(1.0-src.b))
				  );
	}else if(mode == 14){ // Linear Light;
	    res = blend+2.0*src-1.0;
	}else if(mode == 15){ // Pin Light;
	    res = vec3(
					src.r > 0.5 ? max(2.0*(src.r-0.5), blend.r) : min(2.0*src.r, blend.r),
					src.g > 0.5 ? max(2.0*(src.g-0.5), blend.g) : min(2.0*src.g, blend.g),
					src.b > 0.5 ? max(2.0*(src.b-0.5), blend.b) : min(2.0*src.b, blend.b)
				 );
	}else if(mode == 16){ // Hard Mix;
	    res = vec3(
					src.r+blend.r >= 1.0 ? 1.0 : 0.0,
					src.g+blend.g >= 1.0 ? 1.0 : 0.0,
					src.b+blend.b >= 1.0 ? 1.0 : 0.0
		          );
	}else if(mode == 17){ // Difference;
	    res = abs(blend-src);
	}else if(mode == 18){ // Exclusion;
	    res = src+blend-2.0*src*blend;
	}else if(mode == 19){ // subtract;
	    res = max(blend-src, 0.0);
	}else if(mode == 20){ // Divide;
	    res = blend/src;
	}
		
	return mix(srcImg,vec4(res.rgb, srcImg.a),opacity);
}

vec4 gaussianBlur(vec2 textureCoordinate, int radius, vec2 stepUV, vec2 screenSize)
{
    vec2 unitUV         = stepUV/screenSize;
    float stdDev        = 112.0;
    float sumWeight     = gaussianWeight(0.0,stdDev);
    vec4 curColor       = INPUT1(textureCoordinate);//texture2D(inputTexture, textureCoordinate);    
    vec4 sumColor       = curColor*sumWeight;
	//int blurRadius = 2;
    if(2==radius)
    {
        for(int i=1;i<=2;i++)
        {
            vec2 textureCoordinateA = textureCoordinate+float(i)*unitUV;
            vec2 textureCoordinateB = textureCoordinate+float(-i)*unitUV;
            vec4 colorA = INPUT1(textureCoordinateA);//texture2D(inputTexture,textureCoordinateA);
            vec4 colorB = INPUT1(textureCoordinateB);//texture2D(inputTexture,textureCoordinateB);
            float curWeight = gaussianWeight(float(i),stdDev);
            sumColor += colorA*curWeight;
            sumColor += colorB*curWeight;
            sumWeight+= curWeight*2.0;
        }
    }
    vec4 resultColor = sumColor/sumWeight;

    return resultColor;
}

vec4 FUNCNAME(vec2 tc) 
{
    vec2 screenSize = iResolution;
	int blurRadius = 2;//PREFIX(blurRadius);
	float blurStep = 3.0;//PREFIX(blurStep);
	float sharpness = PREFIX(sharpness)*0.1;
	float filter_strength = PREFIX(filter)*0.01;
    vec4 curColor = INPUT1(tc);//texture2D(inputImageTexture,uv0);
    vec4 resultColor = curColor;

    resultColor = gaussianBlur(tc,blurRadius,vec2(0.,blurStep),screenSize);
   
	vec4 firstBlurColor = INPUT1(tc);//texture2D(firstBlurTexture,uv0);
	resultColor = firstBlurColor+(firstBlurColor-resultColor)*sharpness;
   //resultColor = vec4(resultColor.rgb,curColor.a);

//===================
	vec4 lutColor = lut3D_filter(firstBlurColor, filter_strength);
	int mode = 11;
	resultColor = blendFunc(lutColor, resultColor, mode, 1.0);
	
	resultColor.rgb *= curColor.a;
    return resultColor;
} 