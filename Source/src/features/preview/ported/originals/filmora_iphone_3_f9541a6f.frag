#define PI 3.1415926535
vec4 imageRand(vec4 l, vec4 k){
    return  vec4(min(1.0, l.r + k.r), min(1.0, l.g + k.g), min(1.0, l.b + k.b), min(1.0, l.a + k.a));
}
// 边框有效范围：uv在0.01-0.99范围内返回1（控制边框位置）
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
    uv *= prop;
    uv = roataionAngle(offset) * uv;
    uv /= prop;
    return uv;
}
// Material/texture size from effect script (if available)
// Use effect-provided uExtSize; no local declaration needed

vec4 FUNCNAME(vec2 tc) {

    float Size = ((float(PREFIX(Size))/50.0+1.0)/1.5);//默认 1.6
    float Image_Size = ((float(PREFIX(Image_Size))/50.0+1.0)/2.0);//默认 1.0

    float PositionX = 1.0-(float(PREFIX(PositionX))/50.0+1.0)/2.0;
    float PositionY = 1.0-(float(PREFIX(PositionY))/50.0+1.0)/2.0;

    float rotationAngle1 = (float(PREFIX(Rotation))/50.0)* 180.0;
    float rotationAngle2 = (float(PREFIX(Image_Rotation))/50.0)* 180.0;

    float ImagePosX = 1.0-(float(PREFIX(ImagePositionX))/50.0+1.0)/2.0;
    float ImagePosY = 1.0-(float(PREFIX(ImagePositionY))/50.0+1.0)/2.0;

    vec4 res = vec4(0.0);
    vec4 res2 = vec4(0.0);
    vec4 color01 = vec4(0.0);
    vec4 color02 = vec4(0.0);    
    vec4 color03 = vec4(0.0);

    vec2 prop = vec2(iResolution.x / iResolution.y, 1.0);
    if(iResolution.y > iResolution.x) {
        prop = vec2(1.0, iResolution.y / iResolution.x);
    }
    vec2 imagesize = vec2(1080.0*iResolution.x/iResolution.y, 1920.0) * 1.3/ 1080.0;
    if(iResolution.y > iResolution.x) {
        imagesize = vec2(1080.0, 1920.0*iResolution.y/iResolution.x) * 1.3 / 1920.0;
    }
    vec2 offset = vec2(0.5,0.5);

    // 边框变化
    vec2 BorderUv = tc;
    BorderUv -= offset;
    BorderUv.x += PositionX;
    BorderUv.y += PositionY;
    BorderUv = textureRotationOffset1(BorderUv, rotationAngle1);
    float extraAngle;
    float Sscale;
    if(iResolutionOrig.x < iResolutionOrig.y)
    {
        extraAngle = 90.0;
        Sscale = 0.8;
    }
    else
    {
        extraAngle = 0.0;
        Sscale = 1.0;
    }
    
    BorderUv = textureRotationOffset1(BorderUv, rotationAngle1 + extraAngle);
    BorderUv /= Sscale;
    BorderUv *= imagesize;
    BorderUv /= Size;
    BorderUv += offset;

    // 图片变化(跟随边框)
    vec2 ContentUv = tc;
    ContentUv -= offset;
    ContentUv.x += PositionX;
    ContentUv.y += PositionY;
    ContentUv = textureRotationOffset1(ContentUv, rotationAngle1);
    ContentUv /= Size;
    ContentUv += offset;

    // 图片变化(独立)
    vec2 FinalContentUv = ContentUv - offset;
    FinalContentUv.x += ImagePosX;
    FinalContentUv.y += ImagePosY;
    if(rotationAngle2 != 0.0) {
        FinalContentUv = textureRotationOffset1(FinalContentUv, rotationAngle2);
    }
    FinalContentUv /= Image_Size;
    FinalContentUv += offset;
    ContentUv = FinalContentUv;

    vec2 sampleUv = ContentUv;


    vec4 color00 = INPUT1(ContentUv) * matt(BorderUv) * matt(ContentUv);
    color01 = INPUT2(vec2(BorderUv.x, 1.0 - BorderUv.y)) * matt(BorderUv);
    color01.rgb *= color01.a;
    color02 = INPUT3(vec2(BorderUv.x, 1.0 - BorderUv.y)) * matt(BorderUv);
    color02.rgb *= color02.a;
    res2 = mix(color00, color02, color02.a) * (1.0 - color02.a);
    
    res = imageRand(color01, res2);

    return res;
}