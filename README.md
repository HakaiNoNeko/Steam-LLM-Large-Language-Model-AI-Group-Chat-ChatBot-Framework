# Steam LLM Group Chat Chatbot Framework

Set up your own Steam chatbot that can autonomously talk to people in group chats, powered by a local [Ollama](https://ollama.com) model.

> **Disclaimer:** This bot framework is for entertainment usage ONLY. Malicious use is not at all endorsed. (In all honesty it can only talk, and the only plugin is for Ollama. Dangerous modification, unlikely as it is, is not endorsed.)

> **Credit:** I did not create this framework. It was created by the amazing [Ultragys](https://steamcommunity.com/id/Ultragys/), with their direct permission for me to post it, as they currently do not use GitHub. Development was AI-assisted, but it has been tested on Kubuntu and Windows 11 and works just fine.

## Requirements

- **Ollama and at least one Ollama model.** Pull a model with `ollama pull [MODEL NAME]` in Command Prompt (Windows) or your Linux terminal of choice (Konsole, Kitty, Alacritty, Ghostty, etc.).
- **[Node.js](https://nodejs.org) 18 or newer.**
- **A Steam account dedicated to the bot.** Once running, the bot talks on its own whenever its codename is said in a group chat it's in.

That's pretty much it.

## Quick start

1. Install Ollama and a local model, and make sure they work (for example through Alpaca).
2. Give the bot what it needs in `system prompt.txt` and `config.txt`.
3. Run the start script for your OS (see [Starting](#starting)).

**Model tip:** lightweight models on "fast mode" with no context window are recommended for longevity during operation. If you have a big system prompt, balance power and speed.

`Laborer [EXAMPLE].txt` is an example system prompt. It shows how specific a system prompt can be and still work fine with a light model.

**Linux note:** `start.sh` may not be marked executable after downloading (some downloads and zip extractions drop the executable bit), so double-clicking or running `./start.sh` can fail. Running `bash start.sh` from the framework folder always works, or run `chmod +x start.sh` once and then `./start.sh`.

Everything below the line is the framework creator's own documentation, with the content left as they wrote it (I won't bulldoze it, because that's not my place).

Happy botbuilding, friends.

---

## Ollama Steam Chatbot Framework 2.0.5

This is a full-featured generic Steam/Ollama chatbot framework.

### Portable folder

You can place the entire framework folder somewhere such as:

- `C:\Bots\MySteamBot`
- `D:\SteamBots\Companion`
- your Desktop or Downloads folder

`bot.js` resolves its configuration, logs, memory, and other runtime files from the folder that contains `bot.js`. `start.bat` also runs from its own folder automatically.

### Files you edit

#### `config.txt`

This is the only normal configuration file. Put the Steam account login, bot name, aliases, Ollama models, memory/friendship switches, and default reply modes here.

#### `system prompt.txt`

Edit `[SYSTEM PROMPT]`, `[PERSONALITY]`, `[MASTERS]`, and `[MASTER BEHAVIOR]`.

If `[MASTERS]` is blank, the bot has no master. Chat claims do not create master authority.

### Dependencies

The original/shareable framework does NOT include:

- `node_modules`
- `package-lock.json`
- `npm-shrinkwrap.json`

`package.json` stays because it is the small dependency recipe, not the installed dependencies themselves.

On the first run on a computer, `start.bat` runs:

```
npm install --no-package-lock --no-audit --no-fund
```

That creates `node_modules` locally for that computer. It does not create a package lock.

Node.js 18 or newer is required.

### Group modes

| Mode | Behavior |
| --- | --- |
| `off` | Silent in that group |
| `alias` | Reply only when the bot name or a configured alias is used |
| `smart` | Use the advanced social timing and continuation system |
| `all` | Reply to each eligible live message when ready |

Use `/groupmode off|alias|smart|all` after selecting a group.

### Memory and friendship

`Memory = on/off` and `Friendships = on/off` are in `config.txt`.

Automatic friendship changes use full-context semantic analysis rather than keyword point triggers. If relationship analysis is unavailable, friendship remains unchanged.

### Starting

On Windows, double-click `start.bat`. On Linux, run `bash start.sh` from the framework folder.

If the Steam account information is missing or Steam rejects the login, the framework does not enter normal operation. It tells you what to fix in the `[STEAM ACCOUNT]` section of the `config.txt` in that exact framework folder and waits for a key before closing.
