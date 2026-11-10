const float _PI            = 3.141592653589793;
const float _scale         = 512.0;   // anti-alias sharpness scale
const float _sharpness     = 3.0;
// 卷曲圆柱截面半径 2/(3π)
const float _cylinderRadius = 2.4 / (3.0 * _PI);

// ---- helpers -----------------------------------------------

float _cut(vec2 u)
{
    return step(0.0, u.x) * step(u.x, 1.0)
         * step(0.0, u.y) * step(u.y, 1.0);
}

vec4 _antiAlias(vec4 c1, vec4 c2, float dist)
{
    dist *= _scale;
    if (dist < 0.0) return c2;
    if (dist > 2.0) return c1;
    float dd = pow(1.0 - dist / 2.0, _sharpness);
    // 预乘 alpha 混合再还原，保留背面/边缘透明度；除法后 clamp 避免 pm.a 极小时发白边
    vec4 p1 = vec4(c1.rgb * c1.a, c1.a);
    vec4 p2 = vec4(c2.rgb * c2.a, c2.a);
    vec4 pm = mix(p1, p2, dd);
    if (pm.a < 1e-4)
        return mix(c1, c2, dd);
    vec3 rgb = clamp(pm.rgb / pm.a, 0.0, 1.0);
    return vec4(rgb, pm.a);
}

float _distToEdge(vec3 pt)
{
    float dx = abs(pt.x > 0.5 ? 1.0 - pt.x : pt.x);
    float dy = abs(pt.y > 0.5 ? 1.0 - pt.y : pt.y);
    if (pt.x < 0.0) dx = -pt.x;
    if (pt.x > 1.0) dx =  pt.x - 1.0;
    if (pt.y < 0.0) dy = -pt.y;
    if (pt.y > 1.0) dy =  pt.y - 1.0;
    if ((pt.x < 0.0 || pt.x > 1.0) && (pt.y < 0.0 || pt.y > 1.0))
        return sqrt(dx*dx + dy*dy);
    return min(dx, dy);
}

vec3 _hitPoint(float hitAngle, float yc, vec3 pt, mat3 rrot)
{
    pt.y = hitAngle / (2.0 * _PI);
    return rrot * pt;
}

// ---- coordinate helpers -------------------------------------
vec2 _rotUV(vec2 p, float a)
{
    float c = cos(a), s = sin(a);
    vec2 d = p - 0.5;
    return vec2(c*d.x - s*d.y, s*d.x + c*d.y) + 0.5;
}

// 卷曲层（INPUT2）：竖屏画边双线性插值 + 亚像素抖动会产生不稳定中 alpha，over 仍漏底。
// 用邻域 max(a) 识别「缝」像素；暗/亮条带阈值 + 极暗残留补刀，尽量不误伤画面内大面积真半透明。
vec4 _pageSrc(vec2 uv)
{
    vec4 c = INPUT2(uv);
    float a = c.a;
    const float dx = 0.0022;
    const float dy = 0.0011;
    float aMax = a;
    aMax = max(aMax, INPUT2(uv + vec2(dx, 0.0)).a);
    aMax = max(aMax, INPUT2(uv - vec2(dx, 0.0)).a);
    aMax = max(aMax, INPUT2(uv + vec2(0.0, dy)).a);
    aMax = max(aMax, INPUT2(uv - vec2(0.0, dy)).a);

    float mx = max(c.r, max(c.g, c.b));
    float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    vec3 straight = clamp(c.rgb / max(a, 1e-4), 0.0, 1.0);

    if (a < 0.003)
        return vec4(c.rgb, 1.0);

    // 缝：中心淡、邻域已有高不透明（竖屏左右画边最常见）
    if (a < 0.70 && aMax > 0.80)
        return vec4(straight, 1.0);
    if (a < 0.60 && aMax > 0.68 && (aMax - a) > 0.035)
        return vec4(straight, 1.0);

    // 黑/近黑条带过渡区
    if (a < 0.56 && mx < 0.52 && lum < 0.44)
        return vec4(straight, 1.0);

    // 极暗条带尾（近黑、a 仍略低于 1）
    if (a < 0.97 && lum < 0.24 && mx < 0.30)
        return vec4(straight, 1.0);

    // 浅灰/白边 letterbox 的缝
    if (a < 0.72 && lum > 0.82 && mx > 0.78)
        return vec4(straight, 1.0);

    return c;
}

