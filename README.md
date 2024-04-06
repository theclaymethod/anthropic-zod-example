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


This will enable easier configuration of functions, better validation, and full type safety when using tool calls
```
// Define the weather schema

const weatherParams = z.object({
    location: z.string().describe("The city and state, e.g. San Francisco, CA"),
    unit: z.enum(["celsius", "fahrenheit"]).optional().describe(
        "The unit of temperature, either 'celsius' or 'fahrenheit'",
    ),
})
type WeatherParams = z.infer<typeof weatherParams>;
const weatherSchema = {
    name: "get_weather",
    description: "Get the current weather in a given location",
    input_schema: weatherParams
};

// Example usage
const text = "What is the weather like in San Francisco?";
const result: WeatherParams = await parseTextToZodAnthropic<WeatherParams>({
    text,
    schema: weatherSchema,
});
```