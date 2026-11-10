using System;
internal static class AnimationCurves {
    public sealed class Segment {public double[] time,value,bezier;}
    static double Cubic(double p,double a,double b){return 3*a*Math.Pow(1-p,2)*p+3*b*(1-p)*p*p+p*p*p;}
    static float Evaluate(Segment curve,double phase){
        if(phase<=curve.time[0])return (float)curve.value[0];
        if(phase>=curve.time[1])return (float)curve.value[1];
        double x=(phase-curve.time[0])/(curve.time[1]-curve.time[0]),start=0,end=1;
        while(end-start>.0001){double middle=(start+end)*.5;if(Cubic(middle,curve.bezier[0],curve.bezier[2])>x)end=middle;else start=middle;}
        return (float)(curve.value[0]+(curve.value[1]-curve.value[0])*Cubic((start+end)*.5,curve.bezier[1],curve.bezier[3]));
    }
    public static float[] Values(Segment[][] curves,double phase){
        if(curves==null || curves.Length==0)return new float[0];
        var values=new float[6];
        for(int i=0;i<curves.Length;i++){
            var chosen=curves[i][curves[i].Length-1];
            foreach(var part in curves[i])if(phase<=part.time[1]){chosen=part;break;}
            values[i]=Evaluate(chosen,phase);
        }
        double frame=Math.Floor(phase*47.999996);bool even=frame%2==0;
        values[5]=Evaluate(new Segment{time=new double[]{frame,frame+1},value=even?new double[]{6.666667,0}:new double[]{0,6.666667},bezier=even?new double[]{.166666667,.166666667,.833333333,1}:new double[]{.166666667,0,.833333333,.916666667}},phase);
        return values;
    }
}
