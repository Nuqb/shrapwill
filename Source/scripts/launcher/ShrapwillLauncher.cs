using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Windows.Forms;

internal static class ShrapwillLauncher
{
    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            string directory = AppDomain.CurrentDomain.BaseDirectory;
            string filename = File.ReadAllText(Path.Combine(directory, "current-release.txt")).Trim();
            if (filename != Path.GetFileName(filename) ||
                !filename.StartsWith("shrapwill-", StringComparison.OrdinalIgnoreCase) ||
                !filename.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                throw new InvalidDataException("The current release reference is invalid.");
            string executable = Path.Combine(directory, filename);
            if (!File.Exists(executable))
                throw new FileNotFoundException("The current Shrapwill build is missing.", executable);
            Process.Start(new ProcessStartInfo(executable, Arguments(args))
            {
                WorkingDirectory = directory,
                UseShellExecute = false
            });
            return 0;
        }
        catch (Exception error)
        {
            MessageBox.Show("Shrapwill could not open the current build.\n\n" + error.Message,
                "Shrapwill", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }

    private static string Arguments(string[] args)
    {
        var result = new StringBuilder();
        foreach (string argument in args)
        {
            if (result.Length > 0) result.Append(' ');
            result.Append('"');
            int slashes = 0;
            foreach (char character in argument)
            {
                if (character == '\\') { slashes++; continue; }
                result.Append('\\', character == '"' ? slashes * 2 + 1 : slashes);
                result.Append(character);
                slashes = 0;
            }
            result.Append('\\', slashes * 2);
            result.Append('"');
        }
        return result.ToString();
    }
}
