const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const scriptPath = path.resolve(
  __dirname,
  "..",
  "src",
  "Emby.SubtitleUnscrambler",
  "subtitle-unscrambler.js"
);
const fixturePath = path.join(__dirname, "fixtures", "sample.srt");
const script = fs.readFileSync(scriptPath, "utf8");
const srtBytes = fs.readFileSync(fixturePath);

const pageUrl = "https://emby.example.test/web/index.html";
const vttUrl =
  "https://emby.example.test/emby/videos/42/mediasource_42/" +
  "Subtitles/7/0/Stream.vtt";

function installPlugin(fetchImpl) {
  const context = {
    console,
    fetch: fetchImpl,
    Headers,
    Map,
    Promise,
    Request,
    Response,
    TextDecoder,
    URL,
    Uint8Array,
  };
  context.window = context;
  context.location = { href: pageUrl };

  vm.createContext(context);
  vm.runInContext(script, context, { filename: scriptPath });
  return context;
}

async function testUtf8Conversion() {
  const requests = [];
  const context = installPlugin(async (url) => {
    requests.push(String(url));
    return new Response(srtBytes, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  });

  assert.equal(context.__embySubtitleUnscramblerInstalled, true);

  const response = await context.fetch(vttUrl);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/vtt/);
  assert.match(body, /^WEBVTT\r?\n\r?\n/);
  assert.match(body, /00:00:01\.000 --> 00:00:02\.500\r?\n字幕测试/);
  assert.match(body, /这是 UTF-8 中文字幕/);
  assert.doesNotMatch(body, /\{\\an8\}/);
  assert.equal(requests.length, 1);
  assert.match(requests[0], /\/Subtitles\/7\/0\/Stream\.srt$/);
}

async function testUtf16LeConversion() {
  const utf16Srt = Buffer.from(
    "\uFEFF1\r\n00:00:03,000 --> 00:00:04,000\r\nUTF-16 字幕正常\r\n",
    "utf16le"
  );
  const context = installPlugin(async () => new Response(utf16Srt));

  const body = await (await context.fetch(vttUrl)).text();
  assert.match(body, /00:00:03\.000 --> 00:00:04\.000\r?\nUTF-16 字幕正常/);
}

async function testOtherRequestsPassThrough() {
  const apiUrl = "https://emby.example.test/emby/Items/42";
  const context = installPlugin(async (url) => {
    assert.equal(String(url), apiUrl);
    return new Response('{"Id":"42"}', {
      headers: { "Content-Type": "application/json" },
    });
  });

  const response = await context.fetch(apiUrl);
  assert.equal(await response.text(), '{"Id":"42"}');
}

async function testFallbackToOriginalVtt() {
  const requests = [];
  const context = installPlugin(async (url) => {
    requests.push(String(url));
    if (/Stream\.srt$/i.test(String(url))) {
      return new Response("missing", { status: 404 });
    }

    return new Response("WEBVTT\n\nfallback\n", {
      headers: { "Content-Type": "text/vtt" },
    });
  });

  const body = await (await context.fetch(vttUrl)).text();
  assert.match(body, /^WEBVTT/);
  assert.equal(requests.length, 2);
  assert.match(requests[0], /Stream\.srt$/);
  assert.match(requests[1], /Stream\.vtt$/);
}

async function run() {
  await testUtf8Conversion();
  await testUtf16LeConversion();
  await testOtherRequestsPassThrough();
  await testFallbackToOriginalVtt();
  process.stdout.write(
    "PASS: subtitle conversion, UTF-16, pass-through, fallback\n"
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
