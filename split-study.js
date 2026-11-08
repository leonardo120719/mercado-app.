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
   '<div class="pb-split-entry-text">'+esc(r.text)+'</div><div class="pb-split-entry-actions">'+
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
  var pane=current.root.querySelector("#pb-split-scroll");if(pane)pane.scrollTop=0;
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
 case "dictionary":if(c.config.onDictionary)c.config.onDictionary();return;
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
