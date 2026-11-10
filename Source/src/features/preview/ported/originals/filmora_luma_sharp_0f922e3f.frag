vec3 RGB2YUV(vec3 rgb){
    vec3 yuv = vec3(0.0);
    yuv.x = rgb.x *0.299 + rgb.y *0.587 + rgb.z *0.114;
    yuv.y = -0.14713 * rgb.x +(-0.28886) * rgb.y + rgb.z *0.436;
    yuv.z = rgb.x *0.615 + rgb.y *(-0.51499) + rgb.z *(-0.10001);
    return yuv;    
}

vec3 YUV2RGB(vec3 yuv){
   vec3 rgb = vec3(0.0);
   rgb.x = yuv.x + yuv.z * 1.13983;
   rgb.y = yuv.x + yuv.y *(-0.394) + yuv.z * (-0.580);
   rgb.z = yuv.x + yuv.y *(2.03211) + yuv.z * (0.0);
   return rgb;
}

float extractLuma(vec3 c)
{
    return c.x * 0.299 + c.y * 0.587 + c.z * 0.114;
}

vec4 FUNCNAME(vec2 tc) 
{
	vec4 orig = INPUT(tc);

    int alpha = PREFIX(alpha);    
    float gain = float(PREFIX(intensity))/40.0;     

    vec3 rgb = vec3(orig.z,orig.y,orig.x);
    vec3 yuv = RGB2YUV(rgb);
    
    float accumY = 0.0; 
	float factor = iResolution.x / 640.0;
    for(int i = -1; i <= 1; ++i) {
        for(int j = -1; j <= 1; ++j) {
            vec2 offset = (vec2(i,j) / iResolution.xy) * factor;
            
            float s = extractLuma(INPUT(tc + offset).zyx);
            float notCentre = min(float(i*i + j*j),1.0);
            accumY += s * (9.0 - notCentre*10.0);
        }
    }
    
    accumY /= 9.0;
    
    accumY = yuv.x + accumY * gain;
    
    vec3 retRGB = YUV2RGB(vec3(accumY,yuv.y,yuv.z));
	retRGB = clamp(retRGB,0.0,1.0);
    
    vec4 fragColor = vec4(retRGB.z,retRGB.y,retRGB.x,orig.w); // sharpened
    return mix( fragColor, orig, 1.0 - float(alpha)/100.0 );
}