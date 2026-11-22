(function(global){
"use strict";
var COLORS={yellow:"Amarelo",green:"Verde",blue:"Azul"},config=null,started=false,palette=null,selected=null,revision=0,scheduled=false,pending=null,pendingTimer=null,holdUntil=0,undo=null;
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function hash(s){var n=2166136261;for(var i=0;i<s.length;i++){n^=s.charCodeAt(i);n=Math.imul(n,16777619);}return (n>>>0).toString(36);}
function uid(){return global.crypto&&global.crypto.randomUUID?global.crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);}
function sourceText(s){return String(s||"").replace(/<br\s*\/?>/gi,"\n").replace(/<\/(?:p|div|h[1-6]|li)>/gi,"\n").replace(/<[^>]*>/g,"").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim();}
function context(row,ref,mod){
 row=row||{};ref=ref||{};mod=mod||{};
 var c={moduleId:String(row.moduleId||mod.id||""),moduleName:String(row.moduleName||mod.name||"Comentário"),book:String(row.book||ref.book||""),bookName:String((config&&config.bookName&&config.bookName(row.book||ref.book))||ref.name||row.book||ref.book||""),chapter:Number(row.fromChapter||ref.chapter)||1,verse:Number(row.fromVerse)||Number(ref.verse)||1,toChapter:Number(row.toChapter||row.fromChapter||ref.chapter)||1,toVerse:Number(row.toVerse||row.fromVerse)||Number(ref.verse)||1,marker:String(row.marker||"")};
 // The entry identity uses its source range, not the currently selected Bible verse.
 c.entryId=JSON.stringify([c.moduleId,c.book,Number(row.fromChapter||ref.chapter)||1,Number(row.fromVerse)||0,Number(row.toChapter||row.fromChapter||ref.chapter)||1,Number(row.toVerse)||0,hash(sourceText(row.text))]);
 return c;
}
function attrs(row,ref,mod){var c=context(row,ref,mod);return c.moduleId&&c.book?' data-pb-comment-entry="'+esc(JSON.stringify(c))+'"':"";}
function metadata(el){try{return JSON.parse(el.getAttribute("data-pb-comment-entry"));}catch(_){return null;}}
function anchor(text,start,end){return {start:start,end:end,quote:text.slice(start,end),prefix:text.slice(Math.max(0,start-48),start),suffix:text.slice(end,end+48),textHash:hash(text)};}
function resolve(text,a){
 if(!a||!a.quote)return null;
 var s=Number(a.start),e=Number(a.end);
 if(a.textHash===hash(text)&&s>=0&&e>s&&text.slice(s,e)===a.quote)return {start:s,end:e};
 var hits=[],pos=0;
 while((pos=text.indexOf(a.quote,pos))!==-1){hits.push(pos);pos+=Math.max(1,a.quote.length);}
 var exact=hits.filter(function(i){return (!a.prefix||text.slice(Math.max(0,i-a.prefix.length),i)===a.prefix)&&(!a.suffix||text.slice(i+a.quote.length,i+a.quote.length+a.suffix.length)===a.suffix);});
 var found=exact.length===1?exact[0]:hits.length===1?hits[0]:null;
 return found===null?null:{start:found,end:found+a.quote.length};
}
function valid(m){return m&&typeof m.id==="string"&&m.context&&typeof m.context.entryId==="string"&&typeof m.context.moduleId==="string"&&typeof m.context.book==="string"&&m.anchor&&typeof m.anchor.quote==="string"&&m.anchor.quote.length>0&&Object.prototype.hasOwnProperty.call(COLORS,m.color);}
function records(){var rows=config&&config.read?config.read():[];return Array.isArray(rows)?rows.filter(valid):[];}
function say(s){if(config&&config.notify)config.notify(s);}
function commit(next){var previous=records();if(!config||!config.write||config.write(next)===false)return false;undo=previous;revision++;scan();return true;}
function overlay(rows,c,text,a,color){
 var next=[],existing=rows.find(function(m){return m.context.entryId===c.entryId&&m.anchor.start===a.start&&m.anchor.end===a.end&&m.anchor.textHash===a.textHash;});
 rows.forEach(function(m){
  if(m.context.entryId!==c.entryId){next.push(m);return;}
  var r=resolve(text,m.anchor);
  if(!r||r.end<=a.start||r.start>=a.end){next.push(m);return;}
  var first=true;
  if(r.start<a.start){next.push(Object.assign({},m,{anchor:anchor(text,r.start,a.start)}));first=false;}
  if(r.end>a.end)next.push(Object.assign({},m,{id:first?m.id:uid(),anchor:anchor(text,a.end,r.end)}));
 });
 next.unshift({id:existing?existing.id:uid(),context:c,anchor:a,color:color,createdAt:existing?existing.createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
 return next;
}
function textNodes(el){var walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),nodes=[],node,start=0;while((node=walker.nextNode())){nodes.push({node:node,start:start,end:start+node.nodeValue.length});start+=node.nodeValue.length;}return nodes;}
function paint(el,rows){
 var stamp=String(revision)+":"+hash(JSON.stringify(rows.map(function(m){return [m.id,m.color,m.anchor];})));
 if(el.dataset.pbMarksPaint===stamp)return;
 el.dataset.pbMarksPaint=stamp;
 el.querySelectorAll("mark[data-pb-comment-mark]").forEach(function(m){m.replaceWith.apply(m,Array.from(m.childNodes));});el.normalize();
 var text=el.textContent,nodes=textNodes(el),segments=[];
 rows.forEach(function(m){var r=resolve(text,m.anchor);if(r)segments.push({start:r.start,end:r.end,mark:m});});
 nodes.forEach(function(item){
  var parts=segments.filter(function(r){return r.start<item.end&&r.end>item.start;}).sort(function(a,b){return a.start-b.start;});
  if(!parts.length)return;
  var value=item.node.nodeValue,fragment=document.createDocumentFragment(),offset=0;
  parts.forEach(function(r){var a=Math.max(0,r.start-item.start,offset),b=Math.min(value.length,r.end-item.start);if(b<=a)return;
   if(a>offset)fragment.appendChild(document.createTextNode(value.slice(offset,a)));
   var mark=document.createElement("mark");mark.className="pb-comment-mark pb-comment-mark-"+r.mark.color;mark.dataset.pbCommentMark=r.mark.id;mark.setAttribute("title","Trecho marcado · "+COLORS[r.mark.color]);mark.textContent=value.slice(a,b);fragment.appendChild(mark);offset=b;
  });
  if(offset<value.length)fragment.appendChild(document.createTextNode(value.slice(offset)));item.node.replaceWith(fragment);
 });
}
function scan(){
 if(!config)return;var rows=records(),entries=document.querySelectorAll("[data-pb-comment-entry]");
 entries.forEach(function(el){var c=metadata(el);if(c)paint(el,rows.filter(function(m){return m.context.entryId===c.entryId;}));});
 if(!pending)return;
 var candidates=Array.from(entries).filter(function(el){var c=metadata(el);return c&&c.entryId===pending.context.entryId;});
 if(!candidates.length)candidates=Array.from(entries).filter(function(el){var c=metadata(el),p=pending.context;return c&&c.moduleId===p.moduleId&&c.book===p.book&&c.chapter===p.chapter&&c.marker===p.marker&&resolve(el.textContent,pending.anchor);});
 var found=candidates.find(function(el){return resolve(el.textContent,pending.anchor);});
 // Do not jump to an arbitrary repeated quotation or to a different commentary.
 if(!found||(!candidates.some(function(el){return metadata(el).entryId===pending.context.entryId;})&&candidates.length!==1))return;
 var item=pending;pending=null;clearTimeout(pendingTimer);
 if(metadata(found).entryId!==item.context.entryId)paint(found,[item]);
 var target=Array.from(found.querySelectorAll("[data-pb-comment-mark]")).find(function(el){return el.dataset.pbCommentMark===item.id;});
 if(target){target.classList.add("pb-comment-mark-target");target.tabIndex=-1;target.scrollIntoView({block:"center",behavior:"smooth"});target.focus({preventScroll:true});setTimeout(function(){target.classList.remove("pb-comment-mark-target");},3000);}
 else say("O comentário foi aberto; o trecho mudou e não pôde ser destacado com segurança.");
}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(function(){scheduled=false;scan();},0);}
function rootFor(node){var el=node&&(node.nodeType===1?node:node.parentElement);return el&&el.closest&&el.closest("[data-pb-comment-entry]");}
function capture(){
 var sel=global.getSelection&&global.getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount)return null;
 var range=sel.getRangeAt(0),el=rootFor(range.startContainer);if(!el||el!==rootFor(range.endContainer))return null;
 var c=metadata(el);if(!c||!c.moduleId||!c.book)return null;
 var quote=range.toString();if(!quote.trim()||quote.length>50000)return null;
 var before=document.createRange();before.selectNodeContents(el);before.setEnd(range.startContainer,range.startOffset);
 var start=before.toString().length,text=el.textContent,a=anchor(text,start,start+quote.length);
 if(a.quote!==quote)return null;return {el:el,context:c,anchor:a};
}
function hide(){if(palette)palette.hidden=true;selected=null;}
function show(value){
 selected=value;if(!palette){
  palette=document.createElement("section");palette.id="pb-comment-mark-tools";palette.className="pb-comment-mark-tools";palette.setAttribute("role","toolbar");palette.setAttribute("aria-label","Marcar e copiar trecho do comentário");
  palette.innerHTML='<div class="pb-comment-mark-tools-head"><strong>Marcar trecho do comentário</strong><button type="button" data-pbcmark-action="close" aria-label="Fechar ferramentas de marcação">×</button></div><div class="pb-comment-mark-tools-actions"><button type="button" data-pbcmark-action="copy">▣ Copiar trecho</button>'+Object.keys(COLORS).map(function(k){return '<button type="button" class="pb-comment-color pb-comment-color-'+k+'" data-pbcmark-color="'+k+'">'+COLORS[k]+'</button>';}).join("")+'<button type="button" data-pbcmark-action="remove">Remover marcação</button><button type="button" data-pbcmark-action="diary">Diário Histórico</button></div>';
  palette.addEventListener("pointerdown",function(e){holdUntil=Date.now()+1000;if(e.target.closest("button"))e.preventDefault();});
  palette.addEventListener("click",function(e){var color=e.target.closest("[data-pbcmark-color]"),button=e.target.closest("[data-pbcmark-action]");if(color){e.preventDefault();apply(color.dataset.pbcmarkColor);return;}if(!button)return;e.preventDefault();var action=button.dataset.pbcmarkAction;if(action==="copy"&&selected)copy(selected.anchor.quote);if(action==="remove")removeSelection();if(action==="close")hide();if(action==="diary"){hide();if(config.onDiary)config.onDiary();}});
  document.body.appendChild(palette);
 }
 palette.hidden=false;
}
function apply(color){
 if(!selected||!selected.el.isConnected||!COLORS[color])return;var text=selected.el.textContent,r=resolve(text,selected.anchor);if(!r){hide();say("Selecione novamente o trecho do comentário.");return;}
 var a=anchor(text,r.start,r.end);if(!commit(overlay(records(),selected.context,text,a,color)))return;
 var sel=global.getSelection&&global.getSelection();if(sel)sel.removeAllRanges();hide();say("Trecho marcado em "+COLORS[color].toLocaleLowerCase("pt-BR")+" e salvo no Diário Histórico.");
}
function removeSelection(){
 if(!selected||!selected.el.isConnected)return;var text=selected.el.textContent,a=resolve(text,selected.anchor);if(!a)return;
 var removed=false,next=records().filter(function(m){var r=m.context.entryId===selected.context.entryId&&resolve(text,m.anchor);if(r&&r.start<a.end&&r.end>a.start){removed=true;return false;}return true;});
 if(!removed){say("Este trecho não tem marcação salva.");return;}if(commit(next)){hide();say("Marcação removida. Você pode desfazer no Diário Histórico.");}
}
async function copy(text){
 try{if(global.navigator.clipboard&&global.navigator.clipboard.writeText)await global.navigator.clipboard.writeText(text);else throw Error("fallback");say("Trecho copiado.");return true;}catch(_){
  var field=document.createElement("textarea");field.value=text;field.style.cssText="position:fixed;left:-9999px;top:0";document.body.appendChild(field);field.focus();field.select();var ok=false;try{ok=document.execCommand("copy");}catch(e){}field.remove();say(ok?"Trecho copiado.":"Não foi possível copiar. Selecione o texto e use Copiar no dispositivo.");return ok;
 }
}
function open(id){
 var item=records().find(function(m){return m.id===id;});if(!item)return;
 hide();pending=item;clearTimeout(pendingTimer);
 pendingTimer=setTimeout(function(){if(pending&&pending.id===id){pending=null;say("Não foi possível localizar o trecho. Confira se o módulo está instalado e se o conteúdo mudou.");}},15000);
 Promise.resolve(config.onOpen&&config.onOpen(item)).then(function(ok){if(ok===false){pending=null;clearTimeout(pendingTimer);}else schedule();}).catch(function(){pending=null;clearTimeout(pendingTimer);say("Não foi possível abrir o comentário. A marcação continua salva.");});
}
function diaryHTML(filters){
 filters=filters||{};var term=String(filters.term||"").toLocaleLowerCase("pt-BR"),all=records(),rows=all.filter(function(m){return (!filters.book||m.context.book===filters.book)&&(!term||[m.context.moduleName,m.context.bookName,m.context.chapter,m.context.verse,m.anchor.quote,COLORS[m.color]].join(" ").toLocaleLowerCase("pt-BR").includes(term));});
 return '<section class="card card-pad pb-comment-marks-diary"><div class="panel-heading"><h2 class="section-heading">Marcações nos comentários ('+rows.length+')</h2><button type="button" class="btn slim" data-pbcmark-undo'+(!undo?' disabled':'')+'>Desfazer última alteração</button></div><p class="subtitle">Toque em Abrir no trecho marcado para voltar ao módulo e à passagem. Os filtros de pesquisa e livro também se aplicam aqui.</p><div class="pb-comment-marks-list">'+(rows.length?rows.map(function(m){var c=m.context;return '<article class="pb-comment-marks-card pb-comment-border-'+m.color+'"><strong>'+esc(c.moduleName)+'</strong><small>'+esc(c.bookName+" "+c.chapter+":"+c.verse)+" · "+esc(new Date(m.createdAt).toLocaleString("pt-BR"))+" · "+COLORS[m.color]+'</small><blockquote><mark class="pb-comment-mark pb-comment-mark-'+m.color+'">'+esc(m.anchor.quote)+'</mark></blockquote><div class="btn-row"><button type="button" class="btn primary slim" data-pbcmark-open="'+esc(m.id)+'">Abrir no trecho marcado</button><button type="button" class="btn slim" data-pbcmark-copy="'+esc(m.id)+'">Copiar trecho</button><button type="button" class="btn slim" data-pbcmark-delete="'+esc(m.id)+'">Remover</button></div></article>';}).join(""):'<p class="subtitle">'+(all.length?"Nenhuma marcação corresponde aos filtros.":"Selecione um trecho de um comentário aberto e escolha Amarelo, Verde ou Azul.")+'</p>')+'</div></section>';
}
function init(options){
 config=options||{};if(started){revision++;schedule();return;}started=true;
 var selectionTimer;document.addEventListener("selectionchange",function(){clearTimeout(selectionTimer);selectionTimer=setTimeout(function(){var value=capture();if(value)show(value);else if(Date.now()>holdUntil&&!(palette&&palette.contains(document.activeElement)))hide();},180);});
 document.addEventListener("contextmenu",function(e){if(rootFor(e.target)&&capture()){e.preventDefault();show(capture());}});
 document.addEventListener("pointerdown",function(e){if(palette&&!palette.hidden&&!palette.contains(e.target)&&!rootFor(e.target))hide();},true);
 document.addEventListener("keydown",function(e){if(e.key==="Escape")hide();});
 document.addEventListener("click",function(e){
  var btn=e.target.closest&&e.target.closest("[data-pbcmark-open],[data-pbcmark-copy],[data-pbcmark-delete],[data-pbcmark-undo]");
  if(btn){e.preventDefault();var id=btn.dataset.pbcmarkOpen||btn.dataset.pbcmarkCopy||btn.dataset.pbcmarkDelete;
   if(btn.hasAttribute("data-pbcmark-open")){open(id);return;}
   if(btn.hasAttribute("data-pbcmark-copy")){var record=records().find(function(m){return m.id===id;});if(record)copy(record.anchor.quote);return;}
   if(btn.hasAttribute("data-pbcmark-undo")){if(undo){var previous=undo;if(config.write(previous)!==false){undo=null;revision++;schedule();if(config.onDiary)config.onDiary();}}return;}
   if(commit(records().filter(function(m){return m.id!==id;}))){if(config.onDiary)config.onDiary();}return;
  }
  var mark=e.target.closest&&e.target.closest("[data-pb-comment-mark]"),el=mark&&rootFor(mark),item=mark&&records().find(function(m){return m.id===mark.dataset.pbCommentMark;});
  if(el&&item&&!e.target.closest("a,button,.pb-linked-word,.strong-word")){var r=resolve(el.textContent,item.anchor);if(r){holdUntil=Date.now()+1200;show({el:el,context:metadata(el),anchor:anchor(el.textContent,r.start,r.end)});}}
 });
 if(global.MutationObserver)new global.MutationObserver(function(mutations){if(mutations.some(function(m){return m.type==="childList";}))schedule();}).observe(document.body,{childList:true,subtree:true});
 schedule();
}
function attach(el,row,ref,mod){if(!el)return;el.removeAttribute("data-pb-comment-entry");delete el.dataset.pbMarksPaint;var c=context(row,ref,mod);if(c.moduleId&&c.book){el.setAttribute("data-pb-comment-entry",JSON.stringify(c));schedule();}}
var api={init:init,attrs:attrs,attach:attach,diaryHTML:diaryHTML,targetFor:function(moduleId,book,chapter){return pending&&(!moduleId||pending.context.moduleId===moduleId)&&pending.context.book===book&&pending.context.chapter===Number(chapter)?pending:null;},matchesSource:function(row,ref,mod,target){return context(row,ref,mod).entryId===target.context.entryId;},refresh:function(){revision++;schedule();},open:open};
// Pure anchoring helpers are exported for verification of repeated text and edits.
api._test={anchor:anchor,resolve:resolve,overlay:overlay,context:context,valid:valid};
global.PBCommentMarks=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
