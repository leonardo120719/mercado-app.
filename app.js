window.PB_BUILD_ID = "pb-20261108-compact-commentary-strong-one-tap-6";
/* Púlpito Bible — comentário por versículo: pressionar e segurar ou toque duplo no indicador. */
(function(){
"use strict";
var DB_NAME="PulpitoBibleModules",DB_VERSION=3;
var canonical="genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|1-samuel|2-samuel|1-kings|2-kings|1-chronicles|2-chronicles|ezra|nehemiah|esther|job|psalms|proverbs|ecclesiastes|song-of-solomon|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|john|acts|romans|1-corinthians|2-corinthians|galatians|ephesians|philippians|colossians|1-thessalonians|2-thessalonians|1-timothy|2-timothy|titus|philemon|hebrews|james|1-peter|2-peter|1-john|2-john|3-john|jude|revelation".split("|");
var myBibleIds=[10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160,190,220,230,240,250,260,290,300,310,330,340,350,360,370,380,390,400,410,420,430,440,450,460,470,480,490,500,510,520,530,540,550,560,570,580,590,600,610,620,630,640,650,660,670,680,690,700,710,720,730];
var idToBook={};myBibleIds.forEach(function(id,i){idToBook[id]=canonical[i];});
var modules=[], dbPromise=null, busy=false, lastStatus="", notify=function(){},onUpdated=function(){};
var requested=[
 {code:"NVI",name:"Nova Versão Internacional",holder:"Biblica",status:"Protegida por direitos autorais"},
 {code:"NTLH",name:"Nova Tradução na Linguagem de Hoje",holder:"Sociedade Bíblica do Brasil",status:"Protegida por direitos autorais"},
 {code:"NAA",name:"Nova Almeida Atualizada",holder:"Sociedade Bíblica do Brasil",status:"Protegida por direitos autorais"},
 {code:"ACF",name:"Almeida Corrigida Fiel",holder:"Sociedade Bíblica Trinitariana",status:"Protegida por direitos autorais"},
 {code:"KJV 1611",name:"King James Version, edição de 1611",holder:"Regras variam conforme o país e a edição",status:"Importar arquivo cuja distribuição seja permitida"}
];
function clean(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function simplifyText(s){return String(s==null?"":s).replace(/<br\s*\/?>/gi,"\n").replace(/<\/(?:p|div|h[1-6]|li)>/gi,"\n").replace(/<[^>]*>/g,"").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/\n{3,}/g,"\n\n").trim();}
function dbOpen(){if(dbPromise)return dbPromise;dbPromise=new Promise(function(resolve,reject){if(!window.indexedDB)return reject(Error("Este navegador não disponibiliza IndexedDB"));var r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=function(){var d=r.result;if(!d.objectStoreNames.contains("modules"))d.createObjectStore("modules",{keyPath:"id"});if(!d.objectStoreNames.contains("chapters"))d.createObjectStore("chapters",{keyPath:"key"}).createIndex("moduleId","moduleId",{unique:false});if(!d.objectStoreNames.contains("commentaries"))d.createObjectStore("commentaries",{keyPath:"key"}).createIndex("moduleId","moduleId",{unique:false});if(!d.objectStoreNames.contains("lexicon"))d.createObjectStore("lexicon",{keyPath:"key"}).createIndex("moduleId","moduleId",{unique:false});if(!d.objectStoreNames.contains("commentaryEntries")){var es=d.createObjectStore("commentaryEntries",{keyPath:"key"});es.createIndex("moduleId","moduleId",{unique:false});es.createIndex("passage",["moduleId","book","chapter"],{unique:false});}};r.onsuccess=function(){resolve(r.result);};r.onerror=function(){reject(r.error||Error("Não foi possível abrir a biblioteca local"));};});return dbPromise;}
function request(req){return new Promise(function(resolve,reject){req.onsuccess=function(){resolve(req.result);};req.onerror=function(){reject(req.error);};});}
async function loadCatalog(){
 var db=await dbOpen();
 var rows=await request(db.transaction("modules","readonly").objectStore("modules").getAll());
 if(!rows.length){
  /* Never interpret a failed load as an instruction to reset or recreate modules. */
  var known=0;
  try{known=Number(localStorage.getItem("pb-modules-last-known-count")||0);}catch(e){}
  if(known>0){
   lastStatus="Atenção: este navegador já tinha "+known+" módulo(s), mas o banco local está vazio. Não reinstale os módulos nem limpe os dados do site. Verifique o endereço e restaure um backup, se necessário.";
   console.warn("Púlpito Bible: catálogo local inesperadamente vazio; nenhuma exclusão executada.");
  }
 }else{
  try{localStorage.setItem("pb-modules-last-known-count",String(rows.length));}catch(e){}
 }
 modules=rows;
 modules.sort(function(a,b){return (a.name||"").localeCompare(b.name||"");});
 return modules;
}
function ready(){return loadCatalog();}
function installed(){return modules.slice();}
function moduleName(version){var id=String(version||"").slice(6);var m=modules.find(function(x){return x.id===id;});return m?m.name:"Módulo não encontrado";}
function bibleOptions(selected){return modules.filter(function(m){return m.type==="bible";}).map(function(m){var value="local:"+m.id;return '<option value="'+clean(value)+'"'+(selected===value?" selected":"")+'>'+clean(m.abbreviation||m.name)+" — "+clean(m.name)+"</option>";}).join("");}
function getModuleByVersion(version){return modules.find(function(m){return "local:"+m.id===version&&m.type==="bible";});}
async function getChapter(version,book,chapter){await dbOpen();var m=getModuleByVersion(version);if(!m)throw Error("Módulo de Bíblia não instalado neste dispositivo");var key=m.id+"/"+book+"/"+chapter;var db=await dbOpen();var row=await request(db.transaction("chapters","readonly").objectStore("chapters").get(key));if(!row||!row.verses||!row.verses.length)throw Error("Este módulo não contém "+book+" "+chapter);return {verses:row.verses,copyright:"Módulo instalado localmente · "+m.name+" · "+(m.license||"Licença não informada no arquivo")+". Verifique as condições de uso da edição.",version:m.abbreviation||m.name};}


/* Commentary-to-verse matching shared by coverage badges and the opened text.
   Empty verse ranges describe a chapter note; a lone starting verse describes
   that one verse, avoiding indicators on unrelated verses. */
function commentaryCovers(e,chapter,verse){
 var first=Number(e.fromChapter)||0,last=Number(e.toChapter)||first,chap=Number(chapter);
 if(first&&chap<first)return false;
 if(last&&chap>last)return false;
 if(!verse)return true;
 var from=Number(e.fromVerse)||0,to=Number(e.toVerse)||0,n=Number(verse);
 if(first===chap&&from&&n<from)return false;
 if(last===chap){
  if(to&&n>to)return false;
  if(!to&&from&&first===last&&n>from)return false;
 }
 return true;
}
function forEachIndexedCommentary(db,moduleId,book,chapter,visitor,maxMatches){
 return new Promise(function(resolve,reject){
  var count=0,tx=db.transaction("commentaryEntries","readonly");
  var index=tx.objectStore("commentaryEntries").index("passage");
  var request=index.openCursor(IDBKeyRange.only([moduleId,book,Number(chapter)]));
  request.onerror=function(){reject(request.error||Error("Não foi possível consultar comentários"));};
  tx.onabort=function(){reject(tx.error||Error("Consulta interrompida"));};
  request.onsuccess=function(){
   var cursor=request.result;
   if(!cursor){resolve(count);return;}
   if(visitor(cursor.value))count++;
   if(maxMatches&&count>=maxMatches){resolve(count);return;}
   cursor.continue();
  };
 });
}
async function getCommentaries(book,chapter,verse,moduleId){
 var db=await dbOpen(),chap=Number(chapter),active=modules.filter(function(m){return m.type==="commentary"&&(!moduleId||m.id===moduleId);});
 var found=await Promise.all(active.map(async function(m){
  var results=[];
  function accept(e){if(!commentaryCovers(e,chap,verse))return false;
   results.push({moduleId:m.id,moduleName:m.name,text:e.text,marker:e.marker,fromChapter:e.fromChapter,fromVerse:e.fromVerse});
   return true;
  }
  if(m.storage==="entries-v1"){
   await forEachIndexedCommentary(db,m.id,book,chap,accept,45);
  }else{
   var row=await request(db.transaction("commentaries","readonly").objectStore("commentaries").get(m.id+"/"+book));
   var list=row&&row.entries||[];
   for(var i=0;i<list.length&&results.length<45;i++)accept(list[i]);
  }
  return results;
 }));
 return found.flat().slice(0,100);
}
/* Single indexed scan per installed commentary module for the visible chapter.
   Indicators appear only where a real module entry covers the verse. */
async function getCommentaryCoverage(book,chapter,verseNumbers){
 var nums=Array.from(new Set((verseNumbers||[]).map(Number).filter(function(v){return Number.isInteger(v)&&v>0&&v<=200;})));
 var coverage=Object.create(null);
 nums.forEach(function(v){coverage[v]=[];});
 if(!nums.length)return coverage;
 var chosen=modules.filter(function(m){return m.type==="commentary";});
 if(!chosen.length)return coverage;
 var db=await dbOpen();
 await Promise.all(chosen.map(async function(m){
  var count=Object.create(null);
  nums.forEach(function(v){count[v]=0;});
  function countEntry(e){
   var any=false;
   nums.forEach(function(v){if(commentaryCovers(e,chapter,v)){count[v]++;any=true;}});
   return any;
  }
  if(m.storage==="entries-v1"){
   await forEachIndexedCommentary(db,m.id,book,chapter,countEntry,0);
  }else{
   var row=await request(db.transaction("commentaries","readonly").objectStore("commentaries").get(m.id+"/"+book));
   (row&&row.entries||[]).forEach(countEntry);
  }
  nums.forEach(function(v){if(count[v])coverage[v].push({moduleId:m.id,moduleName:m.name,count:count[v]});});
 }));
 return coverage;
}
function renderVerse(raw,book,showStrong){
 var source=String(raw||""),pattern=/<s>([0-9]{1,5})<\/s>/gi,position=0,output="";
 function rawChunk(str){return String(str||"").replace(/<br\s*\/?>/gi,"\n").replace(/<\/p>/gi,"\n").replace(/<[^>]*>/g,"").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"');}
 function chunk(str,strongCodes){
  var plain=rawChunk(str),tokens=Array.from(plain.matchAll(/[\p{L}\p{M}]+(?:[’'-][\p{L}\p{M}]+)*/gu));
  if(strongCodes&&strongCodes.length&&tokens.length){
   var token=tokens[tokens.length-1],word=token[0],start=token.index,first=strongCodes[0],list=strongCodes.join(",");
   return clean(plain.slice(0,start))+'<span class="pb-linked-word pb-strong-word" data-pb-word="'+clean(word)+'" data-pb-strong="'+clean(first)+'" data-pb-strong-list="'+clean(list)+'" role="button" tabindex="0" title="Consultar '+clean(word)+' nos léxicos '+clean(list)+'">'+clean(word)+'</span>'+clean(plain.slice(start+word.length));
  }
  return clean(plain);
 }
 var matches=Array.from(source.matchAll(pattern)),i=0;
 while(i<matches.length){
  var match=matches[i],prefix=canonical.indexOf(book)<39?"H":"G",codes=[prefix+Number(match[1])],end=match.index+match[0].length;
  i++;
  while(i<matches.length&&matches[i].index===end){codes.push(prefix+Number(matches[i][1]));end=matches[i].index+matches[i][0].length;i++;}
  output+=chunk(source.slice(position,match.index),codes);
  if(showStrong)codes.forEach(function(code){output+='<button type="button" class="strong-badge" data-strong="'+code+'" aria-label="Abrir dicionário Strong '+code+'" title="Clique uma vez para abrir o significado Strong '+code+'">'+code+'</button>';});
  position=end;
 }
 output+=chunk(source.slice(position),[]);
 return output;
}
function filenameSlug(s){return String(s||"modulo").replace(/\.[^.]+$/,"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,58)||"modulo";}
function recordSet(result){return (result||[]).flatMap(function(r){return r.values.map(function(values){var o={};r.columns.forEach(function(c,i){o[c.toLowerCase()]=values[i];});return o;});});}
function getInfo(db){if(!recordSet(db.exec("SELECT name FROM sqlite_master WHERE type='table' AND lower(name)='info'")).length)return {};try{var rows=recordSet(db.exec("SELECT * FROM info")),obj={};rows.forEach(function(r){obj[String(r.name||r.key||"").toLowerCase()]=String(r.value||"");});return obj;}catch(e){return {};}}
function ensureBook(x){if(typeof x==="number"||/^\d+$/.test(String(x)))return idToBook[Number(x)]||canonical[Number(x)-1]||null;var name=String(x||"").toLowerCase().trim();var found=canonical.find(function(slug){return slug===name;});return found||null;}
function normalizeBible(rows){var groups=new Map();var count=0;rows.forEach(function(r){var book=ensureBook(r.book||r.book_slug||r.book_number||r.bookid||r.book_id),ch=Number(r.chapter||r.chapter_number),v=Number(r.verse||r.number);if(!book||!Number.isInteger(ch)||ch<1||ch>200||!Number.isInteger(v)||v<1||v>200)return;var content=String(r.text??r.content??"").slice(0,15000);var key=book+"/"+ch;if(!groups.has(key))groups.set(key,{book:book,chapter:ch,verses:[]});groups.get(key).verses.push({number:v,text:content});count++;});groups.forEach(function(row){row.verses.sort(function(a,b){return a.number-b.number;});});if(!count)throw Error("Não encontrei versículos reconhecíveis no módulo.");return {groups:Array.from(groups.values()),count:count};}
function normalizeCommentaries(rows){var groups=new Map(),count=0;rows.forEach(function(r){var book=ensureBook(r.book||r.book_slug||r.book_number||r.book_id);if(!book)return;var cf=Number(r.chapter_number_from??r.chapter??r.chapter_from??0);var vf=Number(r.verse_number_from??r.verse??r.verse_from??0);var ct=Number(r.chapter_number_to??r.chapter_to??cf);var vt=Number(r.verse_number_to??r.verse_to??0);var txt=simplifyText(r.text??r.commentary??r.content).slice(0,20000);if(!txt||!Number.isInteger(cf)||cf<0||cf>200)return;var entry={fromChapter:cf,fromVerse:vf,toChapter:ct||cf,toVerse:vt,marker:String(r.marker||""),text:txt};if(!groups.has(book))groups.set(book,{book:book,entries:[]});groups.get(book).entries.push(entry);count++;});if(!count)throw Error("Não encontrei comentários vinculados a passagens.");return {groups:Array.from(groups.values()),count:count};}

function dictTopic(x){var s=String(x==null?"":x).trim(),m=/^([GH])0*(\d{1,5})$/i.exec(s);return m?m[1].toUpperCase()+Number(m[2]):s.toLocaleLowerCase("pt-BR");}
function normalizeDictionary(rows){
 var entries=new Map();
 rows.forEach(function(r){
  var original=String(r.topic??r.word??r.keyword??"").trim(),topic=dictTopic(original);
  var definition=simplifyText(r.definition??r.text??r.content??"").slice(0,30000);
  if(!topic||!definition||topic.length>130)return;
  if(entries.has(topic)&&entries.get(topic).definition!==definition)definition=(entries.get(topic).definition+"\n\n"+definition).slice(0,32000);
  entries.set(topic,{topic:topic,original:original,definition:definition});
 });
 if(!entries.size)throw Error("A tabela dictionary não contém verbetes válidos.");
 return {groups:Array.from(entries.values()),count:entries.size};
}
async function getDictionaryEntry(term,moduleId){
 var topic=dictTopic(term);if(!topic)return [];
 var db=await dbOpen(),selected=modules.filter(function(m){return m.type==="dictionary"&&(!moduleId||m.id===moduleId);});
 var entries=await Promise.all(selected.map(async function(m){
  var row=await request(db.transaction("lexicon","readonly").objectStore("lexicon").get(m.id+"/"+topic));
  return row?{topic:row.original||row.topic,definition:row.definition,moduleId:m.id,moduleName:m.name,license:m.license}:null;
 }));
 return entries.filter(Boolean);
}


/* Large MyBible commentary importer: rows are written in small transactions
   to an IndexedDB passage index. The whole 30k-row result is never materialized
   into a JS array. Older modules continue using the legacy store. */
function importStatus(text){
 lastStatus=text;
 var area=document.getElementById("module-status");
 if(area)area.textContent=text;
}
function makeLargeModuleMeta(info,filename){
 var now=Date.now(),name=String(info.name||info.description||filename).slice(0,130);
 return {id:"ext-"+filenameSlug(filename).slice(0,35)+"-c-"+now.toString(36)+"-"+Math.floor(Math.random()*1679616).toString(36),
  type:"commentary",name:name,abbreviation:String(info.abbreviation||filename.split(".")[0]).slice(0,30),
  language:String(info.language||"pt").slice(0,60),license:String(info.license||info.copyright||"não informada").slice(0,400),
  description:String(info.detailed_info||"").slice(0,400),format:"MyBible SQLite3 (por capítulo)",
  storage:"entries-v1",count:0,file:filename,installedAt:now};
}
function streamedCommentaryRows(row){
 var book=ensureBook(row.book??row.book_slug??row.book_number??row.book_id);
 if(!book)return [];
 var first=Number(row.chapter_number_from??row.chapter??row.chapter_from??0);
 var last=Number(row.chapter_number_to??row.chapter_to??first)||first;
 if(!Number.isInteger(first)||first<1||first>200||!Number.isInteger(last)||last<first||last>200)return [];
 var fv=Number(row.verse_number_from??row.verse??row.verse_from??0)||0;
 var lv=Number(row.verse_number_to??row.verse_to??0)||0;
 var content=simplifyText(row.text??row.commentary??row.content);
 if(!content)return [];
 var list=[];
 for(var ch=first;ch<=last;ch++)list.push({
  book:book,chapter:ch,fromChapter:first,toChapter:last,fromVerse:fv,toVerse:lv,
  marker:String(row.marker||"").slice(0,200),text:content
 });
 return list;
}
async function writeCommentaryBatch(batch){
 if(!batch.length)return;
 var db=await dbOpen(),tx=db.transaction("commentaryEntries","readwrite"),store=tx.objectStore("commentaryEntries");
 var done=new Promise(function(resolve,reject){
  tx.oncomplete=resolve;tx.onabort=function(){reject(tx.error||Error("Armazenamento interrompido"));};
  tx.onerror=function(){reject(tx.error||Error("Não foi possível salvar comentários no aparelho"));};
 });
 batch.forEach(function(entry){store.put(entry);});
 await done;
}
async function publishImportedCommentary(meta){
 var db=await dbOpen(),tx=db.transaction("modules","readwrite");
 var completed=new Promise(function(resolve,reject){tx.oncomplete=resolve;tx.onabort=function(){reject(tx.error);};tx.onerror=function(){reject(tx.error);};});
 tx.objectStore("modules").put(meta);
 await completed;
 await loadCatalog();onUpdated();
 return Object.assign({alreadySaved:true},meta);
}
async function cleanFailedCommentary(id){
 try{
  var db=await dbOpen();
  var tx=db.transaction("commentaryEntries","readwrite");
  await new Promise(function(resolve,reject){
   var source=tx.objectStore("commentaryEntries").index("moduleId"),req=source.openCursor(IDBKeyRange.only(id));
   req.onsuccess=function(){var cursor=req.result;if(cursor){cursor.delete();cursor.continue();}};
   req.onerror=function(){reject(req.error);};
   tx.oncomplete=resolve;tx.onabort=function(){reject(tx.error||Error("Falha na limpeza"));};
  });
 }catch(error){console.warn("Não foi possível limpar comentários parciais",error);}
}
async function streamCommentaryIterator(iterate,filename,info){
 var meta=makeLargeModuleMeta(info,filename),batch=[],count=0,number=0;
 try{
  for await(var row of iterate){
   number++;
   var converted=streamedCommentaryRows(row);
   for(var entry of converted){
    entry.moduleId=meta.id;
    entry.key=meta.id+"/"+entry.book+"/"+entry.chapter+"/"+number;
    batch.push(entry);
   }
   if(batch.length>=100){
    await writeCommentaryBatch(batch);batch=[];
    if(number%500<100){
     importStatus("Importando "+meta.name+": "+number.toLocaleString("pt-BR")+" comentários processados…");
     await new Promise(function(resolve){setTimeout(resolve,0);});
    }
   }
   if(converted.length)count++;
   if(number>250000)throw Error("Quantidade de comentários maior que o limite de segurança (250 mil).");
  }
  if(batch.length)await writeCommentaryBatch(batch);
  if(!count)throw Error("Não encontrei comentários compatíveis neste módulo.");
  meta.count=count;
  return await publishImportedCommentary(meta);
 }catch(e){
  await cleanFailedCommentary(meta.id);
  throw e;
 }
}
async function streamSqliteCommentaries(sqlite,filename,info){
 var statement=sqlite.prepare("SELECT * FROM commentaries");
 async function* read(){
  try{while(statement.step())yield statement.getAsObject();}
  finally{statement.free();}
 }
 return streamCommentaryIterator(read(),filename,info);
}
async function streamPackedComments(entries,meta,filename){
 async function* read(){
  for(var i=0;i<entries.length;i++){
   if(!/^chapters\/[a-z0-9-]+\/[0-9]{1,3}\.json$/i.test(entries[i].name))throw Error("Pacote de capítulos contém nome inválido");
   var raw=await entries[i].async("string"),rows=JSON.parse(raw);
   if(!Array.isArray(rows))throw Error("Capítulo não contém lista JSON");
   for(var row of rows)yield row;
   if(i%10===0)await new Promise(function(resolve){setTimeout(resolve,0);});
  }
 }
 return streamCommentaryIterator(read(),filename,meta);
}

async function parseSQLite(buffer,filename){
 if(!window.initSqlJs)throw Error("O leitor SQLite não carregou. Verifique a conexão com a internet e tente novamente.");
 var SQL=await window.initSqlJs({locateFile:function(f){return "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/"+f;}});
 var db;
 try{
  db=new SQL.Database(new Uint8Array(buffer));
  var tables=recordSet(db.exec("SELECT name FROM sqlite_master WHERE type='table'")).map(function(r){return String(r.name).toLowerCase();});
  var type=tables.includes("verses")?"bible":tables.includes("commentaries")?"commentary":tables.includes("dictionary")?"dictionary":null;
  if(!type)throw Error(tables.includes("words")?"Arquivo com apenas formas de palavras (words), sem verbetes de dicionário. Instale o léxico principal.":"SQLite sem verses, commentaries ou dictionary. Tabelas: "+(tables.join(", ")||"nenhuma")+".");
  var info=getInfo(db);
  if(type==="commentary")return await streamSqliteCommentaries(db,filename,info);
  var rows=recordSet(db.exec("SELECT * FROM "+(type==="bible"?"verses":"dictionary")));
  var normalized=type==="bible"?normalizeBible(rows):normalizeDictionary(rows);
  return {type:type,name:info.description||info.name||filename.replace(/\.((?:commentaries\.)?sqlite3|sqlite|db)$/i,""),abbreviation:filename.split(".")[0].slice(0,30),language:info.language||"não informada",license:info.license||info.copyright||"não informada",description:info.detailed_info||"",format:"MyBible SQLite3",groups:normalized.groups,count:normalized.count};
 }finally{if(db)db.close();}
}
function pickJson(json,filename){
 var meta=json.module||json.metadata||json;
 var kind=String(meta.type||json.type||"").toLowerCase();
 var bible=Array.isArray(json.verses)?json.verses:Array.isArray(json.data)?json.data:null;
 var comments=Array.isArray(json.commentaries)?json.commentaries:Array.isArray(json.comments)?json.comments:null;
 var dictionary=Array.isArray(json.dictionary)?json.dictionary:Array.isArray(json.entries)?json.entries:null;
 if(!kind)kind=bible?"bible":comments?"commentary":dictionary?"dictionary":"";
 if(kind==="comments")kind="commentary";
 var rows=kind==="bible"?bible:kind==="commentary"?comments:dictionary;
 if(!Array.isArray(rows))throw Error("O JSON não contém versículos, comentários ou verbetes.");
 var normalized=kind==="bible"?normalizeBible(rows):kind==="commentary"?normalizeCommentaries(rows):kind==="dictionary"?normalizeDictionary(rows):null;
 if(!normalized)throw Error("Tipo de módulo não reconhecido: "+kind);
 return {type:kind,name:meta.name||meta.title||filename,abbreviation:meta.abbreviation||meta.abbr||filename.replace(/\.[^.]+$/,""),language:meta.language||"pt-BR",license:meta.license||"não informada",description:meta.description||"",format:"Púlpito JSON",groups:normalized.groups,count:normalized.count};
}
async function parseZip(file){
 if(!window.JSZip)throw Error("O leitor ZIP não carregou. Verifique a conexão e tente novamente.");
 var zip=await JSZip.loadAsync(file,{checkCRC32:false}),entries=Object.values(zip.files).filter(function(e){return !e.dir&&!/(^|\/)(__MACOSX|\.DS_Store)/i.test(e.name);});

 var manifest=entries.find(function(e){return /(?:^|\/)(?:module|manifest)\.json$/i.test(e.name);});
 var metadata=null;
 if(manifest){
  if((manifest._data&&manifest._data.uncompressedSize||0)>1024*1024)throw Error("Manifesto do ZIP muito grande.");
  try{metadata=JSON.parse(await manifest.async("string"));}catch(e){throw Error("O arquivo module.json/manifest.json está inválido.");}
 }
 var isPacked=metadata&&metadata.type==="commentary"&&metadata.format==="pulpito-commentary-chapters-v1";
 if(entries.length>(isPacked?2500:30))throw Error("O ZIP contém arquivos demais para este formato.");
 var total=entries.reduce(function(sum,e){return sum+(e._data&&e._data.uncompressedSize||0);},0);
 if(total>210*1024*1024)throw Error("O ZIP ultrapassa o limite de 210 MB descompactados.");
 if(isPacked){
  var chunks=entries.filter(function(e){return /^chapters\/[a-z0-9-]+\/[0-9]{1,3}\.json$/i.test(e.name);});
  if(!chunks.length)throw Error("Pacote de comentários sem capítulos JSON.");
  return [await streamPackedComments(chunks,metadata,file.name)];
 }
 var sqlite=entries.filter(function(e){return /\.(sqlite3?|db)$/i.test(e.name);});
 if(sqlite.length){
  var all=[];
  for(var e of sqlite){
   var size=e._data&&e._data.uncompressedSize||0;
   if(size>160*1024*1024)throw Error("Este SQLite ultrapassa 160 MB. Divida o módulo para importação.");
   importStatus("Preparando "+e.name.split("/").pop()+" ("+Math.ceil(size/1024/1024)+" MB descompactados)…");
   var bin=await e.async("uint8array");
   try{all.push(await parseSQLite(bin,e.name.split("/").pop()));}finally{bin=null;}
  }
  return all;
 }
 if(manifest){
  var meta=metadata;var kind=meta.type||meta.module&&meta.module.type;var body=entries.find(function(e){return kind==="commentary"?/(?:commentaries|comments)\.json$/i.test(e.name):kind==="dictionary"?/(?:dictionary|entries)\.json$/i.test(e.name):/verses\.json$/i.test(e.name);});
  if(!body)throw Error("O ZIP tem módulo de descrição, mas não os dados .json.");
  var records=JSON.parse(await body.async("string"));
  if(!Array.isArray(records))throw Error("O arquivo de dados deve conter uma lista JSON.");
  return [pickJson(Object.assign({},meta,kind==="commentary"?{commentaries:records}:kind==="dictionary"?{dictionary:records}:{verses:records}),file.name)];
 }
 var first=entries.find(function(e){return /\.json$/i.test(e.name);});
 if(!first)throw Error("ZIP incompatível. Use SQLite3 do MyBible ou pacote ZIP/JSON válido do Púlpito Bible.");
 return [pickJson(JSON.parse(await first.async("string")),file.name)];
}
async function parseFile(file){
 var name=file.name.toLowerCase();
 if(name.endsWith(".zip")){
  if(file.size>70*1024*1024)throw Error("O ZIP excede 70 MB compactados.");
  return parseZip(file);
 }
 if(/\.(sqlite3?|db)$/.test(name)){
  if(file.size>160*1024*1024)throw Error("O SQLite excede 160 MB.");
  return [await parseSQLite(await file.arrayBuffer(),file.name)];
 }
 if(name.endsWith(".json")){
  if(file.size>70*1024*1024)throw Error("O arquivo JSON excede 70 MB.");
  return [pickJson(JSON.parse(await file.text()),file.name)];
 }
 throw Error("Formato incompatível. Escolha um ZIP, SQLite3 ou JSON.");
}
async function deleteRelated(store,id){
 return new Promise(function(resolve,reject){var idx=store.index("moduleId"),range=IDBKeyRange.only(id),req=idx.openCursor();req.onsuccess=function(){var cur=req.result;if(cur){cur.delete();cur.continue();}else resolve();};req.onerror=function(){reject(req.error);};});
}
async function relatedKeys(store,id){var db=await dbOpen();return request(db.transaction(store,"readonly").objectStore(store).index("moduleId").getAllKeys(IDBKeyRange.only(id)));}
async function saveModule(parsed,filename){
 if(parsed.alreadySaved)return parsed;
 var id="ext-"+filenameSlug(filename)+"-"+(parsed.type==="bible"?"b":parsed.type==="dictionary"?"d":"c");var db=await dbOpen();
 var meta={id:id,type:parsed.type,name:String(parsed.name||filename).slice(0,130),abbreviation:String(parsed.abbreviation||"EXT").slice(0,30),language:String(parsed.language||"").slice(0,60),license:String(parsed.license||"não informada").slice(0,400),description:String(parsed.description||"").slice(0,400),format:parsed.format,count:parsed.count,file:filename,installedAt:Date.now()};
 var collection=parsed.type==="bible"?"chapters":parsed.type==="dictionary"?"lexicon":"commentaries";
 var oldKeys=await relatedKeys(collection,id),tx=db.transaction(["modules",collection],"readwrite");
 var done=new Promise(function(resolve,reject){tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error||Error("Falha ao gravar módulo"));};tx.onabort=function(){reject(tx.error||Error("Importação cancelada"));};});
 var store=tx.objectStore(collection);oldKeys.forEach(function(key){store.delete(key);});
 parsed.groups.forEach(function(group){var key=parsed.type==="dictionary"?id+"/"+group.topic:id+"/"+group.book+(parsed.type==="bible"?"/"+group.chapter:"");store.put(Object.assign({key:key,moduleId:id},group));});
 tx.objectStore("modules").put(meta);
 await done;await loadCatalog();onUpdated();return meta;
}
async function importFiles(files){
 if(busy)return;
 var permission=document.getElementById("module-rights");
 if(!permission||!permission.checked){notify("Confirme que os arquivos foram obtidos legalmente.");return;}
 busy=true;var status=document.getElementById("module-status");
 lastStatus="Importando arquivo(s)…";if(status)status.textContent=lastStatus;
 var ok=[],problems=[];
 for(var file of files){try{var parsed=await parseFile(file);for(var item of parsed){var meta=await saveModule(item,file.name+(parsed.length>1?"-"+item.abbreviation:""));ok.push(meta.name+" ("+meta.count+" itens)");}}catch(e){problems.push(file.name+": "+(e.message||String(e)));}}
 busy=false;
 lastStatus=(ok.length?"Instalados: "+ok.join("; ")+". ":"")+(problems.length?"Não instalados: "+problems.join("; "):"");if(status)status.textContent=lastStatus;
 if(ok.length)notify(ok.length+" módulo(s) instalado(s).");if(problems.length)notify("Alguns módulos não puderam ser importados.");
 renderPage();
}
async function removeModule(id){
 var m=modules.find(function(m){return m.id===id;});if(!m)return;
 if(!confirm("Excluir o módulo '"+m.name+"' deste navegador? Suas notas pessoais não serão apagadas."))return;
 var db=await dbOpen();var ckeys=await relatedKeys("chapters",id),nkeys=await relatedKeys("commentaries",id),dkeys=await relatedKeys("lexicon",id);
 var tx=db.transaction(["modules","chapters","commentaries","lexicon"],"readwrite");
 var done=new Promise(function(resolve,reject){tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error);};});
 tx.objectStore("modules").delete(id);ckeys.forEach(function(key){tx.objectStore("chapters").delete(key);});
 nkeys.forEach(function(key){tx.objectStore("commentaries").delete(key);});dkeys.forEach(function(key){tx.objectStore("lexicon").delete(key);});
 await done;await loadCatalog();onUpdated();notify("Módulo removido.");renderPage();
}
/* Proteção dos módulos: exportação/restauração explícita, sem apagar dados existentes. */
var PB_BACKUP_STORES=["modules","chapters","commentaries","lexicon","commentaryEntries"];
async function protectStorage(){
 if(navigator.storage&&navigator.storage.persist){
  try{await navigator.storage.persist();}catch(e){console.warn("Armazenamento persistente indisponível",e);}
 }
}
async function backupModules(){
 var db=await dbOpen(),parts=['{"format":"pulpito-bible-modules-backup-v1","origin":'+JSON.stringify(location.origin)+',"createdAt":'+JSON.stringify(new Date().toISOString())+',"stores":{'];
 for(var i=0;i<PB_BACKUP_STORES.length;i++){
  var name=PB_BACKUP_STORES[i],first=true;
  parts.push((i?",":"")+JSON.stringify(name)+":[");
  await new Promise(function(resolve,reject){
   var tx=db.transaction(name,"readonly"),req=tx.objectStore(name).openCursor();
   req.onsuccess=function(){var cursor=req.result;if(!cursor)return;parts.push((first?"":",")+JSON.stringify(cursor.value));first=false;cursor.continue();};
   req.onerror=function(){reject(req.error);};
   tx.oncomplete=resolve;tx.onabort=function(){reject(tx.error);};
  });
  parts.push("]");
 }
 parts.push("}}");
 var blob=new Blob(parts,{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=url;link.download="pulpito-bible-backup-"+new Date().toISOString().slice(0,10)+".json";
 document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},60000);
 notify("Cópia dos módulos preparada. Guarde o arquivo em Arquivos ou iCloud.");
}
async function restoreModules(file){
 if(!file)return;
 var backup=JSON.parse(await file.text());
 if(backup.format!=="pulpito-bible-modules-backup-v1"||!backup.stores)throw Error("Este arquivo não é um backup de módulos do Púlpito Bible.");
 var db=await dbOpen(),total=0;
 for(var name of PB_BACKUP_STORES){
  var entries=backup.stores[name]||[];
  if(!Array.isArray(entries))throw Error("Estrutura de backup inválida: "+name);
  for(var offset=0;offset<entries.length;offset+=100){
   var batch=entries.slice(offset,offset+100),tx=db.transaction(name,"readwrite");
   await new Promise(function(resolve,reject){
    var store=tx.objectStore(name);
    batch.forEach(function(item){store.put(item);});
    tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error||Error("Erro na restauração"));};tx.onabort=function(){reject(tx.error||Error("Restauração interrompida"));};
   });
   total+=batch.length;
  }
 }
 await loadCatalog();onUpdated();renderPage();
 notify("Backup restaurado sem excluir os módulos que já estavam instalados ("+total+" registros).");
}
protectStorage();
function getUiMarkup(){
 return '<div class="content module-library">'+
 '<div class="eyebrow">PÚLPITO BIBLE / MÓDULOS EXTERNOS</div><h1 class="page-title">Biblioteca de módulos</h1><p class="subtitle">Instale Bíblias, comentários e dicionários Strong armazenados em ZIP ou SQLite3. Os arquivos ficam neste aparelho e os comentários acompanham a passagem escolhida.</p>'+
 '<div class="grid-2"><section class="card card-pad"><div class="panel-heading"><h2 class="section-heading">Instalar arquivos</h2><span class="chip greenish">Local • sem envio para servidor</span></div>'+
 '<label class="module-upload"><span class="module-upload-icon">⇧</span><strong>Escolher arquivos ZIP, SQLite3 ou JSON</strong><span>Importe módulos de Bíblia, comentário e dicionário Strong do MyBible ou Púlpito Bible.</span><input id="module-file" type="file" multiple accept=".zip,.sqlite3,.sqlite,.db,.json"></label>'+
 '<label class="module-rights"><input id="module-rights" type="checkbox"> <span>Declaro que tenho permissão de utilizar os arquivos e que não vou redistribuir conteúdo protegido sem autorização.</span></label>'+
 '<p class="feature-note">Aceita ZIP contendo *.SQLite3, arquivos SQLite3 avulsos e ZIP/JSON estruturado para Púlpito Bible. Para o Champlin: ZIP de ~38 MB contendo SQLite3 de 124 MB, agora aceito. Módulos grandes são instalados por capítulo e podem exigir espaço e memória do aparelho. Limite: 70 MB por ZIP e 160 MB por SQLite3.</p>'+
 '<div class="row" style="flex-wrap:wrap;gap:8px;margin:12px 0"><button class="btn primary" id="module-backup" type="button">↓ Fazer backup dos módulos</button><label class="btn" style="cursor:pointer">↑ Restaurar backup<input id="module-restore" type="file" accept=".json,application/json" style="display:none"></label></div><p class="feature-note">Proteja seus módulos antes de trocar de endereço, navegador ou aparelho. A restauração acrescenta os registros sem apagar os existentes. No iPhone, salve o backup no app Arquivos ou iCloud Drive.</p><button class="btn" id="module-sample" type="button">↓ Baixar pacote de exemplo</button><p id="module-status" class="module-status" role="status" aria-live="polite">'+clean(lastStatus)+'</p></section>'+
 '<section class="card card-pad"><div class="panel-heading"><h2 class="section-heading">Meus módulos instalados</h2><span class="chip goldish">'+modules.length+' módulo(s)</span></div>'+
 (modules.length?modules.map(function(m){return '<div class="module-installed"><div><span class="chip">'+(m.type==="bible"?"BÍBLIA":m.type==="dictionary"?"DICIONÁRIO":"COMENTÁRIO")+'</span><h3>'+clean(m.name)+'</h3><p class="tiny muted">'+clean(m.abbreviation)+" · "+clean(m.language)+" · "+m.count+' itens</p><p class="tiny muted">'+clean(m.format)+" · "+clean(m.license)+'</p></div><div class="row">'+(m.type==="bible"?'<button class="btn slim" data-module-activate="'+clean(m.id)+'">Ler agora</button>':"")+'<button class="btn slim" data-module-remove="'+clean(m.id)+'">Remover</button></div></div>';}).join(""):'<div class="empty">Nenhum módulo externo instalado ainda.</div>')+'</section></div>'+
 '<section class="card card-pad" style="margin-top:18px"><div class="panel-heading"><h2 class="section-heading">Consultar dicionário Strong</h2><span class="chip greenish">Léxicos instalados</span></div><div class="search-bar"><input id="dictionary-query" class="field" placeholder="Ex.: H7563 ou G3306"><button id="dictionary-search" class="btn primary" type="button">Consultar</button></div><div id="dictionary-results" class="feature-note" role="status" aria-live="polite">Após instalar um léxico, consulte aqui ou toque no número Strong dentro da Bíblia.</div></section><section class="card card-pad" style="margin-top:18px"><div class="panel-heading"><h2 class="section-heading">Traduções desejadas</h2><span class="chip">Disponíveis via importação autorizada</span></div>'+
 '<div class="module-catalog">'+requested.map(function(t){var found=modules.find(function(m){return m.type==="bible"&&((m.abbreviation||"").toUpperCase()===t.code||(m.name||"").toLowerCase()===t.name.toLowerCase());});return '<div class="module-catalog-item"><div><strong>'+clean(t.code)+' · '+clean(t.name)+'</strong><p>'+clean(t.holder)+' · '+clean(t.status)+'</p></div><span class="chip '+(found?"greenish":"")+'">'+(found?"Instalado":"Não incluído")+'</span></div>';}).join("")+'</div>'+
 '<p class="feature-note">NVI, NTLH, NAA e ACF não são fornecidas nem baixadas automaticamente pelo aplicativo. A King James de 1611 também exige verificação dos direitos aplicáveis à edição e ao território. A instalação depende de arquivo compatível obtido com autorização.</p></section>'+
 '<section class="card card-pad" style="margin-top:18px"><h2 class="section-heading">Como instalar</h2><p class="feature-note">1. Obtenha legalmente o módulo e salve o arquivo ZIP ou SQLite3 no dispositivo. 2. Toque em “Escolher arquivos” e selecione o documento no aplicativo Arquivos. 3. Confirme o direito de utilização e a importação será iniciada. 4. Ative uma Bíblia instalada pelo botão “Ler agora” ou pelo seletor de traduções. 5. Ative Comentários no leitor e toque no número Strong para consultar os dicionários instalados.</p><p class="feature-note">Os módulos ficam no IndexedDB deste endereço e navegador. Atualizações normais não devem apagá-los, mas iOS pode remover dados locais em situações de falta de espaço. Use Fazer backup dos módulos e guarde o arquivo no iCloud. Endereços diferentes têm bibliotecas separadas.</p></section></div>';
}

async function searchDictionaryUi(){
 var field=document.getElementById("dictionary-query"),box=document.getElementById("dictionary-results");
 if(!box||!field)return;
 var q=String(field.value||"").trim();
 if(!q){box.textContent="Informe a palavra ou código Strong.";return;}
 box.textContent="Consultando dicionários instalados…";
 try{
  var res=await getDictionaryEntry(q);
  box.innerHTML=res.length?res.map(function(row){return '<article class="module-comment"><strong>'+clean(row.moduleName)+'</strong><small>'+clean(row.topic)+'</small><p>'+window.PBConnections.linkifyText(row.definition)+'</p></article>';}).join(""):'<p class="feature-note">Nenhuma entrada encontrada nos dicionários instalados.</p>';
 }catch(err){box.textContent=err.message||"Erro na pesquisa";}
}

function renderPage(){var root=document.getElementById("app-main");if(root)root.innerHTML=getUiMarkup();}
async function downloadSample(){
 if(!window.JSZip){notify("Biblioteca ZIP indisponível");return;}
 var zip=new JSZip();
 zip.file("module.json",JSON.stringify({type:"commentary",name:"Comentário demonstrativo Púlpito Bible",abbreviation:"EX-COM",language:"pt-BR",license:"CC0 – conteúdo demonstrativo",description:"Exemplo de estrutura; não é comentário exegético profissional."},null,2));
 zip.file("comments.json",JSON.stringify([{book:"john",chapter:15,verse:4,text:"Exemplo de anotação: observe o verbo 'permanecer' e leia João 15:1–8 antes de elaborar uma aplicação."},{book:"psalms",chapter:73,verse:3,text:"Exemplo de anotação: observe a tensão entre a prosperidade dos ímpios e a mudança de perspectiva em Salmos 73:17."}],null,2));
 var blob=await zip.generateAsync({type:"blob"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="pulpito-bible-modulo-exemplo.zip";document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},2500);
}
document.addEventListener("change",function(e){if(e.target&&e.target.id==="module-restore"){var f=e.target.files&&e.target.files[0];if(f)restoreModules(f).catch(function(err){notify("Não foi possível restaurar: "+err.message);});e.target.value="";return;}if(e.target&&e.target.id==="module-file"){var files=Array.from(e.target.files||[]);if(files.length)importFiles(files);}});
document.addEventListener("click",function(e){
 var act=e.target&&e.target.closest&&e.target.closest("[data-module-remove],[data-module-activate],#module-sample,#module-backup,#dictionary-search");
 if(!act)return;
 if(act.id==="module-backup"){backupModules().catch(function(err){notify("Falha no backup: "+err.message);});return;}if(act.id==="module-sample"){downloadSample();return;}if(act.id==="dictionary-search"){searchDictionaryUi();return;}
 if(act.dataset.moduleRemove){removeModule(act.dataset.moduleRemove);return;}
 if(act.dataset.moduleActivate){var m=modules.find(function(x){return x.id===act.dataset.moduleActivate;});if(m){onUpdated("local:"+m.id);notify("Tradução "+m.name+" selecionada.");}return;}
});
window.PBModules={ready:ready,getInstalled:installed,renderPage:renderPage,bibleOptions:bibleOptions,getChapter:getChapter,getCommentaries:getCommentaries,getCommentaryCoverage:getCommentaryCoverage,getDictionaryEntry:getDictionaryEntry,renderVerse:renderVerse,getModuleByVersion:getModuleByVersion,moduleName:moduleName,init:function(config){notify=config.notify||notify;onUpdated=config.onUpdated||onUpdated;return ready();}};
})();
;
(function (global) {
  "use strict";

  /* A single state store shared by the reader and toolbar. Pure operations do not
     depend on scrolling, so verse list movement never triggers a toolbar render. */
  const KEY = "pulpito-bible-toolbar-v1";
  const MODES = ["normal", "study", "fullscreen"];
  const THEMES = ["light", "dark", "sepia"];
  const AUDIO = ["idle", "playing", "paused"];
  const COLORS = {yellow:"#ffe78b",green:"#bfeab4",blue:"#bfe4ff",pink:"#ffc9da",purple:"#e5d0f7"};
  const ACTIONS = Object.freeze({
    selection:["copy","share","highlight","note","clear"],
    normal:["navigate","font","audio","search","menu"],
    study:["navigate","font","audio","strong","comments","notes","menu"],
    fullscreen:["expand"]
  });

  let seed = {};
  try { seed = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) {}
  const initial = {
    currentVerseSelection:[],
    readingMode:"study",
    audioState:"idle",
    fontSize:18,
    theme:"sepia",
    highlights:{},
    menuOpen:false,
    paletteOpen:false,
    expandFullScreen:false,
    showNumbers:true,
    showStrong:true,
    showComments:false,
    showCrossRefs:false,
    showParallel:false,
    continuousText:true
  };
  let state = Object.freeze({
    ...initial,
    ...seed,
    currentVerseSelection:[],
    audioState:"idle",
    menuOpen:false,
    paletteOpen:false,
    expandFullScreen:false,
    fontSize:Math.max(14,Math.min(30,Number(seed.fontSize || 18))),
    highlights: seed.highlights && typeof seed.highlights === "object" ? seed.highlights : {},
    readingMode:MODES.includes(seed.readingMode) ? seed.readingMode : "study",
    theme:THEMES.includes(seed.theme) ? seed.theme : "sepia"
  });

  const subscribers = new Set();
  const persistKeys = ["readingMode","fontSize","theme","highlights","showNumbers","showStrong","showComments","showCrossRefs","showParallel","continuousText"];
  function save() {
    const payload = {};
    persistKeys.forEach(k => payload[k] = state[k]);
    try { localStorage.setItem(KEY, JSON.stringify(payload)); } catch (_) {}
  }
  function snapshot(){return state;}
  function emit(previous){
    save();
    subscribers.forEach(fn => { try { fn(state, previous); } catch(e){ console.error("PB toolbar subscriber",e); } });
  }
  function patch(next) {
    const changes = Object.keys(next).filter(key => !Object.is(state[key],next[key]));
    if(!changes.length) return;
    const previous=state;
    state=Object.freeze({...state,...next});
    emit(previous);
  }
  function subscribe(selector,handler) {
    if(typeof handler!=="function"){handler=selector;selector=s=>s;}
    let selected=selector(state);
    const fn=next=>{
      const value=selector(next);
      if(!Object.is(value,selected)){const prev=selected;selected=value;handler(value,prev);}
    };
    subscribers.add(fn);
    return ()=>subscribers.delete(fn);
  }
  const actions = {
    selectVerse(id){ if(typeof id!=="string"||!id.trim())return;patch({currentVerseSelection:[id]});},
    toggleVerse(id){
      if(typeof id!=="string"||!id.trim())return;
      const now=state.currentVerseSelection;
      const next=now.includes(id)?now.filter(x=>x!==id):[...now,id];
      patch({currentVerseSelection:next});
    },
    setSelection(ids){patch({currentVerseSelection:[...new Set(ids.filter(x=>typeof x==="string"&&x))]});},
    clearSelection(){patch({currentVerseSelection:[],paletteOpen:false});},
    setReadingMode(mode){if(MODES.includes(mode))patch({readingMode:mode,menuOpen:false,expandFullScreen:false,paletteOpen:false});},
    setAudioState(value){if(AUDIO.includes(value))patch({audioState:value});},
    setFontSize(value){patch({fontSize:Math.max(14,Math.min(30,Math.round(Number(value)||18)))});},
    setTheme(value){if(THEMES.includes(value))patch({theme:value});},
    applyHighlight(color){
      if(!COLORS[color] || !state.currentVerseSelection.length)return;
      const next={...state.highlights};
      state.currentVerseSelection.forEach(id=>{next[id]=color;});
      patch({highlights:next,currentVerseSelection:[],paletteOpen:false});
    },
    clearHighlight(ids){
      const next={...state.highlights};
      (ids || state.currentVerseSelection).forEach(id=>{delete next[id];});
      patch({highlights:next,currentVerseSelection:[],paletteOpen:false});
    },
    toggleMenu(){patch({menuOpen:!state.menuOpen,paletteOpen:false});},
    closeMenu(){patch({menuOpen:false,paletteOpen:false});},
    togglePalette(){patch({paletteOpen:!state.paletteOpen});},
    toggleExpanded(){patch({expandFullScreen:!state.expandFullScreen});},
    setPreference(name,value){
      const allowed=["showNumbers","showStrong","showComments","showCrossRefs","showParallel","continuousText"];
      if(allowed.includes(name))patch({[name]:Boolean(value)});
    },
    setPreferences(map){
      const allowed=["showNumbers","showStrong","showComments","showCrossRefs","showParallel","continuousText"];
      const p={};allowed.forEach(k=>{if(Object.prototype.hasOwnProperty.call(map,k))p[k]=!!map[k];});
      patch(p);
    }
  };
  function priority(s=state){
    if(s.currentVerseSelection.length)return "selection";
    return MODES.includes(s.readingMode)?s.readingMode:"normal";
  }
  function visibleActions(s=state){return ACTIONS[priority(s)].slice();}

  /* A single mounted toolbar subscribes to state. DOM event delegation prevents
     listener proliferation even when the contents are refreshed. */
  let mountRoot=null, mountConfig=null, unsubscribe=null;
  function escapeHtml(value){
    return String(value == null ? "" : value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function item(id,label,icon,extra){
    return '<button class="mtb-button '+(extra||'')+'" type="button" data-toolbar-action="'+id+'" aria-label="'+escapeHtml(label)+'"><span class="mtb-glyph">'+icon+'</span><span class="mtb-label">'+escapeHtml(label)+'</span></button>';
  }
  function selectOptions(options,chosen){return options.map(o=>'<option value="'+escapeHtml(o.value)+'"'+(o.value===chosen?' selected':'')+'>'+escapeHtml(o.label)+'</option>').join("");}
  function navigationMarkup(){
    const data=mountConfig.readNavigation();
    return '<div class="mtb-navigate">'+
      '<select id="version-select" class="mtb-select mtb-version" aria-label="Tradução bíblica">'+selectOptions(data.versions,data.version)+'</select>'+
      '<select id="book-select" class="mtb-select mtb-book" aria-label="Livro bíblico">'+selectOptions(data.books,data.book)+'</select>'+
      '<select id="chapter-select" class="mtb-select mtb-chapter" aria-label="Capítulo">'+selectOptions(data.chapters,String(data.chapter))+'</select>'+
      item("prev","Capítulo anterior","‹","mtb-compact")+item("next","Próximo capítulo","›","mtb-compact")+
    '</div>';
  }
  function menuMarkup(s){
    const prefs=[
      ["showNumbers","Numeração dos versículos"],
      ["showStrong","Números Strong"],
      ["showComments","Comentários bíblicos"],
      ["showCrossRefs","Referências cruzadas"],
      ["showParallel","Duas Bíblias paralelas"],
      ["continuousText","Texto contínuo"]
    ];
    return '<section class="mtb-menu" role="dialog" aria-label="Configurações de leitura">'+
      '<div class="mtb-menu-head"><strong>Ferramentas e aparência</strong>'+item("menu","Fechar","×","mtb-compact")+'</div>'+
      '<div class="mtb-menu-modes"><button data-toolbar-mode="normal" class="'+(s.readingMode==="normal"?"active":"")+'">Leitura</button><button data-toolbar-mode="study" class="'+(s.readingMode==="study"?"active":"")+'">Estudo</button><button data-toolbar-mode="fullscreen" class="'+(s.readingMode==="fullscreen"?"active":"")+'">Tela cheia</button></div>'+
      '<div class="mtb-menu-grid">'+
        item("search","Pesquisar","⌕")+item("notes","Minhas notas","✎")+
        item("modules","Módulos","⇩")+item("dictionary-pane","Painel de dicionários","α")+
        item("bookmarks","Favoritos","☆")+item("sermon","Sermões","▤")+
        item("tutor","Interpretar","✧")+item("split-study","Painel dividido","◫")+item("theme","Alternar tema","◐")+
      '</div><div class="mtb-menu-prefs">'+prefs.map(([key,label])=>'<label><input type="checkbox" data-toolbar-pref="'+key+'" '+(s[key]?'checked':'')+'> '+escapeHtml(label)+'</label>').join('')+'</div>'+
      '<div class="mtb-font-row"><span>Tamanho da leitura</span>'+item("font-down","Diminuir","A−","mtb-compact")+'<strong>'+s.fontSize+'px</strong>'+item("font-up","Aumentar","A+","mtb-compact")+'</div>'+
    '</section>';
  }
  function selectionMarkup(s){
    return '<div class="mtb-selection">'+
      '<span class="mtb-count">'+s.currentVerseSelection.length+' selecionado(s)</span>'+
      item("comments-verse","Comentários","▤")+item("note","Minha anotação","✎")+
      item("explain-verse","Explicar","✧")+item("sermon-verse","Sermão","▤")+item("copy","Copiar","▣")+
      item("highlight","Marcar","▨")+
      item("clear","Limpar seleção","×")+
      '</div>'+
      (s.paletteOpen?'<div class="mtb-palette" role="group" aria-label="Escolher cor de marcação">'+
        Object.entries(COLORS).map(([k,v])=>'<button type="button" data-toolbar-color="'+k+'" aria-label="Marcar '+k+'" title="'+k+'" style="--swatch:'+v+'"></button>').join('')+
        '<button type="button" class="mtb-remove-color" data-toolbar-color="none">Remover cor</button></div>':'');
  }
  function renderToolbar(){
    if(!mountRoot||!mountRoot.isConnected)return;
    const s=snapshot(),mode=priority(s);
    document.body.classList.toggle("pb-fullscreen",s.readingMode==="fullscreen"&&!s.currentVerseSelection.length);
    document.body.classList.toggle("pb-hide-verse-numbers",!s.showNumbers);
    const currentTheme=s.theme;
    document.body.classList.toggle("pb-toolbar-dark",currentTheme==="dark");
    document.documentElement.style.setProperty("--reading-size",s.fontSize+"px");
    let markup='';
    if(mode==="selection")markup=selectionMarkup(s);
    else if(mode==="fullscreen"){
      markup='<div class="mtb-fullscreen">'+item("expand",s.expandFullScreen?"Fechar menu":"Abrir menu","☰","mtb-float")+
      (s.expandFullScreen?'<div class="mtb-fullmenu">'+item("exit-fullscreen","Sair da tela cheia","↙")+item("study","Modo estudo","α")+item("normal","Leitura normal","◫")+item("menu","Configurações","⚙")+'</div>':'')+'</div>';
    }else{
      markup='<div class="mtb-primary">'+navigationMarkup()+
        '<div class="mtb-actions">'+item("font","Ajustar fonte","Aᴀ")+item("audio",s.audioState==="playing"?"Pausar áudio":s.audioState==="paused"?"Retomar áudio":"Ouvir texto",s.audioState==="playing"?"Ⅱ":"♫")+
        (mode==="study"?item("strong","Dicionário Strong","α")+item("comments","Comentários","▤")+item("notes","Notas pessoais","✎"):item("search","Pesquisar","⌕"))+
        item("menu","Mais ferramentas","⋮","mtb-compact")+
        '</div></div><div class="mtb-mode-strip"><button type="button" data-toolbar-mode="normal" '+(s.readingMode==="normal"?'class="active"':'')+'>Leitura</button><button type="button" data-toolbar-mode="study" '+(s.readingMode==="study"?'class="active"':'')+'>Estudo</button><button type="button" data-toolbar-mode="fullscreen">⛶ Tela cheia</button><span class="mtb-mode-hint">Toque no versículo para selecionar.</span></div>'+
        (s.menuOpen?menuMarkup(s):'');
    }
    mountRoot.innerHTML=markup;
    mountRoot.className="pb-global-toolbar "+("pb-mode-"+mode);
    mountRoot.setAttribute("aria-label",mode==="selection"?"Ações para versículos selecionados":"Ferramentas de leitura bíblica");
  }
  function clickHandler(event){
    const root=mountRoot;if(!root)return;
    const color=event.target.closest("[data-toolbar-color]");
    if(color){event.preventDefault();if(color.dataset.toolbarColor==="none"){actions.clearHighlight();}else actions.applyHighlight(color.dataset.toolbarColor);mountConfig.onAction("highlight-applied");return;}
    const modeButton=event.target.closest("[data-toolbar-mode]");
    if(modeButton){event.preventDefault();actions.setReadingMode(modeButton.dataset.toolbarMode);mountConfig.onAction("mode-changed");return;}
    const btn=event.target.closest("[data-toolbar-action]");
    if(!btn)return;
    event.preventDefault();
    const a=btn.dataset.toolbarAction;
    switch(a) {
      case "menu":actions.toggleMenu();return;
      case "highlight":actions.togglePalette();return;
      case "clear":actions.clearSelection();mountConfig.onAction("selection-cleared");return;
      case "font":actions.toggleMenu();return;
      case "font-up":actions.setFontSize(state.fontSize+1);mountConfig.onAction("font-changed");return;
      case "font-down":actions.setFontSize(state.fontSize-1);mountConfig.onAction("font-changed");return;
      case "theme":actions.setTheme(THEMES[(THEMES.indexOf(state.theme)+1)%THEMES.length]);mountConfig.onAction("theme-changed");return;
      case "expand":actions.toggleExpanded();return;
      case "exit-fullscreen":actions.setReadingMode("study");mountConfig.onAction("mode-changed");return;
      case "study":actions.setReadingMode("study");mountConfig.onAction("mode-changed");return;
      case "normal":actions.setReadingMode("normal");mountConfig.onAction("mode-changed");return;
      default:mountConfig.onAction(a);return;
    }
  }
  function changeHandler(event){
    const pref=event.target.closest("[data-toolbar-pref]");
    if(pref){actions.setPreference(pref.dataset.toolbarPref,pref.checked);mountConfig.onAction("preferences-changed");}
  }
  function mount(config){
    unmount();
    mountConfig=config;
    mountRoot=typeof config.root==="string"?document.getElementById(config.root):config.root;
    if(!mountRoot)return ()=>{};
    const root=mountRoot;
    root.addEventListener("click",clickHandler);
    root.addEventListener("change",changeHandler);
    unsubscribe=subscribe(s=>s,renderToolbar);
    renderToolbar();
    return unmount;
  }
  function unmount(){
    if(unsubscribe){unsubscribe();unsubscribe=null;}
    if(mountRoot){mountRoot.removeEventListener("click",clickHandler);mountRoot.removeEventListener("change",changeHandler);}
    mountRoot=null;mountConfig=null;
  }
  global.PBToolbar={getState:snapshot,subscribe,actions,priority,visibleActions,mount,unmount,COLORS};
})(window);

;
(function(global){
"use strict";
/* Shared visual and interaction manager for MyBible-style floating study windows.
   The reader beneath remains scrollable; small panels can be moved on desktop. */
var layer=1100;
var MOBILE_BREAKPOINT=720;
function getPanel(root){return root&&root.querySelector(".myb-window");}
function applyTab(root,id){
 var panel=getPanel(root);if(!panel)return;
 var tabs=panel.querySelectorAll("[data-pb-win-tab]");
 var known=Array.from(tabs).some(function(el){return el.dataset.pbWinTab===id;});
 if(!known&&tabs.length)id=tabs[0].dataset.pbWinTab;
 tabs.forEach(function(btn){
  var selected=btn.dataset.pbWinTab===id;
  btn.classList.toggle("active",selected);
  btn.setAttribute("aria-selected",selected?"true":"false");
  btn.setAttribute("tabindex",selected?"0":"-1");
 });
 panel.querySelectorAll("[data-pb-win-panel]").forEach(function(body){
  var on=body.dataset.pbWinPanel===id;
  body.hidden=!on;
  body.setAttribute("aria-hidden",on?"false":"true");
 });
 panel.dataset.activeTab=id||"";
}
function mount(root,config){
 config=config||{};
 if(!root)return function(){};
 var panel=getPanel(root);if(!panel)return function(){};
 layer+=2;
 root.style.zIndex=String(layer);
 panel.tabIndex=-1;
 var onClose=typeof config.onClose==="function"?config.onClose:function(){root.remove();};
 applyTab(root,config.defaultTab||"strong");
 if(config.anchor&&global.innerWidth>=MOBILE_BREAKPOINT&&typeof config.anchor.getBoundingClientRect==="function"){
  try{
   var around=config.anchor.getBoundingClientRect(),size=panel.getBoundingClientRect();
   var left=around.right+14,top=around.top-34;
   if(left+size.width>global.innerWidth-8)left=around.left-size.width-14;
   if(left<8)left=global.innerWidth-size.width-12;
   panel.style.left=Math.max(8,left)+"px";
   panel.style.top=Math.max(8,Math.min(top,global.innerHeight-size.height-8))+"px";
   panel.style.right="auto";
  }catch(_){}
 }

 function handleClick(event){
  var tab=event.target.closest("[data-pb-win-tab]");
  if(tab&&panel.contains(tab)){
   event.preventDefault();event.stopPropagation();
   applyTab(root,tab.dataset.pbWinTab);
   return;
  }
  var action=event.target.closest("[data-pb-win-action]");
  if(!action||!panel.contains(action))return;
  event.preventDefault();event.stopPropagation();
  var name=action.dataset.pbWinAction;
  if(name==="close"){onClose();return;}
  if(name==="minimize"){
   var minimized=panel.classList.toggle("myb-is-minimized");
   panel.classList.remove("myb-is-maximized");
   action.setAttribute("aria-label",minimized?"Restaurar janela":"Recolher janela");
   action.textContent=minimized?"▢":"—";
   var max=panel.querySelector('[data-pb-win-action="maximize"]');
   if(max)max.setAttribute("aria-label","Ampliar janela");
   return;
  }
  if(name==="maximize"){
   if(panel.classList.contains("myb-is-minimized")){
    panel.classList.remove("myb-is-minimized");
    var min=panel.querySelector('[data-pb-win-action="minimize"]');
    if(min){min.textContent="—";min.setAttribute("aria-label","Recolher janela");}
   }
   var bigger=panel.classList.toggle("myb-is-maximized");
   action.setAttribute("aria-label",bigger?"Restaurar tamanho":"Ampliar janela");
   action.textContent=bigger?"❐":"▣";
   return;
  }
 }
 function bringForward(){
  layer+=2;root.style.zIndex=String(layer);
 }
 function moveStart(event){
  if(event.button!==0||event.target.closest("button, a, input, select, textarea"))return;
  if(event.pointerType==="touch"||global.innerWidth<MOBILE_BREAKPOINT)return;
  if(panel.classList.contains("myb-is-maximized")||panel.classList.contains("myb-is-minimized"))return;
  var target=event.currentTarget,rect=panel.getBoundingClientRect(),startX=event.clientX,startY=event.clientY;
  var left=rect.left,top=rect.top;
  if(target.setPointerCapture)try{target.setPointerCapture(event.pointerId);}catch(_){}
  panel.classList.add("myb-is-dragging");
  function moving(e){
   if(e.pointerId!==event.pointerId)return;
   var x=Math.max(6,Math.min(global.innerWidth-140,left+e.clientX-startX));
   var y=Math.max(6,Math.min(global.innerHeight-60,top+e.clientY-startY));
   panel.style.left=x+"px";panel.style.top=y+"px";
   panel.style.right="auto";panel.style.bottom="auto";
  }
  function finish(){
   panel.classList.remove("myb-is-dragging");
   target.removeEventListener("pointermove",moving);
   target.removeEventListener("pointerup",finish);
   target.removeEventListener("pointercancel",finish);
  }
  target.addEventListener("pointermove",moving);
  target.addEventListener("pointerup",finish);
  target.addEventListener("pointercancel",finish);
 }
 root.addEventListener("click",handleClick);
 panel.addEventListener("pointerdown",bringForward);
 var titlebar=panel.querySelector("[data-pb-win-titlebar]");
 if(titlebar)titlebar.addEventListener("pointerdown",moveStart);
 return function(){
  root.removeEventListener("click",handleClick);
  panel.removeEventListener("pointerdown",bringForward);
  if(titlebar)titlebar.removeEventListener("pointerdown",moveStart);
 };
}
global.PBWindowUI={mount:mount,activate:applyTab};
})(window);

;
(function(global){
"use strict";
var config=null,requestId=0,selectedContext=null,initialized=false,lastBibleTap=null,lastBibleActivation={node:null,at:0};
function escapeHtml(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function wrapHtml(html){
 var tags=String(html||"").split(/(<[^>]*>)/g),stack=[];
 function wrapChunk(text){return text.split(/(&(?:#\d+|#x[0-9a-f]+|[a-z]+);)/gi).map(function(fragment){if(/^&(?:#\d+|#x[0-9a-f]+|[a-z]+);$/i.test(fragment))return fragment;return fragment.replace(/[\p{L}\p{M}]+(?:[’'-][\p{L}\p{M}]+)*/gu,function(word){return '<span class="pb-linked-word" data-pb-word="'+escapeHtml(word)+'" role="button" tabindex="0" title="Toque uma vez para selecionar; duas vezes para consultar os dicionários">'+word+'</span>';});}).join("");}
 return tags.map(function(part){if(part.charAt(0)==="<"){if(/^<\s*\//.test(part)){if(stack.length)stack.pop();return part;}var m=/^<\s*([a-z][\w-]*)/i.exec(part);if(m&&!/\/\s*>$/.test(part)&&!["br","hr","img","input","meta"].includes(m[1].toLowerCase()))stack.push(m[1].toLowerCase()==="button"||m[1].toLowerCase()==="a"||/strong-word|data-pb-word|data-strong/.test(part));return part;}return stack.some(Boolean)?part:wrapChunk(part);}).join("");
}
var FALLBACK_LINK_BOOKS=["Gênesis","Genesis","Gn","Gen","Êxodo","Exodo","Êx","Ex","Levítico","Levitico","Lv","Lev","Números","Numeros","Nm","Num","Deuteronômio","Deuteronomio","Dt","Deut","Josué","Josue","Js","Josh","Juízes","Juizes","Jz","Judges","Rute","Rt","Ruth","1 Samuel","1Sam","1Sm","2 Samuel","2Sam","2Sm","1 Reis","1Rs","2 Reis","2Rs","1 Crônicas","1 Cronicas","1Cr","2 Crônicas","2 Cronicas","2Cr","Esdras","Ed","Ezra","Neemias","Ne","Neh","Ester","Est","Et","Esther","Jó","Job","Salmos","Salmo","Sl","Ps","Provérbios","Proverbios","Pv","Prov","Eclesiastes","Ec","Eccl","Cânticos","Canticos","Cantares","Ct","Song of Solomon","Isaías","Isaias","Is","Isa","Jeremias","Jr","Jer","Lamentações","Lamentacoes","Lm","Lam","Ezequiel","Ez","Ezek","Daniel","Dn","Dan","Oseias","Oséias","Os","Hos","Joel","Jl","Amós","Amos","Am","Obadias","Ob","Jonas","Jn","Jon","Miqueias","Miquéias","Mq","Mic","Naum","Na","Nah","Habacuque","Hc","Hab","Sofonias","Sf","Zep","Ageu","Ag","Hag","Zacarias","Zc","Zech","Malaquias","Ml","Mal","Mateus","Mt","Matt","Marcos","Mc","Mk","Lucas","Lc","Lk","João","Jo","John","Atos","At","Acts","Romanos","Rm","Rom","1 Coríntios","1 Corintios","1Co","2 Coríntios","2 Corintios","2Co","Gálatas","Galatas","Gl","Gal","Efésios","Efesios","Ef","Eph","Filipenses","Fp","Phil","Colossenses","Cl","Col","1 Tessalonicenses","1 Tess","1Ts","2 Tessalonicenses","2 Tess","2Ts","1 Timóteo","1 Timoteo","1Tm","2 Timóteo","2 Timoteo","2Tm","Tito","Tt","Tit","Filemom","Fm","Phm","Hebreus","Hb","Heb","Tiago","Tg","Jas","1 Pedro","1Pe","2 Pedro","2Pe","1 João","1Jo","2 João","2Jo","3 João","3Jo","Judas","Jd","Jude","Apocalipse","Ap","Rev"];
function escapeRegex(value){return String(value).replace(/[.*+?^$()|[\]\\]/g,"\\$&").replace(/\s+/g,"\\s+");}
function linkifyText(value){var raw=String(value==null?"":value),aliases=FALLBACK_LINK_BOOKS.slice();if(config&&typeof config.getBookAliases==="function")aliases=aliases.concat(config.getBookAliases()||[]);aliases=Array.from(new Set(aliases.filter(Boolean))).sort(function(a,b){return b.length-a.length;});var booksPattern=aliases.map(escapeRegex).join("|");var re=new RegExp("(^|[^A-Za-z0-9À-ÿ])((?:[GH]\\s*0*\\d{1,5}[a-z]?)|(?:"+booksPattern+")\\s+\\d{1,3}(?:(?::|\\.)\\s*\\d{1,3}(?:\\s*[-–—]\\s*\\d{1,3})?)?)","gi");var out="",cursor=0,match;while((match=re.exec(raw))!==null){var start=match.index+match[1].length,token=match[2],strong=/^[GH]/i.test(token);out+=escapeHtml(raw.slice(cursor,start));if(strong){var code=token.replace(/\s+/g,"").toUpperCase().replace(/^([GH])0+/,"$1");out+='<button type="button" class="pb-dict-inline-link" data-pb-study-link="strong" data-strong-code="'+escapeHtml(code)+'" title="Abrir léxico Strong '+escapeHtml(code)+'">'+escapeHtml(code)+'</button>';}else{out+='<button type="button" class="pb-dict-inline-link" data-pb-study-link="reference" data-reference="'+escapeHtml(token)+'" title="Abrir '+escapeHtml(token)+' na Bíblia">'+escapeHtml(token)+'</button>';}cursor=match.index+match[0].length;}return out+escapeHtml(raw.slice(cursor));}
function explicitStrongLinks(raw){return linkifyText(raw);}
function close(){requestId++;selectedContext=null;var element=document.getElementById("pb-connected-panel");if(element)element.remove();}
function verseCodes(verse){
 var found=new Set();
 document.querySelectorAll("#chapter-body .verse-line").forEach(function(node){
  if(Number(node.dataset.verse)!==Number(verse))return;
  node.querySelectorAll("[data-strong]").forEach(function(b){
   var m=/\b([GH])0*(\d{1,5})\b/i.exec(b.textContent||b.dataset.strong||"");
   if(m)found.add(m[1].toUpperCase()+Number(m[2]));
  });
 });
 return Array.from(found).slice(0,35);
}
function getReference(verse){
 if(config&&config.readReference){var ref=config.readReference();return {book:ref.book,chapter:Number(ref.chapter),verse:Number(verse)||Number(ref.verse)||0,name:ref.name||ref.book};}
 return {book:"",chapter:0,verse:Number(verse)||0,name:""};
}
function drawResults(targetId,markup,seq){
 if(seq!==requestId)return;
 var element=document.getElementById(targetId);
 if(element)element.innerHTML=markup;
}
function open(kind,verse,word,anchor,moduleId){
 close();
 var seq=requestId,context=getReference(verse);
 var query=String(word||"").trim().slice(0,110);
 var selectedModule=String(moduleId||"");
 selectedContext={kind:kind,query:query,reference:context,comments:[],moduleId:selectedModule};
 var installed=global.PBModules.getInstalled();
 var selectedModuleInfo=installed.find(function(m){return m.type==="commentary"&&m.id===selectedModule;});
 var modal=document.createElement("div");modal.id="pb-connected-panel";modal.className="pb-connected-backdrop myb-window-backdrop";
 modal.innerHTML='<section class="pb-connected-sheet myb-window" role="dialog" aria-label="Estudo conectado" aria-modal="false">'+
 '<header class="myb-titlebar" data-pb-win-titlebar><div class="myb-titlebar-icon">▤</div><div class="myb-titlebar-info"><strong>ESTUDO CONECTADO</strong><small>'+escapeHtml(kind==="word"?query:(context.name+" "+context.chapter+":"+context.verse))+' · '+escapeHtml(context.name+" "+context.chapter+(context.verse?":"+context.verse:""))+'</small></div>'+
 '<div class="myb-window-controls"><button type="button" data-pb-win-action="minimize" aria-label="Recolher janela" title="Recolher">—</button><button type="button" data-pb-win-action="maximize" aria-label="Ampliar janela" title="Ampliar">▣</button><button type="button" data-pb-win-action="close" aria-label="Fechar janela" title="Fechar">×</button></div></header>'+
 '<nav class="myb-window-tabs" aria-label="Conteúdo da janela" role="tablist"><button type="button" data-pb-win-tab="dictionary" role="tab">α Dicionário</button><button type="button" data-pb-win-tab="commentaries" role="tab">▤ Comentários</button></nav>'+
 '<div class="myb-window-main"><div class="myb-quick-reference"><span class="myb-reference-label">'+escapeHtml(context.name+" "+context.chapter+":"+context.verse)+'</span><span class="myb-reference-info">'+(kind==="word"?"Pesquisa pela palavra portuguesa, sem atribuir Strong automaticamente.":kind==="commentary"?"Comentário selecionado: "+escapeHtml(selectedModuleInfo?selectedModuleInfo.name:"módulo instalado"):"Referência selecionada · módulos instalados")+'</span></div>'+
 '<section data-pb-win-panel="dictionary" class="myb-window-panel"><div id="pb-connected-dictionary"><p class="feature-note">Consultando os léxicos instalados…</p></div></section>'+
 '<section data-pb-win-panel="commentaries" class="myb-window-panel"><div id="pb-connected-commentaries"><p class="feature-note">Consultando os comentários vinculados à passagem…</p></div></section></div>'+
 '<footer class="myb-window-footer"><button class="btn slim" type="button" data-pb-note>✎ Nota</button><button class="btn slim" type="button" data-pb-sermon>▤ Sermão</button><button class="btn primary slim" type="button" data-page="modulos">⇩ Módulos</button></footer>'+
 '</section>';
 document.body.appendChild(modal);
 if(global.PBWindowUI)global.PBWindowUI.mount(modal,{defaultTab:kind==="word"?"dictionary":"commentaries",onClose:close,anchor:anchor});
 var linkedStrong=kind==="word"&&anchor&&anchor.dataset?String(anchor.dataset.pbStrongList||anchor.dataset.pbStrong||anchor.dataset.strong||"").split(",").map(function(v){return v.trim();}).filter(Boolean):[];
 var list=kind==="word"?Array.from(new Set([query].concat(linkedStrong))):verseCodes(context.verse);
 if(!list.length){
  drawResults("pb-connected-dictionary",'<p class="feature-note">Nenhum Strong confirmado para esse versículo. Toque diretamente numa palavra para pesquisar verbetes em português.</p>',seq);
 }else{
  Promise.all(list.map(function(entry){return global.PBModules.getDictionaryEntry(entry).then(function(rows){return {query:entry,rows:rows};});})).then(function(groups){
   if(seq!==requestId)return;
   var items=groups.flatMap(function(g){return g.rows.map(function(row){return {query:g.query,row:row};});});
   if(!items.length){drawResults("pb-connected-dictionary",'<p class="feature-note">Nenhum verbete correspondente nos léxicos instalados. '+(kind==="word"?"A pesquisa foi pela palavra em português, sem inferir Strong.":"Instale o léxico Strong correspondente para ver as definições.")+'</p>',seq);return;}
   drawResults("pb-connected-dictionary",items.slice(0,30).map(function(item){
    var row=item.row;
    return '<article class="pb-connection-entry"><div><strong>'+escapeHtml(row.moduleName)+'</strong><small>'+escapeHtml(row.topic)+'</small></div><p>'+explicitStrongLinks(row.definition)+'</p></article>';
   }).join(""),seq);
  }).catch(function(e){drawResults("pb-connected-dictionary",'<p class="feature-note">Não foi possível pesquisar os dicionários: '+escapeHtml(e.message||String(e))+'</p>',seq);});
 }
 global.PBModules.getCommentaries(context.book,context.chapter,context.verse,selectedModule).then(function(rows){
  if(seq!==requestId)return;
  selectedContext.comments=rows;
  if(!rows.length){
   var message=selectedModuleInfo?"O comentário "+selectedModuleInfo.name+" não possui conteúdo vinculado a esta referência.":"Nenhum comentário instalado cobre esta referência. Você pode importar módulos na seção Módulos.";
   drawResults("pb-connected-commentaries",'<p class="feature-note">'+escapeHtml(message)+'</p>',seq);
   return;
  }
  drawResults("pb-connected-commentaries",'<p class="pb-connections-count">'+rows.length+' comentário(s) encontrado(s)</p>'+rows.slice(0,30).map(function(row,i){
   var raw=String(row.text||""),short=raw.slice(0,2800);
   return '<article class="pb-connection-entry"><div><strong>'+escapeHtml(row.moduleName)+'</strong><small>'+escapeHtml(context.name+" "+(row.fromChapter||context.chapter)+(row.fromVerse?":"+row.fromVerse:""))+'</small></div>'+
    '<p>'+explicitStrongLinks(short)+(raw.length>2800?"…":"")+'</p>'+
    (raw.length>2800?'<details><summary>Ver comentário completo</summary><p>'+explicitStrongLinks(raw)+'</p></details>':"")+
    '<button class="btn slim" type="button" data-pb-comment="'+i+'">Adicionar comentário ao sermão</button></article>';
  }).join(""),seq);
 }).catch(function(e){drawResults("pb-connected-commentaries",'<p class="feature-note">Falha ao consultar comentários: '+escapeHtml(e.message||String(e))+'</p>',seq);});
}
function openCommentary(verse,moduleId,anchor){return open("commentary",verse,"",anchor,moduleId);}
function selectWordText(node){
 try{
  var selection=global.getSelection();
  if(!selection||!global.document.createRange)return;
  var range=global.document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
 }catch(_){}
}
function clearWordTextSelection(){
 try{var selection=global.getSelection();if(selection)selection.removeAllRanges();}catch(_){}
}
function activateBibleLink(node){
 var verseNode=node&&node.closest?node.closest("#chapter-body [data-verse]"):null,verse=verseNode?Number(verseNode.dataset.verse):null;
 var strongId=node.dataset.pbStrong||node.dataset.strong||"",strongList=String(node.dataset.pbStrongList||strongId).split(",").map(function(x){return x.trim();}).filter(Boolean),word=String(node.dataset.pbWord||node.textContent||"").trim();
 clearWordTextSelection();
 if(strongId&&node.matches(".strong-badge,button[data-strong]")){if(config&&config.onStrong&&config.onStrong(strongId,word,verse,node,strongList)===true)return;open("word",verse,strongId,node);return;}
 if(config&&config.onWord&&config.onWord(word,verse,node,strongId)===true)return;open("word",verse,word,node);
}
function activateStudyLink(node){var kind=node.dataset.pbStudyLink;if(kind==="reference"){if(config&&config.onStudyReference){config.onStudyReference(node.dataset.reference||"",node);return;}open("verse",0,"",node);return;}if(kind==="strong"){var code=node.dataset.strongCode||"";if(config&&config.onStudyStrong){config.onStudyStrong(code,node);return;}open("strong",0,code,node);}}
function init(opts){
 config=opts||{};if(initialized)return;initialized=true;
 document.addEventListener("click",function(e){
  var closeBtn=e.target.closest("[data-pb-close]");if(closeBtn){e.preventDefault();close();return;}
  var note=e.target.closest("[data-pb-note]");if(note){e.preventDefault();if(config.onNote)config.onNote(selectedContext);return;}
  var sermon=e.target.closest("[data-pb-sermon]");if(sermon){e.preventDefault();if(config.onSermon)config.onSermon(selectedContext);return;}
  var comment=e.target.closest("[data-pb-comment]");if(comment){e.preventDefault();var row=selectedContext&&selectedContext.comments&&selectedContext.comments[Number(comment.dataset.pbComment)];if(row&&config.onComment)config.onComment(row,selectedContext);return;}
  var studyLink=e.target.closest("[data-pb-study-link]");if(studyLink){e.preventDefault();e.stopImmediatePropagation();activateStudyLink(studyLink);return;}
  var bibleLink=e.target.closest("#chapter-body .pb-linked-word, #chapter-body .strong-word, #chapter-body .strong-badge, #chapter-body [data-strong]");
  if(bibleLink){
   e.stopImmediatePropagation();
   var now=Date.now();
   if(lastBibleTap&&lastBibleTap.node===bibleLink&&now-lastBibleTap.at<=540){
    e.preventDefault();lastBibleTap=null;
    if(lastBibleActivation.node!==bibleLink||now-lastBibleActivation.at>700){lastBibleActivation={node:bibleLink,at:now};activateBibleLink(bibleLink);}
   }else{
    e.preventDefault();
    lastBibleActivation={node:null,at:0};
    lastBibleTap={node:bibleLink,at:now};
    /* Primeiro toque: nenhuma janela, alteração de seleção ou salvamento. */
   }
   return;
  }
  lastBibleTap=null;var word=e.target.closest("[data-pb-word]");if(word){e.stopImmediatePropagation();return;}
  if(e.target.closest("[data-strong]"))return;
  /* Um clique no texto do versículo é sempre inerte. A seleção só acontece ao pressionar e segurar. */
 },true);
 document.addEventListener("dblclick",function(e){var bibleLink=e.target.closest("#chapter-body .pb-linked-word, #chapter-body .strong-word, #chapter-body .strong-badge, #chapter-body [data-strong]");if(!bibleLink)return;e.preventDefault();e.stopImmediatePropagation();if(lastBibleActivation.node===bibleLink&&Date.now()-lastBibleActivation.at<700)return;lastBibleTap=null;lastBibleActivation={node:bibleLink,at:Date.now()};activateBibleLink(bibleLink);},true);
 document.addEventListener("keydown",function(e){if(e.key==="Escape"){close();return;}if(e.key!=="Enter"&&e.key!==" ")return;var studyLink=e.target.closest&&e.target.closest("[data-pb-study-link]");if(studyLink){e.preventDefault();e.stopImmediatePropagation();activateStudyLink(studyLink);return;}var bibleLink=e.target.closest&&e.target.closest("#chapter-body .pb-linked-word, #chapter-body .strong-word, #chapter-body .strong-badge, #chapter-body [data-strong]");if(bibleLink){e.preventDefault();e.stopImmediatePropagation();lastBibleActivation={node:bibleLink,at:Date.now()};activateBibleLink(bibleLink);}},true);
}
global.PBConnections={init:init,wrapHtml:wrapHtml,linkifyText:linkifyText,open:open,openCommentary:openCommentary,close:close};
})(window);

;
(function(global){
"use strict";
/* Two-pane reading study: Bible on top; active, reference-synced commentary below.
 * All state and original module data remain with the existing Púlpito Bible app.
 */
var current=null,version=0;
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function installed(){return global.PBModules.getInstalled().filter(function(m){return m.type==="commentary";});}
function pickModule(){
 if(!current)return null;
 var all=installed(),id=current.config.readModule();
 var selected=all.find(function(m){return m.id===id;});
 if(!selected&&all.length){selected=all[0];current.config.onModuleChange(selected.id);}
 return selected||null;
}
function updateLabels(){
 if(!current)return;
 var config=current.config,ctx=config.readReference(),selected=pickModule(),root=current.root;
 var ref=root.querySelector("#pb-split-ref"),label=root.querySelector("#pb-split-name"),title=root.querySelector("#pb-split-title");
 if(ref)ref.textContent=(ctx.name||ctx.book)+" "+ctx.chapter+(ctx.verse?":"+ctx.verse:"");
 if(label)label.textContent=selected?(selected.abbreviation||selected.name):"Escolher módulo";
 if(title)title.textContent=selected?selected.name:"Comentários bíblicos";
}
function choices(query){
 var selected=current.config.readModule(),filter=String(query||"").toLocaleLowerCase("pt-BR").trim();
 var all=installed().filter(function(m){return (m.name+" "+m.abbreviation).toLocaleLowerCase("pt-BR").includes(filter);});
 if(!all.length)return '<div class="pb-split-message">'+(installed().length?"Nenhum comentário corresponde à pesquisa.":"Nenhum comentário instalado. Importe um módulo pelo menu Módulos.")+'</div>';
 return all.map(function(m){
  var active=m.id===selected;
  return '<button type="button" class="pb-split-choice'+(active?" active":"")+'" data-pbsplit="select" data-module-id="'+esc(m.id)+'" aria-pressed="'+active+'"><span class="pb-split-code">'+esc(m.abbreviation||"COM")+'</span><span class="pb-split-longname">'+esc(m.name)+'</span>'+(active?'<span class="pb-split-check">✓</span>':'')+'</button>';
 }).join("");
}
function showChoices(query){if(!current)return;var e=current.root.querySelector("#pb-split-choices");if(e)e.innerHTML=choices(query);}
function menu(force){
 if(!current)return;
 var picker=current.root.querySelector("#pb-split-picker"),button=current.root.querySelector("#pb-split-menu-button");
 if(!picker||!button)return;
 var show=typeof force==="boolean"?force:picker.hidden;
 picker.hidden=!show;button.setAttribute("aria-expanded",String(show));
 if(show){
  var field=current.root.querySelector("#pb-split-filter");
  if(field){field.value="";showChoices("");field.focus();}
 }
}
function renderRows(rows,ctx,selected){
 if(!rows.length)return '<div class="pb-split-message"><strong>Não há comentário do módulo '+esc(selected.name)+' para esta passagem.</strong><p>Toque em outro versículo ou escolha outro comentário no seletor.</p></div>';
 return rows.map(function(r,i){
  var ref=(ctx.name||ctx.book)+" "+(r.fromChapter||ctx.chapter)+(r.fromVerse?":"+r.fromVerse:"");
  return '<article class="pb-split-entry"><div class="pb-split-entry-heading"><strong>'+esc(ref)+'</strong><small>'+esc(r.marker||"")+'</small></div>'+
   '<div class="pb-split-entry-text">'+(global.PBConnections?global.PBConnections.linkifyText(r.text):esc(r.text))+'</div><div class="pb-split-entry-actions">'+
   '<button data-pbsplit="sermon" data-index="'+i+'" type="button">▤ Inserir no sermão</button>'+
   '<button data-pbsplit="copy" data-index="'+i+'" type="button">▣ Copiar</button></div></article>';
 }).join("");
}
function refresh(force){
 if(!current||!current.root.isConnected)return;
 var context=current.config.readReference(),module=pickModule(),target=current.root.querySelector("#pb-split-content");
 updateLabels();
 if(!target)return;
 var key=[context.book,context.chapter,context.verse,module&&module.id].join("/");
 if(!force&&key===current.lastKey)return;
 current.lastKey=key;
 var seq=++version;
 current.rows=[];
 if(!module){
  target.innerHTML='<div class="pb-split-message"><strong>Instale um módulo de comentários.</strong><p>Para acompanhar a Bíblia como no vídeo, entre em Módulos e importe o comentário Champlin ou outro módulo compatível.</p><button type="button" class="btn primary slim" data-page="modulos">⇩ Instalar comentário</button></div>';
  return;
 }
 target.innerHTML='<p class="pb-split-loading">Buscando '+esc(module.name)+' em '+esc((context.name||context.book)+" "+context.chapter+(context.verse?":"+context.verse:""))+'…</p>';
 global.PBModules.getCommentaries(context.book,context.chapter,context.verse,module.id).then(function(rows){
  if(!current||seq!==version||!current.root.isConnected)return;
  current.rows=rows;
  target.innerHTML=renderRows(rows,context,module);
  var pane=current.root.querySelector("#pb-split-scroll");if(pane){var restore=current.config.readRestoreScroll?Number(current.config.readRestoreScroll())||0:0;pane.scrollTop=restore;if(current.config.onRestoreScroll)current.config.onRestoreScroll();}
 }).catch(function(err){
  if(seq!==version||!current)return;
  target.innerHTML='<div class="pb-split-message">Falha ao carregar comentários: '+esc(err.message||String(err))+'</div>';
 });
}
function resize(delta){
 if(!current)return;
 var n=Math.max(24,Math.min(67,(Number(current.config.readSize())||44)+delta));
 current.root.style.setProperty("--pb-comment-height",n+"%");
 current.config.onResize(n);
}
function handler(event){
 var c=current;if(!c||!c.root.contains(event.target))return;
 var btn=event.target.closest("[data-pbsplit]");
 if(!btn)return;
 event.preventDefault();event.stopPropagation();
 switch(btn.dataset.pbsplit){
 case "menu":menu();return;
 case "dictionary":menu(false);if(c.config.onDictionary)c.config.onDictionary();return;
 case "close":c.config.onClose();return;
 case "prev":case "next":{
  var all=installed(),idx=all.findIndex(function(m){return m.id===c.config.readModule();});
  if(all.length)c.config.onModuleChange(all[(idx+(btn.dataset.pbsplit==="next"?1:-1)+all.length)%all.length].id);
  menu(false);refresh(true);return;
 }
 case "select":
  c.config.onModuleChange(btn.dataset.moduleId);menu(false);refresh(true);return;
 case "grow":resize(8);return;
 case "shrink":resize(-8);return;
 case "sermon":{
  var row=c.rows[Number(btn.dataset.index)];
  if(row)c.config.onSermon(row);return;
 }
 case "copy":{
  var item=c.rows[Number(btn.dataset.index)];
  if(item&&navigator.clipboard&&navigator.clipboard.writeText){
   navigator.clipboard.writeText(item.text).then(function(){c.config.notify("Comentário copiado");}).catch(function(){c.config.notify("Não foi possível copiar");});
  }return;
 }
 }
}
function keyHandler(e){
 if(!current||!current.root.contains(e.target))return;
 if(e.key==="Escape"){menu(false);return;}
 if(e.target.closest("[data-pbsplit-resizer]")&&(e.key==="ArrowUp"||e.key==="ArrowDown")){
  e.preventDefault();resize(e.key==="ArrowUp"?4:-4);
 }
}
function bindDrag(grip,root){
 if(!grip)return;
 var move=null,finish=null;
 grip.addEventListener("pointerdown",function(e){
  if(e.button!==0)return;
  var bounds=root.getBoundingClientRect(),startY=e.clientY,start=Number(current.config.readSize())||44;
  e.preventDefault();
  if(grip.setPointerCapture)try{grip.setPointerCapture(e.pointerId);}catch(_){}
  move=function(ev){
   if(ev.pointerId!==e.pointerId)return;
   var pct=start-((ev.clientY-startY)/Math.max(bounds.height,1))*100;
   pct=Math.max(24,Math.min(67,Math.round(pct)));
   root.style.setProperty("--pb-comment-height",pct+"%");
   current.dragSize=pct;
  };
  finish=function(){
   if(move)grip.removeEventListener("pointermove",move);
   if(finish){grip.removeEventListener("pointerup",finish);grip.removeEventListener("pointercancel",finish);}
   if(current&&current.dragSize){current.config.onResize(current.dragSize);current.dragSize=null;}
  };
  grip.addEventListener("pointermove",move);grip.addEventListener("pointerup",finish);grip.addEventListener("pointercancel",finish);
 });
}
function attach(config){
 destroy();
 var columns=document.querySelector(".reader-columns");
 if(!columns||!columns.parentNode)return;
 var host=document.createElement("div");host.id="pb-study-split";host.className="pb-study-split";
 host.style.setProperty("--pb-comment-height",(Number(config.readSize())||44)+"%");
 var top=document.createElement("div");top.className="pb-split-bible";top.id="pb-split-bible";
 columns.parentNode.insertBefore(host,columns);
 host.appendChild(top);top.appendChild(columns);
 var grip=document.createElement("div");grip.className="pb-split-resizer";grip.setAttribute("role","separator");
 grip.setAttribute("tabindex","0");grip.setAttribute("aria-label","Ajustar tamanho das janelas");
 grip.setAttribute("data-pbsplit-resizer","");
 grip.innerHTML='<span></span>';host.appendChild(grip);
 var bottom=document.createElement("section");bottom.id="pb-split-comments";bottom.className="pb-split-comments";
 bottom.innerHTML='<header class="pb-split-bar">'+
 '<button id="pb-split-menu-button" type="button" class="pb-split-selector" data-pbsplit="menu" aria-expanded="false" aria-controls="pb-split-picker">▤ <span id="pb-split-name">Comentários</span> <b>⌄</b></button>'+
 '<strong class="pb-split-ref" id="pb-split-ref"></strong><button class="pb-split-switch-dictionary" type="button" data-pbsplit="dictionary" aria-label="Abrir dicionários" title="Mostrar dicionários">α <span>Dicionários</span></button><div class="pb-split-toolbar-actions">'+
 '<button data-pbsplit="prev" type="button" aria-label="Módulo anterior">‹</button><button data-pbsplit="next" type="button" aria-label="Próximo módulo">›</button>'+
 '<button data-pbsplit="grow" type="button" aria-label="Ampliar comentários">▴</button><button data-pbsplit="shrink" type="button" aria-label="Reduzir comentários">▾</button>'+
 '<button data-pbsplit="close" type="button" aria-label="Fechar a janela de comentários">×</button></div></header>'+
 '<div class="pb-split-picker" id="pb-split-picker" hidden>'+
 '<div class="pb-split-picker-heading"><strong>Comentários instalados</strong><span>'+installed().length+' módulos</span></div>'+
 '<input id="pb-split-filter" type="search" placeholder="Pesquisar comentário…" aria-label="Pesquisar comentário instalado">'+
 '<div class="pb-split-choices" id="pb-split-choices"></div><button type="button" data-page="modulos" class="pb-split-install">⇩ Instalar outro módulo</button></div>'+
 '<div class="pb-split-scroll" id="pb-split-scroll"><div class="pb-split-heading"><strong id="pb-split-title">Comentários</strong><span>Passagem sincronizada</span></div><div id="pb-split-content" aria-live="polite"></div></div>';
 host.appendChild(bottom);
 current={root:host,config:config,rows:[],lastKey:""};
 host.addEventListener("click",handler);
 host.addEventListener("keydown",keyHandler);
 var filter=host.querySelector("#pb-split-filter");
 if(filter)filter.addEventListener("input",function(e){showChoices(e.target.value);});
 bindDrag(grip,host);
 updateLabels();
 refresh(true);
}
function destroy(){
 version++;
 if(current&&current.root){current.root.removeEventListener("click",handler);current.root.removeEventListener("keydown",keyHandler);}
 current=null;
}
global.PBSplitStudy={attach:attach,destroy:destroy,refresh:refresh,menu:menu};
})(window);

;
(function(global){
"use strict";
/* Dictionary study workspace: linked words/Strong -> right-hand lexicon window,
   matching the MyBible two-window interaction. Existing data stays in IndexedDB. */
var session=null,requestSerial=0;
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function dictionaryModules(){return global.PBModules.getInstalled().filter(function(m){return m.type==="dictionary";});}
function selectedModule(){
 if(!session)return null;
 var modules=dictionaryModules(),active=modules.find(function(m){return m.id===session.config.readModule();});
 if(!active&&modules.length){
  active=modules[0];session.config.onModuleChange(active.id);
 }
 return active||null;
}
function refLabel(){if(!session)return "";var c=session.config.readReference();return (c.name||c.book)+" "+c.chapter+(c.verse?":"+c.verse:"");}
function normalizeTerm(text){return String(text||"").trim().replace(/^[.,:;!?]+|[.,:;!?]+$/g,"").slice(0,120);}
function linkText(value){return global.PBConnections&&global.PBConnections.linkifyText?global.PBConnections.linkifyText(value):esc(value);}
function choices(filter){
 var modules=dictionaryModules(),q=String(filter||"").toLocaleLowerCase("pt-BR").trim();
 var valid=modules.filter(function(m){return (m.name+" "+m.abbreviation).toLocaleLowerCase("pt-BR").includes(q);});
 if(!valid.length)return '<p class="pb-dict-empty">'+(modules.length?"Não há dicionário com esse nome.":"Nenhum dicionário instalado neste navegador. Abra Módulos para importar um arquivo SQLite3 compatível.")+'</p>';
 return valid.map(function(m){
  var active=m.id===session.config.readModule();
  return '<button type="button" class="pb-dict-choice pb-split-choice'+(active?" active":"")+'" data-pbdict="select" data-dict-id="'+esc(m.id)+'" aria-pressed="'+active+'">'+
   '<span class="pb-dict-short">'+esc(m.abbreviation||"DIC")+'</span><span class="pb-dict-full">'+esc(m.name)+'</span>'+(active?'<b>✓</b>':'')+'</button>';
 }).join("");
}
function picker(force){
 if(!session)return;
 var box=session.root.querySelector("#pb-dictionary-picker"),button=session.root.querySelector("#pb-dictionary-select");
 if(!box||!button)return;
 var show=typeof force==="boolean"?force:box.hidden;
 box.hidden=!show;button.setAttribute("aria-expanded",String(show));
 if(show){
  var input=session.root.querySelector("#pb-dictionary-module-filter"),list=session.root.querySelector("#pb-dictionary-choices");
  if(input)input.value="";
  if(list)list.innerHTML=choices("");
  if(input)input.focus();
 }
}
function labels(){
 if(!session)return;
 var root=session.root,m=selectedModule(),name=root.querySelector("#pb-dictionary-name"),title=root.querySelector("#pb-dictionary-title"),ref=root.querySelector("#pb-dictionary-reference"),refTop=root.querySelector("#pb-dictionary-ref-top");
 if(name)name.textContent=m?(m.abbreviation||m.name):"Dicionários";
 if(title)title.textContent=normalizeTerm(session.term)||"Selecione uma palavra";
 if(ref)ref.textContent=refLabel();if(refTop)refTop.textContent=refLabel();
 var analyze=root.querySelector('[data-pbdict="analyze"]');
 if(analyze)analyze.hidden=!/^[GH]\d{1,5}$/i.test(session.term||"");
}
function recordTerm(term){
 if(!session)return;
 var normalized=normalizeTerm(term);
 if(!normalized)return;
 if(session.history[session.index]===normalized)return;
 session.history=session.history.slice(0,session.index+1);
 session.history.push(normalized);
 if(session.history.length>40)session.history.shift();
 session.index=session.history.length-1;
}
function lookup(term,opts){
 if(!session||!session.root.isConnected)return;
 var normalized=normalizeTerm(term),selected=selectedModule(),target=session.root.querySelector("#pb-dictionary-definition");
 if(!normalized||!target)return;
 opts=opts||{};
 session.term=normalized;
 if(!opts.noHistory)recordTerm(normalized);
 if(session.config.onTermChange)session.config.onTermChange(normalized);
 labels();
 var serial=++requestSerial;
 if(!selected){
  target.innerHTML='<div class="pb-dict-empty"><strong>Instale um dicionário para consultar “'+esc(normalized)+'”.</strong><p>Você pode importar dicionários MyBible SQLite3 ou ZIP na Biblioteca de Módulos.</p><button class="btn slim primary" data-page="modulos">⇩ Abrir módulos</button></div>';
  return;
 }
 target.innerHTML='<div class="pb-dict-loading">Buscando “'+esc(normalized)+'” em '+esc(selected.name)+'…</div>';
 global.PBModules.getDictionaryEntry(normalized,selected.id).then(function(entries){
  if(!session||serial!==requestSerial||!session.root.isConnected||session.config.readModule()!==selected.id||session.term!==normalized)return;
  if(!entries.length){
   target.innerHTML='<div class="pb-dict-empty"><strong>“'+esc(normalized)+'” não foi encontrado em '+esc(selected.name)+'.</strong><p>A busca usa o tópico do verbete. Palavras em português nem sempre são as mesmas formas originais; escolha outro dicionário ou toque em um número Strong identificado na Bíblia.</p></div>';return;
  }
  target.innerHTML=entries.map(function(e){
   return '<article class="pb-dict-entry"><div class="pb-dict-entry-title"><strong>'+esc(e.topic)+'</strong><small>'+esc(e.moduleName)+'</small></div>'+
    '<div class="pb-dict-definition">'+linkText(e.definition)+'</div></article>';
  }).join("");
  var scroll=session.root.querySelector("#pb-dictionary-scroll");if(scroll){var restore=session.config.readRestoreScroll?Number(session.config.readRestoreScroll())||0:0;scroll.scrollTop=restore;if(session.config.onRestoreScroll)session.config.onRestoreScroll();}
 }).catch(function(err){if(session&&serial===requestSerial)target.innerHTML='<p class="pb-dict-error">Falha ao consultar o dicionário: '+esc(err.message||String(err))+'</p>';});
}
function changeModule(id){
 if(!session||!dictionaryModules().some(function(m){return m.id===id;}))return;
 session.config.onModuleChange(id);picker(false);labels();
 if(session.term)lookup(session.term,{noHistory:true});
}
function cycleModule(offset){
 var all=dictionaryModules();if(!all.length||!session)return;
 var i=all.findIndex(function(m){return m.id===session.config.readModule();});
 changeModule(all[(i+offset+all.length)%all.length].id);
}
function historyMove(direction){
 if(!session)return;
 var next=session.index+direction;
 if(next<0||next>=session.history.length)return;
 session.index=next;
 lookup(session.history[next],{noHistory:true});
}
function handleClick(event){
 if(!session||!session.root.contains(event.target))return;
 var button=event.target.closest("[data-pbdict]");
 if(!button)return;
 event.preventDefault();event.stopPropagation();
 var act=button.dataset.pbdict;
 switch(act){
 case "picker":picker();break;
 case "select":changeModule(button.dataset.dictId);break;
 case "prev-module":cycleModule(-1);break;
 case "next-module":cycleModule(1);break;
 case "back":historyMove(-1);break;
 case "forward":historyMove(1);break;
 case "term":lookup(button.dataset.term);break;
 case "reference":session.config.onReference(button.dataset.reference);break;
 case "close":session.config.onClose();break;
 case "comments":if(session.config.onComments)session.config.onComments();break;
 case "analyze":session.config.onAnalyze(session.term);break;
 case "search":{var field=session.root.querySelector("#pb-dictionary-search");if(field)lookup(field.value);break;}
 case "copy":{
  var module=selectedModule(),content=session.root.querySelector("#pb-dictionary-definition");
  if(content&&navigator.clipboard&&navigator.clipboard.writeText){
   navigator.clipboard.writeText((module?module.name+" — ":"")+session.term+"\n"+content.innerText).then(function(){session.config.notify("Verbete copiado");}).catch(function(){session.config.notify("Não foi possível copiar");});
  }
  break;
 }
 }
}
function handleKey(e){
 if(!session||!session.root.contains(e.target))return;
 if(e.key==="Escape"){picker(false);return;}
 if(e.key==="Enter"&&e.target.id==="pb-dictionary-search"){e.preventDefault();lookup(e.target.value);}
}
function attach(config){
 destroy();
 var host=document.getElementById("pb-study-split");
 if(!host)return;
 host.classList.add("pb-dictionary-active");
 var panel=document.createElement("section");panel.id="pb-dictionary-pane";panel.className="pb-dictionary-pane pb-split-dictionary-pane";
 panel.setAttribute("aria-label","Janela de dicionários sincronizada com a Bíblia");
 panel.innerHTML='<header class="pb-dictionary-bar pb-split-bar">'+
  '<button type="button" class="pb-dictionary-select pb-split-selector" id="pb-dictionary-select" data-pbdict="picker" aria-controls="pb-dictionary-picker" aria-expanded="false">'+
   '<span>α</span><strong id="pb-dictionary-name">Dicionários</strong><b>⌄</b></button>'+
  '<strong class="pb-split-ref" id="pb-dictionary-ref-top"></strong><button type="button" class="pb-dict-switch-comments" data-pbdict="comments" aria-label="Abrir comentários" title="Mostrar comentários">▤ <span>Comentários</span></button><div class="pb-dictionary-nav pb-split-toolbar-actions"><button data-pbdict="back" aria-label="Verbete anterior" title="Voltar">‹</button><button data-pbdict="forward" aria-label="Próximo verbete" title="Avançar">›</button>'+
   '<button data-pbdict="prev-module" aria-label="Dicionário anterior" title="Dicionário anterior">⇤</button><button data-pbdict="next-module" aria-label="Próximo dicionário" title="Próximo dicionário">⇥</button>'+
   '<button data-pbdict="close" aria-label="Fechar dicionário" title="Fechar dicionário">×</button></div></header>'+
  '<div class="pb-dictionary-picker pb-split-picker" id="pb-dictionary-picker" hidden><div class="pb-dict-picker-heading"><strong>Dicionários instalados</strong><span>'+dictionaryModules().length+' módulo(s)</span></div>'+
   '<input type="search" id="pb-dictionary-module-filter" placeholder="Buscar módulo…" aria-label="Buscar módulo de dicionário">'+
   '<div class="pb-dictionary-choices pb-split-choices" id="pb-dictionary-choices"></div><button class="pb-dict-install" data-page="modulos" type="button">⇩ Instalar novo dicionário</button></div>'+
  '<div class="pb-dictionary-search-row"><input id="pb-dictionary-search" type="search" placeholder="Palavra, nome ou Strong G/H" aria-label="Pesquisar verbete">'+
   '<button type="button" data-pbdict="search" aria-label="Pesquisar">⌕</button></div>'+
  '<div id="pb-dictionary-scroll" class="pb-dictionary-scroll pb-split-scroll"><div class="pb-dictionary-heading pb-split-heading"><strong id="pb-dictionary-title">Dicionário</strong><small id="pb-dictionary-reference"></small></div>'+
   '<div id="pb-dictionary-definition"><div class="pb-dict-empty">Toque numa palavra da Bíblia ou pesquise um verbete para abrir o significado aqui.</div></div></div>'+
  '<footer class="pb-dictionary-footer"><button data-pbdict="analyze" type="button">α Análise Strong</button><button data-pbdict="copy" type="button">▣ Copiar</button></footer>';
 host.appendChild(panel);
 
 session={root:panel,host:host,config:config,term:"",history:[],index:-1};
 panel.addEventListener("click",handleClick);
 panel.addEventListener("keydown",handleKey);
 var moduleFilter=panel.querySelector("#pb-dictionary-module-filter");
 if(moduleFilter)moduleFilter.addEventListener("input",function(e){var list=panel.querySelector("#pb-dictionary-choices");if(list)list.innerHTML=choices(e.target.value);});
 labels();
 var term=normalizeTerm(config.readTerm());
 if(term)lookup(term);else{
  var title=panel.querySelector("#pb-dictionary-title");if(title)title.textContent="Toque numa palavra";
 }
}
function destroy(){
 ++requestSerial;
 if(!session)return;
 session.root.removeEventListener("click",handleClick);
 session.root.removeEventListener("keydown",handleKey);
 session.root.remove();
 session.host.classList.remove("pb-dictionary-active");
 session=null;
}
function syncReference(){if(session)labels();}
function isAttached(){return Boolean(session&&session.root&&session.root.isConnected);}
global.PBDictionaryStudy={attach:attach,destroy:destroy,lookup:lookup,isAttached:isAttached,picker:picker,syncReference:syncReference};
})(window);

;
(function(global){
"use strict";
/* Púlpito Bible — verse-specific comment indicators and long-press chooser.
   One delegated set of handlers, one IndexedDB scan per chapter, no scroll
   listeners. Word/Strong buttons keep their own short-tap behavior. */
var opts={},started=false,generation=0,reference=null,coverage=Object.create(null);
var press=null,holdTimer=null,holdHandledUntil=0,lastTap=null,lastOpened={verse:0,moduleId:"",at:0},picker=null;
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function verseElement(target){return target&&target.closest&&target.closest("#chapter-body .verse-line");}
function indicatorElement(target){return target&&target.closest&&target.closest("[data-comment-indicator]");}
function shortCommentaryName(value){
 var full=String(value||"").trim(),normalized=full.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 var known=[
  [/\bhagnos\b/,"Hagnos"],[/\bmatthew\s+henry\b|\bhenry\b/,"Henry"],
  [/\bchamplin\b/,"Champlin"],[/\bwiersbe\b/,"Wiersbe"],[/\bellicott\b/,"Ellicott"],
  [/\bholman\b/,"Holman"],[/\bpregador\b/,"Pregador"],[/\balmeida\b/,"Almeida"],
  [/\brevelada\b/,"Revelada"],[/\bmacarthur\b/,"MacArthur"],[/\bspurgeon\b/,"Spurgeon"],
  [/\bcalvino\b|\bcalvin\b/,"Calvino"],[/\bmoody\b/,"Moody"]
 ];
 for(var i=0;i<known.length;i++)if(known[i][0].test(normalized))return known[i][1];
 var cleaned=full.replace(/\.[a-z0-9]{2,5}$/i,"")
  .replace(/\b(comentarios?|expositivos?|comentario|commentary|complete|completo|completa|biblia|bible|da|do|de|das|dos|e|the|and|at|nt|pt|updated|edition|atualizada|atualizado|2017|2019|2020|2021|2022|2023|2024|2025|2026)\b/gi," ")
  .replace(/[^A-Za-zÀ-ÿ0-9]+/g," ").trim();
 return (cleaned.split(/\s+/)[0]||"Comentário").slice(0,18);
}
function candidates(n){return Array.isArray(coverage[Number(n)])?coverage[Number(n)]:[];}
function closePicker(){
 if(picker){picker.remove();picker=null;}
}
function invalidate(){
 ++generation;reference=null;coverage=Object.create(null);lastTap=null;lastOpened={verse:0,moduleId:"",at:0};
 closePicker();
 if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}
 press=null;
}
function decorate(book,chapter,verses){
 var gen=++generation;
 var valid=(verses||[]).map(Number).filter(function(n){return Number.isInteger(n)&&n>0;});
 reference={book:book,chapter:Number(chapter)};
 coverage=Object.create(null);
 closePicker();
 document.querySelectorAll("#chapter-body .pb-verse-comment-labels").forEach(function(node){node.remove();});
 document.querySelectorAll("#chapter-body [data-comment-indicator]").forEach(function(node){node.remove();});
 if(!valid.length||!global.PBModules.getInstalled().some(function(m){return m.type==="commentary";}))return;
 global.PBModules.getCommentaryCoverage(book,chapter,valid).then(function(found){
  if(gen!==generation||!reference||reference.book!==book||reference.chapter!==Number(chapter))return;
  coverage=found||Object.create(null);
  document.querySelectorAll("#chapter-body .verse-line").forEach(function(line){
   var n=Number(line.dataset.verse),mods=candidates(n);
   if(!mods.length)return;
   var labels=document.createElement("div");
   labels.className="pb-verse-comment-labels";
   labels.setAttribute("role","group");
   labels.setAttribute("data-comment-verse",String(n));
   labels.setAttribute("aria-label","Comentários vinculados a "+book+" "+chapter+":"+n);
   mods.forEach(function(mod){
    var button=document.createElement("button");
    button.type="button";
    button.className="pb-verse-comment-indicator";
    button.setAttribute("data-comment-indicator",String(n));
    button.setAttribute("data-comment-module",String(mod.moduleId||""));
    button.setAttribute("aria-label","Abrir "+(mod.moduleName||"comentário")+" em "+book+" "+chapter+":"+n+". Clique ou toque duas vezes para abrir.");
    button.setAttribute("title",(mod.moduleName||"Comentário")+" — clique ou toque duas vezes para abrir");
    button.textContent=shortCommentaryName(mod.moduleName);
    button.setAttribute("title",(mod.moduleName||"Comentário")+" — "+book+" "+chapter+":"+n);
    button.setAttribute("aria-label","Abrir comentário "+(mod.moduleName||"Comentário")+" em "+book+" "+chapter+":"+n);
    labels.appendChild(button);
   });
   if(labels.childNodes.length&&line.parentNode)line.parentNode.insertBefore(labels,line);
  });
 }).catch(function(err){
  if(gen===generation&&global.console&&console.warn)console.warn("Indicadores de comentários indisponíveis",err);
 });
}
function chooseForVerse(verse,moduleId,anchor){
 var n=Number(verse),matches=candidates(n);
 var chosen=matches.find(function(m){return m.moduleId===moduleId;});
 if(!chosen)chosen=matches.find(function(m){return m.moduleId===opts.readPreferredModule();})||matches[0];
 closePicker();
 if(!chosen)return;
 lastOpened={verse:n,moduleId:chosen.moduleId,at:Date.now()};
 if(opts.openCommentary)opts.openCommentary(n,chosen.moduleId,anchor);
}
function pickerContents(verse){
 var n=Number(verse),matches=candidates(n),installed=global.PBModules.getInstalled().filter(function(m){return m.type==="commentary";});
 var count=matches.reduce(function(sum,m){return sum+(m.count||0);},0);
 var choices=matches.map(function(m){
  var active=opts.readPreferredModule&&opts.readPreferredModule()===m.moduleId;
  return '<button class="pb-vc-choice'+(active?' active':'')+'" data-vc-choice="'+esc(m.moduleId)+'" type="button">'+
   '<span class="pb-vc-label">'+esc(m.moduleName)+'</span><small>'+m.count+' comentário(s)</small>'+(active?'<span class="pb-vc-check">✓</span>':'')+'</button>';
 }).join("");
 return '<div class="pb-vc-head"><div><strong>Escolher comentário</strong><small>'+esc(opts.readBookName?opts.readBookName():reference&&reference.book||"Bíblia")+' '+esc(reference&&reference.chapter||"")+':'+n+'</small></div>'+
 '<button class="pb-vc-close" data-vc-action="close" type="button" aria-label="Fechar">×</button></div>'+
 (matches.length?'<p class="pb-vc-hint">'+count+' comentário(s) encontrado(s) neste versículo. Escolha o módulo:</p><div class="pb-vc-list">'+choices+'</div>':
 '<p class="pb-vc-empty">'+(installed.length?'Nenhum comentário instalado corresponde a este versículo.':'Você ainda não instalou comentários neste navegador.')+'</p>')+
 '<button data-vc-action="modules" type="button" class="pb-vc-manage">⇩ Gerenciar módulos</button>';
}
function showPicker(verse,anchor){
 if(!reference)return;
 var n=Number(verse);if(!n||!Number.isInteger(n))return;
 closePicker();
 if(opts.selectVerse)opts.selectVerse(n);
 var el=document.createElement("div");
 el.id="pb-verse-comment-picker";el.className="pb-vc-picker";
 el.setAttribute("role","dialog");el.setAttribute("aria-label","Escolher comentário para o versículo "+n);
 el.innerHTML='<div class="pb-vc-toolbar" role="toolbar" aria-label="Ferramentas do versículo" style="display:flex;flex-wrap:wrap;gap:5px;padding:8px;border-bottom:1px solid #ccd5da">'+
  '<button type="button" data-vc-tool="comments">▤ Comentários</button>'+
  '<button type="button" data-vc-tool="note">✎ Minha anotação</button>'+
  '<button type="button" data-vc-tool="explain">◈ Explicar</button>'+
  '<button type="button" data-vc-tool="sermon">▤ Sermão</button>'+
  '<button type="button" data-vc-tool="copy">⧉ Copiar</button>'+
  '</div><div data-vc-picker-content hidden>'+pickerContents(n)+'</div>';
 el.dataset.verse=String(n);
 el.addEventListener("click",function(e){
  var tool=e.target.closest("[data-vc-tool]");
  if(tool){
   e.preventDefault();e.stopPropagation();
   var action=tool.dataset.vcTool;
   if(action==="comments"){
    var content=el.querySelector("[data-vc-picker-content]");
    if(content)content.hidden=!content.hidden;
    return;
   }
   closePicker();
   if(opts.onVerseTool)opts.onVerseTool(action,n,anchor);
   return;
  }
  var choice=e.target.closest("[data-vc-choice]");
  if(choice){e.preventDefault();e.stopPropagation();chooseForVerse(n,choice.dataset.vcChoice,anchor);return;}
  var action=e.target.closest("[data-vc-action]");
  if(action){e.preventDefault();e.stopPropagation();if(action.dataset.vcAction==="modules"&&opts.openModules){closePicker();opts.openModules();}else closePicker();}
 });
 document.body.appendChild(el);picker=el;
 if(anchor&&typeof anchor.getBoundingClientRect==="function"&&global.innerWidth>720){
  var rect=anchor.getBoundingClientRect();
  var width=el.offsetWidth||300,height=el.offsetHeight||250;
  el.style.position="fixed";
  el.style.left=Math.max(8,Math.min(global.innerWidth-width-8,rect.right+10))+"px";
  el.style.top=Math.max(12,Math.min(global.innerHeight-height-12,rect.top))+"px";
 }
 if(!candidates(n).length&&global.PBModules.getInstalled().some(function(m){return m.type==="commentary";})){
  var book=reference.book,chapter=reference.chapter,gen=generation;
  global.PBModules.getCommentaryCoverage(book,chapter,[n]).then(function(data){
   if(picker===el&&gen===generation&&reference&&reference.book===book&&reference.chapter===chapter){
    coverage[n]=data[n]||[];
    var content=el.querySelector("[data-vc-picker-content]");if(content)content.innerHTML=pickerContents(n);
   }
  }).catch(function(){});
 }
}
function stopPress(){if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}press=null;}
function onPointerDown(e){
 if(picker&&!picker.contains(e.target)&&!verseElement(e.target)){closePicker();}
 var marker=indicatorElement(e.target),verse=verseElement(e.target);
 if(marker||!verse||e.button!==0){stopPress();return;}
 stopPress();
 press={verse:Number(verse.dataset.verse),node:verse,x:e.clientX,y:e.clientY,pointerId:e.pointerId};
 holdTimer=setTimeout(function(){
  if(!press)return;
  var old=press;press=null;holdTimer=null;
  holdHandledUntil=Date.now()+900;
  if(opts.selectVerse)opts.selectVerse(old.verse);
 },560);
}
function onPointerMove(e){
 if(!press||e.pointerId!==press.pointerId)return;
 if(Math.abs(e.clientX-press.x)>13||Math.abs(e.clientY-press.y)>13)stopPress();
}
function onPointerEnd(e){if(press&&e.pointerId===press.pointerId)stopPress();}
function onContextMenu(e){
 var verse=verseElement(e.target);
 if(!verse||indicatorElement(e.target))return;
 e.preventDefault();
 stopPress();holdHandledUntil=Date.now()+900;
 if(opts.selectVerse)opts.selectVerse(Number(verse.dataset.verse));
}
function onClick(e){
 var badge=indicatorElement(e.target);
 if(badge){
  e.preventDefault();e.stopImmediatePropagation();
  var n=Number(badge.dataset.commentIndicator),moduleId=badge.dataset.commentModule||"",now=Date.now();
  /* Primeiro clique no nome do comentário não altera estado nem abre janela. */
  if(lastTap&&lastTap.verse===n&&lastTap.moduleId===moduleId&&now-lastTap.at<480){
   lastTap=null;
   if(lastOpened.verse!==n||lastOpened.moduleId!==moduleId||now-lastOpened.at>700)chooseForVerse(n,moduleId,badge);
  }else lastTap={verse:n,moduleId:moduleId,at:now};
  return;
 }
 if(Date.now()<holdHandledUntil&&verseElement(e.target)){
  e.preventDefault();e.stopImmediatePropagation();holdHandledUntil=0;return;
 }
 if(picker&&!picker.contains(e.target)&&!verseElement(e.target))closePicker();
}
function onDoubleClick(e){
 var badge=indicatorElement(e.target);
 if(!badge)return;
 e.preventDefault();e.stopImmediatePropagation();
 var n=Number(badge.dataset.commentIndicator),moduleId=badge.dataset.commentModule||"",now=Date.now();
 if(lastOpened.verse!==n||lastOpened.moduleId!==moduleId||now-lastOpened.at>700)chooseForVerse(n,moduleId,badge);
}
function onKeydown(e){
 if(e.key==="Escape"){closePicker();stopPress();return;}
 var badge=indicatorElement(e.target);
 if(!badge||(e.key!=="Enter"&&e.key!==" "))return;
 e.preventDefault();e.stopImmediatePropagation();
 chooseForVerse(badge.dataset.commentIndicator,badge.dataset.commentModule,badge);
}
function init(config){
 opts=config||{};
 if(started)return;
 started=true;
 document.addEventListener("pointerdown",onPointerDown,true);
 document.addEventListener("pointermove",onPointerMove,true);
 document.addEventListener("pointerup",onPointerEnd,true);
 document.addEventListener("pointercancel",onPointerEnd,true);
 document.addEventListener("contextmenu",onContextMenu,true);
 document.addEventListener("click",onClick,true);
 document.addEventListener("dblclick",onDoubleClick,true);
 document.addEventListener("keydown",onKeydown,true);
}
global.PBVerseComments={init:init,decorate:decorate,invalidate:invalidate,showPicker:showPicker};
})(window);

;
(function(){
"use strict";
var API="https://api.midvash.com/v1";
var MAIN=document.getElementById("app-main");
var TITLES={leitura:"Leitura bíblica",original:"Texto original & Strong",tutor:"Assistente de interpretação",exercicios:"Exercícios de exegese",sermao:"Criador de sermões",caderno:"Meu caderno",modulos:"Módulos e traduções",mercado:"Análise das Bíblias",projeto:"Recursos e evolução"};
var STORE_KEY="pulpito-bible-v1";
var booksFallback="Gênesis|genesis|50;Êxodo|exodus|40;Levítico|leviticus|27;Números|numbers|36;Deuteronômio|deuteronomy|34;Josué|joshua|24;Juízes|judges|21;Rute|ruth|4;1 Samuel|1-samuel|31;2 Samuel|2-samuel|24;1 Reis|1-kings|22;2 Reis|2-kings|25;1 Crônicas|1-chronicles|29;2 Crônicas|2-chronicles|36;Esdras|ezra|10;Neemias|nehemiah|13;Ester|esther|10;Jó|job|42;Salmos|psalms|150;Provérbios|proverbs|31;Eclesiastes|ecclesiastes|12;Cânticos|song-of-solomon|8;Isaías|isaiah|66;Jeremias|jeremiah|52;Lamentações|lamentations|5;Ezequiel|ezekiel|48;Daniel|daniel|12;Oseias|hosea|14;Joel|joel|3;Amós|amos|9;Obadias|obadiah|1;Jonas|jonah|4;Miqueias|micah|7;Naum|nahum|3;Habacuque|habakkuk|3;Sofonias|zephaniah|3;Ageu|haggai|2;Zacarias|zechariah|14;Malaquias|malachi|4;Mateus|matthew|28;Marcos|mark|16;Lucas|luke|24;João|john|21;Atos|acts|28;Romanos|romans|16;1 Coríntios|1-corinthians|16;2 Coríntios|2-corinthians|13;Gálatas|galatians|6;Efésios|ephesians|6;Filipenses|philippians|4;Colossenses|colossians|4;1 Tessalonicenses|1-thessalonians|5;2 Tessalonicenses|2-thessalonians|3;1 Timóteo|1-timothy|6;2 Timóteo|2-timothy|4;Tito|titus|3;Filemom|philemon|1;Hebreus|hebrews|13;Tiago|james|5;1 Pedro|1-peter|5;2 Pedro|2-peter|3;1 João|1-john|5;2 João|2-john|1;3 João|3-john|1;Judas|jude|1;Apocalipse|revelation|22".split(";").map(function(s,i){var p=s.split("|");return {name:p[0],slug:p[1],chapters:+p[2],testament:i<39?"old":"new"};});
var defaults={dictionaryOpen:false,dictionaryModuleId:"",dictionaryTerm:"",splitStudy:true,splitPct:44,commentModuleId:"",page:"leitura",book:"john",chapter:15,version:"alm1911",selectedVerse:4,theme:"light",fontSize:18,showStrong:true,showComments:false,showCrossRefs:false,showParallel:false,readerMode:"continuous",readerTheme:"sepia",focusMode:false,bookmarks:[],notes:[],studies:{},tutorStep:0,sermon:{title:"Permanecendo em Cristo",reference:"João 15:1–8",introduction:"",context:"",point1:"",point2:"",application:"",conclusion:""},exerciseAnswers:{},history:[],parallelVersion:"bpm"};
var saved={};try{saved=JSON.parse(localStorage.getItem(STORE_KEY)||"{}");}catch(e){}
var state=Object.assign({},defaults,saved);
state.sermon=Object.assign({},defaults.sermon,state.sermon||{});
var TS=window.PBToolbar, toolbarState=TS.getState();
state.fontSize=toolbarState.fontSize;
state.readerTheme=toolbarState.theme==="dark"?"night":toolbarState.theme;
state.readerMode=toolbarState.continuousText?"continuous":"verses";
state.showStrong=toolbarState.showStrong;
state.showComments=toolbarState.showComments;
state.showCrossRefs=toolbarState.showCrossRefs;
state.showParallel=toolbarState.showParallel;
state.focusMode=false;
var books=booksFallback.slice(),activeBook=books.find(function(b){return b.slug===state.book;})||books[42];
var chaptersCache={};try{chaptersCache=JSON.parse(localStorage.getItem("pb-chapters-v2")||"{}");}catch(e){}
var latestChapter=null,loadSeq=0,searchMessage="",toastTimer=null,pendingCommentScroll=0,pendingDictionaryScroll=0,preserveConnectionsOnNextRef=false;

var focusCommentVerse=0;
var BOOK_LINK_ALIASES={};
booksFallback.forEach(function(b){BOOK_LINK_ALIASES[b.name.toLocaleLowerCase("pt-BR")]=b.slug;BOOK_LINK_ALIASES[b.slug.replace(/-/g," ")]=b.slug;});
booksFallback.forEach(function(b){var normalized=b.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();BOOK_LINK_ALIASES[normalized]=b.slug;});
Object.assign(BOOK_LINK_ALIASES,{"gn":"genesis","gen":"genesis","ex":"exodus","êx":"exodus","lv":"leviticus","lev":"leviticus","nm":"numbers","num":"numbers","dt":"deuteronomy","deut":"deuteronomy","js":"joshua","jz":"judges","rt":"ruth","1sm":"1-samuel","2sm":"2-samuel","1rs":"1-kings","2rs":"2-kings","1cr":"1-chronicles","2cr":"2-chronicles","ed":"ezra","ne":"nehemiah","et":"esther","jó":"job","sl":"psalms","ps":"psalms","pv":"proverbs","ec":"ecclesiastes","ct":"song-of-solomon","is":"isaiah","jr":"jeremiah","lm":"lamentations","ez":"ezekiel","dn":"daniel","os":"hosea","jl":"joel","am":"amos","ob":"obadiah","jn":"jonah","mq":"micah","na":"nahum","hc":"habakkuk","sf":"zephaniah","ag":"haggai","zc":"zechariah","ml":"malachi","mt":"matthew","matt":"matthew","mc":"mark","mk":"mark","lc":"luke","lk":"luke","jo":"john","at":"acts","rm":"romans","rom":"romans","1co":"1-corinthians","2co":"2-corinthians","gl":"galatians","ef":"ephesians","fp":"philippians","cl":"colossians","1ts":"1-thessalonians","2ts":"2-thessalonians","1tm":"1-timothy","2tm":"2-timothy","tt":"titus","fm":"philemon","hb":"hebrews","tg":"james","1pe":"1-peter","2pe":"2-peter","1jo":"1-john","2jo":"2-john","3jo":"3-john","jd":"jude","ap":"revelation","rev":"revelation","genesis":"genesis","exodus":"exodus","john":"john","psalms":"psalms","1 cor":"1-corinthians","2 cor":"2-corinthians","1 joão":"1-john","2 joão":"2-john","3 joão":"3-john","1 pedro":"1-peter","2 pedro":"2-peter"});
var BOOK_ENGLISH_NAMES="Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation".split("|");
BOOK_ENGLISH_NAMES.forEach(function(name,i){BOOK_LINK_ALIASES[name.toLowerCase()]=booksFallback[i].slug;});
Object.assign(BOOK_LINK_ALIASES,{"gen":"genesis","lev":"leviticus","num":"numbers","deut":"deuteronomy","josh":"joshua","judg":"judges","1sam":"1-samuel","2sam":"2-samuel","1kgs":"1-kings","2kgs":"2-kings","1chr":"1-chronicles","2chr":"2-chronicles","neh":"nehemiah","est":"esther","ps":"psalms","prov":"proverbs","eccl":"ecclesiastes","song":"song-of-solomon","isa":"isaiah","jer":"jeremiah","lam":"lamentations","ezek":"ezekiel","dan":"daniel","hos":"hosea","obad":"obadiah","jon":"jonah","mic":"micah","nah":"nahum","hab":"habakkuk","zeph":"zephaniah","hag":"haggai","zech":"zechariah","mal":"malachi","matt":"matthew","mk":"mark","lk":"luke","acts":"acts","rom":"romans","1cor":"1-corinthians","2cor":"2-corinthians","gal":"galatians","eph":"ephesians","phil":"philippians","col":"colossians","1thess":"1-thessalonians","2thess":"2-thessalonians","1tim":"1-timothy","2tim":"2-timothy","tit":"titus","philem":"philemon","heb":"hebrews","james":"james","1pet":"1-peter","2pet":"2-peter","1john":"1-john","2john":"2-john","3john":"3-john","jude":"jude","rev":"revelation"});
window.PBVerseComments.init({
 readBookName:function(){return activeBook.name;},
 readPreferredModule:function(){return state.commentModuleId||"";},
 selectVerse:function(verse){
  var n=Number(verse)||0;if(!n)return;
  state.selectedVerse=n;
  var id=verseGlobalId(n),selected=TS.getState().currentVerseSelection||[];
  if(selected.indexOf(id)<0)TS.actions.toggleVerse(id);
  persist();
  refreshVerseDecorations();
  var label=document.getElementById("selected-reference");if(label)label.textContent=ref();
 },
 openCommentary:function(verse,moduleId,anchor){
  var n=Number(verse);
  if(!Number.isInteger(n)||n<1)return;
  var valid=window.PBModules.getInstalled().some(function(m){return m.type==="commentary"&&m.id===moduleId;});
  if(!valid||!window.PBConnections||!window.PBConnections.openCommentary)return;
  state.selectedVerse=n;
  state.commentModuleId=moduleId;
  persist();
  var reference=document.getElementById("selected-reference");
  if(reference)reference.textContent=ref();
  window.PBConnections.openCommentary(n,moduleId,anchor);
 },
 onVerseTool:function(action,n,anchor){
  state.selectedVerse=n;persist();
  if(action==="note"){noteModal();return;}
  if(action==="explain"){page("tutor");return;}
  if(action==="sermon"){
   state.sermon.context+=(state.sermon.context?"\\n\\n":"")+activeBook.name+" "+state.chapter+":"+n;
   persist();notify("Referência adicionada ao sermão");return;
  }
  if(action==="copy"){
   var verse=anchor&&anchor.innerText?anchor.innerText.trim():"";
   var output=activeBook.name+" "+state.chapter+":"+n+(verse?" — "+verse:"");
   if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(output).then(function(){notify("Versículo copiado");}).catch(function(){notify("Não foi possível copiar");});
   return;
  }
 },
 openModules:function(){page("modulos");}
});


window.PBConnections.init({
 getBookAliases:function(){return Object.keys(BOOK_LINK_ALIASES);},
 onSelectWord:function(word,verse,anchor){
  var n=Number(verse)||0;
  if(!n)return false;
  state.selectedVerse=n;
  persist();
  var label=document.getElementById("selected-reference");if(label)label.textContent=ref();
  return true;
 },
 onWord:function(word,verse,anchor){
  window.PBConnections.open("word",verse,word,anchor);
  return true;
 },
 onStrong:function(strongId,word,verse,anchor,strongList){
  if(Number(verse)>0){state.selectedVerse=Number(verse);persist();}
  openStrongPopup(strongId,anchor,word,strongList||[]);
  return true;
 },
 onStudyStrong:function(code,anchor){openStrongPopup(code,anchor);return true;},
 onStudyReference:function(reference){openLinkedReference(reference);return true;},
 shouldOpenVersePanel:function(){return false;},
 readReference:function(){return {book:state.book,chapter:state.chapter,verse:state.selectedVerse,name:activeBook.name};},
 setVerse:function(n){if(Number(n)>0){state.selectedVerse=Number(n);persist();window.PBSplitStudy.refresh();}},
 onNote:function(ctx){if(ctx&&ctx.reference&&ctx.reference.verse)state.selectedVerse=ctx.reference.verse;persist();noteModal();},
 onSermon:function(ctx){
  if(!ctx)return;
  var r=ctx.reference,reference=r.name+" "+r.chapter+":"+r.verse;
  var line=reference+(ctx.query?" — Palavra em português: "+ctx.query:"");
  state.sermon.context+=(state.sermon.context?"\n\n":"")+line;
  persist();notify("Referência integrada ao sermão");
 },
 onComment:function(row,ctx){
  if(!row)return;
  var reference=ctx&&ctx.reference?ctx.reference.name+" "+ctx.reference.chapter+":"+ctx.reference.verse:"";
  state.sermon.context+=(state.sermon.context?"\n\n":"")+row.moduleName+" — "+reference+"\n"+row.text;
  persist();notify("Comentário do módulo inserido no sermão");
 }
});

window.PBModules.init({notify:notify,onUpdated:function(select){if(select){state.version=select;state.selectedVerse=0;state.page="leitura";}else if(state.version.startsWith("local:")&&!window.PBModules.getModuleByVersion(state.version)){state.version="alm1911";}persist();render();}}).then(function(){if(state.page==="modulos"||state.page==="leitura")render();}).catch(function(err){console.warn("Biblioteca externa indisponível:",err);});
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function persist(){try{localStorage.setItem(STORE_KEY,JSON.stringify(state));}catch(e){notify("Não foi possível salvar no navegador");}}
function notify(s){var el=document.getElementById("toast");el.textContent=s;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.classList.remove("show");},3000);}
function ref(){return activeBook.name+" "+state.chapter+(state.selectedVerse?":"+state.selectedVerse:"");}
function title(k){return '<div class="eyebrow">PÚLPITO BIBLE / '+esc(TITLES[k]).toUpperCase()+'</div><h1 class="page-title">'+esc(TITLES[k])+'</h1>';}
function closeTopMenu(){
 var menu=document.getElementById("top-menu"),trigger=document.getElementById("menu-toggle");
 if(menu)menu.hidden=true;
 if(trigger)trigger.setAttribute("aria-expanded","false");
}
function page(s){if(s!=="leitura")window.PBVerseComments.invalidate();window.PBConnections.close();if(s!=="leitura"){TS.actions.clearSelection();TS.unmount();}state.page=s;persist();closeTopMenu();render();window.scrollTo({top:0,behavior:"instant"});}
function cacheKey(){return state.version+"/"+state.book+"/"+state.chapter;}
function currentNote(){return (state.notes||[]).find(function(n){return n.ref===ref();});}
function currentMarked(){return (state.bookmarks||[]).includes(ref());}
function setRef(book,ch,verse){window.PBVerseComments.invalidate();if(preserveConnectionsOnNextRef)preserveConnectionsOnNextRef=false;else window.PBConnections.close();TS.actions.clearSelection();stopAudio();state.book=book;state.chapter=Math.max(1,Number(ch)||1);state.selectedVerse=Number(verse)||0;activeBook=books.find(function(b){return b.slug===state.book;})||booksFallback.find(function(b){return b.slug===state.book;})||activeBook;persist();render();}
function chapterOptions(){var opts="";for(var i=1;i<=activeBook.chapters;i++) opts+='<option value="'+i+'"'+(i===state.chapter?" selected":"")+'>'+i+'</option>';return opts;}
function readBooks(){
 fetch(API+"/books").then(function(r){if(!r.ok)throw Error("API");return r.json();}).then(function(j){var list=Array.isArray(j.data)?j.data:(j.data&&j.data.books)||[];if(!Array.isArray(list)||list.length<60)return;books=list.map(function(b){var name=typeof b.name==="string"?b.name:(b.name&&b.name["pt-br"])||b.name.en||"";var slug=typeof b.slug==="string"?b.slug:(b.slug&&b.slug.en)||"";return {name:name,slug:slug,chapters:Number(b.chapters)||1,testament:b.testament};}).filter(function(b){return b.name&&b.slug;});activeBook=books.find(function(b){return b.slug===state.book;})||activeBook;if(state.page==="leitura")render();}).catch(function(){});
}
function loadChapter(){
 var key=cacheKey(),seq=++loadSeq;
 if(!state.version.startsWith("local:")&&chaptersCache[key]){latestChapter=chaptersCache[key];renderReaderContent();return;}
 latestChapter=null;var el=document.getElementById("chapter-body");if(el)el.innerHTML='<div class="loader">Carregando a passagem bíblica…</div>';
 function success(result){
  if(seq!==loadSeq||state.page!=="leitura")return;
  var cleanVerses=(result.verses||[]).map(function(v,i){if(typeof v==="string")return {number:i+1,text:v};return {number:Number(v.number||v.verse)||i+1,text:String(v.text||v.content||"")};});
  if(!cleanVerses.length)throw Error("Não foram encontrados versículos");
  latestChapter={verses:cleanVerses,copyright:result.copyright||"",version:result.version||state.version};
  if(!state.version.startsWith("local:")){
    chaptersCache[key]=latestChapter;var keys=Object.keys(chaptersCache);while(keys.length>18)delete chaptersCache[keys.shift()];
    try{localStorage.setItem("pb-chapters-v2",JSON.stringify(chaptersCache));}catch(e){}
  }
  renderReaderContent();
 }
 function fail(err){if(seq!==loadSeq)return;var b=document.getElementById("chapter-body");if(b)b.innerHTML='<div class="empty">'+esc(err&&err.message||"Não foi possível carregar o texto.")+'<br><br><button class="btn primary" data-act="retry">Tentar novamente</button> <button class="btn" data-page="modulos">Gerenciar módulos</button></div>';}
 if(state.version.startsWith("local:")){window.PBModules.getChapter(state.version,state.book,state.chapter).then(success).catch(fail);return;}
 fetch(API+"/"+encodeURIComponent(state.version)+"/"+encodeURIComponent(state.book)+"/"+state.chapter)
 .then(function(r){if(!r.ok)throw Error("Não foi possível obter o capítulo");return r.json();})
 .then(function(j){var d=j.data||{},v=d.verses||[];if(!v.length&&d.text)v=[d.text];return {verses:v,copyright:j.meta&&j.meta.copyright||"",version:d.version||state.version};})
 .then(success).catch(fail);
}

function verseGlobalId(number){
 var ids={genesis:"GN",exodus:"EX",psalms:"PS",john:"JN",matthew:"MT",mark:"MC",luke:"LC",acts:"AT",romans:"RM",revelation:"AP"};
 return (ids[state.book]||state.book.toUpperCase().replace(/-/g,""))+"."+state.chapter+"."+Number(number);
}
function selectionNumbers(){
 return TS.getState().currentVerseSelection.filter(id=>id.startsWith(verseGlobalId(1).replace(/\.1$/,"."))).map(id=>Number(id.split(".").pop())).filter(Number.isInteger).sort((a,b)=>a-b);
}
function refreshVerseDecorations(){
 var ts=TS.getState();
 var dock=document.querySelector(".reader-actiondock");if(dock)dock.hidden=!ts.currentVerseSelection.length;
 document.querySelectorAll("#chapter-body .verse-line").forEach(function(node){
  var id=node.dataset.usfm;
  node.classList.toggle("selected",ts.currentVerseSelection.includes(id));
  var color=TS.COLORS[ts.highlights[id]];
  node.classList.toggle("highlighted",!!color);
  if(color)node.style.setProperty("--verse-mark",color);
  else node.style.removeProperty("--verse-mark");
 });
}
function toolbarNavigation(){
 return {
  version:state.version,book:state.book,chapter:state.chapter,
  books:books.map(b=>({value:b.slug,label:b.name})),
  chapters:Array.from({length:activeBook.chapters},(_,i)=>({value:String(i+1),label:String(i+1)})),
  versions:[{value:"alm1911",label:"Almeida 1911"},{value:"bpm",label:"BPM"},{value:"onbv",label:"ONBV"},{value:"nva",label:"NVA"}].concat(
    window.PBModules.getInstalled().filter(m=>m.type==="bible").map(m=>({value:"local:"+m.id,label:m.abbreviation||m.name}))
  )
 };
}
function mountAppToolbar(){
 TS.mount({root:"dynamic-toolbar",readNavigation:toolbarNavigation,onAction:toolbarAction});
 refreshVerseDecorations();
}
function stopAudio(){
 if(window.speechSynthesis){try{window.speechSynthesis.cancel();}catch(e){}}
 TS.actions.setAudioState("idle");
}
function audioToolbarAction(){
 if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){notify("Leitura por voz indisponível neste navegador.");return;}
 var mode=TS.getState().audioState;
 if(mode==="playing"){window.speechSynthesis.pause();TS.actions.setAudioState("paused");return;}
 if(mode==="paused"){window.speechSynthesis.resume();TS.actions.setAudioState("playing");return;}
 if(!latestChapter){notify("Abra um capítulo para ativar o áudio.");return;}
 var selected=selectionNumbers();
 var parts=selected.length?latestChapter.verses.filter(v=>selected.includes(v.number)):latestChapter.verses;
 var content=parts.map(v=>String(v.text||"").replace(/<[^>]*>/g,"")).join(" ").slice(0,8500);
 if(!content.trim()){notify("Passagem sem texto de leitura.");return;}
 window.speechSynthesis.cancel();
 var msg=new SpeechSynthesisUtterance(content);msg.lang="pt-BR";msg.rate=.92;
 msg.onend=function(){TS.actions.setAudioState("idle");};
 msg.onerror=function(){TS.actions.setAudioState("idle");notify("A narração foi interrompida.");};
 window.speechSynthesis.speak(msg);TS.actions.setAudioState("playing");
}
function selectedVerseText(){
 if(!latestChapter)return "";
 var nums=selectionNumbers();
 return nums.map(n=>{var v=latestChapter.verses.find(x=>x.number===n);
  return v?activeBook.name+" "+state.chapter+":"+n+" — "+String(v.text||"").replace(/<[^>]*>/g,""):"";
 }).filter(Boolean).join("\n");
}
async function shareOrCopy(share){
 var content=selectedVerseText();if(!content){notify("Selecione pelo menos um versículo.");return;}
 if(share&&navigator.share){
  try{await navigator.share({title:activeBook.name+" "+state.chapter,text:content});TS.actions.clearSelection();refreshVerseDecorations();return;}
  catch(e){if(e.name==="AbortError")return;}
 }
 try{await navigator.clipboard.writeText(content);notify(share?"Texto copiado para compartilhar.":"Versículos copiados.");TS.actions.clearSelection();refreshVerseDecorations();}
 catch(e){notify("A cópia não foi permitida pelo navegador.");}
}
function toolbarAction(action){
 switch(action){
 case "highlight-applied":case "selection-cleared":refreshVerseDecorations();return;
 case "font-changed":state.fontSize=TS.getState().fontSize;persist();return;
 case "mode-changed":return;
 case "theme-changed":{
  var t=TS.getState().theme;state.readerTheme=t==="dark"?"night":t;state.theme=t==="dark"?"dark":"light";persist();renderReader();return;
 }
 case "preferences-changed":{
  var t=TS.getState();state.showStrong=t.showStrong;state.showComments=t.showComments;state.showCrossRefs=t.showCrossRefs;state.showParallel=t.showParallel;
  state.readerMode=t.continuousText?"continuous":"verses";persist();renderReader();return;
 }
 case "comments-verse":{
  var n=selectionNumbers()[0]||state.selectedVerse;
  if(n&&window.PBVerseComments)window.PBVerseComments.showPicker(n,document.querySelector('#chapter-body .verse-line[data-verse="'+n+'"]'));
  return;
 }
 case "explain-verse":{var n=selectionNumbers()[0];if(n){state.selectedVerse=n;persist();}page("tutor");return;}
 case "sermon-verse":{var n=selectionNumbers()[0];if(n){state.selectedVerse=n;state.sermon.context+=(state.sermon.context?"\\n\\n":"")+activeBook.name+" "+state.chapter+":"+n;persist();notify("Versículo adicionado ao sermão");}return;}
 case "copy":shareOrCopy(false);return;
 case "share":shareOrCopy(true);return;
 case "note":{var n=selectionNumbers();if(n.length){state.selectedVerse=n[0];persist();}noteModal();return;}
 case "audio":audioToolbarAction();return;
 case "search":{
  var el=document.querySelector(".reader-searchline");
  if(el){el.classList.toggle("search-open");if(el.classList.contains("search-open"))document.getElementById("reference-search")?.focus();}
  return;
 }
 case "prev":if(state.chapter>1)setRef(state.book,state.chapter-1);return;
 case "next":if(state.chapter<activeBook.chapters)setRef(state.book,state.chapter+1);return;
 case "comments":if(state.dictionaryOpen){hideDictionaryPanel();return;}state.splitStudy=!state.splitStudy;persist();renderReader();return;
 case "split-study":state.splitStudy=!state.splitStudy;if(!state.splitStudy)state.dictionaryOpen=false;persist();renderReader();return;
 case "strong":showDictionaryPanel();if(state.dictionaryTerm&&window.PBDictionaryStudy.isAttached())window.PBDictionaryStudy.lookup(state.dictionaryTerm,{noHistory:true});return;
 case "dictionary-pane":if(state.dictionaryOpen)hideDictionaryPanel();else showDictionaryPanel();return;
 case "notes":case "bookmarks":page("caderno");return;
 case "modules":page("modulos");return;
 case "sermon":page("sermao");return;
 case "tutor":page("tutor");return;
 default:return;
 }
}


/* Restricted, checked mappings only; we do not infer Strong alignment automatically. */
var inlineStrongMap={
 "john/15/4":[{pattern:/(?:permanecei|permaneçam|permaneça)/i,id:"G3306a"},{pattern:/ramo/i,id:"G2814"}],
 "john/15/5":[{pattern:/permanece/i,id:"G3306b"}],
 "genesis/1/1":[{pattern:/criou/i,id:"H1254"}],
 "psalms/73/3":[{pattern:/(?:ímpios|impios)/i,id:"H7563"}]
};
function annotateVerse(text,verseNumber){
 var source=String(text==null?"":text);
 var rules=inlineStrongMap[state.book+"/"+state.chapter+"/"+verseNumber]||[];
 if(!rules.length)return esc(source);
 var matches=[];
 rules.forEach(function(rule){var m=rule.pattern.exec(source);if(m)matches.push({from:m.index,to:m.index+m[0].length,id:rule.id});});
 matches.sort(function(a,b){return a.from-b.from;});
 var html="",cursor=0;
 matches.forEach(function(match){
  if(match.from<cursor)return;
  var word=words.find(function(w){return w.id===match.id;});
  if(!word)return;
  html+=esc(source.slice(cursor,match.from));
  html+='<span class="strong-word" tabindex="0" role="button" data-strong="'+esc(match.id)+'" title="Consultar Strong '+esc(word.code)+'">'+esc(source.slice(match.from,match.to))+'</span>';
  if(state.showStrong)html+='<button type="button" class="strong-badge" data-strong="'+esc(match.id)+'" aria-label="Dicionário Strong '+esc(word.code)+'" title="Clique uma vez para abrir o significado Strong '+esc(word.code)+'">'+esc(word.code)+'</button>';
  cursor=match.to;
 });
 return html+esc(source.slice(cursor));
}

function renderReaderContent(){
 var holder=document.getElementById("chapter-body");if(!holder||!latestChapter)return;
 var rows=latestChapter.verses.map(function(v){
  var r=activeBook.name+" "+state.chapter+":"+v.number;
  var vid=verseGlobalId(v.number),color=TS.COLORS[TS.getState().highlights[vid]]||"";
  return '<span class="verse-line'+(TS.getState().currentVerseSelection.includes(vid)?" selected":"")+(state.bookmarks.includes(r)?" marked":"")+(color?" highlighted":"")+'" data-usfm="'+esc(vid)+'" style="'+(color?"--verse-mark:"+color:"")+'" data-verse="'+v.number+'" role="button" tabindex="0" title="Pressione e segure para selecionar versículo '+v.number+'"><sup class="verse-num">'+v.number+'</sup>'+window.PBConnections.wrapHtml((state.version.startsWith("local:")?window.PBModules.renderVerse(v.text,state.book,state.showStrong):annotateVerse(v.text,v.number)))+'</span>';
 }).join(state.readerMode==="verses"?"":" ");
 holder.innerHTML='<div class="verse-list '+(state.readerMode==="verses"?"segmented":"")+'">'+rows+'</div><div class="credit">'+esc(latestChapter.copyright||"Texto disponibilizado pela API Midvash; consulte os termos da tradução.")+'</div>';
 var el=document.getElementById("selected-reference");if(el)el.textContent=ref();
 refreshVerseDecorations();
 var b=document.getElementById("bookmark-btn");if(b)b.textContent=currentMarked()?"★ Favorito":"☆ Favorito";
 if(state.showParallel)loadParallelText();
 if(state.showComments&&!state.splitStudy)loadInstalledComments();
 if(state.splitStudy)window.PBSplitStudy.refresh();
 if(state.dictionaryOpen)window.PBDictionaryStudy.syncReference();
 refreshVerseDecorations();
 window.PBVerseComments.decorate(state.book,state.chapter,latestChapter.verses.map(function(v){return v.number;}));
 if(focusCommentVerse){
  var selected=holder.querySelector('.verse-line[data-verse="'+focusCommentVerse+'"]');
  if(selected&&selected.scrollIntoView)selected.scrollIntoView({block:"nearest",behavior:"instant"});
  focusCommentVerse=0;
 }
}
function readerOptions(){
 return books.map(function(b){return '<option value="'+esc(b.slug)+'"'+(state.book===b.slug?" selected":"")+'>'+esc(b.name)+'</option>';}).join("");
}


/* Persistent linked dictionary window. Independent of the commentary panel. */
function attachDictionaryStudy(){
 if(!state.dictionaryOpen)return;
 window.PBDictionaryStudy.attach({
  readModule:function(){return state.dictionaryModuleId||"";},
  readTerm:function(){return state.dictionaryTerm||"";},
  readReference:function(){return {book:state.book,chapter:state.chapter,verse:state.selectedVerse||0,name:activeBook.name};},
  onModuleChange:function(id){state.dictionaryModuleId=id;persist();},
  onTermChange:function(term){state.dictionaryTerm=term;persist();},
  onClose:function(){state.dictionaryOpen=false;persist();window.PBDictionaryStudy.destroy();},
  onComments:function(){state.dictionaryOpen=false;persist();window.PBDictionaryStudy.destroy();},
  onReference:function(reference){openLinkedReference(reference);},
  onAnalyze:function(code){openStrongPopup(code);},
  readRestoreScroll:function(){return pendingDictionaryScroll;},
  onRestoreScroll:function(){pendingDictionaryScroll=0;},
  notify:notify
 });
}
function showDictionaryPanel(){
 var needsSplit=!state.splitStudy||!document.getElementById("pb-study-split");
 state.splitStudy=true;
 state.dictionaryOpen=true;
 persist();
 if(needsSplit){renderReader();return;}
 if(!window.PBDictionaryStudy.isAttached())attachDictionaryStudy();
}
function hideDictionaryPanel(){
 state.dictionaryOpen=false;persist();
 window.PBDictionaryStudy.destroy();
}
function openDictionaryTerm(term,verse){
 var token=String(term||"").trim();
 if(!token)return;
 if(verse!==null&&verse!==undefined&&Number(verse)>0){
  state.selectedVerse=Number(verse);
  window.PBSplitStudy.refresh();
 }
 state.dictionaryTerm=token;
 persist();
 showDictionaryPanel();
 if(window.PBDictionaryStudy.isAttached())window.PBDictionaryStudy.lookup(token);
}

function attachSplitStudy(){
 if(!state.splitStudy)return;
 window.PBSplitStudy.attach({
  readReference:function(){return {book:state.book,chapter:state.chapter,verse:state.selectedVerse||0,name:activeBook.name};},
  readModule:function(){return state.commentModuleId||"";},
  readSize:function(){return state.splitPct||44;},
  onResize:function(n){state.splitPct=n;persist();},
  onModuleChange:function(id){state.commentModuleId=id;persist();},
  onDictionary:showDictionaryPanel,
  onClose:function(){state.splitStudy=false;persist();renderReader();},
  onSermon:function(row){state.sermon.context+=(state.sermon.context?"\n\n":"")+row.moduleName+" — "+ref()+"\n"+row.text;persist();notify("Comentário inserido no sermão");},
  readRestoreScroll:function(){return pendingCommentScroll;},
  onRestoreScroll:function(){pendingCommentScroll=0;},
  notify:notify
 });
}
function renderReader(){
 window.PBVerseComments.invalidate();
 if(state.dictionaryOpen)state.splitStudy=true;
 window.PBDictionaryStudy.destroy();
 window.PBSplitStudy.destroy();
 var other=state.parallelVersion||"bpm";
 MAIN.innerHTML='<section class="reader-screen"><div id="dynamic-toolbar"></div><div class="reader-commandbar">'+
 '<div class="reader-top-controls"><div class="reader-brand"><span class="brand-small">✦</span><strong>Púlpito Bible</strong><span class="reader-tagline">Leitor avançado</span></div><div class="reader-passage-control"><select class="reader-select book-control" id="book-select" aria-label="Selecionar livro">'+readerOptions()+'</select><select class="reader-select chapter-control" id="chapter-select" aria-label="Selecionar capítulo">'+chapterOptions()+'</select><select class="reader-select version-control" id="version-select" aria-label="Selecionar tradução"><option value="alm1911"'+(state.version==="alm1911"?" selected":"")+'>Almeida 1911</option><option value="bpm"'+(state.version==="bpm"?" selected":"")+'>BPM</option><option value="onbv"'+(state.version==="onbv"?" selected":"")+'>ONBV</option><option value="nva"'+(state.version==="nva"?" selected":"")+'>NVA</option>'+window.PBModules.bibleOptions(state.version)+'</select></div><div class="reader-arrows"><button class="reader-icon" data-act="prev-chapter" aria-label="Capítulo anterior">‹</button><button class="reader-icon" data-act="next-chapter" aria-label="Próximo capítulo">›</button></div></div>'+
 '<div class="reader-quicktools"><button class="reader-tool'+(state.showStrong?" on":"")+'" data-act="toggle-strong">H/G <strong>Strong</strong><span class="mini-switch"></span></button><button class="reader-tool'+(state.showComments?" on":"")+'" data-act="toggle-comments">▤ Comentários</button><button class="reader-tool'+(state.showCrossRefs?" on":"")+'" data-act="toggle-crossrefs">⇄ Referências</button><button class="reader-tool'+(state.showParallel?" on":"")+'" data-act="toggle-parallel">◫ Duas Bíblias</button><button class="reader-tool" data-page="original">α Dicionário</button><button class="reader-tool" data-page="tutor">✧ Interpretar</button><button class="reader-tool" data-page="modulos">⇩ Instalar módulos</button></div>'+
 '<div class="reader-appearance"><label>Texto <select id="reader-mode" aria-label="Formato dos versículos"><option value="continuous"'+(state.readerMode==="continuous"?" selected":"")+'>Contínuo</option><option value="verses"'+(state.readerMode==="verses"?" selected":"")+'>Por versículo</option></select></label><label>Fundo <select id="reader-paper" aria-label="Estilo do leitor"><option value="sepia"'+(state.readerTheme==="sepia"?" selected":"")+'>Sépia</option><option value="white"'+(state.readerTheme==="white"?" selected":"")+'>Branco</option><option value="night"'+(state.readerTheme==="night"?" selected":"")+'>Noturno</option></select></label><button class="reader-icon" data-act="reader-font-down" aria-label="Diminuir fonte">A−</button><span class="reader-size">'+state.fontSize+'px</span><button class="reader-icon" data-act="reader-font-up" aria-label="Aumentar fonte">A+</button><button class="reader-tool" data-act="focus-mode">'+(state.focusMode?"◧ Mostrar menus":"⛶ Tela de leitura")+'</button></div></div>'+
 '<div class="reader-searchline"><input class="field" id="reference-search" placeholder="Ir para referência — João 15:4" aria-label="Ir para referência"><button class="btn slim" data-act="search-ref">Ir</button><span class="reader-hint">Toque no código azul para abrir o léxico.</span></div>'+
 '<div class="reader-columns"><article class="reader-paper '+esc(state.readerTheme)+'"><div class="reader-paper-head"><span class="reader-module">'+esc(state.version.toUpperCase())+'</span><div><div class="reader-overline">LIVRO E CAPÍTULO</div><h1>'+esc(activeBook.name)+' '+state.chapter+'</h1></div><button class="reader-favorite" id="bookmark-btn" data-act="bookmark">'+(currentMarked()?"★ Favorito":"☆ Favorito")+'</button></div><div id="chapter-body" class="reader-scripture"><div class="loader">Carregando Escrituras…</div></div><div class="reader-note"><strong>Strong no texto:</strong> os vínculos exibidos nesta versão são amostras conferidas para João 15:4–5 e Gênesis 1:1. A numeração de todo o texto dependerá de uma base morfológica alinhada à tradução portuguesa.</div></article>'+
 (state.showParallel?'<article class="reader-paper second '+esc(state.readerTheme)+'"><div class="reader-paper-head"><select id="parallel-version-select" class="reader-select"><option value="alm1911"'+(other==="alm1911"?" selected":"")+'>Almeida 1911</option><option value="bpm"'+(other==="bpm"?" selected":"")+'>BPM</option><option value="onbv"'+(other==="onbv"?" selected":"")+'>ONBV</option><option value="nva"'+(other==="nva"?" selected":"")+'>NVA</option>'+window.PBModules.bibleOptions(other)+'</select><h2>Tradução paralela</h2></div><div id="parallel-body" class="reader-scripture"><div class="loader">Carregando versão paralela…</div></div></article>':"")+'</div>'+
 (state.showComments||state.showCrossRefs?'<div class="reader-bottom-panels">'+(state.showComments?'<section class="card card-pad reader-extras"><div class="caps">COMENTÁRIOS</div><h2 class="section-heading">Observações do estudo</h2><p class="feature-note">'+(state.book==="john"&&state.chapter===15?"A figura da videira relaciona permanência em Cristo e frutificação. Leia João 15:1–8 como uma unidade literária antes de tirar conclusões a partir de um único verbo.":state.book==="psalms"&&state.chapter===73?"O salmista percebe a prosperidade dos ímpios e enfrenta uma crise de entendimento. A virada interpretativa ocorre no versículo 17. Palavra no original: ímpios <button class=\"comment-strong-badge\" data-pb-study-link=\"strong\" data-strong-code=\"H7563\">H7563</button>.":"Ainda não há comentários teológicos importados para este capítulo. Você pode criar suas próprias notas.")+' </p><div id="installed-comments" class="module-comment-list"><p class="tiny muted">Buscando comentários instalados…</p></div><button class="btn slim" data-act="note">✎ Escrever anotação</button><button class="btn slim" data-page="modulos">⇩ Instalar comentários</button></section>':"")+
 (state.showCrossRefs?'<section class="card card-pad reader-extras"><div class="caps">REFERÊNCIAS CRUZADAS</div><h2 class="section-heading">Passagens relacionadas</h2><p class="feature-note">Sugestões temáticas iniciais, não geradas automaticamente por um comentário externo.</p><div class="row">'+(state.book==="john"&&state.chapter===15?'<button class="btn slim" data-ref-open="João 6:56">João 6:56</button><button class="btn slim" data-ref-open="Gálatas 5:22">Gálatas 5:22</button>':'<button class="btn slim" data-ref-open="João 1:1">João 1:1</button>')+'</div></section>':"")+'</div>':"")+
 '<div class="reader-actiondock"><div class="reader-reference"><span>SELECIONADO</span><strong id="selected-reference">'+esc(ref())+'</strong></div><div class="row"><button class="btn slim" data-act="bookmark">☆ Marcar</button><button class="btn slim" data-act="note">✎ Anotar</button><button class="btn slim" data-page="sermao">▤ Sermão</button><button class="btn primary slim" data-page="tutor">✧ Interpretar</button></div></div></section>';
 if(state.splitStudy)attachSplitStudy();
 if(state.dictionaryOpen)attachDictionaryStudy();
 mountAppToolbar();
 loadChapter();
}
function loadParallelText(){
 if(!state.showParallel||state.page!=="leitura")return;
 var dest=document.getElementById("parallel-body");if(!dest)return;
 var other=state.parallelVersion||"bpm",book=state.book,chapter=state.chapter;
 function show(result){
  if(!state.showParallel||state.page!=="leitura"||book!==state.book||chapter!==state.chapter||other!==state.parallelVersion)return;
  var target=document.getElementById("parallel-body");if(!target)return;
  target.innerHTML='<div class="verse-list segmented">'+result.verses.map(function(v,i){return '<span class="verse-line"><sup class="verse-num">'+Number(v.number||v.verse||i+1)+'</sup>'+(other.startsWith("local:")?window.PBModules.renderVerse(v.text||"",book,state.showStrong):esc(typeof v==="string"?v:v.text||""))+'</span>';}).join("")+'</div><div class="credit">'+esc(result.copyright||"Créditos indicados pelo fornecedor do texto.")+'</div>';
 }
 function fail(){var target=document.getElementById("parallel-body");if(target)target.innerHTML='<p class="feature-note">Não foi possível carregar esta tradução. <button class="btn slim" data-page="modulos">Ver módulos</button></p>';}
 if(other.startsWith("local:")){window.PBModules.getChapter(other,book,chapter).then(show).catch(fail);return;}
 fetch(API+"/"+other+"/"+book+"/"+chapter).then(function(r){if(!r.ok)throw Error("Indisponível");return r.json();}).then(function(j){var d=j.data||{};return {verses:d.verses||[],copyright:j.meta&&j.meta.copyright||""};}).then(show).catch(fail);
}
function loadInstalledComments(){
 var panel=document.getElementById("installed-comments");if(!panel)return;
 var book=state.book,ch=state.chapter,verse=state.selectedVerse||0;
 window.PBModules.getCommentaries(book,ch,verse).then(function(data){
  var target=document.getElementById("installed-comments");if(!target||state.book!==book||state.chapter!==ch||!state.showComments)return;
  if(!data.length){target.innerHTML='<p class="tiny muted">Não há comentários instalados para esta passagem.</p>';return;}
  target.innerHTML='<div class="module-comment-header">'+data.length+' comentário(s) vinculado(s)</div>'+data.map(function(item){
   return '<article class="module-comment"><strong>'+esc(item.moduleName)+'</strong><small>'+esc(item.marker||"")+" · "+esc(activeBook.name)+" "+(item.fromChapter||ch)+(item.fromVerse?":"+item.fromVerse:"")+'</small><p>'+window.PBConnections.linkifyText(item.text)+'</p><button class="btn slim" data-comment-sermon="'+esc(item.moduleId)+'" data-comment-text="'+esc(item.text.slice(0,1000))+'">Inserir trecho no sermão</button></article>';
  }).join("");
 }).catch(function(e){var node=document.getElementById("installed-comments");if(node)node.innerHTML='<p class="tiny muted">Comentários indisponíveis: '+esc(e.message)+'</p>';});
}
function openStrongPopup(wordId,anchor,wordTerm,extraStrongIds){
 if(window.PBConnections)window.PBConnections.close();
 var requestedCode=String(wordId||"").toUpperCase().replace(/\s+/g,"");
 var canonicalCode=requestedCode.replace(/^([GH])0*(\d{1,5})[A-Z]?$/,"$1$2");
 var w=words.find(function(x){return String(x.id).toUpperCase()===requestedCode;})||
  words.find(function(x){return String(x.id).toUpperCase()===canonicalCode;})||
  words.find(function(x){return String(x.code||"").toUpperCase()===canonicalCode;});
 if(!w){
  var code=canonicalCode,value=Number(code.slice(1));
  if(!/^[GH][0-9]{1,5}$/.test(code))return;
  w={id:code,code:code,label:"—",reading:"Não disponível",lemma:"Não disponível",book:ref(),type:"Morfologia não instalada",tense:"A consultar",voice:"A consultar",mood:"A consultar",person:"A consultar",meaning:"Entrada Strong sem dicionário conectado",note:"O código Strong sozinho não informa o tempo verbal, a voz ou a forma gramatical desta ocorrência. Esses dados exigem um módulo morfológico alinhado ao versículo.",source:"https://biblehub.com/"+(code[0]==="H"?"hebrew":"greek")+"/"+value+".htm"};
 }
 currentWord=w;
 var refLabel=ref(),preferredTerm=String(wordTerm||"").trim();
 if(/^[GH][0-9]{1,5}[A-Z]?$/.test(preferredTerm.toUpperCase()))preferredTerm="";
 document.getElementById("strong-window")?.remove();
 var frame=document.createElement("div");frame.id="strong-window";frame.className="strong-overlay myb-window-backdrop";
 frame.innerHTML='<section class="strong-balloon myb-window" role="dialog" aria-label="Léxico Strong '+esc(w.code)+'" aria-modal="false">'+
 '<header class="myb-titlebar" data-pb-win-titlebar><div class="myb-titlebar-icon">α</div><div class="myb-titlebar-info"><strong>STRONG '+esc(w.code)+'</strong><small>'+esc(refLabel)+' · '+esc(w.reading)+'</small></div>'+
 '<div class="myb-window-controls"><button type="button" data-pb-win-action="minimize" aria-label="Recolher janela" title="Recolher">—</button><button type="button" data-pb-win-action="maximize" aria-label="Ampliar janela" title="Ampliar">▣</button><button type="button" data-pb-win-action="close" aria-label="Fechar janela" title="Fechar">×</button></div></header>'+
 '<nav class="myb-window-tabs" role="tablist" aria-label="Painéis de estudo"><button type="button" role="tab" data-pb-win-tab="strong">α Strong</button><button type="button" role="tab" data-pb-win-tab="dictionary">▣ Dicionários</button></nav>'+
 '<div class="myb-window-main">'+
 '<section class="myb-window-panel" data-pb-win-panel="strong">'+
 '<div class="strong-term"><span class="strong-code">'+esc(w.code)+'</span><span class="strong-original">'+esc(w.label)+'</span></div>'+
 '<p class="strong-roman">'+esc(w.reading)+' · Lema: '+esc(w.lemma)+'</p><div class="caps">SIGNIFICADO E MORFOLOGIA</div><h3>'+esc(w.meaning)+'</h3>'+
 '<div class="strong-morph"><span>'+esc(w.type)+'</span><span>'+esc(w.tense)+'</span><span>'+esc(w.voice)+'</span><span>'+esc(w.mood)+'</span><span>'+esc(w.person)+'</span></div>'+
 '<p class="feature-note">'+esc(w.note)+'</p>'+
 '<p class="lexicon-caveat">Uma definição lexical não determina, isoladamente, a interpretação da passagem. Compare o contexto e a forma original.</p>'+
 '<p class="strong-reference"><a href="'+esc(w.source)+'" target="_blank" rel="noopener noreferrer">Consultar referência lexical ↗</a></p>'+
 '</section>'+
 '<section class="myb-window-panel" data-pb-win-panel="dictionary"><div id="installed-strong-entry" class="module-comment-list" aria-live="polite"><p class="tiny muted">Consultando dicionários instalados…</p></div></section>'+
 ''+
 '</div>'+
 '<footer class="myb-window-footer strong-actions"><button class="btn slim" data-act="strong-copy">▣ Copiar</button><button class="btn slim" data-act="strong-study">α Estudar</button><button class="btn primary slim" data-act="strong-sermon">▤ Sermão</button></footer></section>';
 document.body.appendChild(frame);
 if(window.PBWindowUI)window.PBWindowUI.mount(frame,{defaultTab:(preferredTerm||(w.meaning==="Entrada Strong sem dicionário conectado"&&window.PBModules.getInstalled().some(function(m){return m.type==="dictionary";})))?"dictionary":"strong",onClose:function(){frame.remove();},anchor:anchor});
 var codes=Array.from(new Set([w.code].concat(extraStrongIds||[]).map(function(x){var id=String(x||"").toUpperCase(),found=words.find(function(item){return String(item.id).toUpperCase()===id;});var resolved=found?String(found.code||found.id):id;return resolved.replace(/^([GH][0-9]{1,5})[A-Z]+$/,"$1");}).filter(function(x){return /^[GH][0-9]{1,5}$/.test(x);})));
 var translated=preferredTerm;
 var lookups=codes.map(function(code){return {term:code,label:"Léxico Strong "+code};});
 if(translated)lookups.push({term:translated,label:"Dicionários · "+translated});
 Promise.all(lookups.map(function(item){return window.PBModules.getDictionaryEntry(item.term).then(function(entries){return {label:item.label,entries:entries};});})).then(function(groups){
  var holder=frame.querySelector("#installed-strong-entry");if(!holder)return;
  var html=groups.filter(function(group){return group.entries.length;}).map(function(group){
   return '<div class="caps">'+esc(group.label)+'</div>'+group.entries.map(function(entry){
    return '<article class="module-comment"><strong>'+esc(entry.moduleName)+'</strong><small>'+esc(entry.topic)+'</small><p>'+window.PBConnections.linkifyText(entry.definition)+'</p></article>';
   }).join("");
  }).join("");
  holder.innerHTML=html||(w.meaning&&w.meaning!=="Entrada Strong sem dicionário conectado"?'<article class="module-comment"><strong>Strong '+esc(w.code)+'</strong><small>'+esc(w.lemma)+' · '+esc(w.reading)+'</small><p>'+esc(w.meaning)+'</p><p>'+esc(w.note)+'</p></article>':'<p class="feature-note">Nenhuma entrada Strong ou dicionário correspondente foi encontrada. Verifique se os módulos lexicais estão instalados.</p>');
 }).catch(function(err){
  var holder=frame.querySelector("#installed-strong-entry");
  if(holder)holder.textContent="Não foi possível consultar os léxicos: "+(err.message||String(err));
 });
 var focus=frame.querySelector('[data-pb-win-action="close"]');if(focus)focus.focus();
}
var words=[
 {id:"G3306a",label:"μείνατε",reading:"meínate",lemma:"μένω",code:"G3306",book:"João 15:4",type:"Verbo",tense:"Aoristo",voice:"Ativa",mood:"Imperativo",person:"2ª pessoa do plural",meaning:"Permaneçam / permanecei",note:"O imperativo chama os discípulos à permanência em Cristo. A forma aorista apresenta a ação como um todo; não prova, sozinha, que a permanência seja pontual. A ideia continuada se estabelece no contexto.",source:"https://biblehub.com/text/john/15-4.htm"},
 {id:"G3306b",label:"μένων",reading:"ménōn",lemma:"μένω",code:"G3306",book:"João 15:5",type:"Particípio verbal",tense:"Presente",voice:"Ativa",mood:"Particípio",person:"Nominativo masculino singular",meaning:"Aquele que permanece",note:"O particípio presente descreve quem permanece. A interpretação da relação entre permanência e fruto precisa considerar a metáfora da videira e o conjunto de João 15.",source:"https://www.openbible.com/text/john/15-5.htm"},
 {id:"H1254",label:"בָּרָא",reading:"bará",lemma:"ברא",code:"H1254",book:"Gênesis 1:1",type:"Verbo",tense:"Perfeito (sufixal)",voice:"Qal (tronco verbal)",mood:"Indicativo na tradução",person:"3ª pessoa masculina singular",meaning:"Ele criou",note:"O perfeito hebraico indica uma visão completa da ação, mas não corresponde de modo simples ao pretérito perfeito do português. A leitura depende da sintaxe e da narrativa.",source:"https://biblehub.com/genesis/1-1.htm"},
 {id:"G2814",label:"κλῆμα",reading:"klêma",lemma:"κλῆμα",code:"G2814",book:"João 15:4",type:"Substantivo",tense:"Não se aplica",voice:"Não se aplica",mood:"Não se aplica",person:"Neutro singular",meaning:"Ramo",note:"O ramo faz parte da metáfora agrícola. Interpretar o símbolo exige acompanhar a correspondência entre videira, ramos, fruto e o ensino de Jesus.",source:"https://biblehub.com/text/john/15-4.htm"},
 {id:"G1722",label:"ἐν",reading:"en",lemma:"ἐν",code:"G1722",book:"João 15:4",type:"Preposição",tense:"Não se aplica",voice:"Não se aplica",mood:"Não se aplica",person:"Com dativo no contexto",meaning:"Em",note:"Uma preposição tem sentidos conforme sua construção e contexto. Não se deve criar doutrina com um único significado possível de dicionário.",source:"https://biblehub.com/text/john/15-4.htm"}
];
words.push({id:"H7563",label:"רְשָׁעִים",reading:"reshá'im",lemma:"רָשָׁע",code:"H7563",book:"Salmos 73:3",type:"Adjetivo usado como substantivo",tense:"Não se aplica",voice:"Não se aplica",mood:"Não se aplica",person:"Masculino plural",meaning:"Ímpios; pessoas perversas",note:"Na observação do salmista, רְשָׁעִים designa os ímpios cuja aparente prosperidade o perturba. O sentido do salmo exige acompanhar a mudança de perspectiva no santuário, em Salmos 73:17.",source:"https://biblehub.com/text/psalms/73-3.htm"});
var currentWord=words[0],wordFilter="";
function renderOriginal(){
 var results=words.filter(function(w){return !wordFilter||[w.label,w.reading,w.lemma,w.code,w.book,w.meaning].join(" ").toLowerCase().includes(wordFilter.toLowerCase());});
 MAIN.innerHTML='<div class="content">'+title("original")+'<p class="subtitle">Investigue a forma original, o número Strong, a função gramatical e o sentido no contexto. Abaixo há análises verificadas como demonstração — a importação integral da base morfológica ainda será uma expansão.</p>'+
 '<div class="search-bar"><input id="word-search" class="field" placeholder="Pesquisar G3306, H1254, palavra ou passagem" value="'+esc(wordFilter)+'"><button class="btn" data-act="word-search">Pesquisar</button></div>'+
 '<div class="word-layout"><div><div class="original-hero"><div class="eyebrow" style="color:#d2b777">PALAVRA EM ESTUDO · '+esc(currentWord.book)+'</div><div class="greek'+(currentWord.code.startsWith("H")?" hebrew":"")+'">'+esc(currentWord.label)+'</div><div class="muted">'+esc(currentWord.reading)+' · '+esc(currentWord.code)+'</div></div>'+
 '<div class="card card-pad"><div class="panel-heading"><h2 class="section-heading">Análise morfológica</h2><span class="chip goldish">Exemplo verificado</span></div><div class="word-grid">'+
 [["Lema",currentWord.lemma],["Classe",currentWord.type],["Tempo / aspecto",currentWord.tense],["Voz / conjugação",currentWord.voice],["Modo / forma",currentWord.mood],["Pessoa / caso",currentWord.person]].map(function(a){return '<div class="word-data"><small>'+esc(a[0])+'</small><strong>'+esc(a[1])+'</strong></div>';}).join("")+'</div>'+
 '<div class="rule"></div><div class="caps">SENTIDO NO CONTEXTO</div><h3 style="margin:9px 0">'+esc(currentWord.meaning)+'</h3><p class="feature-note">'+esc(currentWord.note)+'</p><div class="tip"><strong>Atenção:</strong> tempo verbal, aspecto e classe gramatical não determinam sozinhos a interpretação. Compare a oração, o parágrafo, o gênero e os paralelos antes de concluir.</div><div class="row"><button class="btn primary" data-page="tutor">Interpretar esta passagem →</button><a class="btn" href="'+esc(currentWord.source)+'" target="_blank" rel="noopener">Consultar fonte ↗</a></div></div></div>'+
 '<div class="card card-pad"><div class="aside-title">Palavras disponíveis nesta demonstração</div><div class="aside-stack">'+(results.length?results.map(function(w){return '<button class="quick-action" data-word="'+esc(w.id)+'"><span class="quick-icon">'+(w.code.startsWith("H")?"א":"α")+'</span><span><strong>'+esc(w.label)+' · '+esc(w.code)+'</strong><small>'+esc(w.book)+' · '+esc(w.meaning)+'</small></span></button>';}).join(""):'<div class="empty">Nenhuma palavra neste conjunto de exemplos.</div>')+'</div><div class="rule"></div><p class="feature-note">Para outras passagens, a análise palavra a palavra requer integração dos datasets TAGNT, TAHOT, TBESG, TBESH, TEGMC e TEHMC com alinhamento textual. Não atribuímos morfologia por adivinhação.</p><a href="https://github.com/STEPBible/STEPBible-Data" target="_blank" rel="noopener" class="btn slim">Conhecer bases STEPBible ↗</a></div></div></div>';
}
var steps=[
 {name:"Observar",q:"O que o texto realmente diz?",hint:"Leia a passagem inteira pelo menos duas vezes. Registre quem fala, quem recebe a mensagem, palavras repetidas, conectivos, ações, perguntas e contrastes.",prompt:"Quais pessoas, verbos, repetições e contrastes você observou?",check:"Minha observação descreve o que está escrito sem introduzir uma interpretação antecipada?"},
 {name:"Contexto",q:"O que vem antes e depois?",hint:"Leia o capítulo e a seção literária. Investigue autor, destinatários, ocasião, gênero (narrativa, poesia, carta, profecia) e o papel da passagem no livro.",prompt:"Qual é o contexto imediato e o propósito do trecho?",check:"Eu considerei a unidade literária em vez de isolar um versículo?"},
 {name:"Gramática",q:"Como as palavras se relacionam?",hint:"Identifique verbos principais, sujeitos, complementos, tempo/aspecto, modo e conectivos. Compare traduções. Em grego ou hebraico, confirme a forma em uma fonte confiável.",prompt:"Quais detalhes gramaticais importam e por quê?",check:"Evitei concluir o sentido apenas pela etimologia ou por uma tabela de Strong?"},
 {name:"Interpretar",q:"Qual o sentido mais provável?",hint:"Escreva a ideia principal que os primeiros ouvintes ou leitores poderiam entender. Identifique a tese do autor e diferencie observação de inferência.",prompt:"Qual é a ideia central da passagem, sustentada por suas evidências?",check:"Consigo apontar evidências do texto para cada afirmação?"},
 {name:"Conferir",q:"Como verificar minha leitura?",hint:"Confira referências relacionadas, comentários de linhas teológicas diferentes e o argumento completo. Registre questões em aberto e interpretações alternativas com honestidade.",prompt:"Quais textos ou fontes confirmam, complementam ou desafiam sua interpretação?",check:"Evitei fazer um texto remoto anular o sentido do contexto local?"},
 {name:"Aplicar",q:"Como aplicar com fidelidade?",hint:"Distinga o que o texto significava no contexto original do que ele implica para hoje. Prefira aplicações coerentes com sua mensagem principal.",prompt:"Que aplicação responsável decorre do texto e como explicá-la?",check:"Minha aplicação surge do significado do texto, e não o substitui?"}
];
function studyKey(){return state.book+"/"+state.chapter;}
function getStudy(){return state.studies[studyKey()]||{answers:{},checks:{}};}
function renderTutor(){
 var st=getStudy(),step=steps[state.tutorStep]||steps[0],ans=st.answers||{},checks=st.checks||{},done=Object.keys(ans).filter(function(k){return (ans[k]||"").trim().length>=15;}).length;
 MAIN.innerHTML='<div class="content">'+title("tutor")+'<p class="subtitle">Um professor de exegese guiando suas próprias descobertas. Não apresenta uma resposta pronta como se fosse infalível: ensina a investigar, formular hipóteses e conferir evidências.</p>'+
 '<div class="card card-pad" style="margin-bottom:18px"><div class="panel-heading"><div><div class="caps">SEU ESTUDO ATUAL</div><h2 class="section-heading" style="margin-top:8px">'+esc(activeBook.name)+' '+state.chapter+'</h2></div><span class="chip greenish">'+done+' de 6 etapas respondidas</span></div><div class="progress"><div class="progress-fill" style="width:'+(done/6*100)+'%"></div></div><button class="btn slim" data-page="leitura">← Voltar ao texto bíblico</button></div>'+
 '<div class="step-tabs">'+steps.map(function(s,i){return '<button class="step-tab'+(i===state.tutorStep?" active":"")+(ans[i]&&ans[i].trim().length>=15?" done":"")+'" data-step="'+i+'">'+(i+1)+'. '+esc(s.name)+'</button>';}).join("")+'</div>'+
 '<div class="grid-2"><div class="card card-pad"><div class="eyebrow">ETAPA '+(state.tutorStep+1)+' DE 6</div><h2 class="page-title" style="font-size:24px">'+esc(step.q)+'</h2><div class="learning-block lesson-text">'+esc(step.hint)+'</div><div class="rule"></div><label class="label" for="tutor-answer">'+esc(step.prompt)+'</label><textarea class="editor" id="tutor-answer" placeholder="Escreva suas descobertas…">'+esc(ans[state.tutorStep]||"")+'</textarea><div class="small-stat" style="margin-top:10px">↻ Suas respostas são salvas neste navegador</div><div class="btn-row"><button class="btn" data-act="step-prev"'+(state.tutorStep===0?" disabled":"")+'>← Anterior</button><button class="btn primary" data-act="step-next">'+(state.tutorStep===5?"Concluir estudo":"Próxima etapa →")+'</button></div></div>'+
 '<div class="aside-stack"><div class="card card-pad"><div class="caps">PROFESSOR DE INTERPRETAÇÃO</div><h3 class="prompt">'+esc(step.check)+'</h3><div class="tip">Dica de método: a boa interpretação apresenta <strong>evidências textuais</strong>, considera o <strong>contexto</strong> e reconhece as próprias limitações.</div><p class="feature-note">Após escrever, use a pergunta de revisão para avaliar sua resposta. Este modo oferece orientação pedagógica estruturada; análise livre por IA ainda depende de um serviço de IA configurado.</p><button class="btn" data-act="tutor-guidance">Ver orientação desta etapa</button><div id="tutor-guidance"></div></div><div class="card card-pad"><div class="caps">ESTRUTURA DO SEU MÉTODO</div><div class="aside-stack" style="margin-top:15px">'+steps.map(function(s,i){return '<div class="small-stat">'+(ans[i]&&ans[i].trim().length>=15?"✓":"○")+' <strong style="font-size:12px">'+esc(s.name)+'</strong></div>';}).join("")+'</div></div></div></div></div>';
}
var questions=[
 {q:"Em João 15:4, a forma grega μείνατε é classificada como:",opts:["Presente do indicativo, 1ª pessoa","Aoristo imperativo ativo, 2ª pessoa do plural","Futuro passivo, 3ª pessoa","Substantivo feminino"],correct:1,why:"μείνατε (G3306) é aoristo imperativo ativo, segunda pessoa do plural. O aspecto aorístico, por si, não estabelece duração pontual."},
 {q:"Qual deve ser o primeiro passo de uma interpretação cuidadosa?",opts:["Buscar uma aplicação para hoje","Isolar uma palavra do dicionário","Observar o texto e seu contexto","Escolher o comentário preferido"],correct:2,why:"A observação atenta e a delimitação do contexto vêm antes de elaborar conclusões doutrinárias ou aplicações."},
 {q:"Em Gênesis 1:1, בָּרָא (bará) é:",opts:["Qal perfeito, 3ª pessoa masculina singular","Imperativo plural no grego","Preposição hebraica","Um nome próprio"],correct:0,why:"בָּרָא (H1254) está no Qal perfeito, terceira pessoa masculina singular. O aspecto verbal hebraico não coincide automaticamente com os tempos do português."},
 {q:"O número Strong de uma palavra permite:",opts:["Conhecer sempre o único sentido correto","Consultar entradas lexicais, com necessidade de contextualização","Desconsiderar o gênero literário","Ignorar a sintaxe da oração"],correct:1,why:"A concordância lexical auxilia na pesquisa, mas sentidos possíveis dependem da ocorrência, sintaxe e contexto."},
 {q:"Qual procedimento produz uma aplicação mais responsável?",opts:["Aplicar qualquer frase fora do contexto","Partir da mensagem do autor e distinguir significado e aplicação","Considerar só a tradução preferida","Transformar todo texto em promessa individual"],correct:1,why:"A aplicação deve decorrer do sentido mais bem fundamentado do texto e respeitar gênero, destinatários e propósito."}
];
function renderExercises(){
 var ans=state.exerciseAnswers||{},count=Object.keys(ans).length,correct=questions.filter(function(q,i){return ans[i]===q.correct;}).length;
 MAIN.innerHTML='<div class="content">'+title("exercicios")+'<p class="subtitle">Aprenda praticando: gramática, métodos de observação, Strong, contexto e aplicação. Cada resposta recebe uma explicação.</p><div class="card card-pad" style="margin-bottom:18px"><div class="panel-heading"><h2 class="section-heading">Seu progresso</h2><span class="chip goldish">'+count+'/'+questions.length+' respondidas · '+correct+' acertos</span></div><div class="progress"><div class="progress-fill" style="width:'+(count/questions.length*100)+'%"></div></div><button class="btn slim" data-act="reset-exercises">Refazer exercícios</button></div>'+
 questions.map(function(q,i){var a=ans[i];return '<div class="card question-card"><span class="eyebrow">QUESTÃO '+(i+1)+' / '+questions.length+'</span><h3 style="font-size:15px;line-height:1.6">'+esc(q.q)+'</h3>'+q.opts.map(function(o,j){return '<button class="option'+(a===j?" selected":"")+(a!==undefined&&j===q.correct?" correct":"")+(a===j&&a!==q.correct?" incorrect":"")+'" data-answer="'+i+":"+j+'">'+String.fromCharCode(65+j)+'. '+esc(o)+'</button>';}).join("")+(a!==undefined?'<div class="feedback"><strong>'+(a===q.correct?"✓ Resposta correta.":"Veja a explicação:")+'</strong> '+esc(q.why)+'</div>':"")+'</div>';}).join("")+'</div>';
}
function renderSermon(){
 var s=state.sermon;
 MAIN.innerHTML='<div class="content">'+title("sermao")+'<p class="subtitle">Transforme a investigação da passagem em uma mensagem organizada. Seu rascunho é salvo automaticamente no dispositivo.</p>'+
 '<div class="card card-pad"><div class="panel-heading"><h2 class="section-heading">Meu esboço expositivo</h2><span class="chip greenish">Salvamento local</span></div><div class="sermon-grid">'+
 [["title","Tema"],["reference","Texto bíblico"],["context","Contexto histórico e literário"],["introduction","Introdução"],["point1","Tópico 1 · Exposição"],["point2","Tópico 2 · Exposição"],["application","Aplicação"],["conclusion","Conclusão"]].map(function(a,i){return '<label class="'+(i>=2?"full":"")+'">'+esc(a[1])+(i>=2?'<textarea class="editor" data-sermon="'+a[0]+'" placeholder="Escreva aqui…">'+esc(s[a[0]]||"")+'</textarea>':'<input class="field" data-sermon="'+a[0]+'" value="'+esc(s[a[0]]||"")+'">')+'</label>';}).join("")+'</div><div class="btn-row"><button class="btn" data-act="sermon-from-ref">Usar passagem atual</button><div class="row"><button class="btn" data-act="sermon-copy">Copiar esboço</button><button class="btn primary" data-act="sermon-export">Exportar .txt</button></div></div></div><div class="tip">Os comentários e PDFs pessoais poderão alimentar o Criador de Sermões após a integração da Biblioteca Teológica, com fontes e páginas identificadas.</div></div>';
}
function renderNotebook(){
 var notes=state.notes||[],marks=state.bookmarks||[],filter=state.noteFilter||"";
 var filtered=notes.filter(function(n){return (n.ref+" "+n.text).toLowerCase().includes(filter.toLowerCase());});
 MAIN.innerHTML='<div class="content">'+title("caderno")+'<p class="subtitle">Anotações e favoritos guardados no navegador, separados por referência bíblica. Use a busca para recuperar suas descobertas.</p>'+
 '<div class="grid-3" style="margin-bottom:20px"><div class="card card-pad"><div class="caps">ANOTAÇÕES</div><h2 class="page-title">'+notes.length+'</h2></div><div class="card card-pad"><div class="caps">FAVORITOS</div><h2 class="page-title">'+marks.length+'</h2></div><div class="card card-pad"><div class="caps">PASSAGEM ATUAL</div><h3>'+esc(ref())+'</h3><button class="btn slim" data-act="note">Anotar</button></div></div>'+
 '<div class="grid-2"><div class="card card-pad"><div class="panel-heading"><h2 class="section-heading">Minhas anotações</h2></div><input class="field" style="width:100%;margin-bottom:15px" id="note-filter" placeholder="Buscar nos estudos…" value="'+esc(filter)+'">'+(filtered.length?filtered.map(function(n){return '<div class="note-entry"><div class="panel-heading"><strong>'+esc(n.ref)+'</strong><button class="btn slim" data-note-delete="'+esc(n.ref)+'">Excluir</button></div><p>'+esc(n.text)+'</p><button class="btn slim" data-ref-open="'+esc(n.ref)+'">Abrir passagem</button></div>';}).join(""):'<div class="empty">Nenhuma anotação encontrada. Selecione um versículo e clique em Anotar.</div>')+'</div>'+
 '<div class="card card-pad"><h2 class="section-heading" style="margin-bottom:17px">Versículos favoritos</h2>'+(marks.length?marks.map(function(r){return '<div class="feature-item"><span class="feature-number">☆</span><div style="flex:1"><strong>'+esc(r)+'</strong><div class="row" style="margin-top:9px"><button class="btn slim" data-ref-open="'+esc(r)+'">Ler</button><button class="btn slim" data-unbookmark="'+esc(r)+'">Remover</button></div></div></div>';}).join(""):'<div class="empty">Seus versículos favoritos aparecem aqui.</div>')+'</div></div><div class="tip">Dados desta versão são armazenados apenas neste navegador. Eles ainda não são sincronizados com conta, não são enviados ao Supabase e podem desaparecer se você limpar os dados do site. Faça backup das anotações importantes.</div></div>';
}
var competitors=[
 ["YouVersion","Leitura, áudio, planos, notas, compartilhamento, comunidade e sincronização.","Estudo acadêmico aprofundado em um fluxo único com morfologia e escrita expositiva.","https://www.bible.com/"],
 ["Bíblia JFA Offline","Leitura em português, áudio, temas, marcações, ferramentas de estudo e IA.","Unir notas à pesquisa textual com trilha de exegese verificável.","https://www.bibliajfa.com.br/"],
 ["MyBible","Strong, referências cruzadas, comentários, múltiplas janelas e leitor offline.","Explicar gramática de forma pedagógica em português e conectar ao sermão.","https://mybible.zone/"],
 ["Logos Bible Software","Biblioteca teológica, guias de passagens, estudo original, pesquisa e sermões.","Simplificar ferramentas avançadas num fluxo acessível.","https://www.logos.com/"],
 ["Bible Hub","Interlinear, concordâncias, léxicos e comentários paralelos.","Relacionar descobertas ao caderno e à interpretação guiada.","https://biblehub.com/"],
 ["Blue Letter Bible","Ferramentas de línguas originais, concordâncias, comentários e estudo.","Ensino interativo de exegese e aplicação em português.","https://www.blueletterbible.org/"],
 ["BibleLine","Genealogias, personagens e cronologia bíblica.","Integrar genealogia, atlas, leitura bíblica e estudos expositivos.","https://www.bibleline.app/"],
 ["BibleProject","Vídeos, cursos, contexto temático e ensino visual.","Unir formação visual com análise de textos e exercícios avaliáveis.","https://bibleproject.com/"],
 ["Moed Bible","Estudo bíblico em português, Strong, IA e esboços.","Tornar fontes e decisões interpretativas rastreáveis e auditáveis.","https://moedbible.com/"],
 ["AndBible / STEP Bible","Estudo com bases linguísticas, módulos offline e dados morfológicos.","Experiência didática com histórico e notas integradas.","https://www.stepbible.org/"],
 ["Bíblia Online","Leitura em português, consulta de capítulos, pesquisa e compartilhamento.","Conectar pesquisa e leitura aos registros de análise gramatical e estudos.","https://www.bibliaonline.com.br/"],
 ["Bible Gateway","Consulta de traduções, busca, recursos de leitura e áudio em diversos idiomas.","Integrar pesquisa textual a exercícios e interpretação contextual em português.","https://www.biblegateway.com/"]
];
function renderMarket(){
 MAIN.innerHTML='<div class="content">'+title("mercado")+'<p class="subtitle">As funcionalidades descritas abaixo são capacidades divulgadas pelos aplicativos. As oportunidades são propostas de integração ou de usabilidade, não alegações de que sejam recursos inéditos.</p>'+
 '<div class="market-grid">'+competitors.map(function(c,i){return '<article class="card market-item"><span class="chip">'+String(i+1).padStart(2,"0")+' · REFERÊNCIA DE MERCADO</span><h3>'+esc(c[0])+'</h3><div class="caps">O QUE JÁ EXISTE</div><p>'+esc(c[1])+'</p><div class="caps">OPORTUNIDADE PARA O PÚLPITO BIBLE</div><p>'+esc(c[2])+'</p><a href="'+esc(c[3])+'" target="_blank" rel="noopener">Conhecer a plataforma ↗</a></article>';}).join("")+'</div><div class="tip"><strong>Direção do produto:</strong> não precisamos inventar uma nova concordância do zero. O diferencial será conectar leitura, línguas originais, biblioteca, histórico, exercícios e produção de sermões com explicações claras e fontes conferíveis.</div></div>';
}
var roadmap=[
 ["Leitura completa dos 66 livros","Selecionar livro, capítulo, versão livre, versículos, notas e favoritos.","Disponível na versão inicial mediante conexão com a API; capítulos já acessados ficam em cache local."],
 ["Morfologia e Strong","Grego e hebraico: lema, número Strong, tempo, aspecto, modo, voz, pessoa, gênero, caso, classe e construção sintática.","Cinco amostras verificadas disponíveis; importação geral planejada com STEPBible."],
 ["Assistente hermenêutico","Ensina observação, contexto, gramática, interpretação, verificação e aplicação; registra respostas por passagem.","Tutor guiado funcional; avaliação conversacional por IA requer integração posterior."],
 ["Exercícios com feedback","Questões de exegese, tempo verbal, gênero, contexto, erros comuns e aplicação.","Primeiro conjunto de exercícios disponível."],
 ["Criador de sermões","Tema, passagem, introdução, contexto, tópicos, aplicação, conclusão, copiar e exportar.","Editor e salvamento local disponíveis."],
 ["Biblioteca teológica","Livros, PDFs, comentários, páginas, resumos, marcações, referências e integração ao leitor.","Planejado; exige importação de documentos autorizados e indexação."],
 ["Diário de estudo e histórico","Consultas, marcações, favoritos, notas, pesquisas, perguntas e progresso por usuário.","Notas e favoritos locais disponíveis; sincronização por conta planejada."],
 ["Mapas, personagens e cronologia","Atlas de viagens, genealogias conectadas, biografias, cronologia com graus de certeza.","Planejado; inspirado em recursos existentes como BibleLine e atlas bíblicos."],
 ["Uso offline e sincronização","Download opcional de livros, Strong, comentários e salvamento seguro entre dispositivos.","Cache básico de capítulos disponível; instalação offline integral depende de infraestrutura adicional."],
 ["IA com fontes auditáveis","Resposta com versículos, referência de obra e página, leitura de diferentes perspectivas, incerteza explicada.","Planejado: não há respostas de IA gerativa nesta primeira versão."],
 ["Leitura em áudio e acessibilidade","Narração, velocidade, fontes, contraste, anotações por voz e pesquisa por fala.","Controle de fonte e modo escuro disponíveis; voz e áudio planejados."],
 ["Conexão com Púlpito Studio","Exportar descobertas para a Biblioteca Teológica e o Criador de Sermões existente sem substituir arquivos.","Integração futura separada, sem alterar o aplicativo anterior."]
];
function renderRoadmap(){
 MAIN.innerHTML='<div class="content">'+title("projeto")+'<p class="subtitle">Documento vivo da visão completa do Púlpito Bible: o que já funciona, o que necessita de dados licenciados e o que será desenvolvido por etapas.</p><div class="card card-pad"><div class="panel-heading"><h2 class="section-heading">Mapa de funcionalidades</h2><span class="chip goldish">Planejamento de produto</span></div>'+roadmap.map(function(a,i){return '<div class="feature-item"><span class="feature-number">'+(i+1)+'</span><div><h3>'+esc(a[0])+'</h3><p>'+esc(a[1])+'</p><p style="margin-top:7px"><strong>Situação: </strong>'+esc(a[2])+'</p></div></div>';}).join("")+'</div><div class="tip">Fontes principais: <a href="https://api.midvash.com/pt-br" target="_blank">Midvash</a> para versões livres com atribuição e <a href="https://github.com/STEPBible/STEPBible-Data" target="_blank">STEPBible Data</a> (CC BY 4.0) para morfologia e léxicos. NVI, ARA, NVT e outras versões protegidas dependem de permissão contratual.</div></div>';
}
function render(){
 document.querySelectorAll(".nav-item").forEach(function(el){var active=el.dataset.page===state.page;el.classList.toggle("active",active);el.setAttribute("aria-current",active?"page":"false");});
 document.getElementById("page-location").textContent=TITLES[state.page]||"Púlpito Bible";
 document.documentElement.classList.toggle("dark",state.theme==="dark");document.body.classList.toggle("reader-active",state.page==="leitura");document.body.classList.toggle("focus-reading",!!state.focusMode&&state.page==="leitura");document.documentElement.style.setProperty("--reading-size",state.fontSize+"px");
 if(state.page==="leitura")renderReader();
 if(state.page==="original")renderOriginal();
 if(state.page==="tutor")renderTutor();
 if(state.page==="exercicios")renderExercises();
 if(state.page==="sermao")renderSermon();
 if(state.page==="caderno")renderNotebook();
 if(state.page==="mercado")renderMarket();
 if(state.page==="projeto")renderRoadmap();
 if(state.page==="modulos")window.PBModules.renderPage();
}
function noteModal(){
 var n=currentNote();var modal=document.createElement("div");modal.className="modal-backdrop";modal.id="pb-modal";
 modal.innerHTML='<div class="modal"><div class="panel-heading"><h2 class="section-heading">Anotação · '+esc(ref())+'</h2><button class="btn slim" data-act="close-modal">Fechar ✕</button></div><p class="feature-note">Registre sua observação, interpretação ou dúvida.</p><textarea id="note-text" class="editor large" placeholder="Escreva sua anotação…">'+esc(n&&n.text||"")+'</textarea><div class="btn-row"><button class="btn" data-act="close-modal">Cancelar</button><button class="btn primary" data-act="save-note">Salvar anotação</button></div></div>';
 document.body.appendChild(modal);document.getElementById("note-text").focus();
}
function parseRef(r){var match=String(r).match(/^(.+?)\s+(\d+)(?::(\d+))?/);if(!match)return null;var name=match[1].trim().toLowerCase();var b=books.find(function(b){return b.name.toLowerCase()===name;})||booksFallback.find(function(b){return b.name.toLowerCase()===name;});if(!b)return null;return {book:b.slug,ch:+match[2],verse:match[3]?+match[3]:0};}
function openRef(r){var p=parseRef(r);if(!p){notify("Referência não reconhecida");return;}state.book=p.book;state.chapter=p.ch;state.selectedVerse=p.verse;activeBook=books.find(function(b){return b.slug===p.book;})||booksFallback.find(function(b){return b.slug===p.book;})||activeBook;page("leitura");}
async function lookupReference(s){
 if(!s.trim()){notify("Digite uma referência");return;}
 var q=s.trim(),m=q.match(/^(.+?)\s+(\d+)(?::(\d+))?/);if(m){var b=books.find(function(b){return b.name.toLowerCase()===m[1].toLowerCase()||b.slug===m[1].toLowerCase();})||booksFallback.find(function(b){return b.name.toLowerCase()===m[1].toLowerCase();});if(b){setRef(b.slug,+m[2],m[3]?+m[3]:0);return;}}
 try{var r=await fetch(API+"/parse?q="+encodeURIComponent(q)+"&version="+state.version);if(!r.ok)throw Error("Não encontrado");var d=(await r.json()).data||{};var bk=typeof d.book==="string"?d.book:(d.book&&d.book.slug)||d.book_slug||d.bookSlug;var b2=books.find(function(b){return b.slug===bk||b.name.toLowerCase()===String(bk).toLowerCase();});if(b2&&d.chapter){setRef(b2.slug,d.chapter,Number(d.verse_start||d.verseStart||d.verse)||0);return;}throw Error("Referência");}catch(e){notify("Não localizei a referência. Experimente: João 3:16 ou Gênesis 1.");}
}
function parseLinkedReference(raw){
 var q=String(raw||"").trim().replace(/\s+/g," "),m=/^(.+?)\s+(\d{1,3})(?:(?::|\.)\s*(\d{1,3})(?:\s*[-–—]\s*\d{1,3})?)?$/.exec(q);
 if(!m)return null;
 var alias=m[1].toLocaleLowerCase("pt-BR").replace(/\./g,"").trim();
 var normalizedAlias=alias.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 var slug=BOOK_LINK_ALIASES[alias]||BOOK_LINK_ALIASES[normalizedAlias]||normalizedAlias.replace(/\s+/g,"-");
 var book=books.find(function(b){return b.slug===slug||b.name.toLocaleLowerCase("pt-BR")===alias;})||booksFallback.find(function(b){return b.slug===slug||b.name.toLocaleLowerCase("pt-BR")===alias;});
 if(!book)return null;
 var chapter=Number(m[2]),verse=Number(m[3]||0);
 if(chapter<1||chapter>book.chapters)return null;
 return {book:book.slug,chapter:chapter,verse:verse};
}
function openLinkedReference(reference){
 var parsed=parseLinkedReference(reference);
 if(!parsed){lookupReference(String(reference||""));return;}
 var commentPane=document.getElementById("pb-split-scroll"),dictionaryPane=document.getElementById("pb-dictionary-scroll");
 if(commentPane)pendingCommentScroll=commentPane.scrollTop;
 if(dictionaryPane)pendingDictionaryScroll=dictionaryPane.scrollTop;
 preserveConnectionsOnNextRef=!!document.getElementById("pb-connected-panel");
 setRef(parsed.book,parsed.chapter,parsed.verse);
}
function sermonText(){var s=state.sermon;return [s.title,s.reference,"","Contexto histórico e literário",s.context,"","Introdução",s.introduction,"","1. Exposição",s.point1,"","2. Exposição",s.point2,"","Aplicação",s.application,"","Conclusão",s.conclusion].join("\n");}
document.addEventListener("click",function(ev){

 /* Leitura: clique simples no texto, palavra, Strong ou versículo é inerte. Aberturas por duplo clique e seleção por pressionar/segurar são tratadas separadamente. */
 if(ev.target.closest("#chapter-body"))return;
 var comment=ev.target.closest("[data-comment-sermon]");if(comment){state.sermon.context+=(state.sermon.context?"\n\n":"")+comment.dataset.commentText;persist();notify("Trecho do comentário adicionado ao sermão");return;}
 var sw=ev.target.closest("#chapter-body [data-strong]");
 if(sw){ev.preventDefault();ev.stopPropagation();var strongVerse=sw.closest("[data-verse]");if(strongVerse){state.selectedVerse=Number(strongVerse.dataset.verse);persist();}var matching=words.find(function(w){return w.id===sw.dataset.strong;});var strongCode=matching?matching.code:sw.dataset.strong;openDictionaryTerm(strongCode,state.selectedVerse);return;}
 var v=ev.target.closest("[data-verse]");if(v){
 state.selectedVerse=Number(v.dataset.verse);persist();
 TS.actions.toggleVerse(v.dataset.usfm||verseGlobalId(state.selectedVerse));
 refreshVerseDecorations();
 var title=document.getElementById("selected-reference");if(title)title.textContent=ref();
 if(state.showComments&&!state.splitStudy)loadInstalledComments();
 if(state.splitStudy)window.PBSplitStudy.refresh();
 if(state.dictionaryOpen)window.PBDictionaryStudy.syncReference();
 return;
 }
 var nav=ev.target.closest("[data-page]");if(nav){page(nav.dataset.page);return;}
 var w=ev.target.closest("[data-word]");if(w){currentWord=words.find(function(t){return t.id===w.dataset.word;})||currentWord;renderOriginal();return;}
 var st=ev.target.closest("[data-step]");if(st){state.tutorStep=+st.dataset.step;persist();renderTutor();return;}
 var ans=ev.target.closest("[data-answer]");if(ans){var p=ans.dataset.answer.split(":");state.exerciseAnswers[+p[0]]=+p[1];persist();renderExercises();return;}
 var rw=ev.target.closest("[data-ref-open]");if(rw){openRef(rw.dataset.refOpen);return;}
 var dl=ev.target.closest("[data-note-delete]");if(dl){state.notes=state.notes.filter(function(n){return n.ref!==dl.dataset.noteDelete;});persist();renderNotebook();notify("Anotação excluída");return;}
 var ub=ev.target.closest("[data-unbookmark]");if(ub){state.bookmarks=state.bookmarks.filter(function(r){return r!==ub.dataset.unbookmark;});persist();renderNotebook();return;}
 var el=ev.target.closest("[data-act]");if(!el)return;
 var a=el.dataset.act;

 if(a==="toggle-strong"){state.showStrong=!state.showStrong;persist();renderReaderContent();var button=document.querySelector('[data-act="toggle-strong"]');if(button)button.classList.toggle("on",state.showStrong);return;}
 if(a==="toggle-comments"){state.splitStudy=!state.splitStudy;persist();renderReader();return;}
 if(a==="toggle-crossrefs"){state.showCrossRefs=!state.showCrossRefs;persist();renderReader();return;}
 if(a==="toggle-parallel"){state.showParallel=!state.showParallel;persist();renderReader();return;}
 if(a==="reader-font-down"){state.fontSize=Math.max(14,state.fontSize-2);TS.actions.setFontSize(state.fontSize);persist();renderReader();return;}
 if(a==="reader-font-up"){state.fontSize=Math.min(28,state.fontSize+2);persist();renderReader();return;}
 if(a==="focus-mode"){state.focusMode=!state.focusMode;persist();renderReader();document.body.classList.toggle("focus-reading",state.focusMode);return;}
 if(a==="close-strong"){document.getElementById("strong-window")?.remove();return;}
 if(a==="strong-copy"){var w=currentWord;var value=w.code+" · "+w.label+" ("+w.reading+") — "+w.meaning+". "+w.note;navigator.clipboard.writeText(value).then(function(){notify("Estudo Strong copiado");}).catch(function(){notify("Não foi possível copiar");});return;}
 if(a==="strong-study"){document.getElementById("strong-window")?.remove();page("original");return;}
 if(a==="strong-sermon"){var w=currentWord;var note=w.code+" · "+w.label+" — "+w.meaning+" ("+w.book+"). "+w.note;state.sermon.context=(state.sermon.context?state.sermon.context+"\n\n":"")+note;persist();document.getElementById("strong-window")?.remove();notify("Estudo inserido no contexto do sermão");return;}
 if(a==="prev-chapter"){if(state.chapter>1)setRef(state.book,state.chapter-1);return;}
 if(a==="next-chapter"){if(state.chapter<activeBook.chapters)setRef(state.book,state.chapter+1);return;}
 if(a==="retry"){loadChapter();return;}
 if(a==="search-ref"){lookupReference(document.getElementById("reference-search").value);return;}
 if(a==="bookmark"){var r=ref();if(state.bookmarks.includes(r)){state.bookmarks=state.bookmarks.filter(function(x){return x!==r;});notify("Favorito removido");}else{state.bookmarks.push(r);notify("Salvo nos favoritos");}persist();renderReaderContent();return;}
 if(a==="note"){noteModal();return;}
 if(a==="close-modal"){document.getElementById("pb-modal")?.remove();return;}
 if(a==="save-note"){var text=document.getElementById("note-text").value.trim();TS.actions.clearSelection();state.notes=state.notes.filter(function(n){return n.ref!==ref();});if(text)state.notes.unshift({ref:ref(),text:text,when:Date.now()});persist();document.getElementById("pb-modal")?.remove();if(state.page==="caderno")renderNotebook();notify("Anotação salva");return;}
 if(a==="word-search"){wordFilter=document.getElementById("word-search").value.trim();var found=words.find(function(w){return [w.label,w.code,w.reading,w.book].join(" ").toLowerCase().includes(wordFilter.toLowerCase());});if(found)currentWord=found;renderOriginal();return;}
 if(a==="tutor-guidance"){var f=document.getElementById("tutor-guidance");f.innerHTML='<div class="feedback"><strong>Critério de revisão:</strong> '+esc(steps[state.tutorStep].check)+'<p class="tiny" style="margin-bottom:0">Releia sua anotação, destaque evidências, confira a passagem e reescreva se necessário.</p></div>';return;}
 if(a==="step-prev"){state.tutorStep=Math.max(0,state.tutorStep-1);persist();renderTutor();return;}
 if(a==="step-next"){var answer=document.getElementById("tutor-answer").value.trim();if(answer.length<15){notify("Escreva pelo menos uma observação antes de avançar.");return;}var stt=getStudy();stt.answers[state.tutorStep]=answer;state.studies[studyKey()]=stt;state.tutorStep=Math.min(5,state.tutorStep+1);persist();renderTutor();notify(state.tutorStep===5?"Reveja suas descobertas e finalize":"Etapa registrada");return;}
 if(a==="reset-exercises"){state.exerciseAnswers={};persist();renderExercises();return;}
 if(a==="sermon-from-ref"){state.sermon.reference=ref();persist();renderSermon();notify("Passagem inserida no esboço");return;}
 if(a==="sermon-copy"){navigator.clipboard.writeText(sermonText()).then(function(){notify("Esboço copiado");}).catch(function(){notify("Cópia não permitida neste navegador");});return;}
 if(a==="sermon-export"){var blob=new Blob([sermonText()],{type:"text/plain;charset=utf-8"});var url=URL.createObjectURL(blob);var link=document.createElement("a");link.href=url;link.download="Pulpito-Bible-Sermao.txt";link.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);notify("Esboço exportado");return;}
});
document.addEventListener("change",function(ev){
 var t=ev.target;
 if(t.id==="reader-mode"){state.readerMode=t.value;persist();renderReaderContent();return;}
 if(t.id==="reader-paper"){state.readerTheme=t.value;persist();renderReader();return;}
 if(t.id==="book-select"){var found=books.find(function(b){return b.slug===t.value;});if(found){activeBook=found;state.selectedVerse=0;setRef(found.slug,1);}return;}
 if(t.id==="chapter-select"){setRef(state.book,+t.value);return;}
 if(t.id==="version-select"){state.version=t.value;persist();renderReader();return;}
 if(t.id==="parallel-version-select"){state.parallelVersion=t.value;persist();renderReader();return;}
});
document.addEventListener("input",function(ev){
 var t=ev.target;
 if(t.id==="tutor-answer"){var st=getStudy();st.answers[state.tutorStep]=t.value;state.studies[studyKey()]=st;persist();}
 if(t.dataset.sermon){state.sermon[t.dataset.sermon]=t.value;persist();}
 if(t.id==="note-filter"){state.noteFilter=t.value;persist();var p=t.selectionStart;renderNotebook();var n=document.getElementById("note-filter");n.focus();n.setSelectionRange(p,p);}
});
document.addEventListener("keydown",function(ev){if(ev.key==="Escape"){TS.actions.clearSelection();refreshVerseDecorations();document.getElementById("strong-window")?.remove();}if((ev.key==="Enter"||ev.key===" ")&&ev.target.closest&&ev.target.closest("#chapter-body [data-strong]")){ev.preventDefault();openStrongPopup(ev.target.dataset.strong,ev.target);return;}if(ev.key==="Enter"&&ev.target.id==="reference-search"){ev.preventDefault();lookupReference(ev.target.value);}if(ev.key==="Enter"&&ev.target.id==="word-search"){ev.preventDefault();wordFilter=ev.target.value;renderOriginal();}});
document.getElementById("menu-toggle").addEventListener("click",function(event){
 event.preventDefault();
 var menu=document.getElementById("top-menu"),button=document.getElementById("menu-toggle");
 if(!menu)return;
 menu.hidden=!menu.hidden;
 button.setAttribute("aria-expanded",String(!menu.hidden));
});
document.addEventListener("click",function(event){
 var menu=document.getElementById("top-menu"),button=document.getElementById("menu-toggle");
 if(menu&&!menu.hidden&&!menu.contains(event.target)&&!button.contains(event.target))closeTopMenu();
});
document.addEventListener("keydown",function(event){if(event.key==="Escape")closeTopMenu();});
document.getElementById("brand-link").addEventListener("click",function(e){e.preventDefault();page("leitura");});
document.getElementById("theme-toggle").addEventListener("click",function(){var next=TS.getState().theme==="dark"?"sepia":"dark";TS.actions.setTheme(next);state.theme=next==="dark"?"dark":"light";state.readerTheme=next==="dark"?"night":next;persist();render();});
document.getElementById("font-up").addEventListener("click",function(){state.fontSize=Math.min(30,state.fontSize+2);TS.actions.setFontSize(state.fontSize);persist();document.documentElement.style.setProperty("--reading-size",state.fontSize+"px");notify("Fonte: "+state.fontSize+"px");});
document.getElementById("font-down").addEventListener("click",function(){state.fontSize=Math.max(14,state.fontSize-2);persist();document.documentElement.style.setProperty("--reading-size",state.fontSize+"px");notify("Fonte: "+state.fontSize+"px");});
render();readBooks();


function startBuildUpdateWatcher(){
 var currentBuild=window.PB_BUILD_ID,channel=null,reloadPending=false,reloadStarted=false,checkInProgress=false;
 function isEditing(){
  var el=document.activeElement;if(!el)return false;
  var tag=String(el.tagName||"").toLowerCase();
  return tag==="input"||tag==="textarea"||tag==="select"||!!el.isContentEditable;
 }
 function reloadNow(){
  try{if(channel)channel.postMessage({type:"reloading",build:currentBuild});}catch(e){}
  window.location.reload();
 }
 function reloadForUpdate(){
  if(reloadStarted)return;
  if(isEditing()){reloadPending=true;return;}
  reloadStarted=true;
  if(!("serviceWorker" in navigator)){reloadNow();return;}
  navigator.serviceWorker.getRegistration().then(function(registration){
   if(!registration){reloadNow();return;}
   var finished=false,timer=0;
   function finish(){
    if(finished)return;
    finished=true;
    if(timer)window.clearTimeout(timer);
    reloadNow();
   }
   navigator.serviceWorker.addEventListener("controllerchange",finish,{once:true});
   timer=window.setTimeout(finish,8000);
   registration.update().then(function(){
    if(registration.waiting){
     registration.waiting.postMessage({type:"SKIP_WAITING"});
     return;
    }
    var worker=registration.installing;
    if(worker){
     worker.addEventListener("statechange",function(){
      if(worker.state==="activated")finish();
     });
     return;
    }
    finish();
   }).catch(finish);
  }).catch(reloadNow);
 }
 function receiveUpdate(event){
  var data=event&&event.data||{};
  if(data.type==="version"&&data.build&&data.build!==currentBuild)reloadForUpdate();
 }
 try{
  if("BroadcastChannel" in window){
   channel=new BroadcastChannel("pulpito-bible-version");
   channel.onmessage=receiveUpdate;
  }
 }catch(e){}
 async function checkVersion(){
  if(checkInProgress||document.visibilityState==="hidden")return;
  checkInProgress=true;
  try{
   var script=document.querySelector('script[src*="app.js"]');
   if(!script)return;
   var url=new URL(script.src,window.location.href);
   url.searchParams.set("pb-update-check",String(Date.now()));
   var response=await fetch(url.href,{cache:"no-store",credentials:"same-origin"});
   if(!response.ok)return;
   var source=await response.text();
   var match=source.match(/window\.PB_BUILD_ID\s*=\s*["']([^"']+)["']/);
   if(match&&match[1]&&match[1]!==currentBuild){
    try{if(channel)channel.postMessage({type:"version",build:match[1]});}catch(e){}
    reloadForUpdate();
   }
  }catch(e){}
  finally{checkInProgress=false;}
 }
 document.addEventListener("visibilitychange",function(){
  if(document.visibilityState==="visible"){if(reloadPending)reloadForUpdate();else checkVersion();}
 });
 document.addEventListener("focusout",function(){if(reloadPending)window.setTimeout(reloadForUpdate,250);});
 window.addEventListener("focus",function(){if(reloadPending)reloadForUpdate();else checkVersion();});
 window.setInterval(checkVersion,60000);
 window.setTimeout(checkVersion,15000);
 if("serviceWorker" in navigator){
  navigator.serviceWorker.addEventListener("controllerchange",function(){
   if(reloadPending)reloadForUpdate();
  });
  navigator.serviceWorker.addEventListener("message",function(event){
   if(event.data&&event.data.type==="PB_NEW_VERSION")reloadForUpdate();
  });
 }
}
startBuildUpdateWatcher();

})();