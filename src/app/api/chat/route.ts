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

  // Define keywords for filtering user messages
  const keywords = ["instalação", "configuração", "usuário", "segurança"];

  // Start the conversation with a system message containing documentation
  const conversation: { role: string; content: string }[] = [
    {
      role: "system",
      content: `
        **Documentação do Sistema de Fluxo de Processos**
        ...
      `,
    },
  ];

  // Add a training message to make the model introduce itself as "scAI"
  conversation.push({
    role: "assistant",
    content: "Eu sou scAI, seu assistente virtual. Como posso ajudar?",
  });

  // Filter and add user messages to the conversation
  let userMessageFound = false;
  if (messages && messages.length > 0) {
    for (const msg of messages) {
      const messageText = msg.content.toLowerCase(); // Converte a mensagem para minúsculas

      // Verifica se a mensagem do usuário contém alguma palavra-chave
      if (containsKeyword(messageText, keywords)) {
        conversation.push({
          role: "user",
          content: msg.content,
        });
        userMessageFound = true;
      }
    }
  }

  // Se o usuário não tiver mencionado nenhuma palavra-chave, o assistente fornecerá uma resposta automática
  if (!userMessageFound) {
    conversation.push({
      role: "assistant",
      content:
        "Aqui está uma resposta automática quando nenhuma palavra-chave é encontrada.",
    });
  } else {
    // Se uma mensagem com palavra-chave for encontrada, faça a requisição à API OpenAI
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

  // Respond with the formatted text for the automatic response
  return new Response(conversation[conversation.length - 1].content);
}

// Função para verificar se a mensagem do usuário contém alguma palavra-chave
function containsKeyword(message: string, keywords: string[]): boolean {
  for (const keyword of keywords) {
    if (message.includes(keyword)) {
      return true;
    }
  }
  return false;
}
