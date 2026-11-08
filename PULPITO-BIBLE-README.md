# Púlpito Bible — Bíblia de Estudo e Interpretação

> Projeto independente de estudo bíblico em português. Primeira versão publicada em https://pulpito-bible.onrender.com.

## Visão

Criar um ecossistema de leitura, exegese e ensino bíblico, sem trocar de aplicativo entre passagem, palavra original, análise gramatical, comentários, notas pessoais, exercícios e sermão. O sistema deve distinguir a evidência textual, a informação morfológica, a interpretação de estudiosos e a aplicação contemporânea.

## Produtos estudados e lições

- **YouVersion:** leitura, áudio, planos diários, notas, compartilhamento, comunidade e sincronização.
- **Bíblia JFA Offline:** foco em leitura em português e uso cotidiano, áudio, ferramentas de estudo e IA.
- **MyBible:** estudo profundo, dicionários Strong, comentários, referências cruzadas e janelas.
- **Logos Bible Software:** biblioteca teológica, guias, pesquisa textual e preparação de sermões.
- **Bible Hub:** interlinear, comentários paralelos, léxicos e concordâncias.
- **Blue Letter Bible:** investigação lexical e estudo bíblico com comentários e concordâncias.
- **BibleLine:** genealogias, personagens, relações familiares e cronologia.
- **BibleProject:** ensino visual, vídeos, trilhas e cursos.
- **Moed Bible:** experiências brasileiras com Bíblia, Strong, IA e esboços.
- **AndBible / STEP Bible:** bases linguísticas, modalidades offline, morfologia.
- **Bíblia Online e Bible Gateway:** leitores e pesquisas em diferentes traduções.

Oportunidade: **integrar ferramentas já existentes, ensinar a utilizá-las corretamente e tornar a pesquisa auditável**. Não se afirma que os recursos sejam mundialmente inéditos.

## O que já funciona nesta primeira versão

1. Leitura dos 66 livros via Midvash, com quatro traduções abertas: Almeida 1911, Bíblia Portuguesa Mundial, Open Nova Bíblia Viva e Nova Versão de Acesso Livre (respeitando licença atribuída pela API).
2. Navegação por livro e capítulo, seleção de versículo, busca básica por referência, fonte variável e tema escuro.
3. Cache local limitado de capítulos consultados.
4. Marcadores e anotações pessoais em localStorage, sem conta ou sincronização.
5. Demonstrações de análise morfológica verificadas: João 15:4 **μείνατε** (G3306; aoristo imperativo ativo, 2ª pessoa plural), João 15:5 **μένων** (G3306; particípio presente ativo), Gênesis 1:1 **בָּרָא** (H1254; Qal perfeito 3ms), **κλῆμα** (G2814) e **ἐν** (G1722).
6. Assistente pedagógico guiado por seis etapas com respostas salvas por passagem. **Não é IA generativa** nesta versão.
7. Cinco exercícios de exegese/gramática com feedback imediato e progresso local.
8. Criador de sermões: tema, referência, contexto, introdução, tópicos, aplicação e conclusão, com cópia/exportação TXT.
9. Páginas no próprio aplicativo com análise de concorrentes e mapa das implementações.

## Método de interpretação — sequência didática

1. **Delimite a passagem**: identifique início e fim da unidade literária.
2. **Observe o texto**: quem fala, a quem, onde, quando e por quê.
3. **Destaque as estruturas**: repetições, paralelismos, contrastes, conectivos e verbos.
4. **Leia o contexto imediato**: parágrafos e capítulos anteriores/posteriores.
5. **Identifique o gênero**: narrativa, poesia, sabedoria, apocalíptica, carta, profecia.
6. **Investigue o contexto histórico**: autor, destinatários, ambiente cultural e propósito.
7. **Estude a gramática**: função sintática, tempo, aspecto, modo, voz, pessoa, gênero e número — quando se aplicam.
8. **Consulte o original**: forma da palavra, lema, Strong e sentidos documentados, sem impor uma definição em todas as ocorrências.
9. **Compare traduções e testemunhos textuais** quando necessário e legalmente acessíveis.
10. **Formule a ideia central** em uma frase e fundamente com evidências do próprio texto.
11. **Confronte comentários e interpretações alternativas** sem transformar uma tradição em dado linguístico.
12. **Aplique com responsabilidade**: diferencie o significado original da aplicação moderna; anote o que permanece incerto.

