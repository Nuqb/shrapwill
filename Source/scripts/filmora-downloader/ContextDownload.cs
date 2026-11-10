using System;
using System.Drawing;
using System.Threading;
using System.Windows.Automation;

internal static class ContextDownload
{
    internal static void ValidateResultsArea(IntPtr editor, Rectangle area)
    {
        AutomationElement table = AutomationElement.FromHandle(editor).FindFirst(TreeScope.Descendants,
            new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Table));
        if (table == null) throw new InvalidOperationException("No asset list found. Restore Filmora's List View.");
        var bounds = table.Current.BoundingRectangle;
        if (!bounds.Contains(new System.Windows.Rect(area.Left, area.Top, area.Width, area.Height)))
            throw new InvalidOperationException("The results area no longer fits the library panel. Recalibrate before continuing.");
    }

    internal static bool Queue(IntPtr editor, Point row, Point dismiss, Func<bool> active)
    {
        CheckActive(active);
        Desktop.RightClick(editor, row);
        int process = Desktop.ProcessIdOf(editor);
        AutomationElement command = WaitForCommand(process, active);
        if (command == null) throw new InvalidOperationException("No explicit Download Now command found. Stopped without applying the asset.");
        if (!command.Cached.IsEnabled)
        {
            CheckActive(active);
            Desktop.ClickOwnedMenu(editor, dismiss);
            return false;
        }
        bool requested = ClickCommand(editor, command, process, active);
        if (!requested) { CheckActive(active); Desktop.ClickOwnedMenu(editor, dismiss); }
        return requested;
    }

    private static AutomationElement WaitForCommand(int process, Func<bool> active)
    {
        for (int attempt = 0; attempt < 5; attempt++)
        {
            CheckActive(active);
            AutomationElement command = FindCommand(process);
            if (command != null) return command;
            Thread.Sleep(20);
        }
        return null;
    }

    private static AutomationElement FindCommand(int process)
    {
        using (var cache = MenuCache().Activate()) return FindCachedCommand(process);
    }

    private static AutomationElement FindCachedCommand(int process)
    {
        var windows = AutomationElement.RootElement.FindAll(TreeScope.Children,
            new PropertyCondition(AutomationElement.ProcessIdProperty, process));
        var condition = new AndCondition(
            new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.MenuItem),
            new PropertyCondition(AutomationElement.NameProperty, "Download Now"));
        foreach (AutomationElement window in windows)
        {
            AutomationElement command = window.FindFirst(TreeScope.Descendants, condition);
            if (command != null && !command.Cached.IsOffscreen) return command;
        }
        return null;
    }

    private static bool ClickCommand(IntPtr editor, AutomationElement command, int process, Func<bool> active)
    {
        var bounds = command.Cached.BoundingRectangle;
        var point = new System.Windows.Point(bounds.Left + bounds.Width / 2, bounds.Top + bounds.Height / 2);
        AutomationElement target;
        using (var cache = MenuCache().Activate()) target = AutomationElement.FromPoint(point);
        if (target.Cached.Name != "Download Now" || target.Cached.ProcessId != process
            || target.Cached.ControlType != ControlType.MenuItem)
            throw new InvalidOperationException("The download menu changed. Stopped without applying the asset.");
        if (!target.Cached.IsEnabled) return false;
        CheckActive(active);
        Desktop.ClickOwnedMenu(editor, new Point((int)point.X, (int)point.Y));
        return true;
    }

    private static void CheckActive(Func<bool> active)
    {
        if (!active() || (Desktop.GetAsyncKeyState(0x1B) & 0x8000) != 0)
            throw new OperationCanceledException("Stopped or paused.");
    }

    private static CacheRequest MenuCache()
    {
        var request = new CacheRequest();
        foreach (var property in new[] { AutomationElement.NameProperty, AutomationElement.ProcessIdProperty,
            AutomationElement.ControlTypeProperty, AutomationElement.IsEnabledProperty,
            AutomationElement.IsOffscreenProperty, AutomationElement.BoundingRectangleProperty }) request.Add(property);
        return request;
    }
}
