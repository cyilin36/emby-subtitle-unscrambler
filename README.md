# Emby Subtitle Unscrambler

## 用途

修复 Emby Web 播放器中 UTF-8 中文 SRT 字幕乱码的问题。插件不会修改视频、字幕文件或字体。

## 安装

1. 下载
   [`Emby.SubtitleUnscrambler.dll`](https://github.com/cyilin36/emby-subtitle-unscrambler/releases/latest/download/Emby.SubtitleUnscrambler.dll)。
2. 完全停止 Emby Server。
3. 将 DLL 放入 Emby 的 `plugins` 目录。默认位置为
   `%APPDATA%\Emby-Server\programdata\plugins`；使用自定义数据目录时，请放入
   对应目录下的 `plugins` 文件夹。
4. 启动 Emby Server。
5. 使用浏览器打开 Emby Web，并按 `Ctrl+F5` 强制刷新。
