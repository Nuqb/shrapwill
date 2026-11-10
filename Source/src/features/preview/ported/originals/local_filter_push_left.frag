/*
  GUID: 5AD2539F-6AC6-40B1-823C-3813698F1FDE
*/
float A(float aA1, float aA2)
{
  return 1.0 - 3.0 * aA2 + 3.0 * aA1;
}

float B(float aA1, float aA2)
{
  return 3.0 * aA2 - 6.0 * aA1;
}

float C(float aA1)
{
  return 3.0 * aA1;
}

float GetSlope(float aT, float aA1, float aA2)
{
  return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
}

float CalcBezier(float aT, float aA1, float aA2)
{
  return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
}

float GetTForX(float aX, float mX1, float mX2)
{
  float aGuessT = aX;
  for (int i = 0; i < 6; ++i)
  {
    float currentSlope = GetSlope(aGuessT, mX1, mX2);
    if (currentSlope == 0.0)
      return aGuessT;
    float currentX = CalcBezier(aGuessT, mX1, mX2) - aX;
    aGuessT -= currentX / currentSlope;
  }
  return aGuessT;
}

float KeySpline(vec4 p, float aX)
{
  vec2 p1 = vec2(p.x, p.y);
  vec2 p2 = vec2(p.z, p.w);
  float mX1 = p1.x;
  float mY1 = p1.y;
  float mX2 = p2.x;
  float mY2 = p2.y;
  if (mX1 == mY1 && mX2 == mY2)
    return aX; // linear
  return CalcBezier(GetTForX(aX, mX1, mX2), mY1, mY2);
}

vec4 sum(vec4 l, vec4 k)
{
  return vec4(min(1., l.r + k.r), min(1., l.g + k.g), min(1., l.b + k.b), min(1., l.a + k.a));
}

vec4 FUNCNAME(vec2 tc)
{
  vec2 uv = tc;
  float globalTime = PREFIX(global_time);
  float totalTime = PREFIX(total_time);
  float iPro = min(globalTime / totalTime, 1.0);
  vec4 retColor1 = INPUT1(uv);
  vec4 retColor2 = INPUT1(uv);
  vec4 changeColor = vec4(112.0 / 255.0, 25.0 / 255.0, 25.0 / 255.0, 1.0);

  vec4 p = vec4(.02, .64, .29, .89);
  float t = KeySpline(p, iPro);
  iPro = t;
  float x1 = iPro < 0.25 ? -3.2 * iPro * iPro + 1.6 * iPro : 0.2844 * iPro * iPro - 0.5689 * iPro + 0.3244;
  iPro = 1.0 - t;
  float x2 = iPro - x1 - 0.03;
  if (uv.x < iPro && uv.x > x2)
  {
    // uv = uv * 0.7;
    vec2 uv1 = tc;
    vec2 uv2 = tc;
    uv1.x += 0.05;
    uv2.x -= 0.05;
    float offset = -(iPro) * 0.05 + 0.05;
    if (uv1.x <= 0.4)
    {
      uv1.x -= offset;
      retColor2 = INPUT2(uv1);
    }
    else if (uv1.x > 0.4 && uv1.x <= 0.9)
    {
      uv2.x += offset;
      retColor2 = INPUT2(uv2);
    }
    else
    {
      uv1.x -= offset;
      retColor2 = INPUT2(uv1);
    }
    retColor1 = retColor2 * changeColor;
  }
  else if (uv.x <= iPro)
  {
    retColor1 = INPUT1(uv);
  }
  else
  {
    vec2 uv1 = tc;
    vec2 uv2 = tc;
    uv1.x += 0.05;
    uv2.x -= 0.05;
    float offset = -(iPro) * 0.05 + 0.05;
    if (uv1.x <= 0.4)
    {
      uv1.x -= offset;
      retColor2 = INPUT2(uv1);
    }
    else if (uv1.x > 0.4 && uv1.x <= 0.9)
    {
      uv2.x += offset;
      retColor2 = INPUT2(uv2);
    }
    else
    {
      uv1.x -= offset;
      retColor2 = INPUT2(uv1);
    }

    retColor1 = retColor2;
  }
  return retColor1;
}
