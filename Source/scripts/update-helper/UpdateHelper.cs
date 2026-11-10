using System;
using System.Diagnostics;
using System.IO;
using System.Security.Cryptography;
using System.Windows.Forms;

// Runs only after an explicit update/restart action in the editor. It never
// terminates a process: the owning editor must exit itself within one minute.
internal static class UpdateHelper
{
    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            if (args.Length != 5 || (args[0] != "installer" && args[0] != "restart"))
                throw new InvalidDataException("Invalid update handoff.");
            int pid = Int32.Parse(args[1]);
            string application = Path.GetFullPath(args[2]);
            string hash = args[3];
            string installDirectory = Path.GetFullPath(args[4]);
            if (hash.Length != 64 || !File.Exists(application)) throw new InvalidDataException("The update file is missing.");
            Process owner = null;
            try { owner = Process.GetProcessById(pid); } catch (ArgumentException) { }
            if (owner != null)
                using (owner) { if (!owner.WaitForExit(60000)) return 2; }
            using (var sha = SHA256.Create())
            using (var input = File.OpenRead(application))
            {
                string actual = BitConverter.ToString(sha.ComputeHash(input)).Replace("-", "");
                if (!actual.Equals(hash, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException("The update changed after verification. Shrapwill was not updated.");
            }
            var start = new ProcessStartInfo(application)
            {
                WorkingDirectory = installDirectory,
                UseShellExecute = false
            };
            // NSIS requires /D last, without surrounding quotes; this is passed
            // directly to the installer, never through cmd.exe or another shell.
            if (args[0] == "installer") start.Arguments = "/UPDATE /P /R /D=" + installDirectory;
            Process.Start(start);
            return 0;
        }
        catch (Exception error)
        {
            MessageBox.Show("The update could not finish. Your saved projects are unchanged.\n\n" + error.Message,
                "Shrapwill update", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
