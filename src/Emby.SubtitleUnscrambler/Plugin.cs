using System;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Serialization;

namespace Emby.SubtitleUnscrambler
{
    public class Plugin : BasePlugin<PluginConfiguration>
    {
        private static readonly Guid PluginId =
            new Guid("17fb37c3-da7e-4af4-a496-22c6f8ae2c9d");

        public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
            : base(applicationPaths, xmlSerializer)
        {
            Instance = this;
        }

        public static Plugin Instance { get; private set; }

        public override Guid Id => PluginId;

        public override string Name => "Subtitle Unscrambler";

        public override string Description =>
            "Repairs scrambled SRT subtitles in Emby Web without changing media files or fonts.";
    }
}
