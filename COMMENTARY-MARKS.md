# Marcações pessoais nos comentários

Selecione um trecho de um comentário aberto e escolha **Amarelo**, **Verde** ou **Azul** na barra contextual. **Copiar trecho** copia somente a seleção. Tocar em uma marcação existente reabre suas ferramentas. A marcação funciona no painel de comentários, nos painéis de estudo, no leitor de resultados de pesquisa e nas janelas sincronizadas.

O **Diário Histórico** inclui a seção **Marcações nos comentários**, com todos os trechos salvos, módulo, passagem, data e cor. A pesquisa e o filtro de livro se aplicam à seção. **Abrir no trecho marcado** seleciona o módulo e a passagem, localiza a ocorrência, rola até ela e a destaca. As marcações não são limitadas pelo histórico de acessos. A consulta direcionada procura a entrada marcada mesmo quando ela está além do limite normal de resultados por passagem.

Os dados ficam em `state.commentaryHighlights`, no armazenamento pessoal já utilizado pelo aplicativo e incluído no backup de estado existente. Não alteram os arquivos importados. Não há nova sincronização remota implícita. O conteúdo pode ser consultado offline quando o aplicativo e o módulo estão instalados. Se o módulo for removido, o registro continua no diário e orienta sua reinstalação. O backup de estado não substitui o backup dos módulos.

Cada seleção guarda módulo, intervalo de referência da entrada, identidade do texto-fonte, trecho exato, offsets e contexto anterior/posterior. O retorno não escolhe uma citação repetida ambígua. Se o texto-fonte mudar e não for possível localizar o trecho com segurança, o aplicativo avisa e mantém o registro. Mudanças de cor sobrepostas preservam as partes não selecionadas. Remover uma marcação pode ser desfeito pela ação da seção do diário durante a sessão.

## Verificação

As verificações de DOM usam `jsdom`, apenas para desenvolvimento:

```sh
npm install --prefix /tmp/comment-marks-check jsdom --no-audit --no-fund
NODE_PATH=/tmp/comment-marks-check/node_modules node --test commentary-marks.test.cjs
```

Nove testes cobrem ancoragem, citações repetidas, identidade entre pesquisa e leitura, cores sobrepostas, seleção atravessando links, cópia, recarga persistente, retorno ao trecho, remoção/desfazer, falha de escrita, escape de conteúdo e exibição de todas as marcações. As integrações de scripts, precache, cópia para o APK e sincronização do site foram verificadas. A verificação de DOM não substitui um teste manual em cada aparelho.
