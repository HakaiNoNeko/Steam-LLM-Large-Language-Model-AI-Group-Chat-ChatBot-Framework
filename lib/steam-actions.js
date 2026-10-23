"use strict";
// Steam chat "actions" the model can use by writing small inline tags in its reply, plus the Steam-side
// plumbing for them (reactions, owned emoticons). Small local models are bad at tool-calling but fine at
// writing a tag, so tags are parsed out of the reply by the bot, which decides what is actually sent.
//
//   [react:steamhappy]   react to the message being answered
//   [me:waves hello]     an action line, sent as "/me waves hello"
//   [mention:Name]       @mention a group member (plain "@Name" in DMs)
//   [spoiler:text]       hidden text (group chats only; plain text in DMs)
//   [store:12345]        a link to a Steam store page
//   :emoticon:           plain text, rendered by Steam
//
// Reactions use steam-user's protected _sendUnified because steam-user has no reaction API yet;
// every call is wrapped so a protocol change degrades to "no reaction" instead of an error.

const TAG = /\[(react|me|spoiler|mention|store):\s*([^\]]{1,300})\]/gi;
const OPEN = "\u0002";
const CLOSE = "\u0003";

const ALL_ON = { react: true, me: true, spoiler: true, mention: true, store: true };

function cleanEmoticonName(name) {
  const n = String(name || "").replace(/:/g, "").trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(n) ? n : "";
}

// Literal text from the model must never be read as BBCode by Steam.
function escapeBb(text) {
  return String(text).replace(/\[/g, "\\[");
}

// Pulls action tags out of a model reply.
// Returns { plain, actions, bbcode(roster, isGroup) }:
//   plain  - the reply with tags resolved to readable text (for memory/logs)
//   actions - [{type:"react", name} | {type:"me", text}] to perform besides the text message
//   bbcode - the text as it should be sent to Steam (escaped, with generated mentions/spoilers)
function parseActions(reply, enabled = ALL_ON, { ownedEmoticons = null } = {}) {
  const actions = [];
  const raw = String(reply ?? "").split(OPEN).join("").split(CLOSE).join("");

  const marked = raw.replace(TAG, (_m, type, arg) => {
    type = type.toLowerCase();
    arg = arg.trim();
    if (!enabled[type]) return type === "spoiler" || type === "mention" ? arg : "";
    switch (type) {
      case "react": {
        const name = cleanEmoticonName(arg);
        if (name && (!ownedEmoticons || ownedEmoticons.has(name)) && actions.length < 3) actions.push({ type, name });
        return "";
      }
      case "me":
        if (arg && actions.length < 3) actions.push({ type, text: arg });
        return "";
      case "store": {
        const id = arg.replace(/\D/g, "");
        return id ? `https://store.steampowered.com/app/${id}` : "";
      }
      case "spoiler":
        return `${OPEN}S${arg}${CLOSE}`;
      case "mention":
        return `${OPEN}M${arg.replace(/^@/, "")}${CLOSE}`;
    }
    return "";
  });

  const tidy = s => s.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,!?])/g, "$1").trim();
  const placeholder = new RegExp(`${OPEN}([SM])([^${CLOSE}]*)${CLOSE}`, "g");

  const plain = tidy(marked.replace(placeholder, (_m, kind, arg) => (kind === "M" ? `@${arg}` : arg)));

  function bbcode(roster, isGroup) {
    const escaped = escapeBb(tidy(marked)).replace(new RegExp(`${OPEN}([SM])([^${CLOSE}]*)${CLOSE}`, "g"), (_m, kind, arg) => {
      if (kind === "S") return isGroup ? `[spoiler]${arg}[/spoiler]` : arg;
      const person = isGroup && roster ? roster.get(arg.toLowerCase()) : null;
      return person ? `[mention=${person.accountid}]@${person.name}[/mention]` : `@${arg}`;
    });
    return escaped;
  }

  return { plain, actions, bbcode };
}

// Prompt block telling the model which actions exist. Empty when everything is off.
function actionsPrompt(enabled, { ownedEmoticons = [], isGroup = true } = {}) {
  const lines = [];
  if (enabled.react) lines.push("- [react:NAME] react to the message you are answering with an emoticon, e.g. [react:steamhappy]");
  if (enabled.me) lines.push("- [me:waves hello] an action line in the third person, shown like /me waves hello");
  if (enabled.mention && isGroup) lines.push("- [mention:Name] mention a person in this group chat by their name");
  if (enabled.spoiler && isGroup) lines.push("- [spoiler:text] hide text behind a spoiler");
  if (enabled.store) lines.push("- [store:APPID] link a game's Steam store page");
  if (!lines.length && !ownedEmoticons.length) return "";

  const out = ["Optional Steam chat actions. Most replies need none; use at most one and only when it fits naturally. Put the tag anywhere in your reply:"];
  out.push(...lines);
  if (ownedEmoticons.length) {
    out.push("You can also write emoticons directly in your text. Only use these exact ones: " + ownedEmoticons.slice(0, 30).map(n => `:${n}:`).join(" "));
  }
  return out.join("\n");
}

// roster: Map(lowercase name -> {accountid, name}) of people recently seen in a room.
function rememberPerson(roster, name, accountid, limit = 60) {
  const n = String(name || "").trim();
  if (!n || !Number.isInteger(accountid)) return;
  roster.delete(n.toLowerCase());
  roster.set(n.toLowerCase(), { accountid, name: n });
  while (roster.size > limit) roster.delete(roster.keys().next().value);
}

