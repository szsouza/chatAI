import { OpenAI } from "openai";

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
  const { messages }: { messages: any[] } = await req.json();

  // Define keywords for filtering user messages
  const keywords = [
    "instalação",
    "configuração",
    "usuário",
    "segurança",
    "ola",
    "chama",
    "ata",
  ];

  // Start the conversation with a system message containing documentation
  const conversation: OpenAI.Chat.Completions.CreateChatCompletionRequestMessage[] =
    [
      {
        role: "system",
        content: `
      **Documentação do Sistema de Fluxo de Processos**
      ...
    `,
      },
    ];

  conversation.push({
    role: "assistant",
    content: "Eu sou SCAI, seu assistente virtual. Como posso ajudar?",
  });

  // Verifique se a mensagem do usuário é uma repetição da conversa anterior (verifique o cache)
  const cachedResponse = responseCache.get(JSON.stringify(messages));
  if (cachedResponse) {
    return cachedResponse;
  }

  // Verifique se alguma mensagem do usuário contém uma palavra-chave
  const userMessageContainsKeyword = messages.some(
    (msg: { content: string }) => {
      const messageText = msg.content.toLowerCase(); // Converta a mensagem para minúsculas
      return containsKeyword(messageText, keywords);
    }
  );

  // Se a mensagem do usuário contém uma palavra-chave, continue com a lógica existente
  if (userMessageContainsKeyword) {
    // Adicione mensagens do usuário à conversa
    for (const msg of messages) {
      const messageText = msg.content.toLowerCase();
      if (containsKeyword(messageText, keywords)) {
        conversation.push({
          role: "user",
          content: msg.content,
        });
      }
    }

    // Solicite uma resposta da API OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Use o modelo GPT-3.5 Turbo para o chat
      messages: conversation,
    });

    // Extraia e formate o texto da resposta
    const responseData = response.choices[0]?.message?.content || "";

    // Armazene a resposta em cache para uso futuro
    responseCache.set(JSON.stringify(messages), new Response(responseData));

    // Responda com o texto formatado
    return new Response(responseData);
  } else {
    // Se a mensagem do usuário não contém uma palavra-chave, responda com a última mensagem do usuário
    // em vez da mensagem padrão
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    conversation.push({
      role: "user",
      content: lastUserMessage,
    });
    return new Response(lastUserMessage);
  }
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
