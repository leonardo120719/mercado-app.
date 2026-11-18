# Revisão das anotações com Gemini no Render

Serviço: https://pulpito-gemini.onrender.com

No painel Environment do serviço `pulpito-gemini`, cadastre `GEMINI_API_KEY` com a chave do Google AI Studio e use **Save, rebuild, and deploy**. A chave não deve ser adicionada a arquivos, variáveis públicas, site estático ou APK.

`NOTE_REVIEW_ACCESS_CODE` já foi gerado no servidor. Copie seu valor do painel privado do Render e cole em **Anotações → Conectar IA** em cada dispositivo. Esse código autoriza o acesso à revisão; ele é diferente da chave do Gemini. Para revogar os dispositivos, altere o código no Render e faça um novo deploy.

`GEMINI_MODEL` é opcional. O padrão é `gemini-3.5-flash`, com tentativa de `gemini-flash-latest` quando o modelo não está disponível. É possível definir um modelo compatível da sua conta sem atualizar o aplicativo.

O servidor escuta em `0.0.0.0:$PORT`. Build: `node --check note-review/server.mjs`. Start: `node note-review/server.mjs`. `/health` indica se as variáveis obrigatórias foram cadastradas; não testa a validade da chave junto ao Google. O teste real é solicitar uma revisão.

Limites: 6.000 caracteres por anotação, duas revisões simultâneas e 12 solicitações por minuto por instância. No plano gratuito, o primeiro acesso após inatividade pode demorar. O texto só é enviado quando a pessoa solicita a revisão. A sugestão precisa ser aplicada pela pessoa e pode ser desfeita no editor.

Validação do servidor: `node --test note-review/server.test.mjs`.
