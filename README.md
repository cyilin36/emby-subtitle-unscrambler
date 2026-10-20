# Emby Subtitle Unscrambler

**Emby 字幕乱码修复器**

## 用途

用于修复部分 Windows Emby Server 环境中，UTF-8 中文 SRT 字幕在 Emby Web
播放器内显示为乱码的问题。

插件通过调整 Web 播放器的字幕请求与转换流程完成修复，不修改视频文件、原始字幕
或视频内嵌字体。

## 安装

1. 下载
   [`Emby.SubtitleUnscrambler.dll`](https://github.com/cyilin36/emby-subtitle-unscrambler/releases/latest/download/Emby.SubtitleUnscrambler.dll)。
2. 完全停止 Emby Server。
3. 将 DLL 放入 Emby 的 `plugins` 目录。默认位置为
   `%APPDATA%\Emby-Server\programdata\plugins`；使用自定义数据目录时，请放入
   对应目录下的 `plugins` 文件夹。
4. 启动 Emby Server。
5. 使用浏览器打开 Emby Web，并按 `Ctrl+F5` 强制刷新。

Emby Server 升级后，建议重启一次服务，以便重新应用 Web 端补丁。

## 适用范围

- 已在 Windows Emby Server `4.10.1.0` 环境中测试。
- 适用于 Web 播放器直接读取 SRT 字幕轨的场景。
- 不支持 ASS/SSA、PGS/VobSub、HLS 转码字幕及已烧录至视频画面的字幕。

## 许可证

[MIT License](LICENSE)
