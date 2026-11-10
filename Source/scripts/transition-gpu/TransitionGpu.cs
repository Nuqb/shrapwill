using System;
using System.IO;
using System.Text;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using System.Drawing;

// Runs only bundled shaders against decoded frames. No project-supplied code is accepted.
internal static partial class TransitionGpu
{
    static IntPtr job;
    static float? frameTime;
    static int originalWidth,originalHeight;
    [StructLayout(LayoutKind.Sequential)]
    struct BasicLimits
    {
        public long processTime, jobTime; public uint flags; public UIntPtr minimum, maximum; public uint active; public UIntPtr affinity; public uint priority, scheduling;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct IoCounters
    {
        public ulong readOps, writeOps, otherOps, readBytes, writeBytes, otherBytes;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct ExtendedLimits
    {
        public BasicLimits basic; public IoCounters io; public UIntPtr processMemory, jobMemory, peakProcess, peakJob;
    }
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern IntPtr CreateJobObject(IntPtr attributes, string name);
    [DllImport("kernel32.dll")] static extern bool SetInformationJobObject(IntPtr job, int type, ref ExtendedLimits info, int length);
    [DllImport("kernel32.dll")] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    const uint GL_VERTEX_SHADER = 0x8B31, GL_FRAGMENT_SHADER = 0x8B30, GL_COMPILE_STATUS = 0x8B81, GL_LINK_STATUS = 0x8B82;
    [StructLayout(LayoutKind.Sequential)]
    struct PixelFormat
    {
        public ushort size, version; public uint flags; public byte type, colorBits, redBits, redShift, greenBits, greenShift, blueBits, blueShift, alphaBits, alphaShift;
        public byte accumBits, accumRed, accumGreen, accumBlue, accumAlpha, depth, stencil, aux, layer, reserved; public uint layerMask, visibleMask, damageMask;
    }
    [DllImport("user32.dll")] static extern IntPtr GetDC(IntPtr window);
    [DllImport("user32.dll")] static extern int ReleaseDC(IntPtr window, IntPtr dc);
    [DllImport("gdi32.dll")] static extern int ChoosePixelFormat(IntPtr dc, ref PixelFormat p);
    [DllImport("gdi32.dll")] static extern bool SetPixelFormat(IntPtr dc, int format, ref PixelFormat p);
    [DllImport("opengl32.dll")] static extern IntPtr wglCreateContext(IntPtr dc);
    [DllImport("opengl32.dll")] static extern bool wglMakeCurrent(IntPtr dc, IntPtr rc);
    [DllImport("opengl32.dll")] static extern bool wglDeleteContext(IntPtr rc);
    [DllImport("opengl32.dll")] static extern IntPtr wglGetProcAddress(string name);
    [DllImport("opengl32.dll")] static extern void glBegin(uint mode);
    [DllImport("opengl32.dll")] static extern void glVertex2f(float x, float y);
    [DllImport("opengl32.dll")] static extern void glEnd();
    [DllImport("opengl32.dll")] static extern IntPtr glGetString(uint name);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate uint CreateShader(uint kind);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate uint CreateProgram();
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void ShaderSource(uint shader, int count, [MarshalAs(UnmanagedType.LPArray, ArraySubType = UnmanagedType.LPStr)] string[] source, int[] lengths);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void ShaderAction(uint shader);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void AttachShader(uint program, uint shader);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void GetStatus(uint shader, uint key, out int value);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void GetLog(uint shader, int length, out int written, StringBuilder log);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate int UniformLocation(uint program, [MarshalAs(UnmanagedType.LPStr)] string name);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void Uniform1f(int location, float value);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void Uniform1i(int location, int value);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void Uniform3f(int location, float x, float y, float z);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void Uniform2f(int location, float x, float y);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void ActiveTexture(uint unit);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void GenerateObjects(int count, out uint handle);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void BindFramebuffer(uint target, uint handle);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void AttachTexture(uint target, uint attachment, uint textureTarget, uint texture, int level);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate uint FramebufferStatus(uint target);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void DeleteObjects(int count, ref uint handle);
    static T Load<T>(string name)
    {
        IntPtr p = glesModule != IntPtr.Zero ? GetProcAddress(glesModule, name) : wglGetProcAddress(name);
        if (glesModule == IntPtr.Zero && (p == IntPtr.Zero || p.ToInt64() <= 3 || p.ToInt64() == -1))
            p = GetProcAddress(GetModuleHandle("opengl32.dll"), name);
        if (p == IntPtr.Zero)
            throw new Exception("Missing OpenGL function " + name);
        return (T)(object)Marshal.GetDelegateForFunctionPointer(p, typeof(T));
    }
    static uint Compile(uint kind, string text)
    {
        uint shader = Load<CreateShader>("glCreateShader")(kind);
        Load<ShaderSource>("glShaderSource")(shader, 1, new string[] { text }, null);
        Load<ShaderAction>("glCompileShader")(shader);
        int ok;
        Load<GetStatus>("glGetShaderiv")(shader, GL_COMPILE_STATUS, out ok);
        if (ok == 0)
        {
            var log = new StringBuilder(32768);
            int count;
            Load<GetLog>("glGetShaderInfoLog")(shader, 32768, out count, log);
            throw new Exception(log.ToString());
        }
        return shader;
    }
    static uint Program(string text)
    {
        string vertexSource = glesModule == IntPtr.Zero ? "#version 130\nout vec2 portUV;void main(){gl_Position=gl_Vertex;portUV=gl_Vertex.xy*.5+.5;}" : "#version 300 es\nlayout(location=0)in vec2 position;out vec2 portUV;void main(){gl_Position=vec4(position,0.,1.);portUV=position*.5+.5;}";
        uint vertex = Compile(GL_VERTEX_SHADER, vertexSource);
        uint fragment = Compile(GL_FRAGMENT_SHADER, text);
        uint program = Load<CreateProgram>("glCreateProgram")();
        var attach = Load<AttachShader>("glAttachShader");
        attach(program, vertex);
        attach(program, fragment);
        Load<ShaderAction>("glLinkProgram")(program);
        int ok;
        Load<GetStatus>("glGetProgramiv")(program, GL_LINK_STATUS, out ok);
        Load<ShaderAction>("glDeleteShader")(vertex);
        Load<ShaderAction>("glDeleteShader")(fragment);
        if (ok == 0)
        {
            var log = new StringBuilder(32768);
            int count;
            Load<GetLog>("glGetProgramInfoLog")(program, 32768, out count, log);
            throw new Exception(log.ToString());
        }
        return program;
    }
    static string Fragment(string body)
    {
        if (glesModule != IntPtr.Zero)
            return EsFragment(body);
        return "#version 130\n" + ShaderHeader() + body + ShaderMain();
    }
    sealed class Context : IDisposable
    {
        Form window; IntPtr dc, rc; uint framebuffer, outputTexture; EglContext egl;
        public Context(int width, int height, bool nativeReference = false, bool preserveAlpha = false)
        {
            if (!nativeReference)
            {
                egl = new EglContext();
                Geometry();
            }
            else
            {
                glesModule = IntPtr.Zero;
                window = new Form();
                window.ShowInTaskbar = false;
                window.ClientSize = new Size(width, height);
                window.FormBorderStyle = FormBorderStyle.None;
                dc = GetDC(window.Handle);
                var p = new PixelFormat();
                p.size = (ushort)Marshal.SizeOf(typeof(PixelFormat));
                p.version = 1;
                p.flags = 0x24;
                p.colorBits = 32;
                p.alphaBits = 8;
                int format = ChoosePixelFormat(dc, ref p);
                if (format == 0 || !SetPixelFormat(dc, format, ref p))
                    throw new Exception("Cannot initialize OpenGL pixel format");
                rc = wglCreateContext(dc);
                if (rc == IntPtr.Zero || !wglMakeCurrent(dc, rc))
                    throw new Exception("Cannot initialize OpenGL transition renderer");
            }
            glGenTextures(1, out outputTexture);
            glBindTexture(0x0DE1, outputTexture);
            // Match the editor's opaque scene framebuffer; preserve shader RGB verbatim.
            glTexImage2D(0x0DE1, 0, preserveAlpha ? 0x8058 : 0x8051, width, height, 0, preserveAlpha ? 0x1908u : 0x1907u, 0x1401, IntPtr.Zero);
            Load<GenerateObjects>("glGenFramebuffers")(1, out framebuffer);
            Load<BindFramebuffer>("glBindFramebuffer")(0x8D40, framebuffer);
            Load<AttachTexture>("glFramebufferTexture2D")(0x8D40, 0x8CE0, 0x0DE1, outputTexture, 0);
            if (Load<FramebufferStatus>("glCheckFramebufferStatus")(0x8D40) != 0x8CD5)
                throw new Exception("Cannot allocate transition framebuffer");
            glViewport(0, 0, width, height);
        }
        public void Dispose()
        {
            Load<DeleteObjects>("glDeleteFramebuffers")(1, ref framebuffer);
            glDeleteTextures(1, ref outputTexture);
            if (egl != null)
            {
                egl.Dispose();
                return;
            }
            wglMakeCurrent(IntPtr.Zero, IntPtr.Zero);
            wglDeleteContext(rc);
            ReleaseDC(window.Handle, dc);
            window.Dispose();
        }
    }
    static string Quote(string s)
    {
        if (s.IndexOf('"') >= 0)
            throw new Exception("Invalid tool argument");
        return "\"" + s + "\"";
    }
    static Process Child(string ffmpeg, string args, bool input)
    {
        var info = new ProcessStartInfo(ffmpeg, args);
        info.UseShellExecute = false;
        info.CreateNoWindow = true;
        info.RedirectStandardError = true;
        info.RedirectStandardInput = input;
        info.RedirectStandardOutput = !input;
        var child = new Process();
        child.StartInfo = info;
        child.ErrorDataReceived += (sender, e) => { if (e.Data != null) Console.Error.WriteLine(e.Data); };
        child.Start();
        if (!AssignProcessToJobObject(job, child.Handle))
        {
            child.Kill();
            child.Dispose();
            throw new Exception("Cannot contain transition media processes");
        }
        child.BeginErrorReadLine();
        return child;
    }
    static void ReadFrame(Stream input, byte[] bytes)
    {
        int n = 0;
        while (n < bytes.Length)
        {
            int count = input.Read(bytes, n, bytes.Length - n);
            if (count == 0)
                throw new EndOfStreamException("Transition input ended before the interval finished");
            n += count;
        }
    }
    static void Flip(byte[] source, byte[] target, int width, int height)
    {
        int row = width * 4;
        for (int y = 0; y < height; y++)
            Buffer.BlockCopy(source, y * row, target, (height - y - 1) * row, row);
    }
    static unsafe void Upload(uint texture, byte[] bytes, int width, int height, int unit)
    {
        Load<ActiveTexture>("glActiveTexture")((uint)(0x84C0 + unit));
        glBindTexture(0x0DE1, texture);
        glTexParameteri(0x0DE1, 0x2801, 0x2601);
        glTexParameteri(0x0DE1, 0x2800, 0x2601);
        glTexParameteri(0x0DE1, 0x2802, 0x812F);
        glTexParameteri(0x0DE1, 0x2803, 0x812F);
        fixed (byte* p = bytes)
            glTexImage2D(0x0DE1, 0, 0x8058, width, height, 0, 0x1908, 0x1401, (IntPtr)p);
    }
    static unsafe void Picture(uint program, uint[] textures, byte[] a, byte[] b, byte[] result, int width, int height, float progress, float duration)
    {
        originalWidth=width;originalHeight=height;
        activeDuration=duration;
        Upload(textures[0], a, width, height, 0);
        Upload(textures[1], b, width, height, 1);
        Load<ActiveTexture>("glActiveTexture")(0x84C8);glBindTexture(0x0DE1,textures[0]);
        if(currentTextures!=null)currentTextures.Analyze(a,b,width,height,progress);
        if (currentTextures != null && currentTextures.graph != null)
            currentTextures.graph.Run(currentTextures.Inputs(textures,progress),new RenderFrame(width,height,progress,duration){strength=currentTextures.Strength});
        else {
            if (currentTextures != null) currentTextures.Bind(progress);
            Draw(program,new RenderFrame(width,height,progress,duration){strength=currentTextures==null?1:currentTextures.Strength});
        }
        fixed (byte* p = result)
            glReadPixels(0, 0, width, height, 0x1908, 0x1401, (IntPtr)p);
    }
    static void Draw(uint program,RenderFrame frame)
    {
        int width=frame.width, height=frame.height;
        float progress=frame.progress, duration=frame.duration;
        Load<ShaderAction>("glUseProgram")(program);
        var location = Load<UniformLocation>("glGetUniformLocation");
        Load<Uniform1i>("glUniform1i")(location(program,"hostOriginal"),8);
        Load<Uniform1f>("glUniform1f")(location(program,"host_strength"),frame.strength);
        Load<Uniform1i>("glUniform1i")(location(program, "inputA"), 0);
        Load<Uniform1i>("glUniform1i")(location(program, "inputB"), 1);
        for (int input = 2; input < 8; input++)
            Load<Uniform1i>("glUniform1i")(location(program, "input" + (char)('A' + input)), input);
        Load<Uniform1f>("glUniform1f")(location(program, "u_global_time"), frameTime ?? progress * duration);
        Load<Uniform1f>("glUniform1f")(location(program, "u_total_time"), duration);
        Load<Uniform2f>("glUniform2f")(location(program, "iResolution"), width, height);
        Load<Uniform2f>("glUniform2f")(location(program,"originalResolution"),originalWidth,originalHeight);
        var eye=currentTextures==null?new double[]{.5,.5}:currentTextures.eye;
        Load<Uniform2f>("glUniform2f")(location(program,"host_eye"),(float)eye[0],(float)eye[1]);
        Load<Uniform1f>("glUniform1f")(location(program,"u_frame_rate"),frameRate);
        if(currentTextures!=null)for(int i=0;i<currentTextures.values.Length;i++)Load<Uniform1f>("glUniform1f")(location(program,"host_curve"+(i+1)),currentTextures.values[i]);
        if (glesModule != IntPtr.Zero)
            Load<GlDrawArrays>("glDrawArrays")(4, 0, 6);
        else
        {
            glBegin(5);
            glVertex2f(-1, -1);
            glVertex2f(1, -1);
            glVertex2f(-1, 1);
            glVertex2f(1, 1);
            glEnd();
        }
    }
    static void Check(string directory)
    {
        using (var context = new Context(64, 64, true))
            foreach (string file in Directory.GetFiles(directory, "*.frag"))
            {
                try
                {
                    uint program = Program(Fragment(currentTextures != null && currentTextures.graph != null ? "vec4 FUNCNAME(vec2 tc){return INPUT1(tc);}" : File.ReadAllText(file)));
                    Load<ShaderAction>("glDeleteProgram")(program);
                    Console.WriteLine(Path.GetFileName(file) + "\tOK");
                }
                catch (Exception error) { Console.WriteLine(Path.GetFileName(file) + "\tFAIL\t" + Convert.ToBase64String(Encoding.UTF8.GetBytes(error.Message))); }
            }
    }
    static void Reference(string[] args)
    {
        if(args.Length==8) mediaTool=args[7];
        string directory = args[1], outDir = args[4];
        int width = int.Parse(args[5]), height = int.Parse(args[6]);
        Directory.CreateDirectory(outDir);
        byte[] rawA = File.ReadAllBytes(args[2]), rawB = File.ReadAllBytes(args[3]);
        byte[] a = new byte[width * height * 4], b = new byte[a.Length], result = new byte[a.Length], top = new byte[a.Length];
        if (rawA.Length != a.Length || rawB.Length != a.Length)
            throw new Exception("Invalid reference images");
        Flip(rawA, a, width, height);
        Flip(rawB, b, width, height);
        using (var context = new Context(width, height, args[0] != "--reference-es"))
        {
            uint ta, tb;
            glGenTextures(1, out ta);
            glGenTextures(1, out tb);
            uint[] textures = { ta, tb };
            foreach (string file in Directory.GetFiles(directory, "*.frag"))
            {
                using (var maps = new TextureSet(file))
                {
                    currentTextures = maps;
                    uint program = Program(Fragment(currentTextures != null && currentTextures.graph != null ? "vec4 FUNCNAME(vec2 tc){return INPUT1(tc);}" : File.ReadAllText(file)));
                    for (int phase = 0; phase <= 6; phase++)
                    {
                        Picture(program, textures, a, b, result, width, height, phase / 6f, 1f);
                        Flip(result, top, width, height);
                        File.WriteAllBytes(Path.Combine(outDir, Path.GetFileNameWithoutExtension(file) + "-" + phase + ".rgba"), top);
                    }
                    Load<ShaderAction>("glDeleteProgram")(program);
                    currentTextures = null;
                }
            }
        }
    }
    static void Render(string[] args)
    {
        string shader = args[0], ffmpeg = args[1], outgoing = args[2], incoming = args[3], output = args[4];
        mediaTool=ffmpeg;
        int width = int.Parse(args[5]), height = int.Parse(args[6]), frames = int.Parse(args[11]);
        uint num = uint.Parse(args[7]), den = uint.Parse(args[8]);
        frameRate=(float)num/den;
        long offset = long.Parse(args[9]), duration = long.Parse(args[10]);
        if (width < 2 || height < 2 || width > 7680 || height > 7680 || frames < 1 || duration < 1)
            throw new Exception("Invalid transition render bounds");
        string decode = "-v error -threads 2 -i ";
        Process first = null, second = null, encoder = null;
        try
        {
            using (var context = new Context(width, height, false, TextureSet.Source(shader)))
            using (var maps = new TextureSet(shader))
            {
                currentTextures = maps;
                uint program = Program(Fragment(currentTextures.graph != null ? "vec4 FUNCNAME(vec2 tc){return INPUT1(tc);}" : File.ReadAllText(shader)));
                uint ta, tb;
                glGenTextures(1, out ta);
                glGenTextures(1, out tb);
                uint[] textures = { ta, tb };
                first = Child(ffmpeg, decode + Quote(outgoing) + " -an -pix_fmt rgba -f rawvideo pipe:1", false);
                second = Child(ffmpeg, decode + Quote(incoming) + " -an -pix_fmt rgba -f rawvideo pipe:1", false);
                encoder = Child(ffmpeg, "-v error -y -f rawvideo -pix_fmt rgba -s " + width + "x" + height + " -r " + num + "/" + den + " -i pipe:0 -an -c:v ffv1 -level 3 -threads 2 " + Quote(output), true);
                byte[] rawA = new byte[width * height * 4], rawB = new byte[rawA.Length], a = new byte[rawA.Length], b = new byte[rawA.Length], result = new byte[rawA.Length], top = new byte[rawA.Length];
                for (int i = 0; i < frames; i++)
                {
                    ReadFrame(first.StandardOutput.BaseStream, rawA);
                    ReadFrame(second.StandardOutput.BaseStream, rawB);
                    Flip(rawA, a, width, height);
                    Flip(rawB, b, width, height);
                    frameTime = (float)((offset + i) * (double)den / num);
                    Picture(program, textures, a, b, result, width, height, (offset + i) / (float)duration, (float)(duration * (double)den / num));
                    Flip(result, top, width, height);
                    encoder.StandardInput.BaseStream.Write(top, 0, top.Length);
                }
                encoder.StandardInput.Close();
                first.WaitForExit();
                second.WaitForExit();
                encoder.WaitForExit();
                if (first.ExitCode != 0 || second.ExitCode != 0 || encoder.ExitCode != 0)
                    throw new Exception("Transition decoder/encoder failed");
            }
        }
        finally { foreach (var child in new Process[] { first, second, encoder }) if (child != null) { if (!child.HasExited) child.Kill(); child.Dispose(); } }
    }
    [STAThread]
    static int Main(string[] args)
    {
        try
        {
            job = CreateJobObject(IntPtr.Zero, null);
            var limits = new ExtendedLimits();
            limits.basic.flags = 0x2000;
            if (job == IntPtr.Zero || !SetInformationJobObject(job, 9, ref limits, Marshal.SizeOf(typeof(ExtendedLimits))))
                throw new Exception("Cannot contain transition worker processes");
            if(args.Length==6 && args[0]=="--analyze")
                AnalyzeFrame(args);
            else if (args.Length == 2 && args[0] == "--check")
                Check(args[1]);
            else if ((args.Length == 7 || args.Length == 8) && (args[0] == "--reference" || args[0] == "--reference-es"))
                Reference(args);
            else if (args.Length == 12)
                Render(args);
            else
                throw new Exception("Invalid transition renderer arguments");
            return 0;
        }
        catch (Exception error) { Console.Error.WriteLine(error.ToString()); return 1; }
        finally { if (job != IntPtr.Zero) CloseHandle(job); }
    }
}