### Exemplo: João 15:4–5

- **μείνατε** é imperativo aoristo ativo na segunda pessoa do plural.
- **μένων** é particípio presente ativo, nominativo masculino singular.
- O aoristo, isoladamente, **não** significa que a permanência seja um ato instantâneo. Aspecto e relação com a duração devem ser entendidos no contexto.
- Examinar João 15:1–8 e a unidade dos discursos de despedida; observar videira, ramos, permanência e fruto.
- Distinguir o sentido da metáfora da aplicação a situações pessoais.

### Exemplo: Gênesis 1:1

- **בָּרָא** = Qal perfeito, terceira pessoa masculina singular, H1254.
- Não equiparar automaticamente o perfeito hebraico a um único tempo verbal do português.
- Investigar a estrutura narrativa e o contexto imediato antes de construir conclusões teológicas isoladas.

## Grandes expansões planejadas

- Importação completa de **STEPBible TAGNT, TAHOT, TBESG, TBESH, TEGMC e TEHMC**, com atribuição da licença CC BY 4.0, indexação e validação do alinhamento entre forma, lema, código Strong e versículo.
- Janela Strong interativa também em comentários, PDF, estudos e sermões; identificação de correspondências a partir de palavras portuguesas com confirmação humana.
- Biblioteca Teológica com PDFs, comentários, páginas, histórico de leitura, favoritos e marcações.
- Assistente interpretativo conversacional com IA conectada a fontes verificadas, capaz de oferecer perguntas socráticas, feedback de argumentação, perspectivas interpretativas e incertezas. Requer backend, proteção de dados, autenticação e integração com provedor de IA.
- Exercícios adaptativos, trilhas de aprendizado, caderno por usuário, exportação PDF e sincronização de dados.
- Atlas bíblico, genealogias, cronologia com incerteza histórica, biografias e relações interativas.
- Áudio, leitura inclusiva, pesquisas por fala e câmera e offline ampliado.
- Integração segura e opt-in ao **Púlpito Studio/Púlpito Expositivo**, sem alterar seus PDFs, sermões ou dados existentes.

## Bases e licenças

- Midvash API: https://api.midvash.com/pt-br — versões de uso livre, crédito junto ao texto via meta.copyright; para traduções CC BY-SA, obedecer aos termos.
- STEPBible Data: https://github.com/STEPBible/STEPBible-Data — CC BY 4.0 e observações de cada dataset.
- Exemplos de morfologia: https://biblehub.com/text/john/15-4.htm , https://www.openbible.com/text/john/15-5.htm e https://biblehub.com/genesis/1-1.htm.

**Atenção aos direitos autorais:** versões como NVI, ARA, NVT e outras com todos os direitos reservados não estão importadas. Dependem de autorização antes de sua distribuição.

## Infraestrutura e integridade

- Render Static Site: https://pulpito-bible.onrender.com
- Código: branch `pulpito-bible` no repositório `leonardo120719/mercado-app.`; a branch `main` e os serviços Mercado existentes não foram editados.
- Arquivos da aplicação: `pulpito.html`, `styles.css`, `app.js`.
- Build: copiar os três arquivos para `public/index.html`, `public/styles.css` e `public/app.js`.
- Persistência local: `localStorage`; não existe autenticação, conta ou backup em nuvem ainda.
- O cache de capítulos é limitado, e a primeira leitura de um capítulo não salvo requer internet.
- O leitor depende da disponibilidade da API Midvash; o comportamento foi testado com dados simulados e a implantação Render foi confirmada, mas as chamadas reais do navegador ainda requerem validação de ponta a ponta.

## Critérios para as próximas entregas

Não apresentar análises morfológicas não confirmadas como se fossem automáticas ou exaustivas. Nunca inferir que um número Strong determine o sentido de um texto. A interface deve sinalizar recursos demonstrativos, funcionalidades ativas e futuras. Guardar histórico e material pessoal com políticas claras de privacidade, exportação e eliminação.


## Atualização do leitor inspirada no MyBible — 08/11/2026

A experiência de leitura foi reorganizada com cabeçalho azul compacto, seletores de livro/capítulo/tradução, navegação por capítulos, barra de ações de estudo, texto serifado em fundo sépia/branco/noturno e dock de ações de favoritos, notas, sermão e interpretação. Inclui ajuste de fonte, modo contínuo ou separado por versículo, tela de leitura focada, opção de duas traduções paralelas, painel de comentários didáticos e sugestões de referências cruzadas.

