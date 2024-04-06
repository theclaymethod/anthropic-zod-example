# anthropic-zod-example

## Why
OpenAI has begun offering a nicer developer experience around tools. Anthropic's function calling is much newer. This repo provides a basic example of setting up few helper functions to allow you to declare the function call via Zod, making it completely type safe.

This also includes a failover to try again with a more powerful model if the initial parse fails.

## Run Instructions
copy .env.template to .env
Add your Anthropic API Key

```
npm install
npm run example
```