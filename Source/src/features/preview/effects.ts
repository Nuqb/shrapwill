// Coordinates are normalized to source dimensions, independent of proxy/output resolution.
export const effectShader = `
uniform vec4 videoEffects;
uniform float effectFrame;
uniform vec3 extraEffects;
uniform vec4 vignetteShape;
uniform float vignetteHighlight;
vec4 effectSample(vec2 point) {
  vec2 q = point;
  if (videoEffects.w > .5) q.x = abs(2.*q.x-1.);
  if (videoEffects.x > 0.) {
    vec2 size = vec2(textureSize(source, 0));
    vec2 block = vec2(videoEffects.x, videoEffects.x*size.x/size.y);
    q = (floor(q/block)+.5)*block;
  }
  float shake = videoEffects.z;
  q = (q-.5)*(1.-2.*shake)+.5 + shake*vec2(sin(effectFrame*1.7), .6*sin(effectFrame*2.3));
  q.x += extraEffects.x*sin(q.y*40.+effectFrame*.12);
  vec4 c = creativeSample(q,effectFrame);
  if (videoEffects.y > 0.) {
    c.r = creativeSample(q+vec2(videoEffects.y, 0.),effectFrame).r;
    c.b = creativeSample(q-vec2(videoEffects.y, 0.),effectFrame).b;
  }
  vec2 v = point-.5;
  float radius = mix(dot(v,v)*2., pow(abs(v.x)+abs(v.y),2.), vignetteShape.y);
  float mask = pow(clamp(radius/max(.05,vignetteShape.x),0.,1.), max(.1,2.-2.*vignetteShape.z));
  c.rgb *= vec3(1.)-extraEffects.y*mask*max(vec3(0.),vec3(1.)-(vignetteHighlight-.5)*2.*c.rgb)+vignetteShape.w*mask;
  float shade = 1.;
  shade *= 1.-extraEffects.z*(.5+.5*cos(point.y*180.*3.141592653589793));
  c.rgb *= shade;
  return c;
}`;
