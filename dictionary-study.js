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
function linkText(value){
 var raw=String(value||""),out="",cursor=0,match;
 var re=/\b([GH])0*(\d{1,5})\b|\b(João|Jo|Gênesis|Gn|Lucas|Lc|Mateus|Mt|Marcos|Mc|Salmos|Sl|Atos|At|Romanos|Rm|Isaías|Is)\s+(\d{1,3}):(\d{1,3})(?:[-–](\d{1,3}))?/gi;
 while((match=re.exec(raw))!==null){
  out+=esc(raw.slice(cursor,match.index));
  if(match[1]){
   var code=match[1].toUpperCase()+Number(match[2]);
   out+='<button type="button" class="pb-dict-inline-link" data-pbdict="term" data-term="'+esc(code)+'" title="Consultar Strong '+esc(code)+'">'+esc(code)+'</button>';
  }else{
   var label=match[0];
   out+='<button type="button" class="pb-dict-inline-link" data-pbdict="reference" data-reference="'+esc(label)+'" title="Abrir '+esc(label)+' na Bíblia">'+esc(label)+'</button>';
  }
  cursor=match.index+match[0].length;
 }
 return out+esc(raw.slice(cursor));
}
function choices(filter){
 var modules=dictionaryModules(),q=String(filter||"").toLocaleLowerCase("pt-BR").trim();
 var valid=modules.filter(function(m){return (m.name+" "+m.abbreviation).toLocaleLowerCase("pt-BR").includes(q);});
 if(!valid.length)return '<p class="pb-dict-empty">'+(modules.length?"Não há dicionário com esse nome.":"Nenhum dicionário instalado neste navegador. Abra Módulos para importar um arquivo SQLite3 compatível.")+'</p>';
 return valid.map(function(m){
  var active=m.id===session.config.readModule();
  return '<button type="button" class="pb-dict-choice'+(active?" active":"")+'" data-pbdict="select" data-dict-id="'+esc(m.id)+'" aria-pressed="'+active+'">'+
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
 var root=session.root,m=selectedModule(),name=root.querySelector("#pb-dictionary-name"),title=root.querySelector("#pb-dictionary-title"),ref=root.querySelector("#pb-dictionary-reference");
 if(name)name.textContent=m?(m.abbreviation||m.name):"Dicionários";
 if(title)title.textContent=normalizeTerm(session.term)||"Selecione uma palavra";
 if(ref)ref.textContent=refLabel();
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
  var scroll=session.root.querySelector("#pb-dictionary-scroll");if(scroll)scroll.scrollTop=0;
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
 var host=document.getElementById("pb-split-bible")||document.querySelector(".reader-columns");
 if(!host)return;
 host.classList.add("pb-dictionary-open");
 var panel=document.createElement("section");panel.id="pb-dictionary-pane";panel.className="pb-dictionary-pane";
 panel.setAttribute("aria-label","Janela de dicionários sincronizada com a Bíblia");
 panel.innerHTML='<header class="pb-dictionary-bar">'+
  '<button type="button" class="pb-dictionary-select" id="pb-dictionary-select" data-pbdict="picker" aria-controls="pb-dictionary-picker" aria-expanded="false">'+
   '<span>α</span><strong id="pb-dictionary-name">Dicionários</strong><b>⌄</b></button>'+
  '<div class="pb-dictionary-nav"><button data-pbdict="back" aria-label="Verbete anterior" title="Voltar">‹</button><button data-pbdict="forward" aria-label="Próximo verbete" title="Avançar">›</button>'+
   '<button data-pbdict="prev-module" aria-label="Dicionário anterior" title="Dicionário anterior">⇤</button><button data-pbdict="next-module" aria-label="Próximo dicionário" title="Próximo dicionário">⇥</button>'+
   '<button data-pbdict="close" aria-label="Fechar dicionário" title="Fechar dicionário">×</button></div></header>'+
  '<div class="pb-dictionary-picker" id="pb-dictionary-picker" hidden><div class="pb-dict-picker-heading"><strong>Dicionários instalados</strong><span>'+dictionaryModules().length+' módulo(s)</span></div>'+
   '<input type="search" id="pb-dictionary-module-filter" placeholder="Buscar módulo…" aria-label="Buscar módulo de dicionário">'+
   '<div class="pb-dictionary-choices" id="pb-dictionary-choices"></div><button class="pb-dict-install" data-page="modulos" type="button">⇩ Instalar novo dicionário</button></div>'+
  '<div class="pb-dictionary-search-row"><input id="pb-dictionary-search" type="search" placeholder="Palavra, nome ou Strong G/H" aria-label="Pesquisar verbete">'+
   '<button type="button" data-pbdict="search" aria-label="Pesquisar">⌕</button></div>'+
  '<div id="pb-dictionary-scroll" class="pb-dictionary-scroll"><div class="pb-dictionary-heading"><strong id="pb-dictionary-title">Dicionário</strong><small id="pb-dictionary-reference"></small></div>'+
   '<div id="pb-dictionary-definition"><div class="pb-dict-empty">Toque numa palavra da Bíblia ou pesquise um verbete para abrir o significado aqui.</div></div></div>'+
  '<footer class="pb-dictionary-footer"><button data-pbdict="analyze" type="button">α Análise Strong</button><button data-pbdict="copy" type="button">▣ Copiar</button></footer>';
 host.appendChild(panel);
 var hostSplit=document.getElementById("pb-study-split");if(hostSplit)hostSplit.classList.add("pb-dictionary-focused");
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
 session.host.classList.remove("pb-dictionary-open");
 var split=document.getElementById("pb-study-split");if(split)split.classList.remove("pb-dictionary-focused");
 session=null;
}
function isAttached(){return Boolean(session&&session.root&&session.root.isConnected);}
global.PBDictionaryStudy={attach:attach,destroy:destroy,lookup:lookup,isAttached:isAttached,picker:picker};
})(window);
