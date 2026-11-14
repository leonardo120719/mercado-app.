window.PB_BUILD_ID = "pb-20261113-paineis-profissionais";
/* Global layout selector: the chosen appearance applies to every tool and reader. */
(function(){
 "use strict";
 var KEY="pulpito-bible-layout-v1";
 var allowed=["classic","premium","academic"];
 function read(){
  try{var saved=localStorage.getItem(KEY);return allowed.indexOf(saved)>=0?saved:"classic";}
  catch(e){return "classic";}
 }
 function apply(layout,save){
  layout=allowed.indexOf(layout)>=0?layout:"classic";
  document.documentElement.setAttribute("data-pb-layout",layout);
  if(save){try{localStorage.setItem(KEY,layout);}catch(e){}}
  var menu=document.getElementById("pb-layout-menu");
  if(menu){
   menu.querySelectorAll("[data-pb-layout-choice]").forEach(function(button){
    var active=button.getAttribute("data-pb-layout-choice")===layout;
    button.classList.toggle("active",active);
    button.setAttribute("aria-pressed",active?"true":"false");
    var mark=button.querySelector(".pb-layout-check");
    if(mark)mark.textContent=active?"✓":"";
   });
  }
  var toggle=document.getElementById("pb-layout-toggle");
  if(toggle){
   toggle.setAttribute("aria-label","Layout atual: "+(layout==="premium"?"Premium":layout==="academic"?"Acadêmico":"Clássico")+". Escolher layout");
   toggle.setAttribute("aria-expanded",menu&&!menu.hidden?"true":"false");
   var current=toggle.querySelector(".pb-layout-current");
   if(current)current.textContent=layout==="premium"?"Premium":layout==="academic"?"Acadêmico":"Clássico";
  }
 }
 function init(){
  var toggle=document.getElementById("pb-layout-toggle");
  var menu=document.getElementById("pb-layout-menu");
  if(!toggle||!menu)return;
  apply(read(),false);
  toggle.addEventListener("click",function(event){
   event.preventDefault();event.stopPropagation();
   menu.hidden=!menu.hidden;
   apply(document.documentElement.getAttribute("data-pb-layout"),false);
  });
  menu.addEventListener("click",function(event){
   var choice=event.target.closest("[data-pb-layout-choice]");
   if(!choice)return;
   apply(choice.getAttribute("data-pb-layout-choice"),true);
   menu.hidden=true;
   apply(document.documentElement.getAttribute("data-pb-layout"),false);
  });
  document.addEventListener("click",function(event){
   if(menu.hidden)return;
   var control=event.target.closest(".pb-layout-control");
   if(!control){menu.hidden=true;apply(document.documentElement.getAttribute("data-pb-layout"),false);}
  });
  document.addEventListener("keydown",function(event){
   if(event.key==="Escape"&&!menu.hidden){menu.hidden=true;apply(document.documentElement.getAttribute("data-pb-layout"),false);toggle.focus();}
  });
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
/* Bloqueio global prioritário: clique simples jamais inicia seleção. 
   Apenas o gesto de pressionar/segurar habilita o modo múltiplo. */
document.addEventListener("click",function(e){
 var target=e.target;
 if(!target||!target.closest||!target.closest("#chapter-body .verse-line"))return;
 if(target.closest("input[data-pb-verse-check], .pb-linked-word, .strong-word, [data-strong], [data-comment-indicator]"))return;
 e.preventDefault();
 e.stopImmediatePropagation();
},true);
/* Referências cruzadas ao tocar duas vezes exclusivamente na numeração. */
(function(){
 var lastTouch=null;
 var crossrefCache=null,crossrefPromise=null;
 var bookSlugs="genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|1-samuel|2-samuel|1-kings|2-kings|1-chronicles|2-chronicles|ezra|nehemiah|esther|job|psalms|proverbs|ecclesiastes|song-of-solomon|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|john|acts|romans|1-corinthians|2-corinthians|galatians|ephesians|philippians|colossians|1-thessalonians|2-thessalonians|1-timothy|2-timothy|titus|philemon|hebrews|james|1-peter|2-peter|1-john|2-john|3-john|jude|revelation".split("|");
 function loadCrossrefs(){
  if(crossrefCache)return Promise.resolve(crossrefCache);
  if(!crossrefPromise)crossrefPromise=fetch("./pulpito-crossrefs.json").then(function(r){if(!r.ok)throw Error("Base indisponível");return r.json();}).then(function(data){crossrefCache=data;return data;}).catch(function(e){crossrefPromise=null;throw e;});
  return crossrefPromise;
 }
 function openRefs(num){
  var verse=document.querySelector('#chapter-body .verse-line[data-verse="'+num+'"]');
  if(!verse)return;
  document.getElementById("pb-crossrefs-dialog")?.remove();
  var panel=document.createElement("div");panel.id="pb-crossrefs-dialog";
  panel.setAttribute("role","dialog");panel.setAttribute("aria-label","Referências cruzadas do versículo "+num);
  panel.style.cssText="position:fixed;z-index:99999;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,440px);max-height:76vh;overflow:auto;background:var(--reader-paper,#fffdf7);color:#17212a;border:1px solid #b8ad96;border-radius:14px;padding:18px;box-shadow:0 16px 60px #0006;font:15px/1.5 system-ui";
  var close=document.createElement("button");close.type="button";close.textContent="Fechar";close.style.cssText="float:right;padding:5px 10px";close.onclick=function(){panel.remove();};
  var title=document.createElement("strong");title.textContent="Referências cruzadas — versículo "+num;
  var info=document.createElement("div");info.textContent="Carregando referências offline…";
  panel.append(close,title,info);document.body.appendChild(panel);
  loadCrossrefs().then(function(data){
   if(!panel.isConnected)return;
   var usfm=verse.dataset.usfm||"";
   var slug=usfm.replace(/\\.\\d+$/, "").toLowerCase();
   var bookIndex=bookSlugs.indexOf(slug);
   if(bookIndex<0){
    var currentBook=document.querySelector('[data-book]')?.dataset.book;
    bookIndex=bookSlugs.indexOf(currentBook||"");
   }
   var chapterMatch=usfm.match(/\\.(\\d+)\\.(\\d+)$/);
   var chapter=chapterMatch?Number(chapterMatch[1]):Number(document.querySelector('[data-toolbar-chapter]')?.value||0);
   var rows=data.references.filter(function(r){return r.s[0]===bookIndex+1&&r.s[1]===chapter&&r.s[2]===Number(num);});
   info.replaceChildren();
   if(!rows.length){info.textContent="Esta base temática não possui referências para este versículo.";return;}
   rows.forEach(function(row){
    var section=document.createElement("section");section.style.cssText="margin-top:12px;border-top:1px solid #ddd;padding-top:10px";
    var heading=document.createElement("b");heading.textContent=row.d;section.appendChild(heading);
    row.t.forEach(function(t){
     var button=document.createElement("button");button.type="button";
     button.textContent=(bookSlugs[t[0]-1]||"Livro")+" "+t[1]+":"+t[2]+(t[3]?"–"+t[3]:"");
     button.style.cssText="display:block;border:0;background:transparent;color:#1164a2;text-decoration:underline;padding:7px 0;cursor:pointer;text-align:left";
     button.onclick=function(){
      panel.remove();
      var ref=button.textContent;
      var event=new CustomEvent("pb-crossref-navigate",{detail:{book:bookSlugs[t[0]-1],chapter:t[1],verse:t[2],reference:ref}});
      document.dispatchEvent(event);
     };
     section.appendChild(button);
    });
    info.appendChild(section);
   });
   var credit=document.createElement("small");credit.style.cssText="display:block;margin-top:14px;color:#667";
   credit.textContent="Fonte: Midvash — CC BY 4.0 (base temática adaptada). midvash.com";
   info.appendChild(credit);
  }).catch(function(){if(panel.isConnected)info.textContent="Não foi possível carregar a base de referências.";});
 }

 document.addEventListener("dblclick",function(e){
  var num=e.target.closest&&e.target.closest("#chapter-body .verse-line .verse-num");
  if(!num)return;
  e.preventDefault();e.stopImmediatePropagation();
  var verse=num.closest(".verse-line");if(verse)openRefs(verse.dataset.verse);
 },true);
 document.addEventListener("touchend",function(e){
  var num=e.target.closest&&e.target.closest("#chapter-body .verse-line .verse-num");
  if(!num||!e.changedTouches.length)return;
  var verse=num.closest(".verse-line");if(!verse)return;
  var t=e.changedTouches[0],now=Date.now();
  if(lastTouch&&lastTouch.verse===verse.dataset.usfm&&now-lastTouch.at<430&&Math.abs(t.clientX-lastTouch.x)<20&&Math.abs(t.clientY-lastTouch.y)<20){
   lastTouch=null;e.preventDefault();e.stopImmediatePropagation();openRefs(verse.dataset.verse);
  }else lastTouch={verse:verse.dataset.usfm,at:now,x:t.clientX,y:t.clientY};
 },{capture:true,passive:false});
})();
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
/* Read-only corrections: keep module records, indexes and ZIP backups unchanged. */
var portugueseCorrections={
 "excessão":"exceção", "excessões":"exceções", "exceçao":"exceção",
 "conserteza":"com certeza", "derrepente":"de repente", "apartir":"a partir",
 "derepente":"de repente", "denovo":"de novo", "comcerteza":"com certeza",
 "derrepentemente":"repentinamente", "enchergar":"enxergar", "enchergam":"enxergam",
 "enchergou":"enxergou", "praser":"prazer", "nescessário":"necessário",
 "nescessaria":"necessária", "nescessidade":"necessidade", "necesário":"necessário",
 "necesidade":"necessidade", "nescessariamente":"necessariamente", "signifcado":"significado",
 "signficado":"significado", "siguinificado":"significado", "compreenção":"compreensão",
 "compreençao":"compreensão", "interpletação":"interpretação", "interpretassão":"interpretação",
 "espreção":"expressão", "expreção":"expressão", "expessão":"expressão",
 "conhesimento":"conhecimento", "conhecimeto":"conhecimento", "mensiona":"menciona",
 "mensionado":"mencionado", "esplicação":"explicação", "explicaçao":"explicação",
 "comentàrio":"comentário", "comentàrios":"comentários", "dicionàrio":"dicionário",
 "dicinário":"dicionário", "versíclo":"versículo", "versíclulos":"versículos",
 "versicúlo":"versículo", "versìculo":"versículo", "versicúlos":"versículos",
 "biblíco":"bíblico", "biblíca":"bíblica", "gramàtica":"gramática",
 "esquescer":"esquecer", "adivertência":"advertência", "previlégio":"privilégio",
 "previlégios":"privilégios", "beneficiente":"beneficente", "reinvindicar":"reivindicar",
 "reinvindicação":"reivindicação", "subistituir":"substituir", "transmição":"transmissão",
 "prossedimento":"procedimento"
};
var encodingCorrections={
 "Ã¡":"á", "Ã ":"à", "Ã¢":"â",
 "Ã£":"ã", "Ã¤":"ä", "Ã©":"é",
 "Ãª":"ê", "Ã¨":"è", "Ã«":"ë",
 "Ã­":"í", "Ã¬":"ì", "Ã®":"î",
 "Ã¯":"ï", "Ã³":"ó", "Ã´":"ô",
 "Ãµ":"õ", "Ã²":"ò", "Ã¶":"ö",
 "Ãº":"ú", "Ã¼":"ü", "Ã¹":"ù",
 "Ã»":"û", "Ã§":"ç", "Ã\u0081":"Á",
 "Ã€":"À", "Ã‚":"Â", "Ãƒ":"Ã",
 "Ã„":"Ä", "Ã‰":"É", "ÃŠ":"Ê",
 "Ãˆ":"È", "Ã‹":"Ë", "Ã\u008d":"Í",
 "ÃŒ":"Ì", "ÃŽ":"Î", "Ã\u008f":"Ï",
 "Ã“":"Ó", "Ã”":"Ô", "Ã•":"Õ",
 "Ã’":"Ò", "Ã–":"Ö", "Ãš":"Ú",
 "Ãœ":"Ü", "Ã™":"Ù", "Ã›":"Û",
 "Ã‡":"Ç", "â€˜":"‘", "â€™":"’",
 "â€œ":"“", "â€\u009d":"”", "â€“":"–",
 "â€”":"—", "â€¦":"…"
};
var brokenEncoding=new RegExp(Object.keys(encodingCorrections).join("|"),"g");
var typoAliases=new Map();
Object.entries(portugueseCorrections).forEach(function(pair){
 var aliases=typoAliases.get(pair[1])||[];
 aliases.push(pair[0]);typoAliases.set(pair[1],aliases);
});
function isPortugueseModule(module){
 var language=String(module.language||"").trim();
 return !language||/^n[ãa]o informada$/i.test(language)||/^(?:pt|por|br|portugu[eê]s|portuguese)(?:$|[-_ (])/i.test(language);
}
// Decode imported HTML entities as text (never inject imported markup into the DOM).
// Applied at read time, so existing modules and future installations work alike.
function decodeModuleEntities(value){
 var text=String(value==null?"":value);
 if(!/&(?:amp;|#(?:x[0-9a-f]+|[0-9]+);|[a-z][a-z0-9]+;)/i.test(text))return text;
 var textarea=document.createElement("textarea");
 for(var pass=0;pass<2;pass++){
  var next=text.replace(/&(?:#(?:x[0-9a-f]+|[0-9]+)|[a-z][a-z0-9]+);/gi,function(entity){
   textarea.innerHTML=entity;
   return textarea.value;
  });
  if(next===text)break;
  text=next;
 }
 return text;
}
function repairModuleText(text,module){
 var value=decodeModuleEntities(text);
 if(!isPortugueseModule(module))return value;
 // Skip URLs, email, markup-like fragments, references and Strong identifiers.
 var protectedText=/((?:https?:\/\/|www\.)[^\s<>]+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|<[^>]*>|&(?:#\w+|[a-z]+);|\b[GH]\s*0*\d{1,5}[a-z]?\b|\b\d{1,3}[:.,]\s*\d{1,3}(?:\s*[-–—]\s*\d{1,3})?)/gi;
 return value.split(protectedText).map(function(part,index){
  if(index%2)return part;
  return part.replace(brokenEncoding,function(match){return encodingCorrections[match];}).normalize("NFC")
   .replace(/[\p{L}\p{M}]+(?:[’'-][\p{L}\p{M}]+)*/gu,function(word){
    var replacement=portugueseCorrections[word.toLocaleLowerCase("pt-BR")];
    if(typeof replacement!=="string")return word;
    if(word===word.toLocaleUpperCase("pt-BR"))return replacement.toLocaleUpperCase("pt-BR");
    if(word===word.toLocaleLowerCase("pt-BR"))return replacement;
    if(word.slice(1)===word.slice(1).toLocaleLowerCase("pt-BR"))return replacement[0].toLocaleUpperCase("pt-BR")+replacement.slice(1);
    return word;
   })
   .replace(/([\p{L}\p{M}])[ \t]+([,;!?])(?=\s|$)/gu,"$1$2")
   .replace(/([\p{L}\p{M}])[ \t]{2,}(?=[\p{L}\p{M}])/gu,"$1 ");
 }).join("");
}
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
async function getBibleSearchChapters(version){
 var module=getModuleByVersion(version);
 if(!module)throw Error("Bíblia não instalada");
 var db=await dbOpen();
 return request(db.transaction("chapters","readonly").objectStore("chapters").index("moduleId").getAll(IDBKeyRange.only(module.id)));
}
async function getSearchCache(version){
 var db=await dbOpen();
 return request(db.transaction("chapters","readonly").objectStore("chapters").index("moduleId").getAll(IDBKeyRange.only("search-cache:"+version)));
}
async function getSearchCacheChapter(version,book,chapter){
 var db=await dbOpen();
 return request(db.transaction("chapters","readonly").objectStore("chapters").get("search-cache:"+version+"/"+book+"/"+chapter));
}
async function saveSearchCache(version,rows){
 if(!rows.length)return;
 var db=await dbOpen(),tx=db.transaction("chapters","readwrite"),store=tx.objectStore("chapters");
 rows.forEach(function(row){store.put(Object.assign({},row,{moduleId:"search-cache:"+version,key:"search-cache:"+version+"/"+row.book+"/"+row.chapter}));});
 await new Promise(function(resolve,reject){tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error);};tx.onabort=function(){reject(tx.error);};});
}
function getModuleByVersion(version){return modules.find(function(m){return "local:"+m.id===version&&m.type==="bible";});}
async function getChapter(version,book,chapter){await dbOpen();var m=getModuleByVersion(version);if(!m)throw Error("Módulo de Bíblia não instalado neste dispositivo");var key=m.id+"/"+book+"/"+chapter;var db=await dbOpen();var row=await request(db.transaction("chapters","readonly").objectStore("chapters").get(key));if(!row||!row.verses||!row.verses.length)throw Error("Este módulo não contém "+book+" "+chapter);return {verses:row.verses,copyright:"Módulo instalado localmente · "+m.name+" · "+(m.license||"Licença não informada no arquivo")+". Verifique as condições de uso da edição.",version:m.abbreviation||m.name};}


/* Verse labels and opened comments use the same passage and content checks.
   Chapter introductions are available at chapter level, without verse badges. */
function hasCommentaryText(entry){
 return !!simplifyText(entry.text).replace(/&#(?:0*160|x0*a0);/gi,"").replace(/[\s\u200b-\u200d\ufeff]/g,"");
}
function commentaryCovers(e,chapter,verse){
 var first=Number(e.fromChapter)||0,last=Number(e.toChapter)||first,chap=Number(chapter);
 if(first&&chap<first)return false;
 if(last&&chap>last)return false;
 if(!verse)return true;
 var from=Number(e.fromVerse)||0,to=Number(e.toVerse)||0,n=Number(verse);
 if(!Number.isInteger(first)||first<1||!Number.isInteger(last)||last<first||
    !Number.isInteger(from)||from<1||!Number.isInteger(to)||to<0||
    !Number.isInteger(n)||n<1)return false;
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
  function accept(e){if(!hasCommentaryText(e)||!commentaryCovers(e,chap,verse))return false;
   results.push({moduleId:m.id,moduleName:m.name,text:repairModuleText(e.text,m),marker:e.marker,fromChapter:e.fromChapter,fromVerse:e.fromVerse,toChapter:e.toChapter,toVerse:e.toVerse});
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
   if(!hasCommentaryText(e))return false;
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
 var source=String(raw||""),pattern=/<s>\s*([GH]?)\s*([0-9]{1,5})\s*<\/s>/gi,position=0,output="";
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
  var match=matches[i],prefix=canonical.indexOf(book)<39?"H":"G",codes=[(match[1]||prefix).toUpperCase()+Number(match[2])],end=match.index+match[0].length;
  i++;
  while(i<matches.length&&!source.slice(end,matches[i].index).trim()){codes.push((matches[i][1]||prefix).toUpperCase()+Number(matches[i][2]));end=matches[i].index+matches[i][0].length;i++;}
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
  var topics=[topic];
  if(isPortugueseModule(m)){
   var corrected=dictTopic(repairModuleText(topic,m));
   topics.push(corrected,...(typoAliases.get(corrected)||[]));
  }
  var forms=Array.from(new Set(topics.flatMap(function(form){return [form,form.normalize("NFC"),form.normalize("NFD")];})));
  var store=db.transaction("lexicon","readonly").objectStore("lexicon");
  var rows=await Promise.all(forms.map(function(form){return request(store.get(m.id+"/"+form));}));
  var row=rows.find(Boolean);
  return row?{topic:repairModuleText(row.original||row.topic,m),definition:repairModuleText(row.definition,m),moduleId:m.id,moduleName:m.name,license:m.license}:null;
 }));
 return entries.filter(Boolean);
}


async function getPortugueseDictionaryEntries(term){
 var entries=await getDictionaryEntry(term);
 return entries.filter(function(entry){
  var module=modules.find(function(m){return m.id===entry.moduleId;});
  return module&&isPortugueseModule(module);
 });
}
function normalizeStudyWord(value){
 return simplifyText(value).normalize("NFD").replace(/\p{M}/gu,"").toLocaleLowerCase("pt-BR").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,"");
}
async function getOriginalTermsForWord(term){
 var wanted=normalizeStudyWord(term);
 if(!wanted)return [];
 var db=await dbOpen(),bibles=modules.filter(function(m){return m.type==="bible";}),found=new Map();
 function add(code,book,chapter,verse,moduleName){
  code=String(code||"").toUpperCase().replace(/\s+/g,"");
  if(!/^[GH]\d{1,5}$/.test(code))return;
  if(!found.has(code))found.set(code,{code:code,language:code[0]==="G"?"greek":"hebrew",count:0,references:[],translations:[],referenceKeys:new Set()});
  var item=found.get(code);
  if(item.translations.indexOf(moduleName)<0)item.translations.push(moduleName);
  var key=book+"/"+chapter+":"+verse;
  if(!item.referenceKeys.has(key)){item.referenceKeys.add(key);item.count++;}
  if(item.references.length<20&&!item.references.some(function(r){return r.key===key;}))
   item.references.push({key:key,book:book,chapter:Number(chapter),verse:Number(verse),translation:moduleName});
 }
 async function scanModule(module){
  return new Promise(function(resolve,reject){
   var tx=db.transaction("chapters","readonly"),index=tx.objectStore("chapters").index("moduleId");
   var cursor=index.openCursor(IDBKeyRange.only(module.id));
   cursor.onerror=function(){reject(cursor.error||Error("Falha ao consultar Bíblia instalada"));};
   tx.onabort=function(){reject(tx.error||Error("Consulta de Strong interrompida"));};
   cursor.onsuccess=function(){
    var cur=cursor.result;
    if(!cur){resolve();return;}
    var row=cur.value,book=String(row.book||""),chapter=Number(row.chapter)||0;
    (row.verses||[]).forEach(function(verse,i){
     var source=String(typeof verse==="string"?verse:verse.text||verse.content||"");
     if(!/<s>\s*[GH]?\s*\d{1,5}\s*<\/s>/i.test(source))return;
     var matches=Array.from(source.matchAll(/<s>\s*([GH]?)\s*(\d{1,5})\s*<\/s>/gi)),position=0;
     for(var j=0;j<matches.length;){
      var first=matches[j],end=first.index+first[0].length,codes=[(first[1]||"").toUpperCase()+first[2]],k=j+1;
      while(k<matches.length&&!source.slice(end,matches[k].index).trim()){
       codes.push((matches[k][1]||"").toUpperCase()+Number(matches[k][2]));
       end=matches[k].index+matches[k][0].length;k++;
      }
      var prefix=source.slice(position,first.index).replace(/<br\s*\/?>/gi," ");
      var plain=(new DOMParser().parseFromString(prefix,"text/html").body.textContent||"");
      var tokens=Array.from(plain.matchAll(/[\p{L}\p{M}]+(?:[’'-][\p{L}\p{M}]+)*/gu));
      var token=tokens.length?tokens[tokens.length-1][0]:"";
      if(normalizeStudyWord(token)===wanted){
       var verseNo=Number(typeof verse==="string"?i+1:verse.number||verse.verse)||i+1;
       var fallback=canonical.indexOf(book)<39?"H":"G";
       codes.forEach(function(code){add(/^[GH]/.test(code)?code:fallback+code,book,chapter,verseNo,module.name);});
      }
      position=end;j=k;
     }
    });
    cur.continue();
   };
  });
 }
 for(var i=0;i<bibles.length;i++)await scanModule(bibles[i]);
 return Array.from(found.values()).map(function(item){delete item.referenceKeys;return item;}).sort(function(a,b){
  if(a.language!==b.language)return a.language==="greek"?-1:1;
  return a.code.localeCompare(b.code,undefined,{numeric:true});
 });
}
function normalizeCommentarySearch(text){
 return normalizeStudyWord(text).replace(/\s+/g," ");
}
async function searchCommentaries(term,maxResults,shouldContinue,onProgress){
 var wanted=normalizeCommentarySearch(term),limit=Math.max(1,Math.min(200,Number(maxResults)||100));
 var results=[],total=0,scanned=0,modulesSearched=0,seen=new Set(),lastUpdate=0;
 function snapshot(){return {results:results.slice(),total:total,modulesSearched:modulesSearched,scanned:scanned};}
 if(!wanted)return snapshot();
 await ready();
 var chosen=modules.filter(function(m){return m.type==="commentary";}),db=await dbOpen();
 function active(){return typeof shouldContinue!=="function"||shouldContinue();}
 function report(force){
  if(typeof onProgress!=="function"||!active()||(!force&&Date.now()-lastUpdate<200))return;
  lastUpdate=Date.now();onProgress(snapshot());
 }
 function inspect(module,book,entry){
  if(!entry?.text)return;
  var raw=String(entry.text),plain;
  if(!normalizeCommentarySearch(raw).includes(wanted)){
   if(!/[&ÃÂâ]/.test(raw))return;
   plain=simplifyText(repairModuleText(raw,module));
   if(!normalizeCommentarySearch(plain).includes(wanted))return;
  }
  // An indexed record may be repeated for each chapter in its range.
  var key=JSON.stringify([module.id,book,entry.fromChapter,entry.fromVerse,entry.toChapter,entry.toVerse,raw.length,raw.slice(0,120),raw.slice(-80)]);
  if(seen.has(key))return;
  seen.add(key);total++;
  if(results.length>=limit)return;
  results.push({
   moduleId:module.id,moduleName:module.name,book:book,
   fromChapter:Number(entry.fromChapter||entry.chapter||0),
   fromVerse:Number(entry.fromVerse||entry.verse||0),
   toChapter:Number(entry.toChapter||entry.fromChapter||entry.chapter||0),
   toVerse:Number(entry.toVerse||0),text:plain??simplifyText(repairModuleText(raw,module))
  });
 }
 async function scanStore(module,storeName,visitor){
  var prefix=module.id+"/",last=prefix,batchSize=256,count=0;
  while(active()){
   var store=db.transaction(storeName,"readonly").objectStore(storeName);
   var rows=await request(store.getAll(IDBKeyRange.bound(last,prefix+"\uffff",true),batchSize));
   if(!active()||!rows.length)break;
   rows.forEach(function(row){visitor(row);scanned++;});
   count+=rows.length;report();
   if(rows.length<batchSize)break;
   last=rows[rows.length-1].key;
  }
  return count;
 }
 for(var i=0;i<chosen.length&&active();i++){
  var module=chosen[i];
  async function scanIndexed(){return scanStore(module,"commentaryEntries",function(row){inspect(module,row.book,row);});}
  async function scanGrouped(){return scanStore(module,"commentaries",function(row){
   (Array.isArray(row.entries)?row.entries:[]).forEach(function(entry){inspect(module,row.book,entry);});
  });}
  if(module.storage==="entries-v1"){if(!await scanIndexed())await scanGrouped();}
  else if(!await scanGrouped())await scanIndexed();
  modulesSearched++;
  report(true);
 }
 return snapshot();
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
  return {type:type,name:info.description||info.name||filename.replace(/\.((?:commentaries\.)?sqlite3|sqlite|db|bbm)$/i,""),abbreviation:filename.split(".")[0].slice(0,30),language:info.language||"não informada",license:info.license||info.copyright||"não informada",description:info.detailed_info||"",format:"MyBible SQLite3",groups:normalized.groups,count:normalized.count};
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
 var sqlite=entries.filter(function(e){return /\.(sqlite3?|db|bbm|dictionary|commentaries)$/i.test(e.name);});
 if(sqlite.length){
  var all=[];
  for(var e of sqlite){
   var size=e._data&&e._data.uncompressedSize||0;
   if(size>160*1024*1024)throw Error("Este módulo ultrapassa 160 MB. Divida o módulo para importação.");
   importStatus("Preparando "+e.name.split("/").pop()+" ("+Math.ceil(size/1024/1024)+" MB descompactados)…");
   var bin=await e.async("uint8array");
   try{
    if(/\.bbm$/i.test(e.name)&&new TextDecoder("utf-8").decode(bin.slice(0,16))!=="SQLite format 3\u0000")throw Error("BBM dentro do ZIP não é SQLite compatível: "+e.name);
    all.push(await parseSQLite(bin,e.name.split("/").pop()));
   }finally{bin=null;}
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
 if(!first)throw Error("ZIP sem banco de dados reconhecido. Arquivos encontrados: "+entries.slice(0,12).map(function(e){return e.name;}).join(", ")+". Use um módulo SQLite3/DB/BBM compatível ou pacote JSON.");
 return [pickJson(JSON.parse(await first.async("string")),file.name)];
}
async function parseFile(file){
 var name=file.name.toLowerCase();
 if(name.endsWith(".zip")){
  if(file.size>70*1024*1024)throw Error("O ZIP excede 70 MB compactados.");
  return parseZip(file);
 }
 if(/\.(sqlite3?|db|bbm)$/.test(name)){
  if(file.size>160*1024*1024)throw Error("O SQLite excede 160 MB.");
  var bytes=await file.arrayBuffer();
  if(name.endsWith(".bbm")&&new TextDecoder("utf-8").decode(bytes.slice(0,16))!=="SQLite format 3\u0000")throw Error("Este BBM não é um banco SQLite compatível. É necessário identificar e converter o formato antes da instalação.");
  return [await parseSQLite(bytes,file.name)];
 }
 if(name.endsWith(".json")){
  if(file.size>70*1024*1024)throw Error("O arquivo JSON excede 70 MB.");
  return [pickJson(JSON.parse(await file.text()),file.name)];
 }
 throw Error("Formato incompatível. Escolha ZIP, SQLite3, BBM ou JSON.");
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
 for(var file of files){try{if(window.PBDevBridge&&await window.PBDevBridge.isModule(file)){var devotional=await window.PBDevBridge.installFile(file);if(devotional)ok.push(devotional.title+" ("+devotional.entries.length+" devocionais)");continue;}var parsed=await parseFile(file);for(var item of parsed){var meta=await saveModule(item,file.name+(parsed.length>1?"-"+item.abbreviation:""));ok.push(meta.name+" ("+meta.count+" itens)");}}catch(e){problems.push(file.name+": "+(e.message||String(e)));}}
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

/* Púlpito Acervo: catálogo de módulos autorizados, com instalação offline via IndexedDB. */
var pbAcervoItems=[];
async function loadPbAcervo(){
 var target=document.getElementById("pb-acervo-list");
 if(!target)return;
 if(!navigator.onLine){target.textContent="Sem internet. Seus módulos instalados continuam disponíveis offline.";return;}
 target.textContent="Consultando catálogo...";
 try{
  var response=await fetch("https://raw.githubusercontent.com/leonardo120719/mercado-app./pulpito-bible-pwa/pulpito-acervo.json",{cache:"no-store"});
  if(!response.ok){response=await fetch("/pulpito-acervo.json",{cache:"no-store"});}
  if(!response.ok)throw Error("Catálogo indisponível");
  var data=await response.json();
  pbAcervoItems=Array.isArray(data.modules)?data.modules.filter(function(m){return m&&m.name&&m.path&&m.bucket==="pulpito-modulos"&&!/^(?:NVI-TM|NAA-TM)$/i.test(m.name)&&!/\/\s*(?:NVI-TM|NAA-TM)\.zip$/i.test(m.path);}):[];
  if(!pbAcervoItems.length){target.textContent="Nenhum módulo cadastrado. Use Instalar ZIP do dispositivo.";return;}
  target.innerHTML=pbAcervoItems.map(function(m,i){
   var ready=m.distributionAuthorized===true&&!!m.license&&!!m.signedUrl;
   return '<article class="module-comment"><strong>'+clean(m.name)+'</strong><small>'+clean(m.type||"Módulo")+' • '+clean(m.sizeMB?m.sizeMB+" MB":"ZIP")+'</small><p>'+clean(ready?"Download autorizado por tempo limitado":"Arquivo identificado no Supabase. Aguardando autorização de distribuição e link temporário de acesso.")+'</p>'+ (ready?'<button type="button" class="btn" data-pb-acervo-download="'+i+'">↓ Baixar e instalar</button>':'<small>Disponível apenas para instalação manual até a autorização.</small>')+'</article>';
  }).join("");
 }catch(err){target.textContent="Não foi possível consultar o catálogo. Você ainda pode instalar seus próprios arquivos ZIP.";}
}
async function installPbAcervo(index,button){
 var m=pbAcervoItems[index];if(!m||busy)return;
 var rights=document.getElementById("module-rights");
 if(!rights||!rights.checked){notify("Confirme a permissão de uso dos módulos antes de instalar.");return;}
 if(/^(?:NVI-TM|NAA-TM)$/i.test(m.name)||/\/(?:NVI-TM|NAA-TM)\.zip$/i.test(m.path)){notify("Esta tradução não está disponível para distribuição.");return;}
 if(m.distributionAuthorized!==true||!m.license||!m.signedUrl){notify("Download ainda não autorizado.");return;}
 var url;
 try{url=new URL(m.signedUrl);}catch(e){notify("Link temporário inválido.");return;}
 var expectedHost="wblpgmhxdjuztmlozwam.supabase.co";
 var expectedPath="/storage/v1/object/sign/pulpito-modulos/"+m.path.split("/").map(encodeURIComponent).join("/");
 if(url.protocol!=="https:"||url.hostname!==expectedHost||url.pathname!==expectedPath||!url.searchParams.has("token")){notify("Link de acesso não autorizado.");return;}
 if(![".zip",".sqlite3",".sqlite",".db",".bbm",".json"].some(function(ext){return m.path.toLowerCase().endsWith(ext);})){notify("Formato de módulo não suportado.");return;}
 button.disabled=true;button.textContent="Baixando...";
 try{
  var response=await fetch(url.href,{cache:"no-store"});
  if(!response.ok)throw Error("Download indisponível");
  var length=Number(response.headers.get("content-length")||0);
  if(length>70*1024*1024)throw Error("Arquivo excede 70 MB");
  var blob=await response.blob();
  if(blob.size>70*1024*1024)throw Error("Arquivo excede 70 MB");
  var file=new File([blob],m.path.split("/").pop(),{type:blob.type});
  await importFiles([file]);
 }catch(err){notify("Não foi possível instalar: "+err.message);}
 finally{button.disabled=false;button.textContent="↓ Baixar e instalar";}
}
function getUiMarkup(){
 return '<div class="content module-library">'+
 '<div class="eyebrow">PÚLPITO BIBLE / MÓDULOS EXTERNOS</div><h1 class="page-title">Biblioteca de módulos</h1><p class="subtitle">Instale Bíblias, comentários e dicionários Strong armazenados em ZIP ou SQLite3. Os arquivos ficam neste aparelho e os comentários acompanham a passagem escolhida.</p>'+
 '<section class="card card-pad" style="margin:12px 0"><div class="panel-heading"><h2 class="section-heading">✦ Púlpito Acervo — baixar módulos</h2><span class="chip greenish">Downloads autorizados</span></div><p class="feature-note">Catálogo próprio de Bíblias, comentários e dicionários com licença de distribuição. Os módulos baixados ficam neste aparelho e funcionam offline. Para arquivos pessoais, use a instalação ZIP abaixo.</p><div id="pb-acervo-list" aria-live="polite">Carregando catálogo...</div><button class="btn" type="button" id="pb-acervo-refresh">↻ Atualizar catálogo</button></section>'+
 '<div class="grid-2"><section class="card card-pad"><div class="panel-heading"><h2 class="section-heading">Instalar arquivos</h2><span class="chip greenish">Local • sem envio para servidor</span></div>'+
 '<label class="module-upload"><span class="module-upload-icon">⇧</span><strong>Escolher ZIP, SQLite3, BBM ou JSON</strong><span>Importe módulos de Bíblia, comentário e dicionário Strong do MyBible ou Púlpito Bible.</span><input id="module-file" type="file" multiple accept=".zip,.sqlite3,.sqlite,.db,.bbm,.json"></label>'+
 '<label class="module-rights"><input id="module-rights" type="checkbox"> <span>Declaro que tenho permissão de utilizar os arquivos e que não vou redistribuir conteúdo protegido sem autorização.</span></label>'+
 '<p class="feature-note">Aceita ZIP contendo *.SQLite3, arquivos SQLite3 avulsos e ZIP/JSON estruturado para Púlpito Bible. Para o Champlin: ZIP de ~38 MB contendo SQLite3 de 124 MB, agora aceito. Módulos grandes são instalados por capítulo e podem exigir espaço e memória do aparelho. Limite: 70 MB por ZIP e 160 MB por SQLite3.</p>'+
 '<div class="row" style="flex-wrap:wrap;gap:8px;margin:12px 0"><button class="btn primary" id="module-backup" type="button">↓ Fazer backup dos módulos</button><label class="btn" style="cursor:pointer">↑ Restaurar backup<input id="module-restore" type="file" accept=".json,.zip,.sqlite3,.sqlite,.db,application/json" style="display:none"></label></div><p class="feature-note">Proteja seus módulos antes de trocar de endereço, navegador ou aparelho. A restauração acrescenta os registros sem apagar os existentes. No iPhone, salve o backup no app Arquivos ou iCloud Drive.</p><button class="btn" id="module-sample" type="button">↓ Baixar pacote de exemplo</button><p id="module-status" class="module-status" role="status" aria-live="polite">'+clean(lastStatus)+'</p></section>'+
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

function renderPage(){var root=document.getElementById("app-main");if(root)root.innerHTML=getUiMarkup();loadPbAcervo();}
async function downloadSample(){
 if(!window.JSZip){notify("Biblioteca ZIP indisponível");return;}
 var zip=new JSZip();
 zip.file("module.json",JSON.stringify({type:"commentary",name:"Comentário demonstrativo Púlpito Bible",abbreviation:"EX-COM",language:"pt-BR",license:"CC0 – conteúdo demonstrativo",description:"Exemplo de estrutura; não é comentário exegético profissional."},null,2));
 zip.file("comments.json",JSON.stringify([{book:"john",chapter:15,verse:4,text:"Exemplo de anotação: observe o verbo 'permanecer' e leia João 15:1–8 antes de elaborar uma aplicação."},{book:"psalms",chapter:73,verse:3,text:"Exemplo de anotação: observe a tensão entre a prosperidade dos ímpios e a mudança de perspectiva em Salmos 73:17."}],null,2));
 var blob=await zip.generateAsync({type:"blob"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="pulpito-bible-modulo-exemplo.zip";document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},2500);
}
document.addEventListener("change",function(e){if(e.target&&e.target.id==="module-restore"){var f=e.target.files&&e.target.files[0];if(f)restoreModules(f).catch(function(err){notify("Não foi possível restaurar: "+err.message);});e.target.value="";return;}if(e.target&&e.target.id==="module-file"){var files=Array.from(e.target.files||[]);if(files.length)importFiles(files);}});
document.addEventListener("click",function(e){
 var act=e.target&&e.target.closest&&e.target.closest("[data-pb-acervo-download],#pb-acervo-refresh,[data-module-remove],[data-module-activate],#module-sample,#module-backup,#dictionary-search");
 if(!act)return;
 if(act.id==="pb-acervo-refresh"){loadPbAcervo();return;}if(act.hasAttribute("data-pb-acervo-download")){installPbAcervo(Number(act.dataset.pbAcervoDownload),act);return;}
 if(act.id==="module-backup"){backupModules().catch(function(err){notify("Falha no backup: "+err.message);});return;}if(act.id==="module-sample"){downloadSample();return;}if(act.id==="dictionary-search"){searchDictionaryUi();return;}
 if(act.dataset.moduleRemove){removeModule(act.dataset.moduleRemove);return;}
 if(act.dataset.moduleActivate){var m=modules.find(function(x){return x.id===act.dataset.moduleActivate;});if(m){onUpdated("local:"+m.id);notify("Tradução "+m.name+" selecionada.");}return;}
});
window.PBModules={getBibleSearchChapters:getBibleSearchChapters,getSearchCache:getSearchCache,getSearchCacheChapter:getSearchCacheChapter,saveSearchCache:saveSearchCache,ready:ready,getInstalled:installed,renderPage:renderPage,bibleOptions:bibleOptions,getChapter:getChapter,getCommentaries:getCommentaries,getCommentaryCoverage:getCommentaryCoverage,getDictionaryEntry:getDictionaryEntry,getPortugueseDictionaryEntries:getPortugueseDictionaryEntries,getOriginalTermsForWord:getOriginalTermsForWord,searchCommentaries:searchCommentaries,renderVerse:renderVerse,getModuleByVersion:getModuleByVersion,moduleName:moduleName,init:function(config){notify=config.notify||notify;onUpdated=config.onUpdated||onUpdated;return ready();}};
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
      '<select id="version-select" hidden aria-label="Tradução bíblica">'+selectOptions(data.versions,data.version)+'</select>'+
      '<button type="button" class="mtb-select mtb-version" data-toolbar-action="translation" aria-haspopup="dialog" aria-label="Escolher tradução. Toque duas vezes para mostrar ou ocultar os números Strong." title="Um toque: tradução · dois toques: Strong">'+escapeHtml(data.versions.find(v=>v.value===data.version)?.label||data.version)+'</button>'+
      '<select id="book-select" class="mtb-select mtb-book" aria-label="Livro bíblico">'+selectOptions(data.books,data.book)+'</select>'+
      '<select id="chapter-select" class="mtb-select mtb-chapter" aria-label="Capítulo">'+selectOptions(data.chapters,String(data.chapter))+'</select>'+
      item("prev","Capítulo anterior","‹","mtb-compact")+item("next","Próximo capítulo","›","mtb-compact")+
    '</div>';
  }
  function windowsMarkup(){
    const layout=window.PBReaderMultiWindow.getState();
    return '<div class="pb-mw-toolbar"><button type="button" class="mtb-button pb-mw-trigger" data-pbmw="menu" aria-controls="pb-mw-menu" aria-expanded="false" aria-pressed="'+layout.active+'" aria-label="Gerenciar janelas bíblicas" title="Janelas bíblicas"><span class="pb-mw-four-icon" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button>'+
      '<div class="pb-mw-menu" id="pb-mw-menu" role="group" aria-label="Janelas bíblicas" hidden>'+
      [1,2,3,4].map(n=>'<button type="button" data-pbmw-layout="'+n+'" aria-pressed="'+(layout.active&&layout.count===n)+'"><span class="pb-mw-layout-preview" aria-hidden="true">'+ '<i></i>'.repeat(n)+'</span>'+n+(n===1?' janela':' janelas')+'</button>').join("")+
      '<div class="pb-mw-menu-divider"></div><button type="button" data-pbmw-orientation>Posição de 2 janelas <small id="pb-mw-orientation-label">'+(layout.orientation==="horizontal"?"Lado a lado":"Empilhadas")+'</small></button>'+
      (layout.active?'<button type="button" data-pbmw-exit>Voltar ao leitor tradicional</button>':'')+'</div></div>';
  }
  function menuMarkup(s){
    const prefs=[
      ["showNumbers","Numeração dos versículos"],
      ["showStrong","Números Strong"],
      ["showCrossRefs","Referências cruzadas"],
      ["showParallel","Duas Bíblias paralelas"],
      ["continuousText","Texto contínuo"]
    ];
    return '<section class="mtb-menu" role="dialog" aria-label="Configurações de leitura">'+
      '<div class="mtb-menu-head"><strong>Ferramentas e aparência</strong>'+item("menu","Fechar","×","mtb-compact")+'</div>'+
      '<div class="mtb-menu-modes"><button data-toolbar-mode="normal" class="'+(s.readingMode==="normal"?"active":"")+'">Leitura</button><button data-toolbar-mode="study" class="'+(s.readingMode==="study"?"active":"")+'">Estudo</button><button data-toolbar-mode="fullscreen" class="'+(s.readingMode==="fullscreen"?"active":"")+'">Tela cheia</button></div>'+
      '<div class="mtb-menu-grid">'+
        item("search","Pesquisar na Bíblia","🔍")+item("notes","Minhas notas","✎")+
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
      item("compare","Comparar traduções","⇄")+
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
      markup='<div class="mtb-fullscreen">'+item("expand",s.expandFullScreen?"Fechar menu":"Abrir menu","☰","mtb-float")+item("search","Pesquisar na Bíblia","🔍")+windowsMarkup()+
      (s.expandFullScreen?'<div class="mtb-fullmenu">'+item("exit-fullscreen","Sair da tela cheia","↙")+item("study","Modo estudo","α")+item("normal","Leitura normal","◫")+item("menu","Configurações","⚙")+'</div>':'')+'</div>';
    }else{
      markup='<div class="mtb-primary">'+navigationMarkup()+windowsMarkup()+
        '<div class="mtb-actions">'+item("font","Ajustar fonte","Aᴀ")+item("audio",s.audioState==="playing"?"Pausar áudio":s.audioState==="paused"?"Retomar áudio":"Ouvir texto",s.audioState==="playing"?"Ⅱ":"♫")+
        (mode==="study"?item("strong","Dicionário Strong","α")+item("comments","Comentários","▤")+item("notes","Notas pessoais","✎"):"")+item("search","Pesquisar na Bíblia","🔍")+
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
      case "compare":mountConfig.onAction("compare");return;
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
var config=null,initialized=false;
var bibleWordSelector=".pb-mw-bible-verse .pb-linked-word, .pb-mw-bible-verse .strong-word, .pb-mw-bible-verse [data-strong], .reader-scripture .pb-linked-word, .reader-scripture .strong-word, .reader-scripture [data-strong]";
function escapeHtml(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function wrapHtml(html){
 var tags=String(html||"").split(/(<[^>]*>)/g),stack=[];
 function wrapChunk(text){return text.split(/(&(?:#\d+|#x[0-9a-f]+|[a-z]+);)/gi).map(function(fragment){if(/^&(?:#\d+|#x[0-9a-f]+|[a-z]+);$/i.test(fragment))return fragment;return fragment.replace(/[\p{L}\p{M}]+(?:[’'-][\p{L}\p{M}]+)*/gu,function(word){return '<span class="pb-linked-word" data-pb-word="'+escapeHtml(word)+'" role="button" tabindex="0" title="Consultar nos dicionários">'+word+'</span>';});}).join("");}
 return tags.map(function(part){if(part.charAt(0)==="<"){if(/^<\s*\//.test(part)){if(stack.length)stack.pop();return part;}var m=/^<\s*([a-z][\w-]*)/i.exec(part);if(m&&!/\/\s*>$/.test(part)&&!["br","hr","img","input","meta"].includes(m[1].toLowerCase()))stack.push(m[1].toLowerCase()==="button"||m[1].toLowerCase()==="a"||/strong-word|data-pb-word|data-strong/.test(part));return part;}return stack.some(Boolean)?part:wrapChunk(part);}).join("");
}
var FALLBACK_LINK_BOOKS=["Gênesis","Genesis","Gn","Gen","Êxodo","Exodo","Êx","Ex","Levítico","Levitico","Lv","Lev","Números","Numeros","Nm","Num","Deuteronômio","Deuteronomio","Dt","Deut","Josué","Josue","Js","Josh","Juízes","Juizes","Jz","Judges","Rute","Rt","Ruth","1 Samuel","1Sam","1Sm","2 Samuel","2Sam","2Sm","1 Reis","1Rs","2 Reis","2Rs","1 Crônicas","1 Cronicas","1Cr","2 Crônicas","2 Cronicas","2Cr","Esdras","Ed","Ezra","Neemias","Ne","Neh","Ester","Est","Et","Esther","Jó","Job","Salmos","Salmo","Sl","Ps","Provérbios","Proverbios","Pv","Prov","Eclesiastes","Ec","Eccl","Cânticos","Canticos","Cantares","Ct","Song of Solomon","Isaías","Isaias","Is","Isa","Jeremias","Jr","Jer","Lamentações","Lamentacoes","Lm","Lam","Ezequiel","Ez","Ezek","Daniel","Dn","Dan","Oseias","Oséias","Os","Hos","Joel","Jl","Amós","Amos","Am","Obadias","Ob","Jonas","Jn","Jon","Miqueias","Miquéias","Mq","Mic","Naum","Na","Nah","Habacuque","Hc","Hab","Sofonias","Sf","Zep","Ageu","Ag","Hag","Zacarias","Zc","Zech","Malaquias","Ml","Mal","Mateus","Mt","Matt","Marcos","Mc","Mk","Lucas","Lc","Lk","João","Jo","John","Atos","At","Acts","Romanos","Rm","Rom","1 Coríntios","1 Corintios","1Co","2 Coríntios","2 Corintios","2Co","Gálatas","Galatas","Gl","Gal","Efésios","Efesios","Ef","Eph","Filipenses","Fp","Phil","Colossenses","Cl","Col","1 Tessalonicenses","1 Tess","1Ts","2 Tessalonicenses","2 Tess","2Ts","1 Timóteo","1 Timoteo","1Tm","2 Timóteo","2 Timoteo","2Tm","Tito","Tt","Tit","Filemom","Fm","Phm","Hebreus","Hb","Heb","Tiago","Tg","Jas","1 Pedro","1Pe","2 Pedro","2Pe","1 João","1Jo","2 João","2Jo","3 João","3Jo","Judas","Jd","Jude","Apocalipse","Ap","Rev"];
function escapeRegex(value){return String(value).replace(/[.*+?^$()|[\]\\]/g,"\\$&").replace(/\s+/g,"\\s+");}
function highlightText(value,terms,originalScript){
 if(!terms?.length&&!originalScript)return escapeHtml(value);
 var tokens=new Set((terms||[]).map(function(term){return term.normalize("NFC").toLocaleLowerCase("pt-BR");}));
 return value.split(/([\p{L}\p{M}]+(?:[’'-][\p{L}\p{M}]+)*)/gu).map(function(part,index){
  var text=escapeHtml(part);
  if(index%2&&originalScript&&/^[\p{Script=Greek}\p{Script=Hebrew}]/u.test(part))return '<strong class="pb-dict-original" dir="auto">'+text+'</strong>';
  return index%2&&tokens.has(part.normalize("NFC").toLocaleLowerCase("pt-BR"))?'<strong class="pb-comment-keyword">'+text+'</strong>':text;
 }).join("");
}
function referenceButton(label,reference){
 return '<button type="button" class="pb-dict-inline-link pb-bible-reference" data-pb-study-link="reference" data-reference="'+escapeHtml(reference)+'" aria-label="Abrir '+escapeHtml(reference)+' na Bíblia">'+escapeHtml(label)+'</button>';
}
function linkifyText(value,terms,originalScript,context){
 var raw=String(value==null?"":value),aliases=FALLBACK_LINK_BOOKS.concat(config?.getBookAliases()||[]);
 var books=Array.from(new Set(aliases.filter(Boolean))).sort(function(a,b){return b.length-a.length;}).map(escapeRegex).join("|");
 var verseRange="\\d{1,3}(?:[ \\t]*[-–—][ \\t]*(?:\\d{1,3}[:.,][ \\t]*)?\\d{1,3})?";
 var full="(?:"+books+")(?:\\.[ \\t]*|[ \\t]+)\\d{1,3}(?:[:.,][ \\t]*"+verseRange+")?";
 var relative=context?"|((?:vv?\\.[ \\t]*|versículos?[ \\t]+)"+verseRange+")":"";
 var pattern=new RegExp("(?<![\\p{L}\\p{M}\\d])(?:([GH][ \\t]*0*\\d{1,5}[a-z]?)|("+full+")"+relative+")(?![\\p{L}\\p{M}\\d])","giu");
 var out="",cursor=0;
 for(var match of raw.matchAll(pattern)){
  out+=highlightText(raw.slice(cursor,match.index),terms,originalScript);
  if(match[1]){
   var code=match[1].replace(/\s+/g,"").toUpperCase().replace(/^([GH])0+/,"$1");
   out+='<button type="button" class="pb-dict-inline-link" data-pb-study-link="strong" data-strong-code="'+escapeHtml(code)+'" title="Abrir léxico Strong '+escapeHtml(code)+'">'+escapeHtml(code)+'</button>';
  }else{
   var reference=match[2]||(context.name||context.book)+" "+context.chapter+":"+match[3].replace(/^(?:vv?\.|versículos?)\s*/i,"");
   out+=referenceButton(match[0],reference);
  }
  cursor=match.index+match[0].length;
 }
 return out+highlightText(raw.slice(cursor),terms,originalScript);
}
function clearWordTextSelection(){
 try{var selection=global.getSelection();if(selection)selection.removeAllRanges();}catch(_){}
}
function activateBibleLink(node){
 var verseNode=node.closest(".reader-scripture [data-verse], .pb-mw-bible-verse[data-verse]"),verse=verseNode?Number(verseNode.dataset.verse):0;
 var wordNode=node;
 while(wordNode&&wordNode.matches(".strong-badge"))wordNode=wordNode.previousElementSibling;
 if(!wordNode||!wordNode.matches(".pb-linked-word, .strong-word"))wordNode=null;
 var codes=(wordNode&&(wordNode.dataset.pbStrongList||wordNode.dataset.pbStrong||wordNode.dataset.strong))||node.dataset.strong||"";
 clearWordTextSelection();
 if(wordNode)config.onWord(wordNode.dataset.pbWord||wordNode.textContent,verse,codes.split(","),node);
 else if(codes)config.onStrong(codes,verse,node);
}
function activateStudyLink(node){
 if(node.dataset.pbStudyLink==="reference")config.onStudyReference(node.dataset.reference||"");
 else if(node.dataset.pbStudyLink==="strong")config.onStrong(node.dataset.strongCode||"",0,node);
}
function init(opts){
 config=opts||{};if(initialized)return;initialized=true;
 /* Preserva a seleção longa e o duplo toque nos indicadores de comentário. */
 var pbTouchTap=null,pbTouchStart=null,pbHoldTimer=null;
 function cancelPbHold(){if(pbHoldTimer){clearTimeout(pbHoldTimer);pbHoldTimer=null;}}
 document.addEventListener("touchstart",function(e){
  if(e.touches.length!==1||!e.target.closest||!e.target.closest("#chapter-body"))return;
  var t=e.touches[0];
  cancelPbHold();
  pbTouchStart={x:t.clientX,y:t.clientY,at:Date.now(),target:e.target,held:false};
  var verse=e.target.closest("#chapter-body .verse-line");
  if(verse&&!e.target.closest("input[data-pb-verse-check], #chapter-body .verse-num, #chapter-body [data-comment-indicator]"))pbHoldTimer=setTimeout(function(){if(!pbTouchStart)return;pbTouchStart.held=true;pbTouchTap=null;window.__pbLongPressAt=Date.now();window.__pbMultiSelectMode=true;if(window.PBVerseComments)window.PBVerseComments.selectLongVerse(Number(verse.dataset.verse));},560);
 },{capture:true,passive:false});
 document.addEventListener("touchmove",function(e){
  if(!pbTouchStart||!e.touches.length)return;
  var t=e.touches[0];
  if(Math.abs(t.clientX-pbTouchStart.x)>12||Math.abs(t.clientY-pbTouchStart.y)>12 ){cancelPbHold();pbTouchStart=null;pbTouchTap=null;}
 },{capture:true,passive:true});
 document.addEventListener("touchend",function(e){
  var start=pbTouchStart;pbTouchStart=null;cancelPbHold();
  if(!start||start.held||!e.changedTouches.length)return;
  var touch=e.changedTouches[0];
  window.__pbSelectionTouchAt=Date.now();
  if(Date.now()-start.at>320||Math.abs(touch.clientX-start.x)>10||Math.abs(touch.clientY-start.y)>10)return;
  var now=Date.now();
  if(now-start.at>450){pbTouchTap=null;return;}
  var target=start.target;
  /* Android/iOS: a seleção múltipla não depende do evento click,
     que pode ser suprimido por gestos nativos ou pelo leitor. */
  var verse=target.closest("#chapter-body .verse-line");
  if(target.closest("input[data-pb-verse-check]"))return;
  if(target.closest("#chapter-body .verse-num, #chapter-body .strong-badge, #chapter-body button[data-strong]"))return;
  /* Toque curto nunca altera seleção; apenas caixas de seleção podem fazê-lo. */
  if(verse&&!target.closest(".verse-num, [data-comment-indicator], .strong-badge, .strong-word, .pb-linked-word, [data-strong]")){pbTouchTap=null;return;}
  var comment=target.closest("#chapter-body [data-comment-indicator]");
  if(!comment){pbTouchTap=null;return;}
  if(pbTouchTap&&pbTouchTap.key===comment&&now-pbTouchTap.at<550){
   pbTouchTap=null;
   comment.dispatchEvent(new MouseEvent("dblclick",{bubbles:true,cancelable:true}));
  }else pbTouchTap={key:comment,at:now};
 },{capture:true,passive:true});
 document.addEventListener("touchcancel",function(){cancelPbHold();pbTouchStart=null;pbTouchTap=null;},{capture:true,passive:true});
 document.addEventListener("click",function(e){
  var studyLink=e.target.closest("[data-pb-study-link]");if(studyLink){e.preventDefault();e.stopImmediatePropagation();activateStudyLink(studyLink);return;}
  var bibleLink=e.target.closest(bibleWordSelector);
  if(!bibleLink)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(Date.now()-(global.__pbLongPressAt||0)>700)activateBibleLink(bibleLink);
 },true);
 document.addEventListener("keydown",function(e){
  if(e.key!=="Enter"&&e.key!==" ")return;
  var studyLink=e.target.closest?.("[data-pb-study-link]");
  var bibleLink=e.target.closest?.(bibleWordSelector);
  if(!studyLink&&!bibleLink)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(studyLink)activateStudyLink(studyLink);
  else activateBibleLink(bibleLink);
 },true);
}
global.PBConnections={init:init,wrapHtml:wrapHtml,linkifyText:linkifyText,referenceButton:referenceButton};
})(window);

;


;
(function(global){
"use strict";
/* Dictionary study in the lower reader pane. Module data stays in IndexedDB. */
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
function refLabel(){if(!session)return "";var c=session.query?.reference||session.config.readReference();return (c.name||c.book)+" "+c.chapter+(c.verse?":"+c.verse:"");}
function normalizeTerm(text){return String(text||"").trim().replace(/^[.,:;!?]+|[.,:;!?]+$/g,"").slice(0,120);}
function linkText(value,originalScript){return global.PBConnections.linkifyText(value,[],originalScript);}
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
 if(name)name.textContent=m?(m.abbreviation||m.name):"Escolher módulo";
 if(title)title.textContent=normalizeTerm(session.term)||"Selecione uma palavra";
 if(ref)ref.textContent=refLabel();if(refTop)refTop.textContent=refLabel();
}
function strongCode(value){return value.toUpperCase().replace(/^([GH])\s*0*(\d{1,5})[A-Z]?$/,"$1$2");}
function normalizeQuery(input){
 var query=typeof input==="string"?{term:input}:input||{};
 var term=normalizeTerm(query.term),isCode=/^[GH]\d{1,5}$/.test(strongCode(term));
 var codes=isCode?[term]:Array.isArray(query.codes)?query.codes:[];
 return {term:term,word:isCode?"":term,codes:Array.from(new Set(codes.map(function(value){return String(value).toUpperCase().trim().replace(/\s+/g,"");}).filter(function(value){
  return /^[GH]\d{1,5}$/.test(strongCode(value));
 }))),reference:query.reference||session.config.readReference()};
}
function renderEntries(entries,originalScript){
 return entries.map(function(entry){
  return '<article class="pb-dict-entry"><div class="pb-dict-entry-title"><strong>'+linkText(entry.topic)+'</strong></div>'+
   '<div class="pb-dict-definition">'+linkText(entry.definition,originalScript)+'</div></article>';
 }).join("");
}
function renderModuleCards(query,byKey,selected){
 var modules=dictionaryModules().slice().sort(function(a,b){
  return Number(b.id===selected?.id)-Number(a.id===selected?.id);
 });
 var cards=[];
 modules.forEach(function(module){
  var sections=[];
  if(query.word){
   var normal=byKey.get(query.word);
   if(normal&&normal.status==="fulfilled"){
    var found=normal.value.find(function(entry){return entry.moduleId===module.id;});
    if(found)sections.push('<section class="pb-dict-module-section"><h4>Português · '+linkText(found.topic)+'</h4>'+renderEntries([found],false)+'</section>');
   }
  }
  query.codes.forEach(function(rawCode){
   var code=strongCode(rawCode),result=byKey.get(code);
   if(result&&result.status==="fulfilled"){
    var found=result.value.find(function(entry){return entry.moduleId===module.id;});
    if(found)sections.push('<section class="pb-dict-module-section"><h4>Strong · '+esc(code)+'</h4>'+renderEntries([found],true)+'</section>');
   }
  });
  if(!sections.length)return;
  var meta=[module.abbreviation,module.license].filter(Boolean).join(" · ");
  cards.push('<article class="pb-dict-module-card'+(selected&&module.id===selected.id?' is-selected':'')+'">'+
   '<header class="pb-dict-module-card-header"><div><span class="pb-dict-module-kicker">DICIONÁRIO INSTALADO</span><h3>'+esc(module.name)+'</h3>'+
   (meta?'<p>'+esc(meta)+'</p>':'')+'</div>'+(selected&&module.id===selected.id?'<span class="pb-dict-module-current">Selecionado</span>':'')+'</header>'+
   '<div class="pb-dict-module-card-content">'+sections.join("")+'</div></article>');
 });
 return cards.join("");
}
function lookup(input,opts){
 if(!session||!session.root.isConnected)return;
 var query=normalizeQuery(input),target=session.root.querySelector("#pb-dictionary-definition");
 if(!query.term||!target)return;
 var previous=session.history[session.index];
 if(!opts?.noHistory&&JSON.stringify(previous)!==JSON.stringify(query)){
  session.history=session.history.slice(0,session.index+1);
  session.history.push(query);
  if(session.history.length>40)session.history.shift();
  session.index=session.history.length-1;
 }
 session.query=query;
 session.term=query.term;
 session.config.onQueryChange(query);
 labels();
 var serial=++requestSerial,selected=selectedModule();
 var heading=query.word?'<p class="pb-dict-queried-word">Palavra pesquisada <strong>'+esc(query.word)+'</strong></p>':"";
 var codes=Array.from(new Set(query.codes.map(strongCode))),keys=query.word?[query.word].concat(codes):codes;
 target.innerHTML=heading+'<div class="pb-dict-loading">Consultando cada dicionário separadamente…</div>';
 Promise.allSettled(keys.map(function(key){return global.PBModules.getDictionaryEntry(key);})).then(function(results){
  if(!session||serial!==requestSerial||!session.root.isConnected)return;
  var byKey=new Map(keys.map(function(key,i){return [key,results[i]];}));
  var failures=results.filter(function(result){return result.status==="rejected";}).length;
  var strongInfo=codes.map(function(code){
   var id=query.codes.find(function(value){return strongCode(value)===code;});
   return '<article class="pb-dict-strong-reference"><h3>Referência Strong · '+esc(code)+'</h3>'+session.config.renderStrong(id,query.reference)+'</article>';
  }).join("");
  var cards=renderModuleCards({word:query.word,codes:codes},byKey,selected);
  var errors=failures?'<p class="pb-dict-error">'+failures+' consulta(s) não puderam ser concluídas.</p>':"";
  var empty=!cards?'<div class="pb-dict-empty"><strong>Nenhum verbete correspondente foi encontrado.</strong><p>Os dicionários instalados foram consultados individualmente. Você pode escolher outro módulo no seletor acima ou instalar um novo dicionário.</p></div>':"";
  target.innerHTML=heading+strongInfo+cards+errors+empty+(!dictionaryModules().length?
   '<button class="btn slim primary" data-page="modulos">⇩ Instalar dicionários</button>':"");
  var scroll=session.root.querySelector("#pb-dictionary-scroll");
  if(scroll){scroll.scrollTop=Number(session.config.readRestoreScroll())||0;session.config.onRestoreScroll();}
 });
}
function changeModule(id){
 if(!session||!dictionaryModules().some(function(m){return m.id===id;}))return;
 session.config.onModuleChange(id);picker(false);labels();
 if(session.query)lookup(session.query,{noHistory:true});
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
 case "bible-search":session.config.onSearch();break;
 case "comments":if(session.config.onComments)session.config.onComments();break;
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
  '<strong class="pb-split-ref" id="pb-dictionary-ref-top"></strong><button type="button" class="pb-dict-switch-comments" data-pbdict="comments" aria-label="Abrir comentários" title="Mostrar comentários">▤ <span>Comentários</span></button><div class="pb-dictionary-nav pb-split-toolbar-actions"><button data-pbdict="bible-search" type="button" aria-label="Pesquisar na Bíblia" title="Pesquisar na Bíblia">🔍</button><button data-pbdict="back" aria-label="Verbete anterior" title="Voltar">‹</button><button data-pbdict="forward" aria-label="Próximo verbete" title="Avançar">›</button>'+
   '<button data-pbdict="prev-module" aria-label="Dicionário anterior" title="Dicionário anterior">⇤</button><button data-pbdict="next-module" aria-label="Próximo dicionário" title="Próximo dicionário">⇥</button>'+
   '<button data-pbdict="close" aria-label="Fechar dicionário" title="Fechar dicionário">×</button></div></header>'+
  '<div class="pb-dictionary-picker pb-split-picker" id="pb-dictionary-picker" hidden><div class="pb-dict-picker-heading"><strong>Dicionários instalados</strong><span>'+dictionaryModules().length+' módulo(s)</span></div>'+
   '<input type="search" id="pb-dictionary-module-filter" placeholder="Buscar módulo…" aria-label="Buscar módulo de dicionário">'+
   '<div class="pb-dictionary-choices pb-split-choices" id="pb-dictionary-choices"></div><button class="pb-dict-install" data-page="modulos" type="button">⇩ Instalar novo dicionário</button></div>'+
  '<div class="pb-dictionary-search-row"><input id="pb-dictionary-search" type="search" placeholder="Palavra, nome ou Strong G/H" aria-label="Pesquisar verbete">'+
   '<button type="button" data-pbdict="search" aria-label="Pesquisar">⌕</button></div>'+
  '<div id="pb-dictionary-scroll" class="pb-dictionary-scroll pb-split-scroll"><div class="pb-dictionary-heading pb-split-heading"><strong id="pb-dictionary-title">Dicionário</strong><small id="pb-dictionary-reference"></small></div>'+
   '<div id="pb-dictionary-definition"><div class="pb-dict-empty">Toque numa palavra da Bíblia ou pesquise um verbete para abrir o significado aqui.</div></div></div>'+
  '<footer class="pb-dictionary-footer"><button data-pbdict="copy" type="button">▣ Copiar</button></footer>';
 host.appendChild(panel);
 
 session={root:panel,host:host,config:config,term:"",history:[],index:-1};
 panel.addEventListener("click",handleClick);
 panel.addEventListener("keydown",handleKey);
 var moduleFilter=panel.querySelector("#pb-dictionary-module-filter");
 if(moduleFilter)moduleFilter.addEventListener("input",function(e){var list=panel.querySelector("#pb-dictionary-choices");if(list)list.innerHTML=choices(e.target.value);});
 labels();
 var query=config.readQuery();
 if(query)lookup(query);else{
  var title=panel.querySelector("#pb-dictionary-title");if(title)title.textContent="Toque numa palavra";
  var target=panel.querySelector("#pb-dictionary-definition"),installed=dictionaryModules();
  if(target)target.innerHTML=installed.length?'<div class="pb-dict-empty"><strong>'+installed.length+' dicionário(s) instalado(s)</strong><p>Escolha um dicionário pelo nome acima e pesquise uma palavra para ver seus verbetes.</p><p>'+installed.map(function(m){return esc(m.name)+" ("+Number(m.count||0)+" verbetes)";}).join(" · ")+'</p></div>':'<div class="pb-dict-empty"><strong>Nenhum dicionário instalado neste dispositivo.</strong><p>Baixar um ZIP não significa instalá-lo. Abra Módulos, importe o arquivo e confirme a mensagem de instalação.</p><button class="btn slim primary" data-page="modulos">⇩ Abrir módulos</button></div>';
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
/* Púlpito Bible — verse-specific comment indicators and long-press selection.
   One delegated set of handlers, one IndexedDB scan per chapter, no scroll
   listeners. Word/Strong buttons keep their own short-tap behavior. */
var opts={},started=false,generation=0,reference=null,coverage=Object.create(null);
var press=null,holdTimer=null,holdHandledUntil=0,lastTap=null,lastOpened={verse:0,moduleId:"",at:0};
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
function invalidate(){
 ++generation;reference=null;coverage=Object.create(null);lastTap=null;lastOpened={verse:0,moduleId:"",at:0};
 if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}
 press=null;
}
function decorate(book,chapter,verses){
 var gen=++generation;
 var valid=(verses||[]).map(Number).filter(function(n){return Number.isInteger(n)&&n>0;});
 reference={book:book,chapter:Number(chapter)};
 coverage=Object.create(null);
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
   if(labels.childNodes.length&&line.parentNode)line.insertAdjacentElement("afterend",labels);
  });
 }).catch(function(err){
  if(gen===generation&&global.console&&console.warn)console.warn("Indicadores de comentários indisponíveis",err);
 });
}
function chooseForVerse(verse,moduleId,anchor){
 var n=Number(verse),matches=candidates(n);
 var chosen=matches.find(function(m){return m.moduleId===moduleId;});
 if(!chosen)chosen=matches.find(function(m){return m.moduleId===opts.readPreferredModule();})||matches[0];
 if(!chosen)return;
 lastOpened={verse:n,moduleId:chosen.moduleId,at:Date.now()};
 if(opts.openCommentary)opts.openCommentary(n,chosen.moduleId,anchor);
}
function stopPress(){if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}press=null;}
function onPointerDown(e){
 var marker=indicatorElement(e.target),verse=verseElement(e.target);
 if(marker||!verse||e.button!==0||e.pointerType==="touch"){stopPress();return;}
 stopPress();
 press={verse:Number(verse.dataset.verse),node:verse,x:e.clientX,y:e.clientY,pointerId:e.pointerId};
 holdTimer=setTimeout(function(){
  if(!press)return;
  var old=press;press=null;holdTimer=null;
  holdHandledUntil=Date.now()+900;
  window.__pbMultiSelectMode=true;
  window.__pbLongPressAt=Date.now();
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
 if(!verse||indicatorElement(e.target)||e.target.closest("input[data-pb-verse-check]"))return;
 e.preventDefault();
 if(Date.now()-(window.__pbLongPressAt||0)<1200)return;
 stopPress();holdHandledUntil=Date.now()+900;
 window.__pbMultiSelectMode=true;
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
 /* Clique no texto sempre bloqueado; seleção adicional somente pelas caixas. */
 var tappedVerse=verseElement(e.target);
 if(tappedVerse&&!e.target.closest(".pb-linked-word, .strong-word, [data-strong]")){e.preventDefault();e.stopImmediatePropagation();return;}
}
function onDoubleClick(e){
 var badge=indicatorElement(e.target);
 if(!badge)return;
 e.preventDefault();e.stopImmediatePropagation();
 var n=Number(badge.dataset.commentIndicator),moduleId=badge.dataset.commentModule||"",now=Date.now();
 if(lastOpened.verse!==n||lastOpened.moduleId!==moduleId||now-lastOpened.at>700)chooseForVerse(n,moduleId,badge);
}
function onKeydown(e){
 if(e.key==="Escape"){stopPress();return;}
 var badge=indicatorElement(e.target);
 if(!badge||(e.key!=="Enter"&&e.key!==" "))return;
 e.preventDefault();e.stopImmediatePropagation();
 chooseForVerse(badge.dataset.commentIndicator,badge.dataset.commentModule,badge);
}
function init(config){
 opts=config||{};
 if(started)return;
 started=true;
 /* Bloqueia seleção nativa do Safari sem interferir na seleção contextual própria. */
 document.addEventListener("selectstart",function(e){
  if(e.target&&e.target.closest&&e.target.closest("#chapter-body"))e.preventDefault();
 },true);
 document.addEventListener("selectionchange",function(){
  var sel=window.getSelection&&window.getSelection();
  if(!sel||sel.isCollapsed||!sel.rangeCount)return;
  var anchor=sel.anchorNode&&sel.anchorNode.nodeType===1?sel.anchorNode:sel.anchorNode&&sel.anchorNode.parentElement;
  var focus=sel.focusNode&&sel.focusNode.nodeType===1?sel.focusNode:sel.focusNode&&sel.focusNode.parentElement;
  if((anchor&&anchor.closest&&anchor.closest("#chapter-body"))||(focus&&focus.closest&&focus.closest("#chapter-body")))sel.removeAllRanges();
 });
 document.addEventListener("pointerdown",onPointerDown,true);
 document.addEventListener("pointermove",onPointerMove,true);
 document.addEventListener("pointerup",onPointerEnd,true);
 document.addEventListener("pointercancel",onPointerEnd,true);
 document.addEventListener("contextmenu",onContextMenu,true);
 document.addEventListener("click",onClick,true);
 document.addEventListener("dblclick",onDoubleClick,true);
 document.addEventListener("keydown",onKeydown,true);
}
global.PBVerseComments={init:init,decorate:decorate,invalidate:invalidate,selectLongVerse:function(n){holdHandledUntil=Date.now()+900;if(opts.selectVerse)opts.selectVerse(n);}};
})(window);

;
(function(){
"use strict";
var API="https://api.midvash.com/v1";
var MAIN=document.getElementById("app-main");
var TITLES={leitura:"Leitura bíblica",original:"Texto original & Strong",tutor:"Assistente de interpretação",exercicios:"Exercícios de exegese",sermao:"Sermões",historico:"Diário de Estudo Histórico",pesquisa:"Pesquisa inteligente",mapa:"Mapa inteligente da Bíblia",voz:"Assistente bíblico por voz",instrutor:"Instrutor profissional de sermões",planos:"Planos de leitura",devocional:"Leitor de devocionais",paineis:"Janelas sincronizadas",caderno:"Meu caderno",modulos:"Módulos e traduções",mercado:"Análise das Bíblias",projeto:"Recursos e evolução"};
var STORE_KEY="pulpito-bible-v1";
var booksFallback="Gênesis|genesis|50;Êxodo|exodus|40;Levítico|leviticus|27;Números|numbers|36;Deuteronômio|deuteronomy|34;Josué|joshua|24;Juízes|judges|21;Rute|ruth|4;1 Samuel|1-samuel|31;2 Samuel|2-samuel|24;1 Reis|1-kings|22;2 Reis|2-kings|25;1 Crônicas|1-chronicles|29;2 Crônicas|2-chronicles|36;Esdras|ezra|10;Neemias|nehemiah|13;Ester|esther|10;Jó|job|42;Salmos|psalms|150;Provérbios|proverbs|31;Eclesiastes|ecclesiastes|12;Cânticos|song-of-solomon|8;Isaías|isaiah|66;Jeremias|jeremiah|52;Lamentações|lamentations|5;Ezequiel|ezekiel|48;Daniel|daniel|12;Oseias|hosea|14;Joel|joel|3;Amós|amos|9;Obadias|obadiah|1;Jonas|jonah|4;Miqueias|micah|7;Naum|nahum|3;Habacuque|habakkuk|3;Sofonias|zephaniah|3;Ageu|haggai|2;Zacarias|zechariah|14;Malaquias|malachi|4;Mateus|matthew|28;Marcos|mark|16;Lucas|luke|24;João|john|21;Atos|acts|28;Romanos|romans|16;1 Coríntios|1-corinthians|16;2 Coríntios|2-corinthians|13;Gálatas|galatians|6;Efésios|ephesians|6;Filipenses|philippians|4;Colossenses|colossians|4;1 Tessalonicenses|1-thessalonians|5;2 Tessalonicenses|2-thessalonians|3;1 Timóteo|1-timothy|6;2 Timóteo|2-timothy|4;Tito|titus|3;Filemom|philemon|1;Hebreus|hebrews|13;Tiago|james|5;1 Pedro|1-peter|5;2 Pedro|2-peter|3;1 João|1-john|5;2 João|2-john|1;3 João|3-john|1;Judas|jude|1;Apocalipse|revelation|22".split(";").map(function(s,i){var p=s.split("|");return {name:p[0],slug:p[1],chapters:+p[2],testament:i<39?"old":"new"};});
var defaults={dictionaryOpen:false,dictionaryModuleId:"",dictionaryTerm:"",splitStudy:true,splitPct:56,commentModuleId:"",page:"leitura",book:"john",chapter:15,version:"alm1911",selectedVerse:4,theme:"light",fontSize:18,showStrong:true,showComments:false,showCrossRefs:false,showParallel:false,readerMode:"continuous",readerTheme:"sepia",focusMode:false,bookmarks:[],notes:[],studies:{},tutorStep:0,sermon:{title:"",reference:"",introduction:"",context:"",point1:"",point2:"",application:"",conclusion:""},exerciseAnswers:{},historicalDiary:{},history:[],parallelVersion:"bpm"};
var saved={};try{saved=JSON.parse(localStorage.getItem(STORE_KEY)||"{}");}catch(e){}
var state=Object.assign({},defaults,saved);
state.sermon=Object.assign({},defaults.sermon,state.sermon||{});
if(state.page==="biblioteca-sermoes")state.page="sermao";
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
var latestChapter=null,loadSeq=0,searchMessage="",toastTimer=null,pendingCommentScroll=0,pendingDictionaryScroll=0;

var focusCommentVerse=0,linkedPassage=null,pendingBibleScroll=null;
var referenceHistory=[];
var BOOK_LINK_ALIASES={};
booksFallback.forEach(function(b){BOOK_LINK_ALIASES[b.name.toLocaleLowerCase("pt-BR")]=b.slug;BOOK_LINK_ALIASES[b.slug.replace(/-/g," ")]=b.slug;});
booksFallback.forEach(function(b){var normalized=b.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();BOOK_LINK_ALIASES[normalized]=b.slug;});
Object.assign(BOOK_LINK_ALIASES,{"gn":"genesis","gen":"genesis","ex":"exodus","êx":"exodus","lv":"leviticus","lev":"leviticus","nm":"numbers","num":"numbers","dt":"deuteronomy","deut":"deuteronomy","js":"joshua","jz":"judges","rt":"ruth","1sm":"1-samuel","2sm":"2-samuel","1rs":"1-kings","2rs":"2-kings","1cr":"1-chronicles","2cr":"2-chronicles","ed":"ezra","ne":"nehemiah","et":"esther","jó":"job","sl":"psalms","ps":"psalms","pv":"proverbs","ec":"ecclesiastes","ct":"song-of-solomon","is":"isaiah","jr":"jeremiah","lm":"lamentations","ez":"ezekiel","dn":"daniel","os":"hosea","jl":"joel","am":"amos","ob":"obadiah","jn":"jonah","mq":"micah","na":"nahum","hc":"habakkuk","sf":"zephaniah","ag":"haggai","zc":"zechariah","ml":"malachi","mt":"matthew","matt":"matthew","mc":"mark","mk":"mark","lc":"luke","lk":"luke","jo":"john","at":"acts","rm":"romans","rom":"romans","1co":"1-corinthians","2co":"2-corinthians","gl":"galatians","ef":"ephesians","fp":"philippians","cl":"colossians","1ts":"1-thessalonians","2ts":"2-thessalonians","1tm":"1-timothy","2tm":"2-timothy","tt":"titus","fm":"philemon","hb":"hebrews","tg":"james","1pe":"1-peter","2pe":"2-peter","1jo":"1-john","2jo":"2-john","3jo":"3-john","jd":"jude","ap":"revelation","rev":"revelation","genesis":"genesis","exodus":"exodus","john":"john","psalms":"psalms","1 cor":"1-corinthians","2 cor":"2-corinthians","1 joão":"1-john","2 joão":"2-john","3 joão":"3-john","1 pedro":"1-peter","2 pedro":"2-peter"});
var BOOK_ENGLISH_NAMES="Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation".split("|");
BOOK_ENGLISH_NAMES.forEach(function(name,i){BOOK_LINK_ALIASES[name.toLowerCase()]=booksFallback[i].slug;});
Object.assign(BOOK_LINK_ALIASES,{"gen":"genesis","lev":"leviticus","num":"numbers","deut":"deuteronomy","josh":"joshua","judg":"judges","1sam":"1-samuel","2sam":"2-samuel","1kgs":"1-kings","2kgs":"2-kings","1chr":"1-chronicles","2chr":"2-chronicles","neh":"nehemiah","est":"esther","ps":"psalms","prov":"proverbs","eccl":"ecclesiastes","song":"song-of-solomon","isa":"isaiah","jer":"jeremiah","lam":"lamentations","ezek":"ezekiel","dan":"daniel","hos":"hosea","obad":"obadiah","jon":"jonah","mic":"micah","nah":"nahum","hab":"habakkuk","zeph":"zephaniah","hag":"haggai","zech":"zechariah","mal":"malachi","matt":"matthew","mk":"mark","lk":"luke","acts":"acts","rom":"romans","1cor":"1-corinthians","2cor":"2-corinthians","gal":"galatians","eph":"ephesians","phil":"philippians","col":"colossians","1thess":"1-thessalonians","2thess":"2-thessalonians","1tim":"1-timothy","2tim":"2-timothy","tit":"titus","philem":"philemon","heb":"hebrews","james":"james","1pet":"1-peter","2pet":"2-peter","1john":"1-john","2john":"2-john","3john":"3-john","jude":"jude","rev":"revelation"});
window.PBVerseComments.init({
 readPreferredModule:function(){return state.commentModuleId||"";},
 selectVerse:function(verse){
  var n=Number(verse)||0;if(!n)return;
  state.selectedVerse=n;
  if(window.PBReaderMultiWindow)window.PBReaderMultiWindow.referenceChanged();
  var id=verseGlobalId(n);
  TS.actions.toggleVerse(id);
  persist();
  refreshVerseDecorations();
  var label=document.getElementById("selected-reference");if(label)label.textContent=ref();
  window.PBSplitStudy.refresh();
  window.PBDictionaryStudy.syncReference();
 },
 openCommentary:showCommentaryPanel
});


window.PBConnections.init({
 getBookAliases:function(){return Object.keys(BOOK_LINK_ALIASES);},
 onWord:openDictionaryTerm,
 onStrong:openStrongEntry,
 onStudyReference:openLinkedReference

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
var studyActivityKey="pulpito-bible-study-activity-v1";
function studyActivity(){
 try{return JSON.parse(localStorage.getItem(studyActivityKey)||"[]")||[];}catch(e){return [];}
}
function trackStudyActivity(type,label,detail,extra){
 try{
  var rows=studyActivity(),now=new Date().toISOString();
  var entry={at:now,type:type,label:String(label||"").slice(0,220),detail:String(detail||"").slice(0,500),book:state.book,chapter:state.chapter,verse:state.selectedVerse||0,version:state.version,extra:extra||null};
  var last=rows[0];
  if(last&&last.type===entry.type&&last.label===entry.label&&last.book===entry.book&&last.chapter===entry.chapter&&Date.now()-Date.parse(last.at)<120000)return;
  rows.unshift(entry);localStorage.setItem(studyActivityKey,JSON.stringify(rows.slice(0,1200)));
 }catch(e){}
}
function renderStudyActivity(){
 var query=(historicalFilters.term||"").toLocaleLowerCase("pt-BR");
 var rows=studyActivity().filter(function(r){
  var book=books.find(function(b){return b.slug===r.book;})||booksFallback.find(function(b){return b.slug===r.book;});
  var text=[r.label,r.detail,r.type,r.chapter,book&&book.name].join(" ").toLocaleLowerCase("pt-BR");
  return (!query||text.includes(query))&&(!historicalFilters.book||historicalFilters.book===r.book);
 });
 var now=Date.now(),weekly=rows.filter(function(r){return now-Date.parse(r.at)<7*86400000;});
 return '<section class="card card-pad" style="margin-top:16px"><h2 class="section-heading">Meu histórico automático de estudos</h2><p class="subtitle">Últimos 7 dias: '+weekly.length+' acessos registrados. Pesquise acima para localizar leituras e pesquisas anteriores.</p>'+
 (rows.length?rows.slice(0,120).map(function(r,i){var d=new Date(r.at),book=books.find(function(b){return b.slug===r.book;})||booksFallback.find(function(b){return b.slug===r.book;});return '<button type="button" class="btn" style="display:block;width:100%;text-align:left;margin:8px 0;white-space:normal" data-study-activity="'+i+'"><strong>'+esc(r.label)+'</strong><small style="display:block">'+esc(d.toLocaleString("pt-BR"))+' · '+esc(r.type)+' · '+esc((book&&book.name||r.book)+" "+r.chapter+(r.verse?":"+r.verse:""))+'</small></button>';}).join(""):'<p class="subtitle">O histórico começa a ser registrado a partir desta versão.</p>')+'</section>';
}
function page(s){if(state.page==="pesquisa"&&s!=="pesquisa")pb2CloseSearchReader();clearTimeout(translationTapTimer);translationLastTap=0;if(s!=="leitura")window.PBVerseComments.invalidate();if(s!=="leitura"){TS.actions.clearSelection();TS.unmount();}state.page=s;persist();closeTopMenu();render();window.scrollTo({top:0,behavior:"instant"});}
function cacheKey(){return state.version+"/"+state.book+"/"+state.chapter;}
function currentNote(){return (state.notes||[]).find(function(n){return n.ref===ref();});}
function currentMarked(){return (state.bookmarks||[]).includes(ref());}
document.addEventListener("pb-crossref-navigate",function(event){
 var d=event.detail||{};
 if(d.book&&Number.isInteger(d.chapter)&&Number.isInteger(d.verse))setRef(d.book,d.chapter,d.verse);
});
function setRef(book,ch,verse,passage){linkedPassage=passage||null;window.PBVerseComments.invalidate();TS.actions.clearSelection();stopAudio();state.book=book;state.chapter=Math.max(1,Number(ch)||1);state.selectedVerse=Number(verse)||0;queueMicrotask(function(){pbReaderWindowsRefresh();});activeBook=books.find(function(b){return b.slug===state.book;})||booksFallback.find(function(b){return b.slug===state.book;})||activeBook;PBStudyBridge.selectVerse(state.book,state.chapter,state.selectedVerse,"setRef");persist();render();}
function chapterOptions(){var opts="";for(var i=1;i<=activeBook.chapters;i++) opts+='<option value="'+i+'"'+(i===state.chapter?" selected":"")+'>'+i+'</option>';return opts;}
function readBooks(){
 fetch(API+"/books").then(function(r){if(!r.ok)throw Error("API");return r.json();}).then(function(j){var list=Array.isArray(j.data)?j.data:(j.data&&j.data.books)||[];if(!Array.isArray(list)||list.length<60)return;books=list.map(function(b){var name=typeof b.name==="string"?b.name:(b.name&&b.name["pt-br"])||b.name.en||"";var slug=typeof b.slug==="string"?b.slug:(b.slug&&b.slug.en)||"";return {name:name,slug:slug,chapters:Number(b.chapters)||1,testament:b.testament};}).filter(function(b){return b.name&&b.slug;});activeBook=books.find(function(b){return b.slug===state.book;})||activeBook;if(state.page==="leitura")render();}).catch(function(){});
}
async function loadOnlineBibleChapter(version,book,chapter){
 var cached=chaptersCache[version+"/"+book+"/"+chapter];
 if(cached?.verses?.length)return cached;

 var failure=Error("Este capítulo ainda não foi salvo para leitura offline.");
 if(navigator.onLine!==false){
  try{
   var response=await fetch(API+"/"+encodeURIComponent(version)+"/"+book+"/"+chapter);
   if(!response.ok)throw Error("Não foi possível obter o capítulo.");
   var json=await response.json(),data=json.data||{},verses=data.verses||[];
   if(!verses.length&&data.text)verses=[data.text];
   if(!verses.length)throw Error("Não foram encontrados versículos.");
   var copyright=json.meta?.copyright||"";
   await PBModules.saveSearchCache(version,[{book:book,chapter:chapter,verses:verses,credit:copyright}]).catch(function(){});
   return {verses:verses,copyright:copyright,version:data.version||version};
  }catch(error){failure=error;}
 }
 var saved=await PBModules.getSearchCacheChapter(version,book,chapter).catch(function(){return null;});
 if(saved?.verses?.length)return {verses:saved.verses,copyright:saved.credit||"",version:version};
 throw failure;
}
function loadChapter(){
 trackStudyActivity("Leitura bíblica",activeBook.name+" "+state.chapter,"Tradução: "+state.version);
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
 loadOnlineBibleChapter(state.version,state.book,state.chapter).then(success).catch(fail);
}

function verseGlobalId(number){
 var ids={genesis:"GN",exodus:"EX",psalms:"PS",john:"JN",matthew:"MT",mark:"MC",luke:"LC",acts:"AT",romans:"RM",revelation:"AP"};
 return (ids[state.book]||state.book.toUpperCase().replace(/-/g,""))+"."+state.chapter+"."+Number(number);
}
function selectionNumbers(){
 return TS.getState().currentVerseSelection.filter(id=>id.startsWith(verseGlobalId(1).replace(/\.1$/,"."))).map(id=>Number(id.split(".").pop())).filter(Number.isInteger).sort((a,b)=>a-b);
}
/* Seleção por caixas: gestos independentes do texto bíblico. */
window.__pbCheckboxMode=false;
document.addEventListener("click",function(e){
 var btn=e.target.closest&&e.target.closest("[data-pb-select-action]");
 if(!btn)return;
 e.preventDefault();e.stopImmediatePropagation();
 var action=btn.dataset.pbSelectAction;
 var toolbar=window.PBToolbar;if(!toolbar)return;
 if(action==="multi"){window.__pbCheckboxMode=true;window.__pbMultiSelectMode=true;}
 if(action==="all"){
  var ids=Array.from(document.querySelectorAll("#chapter-body .verse-line[data-usfm]")).map(function(n){return n.dataset.usfm;});
  toolbar.actions.setSelection(ids);window.__pbCheckboxMode=true;window.__pbMultiSelectMode=true;
 }
 if(action==="done"){window.__pbCheckboxMode=false;window.__pbMultiSelectMode=false;}
 if(action==="cancel"){window.__pbCheckboxMode=false;window.__pbMultiSelectMode=false;toolbar.actions.clearSelection();}
 var refresh=window.__pbRefreshCheckboxes;if(refresh)refresh();
},true);
/* Uma única ação por toque: pointerup no celular, click no teclado/browser. */
var pbLastBoxAction={id:"",at:0};
function pbToggleCheckbox(box){
 if(!window.__pbCheckboxMode||!window.PBToolbar)return;
 var id=box.dataset.pbVerseCheck,now=Date.now();
 if(pbLastBoxAction.id===id&&now-pbLastBoxAction.at<350)return;
 pbLastBoxAction={id:id,at:now};
 window.PBToolbar.actions.toggleVerse(id);
 if(window.__pbRefreshCheckboxes)window.__pbRefreshCheckboxes();
}
document.addEventListener("pointerup",function(e){
 var box=e.target.closest&&e.target.closest("input[data-pb-verse-check]");
 if(box&&e.button===0)pbToggleCheckbox(box);
},true);
document.addEventListener("click",function(e){
 var box=e.target.closest&&e.target.closest("input[data-pb-verse-check]");
 if(!box)return;
 e.preventDefault();e.stopImmediatePropagation();
 pbToggleCheckbox(box);
},true);
document.addEventListener("change",function(e){
 if(e.target&&e.target.matches&&e.target.matches("input[data-pb-verse-check]"))e.stopImmediatePropagation();
},true);
function refreshVerseDecorations(){
 var ts=TS.getState();
 if(!ts.currentVerseSelection.length&&!window.__pbCheckboxMode)window.__pbMultiSelectMode=false;
 var holder=document.getElementById("chapter-body");
 if(holder){
  var controls=document.getElementById("pb-multiselect-controls");
  if(!controls){controls=document.createElement("div");controls.id="pb-multiselect-controls";controls.style.cssText="display:flex;flex-wrap:wrap;gap:7px;padding:9px 4px;position:sticky;top:0;z-index:10;background:var(--reader-paper,#fffdf7)";holder.parentNode.insertBefore(controls,holder);}
  var active=ts.currentVerseSelection.length>0,checkMode=window.__pbCheckboxMode===true;
  controls.style.display=(active||checkMode)?"flex":"none";
  controls.innerHTML=checkMode?'<button type="button" data-pb-select-action="all">☑ Selecionar todos</button><button type="button" data-pb-select-action="done">Concluir</button><button type="button" data-pb-select-action="cancel">Cancelar</button>':'<button type="button" data-pb-select-action="multi">☐ Selecionar vários</button>';
  document.querySelectorAll("#chapter-body .verse-line").forEach(function(node){
   var checkbox=node.querySelector("input[data-pb-verse-check]");
   if(checkMode&&!checkbox){
    checkbox=document.createElement("input");checkbox.type="checkbox";checkbox.dataset.pbVerseCheck=node.dataset.usfm;
    checkbox.setAttribute("aria-label","Selecionar versículo "+node.dataset.verse);
    checkbox.style.cssText="width:19px;height:19px;margin:0 9px 0 2px;vertical-align:middle;accent-color:#bb8624;cursor:pointer";
    node.insertBefore(checkbox,node.firstChild);
   }else if(!checkMode&&checkbox){checkbox.remove();checkbox=null;}
   if(checkbox)checkbox.checked=ts.currentVerseSelection.includes(node.dataset.usfm);
  });
 }
 var dock=document.querySelector(".reader-actiondock");if(dock)dock.hidden=!ts.currentVerseSelection.length;
 document.querySelectorAll("#chapter-body .verse-line").forEach(function(node){
  var id=node.dataset.usfm;
  var isSelected=ts.currentVerseSelection.includes(id);
  node.classList.toggle("selected",isSelected);
  node.classList.toggle("pb-multi-selected",isSelected);
  node.setAttribute("aria-selected",isSelected?"true":"false");
  var color=TS.COLORS[ts.highlights[id]];
  node.classList.toggle("highlighted",!!color);
  if(color)node.style.setProperty("--verse-mark",color);
  else node.style.removeProperty("--verse-mark");
 });
}
TS.subscribe(function(next,prev){
 if(next.currentVerseSelection!==prev.currentVerseSelection)refreshVerseDecorations();
});
window.__pbRefreshCheckboxes=refreshVerseDecorations;
var translationTapTimer=null,translationLastTap=0,translationLastToggle=0;
function toggleStrongNumbers(){
 state.showStrong=!state.showStrong;
 TS.actions.setPreference("showStrong",state.showStrong);
 persist();
 renderReaderContent();
 var button=document.querySelector('[data-act="toggle-strong"]');
 if(button)button.classList.toggle("on",state.showStrong);
 notify(state.showStrong?"Números Strong visíveis":"Números Strong recolhidos");
}
function handleTranslationTap(){
 var now=Date.now();
 if(now-translationLastTap<400){
  clearTimeout(translationTapTimer);
  translationLastTap=0;
  translationLastToggle=now;
  toggleStrongNumbers();
  return;
 }
 translationLastTap=now;
 clearTimeout(translationTapTimer);
 translationTapTimer=setTimeout(function(){translationLastTap=0;openTranslationPicker();},400);
}
function closeTranslationPicker(){
 document.getElementById("pb-translation-picker")?.remove();
 document.querySelector('[data-toolbar-action="translation"]')?.focus();
}
function openTranslationPicker(){
 if(state.page!=="leitura")return;
 // Small dropdown below the translation control, not a full-screen modal.
 var trigger=document.querySelector('[data-toolbar-action="translation"]');
 if(!trigger)return;
 document.getElementById("pb-translation-picker")?.remove();
 var root=document.createElement("div");
 root.id="pb-translation-picker";
 root.className="pb-translation-dropdown";
 root.setAttribute("role","listbox");
 root.setAttribute("aria-label","Escolher tradução");
 root.style.cssText="position:fixed;z-index:10000;min-width:190px;max-width:min(340px,calc(100vw - 20px));max-height:55vh;overflow-y:auto;background:#fff;color:#193b42;border:1px solid #d4dee0;border-radius:10px;box-shadow:0 8px 26px #0003;padding:5px;";
 root.innerHTML=toolbarNavigation().versions.map(function(version){
  return '<button type="button" role="option" data-translation="'+esc(version.value)+'" aria-selected="'+(version.value===state.version)+'" style="display:block;width:100%;padding:11px 14px;text-align:left;border:0;border-radius:6px;background:'+(version.value===state.version?'#dcecf0':'transparent')+';color:#193b42;font:inherit;cursor:pointer">'+esc(version.label)+'</button>';
 }).join("");
 document.body.appendChild(root);
 var rect=trigger.getBoundingClientRect();
 var width=Math.min(340,Math.max(190,rect.width+65));
 root.style.width=width+"px";
 root.style.left=Math.max(10,Math.min(rect.left,window.innerWidth-width-10))+"px";
 var below=window.innerHeight-rect.bottom;
 if(below>=Math.min(root.offsetHeight,220)||below>=window.innerHeight-rect.top){
  root.style.top=Math.min(rect.bottom+4,window.innerHeight-root.offsetHeight-8)+"px";
 }else{
  root.style.top=Math.max(8,rect.top-root.offsetHeight-4)+"px";
 }
 root.addEventListener("click",function(event){
  var option=event.target.closest("[data-translation]");
  if(!option)return;
  state.version=option.dataset.translation;
  closeTranslationPicker();
  persist();
  renderReader();
 });
 function dismiss(event){
  if(!root.isConnected){document.removeEventListener("pointerdown",dismiss,true);document.removeEventListener("keydown",escape,true);return;}
  if(!root.contains(event.target)&&!trigger.contains(event.target)){
   root.remove();document.removeEventListener("pointerdown",dismiss,true);document.removeEventListener("keydown",escape,true);
  }
 }
 function escape(event){
  if(event.key==="Escape"){closeTranslationPicker();document.removeEventListener("pointerdown",dismiss,true);document.removeEventListener("keydown",escape,true);}
 }
 document.addEventListener("pointerdown",dismiss,true);
 document.addEventListener("keydown",escape,true);
}

document.addEventListener("dblclick",function(event){
 if(!event.target.closest?.('[data-toolbar-action="translation"]'))return;
 event.preventDefault();event.stopPropagation();
 clearTimeout(translationTapTimer);
 translationLastTap=0;
 if(Date.now()-translationLastToggle>600){translationLastToggle=Date.now();toggleStrongNumbers();}
});

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
 if(action!=="translation"){clearTimeout(translationTapTimer);translationLastTap=0;}
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
  if(n){showCommentaryPanel(n);window.PBSplitStudy.menu(true);}
  return;
 }
 case "explain-verse":{var n=selectionNumbers()[0];if(n){state.selectedVerse=n;persist();}page("tutor");return;}
 case "sermon-verse":{var n=selectionNumbers()[0];if(n){state.selectedVerse=n;state.sermon.context+=(state.sermon.context?"\\n\\n":"")+activeBook.name+" "+state.chapter+":"+n;persist();notify("Versículo adicionado ao sermão");}return;}
 case "copy":shareOrCopy(false);return;
 case "compare":state.showParallel=!state.showParallel;persist();renderReader();notify(state.showParallel?"Comparação de traduções ativada.":"Comparação de traduções fechada.");return;
 case "share":shareOrCopy(true);return;
 case "note":{var n=selectionNumbers();if(n.length){state.selectedVerse=n[0];persist();}noteModal();return;}
 case "audio":audioToolbarAction();return;
 case "search":openBibleSearch();return;
 case "translation":handleTranslationTap();return;
 case "prev":if(state.chapter>1)setRef(state.book,state.chapter-1);return;
 case "next":if(state.chapter<activeBook.chapters)setRef(state.book,state.chapter+1);return;
 case "comments":if(state.splitStudy&&!state.dictionaryOpen)closeStudyPanel();else showCommentaryPanel();return;
 case "split-study":if(state.splitStudy)closeStudyPanel();else showCommentaryPanel();return;
 case "strong":showDictionaryPanel();return;
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
function annotateVerse(text,verseNumber,passage=state){
 var source=String(text==null?"":text);
 var rules=inlineStrongMap[passage.book+"/"+passage.chapter+"/"+verseNumber]||[];
 if(!rules.length)return esc(source);
 var matches=[];
 rules.forEach(function(rule){for(var m of source.matchAll(new RegExp("(?<![\\p{L}\\p{M}])(?:"+rule.pattern.source+")(?![\\p{L}\\p{M}])","giu"))){
  matches.push({from:m.index,to:m.index+m[0].length,id:rule.id});
 }});
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
  var linked=linkedPassage&&state.book===linkedPassage.book&&state.chapter===linkedPassage.chapter&&v.number>=linkedPassage.verse&&v.number<=linkedPassage.endVerse;
  var vid=verseGlobalId(v.number),color=TS.COLORS[TS.getState().highlights[vid]]||"";
  return '<span class="verse-line'+(linked?" pb-reference-target":"")+(TS.getState().currentVerseSelection.includes(vid)?" selected":"")+(state.bookmarks.includes(r)?" marked":"")+(color?" highlighted":"")+'" data-usfm="'+esc(vid)+'" style="'+(color?"--verse-mark:"+color:"")+'" data-verse="'+v.number+'" role="button" tabindex="0" title="Pressione e segure para selecionar versículo '+v.number+'"><sup class="verse-num">'+v.number+'</sup>'+window.PBConnections.wrapHtml((state.version.startsWith("local:")?window.PBModules.renderVerse(v.text,state.book,state.showStrong):annotateVerse(v.text,v.number)))+'</span>';
 }).join(state.readerMode==="verses"?"":" ");
 holder.innerHTML='<div class="verse-list '+(state.readerMode==="verses"?"segmented":"")+'">'+rows+'</div><div class="credit">'+esc(latestChapter.copyright||"Texto disponibilizado pela API Midvash; consulte os termos da tradução.")+'</div>';
 var el=document.getElementById("selected-reference");if(el)el.textContent=ref();
 refreshVerseDecorations();
 var b=document.getElementById("bookmark-btn");if(b)b.textContent=currentMarked()?"★ Favorito":"☆ Favorito";
 if(state.showParallel)loadParallelText();
 if(state.splitStudy)window.PBSplitStudy.refresh();
 if(state.dictionaryOpen)window.PBDictionaryStudy.syncReference();
 refreshVerseDecorations();
 window.PBVerseComments.decorate(state.book,state.chapter,latestChapter.verses.map(function(v){return v.number;}));
 if(pendingBibleScroll!==null){
  var biblePane=document.getElementById("pb-split-bible");
  if(biblePane)biblePane.scrollTop=pendingBibleScroll;
  else window.scrollTo({top:pendingBibleScroll,behavior:"instant"});
  pendingBibleScroll=null;
 }else if(focusCommentVerse){
  var selected=holder.querySelector('.verse-line[data-verse="'+focusCommentVerse+'"]');
  if(selected&&selected.scrollIntoView)selected.scrollIntoView({block:"nearest",behavior:"instant"});
 }
 focusCommentVerse=0;
 window.PBSplitStudy.syncBibleScroll();
 if(window.PBReaderMultiWindow)window.PBReaderMultiWindow.readerReady();
}
function readerOptions(){
 return books.map(function(b){return '<option value="'+esc(b.slug)+'"'+(state.book===b.slug?" selected":"")+'>'+esc(b.name)+'</option>';}).join("");
}


/* The dictionary replaces comments in the lower study pane. */
function attachDictionaryStudy(){
 if(!state.dictionaryOpen)return;
 window.PBDictionaryStudy.attach({
  readModule:function(){return state.dictionaryModuleId||"";},
  readQuery:function(){return state.dictionaryQuery||state.dictionaryTerm||"";},
  readReference:function(){return {book:state.book,chapter:state.chapter,verse:state.selectedVerse||0,name:activeBook.name};},
  onModuleChange:function(id){state.dictionaryModuleId=id;persist();},
  onQueryChange:function(query){state.dictionaryQuery=query;state.dictionaryTerm=query.term;persist();window.PBSplitStudy.refresh();},
  onClose:closeStudyPanel,
  onSearch:openBibleSearch,
  onComments:function(){state.dictionaryOpen=false;persist();window.PBDictionaryStudy.destroy();},
  onReference:function(reference){openLinkedReference(reference);},
  renderStrong:renderStrongEntry,
  readRestoreScroll:function(){return pendingDictionaryScroll;},
  onRestoreScroll:function(){pendingDictionaryScroll=0;},
  notify:notify
 });
}
function showDictionaryPanel(){
 if(window.PBReaderMultiWindow&&window.PBReaderMultiWindow.isActive()){window.PBReaderMultiWindow.openTool("dictionary");return;}
 trackStudyActivity("Dicionário",activeBook.name+" "+state.chapter+(state.selectedVerse?":"+state.selectedVerse:""),"Consulta ao painel de dicionário");
 var needsSplit=!state.splitStudy||!document.getElementById("pb-study-split");
 state.splitStudy=true;
 state.dictionaryOpen=true;
 persist();
 if(needsSplit){focusCommentVerse=state.selectedVerse;renderReader();return;}
 if(!window.PBDictionaryStudy.isAttached())attachDictionaryStudy();
}
function hideDictionaryPanel(){
 state.dictionaryOpen=false;persist();
 window.PBDictionaryStudy.destroy();
}
function closeStudyPanel(){
 state.dictionaryOpen=false;
 state.splitStudy=false;
 persist();
 renderReader();
}
function showCommentaryPanel(verse,moduleId){
 if(window.PBReaderMultiWindow&&window.PBReaderMultiWindow.isActive()){if(Number(verse)>0){state.selectedVerse=Number(verse);persist();}window.PBReaderMultiWindow.openTool("commentary",{moduleId:moduleId||"",reference:{book:state.book,chapter:state.chapter,verse:Number(verse)||state.selectedVerse||1}});return;}
 var needsSplit=!state.splitStudy||!document.getElementById("pb-study-split");
 if(Number(verse)>0)state.selectedVerse=Number(verse);
 if(moduleId)state.commentModuleId=moduleId;
 trackStudyActivity("Comentário",activeBook.name+" "+state.chapter+":"+state.selectedVerse+" · "+(state.commentModuleId||"Comentário"),"Módulo: "+(state.commentModuleId||""),{moduleId:state.commentModuleId||"",verse:state.selectedVerse});
 state.splitStudy=true;
 hideDictionaryPanel();
 if(needsSplit){focusCommentVerse=state.selectedVerse;renderReader();}
 else window.PBSplitStudy.refresh();
}
function openDictionaryTerm(term,verse,codes,source){
 if(window.PBReaderMultiWindow&&window.PBReaderMultiWindow.isActive()){
  var reference=window.PBReaderMultiWindow.sourceReference(source);
  if(Number(verse)>0)reference.verse=Number(verse);
  window.PBReaderMultiWindow.openTool("dictionary",{term:String(term||"").trim(),codes:codes||[],reference:reference});return;
 }
 var token=String(term||"").trim();
 if(!token)return;
 trackStudyActivity("Palavra pesquisada",token,"Dicionário / Strong · "+(codes||[]).toString(),{term:token,verse:Number(verse)||state.selectedVerse||0});
 if(verse!==null&&verse!==undefined&&Number(verse)>0){
  state.selectedVerse=Number(verse);
  window.PBSplitStudy.refresh();
 }
 var wasAttached=window.PBDictionaryStudy.isAttached();
 var query={term:token,codes:codes||[],reference:{book:state.book,name:activeBook.name,chapter:state.chapter,verse:state.selectedVerse||0}};
 state.dictionaryQuery=query;
 showDictionaryPanel();
 if(wasAttached)window.PBDictionaryStudy.lookup(query);
}

function attachSplitStudy(){
 if(!state.splitStudy)return;
 window.PBSplitStudy.attach({
  readReference:function(){return {book:state.book,chapter:state.chapter,verse:state.selectedVerse||0,name:activeBook.name};},
  readModule:function(){return state.commentModuleId||"";},
  onBibleVerse:function(verse){
   state.selectedVerse=verse;pbReaderWindowsRefresh();
   persist();
   var label=document.getElementById("selected-reference");
   if(label)label.textContent=ref();
  },
  readHighlights:function(reference){
   var query=state.dictionaryQuery,origin=query&&query.reference;
   if(!origin||origin.book!==reference.book||origin.chapter!==reference.chapter||origin.verse!==reference.verse)return [];
   return [query.word].concat((query.codes||[]).map(function(code){return findStrongForm(code,origin)?.label;})).filter(Boolean);
  },
  readSize:function(){return state.splitPct||56;},
  onResize:function(n){state.splitPct=n;persist();},
  onModuleChange:function(id){state.commentModuleId=id;persist();},
  onDictionary:showDictionaryPanel,
  onClose:closeStudyPanel,
  onSearch:openBibleSearch,
  onSermon:function(row){state.sermon.context+=(state.sermon.context?"\n\n":"")+row.moduleName+" — "+ref()+"\n"+row.text;persist();notify("Comentário inserido no sermão");},
   onReference:function(reference){openLinkedReference(reference);},
  readRestoreScroll:function(){return pendingCommentScroll;},
  onRestoreScroll:function(){pendingCommentScroll=0;},
  notify:notify
 });
}
function renderReader(){
 if(window.PBReaderMultiWindow){window.PBReaderMultiWindow.unmount();window.PBReaderMultiWindow.prepareReaderState();}
 window.PBVerseComments.invalidate();
 if(state.dictionaryOpen)state.splitStudy=true;
 window.PBDictionaryStudy.destroy();
 window.PBSplitStudy.destroy();
 var other=state.parallelVersion||"bpm",previous=referenceHistory[referenceHistory.length-1];
 MAIN.innerHTML='<section class="reader-screen"><div id="dynamic-toolbar"></div>'+
 (previous?'<div class="pb-reference-history"><button type="button" class="pb-reference-back" data-act="reference-back">← Voltar para '+esc(previous.label)+'</button></div>':"")+
 '<div class="reader-commandbar">'+
 '<div class="reader-top-controls"><div class="reader-brand"><span class="brand-small">✦</span><strong>Púlpito Bible</strong><span class="reader-tagline">Leitor avançado</span></div><div class="reader-passage-control"><select class="reader-select book-control" id="book-select" aria-label="Selecionar livro">'+readerOptions()+'</select><select class="reader-select chapter-control" id="chapter-select" aria-label="Selecionar capítulo">'+chapterOptions()+'</select><select class="reader-select version-control" id="version-select" aria-label="Selecionar tradução"><option value="alm1911"'+(state.version==="alm1911"?" selected":"")+'>Almeida 1911</option><option value="bpm"'+(state.version==="bpm"?" selected":"")+'>BPM</option><option value="onbv"'+(state.version==="onbv"?" selected":"")+'>ONBV</option><option value="nva"'+(state.version==="nva"?" selected":"")+'>NVA</option>'+window.PBModules.bibleOptions(state.version)+'</select></div><div class="reader-arrows"><button class="reader-icon" data-act="prev-chapter" aria-label="Capítulo anterior">‹</button><button class="reader-icon" data-act="next-chapter" aria-label="Próximo capítulo">›</button></div></div>'+
 '<div class="reader-quicktools"><button class="reader-tool'+(state.showStrong?" on":"")+'" data-act="toggle-strong">H/G <strong>Strong</strong><span class="mini-switch"></span></button><button class="reader-tool'+(state.splitStudy&&!state.dictionaryOpen?" on":"")+'" data-act="toggle-comments">▤ Comentários</button><button class="reader-tool'+(state.showCrossRefs?" on":"")+'" data-act="toggle-crossrefs">⇄ Referências</button><button class="reader-tool'+(state.showParallel?" on":"")+'" data-act="toggle-parallel">◫ Duas Bíblias</button><button class="reader-tool" data-act="open-dictionary">α Dicionário</button><button class="reader-tool" data-page="tutor">✧ Interpretar</button><button class="reader-tool" data-page="modulos">⇩ Instalar módulos</button></div>'+
 '<div class="reader-appearance"><label>Texto <select id="reader-mode" aria-label="Formato dos versículos"><option value="continuous"'+(state.readerMode==="continuous"?" selected":"")+'>Contínuo</option><option value="verses"'+(state.readerMode==="verses"?" selected":"")+'>Por versículo</option></select></label><label>Fundo <select id="reader-paper" aria-label="Estilo do leitor"><option value="sepia"'+(state.readerTheme==="sepia"?" selected":"")+'>Sépia</option><option value="white"'+(state.readerTheme==="white"?" selected":"")+'>Branco</option><option value="night"'+(state.readerTheme==="night"?" selected":"")+'>Noturno</option></select></label><button class="reader-icon" data-act="reader-font-down" aria-label="Diminuir fonte">A−</button><span class="reader-size">'+state.fontSize+'px</span><button class="reader-icon" data-act="reader-font-up" aria-label="Aumentar fonte">A+</button><button class="reader-tool" data-act="focus-mode">'+(state.focusMode?"◧ Mostrar menus":"⛶ Tela de leitura")+'</button></div></div>'+
 '<div class="reader-searchline"><input class="field" id="reference-search" placeholder="Ir para referência — João 15:4" aria-label="Ir para referência"><button class="btn slim" data-act="search-ref">Ir</button><span class="reader-hint">Toque em uma palavra para consultar os dicionários.</span></div>'+
 '<div id="pb-reader-window-picker" class="card card-pad" style="display:none;margin:10px 0"><strong>Adicionar janela à Bíblia</strong><div class="btn-row"><button class="btn slim" data-act="pb-reader-add" data-win-type="commentary">+ Comentário</button><button class="btn slim" data-act="pb-reader-add" data-win-type="bible">+ Outra tradução</button><button class="btn slim" data-act="pb-reader-add" data-win-type="dictionary">+ Dicionário / Strong</button><button class="btn slim" data-act="pb-reader-add" data-win-type="devotional">+ Devocional</button></div></div>'+ 
 '<div class="reader-columns"><article class="reader-paper '+esc(state.readerTheme)+'"><div class="reader-paper-head"><span class="reader-module">'+esc(state.version.toUpperCase())+'</span><div><div class="reader-overline">LIVRO E CAPÍTULO</div><h1>'+esc(activeBook.name)+' '+state.chapter+'</h1></div><button class="reader-favorite" id="bookmark-btn" data-act="bookmark">'+(currentMarked()?"★ Favorito":"☆ Favorito")+'</button></div><div id="chapter-body" class="reader-scripture"><div class="loader">Carregando Escrituras…</div></div><div class="reader-note"><strong>Strong no texto:</strong> os vínculos exibidos nesta versão são amostras conferidas para João 15:4–5 e Gênesis 1:1. A numeração de todo o texto dependerá de uma base morfológica alinhada à tradução portuguesa.</div></article>'+
 (state.showParallel?'<article class="reader-paper second '+esc(state.readerTheme)+'"><div class="reader-paper-head"><select id="parallel-version-select" class="reader-select"><option value="alm1911"'+(other==="alm1911"?" selected":"")+'>Almeida 1911</option><option value="bpm"'+(other==="bpm"?" selected":"")+'>BPM</option><option value="onbv"'+(other==="onbv"?" selected":"")+'>ONBV</option><option value="nva"'+(other==="nva"?" selected":"")+'>NVA</option>'+window.PBModules.bibleOptions(other)+'</select><h2>Tradução paralela</h2></div><div id="parallel-body" class="reader-scripture"><div class="loader">Carregando versão paralela…</div></div></article>':"")+'</div>'+
 (state.showCrossRefs?'<section class="card card-pad reader-extras"><div class="caps">REFERÊNCIAS CRUZADAS</div><h2 class="section-heading">Passagens relacionadas</h2><p class="feature-note">Sugestões temáticas iniciais, não geradas automaticamente por um comentário externo.</p><div class="row">'+(state.book==="john"&&state.chapter===15?'<button class="btn slim" data-ref-open="João 6:56">João 6:56</button><button class="btn slim" data-ref-open="Gálatas 5:22">Gálatas 5:22</button>':'<button class="btn slim" data-ref-open="João 1:1">João 1:1</button>')+'</div></section></div>':"")+
  
 '<div class="reader-actiondock"><div class="reader-reference"><span>SELECIONADO</span><strong id="selected-reference">'+esc(ref())+'</strong></div><div class="row"><button class="btn slim" data-act="bookmark">☆ Marcar</button><button class="btn slim" data-act="note">✎ Anotar</button><button class="btn slim" data-page="sermao">▤ Sermão</button><button class="btn primary slim" data-page="tutor">✧ Interpretar</button></div></div></section>';
 if(state.splitStudy)attachSplitStudy();
 if(state.dictionaryOpen)attachDictionaryStudy();
 mountAppToolbar();
 if(window.PBReaderMultiWindow)window.PBReaderMultiWindow.mount();
 loadChapter();

}
function loadParallelText(){
 if(!state.showParallel||state.page!=="leitura")return;
 var dest=document.getElementById("parallel-body");if(!dest)return;
 var other=state.parallelVersion||"bpm",book=state.book,chapter=state.chapter;
 function show(result){
  if(!state.showParallel||state.page!=="leitura"||book!==state.book||chapter!==state.chapter||other!==state.parallelVersion)return;
  var target=document.getElementById("parallel-body");if(!target)return;
  target.innerHTML='<div class="verse-list segmented">'+result.verses.map(function(v,i){
   var verse=Number(v.number||v.verse||i+1),text=typeof v==="string"?v:v.text||"";
   var html=other.startsWith("local:")?window.PBModules.renderVerse(text,book,state.showStrong):annotateVerse(text,verse);
   return '<span class="verse-line" data-verse="'+verse+'"><sup class="verse-num">'+verse+'</sup>'+window.PBConnections.wrapHtml(html)+'</span>';
  }).join("")+'</div><div class="credit">'+esc(result.copyright||"Créditos indicados pelo fornecedor do texto.")+'</div>';
 }
 function fail(){var target=document.getElementById("parallel-body");if(target)target.innerHTML='<p class="feature-note">Não foi possível carregar esta tradução. <button class="btn slim" data-page="modulos">Ver módulos</button></p>';}
 if(other.startsWith("local:")){window.PBModules.getChapter(other,book,chapter).then(show).catch(fail);return;}
 fetch(API+"/"+other+"/"+book+"/"+chapter).then(function(r){if(!r.ok)throw Error("Indisponível");return r.json();}).then(function(j){var d=j.data||{};return {verses:d.verses||[],copyright:j.meta&&j.meta.copyright||""};}).then(show).catch(fail);
}
function openStrongEntry(wordId,verse,source){
 var term=String(wordId||"").trim().toUpperCase();
 if(/^([GH])0*\d{1,5}[A-Z]?$/.test(term))openDictionaryTerm(term,verse,[],source);
}
function findStrongForm(term,context){
 var id=term.toUpperCase(),code=id.replace(/^([GH])0*(\d{1,5})[A-Z]?$/,"$1$2");
 var passage=context.name+" "+context.chapter+":"+context.verse;
 return words.find(function(entry){return entry.book===passage&&(entry.id.toUpperCase()===id||entry.code===code);});
}
function renderStrongEntry(term,context){
 var word=findStrongForm(term,context);
 if(!word)return '<p class="feature-note">A forma e a morfologia desta ocorrência exigem um módulo alinhado ao versículo.</p>';
 return '<article class="pb-dict-entry"><div class="pb-dict-entry-title"><strong class="pb-dict-original" dir="auto">'+esc(word.label)+'</strong><small>'+esc(word.code)+'</small></div>'+
  '<p>'+esc(word.reading)+' · Lema: '+esc(word.lemma)+'</p><strong>'+esc(word.meaning)+'</strong>'+
  '<p>'+[word.type,word.tense,word.voice,word.mood,word.person].map(esc).join(" · ")+'</p>'+
  '<p>'+esc(word.note)+'</p><a href="'+esc(word.source)+'" target="_blank" rel="noopener noreferrer">Consultar referência lexical ↗</a></article>';
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
 if(currentWord)trackStudyActivity("Palavra original",currentWord.label||currentWord.lemma||currentWord.code,[currentWord.reading,currentWord.meaning,currentWord.code].join(" "));
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
 var s=state.sermon,list=pb2Read().sermons||[];
 var editing=list.some(function(item){return item.id===s.id;});
 trackStudyActivity("Sermão",s.title||activeBook.name+" "+state.chapter,"Criador de sermões");
 MAIN.innerHTML='<div class="content sermon-workspace">'+title("sermao")+
 '<div class="row"><button class="btn" data-act="sermon-new">Novo sermão</button><button class="btn" data-act="sermon-library">Sermões salvos ('+list.length+')</button></div>'+
 '<section class="card card-pad" aria-labelledby="sermon-editor"><div class="panel-heading"><h2 class="section-heading" id="sermon-editor" tabindex="-1">'+(editing?"Editar sermão":"Criar sermão")+'</h2><span class="chip greenish">Rascunho local</span></div><div class="sermon-grid">'+
 [["title","Tema"],["reference","Texto bíblico"],["context","Contexto histórico e literário"],["introduction","Introdução"],["point1","Tópico 1 · Exposição"],["point2","Tópico 2 · Exposição"],["application","Aplicação"],["conclusion","Conclusão"]].map(function(a,i){return '<label class="'+(i>=2?"full":"")+'">'+esc(a[1])+(i>=2?'<textarea class="editor" data-sermon="'+a[0]+'" placeholder="Escreva aqui…">'+esc(s[a[0]]||"")+'</textarea>':'<input class="field" data-sermon="'+a[0]+'" value="'+esc(s[a[0]]||"")+'">')+'</label>';}).join("")+'</div><div class="row">'+
 '<button class="btn primary" data-act="sermon-save">'+(editing?"Salvar alterações":"Salvar sermão")+'</button>'+
 '<button class="btn" data-act="sermon-from-ref">Usar passagem atual</button>'+
 '<button class="btn" data-act="sermon-copy">Copiar esboço</button>'+
 '<button class="btn" data-act="sermon-export">Exportar .txt</button></div></section>'+
 '<section class="card card-pad" aria-labelledby="sermon-library"><div class="panel-heading"><h2 class="section-heading" id="sermon-library" tabindex="-1">Sermões salvos</h2><button class="btn slim" data-act="pb2-backup">Exportar backup</button></div>'+
 (list.length?list.map(function(item){
  var name=item.title||"Sem título", id=esc(item.id);
  var date=item.updated||item.created;
  return '<article class="card card-pad"><h3>'+esc(name)+'</h3>'+
   (item.reference?'<p>'+esc(item.reference)+'</p>':'')+
   (date?'<p class="tiny">'+esc(new Date(date).toLocaleString("pt-BR"))+'</p>':'')+
   '<div class="row"><button class="btn slim" data-act="sermon-edit" data-sermon-id="'+id+'" aria-label="'+esc("Editar "+name)+'">Editar</button>'+
   '<button class="btn slim" data-act="sermon-delete" data-sermon-id="'+id+'" aria-label="'+esc("Excluir "+name)+'">Excluir</button></div></article>';
 }).join(""):'<p>Nenhum sermão salvo.</p>')+'</section></div>';
}
function confirmSermonSwitch(list){
 var saved=list.find(function(item){return item.id===state.sermon.id;})||defaults.sermon;
 var hasChanges=Object.keys(defaults.sermon).some(function(key){
  return (state.sermon[key]||"")!==(saved[key]||"");
 });
 return !hasChanges||window.confirm("Há alterações no rascunho. Deseja sair dele sem salvar o sermão?");
}
function handleSermonAction(action,id){
 var db=pb2Read(),list=db.sermons||[];
 var index=list.findIndex(function(item){return item.id===(id||state.sermon.id);});
 var item=list[index],heading="sermon-editor";
 switch(action){
 case "sermon-new":
  if(!confirmSermonSwitch(list))return;
  state.sermon=Object.assign({},defaults.sermon);
  break;
 case "sermon-edit":
  if(!item||item.id===state.sermon.id){
   document.getElementById(heading).focus();
   return;
  }
  if(!confirmSermonSwitch(list))return;
  state.sermon=Object.assign({},defaults.sermon,item);
  break;
 case "sermon-save":
  if(!Object.keys(defaults.sermon).some(function(key){return String(state.sermon[key]||"").trim();})){
   notify("Preencha pelo menos um campo para salvar o sermão.");
   return;
  }
  var now=new Date().toISOString();
  var updated=Object.assign({},state.sermon,{
   id:item?item.id:crypto.randomUUID(),
   created:item&&item.created||now,
   updated:now
  });
  if(item)list[index]=updated;
  else list.unshift(updated);
  db.sermons=list;
  if(!pb2Write(db))return;
  state.sermon=Object.assign({},updated);
  heading="sermon-library";
  notify(item?"Alterações salvas.":"Sermão salvo.");
  break;
 case "sermon-delete":
  if(!item||!window.confirm('Excluir o sermão "'+(item.title||"Sem título")+'"?'))return;
  db.sermons=list.filter(function(saved){return saved.id!==id;});
  if(!pb2Write(db))return;
  if(state.sermon.id===id)state.sermon=Object.assign({},defaults.sermon);
  heading="sermon-library";
  notify("Sermão excluído.");
  break;
 }
 persist();
 renderSermon();
 document.getElementById(heading).focus();
}
var historicalFilters={term:"",book:"",period:"",theme:"",type:""};
var historicalTabs=[["contexto","Contexto histórico"],["cronologia","Cronologia"],["cultura","Cultura e costumes"],["geografia","Geografia"],["sociedade","Povo e sociedade"],["aplicacoes","Aplicações"],["notas","Minhas anotações"]];
var historicalActiveTab="contexto";
function historicalEntries(){
 var all=state.historicalDiary||{};
 return Object.keys(all).map(function(key){
  var parts=key.split(":");
  var book=books.find(function(b){return b.slug===parts[0];})||booksFallback.find(function(b){return b.slug===parts[0];});
  return {key:key,book:book,chapter:Number(parts[1]),data:all[key]};
 }).filter(function(row){return row.book&&row.data;});
}
function historicalMatches(row){
 var d=row.data, f=historicalFilters;
 if(f.book&&row.book.slug!==f.book)return false;
 if(f.period&&String(d.periodo||"")!==f.period)return false;
 if(f.theme&&!String(d.tema||"").toLocaleLowerCase("pt-BR").includes(f.theme.toLocaleLowerCase("pt-BR")))return false;
 if(f.type&&!String(d[f.type]||"").trim())return false;
 var text=[row.book.name,row.chapter,d.tema,d.periodo].concat(historicalTabs.map(function(x){return d[x[0]];})).join(" ").toLocaleLowerCase("pt-BR");
 return !f.term||text.includes(f.term.toLocaleLowerCase("pt-BR"));
}
function renderHistoricalDiary(){
 var key=state.book+":"+state.chapter,all=state.historicalDiary||{},entry=all[key]||{};
 var rows=historicalEntries().filter(historicalMatches);
 var bookOptions=books.map(function(b){return '<option value="'+esc(b.slug)+'"'+(historicalFilters.book===b.slug?' selected':'')+'>'+esc(b.name)+'</option>';}).join("");
 var periods=["Patriarcal","Êxodo e conquista","Juízes","Monarquia","Exílio","Pós-exílio","Período intertestamentário","Período de Jesus","Igreja primitiva","Outro / incerto"];
 var periodOptions=periods.map(function(p){return '<option'+(entry.periodo===p?' selected':'')+'>'+esc(p)+'</option>';}).join("");
 var filterPeriods=periods.map(function(p){return '<option'+(historicalFilters.period===p?' selected':'')+'>'+esc(p)+'</option>';}).join("");
 var tabs=historicalTabs.map(function(t){return '<button type="button" class="btn slim'+(historicalActiveTab===t[0]?' primary':'')+'" data-historical-tab="'+t[0]+'">'+esc(t[1])+'</button>';}).join("");
 MAIN.innerHTML='<div class="content">'+title("historico")+
 '<p class="subtitle">Pesquise seus estudos históricos, filtre os registros e organize as informações por passagem. Funciona offline; os registros são pessoais e salvos neste dispositivo.</p>'+
 '<div class="grid-2" style="grid-template-columns:minmax(0,1.7fr) minmax(260px,1fr);align-items:start;gap:16px">'+
 '<section class="card card-pad"><div class="panel-heading"><h2 class="section-heading">▣ '+esc(activeBook.name+" "+state.chapter)+'</h2><button class="btn slim" type="button" data-act="historico-go-reading">◫ Leitura</button></div>'+
 '<div class="row" style="display:flex;flex-wrap:wrap;gap:10px;margin:12px 0"><label>Tema<input class="field" data-historical-field="tema" placeholder="Ex.: Criação, aliança..." value="'+esc(entry.tema||"")+'"></label><label>Período<select class="field" data-historical-field="periodo"><option value="">Não definido</option>'+periodOptions+'</select></label></div>'+
 '<div class="row" style="display:flex;flex-wrap:wrap;gap:7px;margin:14px 0">'+tabs+'</div>'+
 '<label style="display:block"><strong>'+esc((historicalTabs.find(function(t){return t[0]===historicalActiveTab;})||historicalTabs[0])[1])+'</strong><textarea class="editor" style="display:block;width:100%;min-height:240px;margin-top:10px" data-historical-field="'+historicalActiveTab+'" placeholder="Escreva suas descobertas, datas, fontes e referências aqui…">'+esc(entry[historicalActiveTab]||"")+'</textarea></label>'+
 '<div class="tip" style="margin-top:14px">Salvamento automático. Registre as fontes consultadas; este diário não gera afirmações históricas automaticamente.</div>'+renderStudyActivity()+pbDevHistory()+'</section>'+
 '<aside class="card card-pad"><h2 class="section-heading">⌕ Pesquisa histórica</h2>'+
 '<label>Pesquisar palavra ou assunto<input class="field" id="historical-search" placeholder="Termo, tema ou passagem..." value="'+esc(historicalFilters.term)+'"></label>'+
 '<label style="display:block;margin-top:10px">Livro bíblico<select class="field" data-historical-filter="book"><option value="">Todos os livros</option>'+bookOptions+'</select></label>'+
 '<label style="display:block;margin-top:10px">Período histórico<select class="field" data-historical-filter="period"><option value="">Todos os períodos</option>'+filterPeriods+'</select></label>'+
 '<label style="display:block;margin-top:10px">Tema<input class="field" data-historical-filter="theme" placeholder="Todos os temas" value="'+esc(historicalFilters.theme)+'"></label>'+
 '<label style="display:block;margin-top:10px">Tipo de conteúdo<select class="field" data-historical-filter="type"><option value="">Todos os tipos</option>'+historicalTabs.map(function(t){return '<option value="'+t[0]+'"'+(historicalFilters.type===t[0]?' selected':'')+'>'+esc(t[1])+'</option>';}).join("")+'</select></label>'+
 '<div class="btn-row" style="margin:12px 0"><button class="btn primary" data-act="historico-search">Pesquisar</button><button class="btn" data-act="historico-clear">Limpar filtros</button></div>'+
 '<h3>Resultados ('+rows.length+')</h3><div id="historical-results" style="max-height:340px;overflow:auto">'+(rows.length?rows.map(function(r){return '<button type="button" class="btn" style="display:block;width:100%;text-align:left;margin:6px 0;white-space:normal" data-historical-open="'+esc(r.key)+'"><strong>'+esc(r.book.name+" "+r.chapter)+'</strong><small style="display:block">'+esc(r.data.tema||r.data.periodo||"Estudo salvo")+'</small></button>';}).join(""):'<p class="subtitle">Nenhum estudo encontrado. Preencha os campos para criar seu primeiro registro.</p>')+'</div></aside></div></div>';
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
/* Púlpito Bible 2.0 — isolated, backward-compatible study tools. */
var pb2Key="pulpito-bible-advanced-v1";
function pb2Read(){try{return JSON.parse(localStorage.getItem(pb2Key)||"{}")||{};}catch(e){return {};}}
function pb2Write(data){try{localStorage.setItem(pb2Key,JSON.stringify(data));return true;}catch(e){notify("Armazenamento cheio; exporte um backup.");return false;}}
function pb2Backup(){
 notify("Este backup inclui dados locais selecionados, mas NÃO inclui módulos ZIP/SQLite armazenados no IndexedDB.");
 var payload={format:"pulpito-bible-backup-v2",created:new Date().toISOString(),state:localStorage.getItem(STORE_KEY),advanced:localStorage.getItem(pb2Key),activity:localStorage.getItem("pulpito-bible-study-activity-v1")};
 var blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="pulpito-bible-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(function(){URL.revokeObjectURL(url);},2000);
}
function pb2SearchHistory(term){
 var q=String(term||"").trim().slice(0,120);if(!q)return;
 var d=pb2Read(),items=Array.isArray(d.searchHistory)?d.searchHistory:[];
 d.searchHistory=[{query:q,at:new Date().toISOString()}].concat(items.filter(function(x){return x&&x.query.toLocaleLowerCase("pt-BR")!==q.toLocaleLowerCase("pt-BR");})).slice(0,35);pb2Write(d);
}
var pb2CommentaryResults=[];
var pb2DictionaryResults=[];
var pb2SearchReader=null;
function pb2CloseSearchReader(){
 var reader=pb2SearchReader;
 if(!reader)return;
 pb2SearchReader=null;
 reader.root.remove();
 document.body.classList.remove("pb2-commentary-reader-open");
 var focus=reader.trigger.isConnected?reader.trigger:
  document.querySelector("["+reader.resultAttribute+'="'+reader.openedIndex+'"]');
 (focus||document.getElementById("pb2-query"))?.focus({preventScroll:true});
}
function pb2RenderSearchReader(reader){
 var root=reader.root,item=reader.items[reader.index];
 root.querySelector("#pb2-commentary-reader-module").textContent=item.module||reader.label;
 root.querySelector("#pb2-commentary-reader-reference").textContent=item.reference||"";
 root.querySelector("#pb2-commentary-reader-position").textContent=(reader.index+1)+" de "+reader.items.length;
 root.querySelector("#pb2-commentary-reader-text").textContent=item.text||"";
 root.querySelector('[data-pb2-reader-action="previous"]').disabled=reader.index===0;
 root.querySelector('[data-pb2-reader-action="next"]').disabled=reader.index===reader.items.length-1;
 root.querySelector("#pb2-commentary-reader-scroll").scrollTop=0;
}
function pb2OpenSearchReader(trigger){
 var dictionary=trigger.hasAttribute("data-pb2-dictionary-index");
 var resultAttribute=dictionary?"data-pb2-dictionary-index":"data-pb2-commentary-index";
 var items=dictionary?pb2DictionaryResults:pb2CommentaryResults;
 var index=Number(trigger.getAttribute(resultAttribute));
 if(!Number.isInteger(index)||index<0||index>=items.length)return;
 pb2CloseSearchReader();
 var root=document.createElement("div");
 var reader={root:root,items:items.slice(),index:index,openedIndex:index,trigger:trigger,resultAttribute:resultAttribute,label:dictionary?"Dicionário":"Comentário bíblico"};
 pb2SearchReader=reader;
 root.id="pb2-commentary-reader";
 root.className="modal-backdrop pb2-commentary-reader-backdrop";
 root.setAttribute("role","presentation");
 root.innerHTML='<section class="modal pb2-commentary-reader-dialog" role="dialog" aria-modal="true" aria-labelledby="pb2-commentary-reader-module">'+
  '<header class="pb2-commentary-reader-header"><div class="pb2-commentary-reader-heading"><span class="eyebrow">'+(dictionary?"LEITURA DO VERBETE":"LEITURA DO COMENTÁRIO")+'</span><h2 id="pb2-commentary-reader-module"></h2><p id="pb2-commentary-reader-reference"></p></div><button type="button" class="btn slim" data-pb2-reader-action="close" aria-label="Fechar leitor">✕</button></header>'+
  '<div class="pb2-commentary-reader-scroll" id="pb2-commentary-reader-scroll" tabindex="0"><div class="pb2-commentary-reader-text" id="pb2-commentary-reader-text"></div></div>'+
  '<footer class="pb2-commentary-reader-footer"><span id="pb2-commentary-reader-position" aria-live="polite"></span><div class="pb2-commentary-reader-nav"><button type="button" class="btn" data-pb2-reader-action="previous">← Anterior</button><button type="button" class="btn primary" data-pb2-reader-action="next">Próximo →</button></div></footer>'+
 '</section>';
 root.addEventListener("click",function(event){
  if(event.target===root){pb2CloseSearchReader();return;}
  var action=event.target.closest("[data-pb2-reader-action]")?.dataset.pb2ReaderAction;
  if(action==="close"){pb2CloseSearchReader();return;}
  if(action!=="previous"&&action!=="next")return;
  var next=reader.index+(action==="previous"?-1:1);
  if(next<0||next>=reader.items.length)return;
  reader.index=next;
  pb2RenderSearchReader(reader);
 });
 root.addEventListener("keydown",function(event){
  if(event.key==="Escape"){event.preventDefault();pb2CloseSearchReader();}
 });
 document.body.appendChild(root);
 document.body.classList.add("pb2-commentary-reader-open");
 pb2RenderSearchReader(reader);
 root.querySelector('[data-pb2-reader-action="close"]').focus();
}
document.addEventListener("click",function(event){
 var result=event.target.closest?.("[data-pb2-commentary-index],[data-pb2-dictionary-index]");
 if(!result)return;
 event.preventDefault();
 pb2OpenSearchReader(result);
});
function pb2CommentaryReference(item){
 var book=(books.find(function(b){return b.slug===item.book;})||booksFallback.find(function(b){return b.slug===item.book;})||activeBook).name;
 var first=Number(item.fromChapter||0),last=Number(item.toChapter||first);
 var from=Number(item.fromVerse||0),to=Number(item.toVerse||0);
 if(!first)return book+" · introdução";
 var label=book+" "+first+(from?":"+from:"");
 if(last>first)label+="–"+last+(to?":"+to:"");
 else if(to&&to!==from)label+="–"+to;
 return label;
}
function pb2CommentaryExcerpt(text,term){
 var source=String(text||""),normalize=function(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");};
 var index=normalize(source).indexOf(normalize(term));
 if(index<0)return source.slice(0,360)+(source.length>360?"…":"");
 var start=Math.max(0,index-105),end=Math.min(source.length,index+String(term||"").length+210);
 return (start?"…":"")+source.slice(start,end)+(end<source.length?"…":"");
}
async function pb2RelatedCommentaries(term,active){
 var pattern=bibleSearchPattern(term.trim().replace(/\s+/g," "));
 var modules=window.PBModules,installed=modules.getInstalled().filter(function(m){return m.type==="bible";});
 var versions=installed.map(function(m){return "local:"+m.id;});
 if(versions.includes(state.version))versions=[state.version].concat(versions.filter(function(v){return v!==state.version;}));
 var seen=new Set(),results=[],referencesChecked=0;
 for(var version of versions){
  if(!active()||results.length>=25||referencesChecked>=50)break;
  var chapters=await modules.getBibleSearchChapters(version);
  for(var chapter of chapters){
   if(!active()||results.length>=25||referencesChecked>=50)break;
   var matches=(chapter.verses||[]).flatMap(function(verse,index){
    var text=typeof verse==="string"?verse:verse?.text||verse?.content||"";
    var plain=text.replace(/<s>[^<]*<\/s>|<[^>]*>/gi,"");
    pattern.lastIndex=0;
    if(!plain.includes("&")&&!pattern.test(plain))return [];
    pattern.lastIndex=0;
    return pattern.test(bibleSearchText(text))?[Number(verse.number||verse.verse)||index+1]:[];
   });
   for(var verse of matches){
    if(!active()||results.length>=25||referencesChecked>=50)break;
    var ref=[chapter.book,chapter.chapter,verse].join("/");
    if(seen.has(ref))continue;
    seen.add(ref);
    referencesChecked++;
    var found=await modules.getCommentaries(chapter.book,chapter.chapter,verse);
    found.forEach(function(item){
     if(results.length>=25)return;
     var key=JSON.stringify([item.moduleId,chapter.book,item.fromChapter,item.fromVerse,item.toChapter,item.toVerse,item.text]);
     if(seen.has(key))return;
     seen.add(key);
     results.push(Object.assign({},item,{book:chapter.book,relatedVerse:verse,relatedChapter:chapter.chapter}));
    });
   }
  }
 }
 return results;
}
async function pb2SearchCommentaries(term,token){
 var el=document.getElementById("pb2-commentary-results");if(!el)return;
 pb2CommentaryResults=[];
 function active(){return token===pb2SearchToken&&el===document.getElementById("pb2-commentary-results");}
 function paint(result,pending){
  if(!active())return;
  pb2CommentaryResults=result.results.map(function(item){
   return Object.assign({},item,{module:item.moduleName,reference:pb2CommentaryReference(item)});
  });
  var related=result.related===true;
  var heading=related?'<p class="subtitle">Comentários sobre passagens em que a Bíblia instalada usa “'+esc(term)+'”.</p>':
   '<p class="subtitle">'+(pending?'Pesquisando… ':'')+result.total+' resultado(s) · '+result.modulesSearched+' módulo(s) pesquisado(s) · '+result.scanned+' registro(s) consultado(s).</p>';
  var groups=new Map();
  pb2CommentaryResults.forEach(function(item,index){
   if(!groups.has(item.moduleId))groups.set(item.moduleId,{name:item.module,items:[]});
   var matchReference=related?pb2CommentaryReference({
    book:item.book,fromChapter:item.relatedChapter,fromVerse:item.relatedVerse
   }):"";
   var label=related?'Palavra encontrada em '+esc(matchReference):'Correspondência no comentário';
   groups.get(item.moduleId).items.push(
    '<button type="button" class="pb2-commentary-result" data-pb2-commentary-index="'+index+'" aria-label="Abrir comentário '+esc(item.module)+' em '+esc(item.reference)+'">'+
     '<strong>'+esc(item.reference)+'</strong>'+
     '<span class="pb2-commentary-result-preview">'+esc(pb2CommentaryExcerpt(item.text,term))+'</span>'+
     '<span class="pb2-commentary-result-hint">'+label+' · Ler comentário completo →</span></button>');
  });
  var cards=Array.from(groups.values()).map(function(group){
   return '<section class="pb2-original-language-section"><h3>'+esc(group.name)+'</h3>'+group.items.join("")+'</section>';
  }).join("");
  var empty=pending?"":'<p class="subtitle">Nenhum comentário encontrado para “'+esc(term)+'”.</p>';
  var more=result.total>pb2CommentaryResults.length?'<p class="subtitle">Exibindo os primeiros '+pb2CommentaryResults.length+' resultados de '+result.total+'.</p>':"";
  el.innerHTML=heading+(cards||empty)+more;
 }
 el.innerHTML='<p class="subtitle">Pesquisando “'+esc(term)+'” nos comentários instalados…</p>';
 try{
  var result=await window.PBModules.searchCommentaries(term,100,active,function(progress){paint(progress,true);});
  if(!active())return;
  if(!result.modulesSearched){
   el.textContent="Nenhum comentário bíblico instalado neste dispositivo.";
   return;
  }
  if(!result.total){
   el.textContent="Verificando comentários das passagens que contêm a palavra pesquisada…";
   var related=await pb2RelatedCommentaries(term,active);
   if(related.length){paint(Object.assign({},result,{results:related,total:related.length,related:true}),false);return;}
  }
  paint(result,false);
 }catch(error){
  if(active())el.textContent="Não foi possível pesquisar os comentários instalados: "+error.message;
 }
}
function pb2DictionaryResult(entry,term){
 var index=pb2DictionaryResults.length;
 pb2DictionaryResults.push({module:entry.moduleName,reference:entry.topic,text:entry.definition});
 var preview=pb2CommentaryExcerpt(entry.definition,term);
 return '<button type="button" class="pb2-commentary-result" data-pb2-dictionary-index="'+index+'" aria-label="Ler '+esc(entry.topic)+' em '+esc(entry.moduleName)+'">'+
  '<strong>'+esc(entry.moduleName)+'</strong><span class="pb2-commentary-result-reference">'+esc(entry.topic)+'</span>'+
  '<span class="pb2-commentary-result-preview">'+esc(preview)+'</span>'+
  '<span class="pb2-commentary-result-hint">Ler verbete completo →</span></button>';
}
async function pb2SearchOriginalLanguages(term,token){
 var el=document.getElementById("pb2-original-results"),pt="";if(!el)return;
 el.innerHTML='<p class="subtitle">Etapa 1/3 · Consultando primeiro os dicionários em português…</p>';
 try{
  var portuguese=await window.PBModules.getPortugueseDictionaryEntries(term);
  if(token!==pb2SearchToken)return;
  el=document.getElementById("pb2-original-results");if(!el)return;
  pt='<section class="pb2-original-language-section"><h3>1. Português · dicionários instalados</h3>'+
   (portuguese.length?portuguese.map(function(entry){
    return pb2DictionaryResult(entry,term);
   }).join(""):'<p class="subtitle">Nenhum verbete em português foi encontrado nos dicionários instalados. A pesquisa continuará nos textos bíblicos alinhados ao Strong.</p>')+'</section>';
  el.innerHTML=pt+'<p class="subtitle">Etapa 2/3 · Procurando agora os termos gregos e hebraicos associados à palavra nas Bíblias instaladas…</p>';
  var originals=await window.PBModules.getOriginalTermsForWord(term);
  if(token!==pb2SearchToken)return;
  el=document.getElementById("pb2-original-results");if(!el)return;
  var codes=originals.map(function(item){return item.code;});
  var lexical=[];
  for(var offset=0;offset<codes.length;offset+=8){
   var batch=await Promise.all(codes.slice(offset,offset+8).map(function(code){return window.PBModules.getDictionaryEntry(code);}));
   lexical=lexical.concat(batch);
   if(token!==pb2SearchToken)return;
  }
  var byCode=new Map(codes.map(function(code,i){return [code,lexical[i]||[]];}));
  function renderLanguage(language,title){
   var list=originals.filter(function(item){return item.language===language;});
   if(!list.length)return '<section class="pb2-original-language-section"><h3>'+title+'</h3><p class="subtitle">Nenhuma ocorrência correspondente foi encontrada nas Bíblias instaladas com marcações Strong.</p></section>';
   return '<section class="pb2-original-language-section"><h3>'+title+'</h3>'+list.map(function(item){
    var refs=item.references.map(function(r){
     var book=(books.find(function(b){return b.slug===r.book;})||booksFallback.find(function(b){return b.slug===r.book;})||{}).name||r.book;
     return '<button type="button" class="btn slim" data-ref-open="'+esc(book+" "+r.chapter+":"+r.verse)+'">'+esc(book+" "+r.chapter+":"+r.verse)+'</button>';
    }).join("");
    var lex=byCode.get(item.code)||[];
    var lexHtml=lex.length?lex.map(function(entry){
     return pb2DictionaryResult(entry,item.code);
    }).join(""):'<p class="subtitle">O código foi encontrado no texto bíblico, mas nenhum dicionário Strong instalado possui este verbete. Instale um léxico grego/hebraico compatível para consultar a definição.</p>';
    return '<article class="pb2-original-term"><header><strong class="pb2-original-script" '+(language==="hebrew"?'dir="rtl"':'')+'>'+esc(item.code)+'</strong><span>'+esc(item.count)+' ocorrência(s) alinhada(s)</span></header>'+
     '<p class="subtitle">Encontrado em: '+esc(item.translations.join(", "))+'</p><div class="pb2-original-references">'+refs+'</div>'+lexHtml+'</article>';
   }).join("")+'</section>';
  }
  var greek=renderLanguage("greek","2. Grego · Novo Testamento");
  var hebrew=renderLanguage("hebrew","3. Hebraico · Antigo Testamento");
  var caveat=originals.length?'':'<p class="subtitle">Não foi possível identificar equivalentes originais porque nenhuma das Bíblias instaladas apresentou marcações Strong alinhadas à palavra pesquisada. O sistema não inventará traduções nem atribuirá códigos sem evidência textual.</p>';
  el.innerHTML=pt+greek+hebrew+caveat+'<p class="pb2-original-note">Método: primeiro consulta os dicionários em português; depois identifica os códigos Strong vinculados às palavras nos textos bíblicos instalados e consulta os léxicos gregos e hebraicos disponíveis. Uma palavra portuguesa pode corresponder a vários lemas originais.</p>';
 }catch(error){
  if(token===pb2SearchToken){el=document.getElementById("pb2-original-results");if(el)el.innerHTML=pt+'<p class="subtitle">Não foi possível concluir a pesquisa linguística: '+esc(error.message)+'</p>';}
 }
}
document.addEventListener("submit",function(e){if(e.target&&e.target.id==="pb2-search-form"){e.preventDefault();var d=pb2Read();d.query=(document.getElementById("pb2-query").value||"").trim();d.filter=document.getElementById("pb2-filter").value;pb2Write(d);pb2SearchHistory(d.query);pb2RenderSearch();}});
var pb2SearchToken=0;
function pb2RenderSearch(){
 pb2CloseSearchReader();
 pb2DictionaryResults=[];
 var token=++pb2SearchToken;
 var db=pb2Read(),query=String(db.query||""),q=query.toLocaleLowerCase("pt-BR"),filter=db.filter||"todos";
 var entries=[];
 (Array.isArray(state.notes)?state.notes:Object.values(state.notes||{})).forEach(function(n){if(!n||typeof n!=="object")return;entries.push({type:"notas",title:n.ref||"Anotação",body:n.text||n.content||""});});
 Object.keys(state.historicalDiary||{}).forEach(function(k){var d=state.historicalDiary[k];entries.push({type:"historico",title:k,body:Object.values(d||{}).join(" ")});});
 (db.sermons||[]).forEach(function(x){entries.push({type:"sermoes",title:x.title||"Sermão",body:Object.values(x).join(" ")});});
 (db.plans||[]).forEach(function(x){entries.push({type:"planos",title:x.title||"Plano",body:(x.references||[]).join(" ")});});
 var activity=studyActivity();(Array.isArray(activity)?activity:[]).forEach(function(x){entries.push({type:"historico",title:x.label,body:x.detail||""});});
 var rows=q?entries.filter(function(x){return [x.title,x.body].join(" ").toLocaleLowerCase("pt-BR").includes(q)&&(filter==="todos"||x.type===filter);}).slice(0,100):[];
 var history=Array.isArray(db.searchHistory)?db.searchHistory:[];
 MAIN.innerHTML='<div class="content">'+title("pesquisa")+
 '<div class="card card-pad"><h2>Pesquisa inteligente</h2><form id="pb2-search-form" style="display:flex;gap:8px;align-items:center"><input id="pb2-query" class="field" type="search" style="flex:1;min-width:0;border-radius:28px" value="'+esc(query)+'" placeholder="Pesquise palavras, assuntos, passagens..." aria-label="Termo da pesquisa"><button class="btn primary" type="submit" aria-label="Pesquisar">🔍 Pesquisar</button></form>'+
 '<label>Pesquisar em <select id="pb2-filter" class="field">'+["todos","notas","historico","sermoes","planos"].map(function(x){return '<option value="'+x+'"'+(filter===x?' selected':'')+'>'+esc(x)+'</option>';}).join("")+'</select></label>'+
 (q?'<p><a href="#pb2-commentary-section">Ver resultados dos comentários</a></p>':'')+
 '<div class="btn-row"><button class="btn" data-act="pb2-open-bible-search">🔍 Pesquisar textos bíblicos</button><button class="btn" data-act="pb2-backup">Exportar backup</button></div>'+
 '<h3>Histórico de pesquisas</h3><div class="btn-row" style="flex-wrap:wrap">'+history.slice(0,12).map(function(x){return '<button class="btn slim" data-pb2-search-history="'+esc(x.query)+'">🕘 '+esc(x.query)+'</button>';}).join("")+(history.length?'<button class="btn slim" data-act="pb2-search-clear">Limpar histórico</button>':'<p class="subtitle">Nenhuma pesquisa recente.</p>')+'</div></div>'+
 (q?'<div class="card card-pad" style="margin-top:12px"><h3>Meus estudos ('+rows.length+')</h3>'+rows.map(function(x){return '<div class="card card-pad" style="margin:8px 0"><strong>'+esc(x.title)+'</strong><small> · '+esc(x.type)+'</small><p>'+esc(String(x.body).slice(0,250))+'</p></div>';}).join("")+'</div>'+
 '<div class="card card-pad" style="margin-top:12px"><h2>Significado e idiomas originais</h2><p class="subtitle">A pesquisa segue esta ordem: português, grego e hebraico. Os resultados originais são vinculados aos códigos Strong encontrados nas Bíblias instaladas.</p><div id="pb2-original-results"></div></div>'+
 '<div id="pb2-commentary-section" class="card card-pad" style="margin-top:12px;scroll-margin-top:110px"><h2>Comentários bíblicos instalados</h2><p class="subtitle">A mesma palavra é procurada no conteúdo completo de todos os comentários instalados, independentemente do livro ou capítulo aberto.</p><div id="pb2-commentary-results"></div></div>':
 '<p class="subtitle">Digite um termo e toque na lupa para pesquisar. Seu histórico fica salvo apenas neste dispositivo.</p>')+'</div>';
 if(q){pb2SearchOriginalLanguages(query,token);pb2SearchCommentaries(query,token);}
}
/* Independent devotional module store: no changes to existing Bible/module DB. */
var pbDevDBPromise=null;
function pbDevDB(){
 if(pbDevDBPromise)return pbDevDBPromise;
 pbDevDBPromise=new Promise(function(resolve,reject){
  var req=indexedDB.open("pulpito-devotional-modules-v1",1);
  req.onupgradeneeded=function(){var db=req.result;if(!db.objectStoreNames.contains("modules"))db.createObjectStore("modules",{keyPath:"id"});};
  req.onsuccess=function(){resolve(req.result);};req.onerror=function(){reject(req.error);};
 }).catch(function(e){pbDevDBPromise=null;throw e;});return pbDevDBPromise;
}
async function pbDevAll(){
 var db=await pbDevDB();return new Promise(function(resolve,reject){
  var req=db.transaction("modules","readonly").objectStore("modules").getAll();
  req.onsuccess=function(){resolve(req.result||[]);};req.onerror=function(){reject(req.error);};
 });
}
async function pbDevSave(module){
 var db=await pbDevDB();return new Promise(function(resolve,reject){
  var tx=db.transaction("modules","readwrite");tx.objectStore("modules").put(module);
  tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error);};
 });
}
async function pbDevRemove(id){
 var db=await pbDevDB();return new Promise(function(resolve,reject){
  var tx=db.transaction("modules","readwrite");tx.objectStore("modules").delete(id);
  tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error);};
 });
}
function pbDevNormalize(raw){
 if(!raw||raw.format!=="pulpito-devotional-v1"||!Array.isArray(raw.entries)||!raw.title)throw Error("Formato inválido. Use pulpito-devotional-v1 com title e entries.");
 if(raw.entries.length>5000)throw Error("Módulo grande demais (limite de 5.000 devocionais).");
 var entries=raw.entries.map(function(x){
  if(x.day!==undefined){var day=Number(x.day),dailyText=String(x.text||"").trim();if(!Number.isInteger(day)||day<1||day>366||!dailyText)throw Error("Devocional diário inválido.");return {day:day,title:String(x.title||"Dia "+day).slice(0,180),text:dailyText.slice(0,32000)};}
  var book=books.find(function(b){return b.slug===x.book||b.name.toLocaleLowerCase("pt-BR")===String(x.book||"").toLocaleLowerCase("pt-BR");});
  var chapter=Number(x.chapter),text=String(x.text||"").trim();
  if(!book||!Number.isInteger(chapter)||chapter<1||chapter>book.chapters||!text)throw Error("Devocional com livro, capítulo ou texto inválido.");
  return {book:book.slug,chapter:chapter,title:String(x.title||"Reflexão").slice(0,180),text:text.slice(0,16000),prayer:String(x.prayer||"").slice(0,4000),application:String(x.application||"").slice(0,4000)};
 });
 return {id:String(raw.id||"dev-"+Date.now()).slice(0,100),title:String(raw.title).slice(0,160),author:String(raw.author||"").slice(0,160),license:String(raw.license||"Não informada").slice(0,200),entries:entries,installedAt:new Date().toISOString()};
}

/* Devotional format routing: ZIP/SQLite3 from MyBible and Pulpito JSON.
 * Only installed on this device, not bundled or redistributed. */
async function pbDevDecodeFile(file){
 var name=String(file.name||"").toLowerCase();
 if(name.endsWith(".json"))return pbDevNormalize(JSON.parse(await file.text()));
 var binary,sourceName=file.name;
 if(name.endsWith(".zip")){
  if(file.size>70*1024*1024)throw Error("ZIP excede 70 MB.");
  if(!window.JSZip)throw Error("Leitor ZIP indisponível. Verifique a conexão.");
  var zip=await JSZip.loadAsync(file,{checkCRC32:true});
  var entries=Object.values(zip.files).filter(function(e){return !e.dir;});
  var embeddedJson=entries.find(function(e){return /\.json$/i.test(e.name)&&!/(?:^|\/)(?:manifest|module)\.json$/i.test(e.name);});
  var sqlite=entries.find(function(e){return /\.(?:sqlite3?|db)$/i.test(e.name);});
  if(sqlite){
   if((sqlite._data&&sqlite._data.uncompressedSize||0)>30*1024*1024)throw Error("Devocional SQLite excede 30 MB.");
   binary=await sqlite.async("uint8array");sourceName=sqlite.name;
  }else if(embeddedJson){
   return pbDevNormalize(JSON.parse(await embeddedJson.async("string")));
  }else throw Error("ZIP sem SQLite de devocionais ou JSON compatível.");
 }else if(/\.(?:sqlite3?|db)$/.test(name)){
  if(file.size>30*1024*1024)throw Error("Devocional SQLite excede 30 MB.");
  binary=new Uint8Array(await file.arrayBuffer());
 }else throw Error("Formato de devocional não reconhecido.");
 if(!window.initSqlJs)throw Error("Leitor SQLite indisponível. Verifique a conexão.");
 var SQL=await window.initSqlJs({locateFile:function(f){return "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/"+f;}});
 var db=new SQL.Database(binary);
 try{
  var tables=db.exec("SELECT name FROM sqlite_master WHERE type='table'"),names=(tables[0]&&tables[0].values||[]).map(function(r){return String(r[0]).toLowerCase();});
  if(!names.includes("devotions"))throw Error("Este SQLite não contém a tabela devotions.");
  var columns=db.exec("PRAGMA table_info(devotions)"),cols=(columns[0]&&columns[0].values||[]).map(function(r){return String(r[1]).toLowerCase();});
  if(!cols.includes("day")||!cols.includes("devotion"))throw Error("A tabela devotions precisa das colunas day e devotion.");
  var title=sourceName.split("/").pop().replace(/\.devotions\.sqlite3?$/i,"").replace(/\.sqlite3?$/i,"").replace(/\.db$/i,"");
  if(names.includes("info")){
   var info=db.exec("SELECT name,value FROM info");
   (info[0]&&info[0].values||[]).forEach(function(row){if(String(row[0]).toLowerCase()==="description"&&row[1])title=String(row[1]);});
  }
  var rows=db.exec("SELECT day, devotion FROM devotions ORDER BY day");
  var entries=(rows[0]&&rows[0].values||[]).map(function(row){
   var day=Number(row[0]),markup=String(row[1]||"");
   var doc=new DOMParser().parseFromString(markup,"text/html");
   doc.querySelectorAll("script,style,iframe,object,embed").forEach(function(n){n.remove();});
   var body=String(doc.body&&doc.body.textContent||"").replace(/\u00a0/g," ").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
   return {day:day,title:"Dia "+day,text:body};
  });
  var module=pbDevNormalize({format:"pulpito-devotional-v1",id:"mybible-dev-"+title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").slice(0,65),title:title,author:"",license:"Verifique os direitos do arquivo original",entries:entries});
  return module;
 }finally{db.close();}
}
async function pbDevInstallFile(file){
 var module=await pbDevDecodeFile(file);
 var existing=(await pbDevAll()).find(function(m){return m.id===module.id;});
 if(existing&&!window.confirm('Substituir o devocional "'+module.title+'" já instalado?'))return null;
 await pbDevSave(module);
 return module;
}
async function pbDevIsModule(file){
 var name=String(file.name||"").toLowerCase();
 if(name.endsWith(".json")){
  if(file.size>10*1024*1024)return false;
  try{var j=JSON.parse(await file.text());return j&&j.format==="pulpito-devotional-v1";}catch(e){return false;}
 }
 if(name.endsWith(".zip")){
  if(file.size>70*1024*1024||!window.JSZip)return false;
  var zip=await JSZip.loadAsync(file,{checkCRC32:true});
  return Object.keys(zip.files).some(function(n){return /\.devotions\/.*\.sqlite3?$/i.test(n)||/\.devotions\.sqlite3?$/i.test(n);});
 }
 if(/\.(?:sqlite3?|db)$/.test(name))return /\.devotions\./i.test(name);
 return false;
}

window.PBDevBridge={isModule:pbDevIsModule,installFile:pbDevInstallFile,list:pbDevAll};
async function pbDevImport(file){
 if(!file)return;
 try{
  var module=await pbDevDecodeFile(file);
  if(!window.confirm('Importar "'+module.title+'"? Confirme que possui direito de utilizar este conteúdo.'))return;
  var existing=(await pbDevAll()).find(function(x){return x.id===module.id;});
  if(existing&&!window.confirm("Módulo já instalado. Substituir apenas este devocional?"))return;
  await pbDevSave(module);notify("Devocional instalado: "+module.title);pb2RenderPlans();
 }catch(error){notify("Erro no devocional: "+error.message);var area=document.getElementById("pb-dev-module-list");if(area)area.textContent="Falha: "+error.message;}
}
var pbDevSelection=null;
function pbDevEntryKey(module,entry,index){
 return JSON.stringify([module.id,index,entry.day||0,entry.book||"",entry.chapter||0,entry.title]);
}
function pbDevOpenButton(module,entry,index){
 return '<button type="button" class="btn slim" data-act="pb-dev-open" data-dev-id="'+esc(module.id)+'" data-dev-key="'+esc(pbDevEntryKey(module,entry,index))+'">Ler '+esc(entry.title)+'</button>';
}
function pbDevOpen(moduleId,key){
 state.devotionalReader={moduleId:moduleId,key:key||"",back:["historico","leitura","paineis"].includes(state.page)?state.page:"planos"};
 page("devocional");
}
function pbDevEntryText(entry){
 return [entry.text,entry.prayer&&"Oração\n"+entry.prayer,entry.application&&"Aplicação\n"+entry.application].filter(Boolean).join("\n\n");
}
function pbDevEntryMarks(record,text){
 return (record?.marks||[]).filter(function(mark){return text.slice(mark.start,mark.end)===mark.quote;});
}
function pbDevMarkedText(text,marks){
 var cursor=0,html="";
 marks.forEach(function(mark){
  html+=esc(text.slice(cursor,mark.start))+'<mark style="background:'+TS.COLORS.yellow+';color:#1b3032">'+esc(mark.quote)+'</mark>';
  cursor=mark.end;
 });
 return html+esc(text.slice(cursor));
}
function pbDevMarkRange(marks,selection,text){
 var start=selection.start,end=selection.end;
 var result=marks.filter(function(mark){
  if(mark.end<start||mark.start>end)return true;
  start=Math.min(start,mark.start);end=Math.max(end,mark.end);
  return false;
 });
 result.push({start:start,end:end,quote:text.slice(start,end)});
 return result.sort(function(a,b){return a.start-b.start;});
}
function pbDevRecord(module,entry,key){
 var db=pb2Read(),history=db.devotionalHistory||[],record=history.find(function(item){return item.key===key;});
 if(!record||Date.now()-Date.parse(record.at)>60000){
  record=Object.assign({},record,{key:key,moduleId:module.id,moduleTitle:module.title,title:entry.title,at:new Date().toISOString()});
  db.devotionalHistory=[record].concat(history.filter(function(item){return item.key!==key;}));
  pb2Write(db);
 }
 return record;
}
function pbDevHistory(){
 var history=pb2Read().devotionalHistory||[];
 return '<section class="card card-pad" style="margin-top:16px"><h2 class="section-heading">Histórico dos devocionais</h2>'+
 (history.length?history.slice().sort(function(a,b){return b.at.localeCompare(a.at);}).map(function(item){
  return '<div style="margin:12px 0"><strong>'+esc(item.title)+'</strong><p class="subtitle">'+esc(item.moduleTitle)+' · '+esc(new Date(item.at).toLocaleString("pt-BR"))+'</p>'+
   (item.marks||[]).map(function(mark){return '<blockquote>'+esc(mark.quote)+'</blockquote>';}).join("")+
   '<button type="button" class="btn slim" data-act="pb-dev-open" data-dev-id="'+esc(item.moduleId)+'" data-dev-key="'+esc(item.key)+'">Reabrir leitura</button></div>';
 }).join(""):'<p class="subtitle">Os devocionais que você abrir aparecem aqui.</p>')+'</section>';
}
async function pbDevRenderReader(){
 var view=state.devotionalReader||{};
 pbDevSelection=null;
 MAIN.innerHTML='<div class="content">'+title("devocional")+'<div class="btn-row"><button type="button" class="btn" data-page="'+(["historico","leitura","paineis"].includes(view.back)?view.back:"planos")+'">Voltar</button><button type="button" class="btn" data-page="historico">Diário</button></div><div id="pb-dev-reader" class="card card-pad" style="margin-top:12px" aria-live="polite">Carregando devocional...</div></div>';
 var host=document.getElementById("pb-dev-reader");
 try{
  var modules=await pbDevAll();
  if(host!==document.getElementById("pb-dev-reader"))return;
  var module=modules.find(function(item){return item.id===view.moduleId;});
  if(!module?.entries.length){host.textContent="Este devocional não está disponível neste dispositivo.";return;}
  var keys=module.entries.map(function(entry,index){return pbDevEntryKey(module,entry,index);});
  var now=new Date(),today=Math.floor((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-Date.UTC(now.getFullYear(),0,1))/86400000)+1;
  var index=view.key?keys.indexOf(view.key):Math.max(0,module.entries.findIndex(function(item){return item.day===today;}));
  if(index<0){host.textContent="Esta leitura não está disponível na versão instalada do devocional.";return;}
  var entry=module.entries[index],key=keys[index],reading=pbDevEntryText(entry);
  view.key=key;
  persist();
  var record=pbDevRecord(module,entry,key);
  host.innerHTML='<h2>'+esc(entry.title)+'</h2><p class="subtitle">'+esc(module.title)+'</p>'+
   '<label>Leitura<select class="field" id="pb-dev-entry">'+module.entries.map(function(item,i){
    return '<option value="'+esc(keys[i])+'"'+(i===index?' selected':'')+'>'+esc(item.title)+(item.day?' · Dia '+item.day:'')+'</option>';
   }).join("")+'</select></label>'+
   '<p class="subtitle">Selecione um trecho para marcar ou copiar.</p><div class="btn-row">'+
   '<button type="button" class="btn primary" data-act="pb-dev-mark">Marcar trecho</button>'+
   '<button type="button" class="btn" data-act="pb-dev-copy">Copiar texto</button></div>'+
   '<div id="pb-dev-text" style="white-space:pre-wrap;overflow-wrap:anywhere;user-select:text;font-size:var(--reading-size);line-height:1.65;margin-top:12px">'+pbDevMarkedText(reading,pbDevEntryMarks(record,reading))+'</div>';
 }catch(error){if(host===document.getElementById("pb-dev-reader"))host.textContent="Não foi possível abrir o devocional.";}
}
function pbDevReadSelection(){
 var body=document.getElementById("pb-dev-text"),selection=window.getSelection();
 if(!body||!selection?.rangeCount||selection.isCollapsed)return null;
 var range=selection.getRangeAt(0);
 if(!body.contains(range.startContainer)||!body.contains(range.endContainer))return null;
 var prefix=range.cloneRange();
 prefix.selectNodeContents(body);
 prefix.setEnd(range.startContainer,range.startOffset);
 var start=prefix.toString().length;
 return {start:start,end:start+range.toString().length};
}
async function pbDevReaderAction(action){
 var body=document.getElementById("pb-dev-text");
 if(!body)return;
 var text=body.textContent,selection=pbDevReadSelection()||pbDevSelection;
 pbDevSelection=null;
 if(action==="pb-dev-copy"){
  try{
   await navigator.clipboard.writeText(selection?text.slice(selection.start,selection.end):text);
   notify("Texto copiado.");
  }catch(error){notify("Não foi possível copiar o texto.");}
  return;
 }
 if(!selection||selection.end<=selection.start){notify("Selecione um trecho para marcar.");return;}
 var db=pb2Read(),record=(db.devotionalHistory||[]).find(function(item){return item.key===state.devotionalReader.key;});
 if(!record){notify("Não foi possível salvar a marcação.");return;}
 record.marks=pbDevMarkRange(pbDevEntryMarks(record,text),selection,text);
 if(pb2Write(db)){
  window.getSelection()?.removeAllRanges();
  body.innerHTML=pbDevMarkedText(text,record.marks);
  notify("Trecho marcado e salvo no Diário.");
 }
}
async function pbDevPaint(){
 var holder=document.getElementById("pb-dev-module-list");if(!holder)return;
 try{
  var modules=await pbDevAll();if(holder!==document.getElementById("pb-dev-module-list"))return;
  holder.innerHTML=modules.length?modules.map(function(m){return '<div style="margin:8px 0"><strong>'+esc(m.title)+'</strong> · '+esc(m.author||"Autor não informado")+' · '+m.entries.length+(m.entries.some(function(e){return e.day;})?' dias':' capítulos')+' <button class="btn slim" data-act="pb-dev-open" data-dev-id="'+esc(m.id)+'">Ler devocional</button></div>';}).join(""):'<p class="subtitle">Nenhum devocional instalado. Vá a Módulos → Instalar arquivos para adicionar um ZIP, SQLite3 ou JSON.</p>';
  var today=document.getElementById("pb-dev-today");
  if(today){
   var now=new Date(),day=Math.floor((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-Date.UTC(now.getFullYear(),0,1))/86400000)+1;
   var daily=modules.flatMap(function(module){
    return module.entries.flatMap(function(entry,index){
     return entry.day===day?['<p><strong>'+esc(module.title)+'</strong> '+pbDevOpenButton(module,entry,index)+'</p>']:[];
    });
   });
   today.innerHTML=daily.join("")||"Nenhum devocional diário instalado para hoje.";
  }
  pbPlanPaintDevotionals(modules);
  document.querySelectorAll("[data-pb-dev-content]").forEach(function(target){
   var book=target.dataset.book,chapter=Number(target.dataset.chapter);
   var found=modules.flatMap(function(module){
    return module.entries.flatMap(function(entry,index){
     return entry.book===book&&entry.chapter===chapter?[pbDevOpenButton(module,entry,index)]:[];
    });
   });
   target.innerHTML=found.join(" ")||'<small>Sem devocional instalado para este capítulo.</small>';
  });
 }catch(error){
  if(holder!==document.getElementById("pb-dev-module-list"))return;
  holder.textContent="Não foi possível abrir os módulos devocionais: "+error.message;
  document.querySelectorAll("[data-pb-plan-picker], [data-pb-plan-reading]").forEach(function(target){
   target.textContent="Não foi possível carregar os devocionais instalados.";
  });
 }
}
var pbPlanSelectedDays=new Map();
var pbPlanScopes={book:"Um livro",old:"Antigo Testamento",new:"Novo Testamento",bible:"Bíblia inteira"};
var pbPlanDayMs=86400000;
var pbPlanMoments=[
 {id:"morning",label:"Manhã",reflection:"Leia a passagem do dia. O que ela revela sobre Deus? Escolha uma atitude concreta para colocar em prática hoje.",prayer:"Senhor, abre meu entendimento e ajuda-me a viver hoje o que aprendo na tua Palavra."},
 {id:"evening",label:"Noite",reflection:"Releia a passagem. Em que momento ela orientou sua atitude hoje? O que você quer entregar a Deus antes de descansar?",prayer:"Senhor, obrigado pelo cuidado de hoje. Perdoa minhas falhas e ajuda-me a guardar tua Palavra no coração."}
];
function pbPlanPace(value){
 return Math.min(20,Math.max(1,Math.floor(Number(value)||1)));
}
function pbPlanDays(plan){
 var refs=plan.references||[],pace=pbPlanPace(plan.pace);
 var duration=plan.durationDays;
 var fixed=refs.length&&Number.isSafeInteger(duration)&&duration>0;
 var length=fixed?duration:Math.ceil(refs.length/pace);
 return {length:length,at:function(day){
  if(!Number.isInteger(day)||day<0||day>=length)return undefined;
  if(!fixed)return refs.slice(day*pace,(day+1)*pace);
  if(duration<=refs.length)return refs.slice(Math.floor(day*refs.length/duration),Math.floor((day+1)*refs.length/duration));
  var step=Math.max(1,refs.length-1),span=duration-1;
  return refs.slice(Math.ceil(day*step/span),Math.ceil((day+1)*step/span));
 }};
}
function pbPlanDates(unit,amount,now=new Date()){
 if(!Number.isSafeInteger(amount)||amount<1)return null;
 var start=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
 var end=start+(amount-1)*pbPlanDayMs;
 if(unit==="months"){
  var year=now.getFullYear(),month=now.getMonth()+amount;
  var last=new Date(Date.UTC(year,month+1,0)).getUTCDate();
  end=Date.UTC(year,month,Math.min(now.getDate(),last))-pbPlanDayMs;
 }
 var finish=new Date(end);
 if(!Number.isFinite(finish.getTime())||end<start)return null;
 return {startDate:new Date(start).toISOString(),finishDate:finish.toISOString(),durationDays:(end-start)/pbPlanDayMs+1};
}
function pbPlanDateLabel(value){
 return new Date(value).toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
}
function pbPlanDraft(){
 var scope=document.getElementById("pb-plan-scope").value;
 var book=booksFallback.find(function(item){return item.slug===document.getElementById("pb2-plan-book").value;});
 var chosen=scope==="book"?(book?[book]:[]):booksFallback.filter(function(item){return scope==="bible"||item.testament===scope;});
 var count=chosen.reduce(function(total,item){return total+item.chapters;},0);
 var unit=document.getElementById("pb-plan-unit").value;
 var pace=pbPlanPace(document.getElementById("pb2-plan-pace").value);
 var dates=pbPlanDates(unit,unit==="pace"?Math.ceil(count/pace):Number(document.getElementById("pb-plan-amount").value));
 return {scope:scope,book:book,chosen:chosen,count:count,unit:unit,pace:pace,dates:dates};
}
function pbPlanPreview(){
 var draft=pbPlanDraft(),dates=draft.dates;
 document.getElementById("pb-plan-book-field").hidden=draft.scope!=="book";
 document.getElementById("pb-plan-pace-field").hidden=draft.unit!=="pace";
 document.getElementById("pb-plan-amount-field").hidden=draft.unit==="pace";
 document.getElementById("pb-plan-amount-label").textContent=draft.unit==="months"?"Quantidade de meses":"Quantidade de dias";
 var preview=document.getElementById("pb-plan-preview");
 if(!dates){preview.textContent="Informe uma quantidade inteira para calcular a leitura.";return;}
 var days=dates.durationDays,low=Math.floor(draft.count/days),high=Math.ceil(draft.count/days);
 var rhythm=draft.unit==="pace"?Math.min(draft.count,draft.pace)+" por dia":
  low===0?"1 por dia de leitura, com "+(days-draft.count)+" dias de pausa":
  (low===high?String(low):low+" a "+high)+" por dia";
 preview.textContent=draft.count+" capítulos · "+rhythm+" · "+days+(days===1?" dia.":" dias.")+
  " Início em "+pbPlanDateLabel(dates.startDate)+". Término previsto em "+pbPlanDateLabel(dates.finishDate)+".";
}
function pbPlanDayKeys(refs,day){
 return refs.length?refs:["@dia:"+day];
}
function pbPlanMomentDone(plan,refs,day,moment){
 return pbPlanDayKeys(refs,day).every(function(ref){return plan.dailyDevotional?.[ref]?.[moment]===true;});
}
function pbPlanDayComplete(plan,refs,day){
 return pbPlanMoments.every(function(moment){return pbPlanMomentDone(plan,refs,day,moment.id);});
}
function pbPlanDevotional(plan){
 return plan?.devotionalModule??plan?.devotionalModules?.[0]?.id??"";
}
function pbPlanDevotionalPicker(modules,selected){
 if(!modules.length&&!selected)return '<p class="subtitle">Instale um devocional em Módulos para adicioná-lo ao plano.</p>';
 var missing=selected&&!modules.some(function(module){return module.id===selected;});
 return '<label>Devocional<select class="field" data-pb-plan-module><option value="">Sem módulo devocional</option>'+
  (missing?'<option value="'+esc(selected)+'" selected>Devocional indisponível</option>':'')+
  modules.map(function(module){
   return '<option value="'+esc(module.id)+'"'+(module.id===selected?' selected':'')+'>'+esc(module.title)+'</option>';
  }).join("")+'</select></label>';
}
function pbPlanSelectedDevotional(picker){
 return picker.querySelector("[data-pb-plan-module]")?.value||"";
}
function pbPlanPaintDevotionals(modules){
 var plans=pb2Read().plans||[];
 document.querySelectorAll("[data-pb-plan-picker]").forEach(function(target){
  var id=target.dataset.pbPlanPicker,plan=plans.find(function(p){return p.id===id;});
  target.innerHTML=pbPlanDevotionalPicker(modules,pbPlanDevotional(plan));
  if(plan&&target.querySelector("select")){
   target.insertAdjacentHTML("beforeend",'<button type="button" class="btn" data-act="pb-plan-devotionals-save" data-plan-id="'+esc(id)+'">Salvar devocional</button>');
  }
 });
 document.querySelectorAll("[data-pb-plan-reading]").forEach(function(target){
  var plan=plans.find(function(p){return p.id===target.dataset.pbPlanReading;});
  var selected=pbPlanDevotional(plan);
  if(!selected)return;
  var module=modules.find(function(m){return m.id===selected;});
  if(!module){target.textContent="Devocional indisponível neste dispositivo.";return;}
  var day=Number(target.dataset.day);
  var refs=(pbPlanDays(plan).at(day)||[]).map(parseLinkedReference).filter(Boolean);
  var entries=module.entries.flatMap(function(entry,index){
   return entry.day===day+1||refs.some(function(ref){return ref.book===entry.book&&ref.chapter===entry.chapter;})?
    [pbDevOpenButton(module,entry,index)]:[];
  });
  target.innerHTML='<p><strong>'+esc(module.title)+'</strong></p>'+(entries.join(" ")||'<p class="subtitle">Sem leitura para este dia.</p>');
 });
}
function pbPlanSelectedDay(plan,days){
 var selected=pbPlanSelectedDays.get(plan.id);
 if(Number.isInteger(selected)&&selected>=0)return Math.min(selected,days.length-1);
 for(var day=0;day<days.length;day++){
  var refs=days.at(day);
  if(!refs.every(function(ref){return plan.done?.[ref];})||!pbPlanDayComplete(plan,refs,day))return day;
 }
 return days.length-1;
}
function pbPlanDailyCard(plan,days,selected){
 if(!days.length)return "";
 var refs=days.at(selected);
 var done=pbPlanMoments.filter(function(moment){return pbPlanMomentDone(plan,refs,selected,moment.id);}).length;
 var dayAttrs=' id="pb-plan-day-'+esc(plan.id)+'" class="field" data-pb-plan-day="'+esc(plan.id)+'"';
 var dayControl=days.length>3660?'<input'+dayAttrs+' type="number" min="1" max="'+days.length+'" value="'+(selected+1)+'">':
 '<select'+dayAttrs+'>'+Array.from({length:days.length},function(_,i){
  var day=days.at(i);
  return '<option value="'+i+'"'+(i===selected?' selected':'')+'>Dia '+(i+1)+(day.length?'':' · Pausa')+
   (pbPlanDayComplete(plan,day,i)&&day.every(function(ref){return plan.done?.[ref];})?' · Concluído':'')+'</option>';
 }).join("")+'</select>';
 return '<section aria-label="Devocional do plano"><h4>Devocional do Dia '+(selected+1)+'</h4>'+
 '<label>Dia do plano'+dayControl+'</label>'+
 (refs.length?'<p><strong>Leitura do dia</strong> '+refs.map(function(ref){return window.PBConnections.referenceButton(ref,ref);}).join(' · ')+'</p>':
  '<p>Dia de pausa na leitura. Aproveite para revisar uma passagem anterior.</p>')+
 '<div data-pb-plan-reading="'+esc(plan.id)+'" data-day="'+selected+'"></div>'+
 '<p role="status">'+(done===pbPlanMoments.length?'Devocional concluído':done+' de '+pbPlanMoments.length+' momentos concluídos')+'</p>'+
 pbPlanMoments.map(function(moment){
  var complete=pbPlanMomentDone(plan,refs,selected,moment.id);
  var reflection=refs.length?moment.reflection:moment.id==="morning"?"Relembre algo que aprendeu nos últimos dias e escolha como praticar hoje.":"Reflita sobre como as leituras anteriores orientaram seu dia.";
  return '<section class="card card-pad" style="margin:12px 0"><h5>'+moment.label+'</h5><p>'+reflection+'</p><p><strong>Oração</strong> '+moment.prayer+'</p>'+
  '<button type="button" id="pb-plan-'+esc(plan.id)+'-'+moment.id+'" class="btn '+(complete?'':'primary')+'" data-act="pb-plan-moment" data-plan-id="'+esc(plan.id)+'" data-day="'+selected+'" data-moment="'+moment.id+'" aria-pressed="'+complete+'">'+(complete?moment.label+' concluída · Desfazer':'Concluir '+moment.label.toLocaleLowerCase("pt-BR"))+'</button></section>';
 }).join("")+'</section>';
}
function pb2RenderPlans(){
 var db=pb2Read(),plans=Array.isArray(db.plans)?db.plans:[];
 MAIN.innerHTML='<div class="content">'+title("planos")+
 '<p class="subtitle">Siga a leitura do dia e faça o devocional de manhã e à noite.</p>'+
 '<div class="card card-pad"><h3>Meus devocionais</h3><p>Os devocionais são instalados na Biblioteca de Módulos. Aqui você escolhe um devocional instalado e faz sua leitura.</p><div id="pb-dev-module-list">Carregando devocionais instalados...</div></div>'+
 '<div class="card card-pad"><h3>Devocional de hoje</h3><div id="pb-dev-today">Carregando...</div></div>'+ 
 '<div class="card card-pad"><label>Nome do plano<input class="field" id="pb2-plan-title" placeholder="Ex.: Evangelho de João"></label>'+
 '<label>O que você quer ler?<select class="field" id="pb-plan-scope">'+Object.entries(pbPlanScopes).map(function(scope){return '<option value="'+scope[0]+'">'+scope[1]+'</option>';}).join("")+'</select></label>'+
 '<label id="pb-plan-book-field">Livro<select class="field" id="pb2-plan-book">'+booksFallback.map(function(b){return '<option value="'+esc(b.slug)+'">'+esc(b.name)+'</option>';}).join("")+'</select></label>'+
 '<label>Prazo<select class="field" id="pb-plan-unit"><option value="months">Meses</option><option value="days">Dias</option><option value="pace">Capítulos por dia</option></select></label>'+
 '<label id="pb-plan-amount-field"><span id="pb-plan-amount-label">Quantidade de meses</span><input class="field" id="pb-plan-amount" type="number" min="1" step="1" inputmode="numeric"></label>'+
 '<label id="pb-plan-pace-field" hidden>Capítulos por dia<input class="field" id="pb2-plan-pace" type="number" min="1" max="20" value="2"></label>'+
 '<p id="pb-plan-preview" role="status"></p>'+
 '<fieldset><legend>Devocional do plano</legend><div id="pb-plan-new-picker" data-pb-plan-picker="">Carregando...</div></fieldset><button class="btn primary" data-act="pb2-plan-add">Criar plano</button></div>'+
 plans.map(function(p){
 var refs=p.references||[],done=refs.filter(function(ref){return p.done?.[ref];}).length;
 var days=pbPlanDays(p),selected=pbPlanSelectedDay(p,days),displayedRefs=p.scope?(days.at(selected)||[]):refs;
 var finish=p.startDate&&days.length?Date.parse(p.startDate)+(days.length-1)*pbPlanDayMs:NaN;
 return '<div class="card card-pad" style="margin-top:12px"><h3 id="pb-plan-'+esc(p.id)+'" tabindex="-1">'+esc(p.title||"Plano sem título")+'</h3><p>'+done+' de '+refs.length+' capítulos concluídos ('+Math.round(done/Math.max(1,refs.length)*100)+'%)</p>'+
 '<div class="btn-row"><button class="btn slim" data-act="pb2-plan-edit" data-plan-id="'+esc(p.id)+'">✏️ Editar</button><button class="btn slim" data-act="pb2-plan-delete" data-plan-id="'+esc(p.id)+'">🗑️ Excluir</button></div>'+
 (p.durationDays?'<p>Prazo do plano · '+days.length+(days.length===1?' dia':' dias')+'</p>':
  '<label>Ritmo diário<input class="field" type="number" min="1" max="20" data-pb2-pace="'+esc(p.id)+'" value="'+pbPlanPace(p.pace)+'"></label>')+
 (Number.isFinite(finish)?'<p>Término previsto em '+esc(pbPlanDateLabel(finish))+'.</p>':'')+
 '<details><summary>Alterar devocional</summary><div data-pb-plan-picker="'+esc(p.id)+'">Carregando...</div></details>'+
 pbPlanDailyCard(p,days,selected)+
 '<div style="max-height:420px;overflow:auto">'+displayedRefs.map(function(ref){var devotional=(p.devotionals||{})[ref]||"";
 return '<details style="margin:10px 0;border-bottom:1px solid #ddd;padding-bottom:8px"><summary><input type="checkbox" data-pb2-done="'+esc(p.id)+'" data-ref="'+esc(ref)+'"'+(p.done&&p.done[ref]?' checked':'')+' aria-label="Concluir '+esc(ref)+'"> '+esc(ref)+' · Devocional</summary>'+
 (p.devotionalModule!==undefined||p.devotionalModules?'':'<div data-pb-dev-content data-book="'+esc(parseLinkedReference(ref)?.book||"")+'" data-chapter="'+esc(ref.split(" ").slice(-1)[0])+'"></div>')+
 '<label>Reflexão, oração e aplicação pessoal<textarea class="field" rows="4" data-pb2-devotional="'+esc(p.id)+'" data-ref="'+esc(ref)+'" placeholder="O que aprendi neste capítulo? Como aplicar?">'+esc(devotional)+'</textarea></label><small>Salvo ao sair do campo. Texto pessoal; nenhum conteúdo de terceiros é inserido automaticamente.</small></details>';
 }).join("")+'</div></div>';}).join("")+'</div>';
 pbPlanPreview();
 pbDevPaint();
}
function pbWinRead(){var d=pb2Read();return Array.isArray(d.studyWindows)?d.studyWindows:[];}
function pbWinSave(windows){var d=pb2Read();d.studyWindows=windows;pb2Write(d);}
function pbWinEscapeId(){return "w"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function pbWinOptions(type){
 var installed=window.PBModules&&PBModules.getInstalled?PBModules.getInstalled():[];
 if(type==="devotional")return [];
 return installed.filter(function(m){return m.type===(type==="bible"?"bible":type==="commentary"?"commentary":"dictionary");});
}
function pbReaderWindowsRefresh(){var host=document.getElementById("pb-reader-window-grid");if(!host)return;pbWinRead().filter(function(w){return w.group==="A";}).forEach(pbWinLoad);}
function pbReaderWindowsRender(){
 var host=document.getElementById("pb-reader-window-grid");if(!host)return;
 var windows=pbWinRead();host.innerHTML=windows.map(function(w){
  var label=w.type==="bible"?"Outra tradução":w.type==="commentary"?"Comentário":w.type==="dictionary"?"Dicionário / Strong":"Devocional";
  var opts=pbWinOptions(w.type),selected=w.moduleId||"";
  var sync=w.group==="A";
  return '<section class="card card-pad" style="min-width:0"><div class="btn-row"><strong>'+esc(label)+'</strong><button class="btn slim" data-act="pb-reader-close-window" data-win-id="'+esc(w.id)+'">× Fechar</button></div>'+
  (w.type==="devotional"?"":'<label>Módulo<select class="field" data-reader-win-module="'+esc(w.id)+'"><option value="">'+(w.type==="bible"?"Selecione tradução":"Todos os módulos")+'</option>'+opts.map(function(m){var id=w.type==="bible"?"local:"+m.id:m.id;return '<option value="'+esc(id)+'"'+(id===selected?' selected':'')+'>'+esc(m.name)+'</option>';}).join("")+'</select></label>')+
  (w.type==="dictionary"?'<label>Palavra<input class="field" data-reader-win-term="'+esc(w.id)+'" value="'+esc(w.term||"")+'" placeholder="Palavra ou Strong"></label>':"")+
  '<div class="btn-row" style="margin:6px 0"><label>Referência<select class="field" data-reader-win-sync="'+esc(w.id)+'"><option value="A"'+(sync?' selected':'')+'>Sincronizada com a Bíblia</option><option value="B"'+(!sync?' selected':'')+'>Fixar referência atual</option></select></label></div>'+ 
  '<div data-win-content="'+esc(w.id)+'" style="max-height:400px;overflow:auto">Carregando...</div></section>';
 }).join("");
 windows.forEach(pbWinLoad);
}
function pbWinRender(){
 var host=document.getElementById("pb-win-grid");if(!host)return;
 var windows=pbWinRead();if(!windows.length){host.innerHTML='<p class="subtitle">Toque em Adicionar janela para escolher uma Bíblia, comentário, dicionário ou devocional.</p>';return;}
 host.innerHTML=windows.map(function(w){
  var options=pbWinOptions(w.type),sel=w.moduleId||"",label=w.type==="bible"?"Tradução bíblica":w.type==="commentary"?"Comentário":w.type==="dictionary"?"Dicionário / Strong":"Devocional";
  return '<section class="card card-pad" style="min-width:0"><div class="btn-row"><strong>'+esc(label)+'</strong><button class="btn slim" data-act="pb-win-remove" data-win-id="'+esc(w.id)+'">Fechar</button></div>'+
  (w.type!=="devotional"?'<label>Módulo<select class="field" data-win-field="moduleId" data-win-id="'+esc(w.id)+'"><option value="">'+(w.type==="commentary"?"Todos os comentários":w.type==="dictionary"?"Todos os dicionários":"Selecione uma tradução")+'</option>'+options.map(function(m){var val=w.type==="bible"?"local:"+m.id:m.id;return '<option value="'+esc(val)+'"'+(val===sel?' selected':'')+'>'+esc(m.name)+'</option>';}).join("")+'</select></label>':'')+
  '<label>Sincronização<select class="field" data-win-field="group" data-win-id="'+esc(w.id)+'"><option value="A"'+(w.group==="A"?' selected':'')+'>Grupo A · Bíblia principal</option><option value="B"'+(w.group==="B"?' selected':'')+'>Grupo B · referência independente</option><option value="C"'+(w.group==="C"?' selected':'')+'>Grupo C · referência independente</option><option value="fixed"'+(w.group==="fixed"?' selected':'')+'>Fixar referência</option></select></label>'+
  '<label>Livro<select class="field" data-win-field="book" data-win-id="'+esc(w.id)+'">'+books.map(function(b){return '<option value="'+esc(b.slug)+'"'+((w.book||state.book)===b.slug?' selected':'')+'>'+esc(b.name)+'</option>';}).join("")+'</select></label>'+
  '<label>Capítulo<input class="field" type="number" min="1" max="150" data-win-field="chapter" data-win-id="'+esc(w.id)+'" value="'+(Number(w.chapter)||state.chapter)+'"></label>'+ '<label>Versículo<input class="field" type="number" min="1" max="176" data-win-field="verse" data-win-id="'+esc(w.id)+'" value="'+(Number(w.verse)||1)+'"></label>'+
  (w.type==="dictionary"?'<label>Palavra / Strong<input class="field" data-win-field="term" data-win-id="'+esc(w.id)+'" value="'+esc(w.term||"")+'" placeholder="Ex.: amor, G25"></label>':'')+
  '<div class="btn-row"><button class="btn slim" data-act="pb-win-load" data-win-id="'+esc(w.id)+'">Atualizar conteúdo</button></div><div data-win-content="'+esc(w.id)+'" style="max-height:380px;overflow:auto">Carregando...</div></section>';
 }).join("");
 windows.forEach(pbWinLoad);
}
var pbWinEpoch={};
async function pbWinLoad(w){
 var target=document.querySelector('[data-win-content="'+w.id+'"]');if(!target)return;
 var epoch=pbWinEpoch[w.id]=(pbWinEpoch[w.id]||0)+1;
 try{
  var book=w.group==="A"?state.book:(w.book||state.book),chapter=w.group==="A"?state.chapter:(Number(w.chapter)||state.chapter);
  var selected=books.find(function(b){return b.slug===book;});if(!selected)throw Error("Livro não encontrado.");
  if(chapter<1||chapter>selected.chapters)throw Error("Capítulo inválido.");
  var html="";
  if(w.type==="bible"){
   if(!w.moduleId)throw Error("Selecione uma tradução instalada.");
   var data=await PBModules.getChapter(w.moduleId,book,chapter);
   html=(data.verses||[]).map(function(v,i){return '<p><strong>'+(Number(v.number||v.verse)||i+1)+'</strong> '+esc(typeof v==="string"?v:(v.text||v.content||""))+'</p>';}).join("");
  }else if(w.type==="commentary"){
   var verse=w.group==="A"?(Number(state.selectedVerse)||1):(Number(w.verse)||1);
   var items=await PBModules.getCommentaries(book,chapter,verse,w.moduleId||undefined);
   html=items.length?items.map(function(x){return '<p><strong>'+esc(x.moduleName)+'</strong> · '+esc(selected.name+" "+chapter+":"+verse)+'</p><p style="white-space:pre-wrap">'+esc(x.text)+'</p>';}).join(""):"Nenhum comentário disponível para este versículo.";
  }else if(w.type==="dictionary"){
   if(!w.term)html="Informe uma palavra ou número Strong no campo acima.";
   else{var entries=await PBModules.getDictionaryEntry(w.term,w.moduleId||undefined);html=entries.length?entries.map(function(x){return '<p><strong>'+esc(x.moduleName||x.term||w.term)+'</strong></p><p>'+esc(x.text||x.definition||"")+'</p>';}).join(""):"Nenhuma definição encontrada nos módulos instalados.";}
  }else if(w.type==="devotional"){
   var mods=await pbDevAll(),items=mods.flatMap(function(m){return m.entries.filter(function(e){return e.book===book&&e.chapter===chapter;}).map(function(e){return {m:m,e:e};});});
   html=items.length?items.map(function(x){return '<p><strong>'+esc(x.e.title)+'</strong> · '+esc(x.m.title)+'</p><p style="white-space:pre-wrap">'+esc(x.e.text)+'</p>'+(x.e.prayer?'<p><strong>Oração:</strong> '+esc(x.e.prayer)+'</p>':'')+pbDevOpenButton(x.m,x.e,x.m.entries.indexOf(x.e));}).join(""):"Nenhum devocional disponível para hoje ou para este capítulo.";
  }
  if(pbWinEpoch[w.id]===epoch&&target.isConnected)target.innerHTML=html;
 }catch(error){if(pbWinEpoch[w.id]===epoch&&target.isConnected)target.textContent="Não foi possível carregar: "+error.message;}
}
function pb2RenderPanels(){
 var windows=pbWinRead();
 MAIN.innerHTML='<div class="content">'+title("paineis")+'<p class="subtitle">Janelas bíblicas personalizáveis. Adicione módulos, escolha referências e use grupos de sincronização. As configurações são salvas neste dispositivo.</p>'+
 '<div class="card card-pad"><div class="btn-row"><label>Nova janela<select class="field" id="pb-win-kind"><option value="bible">Tradução bíblica</option><option value="commentary">Comentário bíblico</option><option value="dictionary">Dicionário / Strong</option><option value="devotional">Devocional</option></select></label><button class="btn primary" data-act="pb-win-add">+ Adicionar janela</button><button class="btn" data-act="pb-win-refresh">Sincronizar</button></div><p class="subtitle">Grupo A acompanha a Bíblia principal. Grupos B/C e janela fixa mantêm a referência escolhida. As janelas utilizam apenas módulos instalados.</p></div>'+
 '<div id="pb-win-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:12px;margin-top:12px"></div></div>';
 pbWinRender();
}

/* Advanced integrated study: source-linked graph, speech commands and sermon coaching. */

/* Integration bridge v1: transient, non-persistent study context.
 * Does not change legacy storage or module databases. */
var PBStudyBridge=(function(){
 var listeners=new Map(),lastVerse="",sequence=0;
 function subscribe(topic,handler){if(!listeners.has(topic))listeners.set(topic,new Set());listeners.get(topic).add(handler);return function(){listeners.get(topic).delete(handler);};}
 function emit(topic,payload){
  var snapshot=Object.freeze(Object.assign({sequence:++sequence,at:Date.now()},payload||{}));
  (listeners.get(topic)||[]).forEach(function(handler){try{handler(snapshot);}catch(error){console.warn("Púlpito bridge",topic,error);}});
  return snapshot;
 }
 function selectVerse(book,chapter,verse,origin){
  var key=[book,chapter,verse].join(":");if(lastVerse===key)return false;
  lastVerse=key;emit("verse:changed",{book:book,chapter:chapter,verse:verse,origin:origin||"reader"});return true;
 }
 return Object.freeze({subscribe:subscribe,emit:emit,selectVerse:selectVerse,getSequence:function(){return sequence;}});
})();

var pbGraphCache=null,pbVoiceRecognizer=null;
function pbGraphBook(number){return booksFallback[number-1]||books[number-1]||null;}
function pbGraphReference(node){var b=pbGraphBook(node[0]);return b?b.name+" "+node[1]+":"+node[2]+(node[3]&&node[3]!==node[2]?"–"+node[3]:""):"Passagem indisponível";}
var pbGraphIndex=null,pbGraphSession={center:"",depth:1,filter:"todos",maxNodes:48};
function pbGraphId(n){return n.slice(0,3).join(":");}
function pbGraphNode(id){var p=id.split(":").map(Number);return [p[0],p[1],p[2],0];}
function pbGraphBuildIndex(data){
 if(pbGraphIndex&&pbGraphIndex.data===data)return pbGraphIndex;
 if(!data||!Array.isArray(data.references))throw Error("Formato de referências cruzadas inválido");
 var adj=new Map(),descriptions=new Map();
 function link(a,b,description){if(!adj.has(a))adj.set(a,[]);if(!adj.get(a).some(function(x){return x.to===b&&x.description===description;}))adj.get(a).push({to:b,description:description,kind:"referência temática catalogada",source:"Midvash · CC BY 4.0"});}
 data.references.forEach(function(r){if(!r.s||!r.t)return;var a=pbGraphId(r.s);descriptions.set(a,r.d);r.t.forEach(function(t){var b=pbGraphId(t);link(a,b,r.d);link(b,a,r.d);});});
 pbGraphIndex={data:data,adj:adj,descriptions:descriptions};return pbGraphIndex;
}
function pbGraphFind(query){
 var q=String(query||"").trim().toLocaleLowerCase("pt-BR");
 if(!q)return [];
 return pbGraphCache.references.filter(function(r){return [r.d,pbGraphReference(r.s)].join(" ").toLocaleLowerCase("pt-BR").includes(q);}).slice(0,40);
}
function pbGraphTraverse(center,depth,limit){
 depth=Math.max(1,Math.min(6,Number(depth)||1));limit=Math.max(1,Math.min(120,Number(limit)||48));
 var index=pbGraphBuildIndex(pbGraphCache),visited=new Set([center]),queue=[{id:center,depth:0}],nodes=[],edges=[];
 while(queue.length&&nodes.length<limit){
  var item=queue.shift();nodes.push(item);
  if(item.depth>=depth)continue;
  var list=index.adj.get(item.id)||[];
  for(var i=0;i<list.length&&visited.size<limit;i++){var e=list[i];if(!visited.has(e.to)){visited.add(e.to);queue.push({id:e.to,depth:item.depth+1});edges.push({from:item.id,to:e.to,description:e.description,kind:e.kind,source:e.source});}}
 }
 return {nodes:nodes,edges:edges};
}
function pbRenderGraph(){
 var d=pb2Read();pbGraphSession.center=d.graphCenter||"";pbGraphSession.depth=Math.max(1,Math.min(6,Number(d.graphDepth)||1));pbGraphSession.filter=d.graphFilter||"todos";
 MAIN.innerHTML='<div class="content">'+title("mapa")+'<p class="subtitle">Investigue relações documentadas entre passagens. A base Midvash (CC BY 4.0) contém conexões temáticas catalogadas; elas não comprovam, por si só, citações explícitas ou interpretações de comentaristas.</p>'+
 '<div class="card card-pad"><label>Investigar tema ou passagem<input id="pb-graph-query" class="field" placeholder="Ex.: Melquisedeque, Hebreus 7" value="'+esc(d.graphQuery||"")+'"></label>'+
 '<div class="btn-row"><button class="btn primary" data-act="pb-graph-search">Investigar</button><button class="btn" data-act="pb-graph-current">Versículo selecionado</button><button class="btn" data-act="pb-graph-save">Salvar investigação</button><button class="btn" data-act="pb-graph-sermon">Enviar ao sermão</button></div>'+
 '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end"><label>Profundidade<select class="field" id="pb-graph-depth">'+[1,2,3,4,5,6].map(function(n){return '<option value="'+n+'"'+(pbGraphSession.depth===n?' selected':'')+'>'+n+' nível'+(n>1?'is':'')+'</option>';}).join("")+'</select></label>'+
 '<label>Testamento<select class="field" id="pb-graph-filter"><option value="todos">Ambos</option><option value="at"'+(pbGraphSession.filter==="at"?' selected':'')+'>Antigo Testamento</option><option value="nt"'+(pbGraphSession.filter==="nt"?' selected':'')+'>Novo Testamento</option></select></label>'+
 '<label>De uma passagem<input class="field" id="pb-graph-from" placeholder="Ex.: Gênesis 14:18"></label><label>Até outra<input class="field" id="pb-graph-to" placeholder="Ex.: Hebreus 7:1"></label><button class="btn" data-act="pb-graph-path">Encontrar caminho</button></div>'+
 '<div class="btn-row"><button class="btn" data-act="pb-graph-zoom-in">Zoom +</button><button class="btn" data-act="pb-graph-zoom-out">Zoom −</button><button class="btn" data-act="pb-graph-reset">Centralizar</button></div>'+
 '<div id="pb-graph-results" aria-live="polite">Carregando mapa...</div><div id="pb-graph-saved"></div></div></div>';
 var promise=pbGraphCache?Promise.resolve(pbGraphCache):fetch("./pulpito-crossrefs.json").then(function(r){if(!r.ok)throw Error("Base indisponível");return r.json();});
 promise.then(function(data){pbGraphBuildIndex(data);pbGraphCache=data;pbShowGraphResults();pbGraphSavedList();}).catch(function(e){var el=document.getElementById("pb-graph-results");if(el)el.textContent="Não foi possível carregar o índice local: "+e.message;});
}
function pbGraphSavedList(){
 var el=document.getElementById("pb-graph-saved");if(!el)return;
 var saved=pb2Read().graphSaved||[];
 el.innerHTML='<h3>Investigações salvas</h3>'+(saved.length?saved.slice(0,30).map(function(x,i){return '<button class="btn slim" style="margin:4px" data-pb-graph-saved="'+i+'">'+esc(x.query||x.center||"Mapa")+' · '+esc(new Date(x.at).toLocaleDateString("pt-BR"))+'</button>';}).join(""):'<p class="subtitle">Nenhuma investigação salva.</p>');
}
function pbGraphFilterId(id){var n=Number(id.split(":")[0]);return pbGraphSession.filter==="todos"||(pbGraphSession.filter==="at"?n<=39:n>=40);}
function pbShowGraphResults(){
 var el=document.getElementById("pb-graph-results");if(!el||!pbGraphCache)return;
 var d=pb2Read(),q=d.graphQuery||"",hits=pbGraphFind(q);
 if(!pbGraphSession.center){pbGraphSession.center=hits.length?pbGraphId(hits[0].s):pbGraphId([books.findIndex(function(b){return b.slug===state.book;})+1,state.chapter,state.selectedVerse||1]);}
 var graph=pbGraphTraverse(pbGraphSession.center,pbGraphSession.depth,pbGraphSession.maxNodes);
 var nodes=graph.nodes.filter(function(n){return pbGraphFilterId(n.id);}),allowed=new Set(nodes.map(function(n){return n.id;}));
 var edges=graph.edges.filter(function(e){return allowed.has(e.from)&&allowed.has(e.to);});
 var W=840,H=520,cx=W/2,cy=H/2;
 var positions={};nodes.forEach(function(n,i){var layer=n.depth,layerNodes=nodes.filter(function(x){return x.depth===layer;}),j=layerNodes.indexOf(n),angle=2*Math.PI*j/Math.max(1,layerNodes.length)-Math.PI/2,rad=layer===0?0:Math.min(220,85+layer*32);positions[n.id]={x:cx+Math.cos(angle)*rad,y:cy+Math.sin(angle)*rad};});
 var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Grafo interativo de passagens" style="width:100%;height:auto;min-width:550px;background:var(--reader-paper,#f8f7f1);border-radius:12px">';
 edges.forEach(function(e){var p=positions[e.from],t=positions[e.to];svg+='<line x1="'+p.x+'" y1="'+p.y+'" x2="'+t.x+'" y2="'+t.y+'" stroke="#8796a0" stroke-width="1.5"><title>'+esc(e.description+" · "+e.source)+'</title></line>';});
 nodes.forEach(function(n){var p=positions[n.id],label=pbGraphReference(pbGraphNode(n.id));svg+='<g data-pb-graph-node="'+esc(n.id)+'" tabindex="0" role="button" aria-label="Expandir '+esc(label)+'" style="cursor:pointer"><circle cx="'+p.x+'" cy="'+p.y+'" r="'+(n.depth===0?33:25)+'" fill="'+(n.depth===0?'#146c74':'#456a84')+'"/><text x="'+p.x+'" y="'+(p.y+40)+'" fill="#172b36" font-size="11" text-anchor="middle">'+esc(label)+'</text><title>'+esc(label)+'</title></g>';});
 svg+='</svg>';
 el.innerHTML='<p class="subtitle">Fonte: Midvash, CC BY 4.0 · '+nodes.length+' nós · '+edges.length+' ligações · limite de '+pbGraphSession.maxNodes+' nós por visualização. As relações são temáticas catalogadas, não inferências geradas por IA.</p>'+
 '<div style="overflow:auto;max-height:550px" id="pb-graph-canvas">'+svg+'</div>'+
 '<h3>Conexões da passagem central</h3><p><button class="btn slim" data-pb-graph-ref="'+esc(pbGraphReference(pbGraphNode(pbGraphSession.center)))+'">Abrir '+esc(pbGraphReference(pbGraphNode(pbGraphSession.center)))+'</button></p>'+
 edges.slice(0,75).map(function(e){return '<div style="margin:8px 0"><button class="btn slim" data-pb-graph-center="'+esc(e.to)+'">'+esc(pbGraphReference(pbGraphNode(e.to)))+'</button> <small>'+esc(e.description)+' · '+esc(e.source)+'</small></div>';}).join("")+
 (hits.length?'<h3>Resultados por assunto</h3>'+hits.slice(0,15).map(function(x){return '<button class="btn slim" style="margin:4px" data-pb-graph-center="'+esc(pbGraphId(x.s))+'">'+esc(x.d+" — "+pbGraphReference(x.s))+'</button>';}).join(""):'');
}
function pbGraphStore(){var d=pb2Read();d.graphCenter=pbGraphSession.center;d.graphDepth=pbGraphSession.depth;d.graphFilter=pbGraphSession.filter;pb2Write(d);}
function pbGraphPath(a,b){
 if(!pbGraphCache||!a||!b)return null;
 var idx=pbGraphBuildIndex(pbGraphCache),queue=[a],prev=new Map([[a,null]]),steps=0;
 while(queue.length&&steps++<5000){var n=queue.shift();if(n===b)break;(idx.adj.get(n)||[]).forEach(function(e){if(!prev.has(e.to)){prev.set(e.to,{from:n,edge:e});queue.push(e.to);}});}
 if(!prev.has(b))return null;var path=[];for(var at=b;at!==null;){path.unshift(at);var p=prev.get(at);at=p?p.from:null;}return path;
}
function pbRenderVoice(){
 var supported=!!(window.SpeechRecognition||window.webkitSpeechRecognition);
 MAIN.innerHTML='<div class="content">'+title("voz")+'<div class="card card-pad"><h2>Assistente bíblico por voz</h2><p>Comandos: “abrir João 15”, “pesquisar graça”, “abrir mapa”, “abrir sermão”, “abrir planos”. A disponibilidade de reconhecimento offline depende do aparelho e do serviço de voz instalado.</p><button class="btn primary" data-act="pb-voice-start"'+(supported?'':' disabled')+'>🎙 Iniciar escuta</button><p id="pb-voice-status" role="status">'+(supported?"Aguardando comando.":"Reconhecimento de voz não disponível neste dispositivo.")+'</p><label>Ou digite o comando<input id="pb-voice-text" class="field" placeholder="Abrir Rute 1"></label><button class="btn" data-act="pb-voice-text">Executar comando</button></div></div>';
}
function pbVoiceNormalize(s){return String(s||"").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[.,!?]/g," ").replace(/\s+/g," ").trim();}
function pbVoiceNumber(s){
 var words={um:1,uma:1,primeiro:1,primeira:1,dois:2,duas:2,segundo:2,segunda:2,tres:3,terceiro:3,terceira:3,quatro:4,quarto:4,quarta:4,cinco:5,quinto:5,quinta:5,seis:6,sete:7,oito:8,nove:9,dez:10,onze:11,doze:12,treze:13,quatorze:14,catorze:14,quinze:15,dezesseis:16,dezessete:17,dezoito:18,dezenove:19,vinte:20,trinta:30,quarenta:40,cinquenta:50,sessenta:60,setenta:70,oitenta:80,noventa:90,cento:100};
 if(/^\d+$/.test(s))return Number(s);
 var total=0,parts=s.split(/\s+e\s+|\s+/).filter(Boolean);
 for(var p of parts){if(words[p]===undefined)return NaN;total+=words[p];}
 return total||NaN;
}
function pbVoiceCommand(command){
 var q=pbVoiceNormalize(command);
 if(/^(pesquisar|buscar|procurar)\s+/.test(q)){var d=pb2Read();d.query=String(command).replace(/^(pesquisar|buscar|procurar)\s+/i,"");pb2Write(d);page("pesquisa");return;}
 if(!/^(abrir|abra|ler|leia|ir para|va para|mostrar|mostre)\s+/.test(q)){pbVoiceStatus("Comando não reconhecido. Diga: abrir Bíblia em João capítulo 15.");return;}
 var passage=q.replace(/^(abrir|abra|ler|leia|ir para|va para|mostrar|mostre)\s+/,"").replace(/^(a |o )?(biblia|livro de|livro do|livro da)\s*(em |no |na |de )?/,"").trim();
 if(/^(mapa|conexoes)/.test(passage)){page("mapa");return;}
 if(/^sermao/.test(passage)){page("sermao");return;}
 if(/^planos/.test(passage)){page("planos");return;}
 passage=passage.replace(/\s+(?:no |na |do |da )?capitulo\s+/," ").replace(/\s+(?:no |na )?versiculo\s+/," : ").replace(/\s+/g," ").trim();
 var match=/^(.+?)\s+(.+?)(?:\s*:\s*(.+))?$/.exec(passage);
 if(!match){pbVoiceStatus("Informe livro e capítulo. Exemplo: abrir Bíblia em João capítulo quinze.");return;}
 var alias=match[1],chapter=pbVoiceNumber(match[2]),verse=match[3]?pbVoiceNumber(match[3]):0;
 var norm=function(x){return pbVoiceNormalize(x).replace(/\s+/g," ");};
 var book=books.find(function(b){return norm(b.name)===alias||norm(b.slug)===alias;})||booksFallback.find(function(b){return norm(b.name)===alias||norm(b.slug)===alias;});
 if(!book||!Number.isInteger(chapter)||chapter<1||chapter>book.chapters||!Number.isInteger(verse)||verse<0||verse>176){
  pbVoiceStatus("Referência não reconhecida. Tente: abrir João capítulo 15, ou abrir Salmos capítulo 23.");return;
 }
 setRef(book.slug,chapter,verse);
 if(state.page!=="leitura")page("leitura");
 notify("Abrindo "+book.name+" "+chapter+(verse?":"+verse:""));
}

function pbVoiceStatus(message){var el=document.getElementById("pb-voice-status");if(el)el.textContent=message;}
async function pbVoiceStart(){
 var native=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.SpeechRecognition;
 if(native){
  try{
   pbVoiceStatus("Verificando permissão do microfone...");
   var available=await native.available();
   if(!available||!available.available){pbVoiceStatus("O reconhecimento de voz do Android não está disponível neste aparelho. Use o comando digitado.");return;}
   var permission=await native.checkPermissions();
   if(!permission||permission.speechRecognition!=="granted")permission=await native.requestPermissions();
   if(!permission||permission.speechRecognition!=="granted"){pbVoiceStatus("Permissão de microfone negada. Autorize nas configurações do Android ou digite o comando.");return;}
   pbVoiceStatus("Ouvindo pelo reconhecimento de voz do Android...");
   var result=await native.start({language:"pt-BR",maxResults:3,prompt:"Diga um comando bíblico",popup:true,partialResults:false});
   var command=result&&Array.isArray(result.matches)?result.matches[0]:"";
   if(command){pbVoiceStatus("Reconhecido: "+command);pbVoiceCommand(command);}
   else pbVoiceStatus("Nenhuma fala reconhecida. Tente novamente ou digite o comando.");
  }catch(error){pbVoiceStatus("Não foi possível reconhecer a fala no Android: "+(error&&error.message||"serviço indisponível")+". Você pode digitar o comando.");}
  return;
 }
 var Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Recognition){pbVoiceStatus("Reconhecimento de voz indisponível neste navegador. Use o comando digitado.");return;}
 if(!window.confirm("Ativar o microfone? O serviço de voz do navegador pode usar internet."))return;
 try{
  if(pbVoiceRecognizer)pbVoiceRecognizer.stop();
  pbVoiceRecognizer=new Recognition();pbVoiceRecognizer.lang="pt-BR";pbVoiceRecognizer.interimResults=false;
  pbVoiceRecognizer.onresult=function(e){var command=e.results[0][0].transcript;pbVoiceStatus("Reconhecido: "+command);pbVoiceCommand(command);};
  pbVoiceRecognizer.onerror=function(e){pbVoiceStatus(e.error==="not-allowed"?"Microfone bloqueado. Autorize nas permissões do navegador ou digite o comando.":"Falha no reconhecimento: "+e.error);};
  pbVoiceRecognizer.start();pbVoiceStatus("Ouvindo...");
 }catch(error){pbVoiceStatus("Microfone indisponível: "+error.message);}
}

function pbRenderCoach(){
 var db=pb2Read(),notes=db.coach||"",sermon=state.sermon||{};
 var fields=["title","reference","context","introduction","point1","point2","application","conclusion"];
 var completed=fields.filter(function(k){return String(sermon[k]||"").trim().length>=12;});
 var score=Math.round(completed.length/fields.length*100);
 MAIN.innerHTML='<div class="content">'+title("instrutor")+'<p class="subtitle">Instrutor de preparação homilética: verificação estrutural do rascunho, não avaliação teológica automática.</p><div class="card card-pad"><h2>'+esc(sermon.title||"Sermão sem título")+'</h2><p>Estrutura preenchida: '+score+'% ('+completed.length+'/'+fields.length+' campos).</p>'+fields.map(function(k){return '<p>'+(completed.includes(k)?"✓":"○")+' '+esc(k)+'</p>';}).join("")+'<label>Observações do ensaio<textarea id="pb-coach-notes" class="editor" style="width:100%;min-height:150px">'+esc(notes)+'</textarea></label><div class="btn-row"><button class="btn primary" data-act="pb-coach-save">Salvar avaliação</button><button class="btn" data-act="pb-coach-sermon">Editar sermão</button></div><p class="subtitle">Confira contexto, exegese e referências nas fontes bíblicas antes de pregar.</p></div></div>';
}

function render(){
 document.querySelectorAll(".nav-item").forEach(function(el){var active=el.dataset.page===state.page;el.classList.toggle("active",active);el.setAttribute("aria-current",active?"page":"false");});
 document.getElementById("page-location").textContent=TITLES[state.page]||"Púlpito Bible";
 document.documentElement.classList.toggle("dark",state.theme==="dark");document.body.classList.toggle("reader-active",state.page==="leitura");document.body.classList.toggle("focus-reading",!!state.focusMode&&state.page==="leitura");document.documentElement.style.setProperty("--reading-size",state.fontSize+"px");
 if(state.page!=="leitura"&&window.PBReaderMultiWindow)window.PBReaderMultiWindow.unmount();
 if(state.page==="leitura")renderReader();
 if(state.page==="original")renderOriginal();
 if(state.page==="tutor")renderTutor();
 if(state.page==="exercicios")renderExercises();
 if(state.page==="sermao")renderSermon();
 if(state.page==="historico")renderHistoricalDiary();
 if(state.page==="pesquisa")pb2RenderSearch();
 if(state.page==="planos")pb2RenderPlans();
 if(state.page==="devocional")pbDevRenderReader();
 if(state.page==="paineis")pb2RenderPanels();
 if(state.page==="mapa")pbRenderGraph();
 if(state.page==="voz")pbRenderVoice();
 if(state.page==="instrutor")pbRenderCoach();
 if(state.page==="caderno")renderNotebook();
 if(state.page==="mercado")renderMarket();
 if(state.page==="projeto")renderRoadmap();
 if(state.page==="modulos")window.PBModules.renderPage();
}
/* Whole-Bible word search, scoped to the active translation. */
var bibleSearch=null;
var onlineSearchChapters=new Map();
function bibleSearchPattern(term){
 var accents={a:"aàáâãä",e:"eèéêë",i:"iìíîï",o:"oòóôõö",u:"uùúûü",c:"cç",n:"nñ"};
 var normalized=term.normalize("NFD").replace(/\p{M}/gu,"").toLocaleLowerCase("pt-BR");
 var pattern=Array.from(normalized).map(function(letter){
  if(/\s/.test(letter))return "\\s+";
  return accents[letter]?"["+accents[letter]+"]":letter.replace(/[.*+?^$()|[\]\\]/g,"\\$&");
 }).join("");
 return new RegExp("(?<![\\p{L}\\p{M}\\p{N}])"+pattern+"(?![\\p{L}\\p{M}\\p{N}])","giu");
}
function bibleSearchText(raw){
 var html=String(raw||"").replace(/<s>[^<]*<\/s>/gi,"");
 return (new DOMParser().parseFromString(html,"text/html").body.textContent||"").normalize("NFC");
}
function highlightedSearchText(text,pattern){
 var html="",position=0;
 for(var match of text.matchAll(pattern)){
  html+=esc(text.slice(position,match.index))+"<mark>"+esc(match[0])+"</mark>";
  position=match.index+match[0].length;
 }
 return html+esc(text.slice(position));
}
function closeBibleSearch(){
 if(!bibleSearch)return;
 bibleSearch.controller?.abort();
 bibleSearch.root.remove();
 var focus=bibleSearch.focus;
 bibleSearch=null;
 if(focus?.isConnected)focus.focus();
}
function paintBibleSearch(job){
 if(bibleSearch?.job!==job)return;
 var search=bibleSearch;
 var progress=job.done+"/"+job.total+" capítulos verificados";
 var summary=job.results.length+" versículo(s) encontrado(s) · "+progress;
 search.root.querySelector("#pb-bible-search-status").textContent=job.running?"Pesquisando… "+summary:
  (job.failed?"Busca parcial. "+job.failed+" capítulo(s) indisponível(is). "+(job.offline?"Sem internet: instale uma Bíblia completa ou pesquise online uma vez para salvar os capítulos. ":""):job.cancelled?"Busca interrompida. ":"Busca concluída. ")+summary;
 search.root.querySelector('[data-bsearch="cancel"]').hidden=!job.running;
 var rows=job.results.slice().sort(function(a,b){return a.order-b.order||a.chapter-b.chapter||a.verse-b.verse;});
 search.rows=rows;
 search.root.querySelector("#pb-bible-search-results").innerHTML=rows.slice(0,search.limit).map(function(row,index){
  return '<button type="button" class="pb-bible-search-result" data-bsearch-result="'+index+'"><strong>'+esc(row.name+" "+row.chapter+":"+row.verse)+'</strong><span>'+
   highlightedSearchText(row.text,job.pattern)+'</span></button>';
 }).join("");
 search.root.querySelector('[data-bsearch="more"]').hidden=rows.length<=search.limit;
 search.root.querySelector("#pb-bible-search-credit").textContent=Array.from(job.credits).join("\n");
}
function addBibleSearchChapter(job,book,chapter,verses,credit){
 if(!Array.isArray(verses)||!verses.length)throw Error("Capítulo indisponível");
 verses.forEach(function(verse,i){
  var text=bibleSearchText(typeof verse==="string"?verse:verse.text||verse.content);
  job.pattern.lastIndex=0;
  if(job.pattern.test(text)){
   job.pattern.lastIndex=0;
   job.results.push({book:book.slug,name:book.name,order:book.order,chapter:chapter,verse:typeof verse==="string"?i+1:Number(verse.number||verse.verse)||i+1,text:text});
  }
 });
 if(credit)job.credits.add(credit);
}
async function runBibleSearch(){
 var search=bibleSearch;if(!search)return;
 var term=search.root.querySelector("#pb-bible-search-query").value.trim().replace(/\s+/g," ");
 if(!term)return;
 search.controller?.abort();
 var controller=new AbortController();search.controller=controller;
 search.version=search.root.querySelector("#pb-bible-search-version").value;
 var local=window.PBModules.getModuleByVersion(search.version);search.credit=local?.license||"";
 var scope=search.root.querySelector("#pb-bible-search-scope").value;
 var selectedBooks=booksFallback.map(function(book,i){return Object.assign({order:i},book);}).filter(function(book){
  return scope==="all"||(scope==="ot"?book.order<39:book.order>=39);
 });
 var job={results:[],pattern:bibleSearchPattern(term),credits:new Set(),done:0,total:selectedBooks.reduce(function(total,book){return total+book.chapters;},0),failed:0,running:true};
 search.job=job;search.limit=50;
 paintBibleSearch(job);
 try{
  if(search.version.startsWith("local:")){
   var chapters=await window.PBModules.getBibleSearchChapters(search.version);
   var catalog=new Map(selectedBooks.map(function(book){return [book.slug,book];}));
   var found=new Set();
   for(var i=0;i<chapters.length;i++){
    if(controller.signal.aborted)return;
    var chapter=chapters[i],book=catalog.get(chapter.book);
    if(!book||chapter.chapter<1||chapter.chapter>book.chapters)continue;
    var key=book.slug+"/"+chapter.chapter;
    if(found.has(key))continue;
    found.add(key);
    try{addBibleSearchChapter(job,book,chapter.chapter,chapter.verses,search.credit);}catch(_){job.failed++;}
    job.done++;
    if(i%20===0){paintBibleSearch(job);await new Promise(function(resolve){setTimeout(resolve,0);});}
   }
   job.failed+=job.total-found.size;
  }else{
   try{
    var saved=await window.PBModules.getSearchCache(search.version);
    saved.forEach(function(row){onlineSearchChapters.set(search.version+"/"+row.book+"/"+row.chapter,{verses:row.verses,credit:row.credit});});
   }catch(_){}
   if(controller.signal.aborted)return;
   var chapters=selectedBooks.flatMap(function(book){return Array.from({length:book.chapters},function(_,i){return {book:book,chapter:i+1};});});
   var missing=[];
   chapters.forEach(function(chapter){
    var cached=onlineSearchChapters.get(search.version+"/"+chapter.book.slug+"/"+chapter.chapter);
    if(cached){addBibleSearchChapter(job,chapter.book,chapter.chapter,cached.verses,cached.credit);job.done++;}
    else missing.push(chapter);
   });
   if(navigator.onLine===false){job.failed+=missing.length;job.offline=true;return;}
   // The API accepts at most 50 references in a batch. Use 25 full chapters.
   for(var offset=0;offset<missing.length;offset+=25){
    if(controller.signal.aborted)return;
    var batch=missing.slice(offset,offset+25);
    try{
     var params=new URLSearchParams({version:search.version,refs:batch.map(function(item){return item.book.slug+" "+item.chapter;}).join(",")});
     var response=await fetch(API+"/passages?"+params,{signal:controller.signal});
     if(!response.ok)throw Error("Falha na consulta");
     var payload=await response.json();
     var downloaded=[];
     batch.forEach(function(item,i){
      var data=payload.data?.[i];
      if(!data||data.error||data.book!==item.book.slug||Number(data.chapter)!==item.chapter||data.version!==search.version){job.failed++;return;}
      try{
       addBibleSearchChapter(job,item.book,item.chapter,data.verses,payload.meta?.copyright);
       onlineSearchChapters.set(search.version+"/"+item.book.slug+"/"+item.chapter,{verses:data.verses,credit:payload.meta?.copyright});
       downloaded.push({book:item.book.slug,chapter:item.chapter,verses:data.verses,credit:payload.meta?.copyright});
      }catch(_){job.failed++;}
     });
     try{await window.PBModules.saveSearchCache(search.version,downloaded);}catch(_){job.cacheUnavailable=true;}
    }catch(error){if(controller.signal.aborted)return;job.failed+=batch.length;}
    job.done+=batch.length;
    paintBibleSearch(job);
   }
  }
 }catch(error){if(controller.signal.aborted)return;job.failed=Math.max(1,job.total-job.done);}
 finally{
  if(bibleSearch?.job===job){job.running=false;job.cancelled=controller.signal.aborted;paintBibleSearch(job);}
 }
}
function openBibleSearch(){
 closeBibleSearch();
 var root=document.createElement("div");root.className="modal-backdrop";root.id="pb-bible-search";
 var local=window.PBModules.getModuleByVersion(state.version);
 var versions=toolbarNavigation().versions.filter(function(version){return version.value===state.version||version.value.startsWith("local:");});
 var chosen=navigator.onLine===false&&!local?versions.find(function(version){return version.value.startsWith("local:");})?.value||state.version:state.version;
 root.innerHTML='<section class="modal pb-bible-search-dialog" role="dialog" aria-modal="true" aria-labelledby="pb-bible-search-title">'+
  '<header class="panel-heading"><h2 id="pb-bible-search-title">🔍 Buscar na Bíblia</h2><button type="button" class="btn slim" data-bsearch="close" aria-label="Fechar pesquisa">×</button></header>'+
  '<p class="feature-note">Bíblias instaladas podem ser pesquisadas offline. Capítulos consultados online também ficam salvos neste aparelho.</p>'+
  '<form id="pb-bible-search-form"><label for="pb-bible-search-version">Tradução</label><select class="select" id="pb-bible-search-version">'+versions.map(function(version){
   return '<option value="'+esc(version.value)+'"'+(version.value===chosen?' selected':'')+'>'+esc(version.label)+(version.value.startsWith("local:")?' · instalada':'')+'</option>';
  }).join("")+'</select><label for="pb-bible-search-query">Palavra ou expressão</label><input class="field" type="search" id="pb-bible-search-query" maxlength="100" placeholder="Ex.: propósito" required>'+
  '<label for="pb-bible-search-scope">Pesquisar em</label><select class="select" id="pb-bible-search-scope"><option value="all">Toda a Bíblia</option><option value="ot">Antigo Testamento</option><option value="nt">Novo Testamento</option></select>'+
  '<button class="btn primary" type="submit">Pesquisar</button></form>'+
  '<p id="pb-bible-search-status" role="status" aria-live="polite">A pesquisa aceita palavras com ou sem acento.</p>'+
  '<button type="button" class="btn slim" data-bsearch="cancel" hidden>Interromper pesquisa</button>'+
  '<div id="pb-bible-search-results"></div><button type="button" class="btn slim" data-bsearch="more" hidden>Mostrar mais resultados</button>'+
  '<p class="credit" id="pb-bible-search-credit"></p></section>';
 bibleSearch={root:root,version:state.version,credit:local?.license||"",focus:document.activeElement,limit:50};
 root.addEventListener("submit",function(event){event.preventDefault();runBibleSearch();});
 root.addEventListener("click",function(event){
  var result=event.target.closest("[data-bsearch-result]");
  if(result){
   var row=bibleSearch.rows[Number(result.dataset.bsearchResult)],version=bibleSearch.version;
   closeBibleSearch();
   followReference({book:row.book,chapter:row.chapter,verse:row.verse,endVerse:row.verse},version);
   return;
  }
  var action=event.target.closest("[data-bsearch]")?.dataset.bsearch;
  if(action==="close"||event.target===root)closeBibleSearch();
  if(action==="cancel")bibleSearch.controller?.abort();
  if(action==="more"){bibleSearch.limit+=50;paintBibleSearch(bibleSearch.job);}
 });
 root.addEventListener("keydown",function(event){
  if(event.key==="Escape"){event.preventDefault();closeBibleSearch();return;}
  if(event.key==="Tab"){
   var controls=Array.from(root.querySelectorAll("button,input,select")).filter(function(node){return !node.hidden;});
   var first=controls[0],last=controls[controls.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
 });
 root.addEventListener("change",function(event){if(event.target.id==="pb-bible-search-version")bibleSearch.versionChosen=true;});
 document.body.appendChild(root);root.querySelector("#pb-bible-search-query").focus();
 window.PBModules.ready().then(function(){
  if(bibleSearch?.root!==root||bibleSearch.job)return;
  var field=root.querySelector("#pb-bible-search-version"),previous=field.value;
  var available=toolbarNavigation().versions.filter(function(version){return version.value===bibleSearch.version||version.value.startsWith("local:");});
  var preferred=navigator.onLine===false&&!bibleSearch.versionChosen?available.find(function(version){return version.value.startsWith("local:");})?.value||previous:previous;
  field.innerHTML=available.map(function(version){
   return '<option value="'+esc(version.value)+'"'+(version.value===preferred?' selected':'')+'>'+esc(version.label)+(version.value.startsWith("local:")?' · instalada':'')+'</option>';
  }).join("");
 }).catch(function(){});
}

function noteModal(){
 var n=currentNote();var modal=document.createElement("div");modal.className="modal-backdrop";modal.id="pb-modal";
 modal.innerHTML='<div class="modal"><div class="panel-heading"><h2 class="section-heading">Anotação · '+esc(ref())+'</h2><button class="btn slim" data-act="close-modal">Fechar ✕</button></div><p class="feature-note">Registre sua observação, interpretação ou dúvida.</p><textarea id="note-text" class="editor large" placeholder="Escreva sua anotação…">'+esc(n&&n.text||"")+'</textarea><div class="btn-row"><button class="btn" data-act="close-modal">Cancelar</button><button class="btn primary" data-act="save-note">Salvar anotação</button></div></div>';
 document.body.appendChild(modal);document.getElementById("note-text").focus();
}
function parseRef(r){var match=String(r).match(/^(.+?)\s+(\d+)(?::(\d+))?/);if(!match)return null;var name=match[1].trim().toLowerCase();var b=books.find(function(b){return b.name.toLowerCase()===name;})||booksFallback.find(function(b){return b.name.toLowerCase()===name;});if(!b)return null;return {book:b.slug,ch:+match[2],verse:match[3]?+match[3]:0};}
function openRef(r){var p=parseRef(r);if(!p){notify("Referência não reconhecida");return;}state.book=p.book;state.chapter=p.ch;state.selectedVerse=p.verse;activeBook=books.find(function(b){return b.slug===p.book;})||booksFallback.find(function(b){return b.slug===p.book;})||activeBook;page("leitura");}
async function lookupReference(s,onFound=setRef){
 if(!s.trim()){notify("Digite uma referência");return;}
 var q=s.trim(),m=q.match(/^(.+?)\s+(\d+)(?::(\d+))?/);if(m){var b=books.find(function(b){return b.name.toLowerCase()===m[1].toLowerCase()||b.slug===m[1].toLowerCase();})||booksFallback.find(function(b){return b.name.toLowerCase()===m[1].toLowerCase();});if(b){onFound(b.slug,+m[2],m[3]?+m[3]:0);return;}}
 try{var r=await fetch(API+"/parse?q="+encodeURIComponent(q)+"&version="+state.version);if(!r.ok)throw Error("Não encontrado");var d=(await r.json()).data||{};var bk=typeof d.book==="string"?d.book:(d.book&&d.book.slug)||d.book_slug||d.bookSlug;var b2=books.find(function(b){return b.slug===bk||b.name.toLowerCase()===String(bk).toLowerCase();});if(b2&&d.chapter){onFound(b2.slug,d.chapter,Number(d.verse_start||d.verseStart||d.verse)||0);return;}throw Error("Referência");}catch(e){notify("Não localizei a referência. Experimente: João 3:16 ou Gênesis 1.");}
}
function parseLinkedReference(raw){
 var q=String(raw||"").trim().replace(/\s+/g," ");
 var m=/^(.+?)(?:\.\s*|\s+)(\d{1,3})(?:[:.,]\s*(\d{1,3})(?:\s*[-–—]\s*(?:(\d{1,3})[:.,]\s*)?(\d{1,3}))?)?$/.exec(q);
 if(!m)return null;
 var alias=m[1].toLocaleLowerCase("pt-BR").replace(/\./g,"").trim();
 var normalizedAlias=alias.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 var slug=BOOK_LINK_ALIASES[alias]||BOOK_LINK_ALIASES[normalizedAlias]||normalizedAlias.replace(/\s+/g,"-");
 var book=books.find(function(b){return b.slug===slug||b.name.toLocaleLowerCase("pt-BR")===alias;})||booksFallback.find(function(b){return b.slug===slug||b.name.toLocaleLowerCase("pt-BR")===alias;});
 if(!book)return null;
 var chapter=Number(m[2]),verse=Number(m[3]||0);
 if(chapter<1||chapter>book.chapters)return null;
 return {book:book.slug,chapter:chapter,verse:verse,endVerse:!m[4]&&Number(m[5])>=verse?Number(m[5]):verse};
}
function openLinkedReference(reference){
 var parsed=parseLinkedReference(reference);
 if(parsed){followReference(parsed);return;}
 var originalLoad=loadSeq;
 lookupReference(String(reference||""),function(book,chapter,verse){
  if(loadSeq===originalLoad&&state.page==="leitura"){
   followReference({book:book,chapter:Number(chapter),verse:verse,endVerse:verse});
  }
 });
}
function followReference(parsed,version){
 var commentScroll=document.getElementById("pb-split-scroll")?.scrollTop||0;
 var dictionaryScroll=document.getElementById("pb-dictionary-scroll")?.scrollTop||0;
 if((version&&version!==state.version)||parsed.book!==state.book||parsed.chapter!==state.chapter||parsed.verse!==state.selectedVerse){
  referenceHistory.push({
   version:state.version,label:ref(),book:state.book,chapter:state.chapter,verse:state.selectedVerse,passage:linkedPassage,
   splitStudy:state.splitStudy,dictionaryOpen:state.dictionaryOpen,
   commentModuleId:state.commentModuleId,dictionaryModuleId:state.dictionaryModuleId,
   dictionaryQuery:state.dictionaryQuery,dictionaryTerm:state.dictionaryTerm,
   bibleScroll:document.getElementById("pb-split-bible")?.scrollTop??window.scrollY,
   commentScroll:commentScroll,dictionaryScroll:dictionaryScroll
  });
  if(referenceHistory.length>50)referenceHistory.shift();
 }
 if(version)state.version=version;
 pendingCommentScroll=0;
 pendingDictionaryScroll=dictionaryScroll;
 pendingBibleScroll=null;
 focusCommentVerse=parsed.verse;
 setRef(parsed.book,parsed.chapter,parsed.verse,parsed);
}
function returnToReference(){
 var previous=referenceHistory.pop();
 if(!previous)return;
 state.version=previous.version;
 state.splitStudy=previous.splitStudy;
 state.dictionaryOpen=previous.dictionaryOpen;
 state.commentModuleId=previous.commentModuleId;
 state.dictionaryModuleId=previous.dictionaryModuleId;
 state.dictionaryQuery=previous.dictionaryQuery;
 state.dictionaryTerm=previous.dictionaryTerm;
 pendingCommentScroll=previous.commentScroll;
 pendingDictionaryScroll=previous.dictionaryScroll;
 pendingBibleScroll=previous.bibleScroll;
 focusCommentVerse=0;
 setRef(previous.book,previous.chapter,previous.verse,previous.passage);
}
function sermonText(){var s=state.sermon;return [s.title,s.reference,"","Contexto histórico e literário",s.context,"","Introdução",s.introduction,"","1. Exposição",s.point1,"","2. Exposição",s.point2,"","Aplicação",s.application,"","Conclusão",s.conclusion].join("\n");}
document.addEventListener("pointerdown",function(event){
 if(state.page!=="devocional")return;
 if(event.target.closest('[data-act="pb-dev-mark"], [data-act="pb-dev-copy"]')){
  pbDevSelection=pbDevReadSelection();
  if(event.pointerType==="mouse")event.preventDefault();
 }
});
document.addEventListener("click",function(ev){

 /* As consultas do texto bíblico usam os handlers do leitor. */
 if(ev.target.closest("#chapter-body"))return;
 var comment=ev.target.closest("[data-comment-sermon]");if(comment){state.sermon.context+=(state.sermon.context?"\n\n":"")+comment.dataset.commentText;persist();notify("Trecho do comentário adicionado ao sermão");return;}
 var historySearch=ev.target.closest("[data-pb2-search-history]");if(historySearch){var d=pb2Read();d.query=historySearch.dataset.pb2SearchHistory;pb2Write(d);pb2SearchHistory(d.query);pb2RenderSearch();return;}
 var graphNode=ev.target.closest("[data-pb-graph-node],[data-pb-graph-center]");if(graphNode){pbGraphSession.center=graphNode.dataset.pbGraphNode||graphNode.dataset.pbGraphCenter;pbGraphStore();pbShowGraphResults();return;}
 var savedGraph=ev.target.closest("[data-pb-graph-saved]");if(savedGraph){var x=(pb2Read().graphSaved||[])[Number(savedGraph.dataset.pbGraphSaved)];if(x){var d=pb2Read();d.graphQuery=x.query;pbGraphSession.center=x.center;pbGraphSession.depth=x.depth;pbGraphSession.filter=x.filter;pbGraphStore();pbRenderGraph();}return;}
 var graphRef=ev.target.closest("[data-pb-graph-ref]");if(graphRef){lookupReference(graphRef.dataset.pbGraphRef);return;}
 var activity=ev.target.closest("[data-study-activity]");if(activity){var term=(historicalFilters.term||"").toLocaleLowerCase("pt-BR");var rows=studyActivity().filter(function(r){var b=books.find(function(x){return x.slug===r.book;})||booksFallback.find(function(x){return x.slug===r.book;});return (!term||[r.label,r.detail,r.type,r.chapter,b&&b.name].join(" ").toLocaleLowerCase("pt-BR").includes(term))&&(!historicalFilters.book||historicalFilters.book===r.book);});var record=rows[Number(activity.dataset.studyActivity)];if(record){state.book=record.book;state.chapter=record.chapter;state.selectedVerse=record.verse;
 if(record.type==="Comentário"){state.commentModuleId=(record.extra&&record.extra.moduleId)||state.commentModuleId;state.splitStudy=true;state.dictionaryOpen=false;}
 if(record.type==="Dicionário"||record.type==="Palavra pesquisada"){state.dictionaryOpen=true;state.splitStudy=true;}activeBook=books.find(function(b){return b.slug===state.book;})||booksFallback.find(function(b){return b.slug===state.book;})||activeBook;page("leitura");}return;}
 var histTab=ev.target.closest("[data-historical-tab]");if(histTab){historicalActiveTab=histTab.dataset.historicalTab;renderHistoricalDiary();return;}
 var histOpen=ev.target.closest("[data-historical-open]");if(histOpen){var parts=histOpen.dataset.historicalOpen.split(":");state.book=parts[0];state.chapter=Number(parts[1]);activeBook=books.find(function(b){return b.slug===state.book;})||booksFallback.find(function(b){return b.slug===state.book;})||activeBook;persist();renderHistoricalDiary();return;}
 var nav=ev.target.closest("[data-page]");if(nav){page(nav.dataset.page);return;}
 var w=ev.target.closest("[data-word]");if(w){currentWord=words.find(function(t){return t.id===w.dataset.word;})||currentWord;renderOriginal();return;}
 var st=ev.target.closest("[data-step]");if(st){state.tutorStep=+st.dataset.step;persist();renderTutor();return;}
 var ans=ev.target.closest("[data-answer]");if(ans){var p=ans.dataset.answer.split(":");state.exerciseAnswers[+p[0]]=+p[1];persist();renderExercises();return;}
 var rw=ev.target.closest("[data-ref-open]");if(rw){openRef(rw.dataset.refOpen);return;}
 var dl=ev.target.closest("[data-note-delete]");if(dl){state.notes=state.notes.filter(function(n){return n.ref!==dl.dataset.noteDelete;});persist();renderNotebook();notify("Anotação excluída");return;}
 var ub=ev.target.closest("[data-unbookmark]");if(ub){state.bookmarks=state.bookmarks.filter(function(r){return r!==ub.dataset.unbookmark;});persist();renderNotebook();return;}
 var el=ev.target.closest("[data-act]");if(!el)return;
 var a=el.dataset.act;

 if(a==="historico-go-reading"){page("leitura");return;}
 if(a==="historico-clear"){historicalFilters={term:"",book:"",period:"",theme:"",type:""};renderHistoricalDiary();return;}
 if(a==="pb-graph-search"){var d=pb2Read();d.graphQuery=document.getElementById("pb-graph-query").value;pbGraphSession.center="";d.graphCenter="";pb2Write(d);pbShowGraphResults();return;}
 if(a==="pb-graph-current"){var n=books.findIndex(function(b){return b.slug===state.book;})+1;pbGraphSession.center=pbGraphId([n,state.chapter,state.selectedVerse||1]);pbGraphStore();pbShowGraphResults();return;}
 if(a==="pb-graph-save"){var d=pb2Read();d.graphSaved=d.graphSaved||[];d.graphSaved.unshift({at:new Date().toISOString(),query:d.graphQuery||"",center:pbGraphSession.center,depth:pbGraphSession.depth,filter:pbGraphSession.filter});d.graphSaved=d.graphSaved.slice(0,100);pb2Write(d);pbGraphSavedList();notify("Investigação salva");return;}
 if(a==="pb-graph-sermon"){var r=pbGraphReference(pbGraphNode(pbGraphSession.center));state.sermon.context=(state.sermon.context||"")+"\nInvestigação bíblica: "+r+" — fonte: Midvash, CC BY 4.0. Verifique as relações no contexto.";persist();page("sermao");return;}
 if(a==="pb-graph-zoom-in"||a==="pb-graph-zoom-out"||a==="pb-graph-reset"){var el=document.querySelector("#pb-graph-canvas svg");if(el){var z=Number(el.dataset.zoom||1);z=a==="pb-graph-reset"?1:Math.max(.7,Math.min(2.5,z*(a==="pb-graph-zoom-in"?1.2:.83)));el.dataset.zoom=z;el.style.width=(100*z)+"%";}return;}
 if(a==="pb-graph-path"){var from=document.getElementById("pb-graph-from").value,to=document.getElementById("pb-graph-to").value;var parse=function(v){var p=parseRef(v);if(!p)return null;return pbGraphId([books.findIndex(function(b){return b.slug===p.book;})+1,p.ch,p.verse||1]);};var x=parse(from),y=parse(to);var path=x&&y&&pbGraphPath(x,y);var out=document.getElementById("pb-graph-results");if(out){var box=document.createElement("div");box.className="card card-pad";box.textContent=path?"Caminho documentado: "+path.map(function(id){return pbGraphReference(pbGraphNode(id));}).join(" → "):"Nenhum caminho encontrado na base local entre essas passagens.";out.prepend(box);}return;}
 if(a==="pb-voice-start"){pbVoiceStart();return;}
 if(a==="pb-voice-text"){pbVoiceCommand(document.getElementById("pb-voice-text").value);return;}
 if(a==="pb-coach-save"){var d=pb2Read();d.coach=document.getElementById("pb-coach-notes").value;pb2Write(d);notify("Avaliação salva");return;}
 if(a==="pb-coach-sermon"){page("sermao");return;}
 if(a==="pb2-backup"){pb2Backup();return;}
 if(a==="pb2-search"){var d=pb2Read();d.query=document.getElementById("pb2-query").value.trim();d.filter=document.getElementById("pb2-filter").value;pb2Write(d);pb2SearchHistory(d.query);pb2RenderSearch();return;}
 if(a==="pb2-search-clear"){var d=pb2Read();d.searchHistory=[];pb2Write(d);pb2RenderSearch();return;}
 if(a==="pb2-open-bible-search"){openBibleSearch();return;}
 if(a==="pb-dev-open"){pbDevOpen(el.dataset.devId,el.dataset.devKey);return;}
 if(a==="pb-dev-mark"||a==="pb-dev-copy"){pbDevReaderAction(a);return;}
 if(a==="pb-dev-remove"){var id=el.dataset.devId;if(!window.confirm("Remover este módulo de devocionais? As anotações pessoais dos planos serão preservadas."))return;pbDevRemove(id).then(pb2RenderPlans).catch(function(e){notify(e.message);});return;}
 if(a==="pb2-plan-edit"){var id=el.dataset.planId,d=pb2Read(),p=(d.plans||[]).find(function(x){return x.id===id;});if(!p)return;var name=window.prompt("Nome do plano:",p.title||"");if(name===null)return;name=name.trim();if(!name){notify("O nome não pode ficar vazio.");return;}p.title=name;pb2Write(d);pb2RenderPlans();return;}
 if(a==="pb2-plan-delete"){var id=el.dataset.planId,d=pb2Read(),p=(d.plans||[]).find(function(x){return x.id===id;});if(!p)return;if(!window.confirm('Excluir o plano "'+p.title+'", seu progresso e seus devocionais? Esta ação não pode ser desfeita.'))return;d.plans=d.plans.filter(function(x){return x.id!==id;});pb2Write(d);pb2RenderPlans();return;}
 if(a==="pb2-plan-add"){
  var d=pb2Read(),draft=pbPlanDraft();
  if(!draft.count||!draft.dates){notify("Informe uma quantidade válida para o prazo do plano.");return;}
  var title=document.getElementById("pb2-plan-title").value.trim()||(draft.scope==="book"?draft.book.name:pbPlanScopes[draft.scope]);
  var plan={id:pbWinEscapeId(),title:title,pace:draft.pace,scope:draft.scope==="book"?undefined:draft.scope,
   startDate:draft.dates.startDate,durationDays:draft.unit==="pace"?null:draft.dates.durationDays,
   devotionalModule:pbPlanSelectedDevotional(document.getElementById("pb-plan-new-picker")),
   references:draft.chosen.flatMap(function(book){
    return Array.from({length:book.chapters},function(_,i){return book.name+" "+(i+1);});
   }),done:{}};
  d.plans=(d.plans||[]).concat(plan);
  if(pb2Write(d)){
   pb2RenderPlans();
   document.getElementById("pb-plan-"+plan.id)?.focus();
  }
  return;
 }
 if(a==="pb-plan-devotionals-save"){
  var d=pb2Read(),plan=(d.plans||[]).find(function(p){return p.id===el.dataset.planId;});
  if(!plan)return;
  plan.devotionalModule=pbPlanSelectedDevotional(el.closest("[data-pb-plan-picker]"));
  delete plan.devotionalModules;
  if(pb2Write(d)){
   pb2RenderPlans();
   document.getElementById("pb-plan-"+plan.id)?.focus();
   notify("Devocional atualizado");
  }
  return;
 }
 if(a==="pb-plan-moment"){
  var d=pb2Read(),plan=(d.plans||[]).find(function(p){return p.id===el.dataset.planId;});
  var day=Number(el.dataset.day),moment=el.dataset.moment;
  var refs=plan&&pbPlanDays(plan).at(day);
  if(!refs||!pbPlanMoments.some(function(item){return item.id===moment;}))return;
  var complete=!pbPlanMomentDone(plan,refs,day,moment);
  plan.dailyDevotional=plan.dailyDevotional||{};
  pbPlanDayKeys(refs,day).forEach(function(ref){
   var progress=plan.dailyDevotional[ref]||{};
   progress[moment]=complete;
   plan.dailyDevotional[ref]=progress;
  });
  if(pb2Write(d)){
   pbPlanSelectedDays.set(plan.id,day);
   pb2RenderPlans();
   document.getElementById(el.id)?.focus({preventScroll:true});
  }
  return;
 }
 if(a==="pb-reader-windows"){var picker=document.getElementById("pb-reader-window-picker");if(picker)picker.style.display=picker.style.display==="none"?"block":"none";return;}
 if(a==="pb-reader-add"){var w=pbWinRead();if(w.length>=12){notify("Limite de 12 janelas.");return;}w.push({id:pbWinEscapeId(),type:el.dataset.winType,group:"A",book:state.book,chapter:state.chapter,moduleId:"",term:""});pbWinSave(w);pbReaderWindowsRender();return;}
 if(a==="pb-reader-close-window"){pbWinSave(pbWinRead().filter(function(w){return w.id!==el.dataset.winId;}));pbReaderWindowsRender();return;}
 if(a==="pb-win-add"){var type=document.getElementById("pb-win-kind").value,w=pbWinRead();if(w.length>=12){notify("Limite de 12 janelas por layout.");return;}w.push({id:pbWinEscapeId(),type:type,group:"A",book:state.book,chapter:state.chapter,moduleId:"",term:"",verse:1});pbWinSave(w);pbWinRender();return;}
 if(a==="pb-win-remove"){pbWinSave(pbWinRead().filter(function(w){return w.id!==el.dataset.winId;}));pbWinRender();return;}
 if(a==="pb-win-refresh"){pbWinRender();return;}
 if(a==="pb-win-load"){var w=pbWinRead().find(function(x){return x.id===el.dataset.winId;});if(w)pbWinLoad(w);return;}
 if(a==="pb2-panel-open"){state.splitStudy=true;state.dictionaryOpen=true;page("leitura");return;}
 if(a==="pb2-panel-lock"){var d=pb2Read();d.panels={lock:document.getElementById("pb2-panel-lock").checked,reference:activeBook.name+" "+state.chapter};pb2Write(d);pb2RenderPanels();return;}
 if(a==="historico-search"){historicalFilters.term=(document.getElementById("historical-search")||{}).value||"";renderHistoricalDiary();return;}
 if(a==="toggle-strong"){toggleStrongNumbers();return;}
 if(a==="reference-back"){returnToReference();return;}
 if(a==="toggle-comments"){if(window.PBReaderMultiWindow&&window.PBReaderMultiWindow.isActive())window.PBReaderMultiWindow.openTool("commentary");else toolbarAction("comments");return;}
 if(a==="open-dictionary"){if(window.PBReaderMultiWindow&&window.PBReaderMultiWindow.isActive())window.PBReaderMultiWindow.openTool("dictionary");else showDictionaryPanel();return;}
 if(a==="toggle-crossrefs"){state.showCrossRefs=!state.showCrossRefs;persist();renderReader();return;}
 if(a==="toggle-parallel"){state.showParallel=!state.showParallel;persist();renderReader();return;}
 if(a==="reader-font-down"){state.fontSize=Math.max(14,state.fontSize-2);TS.actions.setFontSize(state.fontSize);persist();renderReader();return;}
 if(a==="reader-font-up"){state.fontSize=Math.min(28,state.fontSize+2);persist();renderReader();return;}
 if(a==="focus-mode"){state.focusMode=!state.focusMode;persist();renderReader();document.body.classList.toggle("focus-reading",state.focusMode);return;}
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
 if(a==="sermon-library"){document.getElementById("sermon-library").focus();return;}
 if(a==="sermon-new"||a==="sermon-edit"||a==="sermon-save"||a==="sermon-delete"){handleSermonAction(a,el.dataset.sermonId);return;}
 if(a==="sermon-from-ref"){state.sermon.reference=ref();persist();renderSermon();notify("Passagem inserida no esboço");return;}
 if(a==="sermon-copy"){navigator.clipboard.writeText(sermonText()).then(function(){notify("Esboço copiado");}).catch(function(){notify("Cópia não permitida neste navegador");});return;}
 if(a==="sermon-export"){var blob=new Blob([sermonText()],{type:"text/plain;charset=utf-8"});var url=URL.createObjectURL(blob);var link=document.createElement("a");link.href=url;link.download="Pulpito-Bible-Sermao.txt";link.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);notify("Esboço exportado");return;}
});
document.addEventListener("change",function(ev){var t=ev.target;if(t.id==="pb-graph-depth"||t.id==="pb-graph-filter"){pbGraphSession.depth=Math.max(1,Math.min(6,Number(document.getElementById("pb-graph-depth").value)||1));pbGraphSession.filter=document.getElementById("pb-graph-filter").value;pbGraphStore();pbShowGraphResults();return;}});
document.addEventListener("change",function(ev){
 var target=ev.target;
 if(["pb-plan-scope","pb-plan-unit","pb2-plan-book"].includes(target.id))pbPlanPreview();
 if(target.dataset.pbPlanDay){
  if(target.type==="number"&&(!target.value||!target.reportValidity()))return;
  pbPlanSelectedDays.set(target.dataset.pbPlanDay,Number(target.value)-(target.type==="number"?1:0));
  pb2RenderPlans();
  document.getElementById(target.id)?.focus({preventScroll:true});
 }
});
document.addEventListener("change",function(ev){var t=ev.target;if(t.dataset.pb2Done){var d=pb2Read(),p=(d.plans||[]).find(function(x){return x.id===t.dataset.pb2Done;});if(p){p.done=p.done||{};if(t.checked)p.done[t.dataset.ref]=true;else delete p.done[t.dataset.ref];pb2Write(d);pb2RenderPlans();}return;}if(t.dataset.readerWinSync){var windows=pbWinRead(),w=windows.find(function(x){return x.id===t.dataset.readerWinSync;});if(w){w.group=t.value==="B"?"B":"A";if(w.group==="B"){w.book=state.book;w.chapter=state.chapter;w.verse=Number(state.selectedVerse)||1;}pbWinSave(windows);pbReaderWindowsRender();}return;}
 if(t.dataset.readerWinModule){var w=pbWinRead(),item=w.find(function(x){return x.id===t.dataset.readerWinModule;});if(item){item.moduleId=t.value;pbWinSave(w);pbReaderWindowsRender();}return;}
 if(t.dataset.readerWinTerm){var w=pbWinRead(),item=w.find(function(x){return x.id===t.dataset.readerWinTerm;});if(item){item.term=t.value;pbWinSave(w);pbReaderWindowsRender();}return;}
 if(t.dataset.winField){var windows=pbWinRead(),w=windows.find(function(x){return x.id===t.dataset.winId;});if(w){w[t.dataset.winField]=t.value;pbWinSave(w);if(t.dataset.winField!=="term")pbWinRender();}return;}if(t.id==="pb-dev-entry"&&state.devotionalReader){state.devotionalReader.key=t.value;pbDevRenderReader();return;}if(t.id==="pb-dev-import"){pbDevImport(t.files&&t.files[0]);return;}if(t.dataset.pb2Devotional){var d=pb2Read(),p=(d.plans||[]).find(function(x){return x.id===t.dataset.pb2Devotional;});if(p){p.devotionals=p.devotionals||{};p.devotionals[t.dataset.ref]=t.value;pb2Write(d);}return;}if(t.dataset.pb2Pace){var d=pb2Read(),p=(d.plans||[]).find(function(x){return x.id===t.dataset.pb2Pace;});if(p){p.pace=pbPlanPace(t.value);if(pb2Write(d)){pbPlanSelectedDays.delete(p.id);pb2RenderPlans();}}return;}});
document.addEventListener("change",function(ev){
 var t=ev.target;
 if(t.id==="reader-mode"){state.readerMode=t.value;persist();renderReaderContent();return;}
 if(t.id==="reader-paper"){state.readerTheme=t.value;persist();renderReader();return;}
 if(t.id==="book-select"){var found=books.find(function(b){return b.slug===t.value;});if(found){activeBook=found;state.selectedVerse=0;setRef(found.slug,1);}return;}
 if(t.id==="chapter-select"){setRef(state.book,+t.value);return;}
 if(t.id==="version-select"){state.version=t.value;persist();renderReader();return;}
 if(t.id==="parallel-version-select"){state.parallelVersion=t.value;persist();renderReader();return;}
});
document.addEventListener("change",function(ev){var t=ev.target;if(t.dataset.historicalFilter){historicalFilters[t.dataset.historicalFilter]=t.value;renderHistoricalDiary();}if(t.dataset.historicalField&&t.tagName==="SELECT"){var key=state.book+":"+state.chapter;state.historicalDiary=state.historicalDiary||{};state.historicalDiary[key]=state.historicalDiary[key]||{};state.historicalDiary[key][t.dataset.historicalField]=t.value;persist();}});
document.addEventListener("input",function(ev){
 var t=ev.target;
 if(t.id==="pb-plan-amount"||t.id==="pb2-plan-pace")pbPlanPreview();
 if(t.id==="tutor-answer"){var st=getStudy();st.answers[state.tutorStep]=t.value;state.studies[studyKey()]=st;persist();}
 if(t.dataset.sermon){state.sermon[t.dataset.sermon]=t.value;persist();}
 if(t.dataset.historicalFilter){historicalFilters[t.dataset.historicalFilter]=t.value;renderHistoricalDiary();return;}
 if(t.dataset.historicalField){var diaryKey=state.book+":"+state.chapter;state.historicalDiary=state.historicalDiary||{};var diaryEntry=state.historicalDiary[diaryKey]||{};diaryEntry[t.dataset.historicalField]=t.value;state.historicalDiary[diaryKey]=diaryEntry;persist();}
 if(t.id==="note-filter"){state.noteFilter=t.value;persist();var p=t.selectionStart;renderNotebook();var n=document.getElementById("note-filter");n.focus();n.setSelectionRange(p,p);}
});
document.addEventListener("keydown",function(ev){if(ev.key==="Escape"){TS.actions.clearSelection();refreshVerseDecorations();}if(ev.key==="Enter"&&ev.target.id==="reference-search"){ev.preventDefault();lookupReference(ev.target.value);}if(ev.key==="Enter"&&ev.target.id==="word-search"){ev.preventDefault();wordFilter=ev.target.value;renderOriginal();}});
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

/* Púlpito Bible — gerenciador integrado de até quatro janelas de estudo.
   Reutiliza os módulos já instalados em IndexedDB e preserva o armazenamento legado. */
var PBReaderMultiWindow=window.PBWindowUI.createReaderManager({
 get state(){return state;},get books(){return books;},get activeBook(){return activeBook;},
 esc:esc,
 notify:notify,
 renderReader:renderReader,
 setRef:setRef,
 ref:ref,
 persist:persist,
 loadOnlineBibleChapter:loadOnlineBibleChapter,
 annotateVerse:annotateVerse,
 renderStrongEntry:renderStrongEntry,
 pbDevAll:pbDevAll,
 pbDevOpenButton:pbDevOpenButton,
 pb2Read:pb2Read,
 page:page,
 booksFallback:booksFallback,
 words:words
});
window.PBReaderMultiWindow=PBReaderMultiWindow;



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
