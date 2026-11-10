float rand(float mtime){
    return fract(sin(mtime) * 43758.5453);
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

vec4 FUNCNAME(vec2 tc) 
{
	float offset = 0.0236111;
	float speed = PREFIX(speed)*0.1;
	float filter_strength = PREFIX(filter)*0.01;

	float verticalMove = PREFIX(vertIntensity);//vertIntensity;
    float horizontalMove = PREFIX(horzIntensity);//horzIntensity;
    float noEffectCenter = 1.0;
    float strokeSizeR = -offset;    //0.0236111
    float strokeSizeG = 0.0;
    float strokeSizeB = -strokeSizeR;
    vec2 texCoord = tc;
	float time = PREFIX(global_time)*speed;
	vec4 baseColor = INPUT1(tc);
	
    float uv = (verticalMove != 0.0) ? texCoord.y : texCoord.x;
    float scale = 1.0;
    if(noEffectCenter == 1.0)
    {
        scale = mix(0.5 - uv, uv - 0.5, step(0.5, uv)) * 2.0;
    }

    vec2 texelSize_R = vec2(horizontalMove, verticalMove) * strokeSizeR * scale;
    vec2 texelSize_G = vec2(horizontalMove, verticalMove) * strokeSizeG * scale;
    vec2 texelSize_B = vec2(horizontalMove, verticalMove) * strokeSizeB * scale;

	bool isPortrait = true; // portrait screen or not
    vec2 bounds = vec2(0.80, 1.0);
    if (rand(time) < 0.5)
      bounds = vec2(0.0, 0.2);
    float tick = mod(time, 99.99);
    vec2 uv_ = isPortrait ? tc : vec2(tc.y, tc.x);

    if (uv_.y > bounds.x && uv_.y < bounds.y) {
      float a = mod((tick), 0.10);
      uv_.x += a < 0.065
                 ? 0.0
                 : sin(uv_.y * 10.0 + tick) * (1.0 + cos(tick * 80.0)) * 0.005;
  }
    
	vec2 uv0 = isPortrait ? uv_ : vec2(uv_.y, uv_.x);
	float r = INPUT1(uv0 - texelSize_R).r;
    float g = INPUT1(uv0 - texelSize_G).g;
    float b = INPUT1(uv0 - texelSize_B).b;
    float a = INPUT1(uv0).a;
    vec4 resultColor = vec4(r, g, b, a);
	//===
	vec4 lutColor = lut3D_filter(resultColor, filter_strength);
	int mode = 11;
	resultColor = blendFunc(lutColor, resultColor, mode, 1.0);
	//===
	resultColor.rgb *= baseColor.a;
    return resultColor;
} 