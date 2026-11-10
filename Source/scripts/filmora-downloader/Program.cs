using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        Desktop.SetProcessDPIAware();
        Application.EnableVisualStyles();
        try
        {
            if (args.Length > 0 && args[0] == "--self-test") { SelfTest(); return 0; }
            if (args.Length == 9 && args[0] == "--setup") { Setup(args); return 0; }
            if (args.Length > 0 && args[0] == "--scan") { Scan(); return 0; }
            if (args.Length > 0 && args[0] == "--geometry")
            {
                Rectangle bounds = Desktop.RectangleOf(Desktop.FindFilmora());
                File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "geometry.txt"), bounds.ToString());
                return 0;
            }
            int limit = args.Length == 2 && args[0] == "--test-batch" ? Int32.Parse(args[1]) : 0;
            using (var form = new DownloaderForm(limit))
            {
                if (limit > 0) form.Shown += delegate { form.StartTest(); };
                Application.Run(form);
            }
            return 0;
        }
        catch (Exception error)
        {
            File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "error.txt"), error.ToString());
            return 1;
        }
    }

    private static Rectangle ReadRectangle(string[] args, int start)
    {
        return new Rectangle(Int32.Parse(args[start]), Int32.Parse(args[start + 1]), Int32.Parse(args[start + 2]), Int32.Parse(args[start + 3]));
    }

    private static void Setup(string[] args)
    {
        IntPtr filmora = Desktop.FindFilmora();
        Desktop.SetForegroundWindow(filmora);
        System.Threading.Thread.Sleep(350);
        using (var form = new DownloaderForm(0))
            form.SaveCalibration(new DownloadSettings { Window = Desktop.RectangleOf(filmora), Area = ReadRectangle(args, 1), Icon = ReadRectangle(args, 5) });
    }

    private static void Scan()
    {
        string folder = AppDomain.CurrentDomain.BaseDirectory;
        DownloadSettings settings;
        using (var stream = File.OpenRead(Path.Combine(folder, "settings.xml")))
            settings = (DownloadSettings)new System.Xml.Serialization.XmlSerializer(typeof(DownloadSettings)).Deserialize(stream);
        if (Desktop.GetForegroundWindow() != Desktop.FindFilmora()) throw new InvalidOperationException("Filmora must be in front for the scan.");
        Rectangle area = settings.Area;
        area.Offset(settings.Window.Location);
        var results = new System.Collections.Generic.List<string>();
        using (var template = new Bitmap(Path.Combine(folder, "download-icon.png")))
        using (var image = Desktop.Capture(area))
        {
            foreach (Point point in new IconMatcher(template).Find(image))
                results.Add(point.X + "," + point.Y);
            using (Graphics graphics = Graphics.FromImage(image))
                foreach (string result in results)
                {
                    string[] xy = result.Split(',');
                    graphics.DrawEllipse(Pens.Red, Int32.Parse(xy[0]) - 9, Int32.Parse(xy[1]) - 9, 18, 18);
                }
            image.Save(Path.Combine(folder, "scan-preview.png"));
        }
        File.WriteAllLines(Path.Combine(folder, "scan-results.txt"), results.ToArray());
    }

    private static void SelfTest()
    {
        using (var stream = System.Reflection.Assembly.GetExecutingAssembly().GetManifestResourceStream("DownloadReference"))
        using (var reference = new Bitmap(stream)) CalibrationGuard.Validate(reference);
        using (var plus = Glyph(true))
        {
            bool rejected = false;
            try { CalibrationGuard.Validate(plus); } catch (ArgumentException) { rejected = true; }
            if (!rejected) throw new InvalidOperationException("Plus-button calibration was accepted.");
        }
        TestRowReflow();
        TestClickCadence();
        TestHeadingGuard();
        TestFocusGate();
        using (var template = Glyph(false))
        using (var plus = Glyph(true))
        using (var scene = new Bitmap(60, 70, System.Drawing.Imaging.PixelFormat.Format32bppArgb))
        {
            using (Graphics graphics = Graphics.FromImage(scene))
            {
                graphics.Clear(Color.FromArgb(31, 34, 37));
                graphics.DrawImageUnscaled(template, 20, 5);
                graphics.DrawImageUnscaled(plus, 20, 40);
            }
            var matches = new IconMatcher(template).Find(scene);
            if (matches.Count != 1 || Math.Abs(matches[0].X - 28) > 1 || Math.Abs(matches[0].Y - 13) > 1)
                throw new InvalidOperationException("Matcher failed download-versus-plus test.");
            using (Graphics graphics = Graphics.FromImage(scene)) graphics.Clear(Color.FromArgb(40, 40, 40));
            if (new IconMatcher(template).Find(scene).Count != 0) throw new InvalidOperationException("Blank background matched.");
            bool rejected = false;
            try { new IconMatcher(scene); } catch (ArgumentException) { rejected = true; }
            if (!rejected) throw new InvalidOperationException("Blank calibration was accepted.");
        }
        File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "self-test.txt"), "PASS: download icon, plus rejection, blank rejection, calibration validation, recommendation row reflow, nearby-click cooldown, heading loading guard, safe focus recovery.");
    }

    private static void TestFocusGate()
    {
        var gate = new FocusGate();
        DateTime now = DateTime.UtcNow;
        if (!gate.Observe(true, now) || gate.Observe(false, now) || gate.Observe(true, now.AddMilliseconds(400)))
            throw new InvalidOperationException("Input was allowed before focus stabilized.");
        if (!gate.Observe(true, now.AddMilliseconds(600)))
            throw new InvalidOperationException("Focus recovery failed.");
        if (gate.Observe(false, now.AddMilliseconds(700)) || gate.Observe(false, now.AddMilliseconds(1000))
            || gate.Observe(true, now.AddMilliseconds(1500)) || !gate.Observe(true, now.AddMilliseconds(1600)))
            throw new InvalidOperationException("Repeated focus loss did not extend the safe waiting period.");
    }

    private static void TestHeadingGuard()
    {
        DateTime now = DateTime.UtcNow;
        var guard = new HeadingGuard(42);
        if (guard.Observe(42, now) != HeadingState.Ready || guard.Observe(99, now) != HeadingState.Waiting)
            throw new InvalidOperationException("Heading guard did not wait without allowing input.");
        if (guard.Observe(42, now.AddMilliseconds(300)) != HeadingState.Ready)
            throw new InvalidOperationException("Heading guard did not recover after a brief load.");
        if (guard.Observe(99, now.AddMilliseconds(500)) != HeadingState.Waiting
            || guard.Observe(99, now.AddMilliseconds(1900)) != HeadingState.Waiting
            || guard.Observe(99, now.AddMilliseconds(2000)) != HeadingState.Changed)
            throw new InvalidOperationException("Heading guard accepted a lasting layout change.");
    }

    private static void TestClickCadence()
    {
        var cadence = new ClickCadence(900);
        DateTime now = DateTime.UtcNow;
        var first = new Point(445, 600);
        if (!cadence.CanClick(first, now)) throw new InvalidOperationException("First click was blocked.");
        cadence.Record(first, now);
        if (cadence.CanClick(new Point(444, 601), now.AddMilliseconds(140)))
            throw new InvalidOperationException("A jittered repeat could become a double-click.");
        if (!cadence.CanClick(new Point(445, 644), now.AddMilliseconds(140)))
            throw new InvalidOperationException("A separate row was delayed unnecessarily.");
        if (!cadence.CanClick(first, now.AddMilliseconds(900)))
            throw new InvalidOperationException("Cooldown did not expire.");
    }

    private static void TestRowReflow()
    {
        var history = new RowHistory();
        history.Remember(100, 42);
        if (!history.WasClicked(102, 42)) throw new InvalidOperationException("Clicked row was not recognized.");
        if (history.WasClicked(100, 99)) throw new InvalidOperationException("New item at an old row was skipped.");
        if (history.WasClicked(144, 42)) throw new InvalidOperationException("Moved item was blocked at its new position.");
        history.Clear();
        if (history.WasClicked(100, 42)) throw new InvalidOperationException("Scroll did not reset row history.");
        using (var row = new Bitmap(100, 40, System.Drawing.Imaging.PixelFormat.Format32bppArgb))
        {
            DrawRow(row, 24, 14);
            long first = IconMatcher.RowFingerprint(row, new Point(80, 20));
            DrawRow(row, 40, 14);
            if (first != IconMatcher.RowFingerprint(row, new Point(80, 20)))
                throw new InvalidOperationException("Selection highlight changed the row identity.");
            DrawRow(row, 40, 18);
            if (first == IconMatcher.RowFingerprint(row, new Point(80, 20)))
                throw new InvalidOperationException("Different row content reused the old identity.");
        }
    }

    private static void DrawRow(Bitmap row, int background, int textY)
    {
        using (Graphics graphics = Graphics.FromImage(row))
        {
            graphics.Clear(Color.FromArgb(background, background, background));
            graphics.DrawLine(Pens.White, 5, textY, 35, textY);
        }
    }

    private static Bitmap Glyph(bool plus)
    {
        var bitmap = new Bitmap(17, 17, System.Drawing.Imaging.PixelFormat.Format32bppArgb);
        using (Graphics graphics = Graphics.FromImage(bitmap))
        using (var pen = new Pen(Color.Silver))
        {
            graphics.Clear(Color.FromArgb(31, 34, 37));
            graphics.DrawLine(pen, 8, 3, 8, 11);
            if (plus) { graphics.DrawLine(pen, 3, 8, 13, 8); graphics.DrawEllipse(pen, 1, 1, 14, 14); }
            else { graphics.DrawLines(pen, new[] { new Point(4, 8), new Point(8, 12), new Point(12, 8) }); graphics.DrawLines(pen, new[] { new Point(3, 12), new Point(3, 14), new Point(13, 14), new Point(13, 12) }); }
        }
        return bitmap;
    }
}
