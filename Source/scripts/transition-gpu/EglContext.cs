using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;

internal static partial class TransitionGpu
{
    static IntPtr glesModule;
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern IntPtr LoadLibraryEx(string file, IntPtr reserved, uint flags);
    [DllImport("kernel32.dll", CharSet = CharSet.Ansi)] static extern IntPtr GetProcAddress(IntPtr module, string name);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern IntPtr GetModuleHandle(string name);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr EglGetDisplay(IntPtr display);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate uint EglInitialize(IntPtr display, out int major, out int minor);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate uint EglBindApi(uint api);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate uint EglChooseConfig(IntPtr display, int[] attributes, out IntPtr config, int capacity, out int count);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr EglCreateSurface(IntPtr display, IntPtr config, int[] attributes);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr EglCreateContext(IntPtr display, IntPtr config, IntPtr shared, int[] attributes);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate uint EglMakeCurrent(IntPtr display, IntPtr draw, IntPtr read, IntPtr context);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate uint EglDestroy(IntPtr display, IntPtr value);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate uint EglTerminate(IntPtr display);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void GlViewport(int x, int y, int width, int height);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void GlBindTexture(uint target, uint texture);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void GlTexParameter(uint target, uint parameter, int value);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void GlTexImage(uint target, int level, int internalFormat, int width, int height, int border, uint format, uint type, IntPtr data);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void GlReadPixels(int x, int y, int width, int height, uint format, uint type, IntPtr data);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void GlBindObject(uint target, uint value);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void GlBufferData(uint target, IntPtr size, IntPtr data, uint usage);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void GlEnableAttribute(uint index);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void GlAttribute(uint index, int size, uint type, byte normalized, int stride, IntPtr offset);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void GlDrawArrays(uint mode, int first, int count);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void GlBindVertexArray(uint value);

    static T Egl<T>(IntPtr module, string name)
    {
        IntPtr pointer = GetProcAddress(module, name);
        if (pointer == IntPtr.Zero)
            throw new Exception("Missing EGL entry point " + name);
        return (T)(object)Marshal.GetDelegateForFunctionPointer(pointer, typeof(T));
    }
    sealed class EglContext : IDisposable
    {
        IntPtr library, display, surface, context;
        public EglContext()
        {
            string directory = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
            glesModule = LoadLibraryEx(Path.Combine(directory, "libGLESv2.dll"), IntPtr.Zero, 0x1100);
            library = LoadLibraryEx(Path.Combine(directory, "libEGL.dll"), IntPtr.Zero, 0x1100);
            if (glesModule == IntPtr.Zero || library == IntPtr.Zero)
                throw new Exception("Cannot load the bundled ANGLE graphics runtime");
            display = Egl<EglGetDisplay>(library, "eglGetDisplay")(IntPtr.Zero);
            int major, minor;
            if (Egl<EglInitialize>(library, "eglInitialize")(display, out major, out minor) == 0)
                throw new Exception("Cannot initialize ANGLE graphics");
            Egl<EglBindApi>(library, "eglBindAPI")(0x30A0);
            IntPtr config;
            int count;
            int[] attributes = { 0x3033, 1, 0x3040, 0x40, 0x3024, 8, 0x3023, 8, 0x3022, 8, 0x3038 };
            if (Egl<EglChooseConfig>(library, "eglChooseConfig")(display, attributes, out config, 1, out count) == 0 || count == 0)
                throw new Exception("ANGLE does not support an OpenGL ES 3 render context");
            surface = Egl<EglCreateSurface>(library, "eglCreatePbufferSurface")(display, config, new int[] { 0x3057, 1, 0x3056, 1, 0x3038 });
            context = Egl<EglCreateContext>(library, "eglCreateContext")(display, config, IntPtr.Zero, new int[] { 0x3098, 3, 0x3038 });
            if (surface == IntPtr.Zero || context == IntPtr.Zero || Egl<EglMakeCurrent>(library, "eglMakeCurrent")(display, surface, surface, context) == 0)
                throw new Exception("Cannot activate the ANGLE transition context");
        }
        public void Dispose()
        {
            Egl<EglMakeCurrent>(library, "eglMakeCurrent")(display, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
            Egl<EglDestroy>(library, "eglDestroyContext")(display, context);
            Egl<EglDestroy>(library, "eglDestroySurface")(display, surface);
            Egl<EglTerminate>(library, "eglTerminate")(display);
        }
    }
    static string EsFragment(string body)
    {
        body = Regex.Replace(body, @"PREFIX\(\s*(\w+)\s*\)", "param_$1");
        body = Regex.Replace(body, @"precision\s+mediump\s+float\s*;", "precision highp float;");
        return "#version 300 es\nprecision highp float;precision highp int;\n" + ShaderHeader() + body + ShaderMain();
    }
    static unsafe void Geometry()
    {
        uint vao, buffer;
        Load<GenerateObjects>("glGenVertexArrays")(1, out vao);
        Load<GlBindVertexArray>("glBindVertexArray")(vao);
        Load<GenerateObjects>("glGenBuffers")(1, out buffer);
        Load<GlBindObject>("glBindBuffer")(0x8892, buffer);
        float[] vertices = { -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1 };
        fixed (float* pointer = vertices)
            Load<GlBufferData>("glBufferData")(0x8892, (IntPtr)(vertices.Length * 4), (IntPtr)pointer, 0x88E4);
        Load<GlEnableAttribute>("glEnableVertexAttribArray")(0);
        Load<GlAttribute>("glVertexAttribPointer")(0, 2, 0x1406, 0, 0, IntPtr.Zero);
    }
    static void glViewport(int x, int y, int width, int height)
    {
        Load<GlViewport>("glViewport")(x, y, width, height);
    }
    static void glGenTextures(int count, out uint texture)
    {
        Load<GenerateObjects>("glGenTextures")(count, out texture);
    }
    static void glDeleteTextures(int count, ref uint texture)
    {
        Load<DeleteObjects>("glDeleteTextures")(count, ref texture);
    }
    static void glBindTexture(uint target, uint texture)
    {
        Load<GlBindTexture>("glBindTexture")(target, texture);
    }
    static void glTexParameteri(uint target, uint key, int value)
    {
        Load<GlTexParameter>("glTexParameteri")(target, key, value);
    }
    static void glTexImage2D(uint target, int level, int format, int width, int height, int border, uint pixelFormat, uint type, IntPtr data)
    {
        Load<GlTexImage>("glTexImage2D")(target, level, format, width, height, border, pixelFormat, type, data);
    }
    static void glReadPixels(int x, int y, int width, int height, uint format, uint type, IntPtr data)
    {
        Load<GlReadPixels>("glReadPixels")(x, y, width, height, format, type, data);
    }
}
