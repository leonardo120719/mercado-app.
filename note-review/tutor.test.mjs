import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStudy,instructorInstructions} from './instructor.mjs';
test('tutor stage, criterion and student answers reach both AI adapters with bounded context',()=>{
 const input=normalizeStudy({reference:'João 15:4',question:'Avalie minha observação',tutor:{stage:'Observar',scope:'verse',criterion:'Descrever antes de interpretar',answer:'x'.repeat(5000),answers:[{stage:'Contexto',text:'y'.repeat(2000)},null,{stage:'Aplicar',text:12}]}});
 assert.equal(input.tutor.stage,'Observar');assert.equal(input.tutor.scope,'verse');assert.equal(input.tutor.criterion,'Descrever antes de interpretar');assert.equal(input.tutor.answer.length,4000);assert.equal(input.tutor.answers.length,1);assert.equal(input.tutor.answers[0].text.length,1000);
 assert.match(instructorInstructions,/etapa e no critério/);assert.match(instructorInstructions,/Não substitua automaticamente/);assert.match(instructorInstructions,/árvore|construção sintática/);
});
