# EcoTech com Vue 3 (via CDN)

Este pacote reúne os arquivos integrados do **EcoTech** com **Vue 3 via CDN**, preservando a estrutura HTML e o estilo visual escuro.

## Arquivos incluídos
- `index.html`: mantém o cabeçalho, a seção informativa (`.text-content`) e integra o chat reativo com Vue 3 em `#app`.
- `style.css`: mantém a estética escura e adiciona o layout responsivo do container principal e do chat.
- `assets/js/app.js`: gerencia o estado reativo do chat com Vue 3 (`userInput`, `isSending`, `messages`, `chatMessagesRef`, `handleSubmit`) e rolagem automática.
- `assets/js/ai.js`: mantém a integração com a API do Gemini, fallback de modelos, histórico de conversa, cooldown e tratamento de erros.
- `assets/js/config-exemplo.js`: modelo de configuração da chave da API.

## Como rodar localmente
1. Crie `assets/js/config.js` a partir de `assets/js/config-exemplo.js` exportando `CONFIG` com sua `GEMINI_API_KEY`.
2. Abra o projeto em um servidor local (como Live Server no VS Code ou `python3 -m http.server`) para permitir o carregamento de ES Modules (`type="module"`).
