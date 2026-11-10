float random (vec2 st)
{
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float gaussianWeight(float dist, float stdDev)
{
    return exp(-dist / (2.0 * stdDev));
}

vec4 gaussianBlur(vec2 textureCoordinate, int radius, vec2 stepUV, vec2 screenSize)
{
    vec2 unitUV         = stepUV/screenSize;
    float stdDev        = 112.0;
    float sumWeight     = gaussianWeight(0.0,stdDev);
    vec4 curColor       = INPUT1(textureCoordinate);//texture2D(inputTexture, textureCoordinate);    
    vec4 sumColor       = curColor*sumWeight;
	//int blurRadius = 2;
    if(2==radius)
    {
        for(int i=1;i<=2;i++)
        {
            vec2 textureCoordinateA = textureCoordinate+float(i)*unitUV;
            vec2 textureCoordinateB = textureCoordinate+float(-i)*unitUV;
            vec4 colorA = INPUT1(textureCoordinateA);//texture2D(inputTexture,textureCoordinateA);
            vec4 colorB = INPUT1(textureCoordinateB);//texture2D(inputTexture,textureCoordinateB);
            float curWeight = gaussianWeight(float(i),stdDev);
            sumColor += colorA*curWeight;
            sumColor += colorB*curWeight;
            sumWeight+= curWeight*2.0;
        }
    }
    vec4 resultColor = sumColor/sumWeight;

    return resultColor;
}

vec4 FUNCNAME(vec2 tc) 
{
	float vertIntensity = PREFIX(vertIntensity)*0.01;
    float horzIntensity = PREFIX(horzIntensity)*0.01;
	float saturation = PREFIX(filter)*0.01;

	vec2 uv = tc;
  
    float ColorR = INPUT1(vec2(uv.x + horzIntensity, uv.y+vertIntensity)).r;//texture(iChannel0, vec2(uv.x + 0.01, uv.y));
    float ColorG = INPUT1(uv).g;//texture(iChannel0, uv);
    float ColorB = INPUT1(vec2(uv.x - horzIntensity, uv.y-vertIntensity)).b;//texture(iChannel0, vec2(uv.x - 0.01, uv.y));
    
    vec4 ret = vec4(ColorR, ColorG, ColorB,1.0);
	//=======================
    vec2 screenSize = iResolution;
	int blurRadius = 2;//PREFIX(blurRadius);
	float blurStep = 2.0;//PREFIX(blurStep);
	float sharpness = PREFIX(strength)*0.1;
  
    vec4 curColor = INPUT1(tc);//texture2D(inputImageTexture,uv0);
    vec4 resultColor = curColor;

    resultColor = gaussianBlur(tc,blurRadius,vec2(0.,blurStep),screenSize);
   
	vec4 firstBlurColor = ret;//INPUT(tc);
	resultColor = firstBlurColor+(firstBlurColor-resultColor)*sharpness;
	
	vec3 luminanceWeighting = vec3(0.2125, 0.7154, 0.0721);
    float luminance = dot(curColor.rgb, luminanceWeighting);
  
	vec3 greyScaleColor = vec3(luminance);
	resultColor = vec4(mix(greyScaleColor, resultColor.rgb, saturation), resultColor.a);
	
	resultColor.rgb *= curColor.a;
    return resultColor;
} 