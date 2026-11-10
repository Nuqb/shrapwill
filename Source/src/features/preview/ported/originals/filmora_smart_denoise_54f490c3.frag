//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Copyright (c) 2018-2019 Michele Morrone
//  All rights reserved.
//
//  https://michelemorrone.eu - https://BrutPitt.com
//
//  me@michelemorrone.eu - brutpitt@gmail.com
//  twitter: @BrutPitt - github: BrutPitt
//  
//  https://github.com/BrutPitt/glslSmartDeNoise/
//
//  This software is distributed under the terms of the BSD 2-Clause license
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

#define INV_SQRT_OF_2PI 0.3989422804014326779399  // 1.0/SQRT_OF_2PI
#define INV_PI          0.3183098861837906715378

vec4 GaussDeNoise(vec2 uv, int radius, float threshold,vec2 resolution)
{     
    float sigma = sqrt(float(radius)/2.0);  
    float invSigmaSquare = 1.0 / (sigma * sigma * 2.0 + 0.000001);        
    float invThresholdSquare = 1.0 / (threshold * threshold * 2.0 + 0.000001);     
    float invThresholdSqrt2PI = INV_SQRT_OF_2PI / (threshold + 0.000001);       
    vec4 centrColor = INPUT(uv);    
    float Z = 0.0;
    vec4 ColorSum = vec4(0.0);
    
    for(int x=-radius; x <= radius; x++) {        
        for(int y=-radius; y <= radius; y++) {
            vec2 d = vec2(float(x),float(y))/resolution.xy;
            float blurFactor = exp( -dot(d , d) * invSigmaSquare ) * invSigmaSquare;   
            vec4 current =  INPUT(uv+d);
            vec4 dC = current-centrColor;
            float deltaFactor = exp( -dot(dC, dC) * invThresholdSquare) * invThresholdSqrt2PI * blurFactor;                                 
            Z += deltaFactor;
            ColorSum += deltaFactor*current;
        }
    }
    return ColorSum/Z;
}

vec4 FUNCNAME(vec2 tc) 
{
	vec4 orig = INPUT(tc);

    int alpha = PREFIX(alpha); 
    float threshold = float(PREFIX(threshold))/100.0;
    int radius = PREFIX(radius);
	float factor = iResolution.x / 640.0;
	radius = int(float(radius) * factor);

    vec4 texel =  GaussDeNoise( tc, radius, threshold, iResolution.xy);
	texel = clamp(texel,0.0,1.0);
	texel.w = orig.w;
	
    return mix( texel, orig, 1.0 - float(alpha)/100.0 );
}