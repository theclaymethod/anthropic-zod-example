import Anthropic from "@anthropic-ai/sdk";
import { ZodSchema } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { JSONSchema } from "./jsonschema";
import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

// Initialize the Anthropic SDK with the API key and default headers
export const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultHeaders: {
        "anthropic-beta": "tools-2024-04-04",
    },
});

// Define the available Anthropic models
export type AnthropicModels =
    | "claude-3-opus-20240229"
    | "claude-3-sonnet-20240229"
    | "claude-3-haiku-20240307";

// Define the schema for a tool
type ToolSchema = {
    name: string;
    description: string;
    input_schema: JSONSchema;
};

// Parse text to a raw schema using Anthropic
export const parseTextToRawSchemaAnthropic = async ({
    text,
    schema,
    model = "claude-3-sonnet-20240229",
    temperature = 0.1,
    max_tokens = 2000,
    allowRecursiveFailover = true,
}: {
    text: string;
    schema: ToolSchema;
    model?: AnthropicModels;
    temperature?: number;
    max_tokens?: number;
    allowRecursiveFailover?: boolean;
}): Promise<{} | undefined> => {
    return parseTextToStructuredAnthropic({
        text,
        schema,
        model,
        temperature,
        max_tokens,
        allowRecursiveFailover,
        parse: JSON.parse,
    });
};

// Parse text to a Zod schema using Anthropic
export async function parseTextToZodAnthropic<T extends object>({
    text,
    schema,
    model = "claude-3-sonnet-20240229",
    temperature = 0.1,
    max_tokens = 2000,
    allowRecursiveFailover = true,
}: {
    text: string;
    schema: {
        description: string;
        name: string;
        input_schema: ZodSchema<T>;
    };
    model?: AnthropicModels;
    temperature?: number;
    max_tokens?: number;
    allowRecursiveFailover?: boolean;
}): Promise<T | undefined> {
    return parseTextToStructuredAnthropic({
        text,
        schema: {
            name: schema.name,
            description: schema.description,
            input_schema: zodToJsonSchema(schema.input_schema) as JSONSchema,
        },
        model,
        temperature,
        max_tokens,
        allowRecursiveFailover,
        parse: (input: string) => schema.input_schema.parse(JSON.parse(input)),
    });
}

// Parse text to a structured schema using Anthropic
async function parseTextToStructuredAnthropic<T>({
    text,
    schema,
    model,
    temperature,
    max_tokens,
    allowRecursiveFailover,
    parse,
}: {
    text: string;
    schema: ToolSchema;
    model: AnthropicModels;
    temperature: number;
    max_tokens: number;
    allowRecursiveFailover: boolean;
    parse: (input: string) => T;
}): Promise<T | undefined> {
    try {
        const msg = await anthropic.messages.create({
            model: model,
            max_tokens: max_tokens,
            temperature: temperature,
            tools: [schema],
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: text,
                        },
                    ],
                },
            ],
        });

        if (msg.stop_reason === "tool_use") {
            const toolUse = msg.content.find((block) => block.type === "tool_use");
            if (toolUse && toolUse.name === schema.name) {
                let output: T;
                try {
                    output = parse(JSON.stringify(toolUse.input));
                } catch (error) {
                    console.error("Failed to parse:");
                    console.dir(toolUse, { depth: null });
                    if (allowRecursiveFailover) {
                        console.log("Recursive failover");
                        output = await parseTextToStructuredAnthropic({
                            text,
                            schema,
                            model: "claude-3-opus-20240229",
                            temperature: 0.8,
                            max_tokens: 4000,
                            allowRecursiveFailover: false,
                            parse,
                        });
                    }
                }
                return output;
            }
        }
        return undefined;
    } catch (error: any) {
        console.error("Error in parseTextToAnthropic:", error.message, text);
        return undefined;
    }
}

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
console.log(result);