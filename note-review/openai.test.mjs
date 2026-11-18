import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeWithOpenAI, reviseWithOpenAI} from './openai.mjs';
import {createReviewServer} from './server.mjs';
const accessCode='test-device-code-at-least-20-chars';
const mockResponse=()=>Response.json({status:'completed',output:[{type:'reasoning',summary:[{text:'private'}]},{type:'message',content:[{type:'output_text',text:'O texto aponta para o amor de Deus.',annotations:[{type:'url_citation',url:'https://example.org/source',title:'Texto bíblico',start_index:0,end_index:34},{type:'url_citation',url:'javascript:alert(1)',title:'unsafe'}]}]}]});
test('OpenAI uses Responses with web research, citations, shared instructions and no server storage',async()=>{
 let payload;
 const result=await analyzeWithOpenAI({reference:'João 3:16',history:[{role:'user',text:'Pergunta anterior'}]},{apiKey:'test-private-key',fetcher:async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.headers.Authorization,'Bearer test-private-key');payload=JSON.parse(options.body);return mockResponse();}});
 assert.equal(payload.store,false);assert.equal(payload.tool_choice,'required');assert.equal(payload.tools[0].type,'web_search');assert.match(payload.instructions,/Strong sozinho/);
 assert.equal(JSON.parse(payload.input).history[0].text,'Pergunta anterior');
 assert.equal(result.provider,'openai');assert.equal(result.sources.length,1);assert.equal(result.passages[0].annotations.length,1);assert.equal(result.grounded,true);
 assert.doesNotMatch(JSON.stringify(result),/private|javascript/);
});
test('OpenAI reviewer returns plain text without a web search or automatic application',async()=>{
 let payload;
 const corrected=await reviseWithOpenAI('deus e bom','Corrija somente português',{apiKey:'test',fetcher:async(_url,options)=>{payload=JSON.parse(options.body);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Deus é bom.'}]}]});}});
 assert.equal(corrected,'Deus é bom.');assert.equal(payload.input,'deus e bom');assert.equal(payload.tools,undefined);
});
test('incomplete responses and provider quotas are rejected without exposing upstream data',async()=>{
 await assert.rejects(analyzeWithOpenAI({reference:'João 3:16'},{apiKey:'test',fetcher:async()=>Response.json({status:'incomplete',output:[]})}),/não foi concluída/);
 await assert.rejects(analyzeWithOpenAI({reference:'João 3:16'},{apiKey:'test',fetcher:async()=>new Response('private upstream error',{status:429})}),e=>e.status===429&&!e.message.includes('private'));
});
test('provider choice is explicit, keeps Gemini compatible and never falls back to another paid service',async t=>{
 const calls=[];
 const server=createReviewServer({apiKey:'gemini-test',openaiApiKey:'openai-test',accessCode,fetcher:async(url,options)=>{calls.push(url);return url.includes('api.openai.com')?mockResponse():Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'Deus é bom.'}]}}]});}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port;
 const post=(body,path='/api/revisar-nota')=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessCode},body:JSON.stringify(body)});
 assert.equal((await post({text:'deus e bom'})).status,200);assert.match(calls[0],/generativelanguage/);
 assert.equal((await post({text:'deus e bom',provider:'openai'})).status,200);assert.match(calls[1],/api.openai.com/);
 assert.equal((await post({text:'x',provider:'unknown'})).status,400);assert.equal(calls.length,2);
 assert.deepEqual(await (await post({check:true,provider:'openai'})).json(),{connected:true,provider:'openai'});
 const health=await (await fetch(base+'/health')).json();assert.deepEqual(health.providers,{gemini:true,openai:true});
});
test('OpenAI can be used without a Gemini key, and a missing OpenAI key never calls Gemini',async t=>{
 let calls=0;const server=createReviewServer({apiKey:undefined,openaiApiKey:'test',accessCode,fetcher:async()=>{calls++;return mockResponse();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const post=body=>fetch('http://127.0.0.1:'+server.address().port+'/api/instrutor',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessCode},body:JSON.stringify(body)});
 assert.equal((await post({reference:'João 3:16'})).status,503);assert.equal(calls,0);
 const response=await post({reference:'João 3:16',provider:'openai'});assert.equal(response.status,200);assert.equal(calls,1);
});
