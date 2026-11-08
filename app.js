/* Púlpito Bible bundle v2 — source: modules.js + toolbar-store.js + app-core.js. Render deploys this single file. */
(function(){
"use strict";
var DB_NAME="PulpitoBibleModules",DB_VERSION=1;
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
function dbOpen(){if(dbPromise)return dbPromise;dbPromise=new Promise(function(resolve,reject){if(!window.indexedDB)return reject(Error("Este navegador não disponibiliza IndexedDB"));var r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=function(){var d=r.result;if(!d.objectStoreNames.contains("modules"))d.createObjectStore("modules",{keyPath:"id"});if(!d.objectStoreNames.contains("chapters"))d.createObjectStore("chapters",{keyPath:"key"}).createIndex("moduleId","moduleId",{unique:false});if(!d.objectStoreNames.contains("commentaries"))d.createObjectStore("commentaries",{keyPath:"key"}).createIndex("moduleId","moduleId",{unique:false});};r.onsuccess=function(){resolve(r.result);};r.onerror=function(){reject(r.error||Error("Não foi possível abrir a biblioteca local"));};});return dbPromise;}
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
async function parseSQLite(buffer,filename){
 if(!window.initSqlJs)throw Error("O leitor SQLite não carregou. Verifique a conexão com a internet e tente novamente.");
 var SQL=await window.initSqlJs({locateFile:function(f){return "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/"+f;}});
 var db;
 try{
  db=new SQL.Database(new Uint8Array(buffer));
  var tables=recordSet(db.exec("SELECT name FROM sqlite_master WHERE type='table'")).map(function(r){return String(r.name).toLowerCase();});
  var type=tables.includes("verses")?"bible":tables.includes("commentaries")?"commentary":null;
  if(!type)throw Error("SQLite sem tabela 'verses' ou 'commentaries' compatível com MyBible.");
  var info=getInfo(db);
  var rows=recordSet(db.exec("SELECT * FROM "+(type==="bible"?"verses":"commentaries")));
  var normalized=type==="bible"?normalizeBible(rows):normalizeCommentaries(rows);
  return {type:type,name:info.description||info.name||filename.replace(/\.((?:commentaries\.)?sqlite3|sqlite|db)$/i,""),abbreviation:filename.split(".")[0].slice(0,30),language:info.language||"não informada",license:info.license||info.copyright||"não informada",description:info.detailed_info||"",format:"MyBible SQLite3",groups:normalized.groups,count:normalized.count};
 }finally{if(db)db.close();}
}
function pickJson(json,filename){
 var meta=json.module||json.metadata||json;
 var kind=String(meta.type||json.type||"").toLowerCase();
 var bible=Array.isArray(json.verses)?json.verses:Array.isArray(json.data)?json.data:null;
 var comments=Array.isArray(json.commentaries)?json.commentaries:Array.isArray(json.comments)?json.comments:null;
 if(!kind)kind=bible?"bible":comments?"commentary":"";
 if(kind==="comments")kind="commentary";
 var rows=kind==="bible"?bible:comments;
 if(!Array.isArray(rows))throw Error("O JSON não contém lista de versículos ou comentários.");
 var normalized=kind==="bible"?normalizeBible(rows):kind==="commentary"?normalizeCommentaries(rows):null;
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
  var meta=JSON.parse(await manifest.async("string"));var kind=meta.type||meta.module&&meta.module.type;var body=entries.find(function(e){return kind==="commentary"?/(?:commentaries|comments)\.json$/i.test(e.name):/verses\.json$/i.test(e.name);});
  if(!body)throw Error("O ZIP tem módulo de descrição, mas não os dados .json.");
  var records=JSON.parse(await body.async("string"));
  if(!Array.isArray(records))throw Error("O arquivo de dados deve conter uma lista JSON.");
  return [pickJson(Object.assign({},meta,kind==="commentary"?{commentaries:records}:{verses:records}),file.name)];
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
 var id="ext-"+filenameSlug(filename)+"-"+(parsed.type==="bible"?"b":"c");var db=await dbOpen();
 var meta={id:id,type:parsed.type,name:String(parsed.name||filename).slice(0,130),abbreviation:String(parsed.abbreviation||"EXT").slice(0,30),language:String(parsed.language||"").slice(0,60),license:String(parsed.license||"não informada").slice(0,400),description:String(parsed.description||"").slice(0,400),format:parsed.format,count:parsed.count,file:filename,installedAt:Date.now()};
 var collection=parsed.type==="bible"?"chapters":"commentaries";
 var oldKeys=await relatedKeys(collection,id),tx=db.transaction(["modules",collection],"readwrite");
 var done=new Promise(function(resolve,reject){tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error||Error("Falha ao gravar módulo"));};tx.onabort=function(){reject(tx.error||Error("Importação cancelada"));};});
 var store=tx.objectStore(collection);oldKeys.forEach(function(key){store.delete(key);});
 parsed.groups.forEach(function(group){var key=id+"/"+group.book+(parsed.type==="bible"?"/"+group.chapter:"");store.put(Object.assign({key:key,moduleId:id},group));});
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
 var db=await dbOpen();var ckeys=await relatedKeys("chapters",id),nkeys=await relatedKeys("commentaries",id);
 var tx=db.transaction(["modules","chapters","commentaries"],"readwrite");
 var done=new Promise(function(resolve,reject){tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error);};});
 tx.objectStore("modules").delete(id);ckeys.forEach(function(key){tx.objectStore("chapters").delete(key);});
 nkeys.forEach(function(key){tx.objectStore("commentaries").delete(key);});
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
window.PBModules={ready:ready,getInstalled:installed,renderPage:renderPage,bibleOptions:bibleOptions,getChapter:getChapter,getCommentaries:getCommentaries,renderVerse:renderVerse,getModuleByVersion:getModuleByVersion,moduleName:moduleName,init:function(config){notify=config.notify||notify;onUpdated=config.onUpdated||onUpdated;return ready();}};
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
        item("modules","Módulos","⇩")+item("strong","Dicionário","α")+
        item("bookmarks","Favoritos","☆")+item("sermon","Sermões","▤")+
        item("tutor","Interpretar","✧")+item("theme","Alternar tema","◐")+
      '</div><div class="mtb-menu-prefs">'+prefs.map(([key,label])=>'<label><input type="checkbox" data-toolbar-pref="'+key+'" '+(s[key]?'checked':'')+'> '+escapeHtml(label)+'</label>').join('')+'</div>'+
      '<div class="mtb-font-row"><span>Tamanho da leitura</span>'+item("font-down","Diminuir","A−","mtb-compact")+'<strong>'+s.fontSize+'px</strong>'+item("font-up","Aumentar","A+","mtb-compact")+'</div>'+
    '</section>';
  }
  function selectionMarkup(s){
    return '<div class="mtb-selection">'+
      '<span class="mtb-count">'+s.currentVerseSelection.length+' selecionado(s)</span>'+
      item("copy","Copiar","▣")+item("share","Compartilhar","↗")+
      item("highlight","Marcar com cor","▨")+item("note","Adicionar nota","✎")+
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
(function(){
"use strict";
var API="https://api.midvash.com/v1";
var MAIN=document.getElementById("app-main");
var TITLES={leitura:"Leitura bíblica",original:"Texto original & Strong",tutor:"Assistente de interpretação",exercicios:"Exercícios de exegese",sermao:"Criador de sermões",caderno:"Meu caderno",modulos:"Módulos e traduções",mercado:"Análise das Bíblias",projeto:"Recursos e evolução"};
var STORE_KEY="pulpito-bible-v1";
var booksFallback="Gênesis|genesis|50;Êxodo|exodus|40;Levítico|leviticus|27;Números|numbers|36;Deuteronômio|deuteronomy|34;Josué|joshua|24;Juízes|judges|21;Rute|ruth|4;1 Samuel|1-samuel|31;2 Samuel|2-samuel|24;1 Reis|1-kings|22;2 Reis|2-kings|25;1 Crônicas|1-chronicles|29;2 Crônicas|2-chronicles|36;Esdras|ezra|10;Neemias|nehemiah|13;Ester|esther|10;Jó|job|42;Salmos|psalms|150;Provérbios|proverbs|31;Eclesiastes|ecclesiastes|12;Cânticos|song-of-solomon|8;Isaías|isaiah|66;Jeremias|jeremiah|52;Lamentações|lamentations|5;Ezequiel|ezekiel|48;Daniel|daniel|12;Oseias|hosea|14;Joel|joel|3;Amós|amos|9;Obadias|obadiah|1;Jonas|jonah|4;Miqueias|micah|7;Naum|nahum|3;Habacuque|habakkuk|3;Sofonias|zephaniah|3;Ageu|haggai|2;Zacarias|zechariah|14;Malaquias|malachi|4;Mateus|matthew|28;Marcos|mark|16;Lucas|luke|24;João|john|21;Atos|acts|28;Romanos|romans|16;1 Coríntios|1-corinthians|16;2 Coríntios|2-corinthians|13;Gálatas|galatians|6;Efésios|ephesians|6;Filipenses|philippians|4;Colossenses|colossians|4;1 Tessalonicenses|1-thessalonians|5;2 Tessalonicenses|2-thessalonians|3;1 Timóteo|1-timothy|6;2 Timóteo|2-timothy|4;Tito|titus|3;Filemom|philemon|1;Hebreus|hebrews|13;Tiago|james|5;1 Pedro|1-peter|5;2 Pedro|2-peter|3;1 João|1-john|5;2 João|2-john|1;3 João|3-john|1;Judas|jude|1;Apocalipse|revelation|22".split(";").map(function(s,i){var p=s.split("|");return {name:p[0],slug:p[1],chapters:+p[2],testament:i<39?"old":"new"};});
var defaults={page:"leitura",book:"john",chapter:15,version:"alm1911",selectedVerse:4,theme:"light",fontSize:18,showStrong:true,showComments:false,showCrossRefs:false,showParallel:false,readerMode:"continuous",readerTheme:"sepia",focusMode:false,bookmarks:[],notes:[],studies:{},tutorStep:0,sermon:{title:"Permanecendo em Cristo",reference:"João 15:1–8",introduction:"",context:"",point1:"",point2:"",application:"",conclusion:""},exerciseAnswers:{},history:[],parallelVersion:"bpm"};
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
var latestChapter=null,loadSeq=0,searchMessage="",toastTimer=null;
window.PBModules.init({notify:notify,onUpdated:function(select){if(select){state.version=select;state.selectedVerse=0;state.page="leitura";}else if(state.version.startsWith("local:")&&!window.PBModules.getModuleByVersion(state.version)){state.version="alm1911";}persist();render();}}).then(function(){if(state.page==="modulos"||state.page==="leitura")render();}).catch(function(err){console.warn("Biblioteca externa indisponível:",err);});
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function persist(){try{localStorage.setItem(STORE_KEY,JSON.stringify(state));}catch(e){notify("Não foi possível salvar no navegador");}}
function notify(s){var el=document.getElementById("toast");el.textContent=s;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.classList.remove("show");},3000);}
function ref(){return activeBook.name+" "+state.chapter+(state.selectedVerse?":"+state.selectedVerse:"");}
function title(k){return '<div class="eyebrow">PÚLPITO BIBLE / '+esc(TITLES[k]).toUpperCase()+'</div><h1 class="page-title">'+esc(TITLES[k])+'</h1>';}
function page(s){if(s!=="leitura"){TS.actions.clearSelection();TS.unmount();}state.page=s;persist();render();document.getElementById("sidebar").classList.remove("open");document.getElementById("mobile-overlay").classList.remove("active");window.scrollTo({top:0,behavior:"instant"});}
function cacheKey(){return state.version+"/"+state.book+"/"+state.chapter;}
function currentNote(){return (state.notes||[]).find(function(n){return n.ref===ref();});}
function currentMarked(){return (state.bookmarks||[]).includes(ref());}
function setRef(book,ch,verse){TS.actions.clearSelection();stopAudio();state.book=book;state.chapter=Math.max(1,Number(ch)||1);state.selectedVerse=Number(verse)||0;activeBook=books.find(function(b){return b.slug===state.book;})||booksFallback.find(function(b){return b.slug===state.book;})||activeBook;persist();render();}
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
    try{localStorage.setItem("pb-chapters-v1",JSON.stringify(chaptersCache));}catch(e){}
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
 case "comments":TS.actions.setPreference("showComments",!TS.getState().showComments);toolbarAction("preferences-changed");return;
 case "strong":page("original");return;
 case "notes":case "bookmarks":page("caderno");return;
 case "modules":page("modulos");return;
 case "sermon":page("sermao");return;
 case "tutor":page("tutor");return;
 default:return;
 }
}

