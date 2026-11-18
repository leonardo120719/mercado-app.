# Instrutor bíblico e de sermões

O serviço existente `pulpito-gemini` atende `/api/revisar-nota` e `/api/instrutor`. Ambos usam `GEMINI_API_KEY` e `NOTE_REVIEW_ACCESS_CODE` somente no Render. A conexão do dispositivo é feita uma vez por **Conectar IA** e serve para as duas funções. `INSTRUCTOR_MODEL` é opcional e usa `GEMINI_MODEL` ou `gemini-flash-latest` como padrão.

Na Bíblia, selecionar versículos e escolher **Instrutor** leva o texto selecionado, a referência e sugestões de referências cruzadas do índice existente. O usuário pode pedir análise completa, palavras e verbos, contexto cultural, passagens relacionadas, Pais da Igreja e aplicação. Perguntas seguintes levam as últimas seis mensagens. A consulta usa no máximo 6.000 caracteres do texto selecionado; seleções maiores mostram essa limitação.

Em **Sermões → Perguntar ao Instrutor**, a conversa fica ao lado do editor em telas largas e em um painel recolhível no celular. A pergunta acompanha a referência, o tema e, se houver, o trecho selecionado no campo do sermão. Só esse trecho é enviado, até 4.000 caracteres; o rascunho inteiro não é enviado automaticamente. Inserir uma resposta é uma ação explícita e acrescenta o texto ao campo escolhido.

O Gemini pode pesquisar com Google Search. As fontes retornadas aparecem como links e as sugestões de pesquisa ficam em uma moldura isolada sem permissão de executar scripts. A presença de links não garante que a interpretação esteja correta. Quando não há fontes retornadas, a interface informa a limitação. O modelo é instruído a não inventar morfologia, costumes, citações patrísticas ou referências, e a distinguir texto, interpretação e aplicação.

Salvar uma resposta na anotação preserva o conteúdo anterior, acrescenta as fontes e usa o sistema existente de versões e desfazer. Uma seleção de vários versículos fica vinculada ao primeiro versículo, com a referência completa no texto da nota. A conversa fica em memória até recarregar o aplicativo ou começar outra; salvar na anotação ou no sermão conserva a resposta escolhida.

Limites compartilhados: duas consultas simultâneas e 12 solicitações por minuto por instância. O uso depende dos modelos, permissões e cotas da conta Gemini. Não há alternativa silenciosa a um provedor diferente.

Testes: `node --test note-review/server.test.mjs note-review/instructor.test.mjs`.

Para um teste real do servidor sem revelar credenciais, defina temporariamente `INSTRUCTOR_SELF_TEST=1` no Render e faça deploy. O processo analisa uma pergunta sintética sobre João 3:16 e registra somente `INSTRUCTOR_SELF_TEST` com o resultado, a presença de fontes e a quantidade de fontes. Remova a variável após o teste para evitar novas consultas em outros deploys.
