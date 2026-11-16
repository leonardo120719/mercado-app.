# Instrutor de Estudo Bíblico

Execute com Node.js 22 ou superior: `node instructor-server/server.mjs`.
Configure `OPENAI_API_KEY` no servidor, `INSTRUCTOR_ACCESS_CODE` com pelo menos 20 caracteres e, opcionalmente, `OPENAI_MODEL` com acesso à Responses API e à ferramenta web_search. O servidor escuta em `PORT` ou 8080. Use HTTPS e `GET /health` para verificar o serviço.

O piloto aceita o site oficial e o APK Android em `https://localhost`. Bases de teste podem ser liberadas com `INSTRUCTOR_ORIGINS` (origens separadas por vírgula). Para usar, selecione o versículo na Bíblia, abra Instrutor e informe o endereço HTTPS do serviço e o código de acesso.

O código de acesso é compartilhado com os usuários autorizados no piloto. Ele não é a chave da OpenAI. O serviço limita chamadas por instância, portanto para lançamento público use autenticação por usuário e limites distribuídos. As chamadas à OpenAI são cobradas no projeto associado à chave.
