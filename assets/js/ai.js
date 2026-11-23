// Puxa a chave do arquivo config.js (que está no .gitignore)
const API_KEY = CONFIG.GEMINI_API_KEY;

// [PROTEÇÃO 1] Fallback de modelos gratuitos com cotas separadas
const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest"
];

const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const submitButton = chatForm.querySelector("button");
const chatMessages = document.getElementById("chat-messages");

const systemInstruction = {
  parts: [
    {
      text: `Você é o assistente educacional do EcoTech, especializado exclusivamente em meio ambiente, ecologia, biodiversidade, mudanças climáticas, energia limpa, reciclagem, preservação e sustentabilidade.

Regras de comportamento:
1. Responda sempre em português claro, acessível, educativo e direto ao ponto.
2. Conecte as explicações ao impacto ambiental, exemplos do dia a dia e formas práticas de ajudar o meio ambiente.
3. Se o usuário fizer uma pergunta fora do tema ambiental (ex.: receitas, códigos, jogos, fofocas, matemática solta sem relação ambiental), recuse com educação em 1 ou 2 frases e convide a fazer uma pergunta sobre meio ambiente ou sustentabilidade.
4. Evite inventar dados ou estatísticas; quando não tiver certeza de um número exato, diga isso com transparência.`
    }
  ]
};

const conversationHistory = [];
let lastMessageTime = 0; // Controle do cooldown

function appendMessage(text, sender) {
  // Cria um bloco que segura o rótulo + a mensagem juntos
  const wrapper = document.createElement("div");
  wrapper.classList.add("message-group", sender);

  // Cria o rótulo pequeno em cima (ex: "Você" ou "IA")
  const label = document.createElement("span");
  label.classList.add("message-label");
  label.textContent = sender === "user" ? "You:" : "Ecotech:";

  // Cria a mensagem em si
  const bubble = document.createElement("div");
  bubble.classList.add("message", sender);
  bubble.textContent = text;

  // Junta o rótulo e a mensagem dentro do bloco
  wrapper.appendChild(label);
  wrapper.appendChild(bubble);

  // Coloca o bloco na tela e desce a rolagem
  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Importante: retorna "bubble" porque o seu código usa isso para trocar "Pensando..." pela resposta
  return bubble;
}

// [PROTEÇÃO 5] Traduz códigos de erro técnicos para mensagens amigáveis
function formatFriendlyError(status, fallbackMessage) {
  if (status === 429) {
    return "Limite de perguntas atingido no momento. Aguarde alguns segundos e tente novamente.";
  }
  if (status === 503) {
    return "Os servidores de IA estão sobrecarregados agora. Tente novamente em instantes.";
  }
  if (status === 400 || status === 403) {
    return "Erro de autenticação na chave da API. Verifique o arquivo config.js.";
  }
  return fallbackMessage || "Não foi possível obter resposta agora. Verifique sua conexão.";
}

async function sendToGemini(promptText) {
  conversationHistory.push({
    role: "user",
    parts: [{ text: promptText }]
  });

  // [PROTEÇÃO 2] Envia apenas as últimas 8 mensagens para não estourar tokens por minuto (TPM)
  const recentHistory = conversationHistory.slice(-8);
  let lastErrorMessage = null;

  for (const model of MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: systemInstruction,
            contents: recentHistory,
            // [PROTEÇÃO 4] Limita o tamanho da resposta para economizar cota e acelerar o chat
            generationConfig: {
              maxOutputTokens: 600,
              temperature: 0.7
            }
          })
        });

        const data = await response.json();

        if (response.ok) {
          const candidate = data.candidates?.[0];

          // [PROTEÇÃO 5.1] Verifica se a resposta foi bloqueada pelo filtro de segurança
          if (candidate?.finishReason === "SAFETY") {
            conversationHistory.pop();
            return "Não posso responder a esse tipo de pergunta. Tente reformular com foco acadêmico.";
          }

          const replyText =
            candidate?.content?.parts
              ?.map((part) => part.text || "")
              .join("")
              .trim() || "Não consegui gerar uma resposta agora.";

          conversationHistory.push({
            role: "model",
            parts: [{ text: replyText }]
          });

          return replyText;
        }

        lastErrorMessage = formatFriendlyError(response.status, data.error?.message);

        // Aguarda 1.5s antes de tentar de novo em caso de pico de demanda (503) ou limite rápido (429)
        if (response.status === 503 || response.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }

        // Se for outro erro (ex: modelo indisponível), pula para o próximo modelo da lista
        break;
      } catch (err) {
        lastErrorMessage = "Falha de conexão com a internet. Verifique sua rede e tente novamente.";
      }
    }
  }

  // Remove a mensagem do usuário se todas as tentativas falharem
  conversationHistory.pop();
  throw new Error(lastErrorMessage);
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = userInput.value.trim();
  if (!text) return;

  // [PROTEÇÃO 3] Cooldown anti-spam de 2 segundos entre mensagens
  const now = Date.now();
  if (now - lastMessageTime < 2000) {
    appendMessage("Aguarde 2 segundos antes de enviar outra pergunta.", "bot");
    return;
  }
  lastMessageTime = now;

  appendMessage(text, "user");
  userInput.value = "";
  userInput.disabled = true;
  if (submitButton) submitButton.disabled = true;

  const loadingBubble = appendMessage("Pensando...", "bot");

  try {
    const reply = await sendToGemini(text);
    loadingBubble.textContent = reply;
  } catch (error) {
    loadingBubble.textContent = error.message;
  } finally {
    userInput.disabled = false;
    if (submitButton) submitButton.disabled = false;
    userInput.focus();
  }
});