using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using MediaBrowser.Model.Logging;

namespace Emby.SubtitleUnscrambler
{
    public class SubtitleUnscramblerEntryPoint : IServerEntryPoint
    {
        private const string ModuleBaseName = "emby-subtitle-unscrambler";
        private const string LegacyModuleBaseName = "emby-chinese-subtitle-fixer";
        private const string LegacyModuleFileName = LegacyModuleBaseName + ".js";
        private const string LegacyAppInjection =
            "list.push(\"./modules/" + LegacyModuleFileName + "\"),";
        private const string InjectionSearch = "Promise.all(list.map(loadPlugin))";
        private const string BackupSuffix = ".emby-subtitle-unscrambler.bak";
        private static readonly Regex ExistingModuleTagPattern = new Regex(
            "<script\\s+src=[\"']modules/(?:emby-chinese-subtitle-fixer|emby-subtitle-unscrambler)[^\"']*[\"'][^>]*>\\s*</script>\\s*",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

        private readonly string _dashboardPath;
        private readonly string _moduleFileName;
        private readonly ILogger _logger;

        public SubtitleUnscramblerEntryPoint(
            IServerApplicationPaths applicationPaths,
            ILogManager logManager)
        {
            _dashboardPath = Path.Combine(
                applicationPaths.ApplicationResourcesPath,
                "dashboard-ui");
            _moduleFileName =
                ModuleBaseName + "-" +
                typeof(SubtitleUnscramblerEntryPoint).Assembly.GetName().Version.ToString(3) +
                ".js";
            _logger = logManager.GetLogger("SubtitleUnscrambler");
        }

        public void Run()
        {
            try
            {
                InstallClientModule();
                PatchIndexHtml();
                RemoveLegacyWebAppPatch();
            }
            catch (Exception ex)
            {
                _logger.ErrorException(
                    "Could not install Emby Subtitle Unscrambler.",
                    ex);
            }
        }

        private void InstallClientModule()
        {
            var modulesPath = Path.Combine(_dashboardPath, "modules");
            Directory.CreateDirectory(modulesPath);

            var destination = Path.Combine(modulesPath, _moduleFileName);
            var assembly = typeof(SubtitleUnscramblerEntryPoint).Assembly;
            var resourceName =
                typeof(SubtitleUnscramblerEntryPoint).Namespace +
                ".subtitle-unscrambler.js";

            using (var source = assembly.GetManifestResourceStream(resourceName))
            {
                if (source == null)
                {
                    throw new InvalidOperationException(
                        "The embedded subtitle unscrambler script was not found.");
                }

                using (var target = new FileStream(
                    destination,
                    FileMode.Create,
                    FileAccess.Write,
                    FileShare.Read))
                {
                    source.CopyTo(target);
                }
            }

            _logger.Info("Installed " + destination);
        }

        private void PatchIndexHtml()
        {
            var indexPath = Path.Combine(_dashboardPath, "index.html");
            if (!File.Exists(indexPath))
            {
                throw new FileNotFoundException(
                    "Emby web index.html was not found.",
                    indexPath);
            }

            var content = File.ReadAllText(indexPath);
            var withoutOldTags = ExistingModuleTagPattern.Replace(
                content,
                string.Empty);
            var index = withoutOldTags.IndexOf(
                "</head>",
                StringComparison.OrdinalIgnoreCase);
            if (index < 0)
            {
                // Emby 4.10 does not always emit a closing head tag.
                index = withoutOldTags.IndexOf(
                    "<body",
                    StringComparison.OrdinalIgnoreCase);
            }

            if (index < 0)
            {
                throw new InvalidOperationException(
                    "Could not find </head> or <body in Emby web index.html. " +
                    "Subtitle Unscrambler was not injected.");
            }

            var backupPath = indexPath + BackupSuffix;
            if (!File.Exists(backupPath))
            {
                File.Copy(indexPath, backupPath, false);
            }

            var scriptTag =
                "<script src=\"modules/" + _moduleFileName +
                "?v=" + typeof(SubtitleUnscramblerEntryPoint).Assembly.GetName().Version +
                "\"></script>\r\n";
            var patched = withoutOldTags.Insert(index, scriptTag);
            if (patched == content)
            {
                _logger.Info(
                    "Emby web index.html already contains Subtitle Unscrambler.");
                return;
            }

            File.WriteAllText(indexPath, patched, new UTF8Encoding(false));
            _logger.Info("Patched Emby web index.html with Subtitle Unscrambler.");
        }

        private void RemoveLegacyWebAppPatch()
        {
            var appJsPath = Path.Combine(_dashboardPath, "app.js");
            if (!File.Exists(appJsPath))
            {
                return;
            }

            var content = File.ReadAllText(appJsPath);
            if (content.IndexOf(LegacyAppInjection, StringComparison.Ordinal) < 0)
            {
                return;
            }

            var patched = content.Replace(LegacyAppInjection, string.Empty);
            if (patched.IndexOf(InjectionSearch, StringComparison.Ordinal) < 0)
            {
                throw new InvalidOperationException(
                    "Could not safely remove the legacy app.js injection.");
            }

            File.WriteAllText(appJsPath, patched, new UTF8Encoding(false));
            _logger.Info("Removed the legacy app.js injection.");
        }

        public void Dispose()
        {
        }
    }
}
