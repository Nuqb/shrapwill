vec3 blendNormal(vec3 base, vec3 blend) {
    return blend;
}
/*
vec3 blendNormal(vec3 base, vec3 blend, float opacity) {
    return (blendNormal(base, blend) * opacity + blend * (1.0 - opacity));
}*/
vec3 blendFunc2(vec3 base,vec3 blend,float opacity)  //opacity sucaidebutoumingdu
{
    vec3 resultColor=blendNormal(base,blend);//diejiamoshitihuan
    resultColor=mix(base,resultColor,opacity);
    return resultColor;
}

float blendHardLight1(float base,float blend){
    return base<.5?(2.*base*blend):(1.-2.*(1.-base)*(1.-blend));
}

vec3 blendHardLight(vec3 base,vec3 blend){
    return vec3(blendHardLight1(base.r,blend.r),blendHardLight1(base.g,blend.g),blendHardLight1(base.b,blend.b));
}

vec4 takeEffectFilter(vec4 textureColor, float uniAlpha)
{
  float blueColor=textureColor.b*63.;
  
  vec2 quad1;
  quad1.y=floor(floor(blueColor)/8.);
  quad1.x=floor(blueColor)-(quad1.y*8.);
  
  vec2 quad2;
  quad2.y=floor(ceil(blueColor)/8.);
  quad2.x=ceil(blueColor)-(quad2.y*8.);
  
  vec2 texPos1;
  texPos1.x=(quad1.x*1./8.)+.5/512.+((1./8.-1./512.)*textureColor.r);
  texPos1.y=(quad1.y*1./8.)+.5/512.+((1./8.-1./512.)*textureColor.g);
  
  vec2 texPos2;
  texPos2.x=(quad2.x*1./8.)+.5/512.+((1./8.-1./512.)*textureColor.r);
  texPos2.y=(quad2.y*1./8.)+.5/512.+((1./8.-1./512.)*textureColor.g);
  
  vec4 newColor1= INPUT4(texPos1);//texture2D(filterTexture,texPos1);
  vec4 newColor2= INPUT4(texPos2);//(filterTexture,texPos2);
  vec4 newColor= mix(newColor1,newColor2,fract(blueColor));
  newColor = mix(textureColor,vec4(newColor.rgb,textureColor.w),uniAlpha);

  return newColor;
}

vec4 FUNCNAME(vec2 tc) 
{
	//float process = PREFIX(global_time)/PREFIX(total_time);
    //float time = PREFIX(global_time)*80.0;
	
	float alphaFactor = PREFIX(filter)*0.01;
	float texture  = PREFIX(texture)*0.01;
    vec2 screenSize = iResolution;
   
    vec4 baseColor = INPUT1(tc);
    vec4 filterColor = takeEffectFilter(baseColor,alphaFactor);
    
    vec4 One = INPUT2(tc);
    vec4 OneResultColor = vec4(blendFunc2(filterColor.rgb, One.rgb, 0.27*texture),baseColor.a);
    vec4 Two = INPUT3(tc);
    vec4 TwoResultColor = vec4(blendHardLight(OneResultColor.rgb,Two.rgb),baseColor.a);
    TwoResultColor = mix(OneResultColor, TwoResultColor, 0.5*texture);
	
	TwoResultColor.rgb *= baseColor.a;
    return TwoResultColor;
} 