// ---- shading helpers ----------------------------------------
vec4 _seeThroughWithShadow(float yc, vec2 p, vec3 pt, float amount,
                           vec2 uv, float dirRad, bool inFrame,
                           float cylAngle, float cylCenter,
                           mat3 rot, mat3 rrot)
{
    return inFrame ? _pageSrc(uv) : vec4(0.0);
}

vec4 _backside(float yc, vec3 pt, float dirRad)
{
    // Rotate hit-point back to original space before sampling
    vec2 sampleUV = _rotUV(pt.xy, -dirRad);
    return _pageSrc(sampleUV);
}

// ---- main cylinder-curl compositing -------------------------
vec4 _curlPage(vec2 uv, float amount, float dirRad, bool inFrame)
{
    float cylCenter = amount;
    float cylAngle  = 2.0 * _PI * amount;

    vec2 uvCurl = _rotUV(uv, dirRad);

    // Fixed 30-degree tilt within curl-space
    const float tilt = 30.0 * _PI / 180.0;
    float c = cos(-tilt);
    float s = sin(-tilt);
    mat3 rotation  = mat3(c,  s, 0.0,
                         -s,  c, 0.0,
                          0.12, 0.258, 1.0);
    c = cos(tilt);
    s = sin(tilt);
    mat3 rrotation = mat3(c,  s, 0.0,
                         -s,  c, 0.0,
                          0.15, -0.5, 1.0);

    vec3 pt  = rotation * vec3(uvCurl, 1.0);
    float yc = pt.y - cylCenter;

    vec4 color;

    if (yc < -_cylinderRadius)
    {
        // fully behind cylinder — transparent
        color = vec4(0.0);
    }
    else if (yc > _cylinderRadius)
    {
        // flat surface in front — only show within the original frame
        color = inFrame ? _pageSrc(uv) : vec4(0.0);
    }
    else
    {
        float hitAngle    = (acos(yc / _cylinderRadius) + cylAngle) - _PI;
        float hitAngleMod = mod(hitAngle, 2.0 * _PI);

        if ((hitAngleMod > _PI && amount < 0.5) ||
            (hitAngleMod > _PI / 2.0 && amount < 0.0))
        {
            // Single-page unfurl: this zone is the flat page surface, not a ghost layer
            color = inFrame ? _pageSrc(uv) : vec4(0.0);
        }
        else
        {
            pt = _hitPoint(hitAngle, yc, pt, rrotation);

            // Boundary check in original space to avoid false out-of-bounds
            vec2 ptOrig = _rotUV(pt.xy, -dirRad);
            if (ptOrig.x < 0.0 || ptOrig.y < 0.0 || ptOrig.x > 1.0 || ptOrig.y > 1.0)
            {
                color = _seeThroughWithShadow(yc, uvCurl, pt, amount,
                                              uv, dirRad, inFrame,
                                              cylAngle, cylCenter,
                                              rotation, rrotation);
            }
            else
            {
                color = _backside(yc, pt, dirRad);

                vec4 otherColor;
                if (yc < 0.0)
                {
                    // Shadow uses original-space distance from center
                    float shado = 1.0 - (sqrt(pow(ptOrig.x - 0.5, 2.0) +
                                              pow(ptOrig.y - 0.5, 2.0)) / 0.71);
                    shado *= pow(-yc / _cylinderRadius, 3.0);
                    shado *= 0.5;
                    otherColor = vec4(0.0, 0.0, 0.0, shado);
                }
                else
                {
                    otherColor = _pageSrc(uv);
                }
                color = _antiAlias(color, otherColor,
                                   _cylinderRadius - abs(yc));
            }
        }
    }

    return color;
}

// ---- curl shadow helper -------------------------------------

float _curlSpaceYc(vec2 uvCurl, float cylCenter)
{
    const float tilt = 30.0 * _PI / 180.0;
    float c = cos(-tilt), s = sin(-tilt);
    mat3 rot = mat3(c, s, 0.0, -s, c, 0.0, 0.12, 0.258, 1.0);
    vec3 pt = rot * vec3(uvCurl, 1.0);
    return pt.y - cylCenter;
}