### Strong ao lado da palavra em português

- Exemplos de vínculo morfológico auditado: João 15:4 (**permanecei**, G3306 e **ramo**, G2814), João 15:5 (**permanece**, G3306), Gênesis 1:1 (**criou**, H1254), Salmos 73:3 (**ímpios**, H7563).
- O número aparece **imediatamente depois da palavra** em português; a própria palavra também é clicável para abrir o dicionário quando números estão ocultos.
- Pop-up lexical contém forma original, lema, transliteração, classe, morfologia, contexto, referência externa e ações de copiar, aprofundar ou inserir no sermão.
- Em Salmos 73, o painel de comentários apresenta um exemplo clicável H7563 que não pretende etiquetar automaticamente todo comentário em PDF.
- **Limite atual:** as associações são explicitamente anotadas em poucas passagens. O programa NÃO gera automaticamente códigos para todos os termos, capítulos, comentários ou traduções. Será necessário um pipeline que alinhe de modo confiável as ocorrências em textos hebraico/grego às palavras da tradução portuguesa, por edição, com revisão de ambiguidades.
- **Inspiração funcional:** os recursos do MyBible foram estudados a partir de sua documentação oficial em https://mybible.zone/android/tips/main/. A interface mantém marca, arte e código próprios do Púlpito Bible.

As preferências de leitura e estudo permanecem no armazenamento local; ainda não há sincronização ou importação automática da biblioteca do Púlpito Expositivo.


## Biblioteca de módulos externos — ZIP / SQLite3 / JSON

