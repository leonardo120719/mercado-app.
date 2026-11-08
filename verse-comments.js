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
   var labels=document.createElement("span");
   labels.className="pb-verse-comment-labels";
   labels.setAttribute("role","group");
   labels.setAttribute("aria-label","Comentários vinculados a "+book+" "+chapter+":"+n);
   mods.forEach(function(mod){
    var button=document.createElement("button");
    button.type="button";
    button.className="pb-verse-comment-indicator";
    button.setAttribute("data-comment-indicator",String(n));
    button.setAttribute("data-comment-module",String(mod.moduleId||""));
    button.setAttribute("aria-label","Abrir "+(mod.moduleName||"comentário")+" em "+book+" "+chapter+":"+n+". Toque duas vezes para abrir.");
    button.setAttribute("title",(mod.moduleName||"Comentário")+" — toque duas vezes para abrir");
    button.textContent=mod.moduleName||"Comentário";
    labels.appendChild(button);
   });
   if(labels.childNodes.length)line.insertBefore(labels,line.firstChild);
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
 el.innerHTML=pickerContents(n);
 el.dataset.verse=String(n);
 el.addEventListener("click",function(e){
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
    el.innerHTML=pickerContents(n);
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
  showPicker(old.verse,old.node);
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
 showPicker(verse.dataset.verse,verse);
}
function onClick(e){
 var badge=indicatorElement(e.target);
 if(badge){
  e.preventDefault();e.stopImmediatePropagation();
  var n=Number(badge.dataset.commentIndicator),moduleId=badge.dataset.commentModule||"",now=Date.now();
  if(opts.selectVerse)opts.selectVerse(n);
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
