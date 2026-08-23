# Ollama Steam Chatbot Framework 2.0.5

This is a full-featured generic Steam/Ollama chatbot framework.

## Portable folder

You can place the entire framework folder somewhere such as:

- `C:\Bots\MySteamBot`
- `D:\SteamBots\Companion`
- your Desktop or Downloads folder

`bot.js` resolves its configuration, logs, memory, and other runtime files from the folder that contains `bot.js`. `start.bat` also runs from its own folder automatically.

## Files you edit

### `config.txt`

This is the only normal configuration file. Put the Steam account login, bot name, aliases, Ollama models, memory/friendship switches, and default reply modes here.

### `system prompt.txt`

Edit `[SYSTEM PROMPT]`, `[PERSONALITY]`, `[MASTERS]`, and `[MASTER BEHAVIOR]`.

If `[MASTERS]` is blank, the bot has no master. Chat claims do not create master authority.

## Dependencies

The original/shareable framework does NOT include:

- `node_modules`
- `package-lock.json`
- `npm-shrinkwrap.json`

`package.json` stays because it is the small dependency recipe, not the installed dependencies themselves.

On the first run on a computer, `start.bat` runs:

`npm install --no-package-lock --no-audit --no-fund`

That creates `node_modules` locally for that computer. It does not create a package lock.

Node.js 18 or newer is required.

## Group modes

- `off` — silent in that group
- `alias` — reply only when the bot name or configured alias is used
- `smart` — use the advanced social timing and continuation system
- `all` — reply to each eligible live message when ready

Use `/groupmode off|alias|smart|all` after selecting a group.

## Memory and friendship

`Memory = on/off` and `Friendships = on/off` are in `config.txt`.

Automatic friendship changes use full-context semantic analysis rather than keyword point triggers. If relationship analysis is unavailable, friendship remains unchanged.

## Starting

Double-click `start.bat`.

If the Steam account information is missing or Steam rejects the login, the framework does not enter normal operation. It tells you what to fix in the `[STEAM ACCOUNT]` section of the `config.txt` in that exact framework folder and waits for a key before closing.
