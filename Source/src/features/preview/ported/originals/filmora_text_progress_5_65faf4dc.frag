#define PI 3.14159265359

float A(float aA1, float aA2) {
  return 1.0 - 3.0 * aA2 + 3.0 * aA1;
}

float B(float aA1, float aA2) {
  return 3.0 * aA2 - 6.0 * aA1;
}

float C(float aA1) {
  return 3.0 * aA1;
}

float GetSlope(float aT, float aA1, float aA2) {
  return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
}

float CalcBezier(float aT, float aA1, float aA2) {
  return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
}

float GetTForX(float aX, float mX1, float mX2) {
  float aGuessT = aX;
  for (int i = 0; i < 6; ++i) {
    float currentSlope = GetSlope(aGuessT, mX1, mX2);
    if (currentSlope == 0.0)
      return aGuessT;
    float currentX = CalcBezier(aGuessT, mX1, mX2) - aX;
    aGuessT -= currentX / currentSlope;
  }
  return aGuessT;
}

float KeySpline(vec4 p, float aX) {
  float mX1 = p.x;
  float mY1 = p.y;
  float mX2 = p.z; 
  float mY2 = p.w;
  if (mX1 == mY1 && mX2 == mY2)
    return aX;  // linear
  return CalcBezier(GetTForX(aX, mX1, mX2), mY1, mY2);
}

vec3 GetColor(int color){
  return vec3(float(color & 0xff), float((color >> 8) & 0xff), float((color >> 16) & 0xff)) / 255.0;
}

vec3 darken( vec3 s, vec3 d ){
  return min(s,d);
}

vec3 multiply( vec3 s, vec3 d ){
  return s*d;
}

vec3 colorBurn( vec3 s, vec3 d ){
  return 1.0 - (1.0 - d) / s;
}

vec3 linearBurn( vec3 s, vec3 d ){
  return s + d - 1.0;
}

vec3 darkerColor( vec3 s, vec3 d ){
  return (s.x + s.y + s.z < d.x + d.y + d.z) ? s : d;
}

vec3 lighten( vec3 s, vec3 d ){
  return max(s,d);
}

vec3 screen( vec3 s, vec3 d ){
  return s + d - s * d;
}

vec3 colorDodge( vec3 s, vec3 d ){
  return d / (1.0 - s);
}

vec3 linearDodge( vec3 s, vec3 d ){
  return s + d;
}

vec3 lighterColor( vec3 s, vec3 d ){
  return (s.x + s.y + s.z > d.x + d.y + d.z) ? s : d;
}

float overlay( float s, float d ){
  return (d < 0.5) ? 2.0 * s * d : 1.0 - 2.0 * (1.0 - s) * (1.0 - d);
}

vec3 overlay( vec3 s, vec3 d ){
  vec3 c;
  c.x = overlay(s.x,d.x);
  c.y = overlay(s.y,d.y);
  c.z = overlay(s.z,d.z);
  return c;
}

float softLight( float s, float d ){
  return (s < 0.5) ? d - (1.0 - 2.0 * s) * d * (1.0 - d) 
      : (d < 0.25) ? d + (2.0 * s - 1.0) * d * ((16.0 * d - 12.0) * d + 3.0) 
                   : d + (2.0 * s - 1.0) * (sqrt(d) - d);
}

vec3 softLight( vec3 s, vec3 d ){
  vec3 c;
  c.x = softLight(s.x,d.x);
  c.y = softLight(s.y,d.y);
  c.z = softLight(s.z,d.z);
  return c;
}

float hardLight( float s, float d ){
  return (s < 0.5) ? 2.0 * s * d : 1.0 - 2.0 * (1.0 - s) * (1.0 - d);
}

vec3 hardLight( vec3 s, vec3 d ){
  vec3 c;
  c.x = hardLight(s.x,d.x);
  c.y = hardLight(s.y,d.y);
  c.z = hardLight(s.z,d.z);
  return c;
}

float vividLight( float s, float d ){
  return (s < 0.5) ? 1.0 - (1.0 - d) / (2.0 * s) : d / (2.0 * (1.0 - s));
}

vec3 vividLight( vec3 s, vec3 d ){
  vec3 c;
  c.x = vividLight(s.x,d.x);
  c.y = vividLight(s.y,d.y);
  c.z = vividLight(s.z,d.z);
  return c;
}

