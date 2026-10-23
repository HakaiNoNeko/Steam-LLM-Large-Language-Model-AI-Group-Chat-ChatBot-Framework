"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { createOllama, stripThinking, parseThinkSetting } = require("../lib/ollama");
const { bbcodeToPlain, extractImageUrls, isMentioned } = require("../lib/steam-text");
const { hostAllowed } = require("../lib/images");

test("stripThinking removes closed, unclosed and orphan-closing think blocks", () => {
  assert.equal(stripThinking("<think>hmm</think>hello"), "hello");
  assert.equal(stripThinking("hello<think>cut off"), "hello");
  assert.equal(stripThinking("reasoning...</think>hi"), "hi");
});

test("parseThinkSetting", () => {
  assert.equal(parseThinkSetting("off"), false);
  assert.equal(parseThinkSetting("ON"), true);
  assert.equal(parseThinkSetting("high"), "high");
  assert.equal(parseThinkSetting("", true), true);
});

test("bbcodeToPlain", () => {
  assert.equal(bbcodeToPlain("hi [emoticon]steamhappy[/emoticon]"), "hi :steamhappy:");
  assert.equal(bbcodeToPlain("[mention=123]@Bob[/mention] yo"), "@Bob yo");
  assert.equal(bbcodeToPlain("[spoiler]boo[/spoiler]"), "boo");
  assert.equal(bbcodeToPlain("a \\[b] c"), "a [b] c"); // sender typed a literal bracket
  assert.equal(bbcodeToPlain('[img src="https://images.steamusercontent.com/ugc/1/2/"][/img]'), "[image]");
});

test("extractImageUrls", () => {
  const raw = '[img src="https://giphy.com/gifs/x" thumbnail_src="https://media0.giphy.com/media/x/giphy.gif"][/img] see https://i.imgur.com/a.png and https://example.com/page';
  const urls = extractImageUrls(raw);
  assert.equal(urls[0], "https://media0.giphy.com/media/x/giphy.gif");
  assert.ok(urls.includes("https://i.imgur.com/a.png"));
  assert.ok(!urls.includes("https://example.com/page"));
});

test("isMentioned", () => {
  assert.equal(isMentioned({ mentions: { mention_all: true } }, 5), true);
  assert.equal(isMentioned({ mentions: { mention_steamids: [{ accountid: 5 }] } }, 5), true);
  assert.equal(isMentioned({ message: "[mention=5]@bot[/mention]" }, 5), true);
  assert.equal(isMentioned({ message: "hello" }, 5), false);
});

test("hostAllowed only lets known hosts through by default", () => {
  assert.equal(hostAllowed("https://images.steamusercontent.com/ugc/1", false), true);
  assert.equal(hostAllowed("https://evil.example/x.png", false), false);
  assert.equal(hostAllowed("http://images.steamusercontent.com/x", false), false);
  assert.equal(hostAllowed("https://evil.example/x.png", true), true);
  assert.equal(hostAllowed("https://127.0.0.1/x.png", true), false);
});

test("generate only sends think/images to models that support them", async () => {
  const seen = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", c => (body += c));
    req.on("end", () => {
      const json = JSON.parse(body || "{}");
      res.setHeader("content-type", "application/json");
      if (req.url === "/api/show") {
        const caps = json.model === "smart" ? ["completion", "thinking", "vision"] : ["completion"];
        return res.end(JSON.stringify({ capabilities: caps }));
      }
      seen.push(json);
      res.end(JSON.stringify({ response: "<think>x</think>ok" }));
    });
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const ollama = createOllama({ url: `http://127.0.0.1:${server.address().port}` });

  const plain = await ollama.generate({ model: "dumb", prompt: "p", think: false, images: ["AA"] });
  assert.equal(plain.response, "ok");
  assert.ok(!("think" in seen[0]) && !("images" in seen[0]));

  await ollama.generate({ model: "smart", prompt: "p", think: false, images: ["AA"] });
  assert.equal(seen[1].think, false);
  assert.deepEqual(seen[1].images, ["AA"]);

  server.close();
});
