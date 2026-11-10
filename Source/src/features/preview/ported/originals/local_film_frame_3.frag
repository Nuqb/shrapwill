#define PI 3.1415926

mat3 SRT(vec2 scale, float angle, vec2 translate)
{
    float c = cos(angle);
    float s = sin(angle);

    return mat3(
        scale.x * c,  scale.x * s,  0.0,
       -scale.y * s,  scale.y * c,  0.0,
        translate.x,  translate.y,  1.0
    );
}

mat3 dropSRT(float iPro, mat3 baseM)
{
    iPro = clamp(iPro, 0.0, 0.2);
    float dropScale = mix(0.9, 1.0, iPro);
    float dropAngle = mix(0.0, 0.02, iPro);
    vec2 dropTranslate = vec2(0.0, mix(0.0, -0.2, iPro));

    mat3 dropM = SRT(vec2(dropScale), dropAngle, dropTranslate);

    return dropM * baseM;
}


float Shinny(float iPro){
    float s = 1.0 - iPro * iPro * 100.0; 
    s = clamp(s,0.0,1.0);
    return s;
}

vec4 blurBg(vec2 uv,float iPro){
    vec4 sumfg = vec4(0.0);
    float maxSize  = max(iResolution.x, iResolution.y);
    float blurSize = 10.0 * (maxSize / 960.0);

    vec2 r = (blurSize / iResolution.xy) * 2.0;

    const int DIR = 1;  
    const int RING = 24;  
    float countfg = 0.0;

    for(int d = 0; d < DIR; ++d){
        float a = 6.2831853 * (float(d) / float(DIR));
        vec2 dir = vec2(cos(a), sin(a));

        for(int k = 1; k <= RING; ++k){
            float t = sqrt(float(k) / float(RING));
            sumfg += INPUT1(uv + r * t);
            countfg += 1.0;
        }
    }

    vec4 colfg = sumfg / max(countfg, 1.0);

    vec4 sumbg = vec4(0.0);
    float countbg = 0.0;

    for(int d = 0; d < DIR; ++d){
        float a = 6.2831853 * (float(d) / float(DIR));
        vec2 dir = vec2(cos(a), sin(a));

        for(int k = 1; k <= RING; ++k){
            float t = sqrt(float(k) / float(RING));
            sumbg += INPUT7(uv + r * t);
            countbg += 1.0;
        }
    }
    vec4 colbg = sumbg / max(countbg, 1.0);

    float alpha = smoothstep(0.0,1.0,iPro);
    vec4 col = mix(colfg,colbg,alpha);

    return clamp(col, 0.0, 1.0);
}


