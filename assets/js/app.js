import { sendToGemini, validarCooldown } from "./ai.js";

const { createApp, ref, reactive, nextTick } = Vue;

createApp({
  setup() {
    const userInput = ref("");
    const isSending = ref(false);
    const messages = ref([]);
    const chatMessagesRef = ref(null);
    const userInputRef = ref(null);

    async function scrollToBottom() {
      await nextTick();
      if (chatMessagesRef.value) {
        chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
      }
    }

    async function handleSubmit() {
      const text = userInput.value.trim();
      if (!text || isSending.value) return;

      // [PROTEÇÃO 3] Cooldown anti-spam de 2 segundos entre mensagens
      if (!validarCooldown(2000)) {
        messages.value.push({
          id: `${Date.now()}-${Math.random()}`,
          sender: "bot",
          label: "Ecotech:",
          text: "Aguarde 2 segundos antes de enviar outra pergunta."
        });
        await scrollToBottom();
        return;
      }

      messages.value.push({
        id: `${Date.now()}-${Math.random()}`,
        sender: "user",
        label: "You:",
        text
      });

      userInput.value = "";
      isSending.value = true;

      const loadingMessage = reactive({
        id: `${Date.now()}-${Math.random()}`,
        sender: "bot",
        label: "Ecotech:",
        text: "Pensando..."
      });
      messages.value.push(loadingMessage);
      await scrollToBottom();

      try {
        const reply = await sendToGemini(text);
        loadingMessage.text = reply;
      } catch (error) {
        loadingMessage.text =
          error instanceof Error && error.message
            ? error.message
            : "Não foi possível obter resposta agora.";
      } finally {
        isSending.value = false;
        await nextTick();
        if (userInputRef.value) {
          userInputRef.value.focus();
        }
        await scrollToBottom();
      }
    }

    return {
      userInput,
      isSending,
      messages,
      chatMessagesRef,
      userInputRef,
      handleSubmit
    };
  }
}).mount("#app");
