using System;
using System.Runtime.InteropServices;

internal static partial class TransitionGpu
{
    public sealed class RenderStage
    {
        public string body; public int[] inputs; public double? scale; public int[] size; public string format; public double? largeScale;
    }
    sealed class RenderFrame
    {
        public int width, height;
        public float progress, duration;
        public float strength=1;
        public RenderFrame(int width, int height, float progress, float duration)
        {
            this.width = width;
            this.height = height;
            this.progress = progress;
            this.duration = duration;
        }
    }
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void GetInteger(uint key, out int value);
    sealed class ShaderGraph : IDisposable
    {
        RenderStage[] stages;
        uint[] programs, textures, framebuffers;
        string[] sizes;
        public ShaderGraph(RenderStage[] recipe)
        {
            if(recipe.Length<1 || recipe.Length>32) throw new Exception("Invalid effect stage count");
            stages = recipe;
            programs = new uint[stages.Length];
            textures = new uint[stages.Length - 1];
            framebuffers = new uint[textures.Length];
            sizes = new string[textures.Length];
            for(int i=0;i<stages.Length;i++) {
                foreach(int input in stages[i].inputs)
                    if(input>=9 || (input<0 && -input-1>=i)) throw new Exception("Invalid effect stage input");
                try{programs[i]=Program(Fragment(stages[i].body));}
                catch(Exception error){throw new Exception("Original render stage "+i+": "+error.Message);}
            }
            for(int i=0;i<textures.Length;i++) {
                glGenTextures(1,out textures[i]);
                Load<GenerateObjects>("glGenFramebuffers")(1,out framebuffers[i]);
            }
        }
        void Target(int index, int width, int height)
        {
            Load<ActiveTexture>("glActiveTexture")(0x84C0);
            glBindTexture(0x0DE1,textures[index]);
            if(sizes[index]!=width+"/"+height+"/"+stages[index].format) {
                glTexImage2D(0x0DE1,0,stages[index].format=="rgba16f"?0x881A:0x8058,width,height,0,0x1908,stages[index].format=="rgba16f"?0x1406u:0x1401u,IntPtr.Zero);
                glTexParameteri(0x0DE1,0x2801,0x2601);
                glTexParameteri(0x0DE1,0x2800,0x2601);
                glTexParameteri(0x0DE1,0x2802,0x812F);
                glTexParameteri(0x0DE1,0x2803,0x812F);
                sizes[index]=width+"/"+height+"/"+stages[index].format;
            }
            Load<BindFramebuffer>("glBindFramebuffer")(0x8D40,framebuffers[index]);
            Load<AttachTexture>("glFramebufferTexture2D")(0x8D40,0x8CE0,0x0DE1,textures[index],0);
            if(Load<FramebufferStatus>("glCheckFramebufferStatus")(0x8D40)!=0x8CD5) throw new Exception("Cannot allocate effect stage");
        }
        int[] Size(int index,int width,int height) {
            if(index==stages.Length-1) return new int[]{width,height};
            var stage=stages[index];
            if(stage.size!=null) return width>height?stage.size:new int[]{stage.size[1],stage.size[0]};
            double factor=(stage.scale??1)*(Math.Max(width,height)>1000?(stage.largeScale??1):1);
            return new int[]{Math.Max(1,(int)Math.Floor(width*factor)),Math.Max(1,(int)Math.Floor(height*factor))};
        }
        void BindInputs(int index, uint[] inputs)
        {
            for(int slot=0;slot<8;slot++) {
                int input=slot<stages[index].inputs.Length?stages[index].inputs[slot]:0;
                Load<ActiveTexture>("glActiveTexture")((uint)(0x84C0+slot));
                glBindTexture(0x0DE1,input<0?textures[-input-1]:inputs[input]);
            }
        }
        public void Run(uint[] inputs, RenderFrame frame)
        {
            int width=frame.width, height=frame.height;
            long bytes=0;
            for(int i=0;i<stages.Length;i++) {
                var size=Size(i,width,height);
                if(size.Length!=2 || size[0]<1 || size[1]<1 || size[0]>7680 || size[1]>7680)
                    throw new Exception("Invalid effect stage dimensions");
                bytes+=(long)size[0]*size[1]*(stages[i].format=="rgba16f"?8:4);
            }
            if(bytes>256*1024*1024) throw new Exception("Effect stage memory limit exceeded");
            int output; Load<GetInteger>("glGetIntegerv")(0x8CA6,out output);
            try {
                for(int i=0;i<stages.Length;i++) {
                    int[] size=Size(i,width,height);
                    if(i==stages.Length-1) Load<BindFramebuffer>("glBindFramebuffer")(0x8D40,(uint)output);
                    else Target(i,size[0],size[1]);
                    glViewport(0,0,size[0],size[1]);
                    BindInputs(i,inputs);
                    Draw(programs[i],new RenderFrame(size[0],size[1],frame.progress,frame.duration){strength=i==stages.Length-1?frame.strength:1});
                }
            } finally {
                Load<BindFramebuffer>("glBindFramebuffer")(0x8D40,(uint)output);
                glViewport(0,0,width,height);
            }
        }
        public void Dispose() {
            foreach(uint p in programs) Load<ShaderAction>("glDeleteProgram")(p);
            for(int i=0;i<textures.Length;i++) {
                glDeleteTextures(1,ref textures[i]);
                Load<DeleteObjects>("glDeleteFramebuffers")(1,ref framebuffers[i]);
            }
        }
    }
}
