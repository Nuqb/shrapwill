// Style algorithms are mirrored in crates/core/src/render/creative_effects.rs.
export const creativeEffectShader = `
uniform int creativeStyle;
uniform float creativeAmount;
vec2 creativePoint(vec2 p) {
  vec2 v=p-.5; float radius=length(v); float amount=creativeAmount;
  if (creativeStyle==8) return .5+v*(1.+amount*2.*dot(v,v));
  if (creativeStyle==9) {
    float a=amount*5.*max(0.,.75-radius);
    return .5+vec2(v.x*cos(a)-v.y*sin(a),v.x*sin(a)+v.y*cos(a));
  }
  if (creativeStyle==10) {
    float sector=6.283185307/6.;
    float a=abs(mod(atan(v.y,v.x)+6.283185307,sector)-sector*.5);
    return mix(p,.5+radius*vec2(cos(a),sin(a)),amount);
  }
  return p;
}
vec4 creativeSample(vec2 point,float frame) {
  vec2 p=clamp(point,0.,1.); float a=creativeAmount;
  vec4 c=texture(source,creativePoint(p));
  if (creativeStyle==0 || a<=0.) return texture(source,p);
  float stepSize=.003+a*.012;
  vec3 left=texture(source,p-vec2(stepSize,0.)).rgb;
  vec3 right=texture(source,p+vec2(stepSize,0.)).rgb;
  vec3 up=texture(source,p-vec2(0.,stepSize)).rgb;
  vec3 down=texture(source,p+vec2(0.,stepSize)).rgb;
  if (creativeStyle<=3) {
    vec3 blur=c.rgb+left+right+up+down;
    for (int x=-1;x<=1;x+=2) for (int y=-1;y<=1;y+=2)
      blur+=texture(source,p+vec2(float(x),float(y))*stepSize).rgb;
    blur/=9.;
    if (creativeStyle==1) c.rgb=mix(c.rgb,blur,a);
    if (creativeStyle==2) c.rgb+=blur*blur*a*.8;
    if (creativeStyle==3) c.rgb+=(c.rgb-blur)*a*2.;
  }
  if (creativeStyle==4) c.rgb=mix(c.rgb,(abs(right-left)+abs(down-up))*2.,a);
  if (creativeStyle==5) c.rgb=mix(c.rgb,.5+(right-left+down-up),a);
  if (creativeStyle==6) {
    vec2 cell=floor(p*vec2(320.,180.));
    float noise=fract((cell.x*17.+cell.y*131.+floor(frame)*23.)/127.)*2.-1.;
    c.rgb+=noise*a*.15;
  }
  if (creativeStyle==7) {
    float light=dot(c.rgb,vec3(.2126,.7152,.0722));
    float dotMask=length(fract(p*vec2(40.,22.5))-.5)<sqrt(max(0.,light))*.65 ? 1. : 0.;
    c.rgb=mix(c.rgb,vec3(dotMask),a);
  }
  return vec4(clamp(c.rgb,0.,1.),c.a);
}`;
