import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";

// Create an OpenAI API client (that's edge-friendly!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string, // Use your OpenAI API key here
});

// IMPORTANT! Set the runtime to edge
export const runtime = "edge";

// Define a cache for storing previously generated responses
const responseCache: Map<string, Response> = new Map();

export async function POST(req: Request): Promise<Response> {
  // Extract the `messages` from the body of the request
  const { messages } = await req.json();

  // Start the conversation with a system message containing documentation
  const conversation: { role: string; content: string }[] = [
    {
      role: "system",
      content: `
        **Documentação do Sistema de Gerenciamento de Biblioteca**
        ...
      `,
    },
  ];

  // Add a training message to make the model introduce itself as "scAI"
  conversation.push({
    role: "assistant",
    content: "Eu sou scAI, seu assistente virtual. Como posso ajudar?",
  });

  // Add user messages to the conversation
  if (messages && messages.length > 0) {
    messages.forEach((msg: { content: string }) => {
      conversation.push({
        role: "user",
        content: msg.content,
      });
    });
  }

  // Check if there is a cached response for this conversation
  const cacheKey: string = JSON.stringify(conversation);
  if (responseCache.has(cacheKey)) {
    // Use the cached response
    return responseCache.get(cacheKey) as Response;
  }

  // Request a response from the GPT-3.5 Turbo model (gpt-3.5-turbo)
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo", // Use the GPT-3.5 Turbo model for chat
    messages: conversation,
  });

  // Extract and format the response text
  const responseData = response.choices[0]?.message?.content || "";

  // Cache the response for future use
  responseCache.set(cacheKey, new Response(responseData));

  // Respond with the formatted text
  return new Response(responseData);
}
