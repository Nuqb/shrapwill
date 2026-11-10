/*{
	"GUID":"B84A6B57-861A-4931-815D-4B52E1C5DC45",
	"PARAMS":[
		{
			"NAME":"Frequency",
			"TYPE":"float",
			"DEFAULT":400.0,
			"MIN":0.0,
			"MAX":400.0
		},
		{
			"NAME":"Pos_X",
			"TYPE":"float",
			"DEFAULT":0.2,
			"MIN":0.0,
			"MAX":1.0
		},
		{
			"NAME":"Pos_Y",
			"TYPE":"float",
			"DEFAULT":0.02,
			"MIN":0.0,
			"MAX":1.0
		},
		{
			"NAME":"Rot_Z",
			"TYPE":"float",
			"DEFAULT":0.0,
			"MIN":0.0,
			"MAX":60.0
		},
		
		{
			"NAME":"RGB_Separate",
			"TYPE":"int",
			"DEFAULT":1,
			"MIN":0,
			"MAX":1
		}
		
	]   	
}*/

#define motionBlur 0.2 
#define radialBlur 0.9
#define rotateblur 0.1


vec2 rotateFunc(vec2 uv, vec2 center, float theta)
{
	vec2 temp;
	temp.x = dot(vec2(cos(theta), -sin(theta)), uv - center);
	temp.y = dot(vec2(sin(theta), cos(theta)), uv - center);
	return(temp+center);
}

vec2 scaleFunc(vec2 uv, vec2 scale,vec2 center)
{

	return (uv - center)/(scale) + center ;

}

vec2 mirror(vec2 uv)
{
	vec2 parity = mod(floor(uv),2.0);
	vec2 sign = -2.0*parity+1.0;
	return mod( 2.0*parity+sign*mod(uv,1.0),1.0);
}

float bash(vec2 co){
	float input1 = sin(dot(co,vec2(12.9898,78.233)))*43758.5453123;
    return fract(input1);
}

vec2 rand(float frequency,float amplitude,float tIn,float offset)
{
	vec2 temp; 
	vec2 tempPre;
	float t = tIn - offset;
	temp.x = sin(t * frequency);
	temp.x += sin(t*frequency*2.1)*1.828;
	temp.x += sin(t*frequency*1.72)*4.0;
	temp.x += sin(t*frequency*2.221)*3.488;
	temp.x += sin(t*frequency*3.1122)*2.5;
	temp.x *= amplitude*0.06;

	temp.y = frequency*cos(t * frequency);
	temp.y += cos(t*frequency*2.1)*1.828*frequency*2.1;
	temp.y += cos(t*frequency*1.72)*4.0*frequency*1.72;
	temp.y += cos(t*frequency*2.221)*3.488*frequency*2.221;
	temp.y += cos(t*frequency*3.1122)*2.5*frequency*3.1122;
	temp.y *= amplitude*0.06;
	
	t = tIn - offset - 0.02;
	tempPre.y = frequency*cos(t * frequency);
	tempPre.y += cos(t*frequency*2.1)*1.828*frequency*2.1;
	tempPre.y += cos(t*frequency*1.72)*4.0*frequency*1.72;
	tempPre.y += cos(t*frequency*2.221)*3.488*frequency*2.221;
	tempPre.y += cos(t*frequency*3.1122)*2.5*frequency*3.1122;
	tempPre.y *= amplitude*0.06;
	
	temp.y = temp.y*0.75 + tempPre.y*0.25;
	
	return temp; 

}

vec2 decay(vec2 vel, float t, int InOutStage)
{
	vec2 temp = vel; 
	
	
	if(1  == InOutStage)
	{
		float a = -0.7*t-0.3;
		float tempT = a*a*a;
		float fade = tempT*tempT;
		float dFade = 6.0*tempT;
		temp.x =  temp.x*fade;
		temp.y = dFade*temp.x + fade*temp.y; 
	}else if (2  == InOutStage)
	{
		float a = t*0.7-1.0;
		float tempT = a*a*a;
		float fade = tempT*tempT;
		float dFade = 6.0*tempT;
		temp.x = temp.x*fade;
		temp.y = -dFade*temp.x + fade*temp.y; 
	}else if (3  == InOutStage)
	{
			t = 2.0*t;
			if(t<1.0)
			{
				float a = -0.7*t-0.3;
				float tempT = a*a*a;
				float fade = tempT*tempT;
				float dFade = 6.0*tempT;
				temp.x =  temp.x*fade;
				temp.y = dFade*temp.x + fade*temp.y; 
			}else
			{
				t = t - 1.0;
				float a = t*0.7-1.0;
				float tempT = a*a*a;
				float fade = tempT*tempT;
				float dFade = 6.0*tempT;
				temp.x = temp.x*fade;
				temp.y = -dFade*temp.x + fade*temp.y; 
			}
		
	}
	return temp; 	
}

