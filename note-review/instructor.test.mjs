import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeWithGemini, normalizeStudy} from './instructor.mjs';
import {createReviewServer} from './server.mjs';
const accessCode='test-instructor-device-code-at-least-20';
function grounded() {return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'private thoughts'},{text:'João 3:16 deve ser lido com 3:14–18.'}]},groundingMetadata:{groundingChunks:[{web:{uri:'https://example.org/source',title:'Texto bíblico'}},{web:{uri:'javascript:alert(1)',title:'unsafe'}},{web:{uri:'https://user:password@example.org',title:'credentials'}}],searchEntryPoint:{renderedContent:'<div>Google Search</div>'}}}]});}
test('requires passage, bounds history and treats supplied notes as data',()=>{
 assert.throws(()=>normalizeStudy({reference:''}),/passagem/);
 const result=normalizeStudy({reference:'João 3:16',history:[{role:'system',text:'bad'},...Array.from({length:7},()=>({role:'user',text:'x'.repeat(3000)}))],sermon:{excerpt:'y'.repeat(5000)}});
 assert.equal(result.history.length,6);assert.equal(result.history[0].text.length,1800);assert.equal(result.sermon.excerpt.length,4000);
});
test('uses server key and Google Search, preserving prose and trusted metadata separately',async()=>{
 let request;
 const result=await analyzeWithGemini({reference:'João 3:16',question:'Qual o contexto?'},{apiKey:'private-test-key',fetcher:async(_url,options)=>{request=options;return grounded();}});
 assert.equal(request.headers['x-goog-api-key'],'private-test-key');
 const payload=JSON.parse(request.body);assert.deepEqual(payload.tools,[{googleSearch:{}}]);
 assert.match(payload.systemInstruction.parts[0].text,/Strong sozinho/);
 assert.equal(JSON.parse(payload.contents[0].parts[0].text).reference,'João 3:16');
 assert.deepEqual(result.sources,[{url:'https://example.org/source',title:'Texto bíblico'}]);
 assert.equal(result.grounded,true);assert.match(result.passages[0].text,/3:14–18/);
 assert.doesNotMatch(JSON.stringify(result),/private|javascript|password/);
 assert.equal(result.searchSuggestions,'<div>Google Search</div>');
});
test('makes lack of retrieved sources explicit and rejects incomplete answers',async()=>{
 const result=await analyzeWithGemini({reference:'Salmos 23:1'},{apiKey:'x',fetcher:async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'Explicação sem pesquisa retornada.'}]}}]})});
 assert.equal(result.grounded,false);assert.deepEqual(result.sources,[]);
 await assert.rejects(analyzeWithGemini({reference:'Salmos 23:1'},{apiKey:'x',fetcher:async()=>Response.json({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'partial'}]}}]})}),/não foi concluída/);
});
test('instructor route shares device authorization with note reviewer and answers preflight',async t=>{
 let calls=0;const server=createReviewServer({apiKey:'test',accessCode,fetcher:async()=>{calls++;return grounded();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const url='http://127.0.0.1:'+server.address().port+'/api/instrutor';
 const post=(body,token=accessCode)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,Origin:'https://localhost'},body:JSON.stringify(body)});
 assert.equal((await post({reference:'João 3:16'},'wrong')).status,401);assert.equal(calls,0);
 assert.equal((await post({reference:''})).status,400);assert.equal(calls,0);
 const response=await post({reference:'João 3:16',sermon:{excerpt:'rascunho'},history:[{role:'user',text:'Pergunta anterior'}]});
 assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://localhost');assert.equal((await response.json()).grounded,true);
 assert.equal((await fetch(url,{method:'OPTIONS',headers:{Origin:'https://localhost'}})).status,204);
});
test('provider limits are actionable, without leaking upstream content',async()=>{
 await assert.rejects(analyzeWithGemini({reference:'João 3:16'},{apiKey:'x',fetcher:async()=>new Response('upstream private key',{status:429})}),error=>error.status===429&&!error.message.includes('private'));
});
