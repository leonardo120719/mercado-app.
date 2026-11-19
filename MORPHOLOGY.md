# Morfologia, Strong e tutor hermenêutico

## Consulta ao corpus

`morphology.js` lê os arquivos TSV TAGNT e TAHOT de STEP Bible / Tyndale House, CC BY 4.0, na revisão `5de0a47f35f0fc13dfe1430d104e5db8a4285f9c` do repositório https://github.com/STEPBible/STEPBible-Data.

Os seis pacotes reconhecidos cobrem os 66 livros. A verificação dos arquivos dessa revisão reconheceu 447.729 linhas de ocorrências, incluindo variantes textuais, em 31.219 grupos de referência. Isso não representa 447.729 palavras distintas nem um alinhamento com uma tradução portuguesa.

O aplicativo inclui a expansão de 1.644 códigos gregos e 921 códigos hebraicos/aramaicos extraída das tabelas TEGMC/TEHMC. As descrições da fonte são preservadas, e campos conhecidos são apresentados em português. Os dados de tempo/forma, modo, voz, pessoa, número, gênero, caso, estado e tronco verbal vêm dos códigos da ocorrência. Não se infere morfologia pelo número Strong. Códigos sem expansão permanecem identificados como desconhecidos.

Aspecto não é um campo separado nas tabelas importadas: a interface registra essa limitação em vez de inventar um valor. As funções sintáticas de sujeito, objeto e dependência também não são anotadas por este importador. O botão de análise contextual pede ao Instrutor que diferencie os dados registrados das hipóteses sintáticas e aspectuais.

As amostras incluídas são 61 ocorrências de João 15:4–5 e Gênesis 1:1, extraídas da mesma revisão. As glosas do corpus permanecem em inglês. Prefixos, sufixos, códigos estendidos, edições e metadados de referência são mantidos. O corpus usa numeração NRSV e registra variantes de versificação; o aplicativo avisa sobre possíveis diferenças em outras Bíblias.

Em **Texto original & Strong**, a pessoa pode baixar um dos seis pacotes oficiais (aproximadamente 9,5 a 24,5 MB cada), pesquisar referência/Strong/lema exato e usar a base offline. Os arquivos oficiais são verificados por tamanho e, quando Web Crypto está disponível, pelo SHA-1 de blob Git. Também é possível importar `.txt`/`.tsv` local, cuja procedência é identificada como arquivo importado. Instalações são transacionais em IndexedDB; cancelamento e arquivos inválidos preservam a instalação anterior. Remover um pacote só remove esse corpus, sem tocar nas anotações ou estudos.

Alterações em relação às fontes: extração das descrições de códigos, seleção de passagens de amostra, conversão TSV para índices locais e tradução de rótulos. Não foram alteradas as análises morfológicas originais. As fontes, revisão e atribuição são exibidas na interface e nos arquivos de dados.

## Tutor

As seis etapas existentes foram preservadas. O seletor permite guardar respostas pelo capítulo inteiro (padrão, compatível com estudos antigos) ou pelo versículo selecionado. O tutor envia à IA a etapa, o critério, a resposta do aluno, até seis respostas anteriores e o texto disponível da passagem. A IA deve apontar evidências, suposições e perguntas para aprofundar; não altera a resposta do aluno.

A conversa fica nesta sessão, separada por passagem e etapa. Respostas atrasadas ficam com o contexto que as originou. A interface identifica quando uma avaliação foi feita para uma versão anterior da resposta. Salvar uma avaliação na anotação usa o histórico/desfazer existente. A análise por IA depende da chave, das permissões e da cota do provedor configurado; a consulta local ao corpus funciona sem IA.

## Validação

- `node --test morphology.test.cjs`
- `node --test note-review/tutor.test.mjs note-review/instructor.test.mjs note-review/openai.test.mjs note-review/server.test.mjs`
- Os testes de interface cobriram instalação oficial com hash, pesquisa indexada, recarga offline, importação hebraica, rejeição de substituição inválida, remoção/cancelamento e isolamento das respostas do tutor por passagem.