// steam-user only registers the protobufs it uses itself. Reactions are not among them, so we encode and
// decode those messages with steam-user's own generated schema (a message with no registered protobuf is
// delivered to us as a raw Buffer, which is what the decode step below expects).
function loadSteamUserInternals() {
  const root = require("path").dirname(require.resolve("steam-user/package.json"));
  return {
    Schema: require(require("path").join(root, "protobufs/generated/_load.js")),
    Messages: require(require("path").join(root, "components/03-messages.js")),
    EMsg: require("steam-user").EMsg
  };
}

function createSteamActions(client, log = () => {}) {
  let owned = null; // Set of emoticon names, null = not loaded / unavailable
  let ownedList = [];

  // method: "Service.Method#1"; request: a Schema class name for the request, or null if steam-user knows it.
  function rpc(method, data, timeoutMs = 10000, requestSchema = null) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(method + " timed out")), timeoutMs);
      const done = (body, hdr) => {
        clearTimeout(timer);
        const eresult = hdr?.proto?.eresult;
        if (eresult !== undefined && eresult !== null && eresult !== 1) reject(new Error(`${method} failed (EResult ${eresult})`));
        else resolve(body);
      };
      try {
        if (!requestSchema) return client._sendUnified(method, data, done);
        const { Schema, Messages, EMsg } = loadSteamUserInternals();
        client._send(
          { msg: EMsg.ServiceMethodCallFromClient, proto: { target_job_name: method } },
          Messages._encodeProto(Schema[requestSchema], data),
          done
        );
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  async function loadEmoticons() {
    try {
      const body = await rpc("Player.GetEmoticonList#1", {});
      const list = (body.emoticons || [])
        .filter(e => e.name && Number(e.count ?? 1) > 0)
        .sort((a, b) => Number(b.use_count || 0) - Number(a.use_count || 0))
        .map(e => cleanEmoticonName(e.name))
        .filter(Boolean);
      ownedList = Array.from(new Set(list));
      owned = ownedList.length ? new Set(ownedList) : null;
      log(`[actions] ${ownedList.length} emoticons available to this account`);
    } catch (err) {
      log("[actions] could not read the emoticon list:", err.message);
    }
    return ownedList;
  }

  // target: {kind:"dm", steamID} | {kind:"group", groupId, chatId}; message: {serverTimestamp:Date|number, ordinal}
  async function react(target, message, name, isAdd = true) {
    const emoticon = cleanEmoticonName(name);
    if (!emoticon) throw new Error("invalid emoticon name");
    const ts = message.serverTimestamp instanceof Date ? message.serverTimestamp.getTime() : Number(message.serverTimestamp);
    const server_timestamp = Math.floor((ts > 1e11 ? ts / 1000 : ts) || 0);
    if (!server_timestamp) throw new Error("message has no server timestamp");
    const base = { server_timestamp, ordinal: Number(message.ordinal) || 0, reaction_type: 1, reaction: emoticon, is_add: !!isAdd };
    if (target.kind === "dm") {
      const steamid = target.steamID?.getSteamID64 ? target.steamID.getSteamID64() : String(target.steamID);
      return rpc("FriendMessages.UpdateMessageReaction#1", { ...base, steamid }, 10000, "CFriendMessages_UpdateMessageReaction_Request");
    }
    return rpc("ChatRoom.UpdateMessageReaction#1", { ...base, chat_group_id: String(target.groupId), chat_id: String(target.chatId) }, 10000, "CChatRoom_UpdateMessageReaction_Request");
  }

  // Calls cb({kind, reactor, name, isAdd, ordinal, serverTimestamp, groupId?, chatId?, friend?}) for reactions
  // anyone adds to messages in our chats. Uses steam-user internals, so failure just means no events.
  function onReaction(cb) {
    const wrap = (kind, body) => {
      try {
        cb({
          kind,
          reactor: String(body.reactor ?? ""),
          name: cleanEmoticonName(body.reaction),
          isAdd: body.is_add !== false,
          ordinal: Number(body.ordinal) || 0,
          serverTimestamp: Number(body.server_timestamp) || 0,
          groupId: body.chat_group_id != null ? String(body.chat_group_id) : undefined,
          chatId: body.chat_id != null ? String(body.chat_id) : undefined,
          friend: body.steamid_friend != null ? String(body.steamid_friend) : undefined
        });
      } catch (err) {
        log("[actions] reaction handler failed:", err.message);
      }
    };
    try {
      const { Schema, Messages } = loadSteamUserInternals();
      const decode = (schema, body) => (Buffer.isBuffer(body) ? Messages._decodeProto(Schema[schema], body) : body);
      client._handlerManager.add("FriendMessagesClient.MessageReaction#1", body => wrap("dm", decode("CFriendMessages_MessageReaction_Notification", body)));
      client._handlerManager.add("ChatRoomClient.NotifyMessageReaction#1", body => wrap("group", decode("CChatRoom_MessageReaction_Notification", body)));
    } catch (err) {
      log("[actions] cannot listen for reactions:", err.message);
    }
  }

  return {
    loadEmoticons,
    react,
    onReaction,
    get owned() { return owned; },
    get ownedList() { return ownedList; }
  };
}

module.exports = { parseActions, actionsPrompt, rememberPerson, createSteamActions, cleanEmoticonName, escapeBb, ALL_ON };
