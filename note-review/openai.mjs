import {instructorInstructions, normalizeStudy} from './instructor.mjs';

async function responseWithOpenAI(payload, {apiKey, model = 'gpt-6.2-astra', fetcher = fetch, timeout = 115000}) {
 const response = await fetcher('https://api.openai.com/v1/responses', {
  method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey},
  body: JSON.stringify({model, store: false, ...(/^gpt-(5|6)/.test(model) ? {reasoning: {effort: 'low'}} : {}), ...payload}),
  signal: AbortSignal.timeout(timeout)
 });
 if (!response.ok) {
  const error = new Error(response.status === 429 ? 'A OpenAI informou limite de uso ou saldo insuficiente. Confira as cotas e os créditos da API.' : [401,403].includes(response.status) ? 'A OpenAI recusou o acesso. Confira a chave OPENAI_API_KEY e as permissões no Render.' : 'A OpenAI não conseguiu concluir a consulta. Confira o modelo e tente novamente.');
  error.status = response.status === 429 ? 429 : 502; throw error;
 }
 const data = await response.json();
 if (data.status !== 'completed') throw new Error('A resposta da OpenAI não foi concluída. Tente uma pergunta mais específica.');
 const parts = (data.output || []).filter(item => item.type === 'message').flatMap(item => item.content || []).filter(p => p.type === 'output_text' && typeof p.text === 'string');
 if (!parts.length || parts.reduce((n,p) => n+p.text.length,0) > 40000) throw new Error('A OpenAI não retornou uma resposta válida.');
 return parts;
}
function source(annotation) {
 try {const url = new URL(annotation.url); return url.protocol === 'https:' && !url.username && !url.password ? {url: url.href, title: String(annotation.title || url.hostname).slice(0,300)} : null;} catch {return null;}
}
export async function analyzeWithOpenAI(input, options) {
 const study = normalizeStudy(input);
 const parts = await responseWithOpenAI({instructions: instructorInstructions, input: JSON.stringify(study), max_output_tokens: 12000,
  tools: [{type: 'web_search', filters: {allowed_domains: ['newadvent.org','ccel.org','tertullian.org','stepbible.org','biblegateway.com','biblehub.com','perseus.tufts.edu','bibleodyssey.org']}}], tool_choice: 'required'}, options);
 const sources = new Map();
 const passages = parts.map(part => ({text: part.text, annotations: (part.annotations || []).filter(a => a.type === 'url_citation' && source(a)).map(a => {
  const item = source(a); sources.set(item.url, item);
  return {...item, type: 'url_citation', start_index: a.start_index, end_index: a.end_index};
 })}));
 return {provider: 'openai', passages, sources: [...sources.values()].slice(0,30), grounded: sources.size > 0, searchSuggestions: '', incomplete: false};
}
export async function reviseWithOpenAI(text, instructions, options) {
 const parts = await responseWithOpenAI({instructions, input: text, max_output_tokens: 8000}, {...options, timeout: 80000});
 const result = parts.map(p => p.text).join('\n');
 if (!result.trim() || result.length > 20000) throw new Error('A OpenAI não retornou uma revisão válida.');
 return result;
}
