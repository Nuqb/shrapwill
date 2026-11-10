
#define PI 3.1415926535
vec4 imageRand(vec4 l, vec4 k){
	return  vec4(min(1.0, l.r + k.r), min(1.0, l.g + k.g), min(1.0, l.b + k.b), min(1.0, l.a + k.a));
}
float matt (vec2 uv){
    float result  = step(0.01, uv.x) * step(uv.x, 0.99) * step(0.01, uv.y) * step(uv.y, 0.99);
    return result  ;
}
float matt2 (vec2 uv,float def){
    float result  = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    float blur =smoothstep(0.0, def, min(uv.x, uv.y)) * smoothstep(0.0, def, min(1.0 - uv.x, 1.0 - uv.y));
    return result * blur ;
}
mat2 roataionAngle (float a ){
    float s = sin(a * PI / 180.0);
    float c = cos(a * PI / 180.0);
    return mat2(c,-s,s,c);
}
vec2 textureRotationOffset1(vec2 uv,float offset){   
	  vec2 prop = vec2(iResolution.x / iResolution.y, 1.0);
    if(iResolution.y > iResolution.x) {
        prop = vec2(1.0, iResolution.y / iResolution.x);
    }
    vec2 center = vec2(0.5);
    uv *= prop;
    // uv -= center;
    uv = roataionAngle(offset) * uv;
    uv /= prop;
    // uv += center;
    return uv;
}
vec4 FUNCNAME(vec2 tc) {
  vec2 OrigColUV = tc;
  float Size = ((float(PREFIX(Size))/50.0+1.0)/1.5);
  float PositionX = 1.0-(float(PREFIX(PositionX))/50.0+1.0)/2.0;
  float PositionY = 1.0-(float(PREFIX(PositionY))/50.0+1.0)/2.0;
  float roataionAngle1 = (float(PREFIX(Rotation))/50.0)* 180.0;
  float ImagePositionX = 1.0-(float(PREFIX(ImagePositionX))/50.0+1.0)/2.0;
  float ImagePositionY = 1.0-(float(PREFIX(ImagePositionY))/50.0+1.0)/2.0;
  float ImageSize = (float(PREFIX(ImageSize))/50.0+1.0)/2.0;
  vec4 res = vec4(0.0); 
  vec4 res2 = vec4(0.0);
  vec4 color01 = vec4(0.0);
  vec4 color02 = vec4(0.0);
  vec2 prop = vec2(iResolution.x / iResolution.y, 1.0);
    if(iResolution.y > iResolution.x) {
        prop = vec2(1.0, iResolution.y / iResolution.x);
    }
  vec2 imagesize = vec2(1280.0*iResolution.x/iResolution.y, 720.0) * 1.3/ 1080.0;
  if(iResolution.y > iResolution.x) {
        imagesize = vec2(1280.0, 720.0*iResolution.y/iResolution.x) * 1.3 / 1920.0;
    }
  vec2 offset = vec2(0.5,0.5);
  vec2 OneUv = tc;
  vec2 TwoUv = tc;
  
  OrigColUV -= offset;
  OneUv -= offset;
  OneUv.x += PositionX;
  OneUv.y += PositionY;
  OrigColUV.x += ImagePositionX;
  OrigColUV.y += ImagePositionY;
  OneUv = textureRotationOffset1(OneUv,roataionAngle1);
  OneUv *= imagesize;
  OneUv /= Size;
  OrigColUV /= ImageSize;
  OneUv += offset;
  OrigColUV += offset;

  vec4 color00 = INPUT1(OrigColUV)*matt(OneUv)*matt(OrigColUV);
  color01 = INPUT2(vec2(OneUv.x,1.0-OneUv.y))*matt(OneUv);
  color01.rgb *= color01.a;
  color02 = INPUT3(vec2(OneUv.x,1.0-OneUv.y))*matt(OneUv);
  color02.rgb *= color02.a;

  res2 = mix(color00,color02,color02.a)*(1.0-color02.a);
  res = imageRand(color01,res2) ;
 
  return res;
}
 