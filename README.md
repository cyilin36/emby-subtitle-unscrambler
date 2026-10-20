# Emby Subtitle Unscrambler

**Emby 字幕乱码修复器**

An Emby Server plugin that repairs Chinese UTF-8 SRT subtitles that appear as
mojibake in the Emby Web player on affected Windows servers.

## The Problem

In some Emby Web sessions, an SRT subtitle can look like this:

```text
鍜︼紵浠栦笉瑙佷簡
```

instead of:

```text
咦？他不见了
```

On the affected setup, Emby Web requests `Stream.vtt`, and the server-generated
WebVTT response loses the correct character encoding. The browser then
misinterprets the UTF-8 Chinese text as a legacy ANSI code page. Mobile Safari
may avoid the issue because its subtitle request path or response handling can
differ.

This is a subtitle-conversion/encoding problem, not an Edge font problem.

## What This Plugin Does

The plugin adds a small JavaScript module to the Emby Web client:

1. It detects subtitle requests ending in `Stream.vtt`.
2. It requests the corresponding original `Stream.srt` track instead.
3. It decodes UTF-8, UTF-16LE, and UTF-16BE subtitles.
4. It converts SRT cues to valid UTF-8 WebVTT in the browser.
5. If conversion is not possible, it falls back to the original request.

It does **not** modify media files, subtitle files, transcoding settings, ASS/SSA
subtitles, or fonts embedded in a video.

## Compatibility

- Tested with Emby Server `4.10.1.0` on Windows.
- Tested in Microsoft Edge `155` after a hard refresh.
- The same Emby account/subtitle played normally on iOS Safari.
- Target framework: `.NET Standard 2.0`.

Other Emby 4.x versions may work, but have not been verified. Please open an
issue with the Emby version, server OS, client, and browser if you test another
combination.

## Installation

1. Download
   [`Emby.SubtitleUnscrambler.dll`](https://github.com/cyilin36/emby-subtitle-unscrambler/releases/latest/download/Emby.SubtitleUnscrambler.dll)
   from Releases.
2. Stop Emby Server completely.
3. Open the Emby `plugins` directory. With the default Windows data directory,
   this is `%APPDATA%\Emby-Server\programdata\plugins`. If you use a custom data
   directory, use its `plugins` folder instead.
4. Copy `Emby.SubtitleUnscrambler.dll` into that directory.
5. Start Emby Server.
6. Refresh the Emby Web page with `Ctrl+F5`.

## What It Fixes

- Web-player subtitle tracks delivered from SRT as `Stream.vtt`.
- Chinese UTF-8 SRT text corrupted by the Windows/Emby conversion path.
- UTF-16 SRT files with a byte-order mark.
- Basic SRT position tags such as `{\an8}`, which are removed from the output.

## Limitations

- It only handles the SRT-to-WebVTT web-player path.
- It does not repair ASS/SSA, VobSub, PGS, or burned-in subtitles.
- It does not change fonts or styling attached to media files.
- It does not repair HLS/transcoded subtitles already burned into the video.
- It does not guess legacy ANSI/GBK encodings without a BOM; the SRT source must
  be UTF-8 or UTF-16 with a BOM.
- Native Emby apps and other clients are outside the scope of this web-client
  workaround.

This plugin is a client-side workaround for an Emby Web conversion issue. It is
not a fix to Emby Server's subtitle encoder.

## After an Emby Upgrade

An Emby Server upgrade may replace the `dashboard-ui` directory and remove the
injected script tag. Restart Emby once after the upgrade so the plugin can apply
the web patch again, then hard-refresh the browser.

## Uninstall

1. Stop Emby Server.
2. Delete `Emby.SubtitleUnscrambler.dll` from the plugins directory.
3. Optionally run `scripts/remove-web-patch.ps1 -DashboardUiPath <path>` to
   remove the script tag from `dashboard-ui\index.html`.
4. Start Emby Server.

Removing the DLL does not delete any media or subtitle files.

## Build and Test

Requirements:

- .NET SDK 8.0
- Node.js 18 or later

```powershell
dotnet restore .\src\Emby.SubtitleUnscrambler\Emby.SubtitleUnscrambler.csproj
dotnet build .\src\Emby.SubtitleUnscrambler\Emby.SubtitleUnscrambler.csproj -c Release
node .\tests\subtitle-unscrambler.test.js
```

The compiled plugin is written to:

```text
src\Emby.SubtitleUnscrambler\bin\Release\netstandard2.0\Emby.SubtitleUnscrambler.dll
```

Create a release ZIP on Windows:

```powershell
.\scripts\package.ps1
```

## Publishing a Release

Binary files are intentionally not committed to the source repository. The
release workflow builds and attaches them automatically when a version tag is
pushed.

1. Update the version fields in `Emby.SubtitleUnscrambler.csproj`,
   `AssemblyInfo.cs`, and `CHANGELOG.md`.
2. Commit the change.
3. Create and push a matching tag:

```powershell
git tag v1.0.1
git push origin main v1.0.1
```

The `release` workflow then runs the tests, builds the DLL, creates the ZIP, and
publishes both files to a GitHub Release. No manual binary upload is required.

## How It Works Internally

At Emby startup, the server-side entry point:

- Copies an embedded JavaScript module into `dashboard-ui\modules`.
- Backs up `dashboard-ui\index.html` once.
- Injects a versioned `<script>` tag before `</head>`.
- Replaces superseded module injection before writing the current version.

The browser module wraps `window.fetch`. Other requests pass through unchanged.
Subtitle SRT responses are cached in memory and returned as a `text/vtt`
`Response`.

## Troubleshooting

- **Still garbled:** confirm the plugin DLL is present, restart Emby, and
  hard-refresh the browser.
- **Plugin is not applied after an Emby update:** restart Emby to let the plugin
  patch the new web client.
- **Only some tracks fail:** check whether they are SRT, ASS/SSA, PGS/VobSub, or
  HLS/transcoded subtitles. The plugin only targets direct SRT web tracks.
- **Everything is worse:** stop Emby, remove the DLL, and restart. No media files
  are changed by this plugin.

## 中文快速说明

这是 Emby 服务器插件，用于修复部分 Windows Emby 服务器在把 UTF-8 中文 SRT
字幕转换成 WebVTT 时产生的乱码。它只修改 Emby Web 客户端的字幕请求，不会修改
视频、原始字幕、ASS/SSA 字幕或视频内嵌字体。

安装方法：

1. 停止 Emby。
2. 将 `Emby.SubtitleUnscrambler.dll` 放入 Emby 的 `plugins` 目录。
3. 启动 Emby，然后在浏览器按 `Ctrl+F5` 强制刷新。

目前的适用范围是 Emby Web 中直接把 SRT 字幕作为字幕轨读取的情况。它不能修复
ASS/SSA、PGS/VobSub、已经烧录到视频里的字幕，也不能替代 Emby 后端编码器修复。

## License

MIT. See [LICENSE](LICENSE).
