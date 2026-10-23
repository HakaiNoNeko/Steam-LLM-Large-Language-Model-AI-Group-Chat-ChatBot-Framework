"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { parseActions, actionsPrompt, rememberPerson, ALL_ON } = require("../lib/steam-actions");

const OFF = { react: false, me: false, spoiler: false, mention: false, store: false };

test("react and me tags become actions and leave the text clean", () => {
  const r = parseActions("nice one [react:steamhappy] [me:claps]", ALL_ON);
  assert.equal(r.plain, "nice one");
  assert.deepEqual(r.actions, [{ type: "react", name: "steamhappy" }, { type: "me", text: "claps" }]);
});

test("unknown emoticons are dropped when the owned list is known", () => {
  const r = parseActions("hi [react:madeup]", ALL_ON, { ownedEmoticons: new Set(["steamhappy"]) });
  assert.deepEqual(r.actions, []);
});

test("group mentions use the roster; unknown names fall back to @Name; DMs are plain", () => {
  const roster = new Map();
  rememberPerson(roster, "Bob", 42);
  const r = parseActions("hey [mention:Bob] and [mention:Zed]", ALL_ON);
  assert.equal(r.bbcode(roster, true), "hey [mention=42]@Bob[/mention] and @Zed");
  assert.equal(r.bbcode(roster, false), "hey @Bob and @Zed");
  assert.equal(r.plain, "hey @Bob and @Zed");
});

test("spoilers only render in groups", () => {
  const r = parseActions("[spoiler:the butler did it]", ALL_ON);
  assert.equal(r.bbcode(null, true), "[spoiler]the butler did it[/spoiler]");
  assert.equal(r.bbcode(null, false), "the butler did it");
});

test("model-written brackets can never become BBCode", () => {
  const r = parseActions("click [url=https://evil.example]here[/url] [img]x[/img]", ALL_ON);
  assert.equal(r.bbcode(null, true), "click \\[url=https://evil.example]here\\[/url] \\[img]x\\[/img]");
});

test("disabled actions vanish but inline ones keep their text", () => {
  const r = parseActions("a [react:steamhappy][spoiler:b][mention:C][me:d][store:1]", OFF);
  assert.equal(r.plain, "a bC");
  assert.deepEqual(r.actions, []);
});

test("store tag builds a store link; garbage ids are dropped", () => {
  assert.equal(parseActions("[store:620]", ALL_ON).plain, "https://store.steampowered.com/app/620");
  assert.equal(parseActions("x [store:abc]", ALL_ON).plain, "x");
});

test("actionsPrompt lists enabled actions and owned emoticons", () => {
  const p = actionsPrompt(ALL_ON, { ownedEmoticons: ["steamhappy"], isGroup: false });
  assert.match(p, /\[react:NAME\]/);
  assert.match(p, /:steamhappy:/);
  assert.doesNotMatch(p, /\[mention:/);
  assert.equal(actionsPrompt(OFF, {}), "");
});

test("garbled emoticons are repaired or removed; bare [name] becomes a reaction; Emoticons off strips them", () => {
  const owned = new Set(["steamhappy", "steammocking"]);
  assert.equal(parseActions("hi :steamhappy! ok", ALL_ON, { ownedEmoticons: owned }).plain, "hi :steamhappy:! ok");
  assert.equal(parseActions("hm :steamocking nya", ALL_ON, { ownedEmoticons: owned }).plain, "hm :steammocking: nya");
  assert.equal(parseActions("hm :steamnonsense: nya", ALL_ON, { ownedEmoticons: owned }).plain, "hm nya");
  assert.equal(parseActions("it is 5:30 at http://x.com", ALL_ON, { ownedEmoticons: owned }).plain, "it is 5:30 at http://x.com");
  const r = parseActions("[steamhappy] sounds fun", ALL_ON, { ownedEmoticons: owned });
  assert.deepEqual(r.actions, [{ type: "react", name: "steamhappy" }]);
  assert.equal(r.plain, "sounds fun");
  assert.equal(parseActions("yay :steamhappy: ok", ALL_ON, { ownedEmoticons: owned, emoticons: false }).plain, "yay ok");
});
