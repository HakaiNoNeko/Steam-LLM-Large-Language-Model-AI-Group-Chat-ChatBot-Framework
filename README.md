This guide should walk you through the steps of setting up your own Steam chatbot that can autonomously talk to people in group chats.
It'll be short and easy, hopefully. But here's a disclaimer: this bot framework is for entertainment usage ONLY. Malicious use is not at all endorsed. (But in all honesty it can only talk, the only plugin is for Ollama. Dangerous modification, unlikely as it is, is not endorsed.)

Also note that I did not create the framework, it was created by the amazing https://steamcommunity.com/id/Ultragys/ with direct permission from them for me to post as they currently do not use GitHub. This framework's development was AI-assisted, but has been tested on Kubuntu and Windows 11 and works just fine.

Requirements:
Ollama as well as an Ollama model (running "ollama pull [MODEL NAME]" in Konsole or similar)
A Steam account dedicated for the bot (when you run the program, it can phone Steam on its own whenever its codename is said in group chats it's in)
That's pretty much it.

All you need to do is download Ollama and a local model, make sure those work through Alpaca, give the bot what it needs in system prompt.txt and config.txt (I heavily recommend lightweight models on "fast mode" with no context window for longevity during operation, but if you have a big system prompt then consider balancing power and speed), then use either of the run commands. 

I don't know if this is exclusively a me-problem, but I found that the run commands don't work out-of-the-box and putting ". start.sh" into Konsole on Kubuntu starts it.

"Laborer [EXAMPLE].txt" is an example file of a system prompt, to demonstrate just how specific a system prompt can be and still work fine with a light model.

The following is what the creator of the framework put here, specifically for the framework. I won't bulldoze it, because that's not my place.

Happy botbuilding, friends.



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