vec4 FUNCNAME(vec2 tc) {
    vec4 color = vec4(0.0,0.0,0.0,0.0);
    float frequecy = PREFIX(Frequency);
    float POSX = PREFIX(Pos_X);
    float POSY = PREFIX(Pos_Y);
    float ROTA = PREFIX(Rot_Z); 

    float ScaleXUp = 0.0; 
    float ScaleXDown = 0.0; 
    float ScaleYUp = 0.0; 
    float ScaleYDown = 0.0; 

    int RGBSeparate = PREFIX(RGB_Separate);
    int MotionBlur = 1;
    int InOutStage = 2;
    //////////////////////////////////////////////////////////////////

    float amplitude = 0.5;//PREFIX(amplitude);
    float iGlobalTime = PREFIX(global_time);// iGlobalTime is the process of the transition, range [0.0,1.0]
    float totalTime = PREFIX(total_time);
    float process = iGlobalTime/totalTime;
	vec2 motion = decay( rand(frequecy*0.7777, amplitude, iGlobalTime, 0.0), process, InOutStage);

	vec2 scaleRandX = rand(frequecy*0.6666, amplitude, iGlobalTime,1.7);
	vec2 scaleRandY = rand(frequecy*0.9, amplitude, iGlobalTime,0.9);

	vec2 posRandX =  decay( rand(frequecy*0.833, amplitude, iGlobalTime, 0.666)*POSX, process, InOutStage);
	vec2 posRandY = decay( rand(frequecy*0.777, amplitude, iGlobalTime, 0.333)*POSY, process, InOutStage);

	vec2 curPos = vec2(posRandX.x, posRandY.x);
	float alpha = 100.0;//range [0,100]
	float CurRotate = motion.x*ROTA;//degree

	float ScaleX; 
	float ScaleY;
	float peak = 0.38628;
	scaleRandX = vec2( (scaleRandX.x + peak)*(ScaleXUp + ScaleXDown)/(2.0*peak) - ScaleXDown,  scaleRandX.y* (ScaleXUp + ScaleXDown)/(2.0*peak) );
	scaleRandX = decay(scaleRandX, process, InOutStage );
	ScaleX = scaleRandX.x;
	
	scaleRandY =  vec2( (scaleRandY.x + peak)*(ScaleYUp + ScaleYDown)/(2.0*peak) - ScaleYDown,  scaleRandY.x* (ScaleXUp + ScaleXDown)/(2.0*peak) );
	scaleRandY = decay(scaleRandY, process, InOutStage );
	ScaleY = scaleRandY.x;

	//vec2 curScale = max( vec2(1.0 + scaleRandX.x*ScaleX, 1.0 + scaleRandY.x*ScaleY), vec2(0.01)); //range [0,1]
	vec2 curScale = max( vec2(1.0 + ScaleX, 1.0 + ScaleY), vec2(0.00001) ); //range [0,1]
	
	vec2 uv = tc;

	int samples = 16; 
	if(MotionBlur == 0)
		samples = 2;
	
	vec2 center = vec2(0.5);
	
	float blurAmp = 0.05;
	
	vec2 posV = vec2(posRandX.y, posRandY.y);
	
	vec2 dir = vec2(posRandX.y, posRandY.y)*motionBlur;
	
	float processRota = CurRotate*0.01745329;
	float dirRota = -(180.0-CurRotate)*0.01745329;
	uv = uv - curPos;
	
	uv = rotateFunc(uv*iResolution.xy,iResolution.xy*center,processRota)/iResolution.xy;
	uv = scaleFunc(uv,curScale,center);//scaling

	vec2 radialDir = radialBlur*(uv - center)*vec2(scaleRandX.y*ScaleX,scaleRandY.y*ScaleY)*0.01;
	float detaRotate = motion.y*ROTA;
	
	vec2 RotateDir = rotateblur*rotateFunc(normalize(uv - center), vec2(0.0), - 1.570796) * length(uv - center)*detaRotate*0.01745329;
	
	vec2 totalDir = radialDir+ RotateDir + dir;
	
	vec2 processColorSp = vec2(0.0);
	if(RGBSeparate == 1)
		processColorSp = clamp( totalDir*0.1, -0.02, 0.02 );
	
	float count = 0.0;
	vec4 outCol; 
	vec2 temp1;
	vec2 temp2;
	vec2 temp3;
	if(MotionBlur == 1)
	{
		for (int i = 0; i < samples; i += 2) //operating at 2 samples for better performance
		{
			temp1 = (uv + float(i) / float(samples)*totalDir*blurAmp + vec2(0.0));
			temp2 = (uv + float(i) / float(samples)*totalDir*blurAmp + processColorSp);
			temp3 = (uv + float(i) / float(samples)*totalDir*blurAmp + processColorSp);
					
			color.ra += INPUT(temp1).ra;;
			color.g += INPUT(temp2).g;
			color.b += INPUT(temp3).b;

			temp1 = (uv + float(i+1) / float(samples)*totalDir*blurAmp + vec2(0.0));
			temp2 = (uv + float(i+1) / float(samples)*totalDir*blurAmp + processColorSp);
			temp3 = (uv + float(i+1) / float(samples)*totalDir*blurAmp + processColorSp);
					
			color.ra += INPUT(temp1).ra;;
			color.g += INPUT(temp2).g;
			color.b += INPUT(temp3).b;	
		}
		outCol = color/float(samples);
	}else
	{
		temp1 = (uv + 1.0 / float(samples)*totalDir*blurAmp + vec2(0.0));
		temp2 = (uv + 1.0 / float(samples)*totalDir*blurAmp + vec2(processColorSp));
		temp3 = (uv + 1.0 / float(samples)*totalDir*blurAmp + vec2(processColorSp));
		color.ra += INPUT(temp1).ra;;
		color.g += INPUT(temp2).g;
		color.b += INPUT(temp3).b;	 
		outCol = color;
	}
	return outCol;
}