vec4 FUNCNAME(vec2 tc){
    vec2 uv = tc;
    vec2 fc = uv * 2.0 - 1.0;
    vec2 armin = iResolution / min(iResolution.x , iResolution.y);
    float iGlobalTime = PREFIX(global_time);
	float totalTime = PREFIX(total_time);
	float process = min(iGlobalTime / totalTime, 1.0);
    process = 4.0 * process;

    fc *= armin;
    vec2 fc1 = fc;
    vec2 fc2 = fc;
    vec2 fc3 = fc;
    vec2 fc4 = fc;
    vec2 fc5 = fc;
    //Scale rotate and transform the frame, first pic
    vec2 Scale1 = vec2(1.30);
    float Angle1 = -0.03;
    vec2 Translate1 = vec2(-0.08,0.0);

    mat3 M1 = SRT(Scale1,Angle1,Translate1);
    vec3 Fc1 = M1 * vec3(fc1,1.0);
    fc1 = Fc1.xy;


    vec2 uvFrame1 = fc1 * 0.5 + 0.5;
    uvFrame1.y = 1.0 - uvFrame1.y;
    uvFrame1 = clamp(uvFrame1, 0.0, 1.0);

    fc1 /= armin;

    //Random part
    vec2 offset1 = vec2(0.0,0.0);
    fc1 -= offset1;
    fc1 *= 1.32;
    vec2 uv1 = fc1 * 0.5 + 0.5; 

    //Add frame to the screen
    vec4 frameColor1 = INPUT5(uvFrame1);
    vec4 Mask1 = INPUT6(uvFrame1);
    vec4 innerColorfg1 = INPUT2(uv1);

    vec4 lightColor = vec4(0.8,0.6,0.7,1.0); 
    //lighting effect
    float h1 = Shinny(process - 0.5);
    innerColorfg1 = innerColorfg1 + lightColor * h1;


    vec4 filmColor1 = mix(innerColorfg1,frameColor1,frameColor1.a);

    //mix film and background
    vec4 bgColor = blurBg(uv,process-0.5);
    float hr = Shinny(process - 0.50);
    vec4 redColor = vec4(0.1,0.1,0.4,1.0);
    bgColor = bgColor + redColor * hr;

    vec4 originColorfg = INPUT1(uv);
    vec4 originColorbg = INPUT7(uv);

    vec4 temp1 = (process > 0.5) ? mix(bgColor,filmColor1,Mask1.a) : originColorfg;

    //second pic
    vec2 Scale2 = vec2(1.33);
    float Angle2 = -0.18;
    vec2 Translate2 = vec2(1.08,-0.08);
    mat3 M2 = SRT(Scale2,Angle2,Translate2);
    M2 = dropSRT(process-2.0,M2);
    vec3 Fc2 = M2 * vec3(fc2,1.0);
    fc2 = Fc2.xy;

    vec2 uvFrame2 = fc2 * 0.5 + 0.5;
    uvFrame2.y = 1.0 - uvFrame2.y;
    uvFrame2 = clamp(uvFrame2, 0.0, 1.0);
    fc2 /= armin;

    vec2 offset2 = vec2(0.48,0.01);
    fc2 -= offset2;
    fc2 *= 1.2;
    vec2 uv2 = fc2 * 0.5 + 0.5; 

    //Add frame to the screen
    vec4 frameColor2 = INPUT8(uvFrame2);
    vec4 Mask2 = INPUT9(uvFrame2);
    vec4 innerColorfg2 = INPUT3(uv2);
    float h2 = Shinny(process-2.0);
    innerColorfg2 = innerColorfg2 + lightColor * h2;
    vec4 filmColor2 = mix(innerColorfg2,frameColor2,frameColor2.a);
    //mix film and background
    vec4 temp2 = (process > 2.0) ? mix(temp1,filmColor2,Mask2.a) : temp1;

    //third pic
    vec2 Scale3 = vec2(1.26);
    float Angle3 = 0.1;
    vec2 Translate3 = vec2(-0.98,-0.03);
    mat3 M3 = SRT(Scale3,Angle3,Translate3);
    vec3 Fc3 = M3 * vec3(fc3,1.0);
    fc3 = Fc3.xy;

    vec2 uvFrame3 = fc3 * 0.5 + 0.5;
    uvFrame3.y = 1.0 - uvFrame3.y;
    uvFrame3 = clamp(uvFrame3, 0.0, 1.0);

    fc3 /= armin;

    vec2 offset3 = vec2(-0.4,0.0);
    fc3 -= offset3;
    fc3 *= 1.2;
    vec2 uv3 = fc3 * 0.5 + 0.5; 

    //Add frame to the screen
    vec4 frameColor3 = INPUT8(uvFrame3);
    vec4 Mask3 = INPUT9(uvFrame3);
    vec4 innerColorfg3 = INPUT4(uv3);
    float h3 = Shinny(process-3.5);
    innerColorfg3 = innerColorfg3 + lightColor * h3;
    vec4 filmColor3 = mix(innerColorfg3,frameColor3,frameColor3.a);
    //mix film and background
    vec4 temp3 = (process > 3.5) ? mix(temp2,filmColor3,Mask3.a) : temp2;
    
    vec4 dstColor = (process < 3.8)? temp3:originColorbg;

    return dstColor;
}