using System;
using System.Drawing;
using System.Collections.Generic;
using System.IO;
using System.Windows.Forms;
using System.Xml.Serialization;

public sealed class DownloadSettings
{
    public Rectangle Window;
    public Rectangle Area;
    public Rectangle Icon;
    public Rectangle Timeline;
}

internal sealed class DownloaderForm : Form
{
    private readonly Label status = new Label();
    private readonly Timer timer = new Timer();
    private readonly NumericUpDown delay = new NumericUpDown();
    private readonly CheckBox menuMode = new CheckBox();
    private readonly string folder = AppDomain.CurrentDomain.BaseDirectory;
    private DownloadSettings settings;
    private IconMatcher matcher;
    private IntPtr filmora;
    private bool running;
    private bool processing;
    private int queued, scrolls, still;
    private long previousHash;
    private HeadingGuard headingGuard;
    private FocusGate focusGate = new FocusGate();
    private DateTime nextAction;
    private readonly ClickCadence cadence = new ClickCadence(Math.Max(700, (int)Desktop.GetDoubleClickTime() + 100));
    private DateTime runStarted;
    private DateTime nextDiagnostic;
    private long? timelineFingerprint;
    private bool areaValidated;
    private int testLimit;
    private readonly RowHistory clickedRows = new RowHistory();

    internal DownloaderForm(int testLimit)
    {
        this.testLimit = testLimit;
        if (testLimit > 0) ShowInTaskbar = false;
        Text = "Filmora Fast Downloader";
        ClientSize = new Size(570, 260);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        var help = new Label { Left = 18, Top = 16, Width = 530, Height = 64,
            Text = "Use Filmora's List View. Calibrate once, then press F8 to start/pause.\nEsc stops immediately. Keep Filmora in front while downloading.\nThis processes the selected category; choose another category and press F8 again." };
        Controls.Add(help);
        AddButton("Calibrate icon + area", 18, Calibrate);
        AddButton("Start / pause (F8)", 210, delegate { Toggle(); });
        AddButton("Stop", 402, delegate { Pause("Stopped."); });
        Controls.Add(new Label { Left = 18, Top = 136, Width = 240, Text = "Minimum time between requests (ms):" });
        delay.SetBounds(280, 132, 90, 28);
        delay.Minimum = 80; delay.Maximum = 2000; delay.Value = 80;
        Controls.Add(delay);
        menuMode.SetBounds(18, 163, 530, 24);
        menuMode.Text = "Use explicit Download menu (slower)";
        Controls.Add(menuMode);
        status.SetBounds(18, 190, 530, 64);
        status.Text = "Calibrate a download arrow and the scrolling results area.";
        Controls.Add(status);
        timer.Interval = 35;
        timer.Tick += Tick;
        timer.Start();
        Shown += delegate { LoadSettings(); Desktop.RegisterHotKey(Handle, 1, 0x4000, 0x77); };
        FormClosed += delegate { timer.Stop(); Desktop.UnregisterHotKey(Handle, 1); Desktop.UnregisterHotKey(Handle, 2); };
    }

    private void AddButton(string text, int left, EventHandler action)
    {
        var button = new Button { Text = text, Left = left, Top = 92, Width = 168, Height = 30 };
        button.Click += action;
        Controls.Add(button);
    }

    private void LoadSettings()
    {
        try
        {
            using (var stream = File.OpenRead(Path.Combine(folder, "settings.xml")))
                settings = (DownloadSettings)new XmlSerializer(typeof(DownloadSettings)).Deserialize(stream);
            using (var icon = new Bitmap(Path.Combine(folder, "download-icon.png")))
            {
                CalibrationGuard.Validate(icon);
                matcher = new IconMatcher(icon);
            }
            status.Text = "Ready. Choose a Filmora category, then press F8. Esc stops.";
        }
        catch (Exception error) { settings = null; matcher = null; status.Text = error.Message; }
    }

    private Rectangle SelectArea(string instruction)
    {
        using (var selection = new Selection(Desktop.RectangleOf(filmora), instruction))
        {
            if (selection.ShowDialog() != DialogResult.OK) throw new OperationCanceledException();
            return selection.Selected;
        }
    }

