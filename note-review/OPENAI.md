# OpenAI como segunda opção de IA

O serviço `pulpito-gemini` passa a aceitar `provider: "gemini"` ou `provider: "openai"` nas rotas de revisão e do Instrutor. Requisições de versões anteriores, sem esse campo, continuam usando Gemini. Não há troca automática entre provedores.

Para ativar a OpenAI, cadastre `OPENAI_API_KEY` no Environment do serviço existente no Render e salve com deploy. A chave é criada em https://platform.openai.com/api-keys e deve permanecer no servidor. A API usa as cotas, os créditos e as permissões do projeto OpenAI; a assinatura do aplicativo ChatGPT não configura esse acesso automaticamente.

`OPENAI_MODEL` é opcional, com padrão `gpt-6.2-astra`. `OPENAI_REVIEW_MODEL` é opcional para usar outro modelo na correção das anotações. O modelo precisa estar disponível no projeto e ser compatível com Responses; o modelo do Instrutor também precisa aceitar web search. As respostas usam `store: false`.

No aplicativo, abra **Conectar IA / Escolher IA**, selecione **OpenAI (ChatGPT)** e toque em **Conectar**. O mesmo `NOTE_REVIEW_ACCESS_CODE` é usado para as duas IAs. Quem já conectou o dispositivo pode manter o campo do código vazio para reaproveitar o código salvo. A escolha só é salva após o servidor confirmar que o provedor está configurado.

O Instrutor preserva análise da seleção, conversa de sermão, histórico recente, salvamento em anotações e inserção explícita no sermão. As fontes da OpenAI aparecem como links clicáveis no texto e na lista de fontes. A revisão continua mostrando uma sugestão antes de aplicar a correção.

`/health` informa a configuração de cada provedor em `providers`, sem revelar chaves ou códigos. Isso não garante saldo disponível nem validade da chave junto ao provedor.

Validação: `node --test note-review/server.test.mjs note-review/instructor.test.mjs note-review/openai.test.mjs`.