Implementação independente (branch \`pulpito-bible\`, novembro de 2026):

**Formatos aceitos**

- ZIP contendo um ou vários arquivos MyBible \`.SQLite3\` não criptografados. Detecta as tabelas \`verses\` (Bíblias) e \`commentaries\` (comentários). Em MyBible, números de livros usam uma tabela numérica própria (por exemplo, Gênesis=10; Salmos=230; Mateus=470; João=500), mapeada aos 66 livros protestantes. Módulos de livros deuterocanônicos e outros formatos ainda não são interpretados.
- Arquivo \`.SQLite3\` avulso com o mesmo esquema.
- ZIP do Púlpito Bible com \`module.json\` (tipo, nome, sigla, idioma, licença) e \`verses.json\` ou \`comments.json\` contendo um array de registros; também aceita objeto JSON único contendo \`verses\`, \`commentaries\` ou \`comments\`.

**Persistência e comportamento**

- Os dados do módulo (versículos e comentários) são processados no navegador e gravados em IndexedDB, sem upload ao servidor; o usuário conserva os direitos de uso do arquivo de origem.
- Versículos ficam indexados por módulo/livro/capítulo; comentários, por módulo/livro, com regras de abrangência para capítulo, versículo e intervalos.
- O seletor do leitor exibe Bíblias instaladas; um painel de comentários acompanha a passagem atual. Há suporte a tradução paralela instalada e inserção de trechos do comentário no sermão.
- Marcadores Strong \`<S>3306</S>\` incluídos por um módulo original são renderizados como número clicável ao lado do termo. **O Strong sozinho não fornece forma, voz, modo ou tempo verbal; sem alinhamento morfológico verificado, a janela sinaliza essa limitação, sem inventar dados.**
- Preferência de não usar serviços de terceiros para armazenar conteúdo privado: nenhum conteúdo importado segue para o servidor Render no fluxo implementado.
- Limite de arquivo 70 MB e limite aproximado de descompactação ZIP 110 MB. O navegador pode impor outras restrições de memória/armazenamento. Arquivos protegidos por senha, criptografados ou formatos MySword/e-Sword não estão contemplados.

**Traduções requisitadas (catálogo / instalação pelo usuário):**

- NVI: Nova Versão Internacional (Biblica) — não incluída; autorização necessária.
- NTLH: Nova Tradução na Linguagem de Hoje (SBB) — não incluída; autorização necessária.
- NAA: Nova Almeida Atualizada (SBB) — não incluída; autorização necessária.
- ACF: Almeida Corrigida Fiel (Sociedade Bíblica Trinitariana) — não incluída; autorização necessária.
- King James 1611: não incluída; observar requisitos territoriais e edição específica (por exemplo, regras do Reino Unido).

A aplicação fornece um catálogo identificando status, **não** hospeda downloads não autorizados, nem converte ou desbloqueia módulos criptografados. Usuários podem instalar arquivos que tenham direito de utilizar. Informações de licença fornecidas pelo arquivo não substituem verificação jurídica.

**Dependências de cliente**

- JSZip v3.10.1 (CDN) para arquivos ZIP.
- sql.js v1.13.0 (CDN/WASM) para interpretar SQLite3 sem backend.
- IndexedDB nativo para armazenamento local persistente.

Se a rede bloquear os scripts na primeira utilização, a importação ZIP/SQLite não será possível; os arquivos já instalados continuarão legíveis, quando o site e seu código estiverem disponíveis.

**Referências**

- Formato oficial: https://mybible.zone/doers/ (link para especificação)
- Importação de arquivos: https://mybible.zone/android/tips/main/import/
- Comentários: https://mybible.zone/android/tips/modules/commentary-modules/
- King James no Reino Unido: https://www.gov.uk/government/publications/copyright-notice-duration-of-copyright-term/copyright-notice-duration-of-copyright-term

**Verificação da versão**

Os scripts foram verificados quanto à sintaxe e à interface em um ambiente de teste com dados substitutos. A compatibilidade com ZIPs SQLite3 variados dependerá de testar arquivos reais, por variações de metadados, tags e versificação.


## Toolbar contextual com estado global — 8 de novembro de 2026

### Arquitetura adotada

Como o projeto atual é uma PWA estática em HTML/CSS/JavaScript, a toolbar utiliza um store global observável, independente de framework. Essa escolha preserva o site atual e evita migrar todo o leitor para React Native/Flutter ou depender de bibliotecas adicionais de estado.

- \`toolbar-types.d.ts\`: contrato TypeScript de \`ToolbarState\`, \`ToolbarActionId\`, \`ToolbarActions\` e \`ToolbarStore\`.
- \`toolbar-store.js\`: implementação global \`window.PBToolbar\`, assinaturas seletivas \`subscribe(selector, callback)\`, ações puras, prioridades e renderização condicional.
- \`app-core.js\`: integração com leitor, navegação, áudio por síntese de fala do navegador, seleção, compartilhamento, comentários, Strong, notas e cores.
- \`modules.js\`: biblioteca de traduções/comentários externos baseada em IndexedDB.
- \`app.js\`: bundle contendo esses três scripts na ordem adequada, pois o serviço Render já existente só publica \`app.js\`; **corrige a falha anterior que omitia \`modules.js\` e impedia a abertura do aplicativo**.
- \`styles.css\`: interface mobile compacta em tons de cinza-escuro, tipografia de leitura e tema sépia; possui modo tela cheia e toolbar de seleção.

### Estado e prioridades

\`\`\`ts
interface ToolbarState {
  currentVerseSelection: readonly string[];
  readingMode: "normal" | "study" | "fullscreen";
  audioState: "idle" | "playing" | "paused";
  fontSize: number; 
  theme: "light" | "dark" | "sepia";
  highlights: Readonly<Record<string, "yellow" | "green" | "blue" | "pink" | "purple">>;
}
\`\`\`

A ordem implementada é determinística:

1. **Seleção ativa**, incluindo sobre fullscreen → [Copiar, Compartilhar, Marcar, Nota, Limpar].
2. **Modo normal** → [Livro/Capítulo/Versão, Fonte, Áudio, Pesquisa, Menu].
3. **Modo estudo** → [Livro/Capítulo/Versão, Fonte, Áudio, Strong, Comentários, Notas, Menu].
4. **Fullscreen** sem seleção → botão flutuante de menu; o leitor usa a maior área disponível.

Exemplo funcional:

\`\`\`js
window.PBToolbar.actions.setSelection(["JN.3.16"]);
window.PBToolbar.actions.applyHighlight("yellow");
console.log(window.PBToolbar.getState().highlights["JN.3.16"]);
// "yellow"
console.log(window.PBToolbar.getState().currentVerseSelection);
// [] — a barra volta ao modo de leitura.
\`\`\`

### Persistência, performance e recuperação

- O store persiste configurações e marcadores coloridos no \`localStorage\` do dispositivo, mas não persiste seleção ativa nem estado de áudio entre sessões.
- A toolbar utiliza um único listener delegado por evento, com \`subscribe\` e atualização apenas quando seu estado muda. **Rolar o texto não altera o estado global e não deve redesenhar a barra**.
- Elementos de versículo recebem \`data-usfm\` e a classe visual é atualizada diretamente ao selecionar/aplicar cor, sem recriar o capítulo.
- Compatível com textos da API Midvash enviados tanto como arrays de **strings** quanto como objetos de versículo. O cache v2 evita reaproveitar capítulos vazios produzidos pela versão anterior.
- O modo de áudio utiliza a API \`speechSynthesis\` do navegador. Disponibilidade e vozes dependem do aparelho; não é um módulo de narração pré-gravada.
- O visual foi inspirado na organização do MyBible com marca e implementação próprias. Não é cópia de recursos proprietários nem promessa de identidade visual pixel a pixel.
- A integração Strong é limitada às ocorrências verificadas/etiquetadas pelos módulos. O número não fornece por si só o tempo verbal, a voz ou o sentido contextual.

### Diagnósticos realizados

Falhas reais encontradas no código anterior: (a) dependência \`modules.js\` não incluída no build do Render; (b) leitor interpretava respostas string da API como objetos e podia mostrar versículos em branco; (c) a função \`annotateVerse\` estava ausente, causando erro de execução ao abrir capítulos. As três foram corrigidas no bundle.

Testes de lógica realizados sem navegador real: parsing do bundle, inicialização simulada do aplicativo e da biblioteca, renderização dos versículos, toolbar em estado normal/estudo/seleção/fullscreen, destaque persistido e limpeza automática da seleção.

A validação de toque e viewport em iPhone real depende de abrir o site num navegador móvel; o deploy ativo por si só não garante que todas as funções da plataforma rodem no aparelho.


## Correção do erro "SQLite sem tabela verses/commentaries" — dicionários Strong

A importação original só reconhecia \`verses\` e \`commentaries\`. Os léxicos do MyBible usam a tabela \`dictionary(topic, definition)\`. A versão atual:

- Identifica SQLite3 com tabela \`dictionary\` como módulo \`dictionary\`.
- Normaliza os verbetes Strong \`H007563\` → \`H7563\`, \`G03306\` → \`G3306\`, mantendo os demais tópicos pesquisáveis.
- Abre o IndexedDB \`PulpitoBibleModules\` **versão 2**, acrescentando a coleção \`lexicon\` sem eliminar as coleções pré-existentes \`modules\`, \`chapters\` e \`commentaries\`.
- Salva verbetes com chave \`moduleId/topic\`; permite consultar vários dicionários instalados e remover módulos sem apagar dados de outros módulos.
- Oferece campo de pesquisa Strong na página Módulos e mostra o conteúdo do léxico no popup do número Strong do leitor, com texto escapado para evitar executar HTML do arquivo.
- Também aceita pacotes Púlpito Bible JSON do tipo \`dictionary\` com \`dictionary\` ou \`entries\` como lista de \`{topic, definition}\`.
- Não confunde glossário lexical com morfologia contextual: tempo, modo e voz não são atribuídos a partir de uma entrada genérica de Strong.
- Arquivos que contenham **somente** tabela \`words\` (mapeamento de variantes de palavras) são identificados com mensagem específica, mas ainda requerem o dicionário \`dictionary\` correspondente.

O diagnóstico se baseia no erro exibido em uma captura de tela, não na análise do ZIP específico do usuário. Compatibilidade integral só pode ser confirmada após testar o arquivo real. Referências: https://mybible.zone/android/tips/modules/dictionary-modules/ e https://mybible.zone/doers/


## Estudo conectado — palavras, léxicos Strong e comentários por versículo

O fluxo de leitura tem integração cruzada (11/2026), preservando a navegação horizontal sem restaurar menu lateral:

1. **Toque na palavra portuguesa:** o leitor consulta verbetes pela grafia exata, sem inventar um código Strong. Abre um painel inferior com os resultados dos dicionários instalados e os comentários de módulos vinculados ao versículo onde a palavra aparece.
2. **Toque em um versículo:** a barra contextual segue funcionando para copiar, marcar, compartilhar e anotar. Além disso, surge um painel inferior com os comentários instalados para a referência e as definições de códigos Strong *efetivamente etiquetados* no versículo (módulo MyBible ou correspondências previamente verificadas).
3. **Toque em Strong:** a janela Strong existente passa a incluir também os comentários dos módulos ligados ao versículo, além dos verbetes dos dicionários instalados.
4. **Do painel ao sermão:** é possível inserir a referência, a palavra pesquisada e trechos integrais de comentários no contexto do Criador de Sermões; o usuário pode anotar a passagem diretamente.
5. **Referências explícitas nos verbetes e comentários:** padrões G/H seguidos de número tornam-se botões para consultar o Strong correspondente, sem sugerir morfologia não verificada.
6. **Sem coluna lateral:** o painel usa uma janela inferior responsiva, fechável, sem alterar a estrutura da barra superior ou excluir os recursos anteriores.

**Arquitetura:** \`connections.js\` implementa o subsistema de estudo conectado, delegado por eventos e carregado no bundle na ordem \`modules.js\` → \`toolbar-store.js\` → \`connections.js\` → \`app-core.js\`. O código escapa o texto importado e não executa marcação HTML de comentários. A instalação de módulos continua armazenada em IndexedDB.

**Limites:** verbetes portugueses usam pesquisa exata (não há lematizador, stemming nem ligação automática confiável entre todas as palavras em português e grego/hebraico). Os códigos Strong aparecem apenas quando fornecidos por um módulo ou vinculados por amostras verificadas. Comentários abrangentes/intervalos dependem do formato e dos metadados do módulo instalado. O funcionamento com os arquivos reais do usuário exige validação no navegador em que foram importados.


## Janelas flutuantes do estudo — estilo funcional MyBible

Atualização da interface das janelas abertas no leitor (novembro de 2026):

- \`window-ui.js\`: controlador comum das janelas de estudo, com navegação em abas, recolher, ampliar e fechar. No desktop, o título permite arrastar a janela com mouse; uma janela aberta junto a uma palavra é posicionada perto do termo quando há espaço.
- \`connections.js\`: painel de palavras e versículos agora tem aparência de uma pequena janela flutuante com cabeçalho cinza-escuro, referência, abas **Dicionário** e **Comentários**, controles próprios e ações de nota, sermão e módulos.
- \`app-core.js\`: a janela do Strong usa o mesmo padrão e alterna entre **Análise**, **Dicionários** e **Comentários**. Conserva as consultas aos módulos SQLite/ZIP/JSON previamente instalados, com leitura contextual e exportação para o sermão.
- \`styles.css\`: geometria adaptável. Em celular, janela compacta flutuando sobre o terço inferior/metade da leitura, com expansão opcional. No desktop, janela sobreposta ao lado do texto, com possibilidade de movê-la.
- A área de fundo é transparente e a janela não bloqueia toda a Bíblia. O modo ampliado toma quase toda a tela, enquanto o modo recolhido mantém o cabeçalho acessível.
- Identidade visual do **Púlpito Bible** mantida; inspiração na ergonomia do MyBible, sem copiar marcas, ícones proprietários ou arquivos do produto.
- Os testes realizados verificaram parsing, inicialização simulada, alternância de abas e estados minimizado/maximizado/fechado. A conferência de proporções e posicionamento em iPhone e Android reais ainda deve ser feita no dispositivo.

Para manutenção, a compilação do deploy concatena na ordem \`modules.js\`, \`toolbar-store.js\`, \`window-ui.js\`, \`connections.js\` e \`app-core.js\` em \`app.js\`, usado pela implantação estática atual do Render.


## Compatibilidade com arquivo grande do Champlin — 08/11/2026

O arquivo fornecido pelo usuário, \`Champlin-c.commentaries.zip\` (aproximadamente 37,3 MiB), foi inspecionado **localmente**, sem envio ao repositório ou ao servidor público:

- ZIP com um SQLite3 MyBible legítimo, \`Champlin-c.commentaries.SQLite3\`, de **130.318.336 bytes** descompactado.
- Banco com as tabelas \`info\`, \`android_metadata\`, \`commentaries\`; **31.690 linhas de comentário**, 66 livros, idioma pt e título interno “Comentário Champlin Completo AT e NT”.
- Limites antigos: ZIP descompactado acima de 110 MiB e SQLite individual acima de 60 MiB eram recusados; a leitura \`SELECT *\` em JavaScript materializava todo o livro.
- Agora: ZIP descompactado de até 210 MiB; SQLite individual de até 160 MiB; máximo 70 MiB para ZIP recebido; entradas com tamanho/composição verificados.
- Banco local IndexedDB evoluído para versão 3 com coleção \`commentaryEntries\` e índice composto \`[moduleId, book, chapter]\`, **sem apagar as tabelas antigas**. O comentário é salvo em lotes pequenos; a leitura carrega somente os registros correspondentes ao capítulo solicitado, aplicando os limites de versículo.
- Os campos \`book_number\`, \`chapter_number_from/to\`, \`verse_number_from/to\`, \`marker\` e \`text\` são interpretados; textos longos não são cortados artificialmente.
- O importador também aceita um formato otimizado de ZIP \`pulpito-commentary-chapters-v1\`, com \`module.json\` e arquivos \`chapters/<número-livro>/<capítulo>.json\`. Esse arquivo continua **local ao usuário**, não hospedado pelo site nem incluído no código-fonte.
- No tratamento do arquivo original, os 31.690 registros foram conferidos contra os 31.690 registros do ZIP convertido, com igualdade de conteúdo inclusive no campo \`text\`. Linhas vazias/sem capítulo válido não são armazenadas como comentários pesquisáveis.
- O SQLite original é compatível, mas a descompactação de ~124 MiB e criação da base SQL em WebAssembly ainda pode consumir muita memória em iPhones. **Recomenda-se o ZIP otimizado** para navegadores móveis.
- Se faltar espaço no armazenamento do dispositivo, a instalação pode falhar; a aplicação não envia o material para um backend. Sempre guarde uma cópia do ZIP e use somente obras cuja utilização esteja autorizada.
- Testes com simulação de IndexedDB validaram a migração não destrutiva, a importação em lotes de comentários SQLite e a recuperação de comentários por capítulo/versículo. O formato ZIP otimizado foi validado com sua estrutura real e um pacote sintético importado.

O ZIP pessoal e seus textos **não foram enviados ao GitHub**.


## Leitor dividido inspirado na gravação MyBible — 08/11/2026

O modo de estudo ganhou um layout vertical com **Bíblia acima e comentário do módulo selecionado abaixo**, com rolagens independentes, mantendo a navegação principal na barra superior. A gravação enviada nesta conversa serviu como referência funcional.

- Arquivo \`split-study.js\`: controlador independente das janelas empilhadas, responsável por montar a área inferior, apresentar os comentários, oferecer seleção e busca de módulos, trocar entre anterior/próximo, sincronizar referência e permitir redimensionamento do divisor por arraste ou teclado (setas no separador).
- \`app-core.js\`: disponibiliza o modo dividido por padrão (\`splitStudy: true\`) e registra preferências locais \`commentModuleId\` e \`splitPct\` sem apagar configurações anteriores. O botão **Comentários** na toolbar superior abre/fecha o modo dividido; o menu **Painel dividido** fornece outro acesso.
- \`modules.js\`: \`getCommentaries(book, chapter, verse, moduleId?)\` agora admite filtrar por módulo; os consumidores existentes sem o quarto argumento permanecem compatíveis.
- \`connections.js\`: quando o modo dividido está ativo, tocar num versículo atualiza o painel inferior em vez de abrir automaticamente outra janela flutuante. Toque em palavra ou número Strong continua habilitando consulta lexical independente.
- \`styles.css\`: lista de comentários em fundo cinza-escuro que sobrepõe apenas a janela inferior, com módulo ativo destacado em amarelo e campo de busca. Cada área tem seu próprio scroll; o divisor é redimensionável; desktop e telas móveis recebem dimensões adaptativas.
- Não se copiam módulos proprietários ou se hospedam comentários. Os itens da lista são derivados **somente dos módulos já instalados neste navegador**. Se não houver módulos instalados, a área inferior exibe o caminho de importação.
- Existe integração direta com o Criador de Sermões pelo botão de cada comentário, e comando de copiar texto.

**Validação:** sintaxe do bundle completo; teste do controlador com dois módulos de comentários simulados (Champlin e Matthew Henry), incluindo mudança do módulo sem mudar a referência, atualização de João 15:4 para João 15:5 e inicialização do app com a área dividida. O resultado visual final ainda exige conferência no navegador do usuário. 