    private void Calibrate(object sender, EventArgs args)
    {
        Pause("Calibrating...");
        try
        {
            filmora = Desktop.FindFilmora();
            Hide();
            Desktop.SetForegroundWindow(filmora);
            System.Threading.Thread.Sleep(250);
            Rectangle bounds = Desktop.RectangleOf(filmora);
            Rectangle icon = SelectArea("Drag a tight box around ONE unhovered download arrow (not a +). Include 1-2 pixels of background.");
            if (icon.Width > 40 || icon.Height > 40) throw new ArgumentException("The arrow selection must be smaller than 40 x 40 pixels.");
            Rectangle area = SelectArea("Drag around the scrolling RESULTS ONLY: below the column headings, above the timeline. Exclude sidebar and player.");
            Rectangle timeline = SelectArea("Drag around the timeline lanes to watch for unwanted additions. Exclude the preview and meters.");
            SaveCalibration(new DownloadSettings { Window = bounds, Icon = icon, Area = area, Timeline = timeline });
            LoadSettings();
        }
        catch (OperationCanceledException) { status.Text = "Calibration cancelled."; }
        catch (Exception error) { status.Text = error.Message; }
        finally { Show(); }
    }

    internal void SaveCalibration(DownloadSettings value)
    {
        if (!value.Area.Contains(value.Icon)) throw new ArgumentException("The arrow must be inside the results area.");
        if (value.Area.Width < 80 || value.Area.Height < 80) throw new ArgumentException("Select a larger results area.");
        if (!value.Timeline.IsEmpty && (!new Rectangle(Point.Empty, value.Window.Size).Contains(value.Timeline)
            || value.Timeline.IntersectsWith(value.Area))) throw new ArgumentException("The timeline watch area must be inside Filmora and separate from the results.");
        Rectangle absolute = value.Icon;
        absolute.Offset(value.Window.Location);
        using (Bitmap icon = Desktop.Capture(absolute))
        {
            CalibrationGuard.Validate(icon);
            new IconMatcher(icon); // Validate before replacing the saved calibration.
            icon.Save(Path.Combine(folder, "download-icon.png"));
        }
        using (var stream = File.Create(Path.Combine(folder, "settings.xml")))
            new XmlSerializer(typeof(DownloadSettings)).Serialize(stream, value);
    }

    private void Toggle()
    {
        if (running) { Pause("Paused. F8 resumes."); return; }
        try
        {
            if (matcher == null || settings == null) throw new InvalidOperationException("Calibrate first.");
            if (!menuMode.Checked && settings.Timeline.IsEmpty) throw new InvalidOperationException("Calibrate the timeline watch area before direct clicking.");
            filmora = Desktop.FindFilmora();
            Desktop.SetForegroundWindow(filmora);
            headingGuard = null;
            timelineFingerprint = null;
            areaValidated = false;
            if (!Desktop.RegisterHotKey(Handle, 2, 0x4000, 0x1B))
                throw new InvalidOperationException("Could not register the Esc stop key.");
            queued = 0; scrolls = 0; still = 0; previousHash = 0;
            clickedRows.Clear();
            nextAction = DateTime.UtcNow.AddMilliseconds(300);
            runStarted = DateTime.UtcNow;
            focusGate = new FocusGate();
            running = true;
            WriteRunningProgress();
        }
        catch (Exception error) { Pause(error.Message); }
    }

    private void Pause(string message)
    {
        running = false;
        Desktop.UnregisterHotKey(Handle, 2);
        status.Text = message + "\nQueued clicks: " + queued + "; scrolls: " + scrolls;
        if (runStarted != default(DateTime)) status.Text += "; elapsed: " + (DateTime.UtcNow - runStarted).TotalSeconds.ToString("0.0") + "s";
        File.WriteAllText(Path.Combine(folder, "progress.txt"), status.Text);
    }

