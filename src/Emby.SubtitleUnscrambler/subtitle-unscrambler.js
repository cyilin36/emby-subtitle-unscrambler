(function () {
  "use strict";

  if (window.__embySubtitleUnscramblerInstalled) {
    return;
  }
  window.__embySubtitleUnscramblerInstalled = true;

  var nativeFetch = window.fetch;
  if (typeof nativeFetch !== "function") {
    return;
  }

  var subtitleVttPattern =
    /\/emby\/videos\/\d+\/[^/]+\/subtitles\/\d+\/(?:\d+\/)?stream\.vtt$/i;
  var convertedSubtitles = new Map();

  function makeSrtUrl(vttUrl) {
    var url = new URL(vttUrl, window.location.href);
    url.pathname = url.pathname.replace(/stream\.vtt$/i, "Stream.srt");
    return url.toString();
  }

  function decodeSubtitleBytes(bytes) {
    var encoding = "utf-8";

    if (bytes.length >= 2) {
      if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        encoding = "utf-16le";
      } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        encoding = "utf-16be";
      }
    }

    return new TextDecoder(encoding).decode(bytes);
  }

  function srtToVtt(srtText) {
    var normalized = srtText
      .replace(/^\uFEFF/, "")
      .replace(/\r\n?/g, "\n")
      .trim();

    if (!normalized) {
      return null;
    }

    var cues = [];
    var blocks = normalized.split(/\n{2,}/);

    for (var i = 0; i < blocks.length; i++) {
      var lines = blocks[i].split("\n");

      if (lines.length > 1 && /^\s*\d+\s*$/.test(lines[0])) {
        lines.shift();
      }

      if (!lines.length || lines[0].indexOf("-->") === -1) {
        continue;
      }

      lines[0] = lines[0].replace(
        /(\d{1,2}:\d{2}:\d{2}),(\d{3})/g,
        "$1.$2"
      );

      for (var lineIndex = 1; lineIndex < lines.length; lineIndex++) {
        lines[lineIndex] = lines[lineIndex].replace(/\{\\[^}]+\}/g, "");
      }

      cues.push(lines.join("\n"));
    }

    return cues.length ? "WEBVTT\n\n" + cues.join("\n\n") + "\n" : null;
  }

  function fetchConvertedSubtitle(srtUrl, request, init) {
    var cached = convertedSubtitles.get(srtUrl);
    if (cached) {
      return cached;
    }

    var headers = new Headers(
      request ? request.headers : init && init.headers
    );
    var signal = (request && request.signal) || (init && init.signal);

    var pending = nativeFetch(srtUrl, {
      method: "GET",
      headers: headers,
      credentials:
        (request && request.credentials) ||
        (init && init.credentials) ||
        "same-origin",
      cache: "no-store",
      signal: signal
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("SRT request failed: " + response.status);
      }

      return response.arrayBuffer().then(function (buffer) {
        var srtText = decodeSubtitleBytes(new Uint8Array(buffer));
        var vtt = srtToVtt(srtText);
        if (!vtt) {
          throw new Error("The SRT response contained no cues.");
        }
        return vtt;
      });
    });

    convertedSubtitles.set(srtUrl, pending);

    pending.then(
      function (vtt) {
        if (convertedSubtitles.size > 50) {
          var oldestKey = convertedSubtitles.keys().next().value;
          convertedSubtitles.delete(oldestKey);
        }
        convertedSubtitles.set(srtUrl, Promise.resolve(vtt));
      },
      function () {
        convertedSubtitles.delete(srtUrl);
      }
    );

    return pending;
  }

  window.fetch = function patchedEmbyFetch(input, init) {
    var originalArguments = arguments;
    var originalThis = this;
    var request = input instanceof Request ? input : null;
    var rawUrl = request ? request.url : String(input);
    var url;

    try {
      url = new URL(rawUrl, window.location.href);
    } catch (error) {
      return nativeFetch.apply(this, arguments);
    }

    if (!subtitleVttPattern.test(url.pathname)) {
      return nativeFetch.apply(this, arguments);
    }

    var srtUrl = makeSrtUrl(url);

    return fetchConvertedSubtitle(srtUrl, request, init).then(
      function (vtt) {
        return new Response(vtt, {
          status: 200,
          statusText: "OK",
          headers: {
            "Content-Type": "text/vtt; charset=utf-8",
            "Cache-Control": "no-store"
          }
        });
      },
      function () {
        return nativeFetch.apply(originalThis, originalArguments);
      }
    );
  };
})();
