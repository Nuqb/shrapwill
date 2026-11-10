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
            string executable = ResolveRelease(directory, filename);
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

    private static string ResolveRelease(string directory, string reference)
    {
        string[] parts = reference.Replace('\\', '/').Split('/');
        bool flat = parts.Length == 1 && parts[0].StartsWith("shrapwill-", StringComparison.OrdinalIgnoreCase)
            && parts[0].EndsWith(".exe", StringComparison.OrdinalIgnoreCase);
        bool versioned = parts.Length == 3 && parts[0] == "releases" &&
            parts[1].StartsWith("shrapwill-", StringComparison.OrdinalIgnoreCase) && parts[2] == "shrapwill.exe";
        foreach (string part in parts)
        {
            if (part.Length == 0 || part == "." || part == ".." || part.EndsWith(".") || part.EndsWith(" "))
                throw new InvalidDataException("The current release reference is invalid.");
            foreach (char c in part)
                if (!Char.IsLetterOrDigit(c) && c != '-' && c != '_' && c != '.')
                    throw new InvalidDataException("The current release reference is invalid.");
        }
        if (!flat && !versioned) throw new InvalidDataException("The current release reference is invalid.");
        string root = Path.GetFullPath(directory).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        string executable = Path.GetFullPath(Path.Combine(directory, reference.Replace('/', Path.DirectorySeparatorChar)));
        if (!executable.StartsWith(root, StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("The current release is outside the application folder.");
        return executable;
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