    private void Tick(object sender, EventArgs args)
    {
        if (!running || processing) return;
        processing = true;
        try
        {
            WriteDiagnostic();
            if ((Desktop.GetAsyncKeyState(0x1B) & 0x8000) != 0) { Pause("Stopped with Esc."); return; }
            if (Desktop.RectangleOf(filmora) != settings.Window)
            {
                focusGate.Observe(false, DateTime.UtcNow);
                WriteWaitingProgress("Waiting: restore Filmora to its calibrated size and position. Esc stops.");
                return;
            }
            if (!FocusReady()) return;
            if (DateTime.UtcNow < nextAction) return;
            if (queued >= 5000 || scrolls >= 2000) { Pause("Category limit reached. Review the list before resuming."); return; }
            ProcessFrame();
        }
        catch (Exception error) { Pause(error.Message); }
        finally { processing = false; }
    }

    private void ProcessFrame()
    {
        if (!HeadingReady() || !TimelineUnchanged(false)) return;
        Rectangle area = settings.Area;
        area.Offset(settings.Window.Location);
        if (!areaValidated) { ContextDownload.ValidateResultsArea(filmora, area); areaValidated = true; }
        // Scan only the calibrated download column; names, stars and + buttons are excluded.
        int left = settings.Window.Left + settings.Icon.Left - 3;
        Rectangle strip = Rectangle.Intersect(area, new Rectangle(left, area.Top, settings.Icon.Width + 6, area.Height));
        using (Bitmap image = Desktop.Capture(strip))
        using (Bitmap names = Desktop.Capture(area))
        {
            var matches = matcher.Find(image);
            matches.RemoveAll(delegate(Point match) {
                Point row = new Point(match.X + strip.Left - area.Left, match.Y);
                return clickedRows.WasClicked(match.Y, IconMatcher.RowFingerprint(names, row));
            });
            if (matches.Count > 0)
            {
                Point point = matches[0];
                point.Offset(strip.Location);
                if (!cadence.CanClick(point, DateTime.UtcNow)) { nextAction = cadence.RetryAt; return; }
                if (!StillDownload(point)) return;
                bool requested = menuMode.Checked
                    ? ContextDownload.Queue(filmora, new Point(area.Left + 50, point.Y),
                        new Point(area.Left + area.Width / 2, area.Top - 58), delegate { return running; })
                    : DirectDownload(point);
                if (!running) return;
                Point row = new Point(matches[0].X + strip.Left - area.Left, matches[0].Y);
                clickedRows.Remember(matches[0].Y, IconMatcher.RowFingerprint(names, row));
                cadence.Record(point, DateTime.UtcNow);
                if (requested) queued++;
                nextAction = DateTime.UtcNow.AddMilliseconds((double)delay.Value);
                WriteRunningProgress();
                if (testLimit > 0 && queued >= testLimit) Pause("Test batch finished.");
                return;
            }
        }
        ScrollNext(area);
    }

    private bool StillDownload(Point point)
    {
        var patch = new Rectangle(point.X - settings.Icon.Width / 2 - 2, point.Y - settings.Icon.Height / 2 - 2,
            settings.Icon.Width + 4, settings.Icon.Height + 4);
        using (Bitmap image = Desktop.Capture(patch))
            foreach (Point found in matcher.Find(image))
                if (Math.Abs(found.X - patch.Width / 2) <= 2 && Math.Abs(found.Y - patch.Height / 2) <= 2) return true;
        return false;
    }

    private bool DirectDownload(Point point)
    {
        Desktop.Hover(filmora, point);
        System.Threading.Thread.Sleep(50);
        if (!running || (Desktop.GetAsyncKeyState(0x1B) & 0x8001) != 0)
            throw new OperationCanceledException("Stopped or paused.");
        if (!TimelineUnchanged(true) || !StillDownload(point)) return false;
        Desktop.Click(filmora, point);
        return true;
    }