function renderReaderContent(){
 var holder=document.getElementById("chapter-body");if(!holder||!latestChapter)return;
 var rows=latestChapter.verses.map(function(v){
  var r=activeBook.name+" "+state.chapter+":"+v.number;
  var vid=verseGlobalId(v.number),color=TS.COLORS[TS.getState().highlights[vid]]||"";
  return '<span class="verse-line'+(state.selectedVerse===v.number?" selected":"")+(state.bookmarks.includes(r)?" marked":"")+(color?" highlighted":"")+'" data-usfm="'+esc(vid)+'" style="'+(color?"--verse-mark:"+color:"")+'" data-verse="'+v.number+'" role="button" tabindex="0" title="Selecionar versículo '+v.number+'"><sup class="verse-num">'+v.number+'</sup>'+(state.version.startsWith("local:")?window.PBModules.renderVerse(v.text,state.book,state.showStrong):annotateVerse(v.text,v.number))+'</span>';
 }).join(state.readerMode==="verses"?"":" ");
 holder.innerHTML='<div class="verse-list '+(state.readerMode==="verses"?"segmented":"")+'">'+rows+'</div><div class="credit">'+esc(latestChapter.copyright||"Texto disponibilizado pela API Midvash; consulte os termos da tradução.")+'</div>';
 var el=document.getElementById("selected-reference");if(el)el.textContent=ref();
 var b=document.getElementById("bookmark-btn");if(b)b.textContent=currentMarked()?"★ Favorito":"☆ Favorito";
 if(state.showParallel)loadParallelText();
 if(state.showComments)loadInstalledComments();
 refreshVerseDecorations();
}
function readerOptions(){
 return books.map(function(b){return '<option value="'+esc(b.slug)+'"'+(state.book===b.slug?" selected":"")+'>'+esc(b.name)+'</option>';}).join("");
}
function renderReader(){
 var other=state.parallelVersion||"bpm";
 MAIN.innerHTML='<section class="reader-screen"><div id="dynamic-toolbar"></div><div class="reader-commandbar">'+
 '<div class="reader-top-controls"><div class="reader-brand"><span class="brand-small">✦</span><strong>Púlpito Bible</strong><span class="reader-tagline">Leitor avançado</span></div><div class="reader-passage-control"><select class="reader-select book-control" id="book-select" aria-label="Selecionar livro">'+readerOptions()+'</select><select class="reader-select chapter-control" id="chapter-select" aria-label="Selecionar capítulo">'+chapterOptions()+'</select><select class="reader-select version-control" id="version-select" aria-label="Selecionar tradução"><option value="alm1911"'+(state.version==="alm1911"?" selected":"")+'>Almeida 1911</option><option value="bpm"'+(state.version==="bpm"?" selected":"")+'>BPM</option><option value="onbv"'+(state.version==="onbv"?" selected":"")+'>ONBV</option><option value="nva"'+(state.version==="nva"?" selected":"")+'>NVA</option>'+window.PBModules.bibleOptions(state.version)+'</select></div><div class="reader-arrows"><button class="reader-icon" data-act="prev-chapter" aria-label="Capítulo anterior">‹</button><button class="reader-icon" data-act="next-chapter" aria-label="Próximo capítulo">›</button></div></div>'+
 '<div class="reader-quicktools"><button class="reader-tool'+(state.showStrong?" on":"")+'" data-act="toggle-strong">H/G <strong>Strong</strong><span class="mini-switch"></span></button><button class="reader-tool'+(state.showComments?" on":"")+'" data-act="toggle-comments">▤ Comentários</button><button class="reader-tool'+(state.showCrossRefs?" on":"")+'" data-act="toggle-crossrefs">⇄ Referências</button><button class="reader-tool'+(state.showParallel?" on":"")+'" data-act="toggle-parallel">◫ Duas Bíblias</button><button class="reader-tool" data-page="original">α Dicionário</button><button class="reader-tool" data-page="tutor">✧ Interpretar</button><button class="reader-tool" data-page="modulos">⇩ Instalar módulos</button></div>'+
 '<div class="reader-appearance"><label>Texto <select id="reader-mode" aria-label="Formato dos versículos"><option value="continuous"'+(state.readerMode==="continuous"?" selected":"")+'>Contínuo</option><option value="verses"'+(state.readerMode==="verses"?" selected":"")+'>Por versículo</option></select></label><label>Fundo <select id="reader-paper" aria-label="Estilo do leitor"><option value="sepia"'+(state.readerTheme==="sepia"?" selected":"")+'>Sépia</option><option value="white"'+(state.readerTheme==="white"?" selected":"")+'>Branco</option><option value="night"'+(state.readerTheme==="night"?" selected":"")+'>Noturno</option></select></label><button class="reader-icon" data-act="reader-font-down" aria-label="Diminuir fonte">A−</button><span class="reader-size">'+state.fontSize+'px</span><button class="reader-icon" data-act="reader-font-up" aria-label="Aumentar fonte">A+</button><button class="reader-tool" data-act="focus-mode">'+(state.focusMode?"◧ Mostrar menus":"⛶ Tela de leitura")+'</button></div></div>'+
 '<div class="reader-searchline"><input class="field" id="reference-search" placeholder="Ir para referência — João 15:4" aria-label="Ir para referência"><button class="btn slim" data-act="search-ref">Ir</button><span class="reader-hint">Toque no código azul para abrir o léxico.</span></div>'+
 '<div class="reader-columns"><article class="reader-paper '+esc(state.readerTheme)+'"><div class="reader-paper-head"><span class="reader-module">'+esc(state.version.toUpperCase())+'</span><div><div class="reader-overline">LIVRO E CAPÍTULO</div><h1>'+esc(activeBook.name)+' '+state.chapter+'</h1></div><button class="reader-favorite" id="bookmark-btn" data-act="bookmark">'+(currentMarked()?"★ Favorito":"☆ Favorito")+'</button></div><div id="chapter-body" class="reader-scripture"><div class="loader">Carregando Escrituras…</div></div><div class="reader-note"><strong>Strong no texto:</strong> os vínculos exibidos nesta versão são amostras conferidas para João 15:4–5 e Gênesis 1:1. A numeração de todo o texto dependerá de uma base morfológica alinhada à tradução portuguesa.</div></article>'+
 (state.showParallel?'<article class="reader-paper second '+esc(state.readerTheme)+'"><div class="reader-paper-head"><select id="parallel-version-select" class="reader-select"><option value="alm1911"'+(other==="alm1911"?" selected":"")+'>Almeida 1911</option><option value="bpm"'+(other==="bpm"?" selected":"")+'>BPM</option><option value="onbv"'+(other==="onbv"?" selected":"")+'>ONBV</option><option value="nva"'+(other==="nva"?" selected":"")+'>NVA</option>'+window.PBModules.bibleOptions(other)+'</select><h2>Tradução paralela</h2></div><div id="parallel-body" class="reader-scripture"><div class="loader">Carregando versão paralela…</div></div></article>':"")+'</div>'+
 (state.showComments||state.showCrossRefs?'<div class="reader-bottom-panels">'+(state.showComments?'<section class="card card-pad reader-extras"><div class="caps">COMENTÁRIOS</div><h2 class="section-heading">Observações do estudo</h2><p class="feature-note">'+(state.book==="john"&&state.chapter===15?"A figura da videira relaciona permanência em Cristo e frutificação. Leia João 15:1–8 como uma unidade literária antes de tirar conclusões a partir de um único verbo.":state.book==="psalms"&&state.chapter===73?"O salmista percebe a prosperidade dos ímpios e enfrenta uma crise de entendimento. A virada interpretativa ocorre no versículo 17. Palavra no original: ímpios <button class=\"comment-strong-badge\" data-strong=\"H7563\">H7563</button>.":"Ainda não há comentários teológicos importados para este capítulo. Você pode criar suas próprias notas.")+' </p><div id="installed-comments" class="module-comment-list"><p class="tiny muted">Buscando comentários instalados…</p></div><button class="btn slim" data-act="note">✎ Escrever anotação</button><button class="btn slim" data-page="modulos">⇩ Instalar comentários</button></section>':"")+
 (state.showCrossRefs?'<section class="card card-pad reader-extras"><div class="caps">REFERÊNCIAS CRUZADAS</div><h2 class="section-heading">Passagens relacionadas</h2><p class="feature-note">Sugestões temáticas iniciais, não geradas automaticamente por um comentário externo.</p><div class="row">'+(state.book==="john"&&state.chapter===15?'<button class="btn slim" data-ref-open="João 6:56">João 6:56</button><button class="btn slim" data-ref-open="Gálatas 5:22">Gálatas 5:22</button>':'<button class="btn slim" data-ref-open="João 1:1">João 1:1</button>')+'</div></section>':"")+'</div>':"")+
 '<div class="reader-actiondock"><div class="reader-reference"><span>SELECIONADO</span><strong id="selected-reference">'+esc(ref())+'</strong></div><div class="row"><button class="btn slim" data-act="bookmark">☆ Marcar</button><button class="btn slim" data-act="note">✎ Anotar</button><button class="btn slim" data-page="sermao">▤ Sermão</button><button class="btn primary slim" data-page="tutor">✧ Interpretar</button></div></div></section>';
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
   return '<article class="module-comment"><strong>'+esc(item.moduleName)+'</strong><small>'+esc(item.marker||"")+" · "+esc(activeBook.name)+" "+(item.fromChapter||ch)+(item.fromVerse?":"+item.fromVerse:"")+'</small><p>'+esc(item.text)+'</p><button class="btn slim" data-comment-sermon="'+esc(item.moduleId)+'" data-comment-text="'+esc(item.text.slice(0,1000))+'">Inserir trecho no sermão</button></article>';
  }).join("");
 }).catch(function(e){var node=document.getElementById("installed-comments");if(node)node.innerHTML='<p class="tiny muted">Comentários indisponíveis: '+esc(e.message)+'</p>';});
}
function openStrongPopup(wordId){
 var w=words.find(function(x){return x.id===wordId;});
 if(!w){var code=String(wordId).toUpperCase();if(!/^[GH][0-9]{1,5}$/.test(code))return;var val=Number(code.slice(1));w={id:code,code:code,label:"—",reading:"Não disponível",lemma:"Não disponível",book:ref(),type:"Morfologia não instalada",tense:"A consultar",voice:"A consultar",mood:"A consultar",person:"A consultar",meaning:"Entrada Strong sem dicionário conectado",note:"O número Strong identifica uma entrada lexical, não a forma gramatical específica desta ocorrência. A definição, o tempo verbal, o modo e a voz exigem um léxico e uma base morfológica alinhada a este versículo; não serão deduzidos pelo código.",source:"https://biblehub.com/"+(code[0]==="H"?"hebrew":"greek")+"/"+val+".htm"};}
 currentWord=w;
 document.getElementById("strong-window")?.remove();
 var frame=document.createElement("div");frame.id="strong-window";frame.className="strong-overlay";frame.setAttribute("role","presentation");
 frame.innerHTML='<section class="strong-balloon" role="dialog" aria-modal="true" aria-label="Dicionário Strong '+esc(w.code)+'"><div class="strong-balloon-bar"><span class="caps">DICIONÁRIO STRONG · '+esc(w.book)+'</span><button class="reader-icon" data-act="close-strong" aria-label="Fechar">✕</button></div><div class="strong-term"><span class="strong-code">'+esc(w.code)+'</span><span class="strong-original">'+esc(w.label)+'</span></div><p class="strong-roman">'+esc(w.reading)+' · Lema: '+esc(w.lemma)+'</p><div class="caps">SIGNIFICADO NO CONTEXTO</div><h3>'+esc(w.meaning)+'</h3><div class="strong-morph"><span>'+esc(w.type)+'</span><span>'+esc(w.tense)+'</span><span>'+esc(w.voice)+'</span><span>'+esc(w.mood)+'</span><span>'+esc(w.person)+'</span></div><p class="feature-note">'+esc(w.note)+'</p><p class="lexicon-caveat">A forma original, o aspecto e o contexto devem ser examinados juntos. Strong não é tradução automática.</p><div class="strong-actions"><button class="btn" data-act="strong-copy">▣ Copiar</button><button class="btn" data-act="strong-study">α Estudar</button><button class="btn primary" data-act="strong-sermon">▤ Inserir no sermão</button></div><p class="strong-reference"><a href="'+esc(w.source)+'" target="_blank" rel="noopener">Consultar referência lexical ↗</a></p></section>';
 frame.addEventListener("click",function(e){if(e.target===frame)frame.remove();});
 document.body.appendChild(frame);
 frame.querySelector("[data-act='close-strong']").focus();
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
 document.querySelectorAll(".nav-item").forEach(function(el){el.classList.toggle("active",el.dataset.page===state.page);});
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
function sermonText(){var s=state.sermon;return [s.title,s.reference,"","Contexto histórico e literário",s.context,"","Introdução",s.introduction,"","1. Exposição",s.point1,"","2. Exposição",s.point2,"","Aplicação",s.application,"","Conclusão",s.conclusion].join("\n");}
document.addEventListener("click",function(ev){

 var comment=ev.target.closest("[data-comment-sermon]");if(comment){state.sermon.context+=(state.sermon.context?"\n\n":"")+comment.dataset.commentText;persist();notify("Trecho do comentário adicionado ao sermão");return;}
 var sw=ev.target.closest("[data-strong]");
 if(sw){ev.preventDefault();ev.stopPropagation();openStrongPopup(sw.dataset.strong);return;}
 var v=ev.target.closest("[data-verse]");if(v){
 state.selectedVerse=Number(v.dataset.verse);persist();
 TS.actions.toggleVerse(v.dataset.usfm||verseGlobalId(state.selectedVerse));
 refreshVerseDecorations();
 var title=document.getElementById("selected-reference");if(title)title.textContent=ref();
 if(state.showComments)loadInstalledComments();
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
 if(a==="toggle-comments"){state.showComments=!state.showComments;persist();renderReader();return;}
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
document.addEventListener("keydown",function(ev){if(ev.key==="Escape"){TS.actions.clearSelection();refreshVerseDecorations();document.getElementById("strong-window")?.remove();}if((ev.key==="Enter"||ev.key===" ")&&ev.target.dataset&&ev.target.dataset.strong){ev.preventDefault();openStrongPopup(ev.target.dataset.strong);return;}if(ev.key==="Enter"&&ev.target.id==="reference-search"){ev.preventDefault();lookupReference(ev.target.value);}if(ev.key==="Enter"&&ev.target.id==="word-search"){ev.preventDefault();wordFilter=ev.target.value;renderOriginal();}});
document.getElementById("menu-toggle").addEventListener("click",function(){document.getElementById("sidebar").classList.toggle("open");document.getElementById("mobile-overlay").classList.toggle("active");});
document.getElementById("mobile-overlay").addEventListener("click",function(){document.getElementById("sidebar").classList.remove("open");document.getElementById("mobile-overlay").classList.remove("active");});
document.getElementById("brand-link").addEventListener("click",function(e){e.preventDefault();page("leitura");});
document.getElementById("theme-toggle").addEventListener("click",function(){var next=TS.getState().theme==="dark"?"sepia":"dark";TS.actions.setTheme(next);state.theme=next==="dark"?"dark":"light";state.readerTheme=next==="dark"?"night":next;persist();render();});
document.getElementById("font-up").addEventListener("click",function(){state.fontSize=Math.min(30,state.fontSize+2);TS.actions.setFontSize(state.fontSize);persist();document.documentElement.style.setProperty("--reading-size",state.fontSize+"px");notify("Fonte: "+state.fontSize+"px");});
document.getElementById("font-down").addEventListener("click",function(){state.fontSize=Math.max(14,state.fontSize-2);persist();document.documentElement.style.setProperty("--reading-size",state.fontSize+"px");notify("Fonte: "+state.fontSize+"px");});
render();readBooks();
})();