const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const api=require('./commentary-marks.js'),t=api._test,source=fs.readFileSync(__dirname+'/commentary-marks.js','utf8');
const row={moduleId:'hagnos',moduleName:'Hagnos',book:'philippians',fromChapter:4,fromVerse:10,toChapter:4,toVerse:10,text:'A igreja apoiava Paulo. A igreja o apoiava. A igreja apoiava Paulo.'};
const ref={book:'philippians',name:'Filipenses',chapter:4,verse:10};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function fixture(seed=[]){
 const dom=new JSDOM('<!doctype html><body><div id="reader"></div><div id="diary"></div></body>',{url:'https://pulpito.test/',runScripts:'outside-only'}),w=dom.window;
 let rows=JSON.parse(JSON.stringify(seed)),saved=true,opened=null,copied='',focus=[];
 w.HTMLElement.prototype.scrollIntoView=function(){focus.push(this.textContent)};
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async v=>{copied=v}}});
 w.eval(source);const mark=w.PBCommentMarks;
 function mount(text=row.text){const el=w.document.createElement('div');el.innerHTML='A igreja <a href="#source">apoiava Paulo.</a> A igreja o apoiava. A igreja apoiava Paulo.';if(text!==row.text)el.textContent=text;el.setAttribute('data-pb-comment-entry',JSON.stringify(t.context(row,ref)));w.document.getElementById('reader').replaceChildren(el);return el;}
 mark.init({read:()=>rows,write:next=>{if(!saved)return false;rows=JSON.parse(JSON.stringify(next));return true},notify:()=>{},onDiary(){w.document.getElementById('diary').innerHTML=mark.diaryHTML({})},onOpen:async record=>{opened=record;mount();return true}});
 return {dom,w,mark,mount,get rows(){return rows},get copied(){return copied},get opened(){return opened},focus,failWrites(){saved=false}};
}
function select(f,el,start,end){const walk=f.w.document.createTreeWalker(el,f.w.NodeFilter.SHOW_TEXT);let n,pos=0,a,b;while((n=walk.nextNode())){const len=n.nodeValue.length;if(!a&&start>=pos&&start<pos+len)a=[n,start-pos];if(end>pos&&end<=pos+len){b=[n,end-pos];break}pos+=len;}const r=f.w.document.createRange();r.setStart(...a);r.setEnd(...b);f.w.getSelection().removeAllRanges();f.w.getSelection().addRange(r);f.w.document.dispatchEvent(new f.w.Event('selectionchange'));}
test('anchors use context, tolerate shifted content, and reject ambiguous repeated quotes',()=>{
 const text='primeiro palavra depois palavra fim',a=t.anchor(text,8,15);assert.deepEqual(t.resolve(text,a),{start:8,end:15});assert.deepEqual(t.resolve('novo '+text,a),{start:13,end:20});assert.equal(t.resolve('palavra e palavra',{quote:'palavra',prefix:'inexistente',suffix:'x'}),null);assert.equal(t.resolve(text,{quote:'ausente'}),null);
});
test('entry identity is independent of the current Bible verse for chapter-wide entries',()=>{
 const a=t.context({...row,fromVerse:0,toVerse:0},{...ref,verse:1}),b=t.context({...row,fromVerse:0,toVerse:0},{...ref,verse:12});assert.equal(a.entryId,b.entryId);
});
test('overlapping colors preserve unselected portions and duplicate selection updates one record',()=>{
 const c=t.context(row,ref),text='abcdefghij';let rows=t.overlay([],c,text,t.anchor(text,0,10),'yellow');rows=t.overlay(rows,c,text,t.anchor(text,3,7),'green');assert.deepEqual(rows.map(m=>m.anchor.quote).sort(),['abc','defg','hij']);assert.equal(new Set(rows.map(m=>m.id)).size,3);rows=t.overlay(rows,c,text,t.anchor(text,3,7),'blue');assert.equal(rows.length,3);assert.equal(rows.find(m=>m.anchor.quote==='defg').color,'blue');
});
test('native selection spanning a link saves only selected text and preserves links, copies and survives reload',async()=>{
 const f=fixture(),el=f.mount();await delay(15);select(f,el,2,37);await delay(220);assert.equal(f.w.document.getElementById('pb-comment-mark-tools').hidden,false);
 f.w.document.querySelector('[data-pbcmark-action="copy"]').click();await delay(10);assert.equal(f.copied,row.text.slice(2,37));
 f.w.document.querySelector('[data-pbcmark-color="green"]').click();await delay(30);assert.equal(f.rows.length,1);assert.equal(f.rows[0].anchor.quote,row.text.slice(2,37));assert.equal(el.textContent,row.text);assert.ok(el.querySelector('a[href="#source"]'));assert.ok(el.querySelector('a mark.pb-comment-mark-green'));
 const g=fixture(f.rows),next=g.mount();await delay(30);assert.ok(next.querySelector('.pb-comment-mark-green'));assert.equal(next.textContent,row.text);f.dom.window.close();g.dom.window.close();
});
test('diary includes every highlight and deep-link opens the right passage and scrolls to the marked quote',async()=>{
 const f=fixture(),el=f.mount();await delay(15);select(f,el,24,42);await delay(220);f.w.document.querySelector('[data-pbcmark-color="yellow"]').click();await delay(30);
 f.w.document.getElementById('reader').replaceChildren();f.w.document.getElementById('diary').innerHTML=f.mark.diaryHTML({});const button=f.w.document.querySelector('[data-pbcmark-open]');assert.ok(button);button.click();await delay(40);
 assert.equal(f.opened.context.moduleId,'hagnos');assert.equal(f.opened.context.book,'philippians');assert.equal(f.opened.context.chapter,4);assert.equal(f.opened.context.verse,10);assert.ok(f.focus.length);assert.ok(f.w.document.querySelector('.pb-comment-mark-target'));
 f.dom.window.close();
});
test('removal updates stored highlights and diary; undo restores it; failed writes do not paint or create a record',async()=>{
 const f=fixture(),el=f.mount();await delay(15);select(f,el,0,8);await delay(220);f.w.document.querySelector('[data-pbcmark-color="blue"]').click();await delay(20);
 f.w.document.getElementById('diary').innerHTML=f.mark.diaryHTML({});f.w.document.querySelector('[data-pbcmark-delete]').click();await delay(20);assert.equal(f.rows.length,0);assert.equal(el.querySelectorAll('[data-pb-comment-mark]').length,0);f.w.document.querySelector('[data-pbcmark-undo]').click();await delay(20);assert.equal(f.rows.length,1);
 f.dom.window.close();const g=fixture(),next=g.mount();g.failWrites();await delay(10);select(g,next,0,8);await delay(220);g.w.document.querySelector('[data-pbcmark-color="blue"]').click();assert.equal(g.rows.length,0);assert.equal(next.querySelectorAll('mark').length,0);g.dom.window.close();
});
test('untrusted module/text content is escaped in metadata and diary',()=>{
 const c=t.context({...row,moduleName:'<img src=x onerror=alert(1)>'},ref),a=t.anchor('<script>alert(1)</script>',0,25),f=fixture([{id:'one',context:c,anchor:a,color:'blue',createdAt:new Date().toISOString()}]);const html=f.mark.diaryHTML({});assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;'));f.dom.window.close();
});
test('the same source in search and reading has one identity, despite HTML, whitespace and missing marker',()=>{
 const direct=t.context({...row,marker:'4.10',text:'A igreja<br>o apoiava.'},ref),search=t.context({...row,marker:undefined,text:'A igreja\no apoiava.'},ref);assert.equal(direct.entryId,search.entryId);
});
test('diary renders every saved mark, filters by passage, and pending target isolates the correct module',async()=>{
 const c=t.context(row,ref),seed=Array.from({length:150},(_,i)=>({id:'m'+i,context:c,anchor:t.anchor(row.text,0,8),color:'yellow',createdAt:new Date().toISOString()}));const f=fixture(seed);
 const html=f.mark.diaryHTML({});assert.equal((html.match(/data-pbcmark-open=/g)||[]).length,150);assert.ok(f.mark.diaryHTML({book:'john'}).includes('Nenhuma marcação'));
 f.mark.open('m149');const pending=f.mark.targetFor('hagnos','philippians',4);assert.equal(pending.id,'m149');assert.equal(f.mark.targetFor('henry','philippians',4),null);assert.equal(f.mark.targetFor('hagnos','john',4),null);assert.ok(f.mark.matchesSource(row,ref,null,pending));assert.ok(!f.mark.matchesSource({...row,text:'Outro comentário'},ref,null,pending));await delay(30);f.dom.window.close();
});
