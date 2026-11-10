using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

internal static class Desktop
{
    [StructLayout(LayoutKind.Sequential)] internal struct Bounds { internal int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] private struct MouseInput
    {
        internal int X, Y;
        internal uint Data, Flags, Time;
        internal IntPtr Extra;
    }
    [StructLayout(LayoutKind.Explicit)] private struct InputUnion
    {
        [FieldOffset(0)] internal MouseInput Mouse;
    }
    [StructLayout(LayoutKind.Sequential)] private struct Input
    {
        internal uint Type;
        internal InputUnion Value;
    }
    [DllImport("user32.dll")] internal static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] internal static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] internal static extern bool IsZoomed(IntPtr window);
    [DllImport("user32.dll")] internal static extern bool SetForegroundWindow(IntPtr window);
    [DllImport("user32.dll")] internal static extern bool GetWindowRect(IntPtr window, out Bounds bounds);
    [DllImport("user32.dll")] private static extern IntPtr WindowFromPoint(Point point);
    [DllImport("user32.dll")] private static extern IntPtr GetAncestor(IntPtr window, uint flags);
    [DllImport("user32.dll")] internal static extern short GetAsyncKeyState(int key);
    [DllImport("user32.dll")] internal static extern uint GetDoubleClickTime();
    [DllImport("user32.dll")] private static extern uint SendInput(uint count, Input[] inputs, int size);
    [DllImport("user32.dll")] private static extern int GetSystemMetrics(int index);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
    [DllImport("user32.dll")] internal static extern bool RegisterHotKey(IntPtr window, int id, uint modifiers, uint key);
    [DllImport("user32.dll")] internal static extern bool UnregisterHotKey(IntPtr window, int id);

    internal static IntPtr FindFilmora()
    {
        IntPtr result = IntPtr.Zero;
        foreach (Process process in Process.GetProcesses())
        {
            using (process)
            {
                if (!String.Equals(process.ProcessName, "Wondershare Filmora", StringComparison.OrdinalIgnoreCase)
                    && !String.Equals(process.ProcessName, "Filmora", StringComparison.OrdinalIgnoreCase)) continue;
                IntPtr main = process.MainWindowHandle;
                if (main == IntPtr.Zero) continue;
                IntPtr owner = GetAncestor(main, 3);
                if (owner != IntPtr.Zero) main = owner;
                if (result != IntPtr.Zero) throw new InvalidOperationException("Keep one Filmora editor window open.");
                result = main;
            }
        }
        if (result == IntPtr.Zero) throw new InvalidOperationException("Open the Filmora editor first.");
        return result;
    }

    internal static Rectangle RectangleOf(IntPtr window)
    {
        Bounds bounds;
        if (!GetWindowRect(window, out bounds)) throw new InvalidOperationException("Filmora window is unavailable.");
        return Rectangle.FromLTRB(bounds.Left, bounds.Top, bounds.Right, bounds.Bottom);
    }

    internal static bool OwnsPoint(IntPtr window, Point point)
    {
        return GetForegroundWindow() == window && GetAncestor(WindowFromPoint(point), 2) == window;
    }

    internal static Bitmap Capture(Rectangle area)
    {
        var bitmap = new Bitmap(area.Width, area.Height, PixelFormat.Format32bppArgb);
        using (Graphics graphics = Graphics.FromImage(bitmap))
            graphics.CopyFromScreen(area.Location, Point.Empty, area.Size);
        return bitmap;
    }

    internal static void Click(IntPtr window, Point point)
    {
        if (!OwnsPoint(window, point)) throw new InvalidOperationException("Paused: another window covers Filmora.");
        SendAt(point, new[] { Mouse(2, 0), Mouse(4, 0) });
    }

    internal static void Hover(IntPtr window, Point point)
    {
        if (!OwnsPoint(window, point)) throw new InvalidOperationException("Paused: another window covers Filmora.");
        SendAt(point, new Input[0]);
    }

    internal static void Scroll(IntPtr window, Point point)
    {
        if (!OwnsPoint(window, point)) throw new InvalidOperationException("Paused: another window covers Filmora.");
        SendAt(point, new[] { Mouse(0x0800, unchecked((uint)-240)) });
    }

    internal static void RightClick(IntPtr window, Point point)
    {
        if (!OwnsPoint(window, point)) throw new InvalidOperationException("Paused: another window covers Filmora.");
        SendAt(point, new[] { Mouse(8, 0), Mouse(16, 0) });
    }

    internal static void ClickOwnedMenu(IntPtr window, Point point)
    {
        uint expected, foreground, target;
        GetWindowThreadProcessId(window, out expected);
        GetWindowThreadProcessId(GetForegroundWindow(), out foreground);
        GetWindowThreadProcessId(WindowFromPoint(point), out target);
        if (expected == 0 || foreground != expected || target != expected)
            throw new InvalidOperationException("The Filmora menu is not in front.");
        SendAt(point, new[] { Mouse(2, 0), Mouse(4, 0) });
    }

    internal static int ProcessIdOf(IntPtr window)
    {
        uint process;
        GetWindowThreadProcessId(window, out process);
        return (int)process;
    }

    private static Input Mouse(uint flags, uint data)
    {
        return new Input { Type = 0, Value = new InputUnion { Mouse = new MouseInput { Flags = flags, Data = data } } };
    }

    private static void SendAt(Point point, Input[] actions)
    {
        int left = GetSystemMetrics(76), top = GetSystemMetrics(77);
        int width = GetSystemMetrics(78), height = GetSystemMetrics(79);
        if (width < 2 || height < 2 || !new Rectangle(left, top, width, height).Contains(point))
            throw new InvalidOperationException("The target is outside the Windows desktop.");
        var inputs = new Input[actions.Length + 1];
        inputs[0] = Mouse(0xC001, 0); // Move on the virtual desktop, then act in one input batch.
        inputs[0].Value.Mouse.X = (int)Math.Round((point.X - left) * 65535.0 / (width - 1));
        inputs[0].Value.Mouse.Y = (int)Math.Round((point.Y - top) * 65535.0 / (height - 1));
        Array.Copy(actions, 0, inputs, 1, actions.Length);
        if (SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(Input))) != inputs.Length)
            throw new InvalidOperationException("Windows did not accept the mouse input.");
    }

}
