const API_KEY = CONFIG.GEMINI_API_KEY;

const MODELS = [
  "gemini-3.8-flash",        // Principal: rápido, moderno e gratuito
  "gemini-3.5-flash-lite",   // Fallback 1: variante leve (ótimo quando o principal dá pico de demanda)
  "gemini-flash-latest",     // Fallback 2: alias estável da família Flash
  "gemma-4-26b-a4b-it"       // Fallback 3: modelo aberto gratuito com boa capacidade didática
];

const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatMessages = document.getElementById("chat-messages");

const systemInstruction = {
  parts: [
    {
      text: "Você é um tutor educacional universitário. Responda em português claro, didático e objetivo, guiando o estudante no raciocínio antes de dar respostas diretas."
    }
  ]
};

// Mantém o histórico no formato esperado pela API (roles: "user" e "model")
const conversationHistory = [];

function appendMessage(text, sender) {
  const bubble = document.createElement("div");
  bubble.classList.add("message", sender);
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bubble;
}

async function sendToGemini(promptText) {
  conversationHistory.push({
    role: "user",
    parts: [{ text: promptText }]
  });

  const recentHistory = conversationHistory.slice(-10);
  let lastError = null;

  for (const model of MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

    // Tenta até 2 vezes no mesmo modelo antes de pular para o próximo
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: systemInstruction,
            contents: recentHistory
          })
        });

        const data = await response.json();

        if (response.ok) {
          const replyText =
            data.candidates?.[0]?.content?.parts
              ?.map((part) => part.text || "")
              .join("")
              .trim() || "Não consegui gerar uma resposta agora.";

          conversationHistory.push({
            role: "model",
            parts: [{ text: replyText }]
          });

          return replyText;
        }

        lastError = new Error(data.error?.message || `Erro HTTP ${response.status}`);

        // Se for sobrecarga temporária (503) ou limite rápido (429), aguarda 1.5s
        if (response.status === 503 || response.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }

        // Para outros erros (ex: modelo não encontrado), passa para o próximo modelo
        break;
      } catch (err) {
        lastError = err;
      }
    }
  }

  // Remove a última mensagem do usuário se nenhum modelo responder
  conversationHistory.pop();
  throw lastError || new Error("Todos os modelos estão indisponíveis no momento.");
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = userInput.value.trim();
  if (!text) return;

  appendMessage(text, "user");
  userInput.value = "";
  userInput.disabled = true;

  const loadingBubble = appendMessage("Pensando...", "bot");

  try {
    const reply = await sendToGemini(text);
    loadingBubble.textContent = reply;
  } catch (error) {
    loadingBubble.textContent = `Erro: ${error.message}`;
  } finally {
    userInput.disabled = false;
    userInput.focus();
  }
});