vec3 linearLight( vec3 s, vec3 d ){
  return 2.0 * s + d - 1.0;
}

float pinLight( float s, float d ){
  return (2.0 * s - 1.0 > d) ? 2.0 * s - 1.0 : (s < 0.5 * d) ? 2.0 * s : d;
}

vec3 pinLight( vec3 s, vec3 d ){
  vec3 c;
  c.x = pinLight(s.x,d.x);
  c.y = pinLight(s.y,d.y);
  c.z = pinLight(s.z,d.z);
  return c;
}

vec3 hardMix( vec3 s, vec3 d ){
  return floor(s + d);
}

vec3 difference( vec3 s, vec3 d ){
  return abs(d - s);
}

vec3 exclusion( vec3 s, vec3 d ){
  return s + d - 2.0 * s * d;
}

vec3 subtract( vec3 s, vec3 d ){
  return s - d;
}

vec3 divide( vec3 s, vec3 d ){
  return s / d;
}

vec3 Blend( vec3 s, vec3 d, int id ){
  if(id==0)    return darken(s,d);
  if(id==1)    return multiply(s,d);
  if(id==2)    return colorBurn(s,d);
  if(id==3)    return linearBurn(s,d);
  if(id==4)    return darkerColor(s,d);
  
  if(id==5)    return lighten(s,d);
  if(id==6)    return screen(s,d);
  if(id==7)    return colorDodge(s,d);
  if(id==8)    return linearDodge(s,d);
  if(id==9)    return lighterColor(s,d);
  
  if(id==10)    return overlay(s,d);
  if(id==11)    return softLight(s,d);
  if(id==12)    return hardLight(s,d);
  if(id==13)    return vividLight(s,d);
  if(id==14)    return linearLight(s,d);
  if(id==15)    return pinLight(s,d);
  if(id==16)    return hardMix(s,d);
  
  if(id==17)    return difference(s,d);
  if(id==18)    return exclusion(s,d);
  if(id==19)    return subtract(s,d);
  if(id==20)    return divide(s,d);
  
  return s;
}

vec4 mixFunc(vec4 back, vec4 overlap, float alp){
  float invAlp = 1.0 - alp;
  vec4 ret = back;
  if(alp > 0.0){
    ret.xyz = overlap.xyz + back.xyz * invAlp;
    ret.w = alp + back.w * invAlp;
  }
  return ret;
}

float sdBox(vec2 uv, vec2 b){
  vec2 d = abs(uv)-b;
  return (length(max(d,0.0)) + min(max(d.x,d.y),0.0));
}

vec4 FUNCNAME(vec2 tc)
{
  float iGlobalTime = PREFIX(global_time);
  float iTotalTime = PREFIX(total_time);
  float iPro = min(iGlobalTime/iTotalTime, 1.0);
  iPro = 1.0 - clamp(iPro/0.93, 0.0, 1.0);
  vec4 p = vec4(.25,.09,.63,.99);
  iPro = KeySpline(p, iPro);

  float Opacity = float(PREFIX(Opacity))/100.0;
  int   blend = PREFIX(BlendMode);
  float blockWidth = float(PREFIX(BlockWidth))/100.0;
  float blur = 1.0-float(PREFIX(Blur))/100.0;
  vec4  inCol = INPUT(tc);

  vec4 pureCol = vec4(GetColor(PREFIX(Color)),1.0);
  iPro *= (1.0+blockWidth);
  pureCol *= step(max(iPro-blockWidth,0.0), tc.x)*step(tc.x, iPro)*Opacity*inCol.a;
  vec2 uv = (tc-vec2(iPro-blockWidth/2.0, 0.5))*2.0*vec2(1.0/max(blockWidth, 0.0001), 1.0);
  float mask = smoothstep(0.0, 1.0-blur, 1.0-mix(length(uv),sdBox(uv, vec2(blockWidth, blur)), blur));
  pureCol *= mask;
  vec4 retCol = pureCol;
  retCol.rgb = Blend(inCol.rgb, retCol.rgb, blend).rgb;
  retCol = mixFunc(inCol, retCol, retCol.a);
  retCol.rgb *= inCol.a;

  return retCol;
}