// ---- entry point --------------------------------------------

vec4 FUNCNAME(vec2 tc)
{
    int passStage = PREFIX(passStage);
    if (passStage == 0)
        return INPUT1(tc);

    float amount      = PREFIX(amount);
    float dirRad      = PREFIX(dirRad);
    float uScale      = PREFIX(uScale);
    float shadowScale = PREFIX(shadowScale);  // 0.0~1.0, default 0.5

    vec2 scaledTC = (tc - 0.5) / uScale + 0.5;

    bool inFrame = (scaledTC.x >= 0.0 && scaledTC.x <= 1.0 &&
                    scaledTC.y >= 0.0 && scaledTC.y <= 1.0);

    const float clipMargin = 0.25;
    if (scaledTC.x < -clipMargin || scaledTC.x > 1.0 + clipMargin ||
        scaledTC.y < -clipMargin || scaledTC.y > 1.0 + clipMargin)
        return INPUT1(tc);

    vec4 color = _curlPage(scaledTC, amount, dirRad, inFrame);
    float curlProgress = clamp((amount + 0.16) / (1.3 + 0.16), 0.0, 1.0);

    // Shadow grows as page unfurls (curlProgress: 1=curled, 0=flat)
    float shadowProgress = 1.0 - curlProgress;

    // 平铺收尾（卷曲度趋近 0）：按 amount 进度收阴影，与片段总时长无关
    const float curlShadowTailEnd = 0.4;
    float flatEndShadowFade = smoothstep(0.0, curlShadowTailEnd, curlProgress);

    if (shadowProgress > 0.01 && flatEndShadowFade > 0.001)
    {
        vec2 uvCurl   = _rotUV(scaledTC, dirRad);
        float yc      = _curlSpaceYc(uvCurl, amount);

        // Signed distance behind the curl edge (positive = in shadow zone)
        float distBehind = -_cylinderRadius - yc;

        // Shadow band — Gaussian falloff from curl edge
        float spread    = 0.15 + shadowProgress * 0.25;
        float peakAlpha = shadowProgress * 0.7 * shadowScale * 2.0 * flatEndShadowFade;

        float t           = distBehind / spread;
        float shadowAlpha = peakAlpha * exp(-t * t * 1.0);
        shadowAlpha       = clamp(shadowAlpha, 0.0, 1.0);

        const float expand    = 0.05;
        const float fadeWidth = 0.08;
        float ex = min(scaledTC.x + expand, 1.0 + expand - scaledTC.x) / fadeWidth;
        float ey = min(scaledTC.y + expand, 1.0 + expand - scaledTC.y) / fadeWidth;
        float edgeFade = clamp(ex, 0.0, 1.0) * clamp(ey, 0.0, 1.0);
        edgeFade = edgeFade * edgeFade * (3.0 - 2.0 * edgeFade);

        shadowAlpha *= edgeFade;

        bool inShadowRegion = (scaledTC.x >= -expand && scaledTC.x <= 1.0 + expand &&
                               scaledTC.y >= -expand && scaledTC.y <= 1.0 + expand);
        if (shadowAlpha > 0.005 && inShadowRegion)
        {
            // 避免 alpha 在阈值附近抖动导致漏底闪烁
            if (color.a < 0.02)
                color = vec4(0.0, 0.0, 0.0, shadowAlpha);
            else
                color.rgb *= 1.0 - shadowAlpha * 0.85;
        }
    }

    // Porter-Duff over：保留合成后的 alpha，不强制为 1（底层半透明时仍正确）
    vec4 base = INPUT1(tc);
    float ba = base.a;
    float ca = color.a;
    vec3 outPm = color.rgb * ca + base.rgb * ba * (1.0 - ca);
    float outA = ca + ba * (1.0 - ca);
    if (outA > 1e-5)
    {
        vec3 outRgb = clamp(outPm / outA, 0.0, 1.0);
        color = vec4(outRgb, outA);
    }
    else
        color = vec4(0.0);
    return color;
}
