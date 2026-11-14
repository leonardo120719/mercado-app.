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

async function searchCommentary(){
 if(!current)return;
 var field=current.root.querySelector("#pb-split-search"),term=String(field&&field.value||"").trim();
 if(!term){current.config.notify("Digite um termo para pesquisar nos comentários.");return;}
 var active=current,token=(active.searchToken||0)+1;active.searchToken=token;
 var target=active.root.querySelector("#pb-split-content");
 if(target)target.textContent="Pesquisando nos comentários instalados…";
 try{
  var result=await global.PBModules.searchCommentaries(term,100,function(){return current===active&&active.searchToken===token;});
  if(current!==active||active.searchToken!==token)return;
  active.searchResults=result.results||[];
  if(target)target.innerHTML=active.searchResults.length?active.searchResults.map(function(row,index){
   var label=row.book+" "+(row.fromChapter||1)+(row.fromVerse?":"+row.fromVerse:"");
   return '<article class="pb-split-entry"><div class="pb-split-entry-heading"><strong>'+esc(row.moduleName||"Comentário")+' · '+esc(label)+'</strong></div><div class="pb-split-entry-text">'+esc(row.text||"")+'</div><div class="pb-split-entry-actions"><button data-pbsplit="sermon-search" data-index="'+index+'" type="button">▤ Inserir no sermão</button><button data-pbsplit="open-search-ref" data-index="'+index+'" type="button">Abrir passagem</button></div></article>';
  }).join(""):'<div class="pb-split-message">Nenhum comentário encontrado para este termo.</div>';
  current.config.notify((result.total||0)+" resultado(s) nos comentários.");
 }catch(error){if(current===active&&active.searchToken===token&&target)target.textContent="Falha na pesquisa: "+error.message;}
}
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
function renderRows(rows,ctx,selected,terms){
 if(!rows.length)return '<div class="pb-split-message"><strong>Não há comentário do módulo '+esc(selected.name)+' para esta passagem.</strong><p>Role o texto bíblico até outro versículo ou escolha outro comentário no seletor.</p></div>';
 return rows.map(function(r,i){
  var chapter=r.fromChapter||ctx.chapter,endChapter=r.toChapter||chapter;
  var ref=(ctx.name||ctx.book)+" "+chapter+(r.fromVerse?":"+r.fromVerse:"");
  if(r.fromVerse&&r.toVerse&&(endChapter!==chapter||r.toVerse>r.fromVerse)){
   ref+="–"+(endChapter!==chapter?endChapter+":":"")+r.toVerse;
  }
  var context={name:ctx.name,book:ctx.book,chapter:chapter};
  var links=global.PBConnections;
  return '<article class="pb-split-entry"><div class="pb-split-entry-heading">'+links.referenceButton(ref,ref)+'<small>'+links.linkifyText(r.marker,[],false,context)+'</small></div>'+
   '<div class="pb-split-entry-text">'+highlightCommentaryScripture(highlightOriginalLanguage(links.linkifyText(r.text,terms,false,context)))+'</div><div class="pb-split-entry-actions">'+
   '<button data-pbsplit="sermon" data-index="'+i+'" type="button">▤ Inserir no sermão</button>'+
   '<button data-pbsplit="copy" data-index="'+i+'" type="button">▣ Copiar</button></div></article>';
 }).join("");
}
// Highlight quoted Bible passages inside the fixed commentary pane, not the Bible reader.
// Walk text nodes to preserve existing links and original-language spans.
function highlightCommentaryScripture(html){
 var template=document.createElement("template");template.innerHTML=html;
 var walker=document.createTreeWalker(template.content,NodeFilter.SHOW_TEXT);
 var nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 // Covers the quotation formats used by imported commentary modules.
 var quote=/(“[^”\n]{12,}”|«[^»\n]{12,}»|„[^“\n]{12,}“|"[^\"\n]{12,}")/g;
 nodes.forEach(function(node){
  if(node.parentElement&&node.parentElement.closest(".pb-original-language,.pb-scripture-quote,script,style"))return;
  var value=node.nodeValue;
  quote.lastIndex=0;if(!quote.test(value))return;quote.lastIndex=0;
  var fragment=document.createDocumentFragment(),last=0,match;
  while((match=quote.exec(value))){
   if(match.index>last)fragment.appendChild(document.createTextNode(value.slice(last,match.index)));
   var bold=document.createElement("strong");bold.className="pb-scripture-quote";bold.textContent=match[0];
   fragment.appendChild(bold);last=match.index+match[0].length;
  }
  if(last<value.length)fragment.appendChild(document.createTextNode(value.slice(last)));
  node.replaceWith(fragment);
 });
 return template.innerHTML;
}
// Highlight actual Greek and Hebrew script in commentary text without changing links.
function highlightOriginalLanguage(html){
 var template=document.createElement("template");template.innerHTML=html;
 var walker=document.createTreeWalker(template.content,NodeFilter.SHOW_TEXT);
 var nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 var pattern=/([\u0370-\u03ff\u1f00-\u1fff]+|[\u0590-\u05ff\uFB1D-\uFB4F]+)/gu;
 nodes.forEach(function(node){
  if(node.parentElement&&node.parentElement.closest("script,style,.pb-original-language"))return;
  var value=node.nodeValue;if(!pattern.test(value)){pattern.lastIndex=0;return;}pattern.lastIndex=0;
  var fragment=document.createDocumentFragment(),last=0,match;
  while((match=pattern.exec(value))){
   if(match.index>last)fragment.appendChild(document.createTextNode(value.slice(last,match.index)));
   var span=document.createElement("span");
   span.className="pb-original-language "+(/[\u0590-\u05ff\uFB1D-\uFB4F]/u.test(match[0])?"pb-hebrew":"pb-greek");
   span.textContent=match[0];fragment.appendChild(span);
   last=match.index+match[0].length;
  }
  if(last<value.length)fragment.appendChild(document.createTextNode(value.slice(last)));
  node.replaceWith(fragment);
 });
 return template.innerHTML;
}
function refresh(force){
 if(!current||!current.root.isConnected)return;
 var context=current.config.readReference(),module=pickModule(),target=current.root.querySelector("#pb-split-content");
 updateLabels();
 if(!target)return;
 var terms=current.config.readHighlights(context);
 var key=JSON.stringify([context.book,context.chapter,context.verse,module&&module.id,terms]);
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
  target.innerHTML=renderRows(rows,context,module,terms);
  var pane=current.root.querySelector("#pb-split-scroll");if(pane){var restore=current.config.readRestoreScroll?Number(current.config.readRestoreScroll())||0:0;pane.scrollTop=restore;if(current.config.onRestoreScroll)current.config.onRestoreScroll();}
 }).catch(function(err){
  if(seq!==version||!current)return;
  target.innerHTML='<div class="pb-split-message">Falha ao carregar comentários: '+esc(err.message||String(err))+'</div>';
 });
}
function resize(delta){
 if(!current)return;
 var n=Math.max(24,Math.min(67,(Number(current.config.readSize())||56)+delta));
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
 case "search-commentary":searchCommentary();return;
 case "bible-search":if(c.config.onSearch)c.config.onSearch();return;
 case "dictionary":menu(false);if(c.config.onDictionary)c.config.onDictionary();return;
 case "close":c.config.onClose();return;
 case "prev":case "next":{
  var all=installed(),idx=all.findIndex(function(m){return m.id===c.config.readModule();});
  if(all.length)c.config.onModuleChange(all[(idx+(btn.dataset.pbsplit==="next"?1:-1)+all.length)%all.length].id);
  menu(false);refresh(true);return;
 }
 case "select":
  c.config.onModuleChange(btn.dataset.moduleId);menu(false);refresh(true);return;
 case "sermon":{
  var row=c.rows[Number(btn.dataset.index)];
  if(row)c.config.onSermon(row);return;
 }
 case "sermon-search":{
  var row=(c.searchResults||[])[Number(btn.dataset.index)];
  if(row)c.config.onSermon(row);return;
 }
 case "open-search-ref":{
  var row=(c.searchResults||[])[Number(btn.dataset.index)];
  if(row&&c.config.onReference)c.config.onReference(row.book+" "+(row.fromChapter||1)+(row.fromVerse?":"+row.fromVerse:""));
  return;
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
  var bounds=root.getBoundingClientRect(),startY=e.clientY,start=Number(current.config.readSize())||56;
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
function verseAtReadingLine(pane){
 var bounds=pane.getBoundingClientRect();
 var header=pane.querySelector(".reader-paper-head");
 var readingTop=Math.max(bounds.top,header?header.getBoundingClientRect().bottom:bounds.top);
 if(readingTop>=bounds.bottom)return 0;
 var line=readingTop+Math.min(24,(bounds.bottom-readingTop)/3);
 var verses=pane.querySelectorAll("#chapter-body .verse-line[data-verse]");
 var active=null,activeTop=-Infinity;
 for(var verse of verses){
  var rect=verse.getBoundingClientRect();
  if(rect.bottom<=readingTop)continue;
  if(rect.top>=bounds.bottom)break;
  var start=verse.getClientRects()[0]?.top??rect.top;
  if(start>line){if(!active)active=verse;break;}
  if(start>activeTop){active=verse;activeTop=start;}
 }
 return active?Number(active.dataset.verse):0;
}
function syncBibleScroll(){
 if(!current)return;
 clearTimeout(current.scrollTimer);
 current.lastScrollTop=current.bible.scrollTop;
}
function onBibleScroll(event){
 var study=current;
 if(!study||event.currentTarget!==study.bible||study.bible.scrollTop===study.lastScrollTop)return;
 syncBibleScroll();
 if(study.root.classList.contains("pb-dictionary-active"))return;
 study.scrollTimer=setTimeout(function(){
  if(current!==study||study.root.classList.contains("pb-dictionary-active"))return;
  var verse=verseAtReadingLine(study.bible);
  if(verse&&verse!==study.config.readReference().verse){
   study.config.onBibleVerse(verse);
   refresh();
  }
 },100);
}
function attach(config){
 destroy();
 var columns=document.querySelector(".reader-columns");
 if(!columns||!columns.parentNode)return;
 var host=document.createElement("div");host.id="pb-study-split";host.className="pb-study-split";
 host.style.setProperty("--pb-comment-height",(Number(config.readSize())||56)+"%");
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
 '<input id="pb-split-search" type="search" aria-label="Pesquisar nos comentários" placeholder="Pesquisar comentário…"><button data-pbsplit="search-commentary" type="button" aria-label="Pesquisar nos comentários" title="Pesquisar nos comentários">⌕</button><button data-pbsplit="bible-search" type="button" aria-label="Pesquisar na Bíblia" title="Pesquisar na Bíblia">🔍</button><button data-pbsplit="prev" type="button" aria-label="Módulo anterior">‹</button><button data-pbsplit="next" type="button" aria-label="Próximo módulo">›</button>'+
 '<button data-pbsplit="close" type="button" aria-label="Fechar a janela de comentários">×</button></div></header>'+
 '<div class="pb-split-picker" id="pb-split-picker" hidden>'+
 '<div class="pb-split-picker-heading"><strong>Comentários instalados</strong><span>'+installed().length+' módulos</span></div>'+
 '<input id="pb-split-filter" type="search" placeholder="Pesquisar comentário…" aria-label="Pesquisar comentário instalado">'+
 '<div class="pb-split-choices" id="pb-split-choices"></div><button type="button" data-page="modulos" class="pb-split-install">⇩ Instalar outro módulo</button></div>'+
 '<div class="pb-split-scroll" id="pb-split-scroll"><div class="pb-split-heading"><strong id="pb-split-title">Comentários</strong><span>Passagem sincronizada</span></div><div id="pb-split-content" aria-live="polite"></div></div>';
 host.appendChild(bottom);
 current={root:host,bible:top,config:config,rows:[],lastKey:"",lastScrollTop:top.scrollTop};
 top.addEventListener("scroll",onBibleScroll,{passive:true});
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
 if(current){
  clearTimeout(current.scrollTimer);
  current.bible.removeEventListener("scroll",onBibleScroll);
  current.root.removeEventListener("click",handler);
  current.root.removeEventListener("keydown",keyHandler);
 }
 current=null;
}
/* Shared separator input for the reader's existing multi-panel manager. */
function bindPanelResize(root,config){
 var dragCleanup=null;
 function down(event){
  var handle=event.target.closest("[data-pbmw-resize]");
  if(!handle||event.button!==0)return;
  if(dragCleanup)dragCleanup();
  event.preventDefault();
  var axis=handle.dataset.pbmwResize,bounds=root.getBoundingClientRect(),pointerId=event.pointerId;
  handle.setPointerCapture(pointerId);
  function move(event){
   if(event.pointerId!==pointerId)return;
   var ratio=axis==="col"?(event.clientX-bounds.left)/Math.max(1,bounds.width):(event.clientY-bounds.top)/Math.max(1,bounds.height);
   config.update(axis,Math.max(.2,Math.min(.8,ratio)));
  }
  function finish(){
   handle.removeEventListener("pointermove",move);
   handle.removeEventListener("pointerup",finish);
   handle.removeEventListener("pointercancel",finish);
   handle.removeEventListener("lostpointercapture",finish);
   if(handle.hasPointerCapture(pointerId))handle.releasePointerCapture(pointerId);
   dragCleanup=null;config.finish();
  }
  dragCleanup=finish;
  handle.addEventListener("pointermove",move);
  handle.addEventListener("pointerup",finish);
  handle.addEventListener("pointercancel",finish);
  handle.addEventListener("lostpointercapture",finish);
 }
 function keydown(event){
  var handle=event.target.closest("[data-pbmw-resize]");
  if(!handle)return;
  var axis=handle.dataset.pbmwResize,keys=axis==="col"?["ArrowLeft","ArrowRight"]:["ArrowUp","ArrowDown"];
  if(!keys.includes(event.key))return;
  event.preventDefault();
  var step=event.key===keys[0]?-.05:.05;
  config.update(axis,Math.max(.2,Math.min(.8,config.read(axis)+step)));config.finish();
 }
 root.addEventListener("pointerdown",down);root.addEventListener("keydown",keydown);
 return function(){if(dragCleanup)dragCleanup();root.removeEventListener("pointerdown",down);root.removeEventListener("keydown",keydown);};
}
global.PBSplitStudy={bindPanelResize:bindPanelResize,attach:attach,destroy:destroy,refresh:refresh,menu:menu,syncBibleScroll:syncBibleScroll};
})(window);
