(function(global){
"use strict";
var config=null,requestId=0,selectedContext=null,initialized=false;
function escapeHtml(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function wrapHtml(html){
 var tags=String(html||"").split(/(<[^>]*>)/g),stack=[];
 function wrapChunk(text){
  return text.split(/(&(?:#\d+|#x[0-9a-f]+|[a-z]+);)/gi).map(function(fragment){
   if(/^&(?:#\d+|#x[0-9a-f]+|[a-z]+);$/i.test(fragment))return fragment;
   return fragment.replace(/[\p{L}\p{M}]+(?:[’'-][\p{L}\p{M}]+)*/gu,function(word){
    return '<span class="pb-linked-word" data-pb-word="'+escapeHtml(word)+'" role="button" tabindex="0" title="Consultar palavra nos dicionários e comentários">'+word+'</span>';
   });
  }).join("");
 }
 return tags.map(function(part){
  if(part.charAt(0)==="<"){
   if(/^<\s*\//.test(part)){if(stack.length)stack.pop();return part;}
   var m=/^<\s*([a-z][\w-]*)/i.exec(part);
   if(m&&!/\/\s*>$/.test(part)&&!["br","hr","img","input","meta"].includes(m[1].toLowerCase())){
    stack.push(m[1].toLowerCase()==="button"||m[1].toLowerCase()==="a"||/strong-word/.test(part));
   }
   return part;
  }
  return stack.some(Boolean)?part:wrapChunk(part);
 }).join("");
}
function explicitStrongLinks(raw){
 var s=String(raw||""),out="",last=0,m,re=/\b([GH])0*(\d{1,5})\b/gi;
 while((m=re.exec(s))!==null){
  out+=escapeHtml(s.slice(last,m.index));
  var code=m[1].toUpperCase()+Number(m[2]);
  out+='<button type="button" class="pb-context-strong" data-strong="'+code+'">'+code+'</button>';
  last=m.index+m[0].length;
 }
 return out+escapeHtml(s.slice(last));
}
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
function open(kind,verse,word,anchor){
 close();
 var seq=requestId,context=getReference(verse);
 var query=String(word||"").trim().slice(0,110);
 selectedContext={kind:kind,query:query,reference:context,comments:[]};
 if(config&&config.setVerse)config.setVerse(context.verse);
 var modal=document.createElement("div");modal.id="pb-connected-panel";modal.className="pb-connected-backdrop myb-window-backdrop";
 modal.innerHTML='<section class="pb-connected-sheet myb-window" role="dialog" aria-label="Estudo conectado" aria-modal="false">'+
 '<header class="myb-titlebar" data-pb-win-titlebar><div class="myb-titlebar-icon">▤</div><div class="myb-titlebar-info"><strong>ESTUDO CONECTADO</strong><small>'+escapeHtml(kind==="word"?query:(context.name+" "+context.chapter+":"+context.verse))+' · '+escapeHtml(context.name+" "+context.chapter+(context.verse?":"+context.verse:""))+'</small></div>'+
 '<div class="myb-window-controls"><button type="button" data-pb-win-action="minimize" aria-label="Recolher janela" title="Recolher">—</button><button type="button" data-pb-win-action="maximize" aria-label="Ampliar janela" title="Ampliar">▣</button><button type="button" data-pb-win-action="close" aria-label="Fechar janela" title="Fechar">×</button></div></header>'+
 '<nav class="myb-window-tabs" aria-label="Conteúdo da janela" role="tablist"><button type="button" data-pb-win-tab="dictionary" role="tab">α Dicionário</button><button type="button" data-pb-win-tab="commentaries" role="tab">▤ Comentários</button></nav>'+
 '<div class="myb-window-main"><div class="myb-quick-reference"><span class="myb-reference-label">'+escapeHtml(context.name+" "+context.chapter+":"+context.verse)+'</span><span class="myb-reference-info">'+(kind==="word"?"Pesquisa pela palavra portuguesa, sem atribuir Strong automaticamente.":"Referência selecionada · módulos instalados")+'</span></div>'+
 '<section data-pb-win-panel="dictionary" class="myb-window-panel"><div id="pb-connected-dictionary"><p class="feature-note">Consultando os léxicos instalados…</p></div></section>'+
 '<section data-pb-win-panel="commentaries" class="myb-window-panel"><div id="pb-connected-commentaries"><p class="feature-note">Consultando os comentários vinculados à passagem…</p></div></section></div>'+
 '<footer class="myb-window-footer"><button class="btn slim" type="button" data-pb-note>✎ Nota</button><button class="btn slim" type="button" data-pb-sermon>▤ Sermão</button><button class="btn primary slim" type="button" data-page="modulos">⇩ Módulos</button></footer>'+
 '</section>';
 document.body.appendChild(modal);
 if(global.PBWindowUI)global.PBWindowUI.mount(modal,{defaultTab:kind==="word"?"dictionary":"commentaries",onClose:close,anchor:anchor});
 var list=kind==="word"?[query]:verseCodes(context.verse);
 if(!list.length){
  drawResults("pb-connected-dictionary",'<p class="feature-note">Nenhum Strong confirmado para esse versículo. Toque diretamente numa palavra para pesquisar verbetes em português.</p>',seq);
 }else{
  Promise.all(list.map(function(entry){return global.PBModules.getDictionaryEntry(entry).then(function(rows){return {query:entry,rows:rows};});})).then(function(groups){
   if(seq!==requestId)return;
   var items=groups.flatMap(function(g){return g.rows.map(function(row){return {query:g.query,row:row};});});
   if(!items.length){drawResults("pb-connected-dictionary",'<p class="feature-note">Nenhum verbete correspondente nos léxicos instalados. '+(kind==="word"?"A pesquisa foi pela palavra em português, sem inferir Strong.":"Instale o dicionário Strong correspondente para ver as definições.")+'</p>',seq);return;}
   drawResults("pb-connected-dictionary",items.slice(0,30).map(function(item){
    var row=item.row;
    return '<article class="pb-connection-entry"><div><strong>'+escapeHtml(row.moduleName)+'</strong><small>'+escapeHtml(row.topic)+'</small></div><p>'+explicitStrongLinks(row.definition)+'</p></article>';
   }).join(""),seq);
  }).catch(function(e){drawResults("pb-connected-dictionary",'<p class="feature-note">Não foi possível pesquisar o dicionário: '+escapeHtml(e.message||String(e))+'</p>',seq);});
 }
 global.PBModules.getCommentaries(context.book,context.chapter,context.verse).then(function(rows){
  if(seq!==requestId)return;
  selectedContext.comments=rows;
  if(!rows.length){drawResults("pb-connected-commentaries",'<p class="feature-note">Nenhum comentário instalado cobre esta referência. Você pode importar módulos na seção Módulos.</p>',seq);return;}
  drawResults("pb-connected-commentaries",'<p class="pb-connections-count">'+rows.length+' comentário(s) encontrado(s)</p>'+rows.slice(0,30).map(function(row,i){
   var raw=String(row.text||""),short=raw.slice(0,2800);
   return '<article class="pb-connection-entry"><div><strong>'+escapeHtml(row.moduleName)+'</strong><small>'+escapeHtml(context.name+" "+(row.fromChapter||context.chapter)+(row.fromVerse?":"+row.fromVerse:""))+'</small></div>'+
    '<p>'+explicitStrongLinks(short)+(raw.length>2800?"…":"")+'</p>'+
    (raw.length>2800?'<details><summary>Ver comentário completo</summary><p>'+explicitStrongLinks(raw)+'</p></details>':"")+
    '<button class="btn slim" type="button" data-pb-comment="'+i+'">Adicionar comentário ao sermão</button></article>';
  }).join(""),seq);
 }).catch(function(e){drawResults("pb-connected-commentaries",'<p class="feature-note">Falha ao consultar comentários: '+escapeHtml(e.message||String(e))+'</p>',seq);});
}
function init(opts){
 config=opts||{};
 if(initialized)return;
 initialized=true;
 document.addEventListener("click",function(e){
  var closeBtn=e.target.closest("[data-pb-close]");
  if(closeBtn){e.preventDefault();close();return;}
  var note=e.target.closest("[data-pb-note]");
  if(note){e.preventDefault();if(config.onNote)config.onNote(selectedContext);return;}
  var sermon=e.target.closest("[data-pb-sermon]");
  if(sermon){e.preventDefault();if(config.onSermon)config.onSermon(selectedContext);return;}
  var comment=e.target.closest("[data-pb-comment]");
  if(comment){e.preventDefault();var row=selectedContext&&selectedContext.comments&&selectedContext.comments[Number(comment.dataset.pbComment)];if(row&&config.onComment)config.onComment(row,selectedContext);return;}
  var word=e.target.closest("[data-pb-word]");
  if(word){
   e.preventDefault();e.stopImmediatePropagation();
   var parent=word.closest("[data-verse]");
   open("word",parent?parent.dataset.verse:null,word.dataset.pbWord,word);
   return;
  }
  if(e.target.closest("[data-strong]"))return;
  var verse=e.target.closest("#chapter-body [data-verse]");
  if(verse&&(!config.shouldOpenVersePanel||config.shouldOpenVersePanel()))open("verse",verse.dataset.verse,"",verse);
 },true);
 document.addEventListener("keydown",function(e){
  if(e.key==="Escape"){close();return;}
  if((e.key==="Enter"||e.key===" ")&&e.target&&e.target.dataset&&e.target.dataset.pbWord){
   e.preventDefault();e.stopImmediatePropagation();
   var parent=e.target.closest("[data-verse]");open("word",parent?parent.dataset.verse:null,e.target.dataset.pbWord,e.target);
  }
 },true);
}
global.PBConnections={init:init,wrapHtml:wrapHtml,open:open,close:close};
})(window);
