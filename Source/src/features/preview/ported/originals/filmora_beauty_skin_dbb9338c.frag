#define SIGMA 10.0
#define BSIGMA 0.1

float normpdf(float x, float sigma) {
	return 0.39894 * exp(-0.5 * x * x/ (sigma * sigma)) / sigma;
}

float normpdf3(vec3 v, float sigma) {
	return 0.39894 * exp(-0.5 * dot(v,v) / (sigma * sigma)) / sigma;
}

float normalizeColorChannel( float value,  float min,  float max) {
    return (value - min)/(max-min);
}

float ColorDistance(vec3 baseColor,vec3 dstColor){
    float t = pow(baseColor.x - dstColor.x,2.0) + pow(baseColor.y - dstColor.y,2.0) + pow(baseColor.z - dstColor.z,2.0);
	return t;
}

vec4 FUNCNAME(vec2 tc) 
{
	vec4 c = INPUT(tc);
    int SkinColor = PREFIX(SkinColor);
    int SkinColor_r = int (((SkinColor)>>16) & 0xff);
    int SkinColor_g = int (((SkinColor)>>8) & 0xff);
    int SkinColor_b = int ((SkinColor) & 0xff);
    float tolerance = PREFIX(Tolerance)/20.0;
    int AutoSkin = PREFIX(Auto_Skin_Detection);

    int alpha = PREFIX(alpha);    
    int radius = PREFIX(radius);     
    vec2 resolution = iResolution.xy;
    int kSize = (radius - 1) / 2;
	if(kSize == 0)
		return c;
	
    vec3 final_colour = vec3(0.0);
    float Z = 0.0;   
    float bZ = 1.0 / normpdf(0.0, BSIGMA);
    for (int i=-kSize; i <= kSize; ++i) {
        for (int j=-kSize; j <= kSize; ++j) {
            vec2 tmp_uv = vec2(float(i),float(j))/iResolution;
            vec4 cc = INPUT(tc + tmp_uv);        
            float sigmaJ = abs(float(j));
            float sigmaI = abs(float(i));
            float factor = normpdf3(cc.xyz-c.xyz, BSIGMA) * bZ * normpdf(sigmaI,SIGMA) * normpdf(sigmaJ,SIGMA);
            Z += factor;
            final_colour += factor * cc.xyz;
        }
    }
    
    vec4 fragColor = vec4(final_colour / Z, c.w);
    
    bool isSkin = false; 

    float skin_cb_min = 0.0;
    float skin_cb_max = 0.0;
    float skin_cr_min = 0.0;
    float skin_cr_max = 0.0;

    if(AutoSkin > 0){
        skin_cb_min = 100.0;
        skin_cb_max = 118.0;
        skin_cr_min = 121.0;
        skin_cr_max = 161.0;

        vec4 bgr = fragColor * 255.0;
        vec3 rgb = vec3(bgr.z,bgr.y,bgr.x);
        vec3 ycbcr = rgb;
        ycbcr.y = 128.0 - rgb.x*0.148 - rgb.y*0.291 + rgb.z*0.439;
        ycbcr.z = 128.0 + rgb.x*0.439 - rgb.y*0.368 - rgb.z*0.071;

        if (ycbcr.y > skin_cb_min && ycbcr.y < skin_cb_max &&
            ycbcr.z > skin_cr_min && ycbcr.z < skin_cr_max) {
            isSkin = true; 
        }
    }else{
        vec3 SkinColor_normal = vec3(SkinColor_b/255.0,SkinColor_g/255.0,SkinColor_r/255.0);
        float dis = ColorDistance(SkinColor_normal,c.xyz);
        if(dis < tolerance)
            isSkin = true;        
    }
    
    if (!isSkin)     
        fragColor = c; 
	
    return mix( fragColor, c, 1.0 - float(alpha)/100.0 );  
}



