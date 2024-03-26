# Derek Bot

## Getting Started

1. Install dependencies with `npm install` in terminal.
2. Put

```ts
export const chatgptkey = "YOUR_CHATGPT_KEY";
export const discordToken = "YOUR_DISCORD_BOT_TOKEN";
export const derekId = "DEREK_DISCORD_ID";
export const botId = "BOT_DISCORD_ID";
```

in `src/Token.ts`.

3. Run `npx tsc` to compile TypeScript.
4. Run `node src/Discord.js`. It should output `Ready!`.

## Making Your Custom Bot

Most (but not all) of the Derek specific data can be found in `Examples.ts`.
