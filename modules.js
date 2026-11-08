(function(){
"use strict";
var DB_NAME="PulpitoBibleModules",DB_VERSION=2;
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
function dbOpen(){if(dbPromise)return dbPromise;dbPromise=new Promise(function(resolve,reject){if(!window.indexedDB)return reject(Error("Este navegador não disponibiliza IndexedDB"));var r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=function(){var d=r.result;if(!d.objectStoreNames.contains("modules"))d.createObjectStore("modules",{keyPath:"id"});if(!d.objectStoreNames.contains("chapters"))d.createObjectStore("chapters",{keyPath:"key"}).createIndex("moduleId","moduleId",{unique:false});if(!d.objectStoreNames.contains("commentaries"))d.createObjectStore("commentaries",{keyPath:"key"}).createIndex("moduleId","moduleId",{unique:false});if(!d.objectStoreNames.contains("lexicon"))d.createObjectStore("lexicon",{keyPath:"key"}).createIndex("moduleId","moduleId",{unique:false});};r.onsuccess=function(){resolve(r.result);};r.onerror=function(){reject(r.error||Error("Não foi possível abrir a biblioteca local"));};});return dbPromise;}
function request(req){return new Promise(function(resolve,reject){req.onsuccess=function(){resolve(req.result);};req.onerror=function(){reject(req.error);};});}
async function loadCatalog(){var db=await dbOpen();modules=await request(db.transaction("modules","readonly").objectStore("modules").getAll());modules.sort(function(a,b){return (a.name||"").localeCompare(b.name||"");});return modules;}
function ready(){return loadCatalog();}
function installed(){return modules.slice();}
function moduleName(version){var id=String(version||"").slice(6);var m=modules.find(function(x){return x.id===id;});return m?m.name:"Módulo não encontrado";}
function bibleOptions(selected){return modules.filter(function(m){return m.type==="bible";}).map(function(m){var value="local:"+m.id;return '<option value="'+clean(value)+'"'+(selected===value?" selected":"")+'>'+clean(m.abbreviation||m.name)+" — "+clean(m.name)+"</option>";}).join("");}
function getModuleByVersion(version){return modules.find(function(m){return "local:"+m.id===version&&m.type==="bible";});}
async function getChapter(version,book,chapter){await dbOpen();var m=getModuleByVersion(version);if(!m)throw Error("Módulo de Bíblia não instalado neste dispositivo");var key=m.id+"/"+book+"/"+chapter;var db=await dbOpen();var row=await request(db.transaction("chapters","readonly").objectStore("chapters").get(key));if(!row||!row.verses||!row.verses.length)throw Error("Este módulo não contém "+book+" "+chapter);return {verses:row.verses,copyright:"Módulo instalado localmente · "+m.name+" · "+(m.license||"Licença não informada no arquivo")+". Verifique as condições de uso da edição.",version:m.abbreviation||m.name};}
async function getCommentaries(book,chapter,verse){await dbOpen();var active=modules.filter(function(m){return m.type==="commentary";});var db=await dbOpen();var entries=await Promise.all(active.map(async function(m){var row=await request(db.transaction("commentaries","readonly").objectStore("commentaries").get(m.id+"/"+book));if(!row)return [];return row.entries.filter(function(e){if(e.fromChapter&&chapter<e.fromChapter)return false;if(e.toChapter&&chapter>e.toChapter)return false;if(verse&&e.fromChapter===chapter&&e.fromVerse&&verse<e.fromVerse)return false;if(verse&&e.toChapter===chapter&&e.toVerse&&verse>e.toVerse)return false;return true;}).slice(0,45).map(function(e){return {moduleId:m.id,moduleName:m.name,text:e.text,marker:e.marker,fromChapter:e.fromChapter,fromVerse:e.fromVerse};});}));return entries.flat().slice(0,100);}
function renderVerse(raw,book,showStrong){var source=String(raw||"");var pattern=/<s>([0-9]{1,5})<\/s>/gi,position=0,output="",match;
 function chunk(str){return clean(str.replace(/<br\s*\/?>/gi,"\n").replace(/<\/p>/gi,"\n").replace(/<[^>]*>/g,"").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&"));}
 while((match=pattern.exec(source))!==null){output+=chunk(source.slice(position,match.index));var prefix=canonical.indexOf(book)<39?"H":"G";var code=prefix+Number(match[1]);if(showStrong){output+='<button type="button" class="strong-badge" data-strong="'+code+'" aria-label="Abrir dicionário Strong '+code+'">'+code+'</button>';}position=match.index+match[0].length;}
 output+=chunk(source.slice(position));return output;}
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
async function getDictionaryEntry(term){
 var topic=dictTopic(term);if(!topic)return [];
 var db=await dbOpen(),selected=modules.filter(function(m){return m.type==="dictionary";});
 var entries=await Promise.all(selected.map(async function(m){
  var row=await request(db.transaction("lexicon","readonly").objectStore("lexicon").get(m.id+"/"+topic));
  return row?{topic:row.original||row.topic,definition:row.definition,moduleId:m.id,moduleName:m.name,license:m.license}:null;
 }));
 return entries.filter(Boolean);
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
  var rows=recordSet(db.exec("SELECT * FROM "+(type==="bible"?"verses":type==="commentary"?"commentaries":"dictionary")));
  var normalized=type==="bible"?normalizeBible(rows):type==="commentary"?normalizeCommentaries(rows):normalizeDictionary(rows);
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
 var zip=await JSZip.loadAsync(file,{checkCRC32:true}),entries=Object.values(zip.files).filter(function(e){return !e.dir&&!/(^|\/)(__MACOSX|\.DS_Store)/i.test(e.name);});
 if(entries.length>30)throw Error("O ZIP contém arquivos demais. Limite: 30.");
 var total=entries.reduce(function(sum,e){return sum+(e._data&&e._data.uncompressedSize||0);},0);
 if(total>110*1024*1024)throw Error("O ZIP ultrapassa o limite de 110 MB descompactados.");
 var sqlite=entries.filter(function(e){return /\.(sqlite3?|db)$/i.test(e.name);});
 if(sqlite.length){var all=[];for(var e of sqlite){var bin=await e.async("uint8array");if(bin.byteLength>60*1024*1024)throw Error("Um módulo SQLite excede 60 MB.");all.push(await parseSQLite(bin,e.name.split("/").pop()));}return all;}
 var manifest=entries.find(function(e){return /(?:^|\/)(?:module|manifest)\.json$/i.test(e.name);});
 if(manifest){
  var meta=JSON.parse(await manifest.async("string"));var kind=meta.type||meta.module&&meta.module.type;var body=entries.find(function(e){return kind==="commentary"?/(?:commentaries|comments)\.json$/i.test(e.name):kind==="dictionary"?/(?:dictionary|entries)\.json$/i.test(e.name):/verses\.json$/i.test(e.name);});
  if(!body)throw Error("O ZIP tem módulo de descrição, mas não os dados .json.");
  var records=JSON.parse(await body.async("string"));
  if(!Array.isArray(records))throw Error("O arquivo de dados deve conter uma lista JSON.");
  return [pickJson(Object.assign({},meta,kind==="commentary"?{commentaries:records}:kind==="dictionary"?{dictionary:records}:{verses:records}),file.name)];
 }
 var first=entries.find(function(e){return /\.json$/i.test(e.name);});
 if(!first)throw Error("ZIP incompatível. Inclua arquivos .SQLite3 do MyBible ou module.json + versos/comentários JSON.");
 return [pickJson(JSON.parse(await first.async("string")),file.name)];
}
async function parseFile(file){
 if(file.size>70*1024*1024)throw Error("O arquivo ultrapassa 70 MB.");
 var name=file.name.toLowerCase();
 if(name.endsWith(".zip"))return parseZip(file);
 if(/\.(sqlite3?|db)$/.test(name))return [await parseSQLite(await file.arrayBuffer(),file.name)];
 if(name.endsWith(".json"))return [pickJson(JSON.parse(await file.text()),file.name)];
 throw Error("Formato incompatível. Escolha um ZIP, SQLite3 ou JSON.");
}
async function deleteRelated(store,id){
 return new Promise(function(resolve,reject){var idx=store.index("moduleId"),range=IDBKeyRange.only(id),req=idx.openCursor();req.onsuccess=function(){var cur=req.result;if(cur){cur.delete();cur.continue();}else resolve();};req.onerror=function(){reject(req.error);};});
}
async function relatedKeys(store,id){var db=await dbOpen();return request(db.transaction(store,"readonly").objectStore(store).index("moduleId").getAllKeys(IDBKeyRange.only(id)));}
async function saveModule(parsed,filename){
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
function getUiMarkup(){
 return '<div class="content module-library">'+
 '<div class="eyebrow">PÚLPITO BIBLE / MÓDULOS EXTERNOS</div><h1 class="page-title">Biblioteca de módulos</h1><p class="subtitle">Instale traduções e comentários armazenados em ZIP ou SQLite3. Os arquivos ficam neste aparelho e os comentários acompanham a passagem escolhida.</p>'+
 '<div class="grid-2"><section class="card card-pad"><div class="panel-heading"><h2 class="section-heading">Instalar arquivos</h2><span class="chip greenish">Local • sem envio para servidor</span></div>'+
 '<label class="module-upload"><span class="module-upload-icon">⇧</span><strong>Escolher arquivos ZIP, SQLite3 ou JSON</strong><span>Importe módulos da Bíblia ou comentários do MyBible, ou pacotes do Púlpito Bible.</span><input id="module-file" type="file" multiple accept=".zip,.sqlite3,.sqlite,.db,.json"></label>'+
 '<label class="module-rights"><input id="module-rights" type="checkbox"> <span>Declaro que tenho permissão de utilizar os arquivos e que não vou redistribuir conteúdo protegido sem autorização.</span></label>'+
 '<p class="feature-note">Aceita ZIP contendo *.SQLite3, arquivos SQLite3 avulsos e ZIP/JSON estruturado para Púlpito Bible. Módulos criptografados e formatos diferentes podem não ser compatíveis. Limite: 70 MB por arquivo.</p>'+
 '<button class="btn" id="module-sample" type="button">↓ Baixar pacote de exemplo</button><p id="module-status" class="module-status" role="status" aria-live="polite">'+clean(lastStatus)+'</p></section>'+
 '<section class="card card-pad"><div class="panel-heading"><h2 class="section-heading">Meus módulos instalados</h2><span class="chip goldish">'+modules.length+' módulo(s)</span></div>'+
 (modules.length?modules.map(function(m){return '<div class="module-installed"><div><span class="chip">'+(m.type==="bible"?"BÍBLIA":"COMENTÁRIO")+'</span><h3>'+clean(m.name)+'</h3><p class="tiny muted">'+clean(m.abbreviation)+" · "+clean(m.language)+" · "+m.count+' itens</p><p class="tiny muted">'+clean(m.format)+" · "+clean(m.license)+'</p></div><div class="row">'+(m.type==="bible"?'<button class="btn slim" data-module-activate="'+clean(m.id)+'">Ler agora</button>':"")+'<button class="btn slim" data-module-remove="'+clean(m.id)+'">Remover</button></div></div>';}).join(""):'<div class="empty">Nenhum módulo externo instalado ainda.</div>')+'</section></div>'+
 '<section class="card card-pad" style="margin-top:18px"><div class="panel-heading"><h2 class="section-heading">Traduções desejadas</h2><span class="chip">Disponíveis via importação autorizada</span></div>'+
 '<div class="module-catalog">'+requested.map(function(t){var found=modules.find(function(m){return m.type==="bible"&&((m.abbreviation||"").toUpperCase()===t.code||(m.name||"").toLowerCase()===t.name.toLowerCase());});return '<div class="module-catalog-item"><div><strong>'+clean(t.code)+' · '+clean(t.name)+'</strong><p>'+clean(t.holder)+' · '+clean(t.status)+'</p></div><span class="chip '+(found?"greenish":"")+'">'+(found?"Instalado":"Não incluído")+'</span></div>';}).join("")+'</div>'+
 '<p class="feature-note">NVI, NTLH, NAA e ACF não são fornecidas nem baixadas automaticamente pelo aplicativo. A King James de 1611 também exige verificação dos direitos aplicáveis à edição e ao território. A instalação depende de arquivo compatível obtido com autorização.</p></section>'+
 '<section class="card card-pad" style="margin-top:18px"><h2 class="section-heading">Como instalar</h2><p class="feature-note">1. Obtenha legalmente o módulo e salve o arquivo ZIP ou SQLite3 no dispositivo. 2. Toque em “Escolher arquivos” e selecione o documento no aplicativo Arquivos. 3. Confirme o direito de utilização e a importação será iniciada. 4. Ative uma Bíblia instalada pelo botão “Ler agora” ou pelo seletor de traduções. 5. Ative “Comentários” no leitor para consultar comentários vinculados ao capítulo.</p><p class="feature-note">Os dados são armazenados em IndexedDB no navegador. Eles não são sincronizados entre aparelhos; limpar os dados do site pode apagá-los. Exporte ou mantenha cópia original dos seus ZIPs.</p></section></div>';
}
function renderPage(){var root=document.getElementById("app-main");if(root)root.innerHTML=getUiMarkup();}
async function downloadSample(){
 if(!window.JSZip){notify("Biblioteca ZIP indisponível");return;}
 var zip=new JSZip();
 zip.file("module.json",JSON.stringify({type:"commentary",name:"Comentário demonstrativo Púlpito Bible",abbreviation:"EX-COM",language:"pt-BR",license:"CC0 – conteúdo demonstrativo",description:"Exemplo de estrutura; não é comentário exegético profissional."},null,2));
 zip.file("comments.json",JSON.stringify([{book:"john",chapter:15,verse:4,text:"Exemplo de anotação: observe o verbo 'permanecer' e leia João 15:1–8 antes de elaborar uma aplicação."},{book:"psalms",chapter:73,verse:3,text:"Exemplo de anotação: observe a tensão entre a prosperidade dos ímpios e a mudança de perspectiva em Salmos 73:17."}],null,2));
 var blob=await zip.generateAsync({type:"blob"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="pulpito-bible-modulo-exemplo.zip";document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},2500);
}
document.addEventListener("change",function(e){if(e.target&&e.target.id==="module-file"){var files=Array.from(e.target.files||[]);if(files.length)importFiles(files);}});
document.addEventListener("click",function(e){
 var act=e.target&&e.target.closest&&e.target.closest("[data-module-remove],[data-module-activate],#module-sample");
 if(!act)return;
 if(act.id==="module-sample"){downloadSample();return;}
 if(act.dataset.moduleRemove){removeModule(act.dataset.moduleRemove);return;}
 if(act.dataset.moduleActivate){var m=modules.find(function(x){return x.id===act.dataset.moduleActivate;});if(m){onUpdated("local:"+m.id);notify("Tradução "+m.name+" selecionada.");}return;}
});
window.PBModules={ready:ready,getInstalled:installed,renderPage:renderPage,bibleOptions:bibleOptions,getChapter:getChapter,getCommentaries:getCommentaries,getDictionaryEntry:getDictionaryEntry,renderVerse:renderVerse,getModuleByVersion:getModuleByVersion,moduleName:moduleName,init:function(config){notify=config.notify||notify;onUpdated=config.onUpdated||onUpdated;return ready();}};
})();