    private bool TimelineUnchanged(bool initialize)
    {
        if (menuMode.Checked || (!timelineFingerprint.HasValue && !initialize)) return true;
        Rectangle area = settings.Timeline;
        area.Offset(settings.Window.Location);
        using (Bitmap image = Desktop.Capture(area))
        {
            long fingerprint = IconMatcher.Fingerprint(image);
            if (!timelineFingerprint.HasValue) timelineFingerprint = fingerprint;
            if (timelineFingerprint.Value == fingerprint) return true;
        }
        Pause("Stopped: the watched timeline changed. Review it before resuming; no Undo or save was performed.");
        return false;
    }

    private void ScrollNext(Rectangle area)
    {
        using (Bitmap image = Desktop.Capture(area))
        {
            long hash = IconMatcher.Fingerprint(image);
            still = hash == previousHash ? still + 1 : 0;
            previousHash = hash;
        }
        if (still >= 4) { Pause("List stopped changing. Category scan finished; review any failed downloads."); return; }
        Desktop.Scroll(filmora, new Point(area.Left + area.Width / 2, area.Top + area.Height / 2));
        clickedRows.Clear();
        scrolls++;
        WriteRunningProgress();
        nextAction = DateTime.UtcNow.AddMilliseconds(750);
    }

    private void WriteRunningProgress()
    {
        status.Text = "Running: " + queued + " download requests; " + scrolls + " scrolls. Esc stops.";
        File.WriteAllText(Path.Combine(folder, "progress.txt"), status.Text);
    }

    private Rectangle HeaderArea()
    {
        return new Rectangle(settings.Window.Left + settings.Area.Left + 5,
            settings.Window.Top + settings.Area.Top - 28, 50, 18);
    }

    private bool HeadingReady()
    {
        HeadingState state;
        using (Bitmap header = Desktop.Capture(HeaderArea()))
        {
            long fingerprint = IconMatcher.Fingerprint(header);
            if (headingGuard == null) headingGuard = new HeadingGuard(fingerprint);
            state = headingGuard.Observe(fingerprint, DateTime.UtcNow);
        }
        if (state == HeadingState.Ready) return true;
        if (state == HeadingState.Changed)
            Pause("Paused: the results heading changed. Restore the normal category list before resuming.");
        else nextAction = DateTime.UtcNow.AddMilliseconds(150);
        return false;
    }

    private bool FocusReady()
    {
        bool wasWaiting = focusGate.Waiting;
        if (focusGate.Observe(Desktop.GetForegroundWindow() == filmora, DateTime.UtcNow))
        {
            if (wasWaiting) WriteRunningProgress();
            return true;
        }
        WriteWaitingProgress("Waiting: Filmora is not in front. Resumes automatically after focus returns. Esc stops.");
        return false;
    }

    private void WriteWaitingProgress(string message)
    {
        string text = message + "\nDownload requests: " + queued + "; scrolls: " + scrolls;
        if (status.Text == text) return;
        status.Text = text;
        File.WriteAllText(Path.Combine(folder, "progress.txt"), status.Text);
    }

    private void WriteDiagnostic()
    {
        if (DateTime.UtcNow < nextDiagnostic) return;
        nextDiagnostic = DateTime.UtcNow.AddSeconds(1);
        IntPtr foreground = Desktop.GetForegroundWindow();
        string text = "Filmora=" + filmora + "; Foreground=" + foreground
            + "; FilmoraProcess=" + Desktop.ProcessIdOf(filmora) + "; ForegroundProcess=" + Desktop.ProcessIdOf(foreground)
            + "\nWindow=" + Desktop.RectangleOf(filmora) + "; Maximized=" + Desktop.IsZoomed(filmora)
            + "\nUpdated=" + DateTime.UtcNow.ToString("o");
        File.WriteAllText(Path.Combine(folder, "window-state.txt"), text);
    }

    protected override void WndProc(ref Message message)
    {
        if (message.Msg == 0x0312 && message.WParam.ToInt32() == 1) Toggle();
        if (message.Msg == 0x0312 && message.WParam.ToInt32() == 2) Pause("Stopped with Esc.");
        base.WndProc(ref message);
    }

    protected override bool ShowWithoutActivation { get { return testLimit > 0; } }

    internal void StartTest() { Hide(); LoadSettings(); Toggle(); }
}
