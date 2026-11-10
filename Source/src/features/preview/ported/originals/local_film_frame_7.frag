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
    if(iPro < 0.0 || iPro > 0.2) {return 0.0;}
    float s = 1.0 - iPro * iPro * 100.0; 
    s = clamp(s,0.0,1.0);
    return s;
}

vec4 blurBg(vec2 uv,float iPro){  
    vec4 colfg = INPUT1(uv);
    vec4 colbg = INPUT9(uv);
    float alpha = smoothstep(1.0, 0.0, iPro);
    vec4 col = mix(colbg, colfg, alpha);
    return clamp(col, 0.0, 1.0);
}

vec2 offsetReverse(vec2 offset, vec2 armin){
    vec2 roffset = (armin.x > armin.y) ? offset : vec2(offset.y, offset.x);
    return roffset;
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
    vec2 Scale1 = vec2(1.12);
    float Angle1 = 0.12;
    vec2 Translate1 = vec2(0.25,-1.78);

    mat3 M1 = SRT(Scale1,Angle1,Translate1);
    vec3 Fc1 = M1 * vec3(fc1,1.0);
    fc1 = Fc1.xy;


    vec2 uvFrame1 = fc1 * 0.5 + 0.5;
    uvFrame1.y = 1.0 - uvFrame1.y;
    uvFrame1 = clamp(uvFrame1, 0.0, 1.0);

    fc1 /= armin;
    fc1 *= 1.28;

    //Random part
    vec2 offset1 = vec2(0.0,0.0);
    offset1 = offsetReverse(offset1,armin);
    fc1 -= offset1;
    vec2 uv1 = fc1 * 0.5 + 0.5; 

    //Add frame to the screen
    vec4 frameColor1 = INPUT7(uvFrame1);
    vec4 Mask1 = INPUT8(uvFrame1);
    vec4 innerColorfg1 = INPUT2(uv1);

    vec4 lightColor = vec4(0.8,0.6,0.7,1.0); 
    //lighting effect
    float h1 = Shinny(process - 1.08);
    innerColorfg1 = innerColorfg1 + lightColor * h1;


    vec4 filmColor1 = mix(innerColorfg1,frameColor1,frameColor1.a);

    //mix film and background
    vec4 bgColor = blurBg(uv,process-1.08);
    vec4 originColorfg = INPUT1(uv);
    vec4 originColorbg = INPUT9(uv);

    vec4 temp1 = (process > 1.08) ? mix(bgColor,filmColor1,Mask1.a) : bgColor;

    //second pic
    vec2 Scale2 = vec2(1.2);
    float Angle2 = 0.15;
    vec2 Translate2 = vec2(0.05,-0.68);
    mat3 M2 = SRT(Scale2,Angle2,Translate2);
    M2 = dropSRT(process - 1.58, M2);
    vec3 Fc2 = M2 * vec3(fc2,1.0);
    fc2 = Fc2.xy;

    vec2 uvFrame2 = fc2 * 0.5 + 0.5;
    uvFrame2.y = 1.0 - uvFrame2.y;
    uvFrame2 = clamp(uvFrame2, 0.0, 1.0);
    fc2 /= armin;
    fc2 *= 1.25;

    vec2 offset2 = vec2(0.0,0.0);
    offset2 = offsetReverse(offset2,armin);
    fc2 -= offset2;
    vec2 uv2 = fc2 * 0.5 + 0.5; 

    //Add frame to the screen
    vec4 frameColor2 = INPUT7(uvFrame2);
    vec4 Mask2 = INPUT8(uvFrame2);
    vec4 innerColorfg2 = INPUT3(uv2);
    float h2 = Shinny(process-1.58);
    innerColorfg2 = innerColorfg2 + lightColor * h2;
    vec4 filmColor2 = mix(innerColorfg2,frameColor2,frameColor2.a);
    //mix film and background
    vec4 temp2 = (process > 1.58) ? mix(temp1,filmColor2,Mask2.a) : temp1;
    //third pic
    vec2 Scale3 = vec2(0.9);
    float Angle3 = -0.03;
    vec2 Translate3 = vec2(0.03,0.17);
    mat3 M3 = SRT(Scale3,Angle3,Translate3);
    M3 = dropSRT(process - 2.08, M3);
    vec3 Fc3 = M3 * vec3(fc3,1.0);
    fc3 = Fc3.xy;

    vec2 uvFrame3 = fc3 * 0.5 + 0.5;
    uvFrame3.y = 1.0 - uvFrame3.y;
    uvFrame3 = clamp(uvFrame3, 0.0, 1.0);

    fc3 /= armin;
    fc3 *= 1.33;

    vec2 offset3 = vec2(0.0,0.0);
    offset3 = offsetReverse(offset3,armin);
    fc3 -= offset3;
    vec2 uv3 = fc3 * 0.5 + 0.5; 

    //Add frame to the screen
    vec4 frameColor3 = INPUT10(uvFrame3);
    vec4 Mask3 = INPUT11(uvFrame3);
    vec4 innerColorfg3 = INPUT4(uv3);
    float h3 = Shinny(process-2.08);
    innerColorfg3 = innerColorfg3 + lightColor * h3;
    vec4 filmColor3 = mix(innerColorfg3,frameColor3,frameColor3.a);
    //mix film and background
    vec4 temp3 = (process > 2.08) ? mix(temp2,filmColor3,Mask3.a) : temp2;
    //forth pic
    vec2 Scale4 = vec2(1.05);
    float Angle4 = -0.05;
    vec2 Translate4 = vec2(0.1,0.98);
    mat3 M4 = SRT(Scale4,Angle4,Translate4);
    vec3 Fc4 = M4 * vec3(fc4,1.0);
    fc4 = Fc4.xy;

    vec2 uvFrame4 = fc4 * 0.5 + 0.5;
    uvFrame4.y = 1.0 - uvFrame4.y;
    uvFrame4 = clamp(uvFrame4, 0.0, 1.0);

    fc4 /= armin;
    fc4 *= 1.2;

    vec2 offset4 = vec2(0.0,0.0);
    offset4 = offsetReverse(offset4,armin);
    fc4 -= offset4;
    vec2 uv4 = fc4 * 0.5 + 0.5; 

    //Add frame to the screen
    vec4 frameColor4 = INPUT7(uvFrame4);
    vec4 Mask4 = INPUT8(uvFrame4);
    vec4 innerColorfg4 = INPUT5(uv4);
    float h4 = Shinny(process-2.58);
    innerColorfg4 = innerColorfg4 + lightColor * h4;
    vec4 filmColor4 = mix(innerColorfg4,frameColor4,frameColor4.a);
    //mix film and background
    vec4 temp4 = (process > 2.58) ? mix(temp3,filmColor4,Mask4.a) : temp3;
    //fifth pic
    vec2 Scale5 = vec2(0.95);
    float Angle5 = 0.05;
    vec2 Translate5 = vec2(-0.32,1.58);
    mat3 M5 = SRT(Scale5,Angle5,Translate5);
    vec3 Fc5 = M5 * vec3(fc5,1.0);
    fc5 = Fc5.xy;

    vec2 uvFrame5 = fc5 * 0.5 + 0.5;
    uvFrame5.y = 1.0 - uvFrame5.y;
    uvFrame5 = clamp(uvFrame5, 0.0, 1.0);

    fc5 /= armin;
    fc5 *= 1.32;
    vec2 uv5 = fc5 * 0.5 + 0.5; 

    //Add frame to the screen
    vec4 frameColor5 = INPUT7(uvFrame5);
    vec4 Mask5 = INPUT8(uvFrame5);
    vec4 innerColorfg5 = INPUT6(uv5);
    float h5 = Shinny(process-3.08);
    innerColorfg5 = innerColorfg5 + lightColor * h5;
    vec4 filmColor5 = mix(innerColorfg5,frameColor5,frameColor5.a);
    //mix film and background
    vec4 temp5 = (process > 3.08) ? mix(temp4,filmColor5,Mask5.a) : temp4;
    float shine = Shinny(process - 3.5);
    vec4 dstColor = (process < 3.5) ? temp5 : originColorbg + lightColor * shine;
    return dstColor;
}