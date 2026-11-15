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

/* The existing reader manager is owned here; app.js supplies its reader services. */
window.PBWindowUI.createReaderManager=function(env){
 var esc=env.esc,notify=env.notify,renderReader=env.renderReader,setRef=env.setRef,ref=env.ref,persist=env.persist,loadOnlineBibleChapter=env.loadOnlineBibleChapter,annotateVerse=env.annotateVerse,renderStrongEntry=env.renderStrongEntry,pbDevAll=env.pbDevAll,pbDevOpenButton=env.pbDevOpenButton,pb2Read=env.pb2Read,page=env.page,booksFallback=env.booksFallback,words=env.words;
 "use strict";
 var KEY="pb-reader-multi-window-v1",host=null,columns=null,stash=null,primaryId=null,viewportBar=null;
 var serials=Object.create(null),crossrefData=null,crossrefPromise=null,saveFrame=0,scrollTimer=0;
 var minimizedBar=null,resizeCleanup=null,dragCleanup=null,nextId=0;
 var tabFields=["type","moduleId","book","chapter","verse","term","codes","linked","scrollTop"];
 function uniqueId(){return "mw-"+Date.now().toString(36)+"-"+(++nextId);}
 function rememberTab(pane){
  var tab=pane.tabs.find(function(item){return item.id===pane.activeTabId;});
  if(tab)tabFields.forEach(function(key){tab[key]=pane[key];});
 }
 function restoreTab(pane,id){
  var tab=pane.tabs.find(function(item){return item.id===id;});
  if(!tab)return;
  pane.activeTabId=tab.id;tabFields.forEach(function(key){pane[key]=tab[key];});
 }
 var TYPES=[
  ["bible","Bíblia / Tradução"],["commentary","Comentários"],["dictionary","Dicionários"],
  ["strong","Strong / Original"],["crossrefs","Referências cruzadas"],["devotional","Devocional"],
  ["plans","Planos de estudo"],["map","Mapa bíblico"],["original","Línguas originais"],["sermon","Estudo / Sermão"]
 ];
 function defaults(){
  return {active:false,count:1,orientation:matchMedia("(max-width: 720px) and (orientation: portrait)").matches?"vertical":"horizontal",colRatio:.5,rowRatio:.5,maxPaneId:"",primaryPaneId:"mw-main",baseReaderState:null,panes:[
   {id:"mw-main",type:"bible",linked:true,book:env.state.book,chapter:env.state.chapter,verse:env.state.selectedVerse||1,scrollTop:0,moduleId:env.state.version},
   {id:"mw-commentary",type:"commentary",linked:false,book:env.state.book,chapter:env.state.chapter,verse:env.state.selectedVerse||1,scrollTop:0,moduleId:"",term:""},
   {id:"mw-dictionary",type:"dictionary",linked:false,book:env.state.book,chapter:env.state.chapter,verse:env.state.selectedVerse||1,scrollTop:0,moduleId:"",term:""},
   {id:"mw-crossrefs",type:"crossrefs",linked:false,book:env.state.book,chapter:env.state.chapter,verse:env.state.selectedVerse||1,scrollTop:0,moduleId:""}
  ]};
 }
 function read(){
  var base=defaults(),raw={};
  try{raw=JSON.parse(localStorage.getItem(KEY)||"{}")||{};}catch(e){}
  var cfg=Object.assign({},base,raw),usedIds=new Set();
  cfg.count=Math.max(1,Math.min(4,Math.floor(Number(cfg.count)||1)));
  cfg.orientation=cfg.orientation==="vertical"?"vertical":"horizontal";
  cfg.colRatio=Math.max(.2,Math.min(.8,Number(cfg.colRatio)||.5));
  cfg.rowRatio=Math.max(.2,Math.min(.8,Number(cfg.rowRatio)||.5));
  var saved=Array.isArray(raw.panes)?raw.panes:base.panes;
  cfg.panes=base.panes.map(function(fallback,index){
   var pane=Object.assign({},fallback,saved[index]||{});
   if(!/^[a-zA-Z0-9_-]+$/.test(pane.id)||usedIds.has(pane.id))pane.id=uniqueId();
   usedIds.add(pane.id);
   var tabs=Array.isArray(pane.tabs)&&pane.tabs.length?pane.tabs:[pane];
   pane.tabs=tabs.map(function(value,tabIndex){
    var tab={id:pane.id+"-tab-"+tabIndex};
    tabFields.forEach(function(key){tab[key]=value[key];});
    if(value!==pane&&/^[a-zA-Z0-9_-]+$/.test(value.id)&&!usedIds.has(value.id))tab.id=value.id;
    while(usedIds.has(tab.id))tab.id=uniqueId();
    usedIds.add(tab.id);
    if(!TYPES.some(function(type){return type[0]===tab.type;}))tab.type=fallback.type;
    tab.book=env.books.some(function(book){return book.slug===tab.book;})?tab.book:env.state.book;
    var book=env.books.find(function(book){return book.slug===tab.book;});
    tab.chapter=Math.max(1,Math.min(book.chapters||150,Number(tab.chapter)||1));
    tab.verse=Math.max(1,Number(tab.verse)||1);
    tab.scrollTop=Math.max(0,Number(tab.scrollTop)||0);
    tab.linked=tab.linked===true;
    tab.moduleId=String(tab.moduleId||"");tab.term=String(tab.term||"");
    tab.codes=Array.isArray(tab.codes)?tab.codes:[];
    return tab;
   });
   if(!pane.tabs.some(function(tab){return tab.id===pane.activeTabId;}))pane.activeTabId=pane.tabs[0].id;
   pane.minimized=!!pane.minimized;
   pane.pinned=!!pane.pinned;pane.floating=!!pane.floating;
   pane.floatX=Number.isFinite(Number(pane.floatX))?Number(pane.floatX):18;
   pane.floatY=Number.isFinite(Number(pane.floatY))?Number(pane.floatY):96;
   pane.linkSet=["A","B","C"].includes(pane.linkSet)?pane.linkSet:(pane.linked?"A":"");
   pane.linked=pane.linkSet==="A";
   restoreTab(pane,pane.activeTabId);
   return pane;
  });
  cfg.linkSets=Object.assign({B:null,C:null},raw.linkSets||{});
  ["B","C"].forEach(function(group){
   if(cfg.linkSets[group]&&env.books.some(function(book){return book.slug===cfg.linkSets[group].book;})){
    var linkedBook=env.books.find(function(book){return book.slug===cfg.linkSets[group].book;});
    cfg.linkSets[group]={book:linkedBook.slug,chapter:Math.max(1,Math.min(linkedBook.chapters||150,Number(cfg.linkSets[group].chapter)||1)),verse:Math.max(1,Number(cfg.linkSets[group].verse)||1)};
   }else cfg.linkSets[group]=null;
   var member=cfg.panes.find(function(pane){return pane.linkSet===group;});
   if(member&&!cfg.linkSets[group])cfg.linkSets[group]={book:member.book,chapter:member.chapter,verse:member.verse};
  });
  var primary=cfg.panes.find(function(pane){return pane.id===cfg.primaryPaneId;});
  if(!cfg.primaryTabId&&primary)cfg.primaryTabId=primary.tabs[0].id;
  cfg.schemaVersion=2;
  return cfg;
 }
 var cfg=read();
 function save(){cfg.panes.forEach(rememberTab);try{localStorage.setItem(KEY,JSON.stringify(cfg));}catch(e){notify("Não foi possível salvar o layout de janelas.");}}
 function isActive(){return !!cfg.active;}
 function visible(){return cfg.panes.slice(0,cfg.count);}
 function typeLabel(type){var t=TYPES.find(function(x){return x[0]===type;});return t?t[1]:"Ferramenta";}
 function ensureBaseState(){if(!cfg.baseReaderState)cfg.baseReaderState={splitStudy:!!env.state.splitStudy,dictionaryOpen:!!env.state.dictionaryOpen};}
 function prepareReaderState(){
  if(cfg.active){ensureBaseState();env.state.splitStudy=false;env.state.dictionaryOpen=false;}
  else if(cfg.baseReaderState){env.state.splitStudy=!!cfg.baseReaderState.splitStudy;env.state.dictionaryOpen=!!cfg.baseReaderState.dictionaryOpen;cfg.baseReaderState=null;save();}
 }
 function ensureCount(n){cfg.count=Math.max(1,Math.min(4,Math.floor(Number(n)||1)));}
 function captureScroll(){
  if(!host)return;
  host.querySelectorAll("[data-pbmw-body]").forEach(function(body){
   var pane=cfg.panes.find(function(pane){return pane.id===body.dataset.pbmwBody;});
   if(pane&&!pane.minimized&&body.dataset.ready==="true"&&body.dataset.tabId===pane.activeTabId){
    pane.scrollTop=body.scrollTop;rememberTab(pane);
   }
  });
 }
 function switchTab(pane,id){
  captureScroll();rememberTab(pane);restoreTab(pane,id);pane.minimized=false;
  save();render();
 }
 function addTab(pane,type,payload){
  captureScroll();rememberTab(pane);
  var reference=referenceFor(pane),tab={id:uniqueId(),type:type||"bible",moduleId:type==="bible"||!type?env.state.version:"",
   book:reference.book,chapter:reference.chapter,verse:reference.verse,term:"",codes:[],linked:false,scrollTop:0};
  Object.assign(tab,payload||{});pane.tabs.push(tab);restoreTab(pane,tab.id);pane.minimized=false;
 }
 function closeTab(pane,id){
  if(pane.tabs.length===1){closePane(pane.id);return;}
  captureScroll();rememberTab(pane);
  var index=pane.tabs.findIndex(function(tab){return tab.id===id;});
  if(index<0)return;
  pane.tabs.splice(index,1);
  if(pane.activeTabId===id)restoreTab(pane,pane.tabs[Math.min(index,pane.tabs.length-1)].id);
  save();render();
 }
 function versionOptions(selected){
  var out=[["alm1911","Almeida 1911"],["bpm","BPM"],["onbv","ONBV"],["nva","NVA"]];
  var installed=window.PBModules&&PBModules.getInstalled?PBModules.getInstalled().filter(function(m){return m.type==="bible";}):[];
  installed.forEach(function(m){out.push(["local:"+m.id,(m.abbreviation||m.name)+" · instalada"]);});
  if(selected&&!out.some(function(x){return x[0]===selected;}))out.push([selected,selected]);
  return out;
 }
 function moduleOptions(type){
  var kind=type==="commentary"?"commentary":"dictionary";
  return window.PBModules&&PBModules.getInstalled?PBModules.getInstalled().filter(function(m){return m.type===kind;}):[];
 }
 function bookOptions(selected){return env.books.map(function(b){return '<option value="'+esc(b.slug)+'"'+(selected===b.slug?" selected":"")+'>'+esc(b.name)+'</option>';}).join("");}
 function referenceFor(pane){
  var group=pane.linkSet||(pane.linked?"A":"");
  if(pane.id===primaryId||group==="A")return {book:env.state.book,chapter:env.state.chapter,verse:Math.max(1,Number(env.state.selectedVerse)||1),name:env.activeBook.name};
  var source=group&&cfg.linkSets[group]?cfg.linkSets[group]:pane;
  var book=env.books.find(function(item){return item.slug===source.book;})||env.activeBook;
  return {book:book.slug,chapter:Math.max(1,Number(source.chapter)||1),verse:Math.max(1,Number(source.verse)||1),name:book.name};
 }
 function syncLinkSet(group,reference,sourceId){
  if(group==="A"){setRef(reference.book,reference.chapter,reference.verse);return;}
  if(!["B","C"].includes(group))return;
  cfg.linkSets[group]={book:reference.book,chapter:Math.max(1,Number(reference.chapter)||1),verse:Math.max(1,Number(reference.verse)||1)};
  cfg.panes.forEach(function(pane){
   if(pane.linkSet!==group)return;
   pane.book=reference.book;pane.chapter=cfg.linkSets[group].chapter;pane.verse=cfg.linkSets[group].verse;pane.scrollTop=0;
   if(host&&pane.id!==sourceId&&visible().includes(pane))renderPane(pane);
  });
  save();
 }
 function assignLinkSet(pane,group){
  if(!pane)return;
  pane.linkSet=["A","B","C"].includes(group)?group:"";pane.linked=pane.linkSet==="A";
  if(pane.linkSet==="A"){
   pane.book=env.state.book;pane.chapter=env.state.chapter;pane.verse=env.state.selectedVerse||1;pane.scrollTop=0;
  }else if(pane.linkSet){
   if(!cfg.linkSets[pane.linkSet])cfg.linkSets[pane.linkSet]={book:pane.book,chapter:pane.chapter,verse:pane.verse};
   var reference=cfg.linkSets[pane.linkSet];pane.book=reference.book;pane.chapter=reference.chapter;pane.verse=reference.verse;pane.scrollTop=0;
  }
  save();render();
 }
 function referenceControls(pane){
  if(pane.id===primaryId||pane.linked)return "";
  return '<div class="pb-mw-ref-controls"><select aria-label="Livro da janela" data-pbmw-ref="book" data-pane-id="'+esc(pane.id)+'">'+bookOptions(pane.book)+'</select><input aria-label="Capítulo" type="number" min="1" max="150" value="'+pane.chapter+'" data-pbmw-ref="chapter" data-pane-id="'+esc(pane.id)+'"><input aria-label="Versículo" type="number" min="1" max="176" value="'+pane.verse+'" data-pbmw-ref="verse" data-pane-id="'+esc(pane.id)+'"></div>';
 }
 function paneMarkup(pane,index){
  var opts=TYPES.map(function(type){return '<option value="'+type[0]+'"'+(pane.type===type[0]?" selected":"")+'>'+type[1]+'</option>';}).join("");
  var tabs=pane.tabs.map(function(tab){
   var selected=tab.id===pane.activeTabId;
   return '<span class="pb-mw-tab-item"><button type="button" role="tab" id="'+esc(tab.id)+'" aria-selected="'+selected+'" aria-controls="'+esc(pane.id)+'-content" tabindex="'+(selected?0:-1)+'" data-pbmw-action="tab" data-pane-id="'+esc(pane.id)+'" data-tab-id="'+esc(tab.id)+'">'+esc(typeLabel(tab.type))+'</button>'+
    '<button type="button" class="pb-mw-tab-close" data-pbmw-action="close-tab" data-pane-id="'+esc(pane.id)+'" data-tab-id="'+esc(tab.id)+'" aria-label="Fechar aba '+esc(typeLabel(tab.type))+'">×</button></span>';
  }).join("");
  function control(action,label,icon,disabled){return '<button type="button" class="pb-mw-control'+(action==="pin"&&pane.pinned?" is-on":"")+'" data-pbmw-action="'+action+'" data-pane-id="'+esc(pane.id)+'" aria-label="'+label+'" title="'+label+'"'+(disabled?" disabled":"")+'>'+icon+'</button>';}
  var linkGroup=pane.linkSet||(pane.linked?"A":"");
  return '<section class="pb-mw-pane'+(pane.floating?" is-floating":"")+(pane.pinned?" is-pinned":"")+'" data-pbmw-pane="'+esc(pane.id)+'" data-pane-index="'+(index+1)+'" aria-label="Painel '+(index+1)+'"><header class="pb-mw-pane-head">'+
   '<button type="button" class="pb-mw-drag-handle" data-pbmw-drag-handle data-pane-id="'+esc(pane.id)+'" aria-label="Arrastar para reorganizar painel" title="Arrastar painel">⠿</button><select class="pb-mw-type" data-pbmw-type data-pane-id="'+esc(pane.id)+'" aria-label="Conteúdo do painel">'+opts+'</select><div class="pb-mw-pane-actions">'+
   '<button type="button" class="pb-mw-control'+(linkGroup?" is-on":"")+'" data-pbmw-action="sync" data-pane-id="'+esc(pane.id)+'" aria-label="Conjunto de sincronização '+(linkGroup||"desligado")+'" aria-pressed="'+!!linkGroup+'" title="Conjunto de sincronização: '+(linkGroup||"desligado")+'">🔗'+(linkGroup?" "+linkGroup:"")+'</button>'+
   control("split","Dividir novamente","＋",cfg.count>=4)+control("pin",pane.pinned?"Desafixar painel":"Fixar painel",pane.pinned?"📌":"♧")+
   control("float",pane.floating?"Acoplar painel":"Janela flutuante",pane.floating?"↙":"↗")+
   control("min","Minimizar painel","—",pane.pinned)+control("max","Maximizar painel","⛶")+control("swap","Trocar posição","⇄",pane.pinned)+control("close","Fechar painel","×",pane.pinned)+'</div></header>'+
   '<div class="pb-mw-tabbar"><div class="pb-mw-tabs" role="tablist" aria-label="Abas do painel">'+tabs+'</div>'+control("add-tab","Nova aba","+")+'</div>'+
   '<div class="pb-mw-pane-body" id="'+esc(pane.id)+'-content" role="tabpanel" aria-labelledby="'+esc(pane.activeTabId)+'" data-pbmw-body="'+esc(pane.id)+'" data-tab-id="'+esc(pane.activeTabId)+'" tabindex="0"></div></section>';
 }
 function dockViewportToolbar(docked){
  var screen=host.parentNode;
  if(docked){
   screen.querySelectorAll(":scope > #dynamic-toolbar, :scope > .pb-reference-history").forEach(function(control){viewportBar.appendChild(control);});
  }else{
   screen.prepend(...viewportBar.children);
  }
  viewportBar.hidden=!docked;
 }
 function setGrid(){
  if(!host)return;
  var floating=visible().filter(function(pane){return !pane.minimized&&pane.floating;});
  var expanded=visible().filter(function(pane){return !pane.minimized&&!pane.floating;});
  host.dataset.count=String(expanded.length);host.dataset.orientation=cfg.orientation;
  host.classList.toggle("has-floating",floating.length>0);host.style.overflow=floating.length?"visible":"";
  host.style.height=expanded.length?"":"0";host.style.minHeight=expanded.length?"":"0";
  host.hidden=!expanded.length&&!floating.length;
  var index=0;host.querySelectorAll(".pb-mw-pane").forEach(function(element){
   var pane=visible().find(function(pane){return pane.id===element.dataset.pbmwPane;});
   var isFloating=!!pane.floating&&!pane.minimized;
   element.hidden=pane.minimized;element.classList.toggle("is-floating",isFloating);element.classList.toggle("is-pinned",!!pane.pinned);
   if(isFloating){element.style.left=Math.max(4,Number(pane.floatX)||18)+"px";element.style.top=Math.max(4,Number(pane.floatY)||96)+"px";}
   else{element.style.left="";element.style.top="";}
   if(!pane.minimized&&!isFloating)element.dataset.paneIndex=String(++index);else element.removeAttribute("data-pane-index");
  });
  host.style.setProperty("--pb-mw-col-ratio",Math.round(cfg.colRatio*100)+"%");
  host.style.setProperty("--pb-mw-row-ratio",Math.round(cfg.rowRatio*100)+"%");
  host.style.setProperty("--pb-mw-count",String(expanded.length));
  host.querySelectorAll("[data-pbmw-resize]").forEach(function(handle){
   var value=handle.dataset.pbmwResize==="col"?cfg.colRatio:cfg.rowRatio;
   handle.setAttribute("aria-valuenow",String(Math.round(value*100)));
  });
  var fullPaneId=cfg.maxPaneId;
  var fullScreen=visible().some(function(p){return !p.minimized&&p.id===fullPaneId;});
  if(minimizedBar)minimizedBar.hidden=fullScreen||!visible().some(function(p){return p.minimized;});
  host.classList.toggle("pb-mw-maximized",fullScreen);
  document.body.classList.toggle("pb-mw-viewport-open",fullScreen);
  dockViewportToolbar(fullScreen&&fullPaneId===primaryId);
  host.querySelectorAll(".pb-mw-pane").forEach(function(el){
   var expanded=fullScreen&&el.dataset.pbmwPane===fullPaneId;
   el.classList.toggle("is-maximized",expanded);
   var button=el.querySelector('[data-pbmw-action="max"]');
   var label=expanded?"Voltar às janelas divididas":"Abrir janela em tela cheia";
   button.textContent=expanded?"↙":"⛶";
   button.title=label;
   button.setAttribute("aria-label",label);
   button.setAttribute("aria-pressed",String(expanded));
  });
 }
 function mount(){
  if(!cfg.active||!document.querySelector(".reader-screen"))return;
  var screen=document.querySelector(".reader-screen"),found=screen.querySelector(".reader-columns");
  if(!found)return;
  if(host&&host.isConnected){captureScroll();render();return;}
  columns=found;var parent=columns.parentNode;
  host=document.createElement("section");host.id="pb-reader-multi-host";host.className="pb-mw-grid";host.setAttribute("aria-label","Janelas bíblicas sincronizadas");
  parent.insertBefore(host,columns);
  minimizedBar=document.createElement("nav");minimizedBar.className="pb-mw-minimized-bar";minimizedBar.setAttribute("aria-label","Painéis minimizados");parent.insertBefore(minimizedBar,host);
  stash=document.createElement("div");stash.className="pb-mw-reader-stash";stash.hidden=true;stash.appendChild(columns);
  viewportBar=document.createElement("div");viewportBar.className="pb-mw-viewport-bar";viewportBar.hidden=true;
  render();bindResize();
 }
 function unmount(){
  captureScroll();save();
  if(resizeCleanup){resizeCleanup();resizeCleanup=null;}
  if(dragCleanup){dragCleanup();dragCleanup=null;}
  if(minimizedBar){minimizedBar.remove();minimizedBar=null;}
  if(host&&host.isConnected){
   dockViewportToolbar(false);
   if(columns)host.parentNode.insertBefore(columns,host);
   host.remove();
  }
  document.body.classList.remove("pb-mw-viewport-open");
  if(scrollTimer)clearTimeout(scrollTimer);
  host=null;columns=null;stash=null;primaryId=null;viewportBar=null;serials=Object.create(null);
 }
 function render(){
  if(!host||!host.isConnected)return;
  var panes=visible();
  var mainPane=panes.find(function(pane){return pane.id===cfg.primaryPaneId&&pane.type==="bible"&&pane.linked&&pane.activeTabId===cfg.primaryTabId;});
  primaryId=mainPane?mainPane.id:null;
  minimizedBar.innerHTML=panes.filter(function(pane){return pane.minimized;}).map(function(pane){
   return '<button type="button" data-pbmw-action="restore" data-pane-id="'+esc(pane.id)+'">Restaurar '+esc(typeLabel(pane.type))+'</button>';
  }).join("");
  if(columns&&stash)stash.appendChild(columns);
  host.replaceChildren(viewportBar,stash);
  panes.forEach(function(pane,index){host.insertAdjacentHTML("beforeend",paneMarkup(pane,index));});
  var colHandle=document.createElement("div");colHandle.className="pb-mw-resizer pb-mw-resizer-col";colHandle.dataset.pbmwResize="col";colHandle.setAttribute("role","separator");colHandle.setAttribute("aria-label","Redimensionar colunas");
  var rowHandle=document.createElement("div");rowHandle.className="pb-mw-resizer pb-mw-resizer-row";rowHandle.dataset.pbmwResize="row";rowHandle.setAttribute("role","separator");rowHandle.setAttribute("aria-label","Redimensionar linhas");
  host.append(colHandle,rowHandle);
  [colHandle,rowHandle].forEach(function(handle){handle.tabIndex=0;handle.setAttribute("aria-valuemin","20");handle.setAttribute("aria-valuemax","80");handle.setAttribute("aria-orientation",handle===colHandle?"vertical":"horizontal");});
  setGrid();panes.forEach(function(pane){renderPane(pane);});
 }
 function moduleSelect(pane,kind){
  var list=moduleOptions(kind),value=pane.moduleId||"";
  return '<label class="pb-mw-field-label">Módulo<select class="pb-mw-field" data-pbmw-module data-pane-id="'+esc(pane.id)+'"><option value="">'+(kind==="commentary"?"Todos os comentários":"Todos os dicionários")+'</option>'+
   list.map(function(m){return '<option value="'+esc(m.id)+'"'+(value===m.id?" selected":"")+'>'+esc(m.name)+'</option>';}).join("")+'</select></label>';
 }
 function termField(pane,placeholder){
  return '<div class="pb-mw-query"><input class="pb-mw-field" type="search" data-pbmw-term data-pane-id="'+esc(pane.id)+'" value="'+esc(pane.term||"")+'" placeholder="'+esc(placeholder)+'"><button type="button" data-pbmw-action="search" data-pane-id="'+esc(pane.id)+'">Consultar</button></div>';
 }

 function contextAction(pane,action,label,icon){
  return '<button type="button" class="pb-context-action" data-pbmw-action="'+action+'" data-pane-id="'+esc(pane.id)+'" title="'+esc(label)+'" aria-label="'+esc(label)+'"><span aria-hidden="true">'+icon+'</span><small>'+esc(label)+'</small></button>';
 }
 function contextToolbar(pane){
  var controls=[];
  if(pane.type==="bible"){
   controls.push(contextAction(pane,"context-prev","Capítulo anterior","‹"));
   controls.push(contextAction(pane,"context-next","Próximo capítulo","›"));
   controls.push(contextAction(pane,"context-search","Pesquisar","⌕"));
   controls.push(contextAction(pane,"context-bookmark","Marcar","☆"));
   controls.push(contextAction(pane,"context-copy","Copiar","▣"));
   controls.push(contextAction(pane,"context-compare","Comparar","⇄"));
  }else if(pane.type==="commentary"){
   controls.push(contextAction(pane,"context-module-prev","Módulo anterior","‹"));
   controls.push(contextAction(pane,"context-module-next","Próximo módulo","›"));
   controls.push(contextAction(pane,"search-commentary","Pesquisar comentários","⌕"));
  }else if(pane.type==="dictionary"){
   controls.push(contextAction(pane,"focus-term","Pesquisar termo","⌕"));
   controls.push(contextAction(pane,"filter-module","Filtrar módulo","▽"));
  }else if(pane.type==="strong"||pane.type==="original"){
   controls.push(contextAction(pane,"strong-number","Número Strong","G/H"));
   controls.push(contextAction(pane,"strong-original","Idioma original","α"));
   controls.push(contextAction(pane,"strong-concordance","Concordância","≋"));
   controls.push(contextAction(pane,"strong-lexicon","Léxico","▤"));
  }
  return controls.length?'<nav class="pb-context-toolbar" aria-label="Ferramentas de '+esc(typeLabel(pane.type))+'" data-context="'+esc(pane.type)+'">'+controls.join("")+'</nav>':"";
 }
 function commentarySearchField(pane){
  return '<div class="pb-mw-query pb-mw-commentary-query"><input class="pb-mw-field" type="search" data-pbmw-commentary-term data-pane-id="'+esc(pane.id)+'" value="'+esc(pane.term||"")+'" placeholder="Pesquisar palavra nos comentários"><button type="button" data-pbmw-action="search-commentary" data-pane-id="'+esc(pane.id)+'">Pesquisar</button></div>';
 }
 function normalizeStrongCode(value){
  var match=String(value||"").toUpperCase().match(/^([GH])0*(\d{1,5})[A-Z]?$/);
  return match?match[1]+String(Number(match[2])):"";
 }
 function strongReferenceButton(word){
  var match=String(word.book||"").match(/^(.+?)\s+(\d+):(\d+)$/);
  if(!match)return "";
  var book=env.books.find(function(item){return item.name.toLocaleLowerCase("pt-BR")===match[1].toLocaleLowerCase("pt-BR");});
  if(!book)return "";
  return '<button type="button" class="pb-mw-ref-link" data-pbmw-open-ref data-book="'+esc(book.slug)+'" data-chapter="'+Number(match[2])+'" data-verse="'+Number(match[3])+'">'+esc(word.book)+'</button>';
 }
 function strongViewMarkup(pane,ref){
  var term=String(pane.term||"").trim(),code=normalizeStrongCode(term);
  var rows=words.filter(function(word){
   if(code)return normalizeStrongCode(word.code)===code||normalizeStrongCode(word.id)===code;
   var passage=String(word.book||"");
   return passage.indexOf(ref.name+" "+ref.chapter+":")===0;
  });
  var view=pane.strongView||"lexicon";
  if(view==="original"){
   return rows.length?rows.map(function(word){
    return '<article class="pb-mw-entry pb-mw-strong-entry"><small>'+(String(word.code).charAt(0)==="H"?"HEBRAICO":"GREGO")+' · IDIOMA ORIGINAL</small><strong class="pb-dict-original" dir="auto">'+esc(word.label)+'</strong><p>'+esc(word.reading||"")+' · Lema: '+esc(word.lemma||"")+'</p><p>'+esc(word.type||"")+' · '+esc(word.tense||"")+' · '+esc(word.voice||"")+'</p><p>'+esc(word.meaning||"")+'</p>'+strongReferenceButton(word)+'</article>';
   }).join(""):'<p class="pb-mw-empty">Informe um número Strong ou abra uma passagem com formas originais catalogadas.</p>';
  }
  if(view==="concordance"){
   return rows.length?'<p class="pb-mw-context-note">'+rows.length+' ocorrência(s) disponíveis na base alinhada deste aplicativo.</p>'+rows.map(function(word){
    return '<article class="pb-mw-entry"><strong>'+esc(word.code)+' · '+esc(word.label)+'</strong><p>'+esc(word.lemma||"")+' — '+esc(word.meaning||"")+'</p>'+strongReferenceButton(word)+'</article>';
   }).join(""):'<p class="pb-mw-empty">Nenhuma ocorrência correspondente foi encontrada na base Strong disponível.</p>';
  }
  var match=term.match(/^[GH]0*\d{1,5}[A-Z]?$/),forms=match?renderStrongEntry(term,ref):"";
  var lookup=match?term.replace(/^([GH])0*(\d{1,5})[A-Z]?$/,"$1$2"):term;
  return Promise.resolve(PBModules.getDictionaryEntry(lookup,pane.moduleId||undefined)).then(function(lexicon){
   return forms+(lexicon.length?lexicon.map(function(item){return '<article class="pb-mw-entry"><strong>'+esc(item.moduleName||"Léxico")+'</strong><p>'+esc(item.definition||item.text||"")+'</p></article>';}).join(""):'<p class="pb-mw-empty">Nenhum verbete lexical encontrado nos módulos instalados.</p>');
  });
 }
 async function runCommentarySearch(pane){
  var field=host&&host.querySelector('[data-pbmw-commentary-term][data-pane-id="'+pane.id+'"]');
  var term=String(field?field.value:pane.term||"").trim();
  if(!term){notify("Digite um termo para pesquisar nos comentários.");return;}
  pane.term=term;pane.searchMode=true;pane.searchResults=[];
  var serial=(pane.searchSerial||0)+1;pane.searchSerial=serial;
  save();renderPane(pane);
  try{
   var result=await PBModules.searchCommentaries(term,100,function(){return pane.searchSerial===serial;});
   if(pane.searchSerial!==serial)return;
   pane.searchResults=result.results||[];
   pane.searchTotal=result.total||0;
   renderPane(pane);
   notify(pane.searchTotal+" resultado(s) nos comentários.");
  }catch(error){if(pane.searchSerial===serial)notify("Falha na pesquisa dos comentários: "+error.message);}
 }
 function cyclePaneModule(pane,kind,delta){
  var options=moduleOptions(kind),index=options.findIndex(function(module){return module.id===pane.moduleId;});
  if(!options.length){notify("Nenhum módulo "+(kind==="commentary"?"de comentário":"de dicionário")+" instalado.");return;}
  pane.moduleId=options[(index+delta+options.length)%options.length].id;
  pane.searchMode=false;pane.searchResults=null;save();renderPane(pane);
 }
 function paneResult(body,serial,html){
  if(body&&body.isConnected&&serials[body.dataset.pbmwBody]===serial){
   var old=body.querySelector(".pb-mw-result");if(old)old.innerHTML=html;
   else body.insertAdjacentHTML("beforeend",'<div class="pb-mw-result">'+html+'</div>');
  }
 }
 async function renderPane(pane){
  var body=host&&host.querySelector('[data-pbmw-body="'+pane.id+'"]');if(!body)return;
  var serial=serials[pane.id]=(serials[pane.id]||0)+1,ref=referenceFor(pane),savedScroll=Number(pane.scrollTop)||0;
  body.dataset.ready="false";
  var tabId=pane.activeTabId;
  if(pane.book!==ref.book||pane.chapter!==ref.chapter){savedScroll=0;pane.scrollTop=0;}
  pane.book=ref.book;pane.chapter=ref.chapter;pane.verse=ref.verse;
  body.innerHTML=contextToolbar(pane)+referenceControls(pane)+'<div class="pb-mw-ref-label">'+esc(ref.name+" "+ref.chapter+":"+ref.verse)+'</div><div class="pb-mw-result"><div class="pb-mw-pane-loading">Carregando…</div></div>';
  if(pane.type==="bible"&&pane.id===primaryId&&columns){body.innerHTML="";body.appendChild(columns);readerReady();return;}
  if(pane.type==="bible"){
   var version=pane.moduleId||"bpm",opts=versionOptions(version);
   body.insertAdjacentHTML("afterbegin",'<label class="pb-mw-field-label">Tradução<select class="pb-mw-field" data-pbmw-module data-pane-id="'+esc(pane.id)+'">'+opts.map(function(x){return '<option value="'+esc(x[0])+'"'+(x[0]===version?" selected":"")+'>'+esc(x[1])+'</option>';}).join("")+'</select></label>');
   try{
    var data=version.startsWith("local:")?
     await PBModules.getChapter(version,ref.book,ref.chapter):
     await loadOnlineBibleChapter(version,ref.book,ref.chapter);
    var html=(data.verses||[]).map(function(v,i){
     var n=Number(v.number||v.verse)||i+1,txt=typeof v==="string"?v:(v.text||v.content||"");
     var rendered=version.startsWith("local:")?PBModules.renderVerse(txt,ref.book,env.state.showStrong):annotateVerse(txt,n,ref);
     return '<p class="pb-mw-bible-verse" data-verse="'+n+'"><button type="button" data-pbmw-open-verse="'+n+'" data-book="'+esc(ref.book)+'" data-chapter="'+ref.chapter+'">'+n+'</button> '+PBConnections.wrapHtml(rendered)+'</p>';
    }).join("");
    paneResult(body,serial,html+'<small class="pb-mw-credit">'+esc(data.copyright||"Conteúdo da tradução selecionada")+'</small>');
   }catch(error){paneResult(body,serial,'<p class="pb-mw-empty">'+esc(error.message)+'</p>');}
  }else if(pane.type==="commentary"){
   body.insertAdjacentHTML("afterbegin",moduleSelect(pane,"commentary")+commentarySearchField(pane));
   if(pane.searchMode&&Array.isArray(pane.searchResults)){
    paneResult(body,serial,pane.searchResults.length?pane.searchResults.map(function(x,i){
     var book=env.books.find(function(item){return item.slug===x.book;});
     var label=(book?book.name:x.book)+" "+(x.fromChapter||1)+(x.fromVerse?":"+x.fromVerse:"");
     return '<article class="pb-mw-entry"><strong>'+esc(x.moduleName||"Comentário")+' · '+esc(label)+'</strong><p>'+esc(x.text||"")+'</p><div class="pb-mw-entry-actions"><button type="button" data-pbmw-action="insert-commentary" data-pane-id="'+esc(pane.id)+'" data-result-index="'+i+'">Inserir no sermão</button><button type="button" data-pbmw-open-ref data-book="'+esc(x.book)+'" data-chapter="'+Number(x.fromChapter||1)+'" data-verse="'+Number(x.fromVerse||1)+'">Abrir passagem</button></div></article>';
    }).join(""):'<p class="pb-mw-empty">Nenhum comentário encontrado para este termo.</p>');
   }else{
    try{var rows=await PBModules.getCommentaries(ref.book,ref.chapter,ref.verse,pane.moduleId||undefined);
     pane.commentRows=rows;
     paneResult(body,serial,rows.length?rows.map(function(x,i){return '<article class="pb-mw-entry"><strong>'+esc(x.moduleName||"Comentário")+'</strong><p>'+esc(x.text||"")+'</p><div class="pb-mw-entry-actions"><button type="button" data-pbmw-action="insert-commentary" data-pane-id="'+esc(pane.id)+'" data-result-index="'+i+'">Inserir no sermão</button></div></article>';}).join(""):'<p class="pb-mw-empty">Nenhum comentário disponível para esta passagem.</p>');
    }catch(error){paneResult(body,serial,'<p class="pb-mw-empty">'+esc(error.message)+'</p>');}
   }
  }else if(pane.type==="dictionary"){
   body.insertAdjacentHTML("afterbegin",moduleSelect(pane,"dictionary")+termField(pane,"Palavra ou expressão"));
   if(!pane.term)paneResult(body,serial,'<p class="pb-mw-empty">Digite uma palavra para consultar os dicionários instalados.</p>');
   else try{var entries=await PBModules.getDictionaryEntry(pane.term,pane.moduleId||undefined);
    paneResult(body,serial,entries.length?entries.map(function(x){return '<article class="pb-mw-entry"><strong>'+esc(x.moduleName||x.term||pane.term)+'</strong><p>'+esc(x.text||x.definition||"")+'</p></article>';}).join(""):'<p class="pb-mw-empty">Nenhum verbete encontrado nos módulos instalados.</p>');
   }catch(error){paneResult(body,serial,'<p class="pb-mw-empty">'+esc(error.message)+'</p>');}
  }else if(pane.type==="strong"||pane.type==="original"){
   body.insertAdjacentHTML("afterbegin",moduleSelect(pane,"dictionary")+termField(pane,"Número Strong (G25/H3068) ou palavra"));
   var term=String(pane.term||"").trim();
   if(!term&&!(pane.strongView&&pane.strongView!=="lexicon")){
    var relevant=words.filter(function(w){return String(w.book||"").indexOf(ref.name+" "+ref.chapter+":")===0;});
    paneResult(body,serial,relevant.length?relevant.map(function(w){return '<article class="pb-mw-entry"><strong>'+esc(w.label)+' · '+esc(w.code)+'</strong><p>'+esc(w.reading||"")+' — '+esc(w.meaning||"")+'</p>'+strongReferenceButton(w)+'</article>';}).join(""):'<p class="pb-mw-empty">Não há formas originais catalogadas para este capítulo. Informe um código Strong para consultar o léxico.</p>');
   }else{
    try{
     var output=await strongViewMarkup(pane,ref);
     paneResult(body,serial,output);
    }catch(error){paneResult(body,serial,'<p class="pb-mw-empty">'+esc(error.message)+'</p>');}
   }
  }else if(pane.type==="crossrefs"){
   try{
    if(!crossrefData){if(!crossrefPromise)crossrefPromise=fetch("./pulpito-crossrefs.json").then(function(r){if(!r.ok)throw Error("Base de referências indisponível");return r.json();}).then(function(d){crossrefData=d;return d;}).catch(function(e){crossrefPromise=null;throw e;});crossrefData=await crossrefPromise;}
    var bookIndex=booksFallback.findIndex(function(b){return b.slug===ref.book;});
    var rows=(crossrefData.references||[]).filter(function(x){return x.s&&x.s[0]===bookIndex+1&&x.s[1]===ref.chapter&&x.s[2]===ref.verse;});
    paneResult(body,serial,rows.length?rows.map(function(row){return '<article class="pb-mw-entry"><strong>'+esc(row.d||"Referência")+'</strong><div>'+((row.t||[]).map(function(t){var target=booksFallback[t[0]-1];if(!target)return "";return '<button type="button" class="pb-mw-ref-link" data-pbmw-open-ref data-book="'+esc(target.slug)+'" data-chapter="'+Number(t[1])+'" data-verse="'+Number(t[2])+'">'+esc(target.name+" "+t[1]+":"+t[2]+(t[3]&&t[3]!==t[2]?"–"+t[3]:""))+'</button>';}).join(""))+'</div></article>';}).join(""):'<p class="pb-mw-empty">Nenhuma referência cruzada catalogada para este versículo.</p>');
   }catch(error){paneResult(body,serial,'<p class="pb-mw-empty">'+esc(error.message)+'</p>');}
  }else if(pane.type==="devotional"){
   try{
    var modules=await pbDevAll(),now=new Date(),today=Math.floor((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-Date.UTC(now.getFullYear(),0,1))/86400000)+1;
    if(serials[pane.id]!==serial||!body.isConnected)return;
    body.insertAdjacentHTML("afterbegin",'<label class="pb-mw-field-label">Devocional<select class="pb-mw-field" data-pbmw-module data-pane-id="'+esc(pane.id)+'"><option value="">Todos os devocionais</option>'+modules.map(function(m){return '<option value="'+esc(m.id)+'"'+(pane.moduleId===m.id?" selected":"")+'>'+esc(m.title)+'</option>';}).join("")+'</select></label>');
    var items=modules.filter(function(m){return !pane.moduleId||m.id===pane.moduleId;}).flatMap(function(m){
     return m.entries.filter(function(e){return e.day===today||(e.book===ref.book&&Number(e.chapter)===ref.chapter);}).map(function(e){return {m:m,e:e};});
    });
    paneResult(body,serial,items.length?items.map(function(x){return '<article class="pb-mw-entry"><strong>'+esc(x.e.title||x.m.title)+'</strong><p>'+esc(x.e.text||"")+'</p>'+(x.e.prayer?'<p><b>Oração:</b> '+esc(x.e.prayer)+'</p>':"")+pbDevOpenButton(x.m,x.e,x.m.entries.indexOf(x.e))+'</article>';}).join(""):'<p class="pb-mw-empty">Nenhum devocional disponível para hoje ou para este capítulo.</p>');
   }catch(error){paneResult(body,serial,'<p class="pb-mw-empty">'+esc(error.message)+'</p>');}
  }else if(pane.type==="plans"){
   var plans=pb2Read().plans||[],matching=plans.filter(function(p){return (p.references||[]).some(function(x){return x===ref.name+" "+ref.chapter;});});
   paneResult(body,serial,matching.length?matching.map(function(p){return '<article class="pb-mw-entry"><strong>'+esc(p.title)+'</strong><p>'+((p.done||{})[ref.name+" "+ref.chapter]?"Capítulo concluído":"Capítulo pendente")+'</p></article>';}).join(""):'<p class="pb-mw-empty">Nenhum plano de estudo inclui este capítulo.</p>');
  }else if(pane.type==="map"){
   paneResult(body,serial,'<p>Explore as conexões temáticas e referências relacionadas à passagem.</p><button type="button" class="pb-mw-primary" data-pbmw-action="map">Abrir Mapa Bíblico</button>');
  }else if(pane.type==="sermon"){
   paneResult(body,serial,'<article class="pb-mw-entry"><strong>'+esc(env.state.sermon.title||"Sermão atual")+'</strong><p>'+esc(env.state.sermon.reference||"")+'</p><p>'+esc(env.state.sermon.context||"Adicione notas e observações ao sermão.")+'</p></article><button type="button" class="pb-mw-primary" data-pbmw-action="insert-reference">Inserir referência no sermão</button>');
  }
  if(body.isConnected&&serials[pane.id]===serial&&pane.activeTabId===tabId){body.scrollTop=savedScroll;body.dataset.ready="true";}
 }
 function saveScroll(pane,body){
  if(body.dataset.ready!=="true"||body.dataset.tabId!==pane.activeTabId||pane.minimized)return;
  pane.scrollTop=body.scrollTop;if(saveFrame)return;
  saveFrame=requestAnimationFrame(function(){saveFrame=0;save();});
 }
 function splitPane(source){
  if(!source||cfg.count>=4){notify("O espaço de estudo já está com quatro painéis.");return;}
  captureScroll();if(!cfg.active){ensureBaseState();cfg.active=true;}
  var next=cfg.panes[cfg.count],reference=referenceFor(source);
  next.tabs=[];next.activeTabId="";next.type=source.type;next.moduleId=source.moduleId||"";
  next.book=reference.book;next.chapter=reference.chapter;next.verse=reference.verse;next.term=source.term||"";next.codes=Array.isArray(source.codes)?source.codes.slice():[];
  next.linked=false;next.linkSet="";next.minimized=false;next.pinned=false;next.floating=false;next.scrollTop=0;
  addTab(next,source.type,{moduleId:source.moduleId||"",term:source.term||"",codes:next.codes});
  ensureCount(cfg.count+1);cfg.maxPaneId="";save();if(host)render();else renderReader();
 }
 function saveLayoutSnapshot(){
  captureScroll();save();
  try{localStorage.setItem(KEY+"-snapshot-v1",JSON.stringify(cfg));notify("Organização dos painéis salva.");}
  catch(error){notify("Não foi possível salvar a organização.");}
 }
 function restoreLayoutSnapshot(){
  try{
   var raw=localStorage.getItem(KEY+"-snapshot-v1"),snapshot=raw&&JSON.parse(raw);
   if(!snapshot||!Array.isArray(snapshot.panes)){notify("Ainda não existe uma organização salva.");return;}
   localStorage.setItem(KEY,raw);cfg=read();prepareReaderState();save();
   if(host)render();else renderReader();notify("Organização dos painéis restaurada.");
  }catch(error){notify("Não foi possível restaurar a organização salva.");}
 }
 function setLayout(n){
  captureScroll();
  if(!cfg.active){ensureBaseState();cfg.active=true;}
  ensureCount(n);cfg.maxPaneId="";
  visible().forEach(function(p){if(p.linked){p.book=env.state.book;p.chapter=env.state.chapter;p.verse=env.state.selectedVerse||1;}});
  save();if(host)render();else renderReader();
 }
 function exit(){captureScroll();cfg.active=false;cfg.maxPaneId="";save();prepareReaderState();renderReader();}
 function toggleMaximized(id){
  captureScroll();
  cfg.maxPaneId=cfg.maxPaneId===id?"":id;
  save();setGrid();
 }
 function openTool(type,payload){
  if(!TYPES.some(function(item){return item[0]===type;}))return;
  captureScroll();
  if(!cfg.active){ensureBaseState();cfg.active=true;}
  var panes=visible(),pane=panes.find(function(pane){return pane.id!==primaryId&&pane.type===type;});
  if(!pane){
   if(cfg.count<4){ensureCount(cfg.count+1);pane=cfg.panes[cfg.count-1];}
   else pane=panes[panes.length-1];
   addTab(pane,type);
  }
  if(payload){
   if(payload.term!==undefined)pane.term=payload.term;
   if(payload.codes)pane.codes=payload.codes;
   if(payload.moduleId!==undefined)pane.moduleId=payload.moduleId;
   if(payload.reference){pane.book=payload.reference.book;pane.chapter=payload.reference.chapter;pane.verse=payload.reference.verse||1;
    if(pane.book!==env.state.book||pane.chapter!==env.state.chapter)pane.linked=false;}
  }
  pane.scrollTop=0;pane.minimized=false;cfg.maxPaneId="";
  save();if(host)render();else renderReader();
  return pane.id;
 }
 function referenceChanged(){
  if(!cfg.active)return;
  cfg.panes.forEach(function(pane){
   if(pane.linked||pane.linkSet==="A"){
    var changed=pane.book!==env.state.book||pane.chapter!==env.state.chapter||pane.verse!==(env.state.selectedVerse||1);
    pane.book=env.state.book;pane.chapter=env.state.chapter;pane.verse=env.state.selectedVerse||1;
    if(changed){pane.scrollTop=0;if(pane.id!==primaryId&&visible().includes(pane))renderPane(pane);}
   }
  });
  save();
 }
 function readerReady(){
  if(!host||!primaryId)return;
  var pane=cfg.panes.find(function(pane){return pane.id===primaryId;}),body=host.querySelector('[data-pbmw-body="'+primaryId+'"]');
  if(!body||!columns||!columns.querySelector(".verse-line"))return;
  pane.moduleId=env.state.version;
  if(pane.book!==env.state.book||pane.chapter!==env.state.chapter)pane.scrollTop=0;
  pane.book=env.state.book;pane.chapter=env.state.chapter;pane.verse=env.state.selectedVerse||1;
  body.scrollTop=pane.scrollTop;body.dataset.ready="true";
  referenceChanged();
 }
 function startPaneDrag(event){
  var handle=event.target.closest&&event.target.closest("[data-pbmw-drag-handle]");
  if(!handle||!host||!host.contains(handle)||event.button!==0)return;
  var pane=cfg.panes.find(function(item){return item.id===handle.dataset.paneId;});
  var element=handle.closest("[data-pbmw-pane]");
  if(!pane||!element||pane.pinned)return;
  event.preventDefault();
  var startX=event.clientX,startY=event.clientY,startLeft=Number(pane.floatX)||18,startTop=Number(pane.floatY)||96,drop=null,moved=false,pointerId=event.pointerId;
  function move(e){
   if(e.pointerId!==pointerId)return;
   if(Math.abs(e.clientX-startX)+Math.abs(e.clientY-startY)>5)moved=true;
   if(!moved)return;
   if(pane.floating){
    pane.floatX=Math.max(4,Math.min(window.innerWidth-element.offsetWidth-4,startLeft+e.clientX-startX));
    pane.floatY=Math.max(4,Math.min(window.innerHeight-element.offsetHeight-4,startTop+e.clientY-startY));
    element.style.left=pane.floatX+"px";element.style.top=pane.floatY+"px";
   }else{
    var under=document.elementFromPoint(e.clientX,e.clientY),candidate=under&&under.closest?under.closest("[data-pbmw-pane]"):null;
    if(candidate&&candidate!==element&&visible().some(function(item){return item.id===candidate.dataset.pbmwPane&&!item.floating&&!item.minimized;})){
     if(drop&&drop!==candidate)drop.classList.remove("is-drop-target");drop=candidate;drop.classList.add("is-drop-target");
    }else if(drop){drop.classList.remove("is-drop-target");drop=null;}
   }
  }
  function finish(e){
   if(e.pointerId!==pointerId)return;
   document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",finish);document.removeEventListener("pointercancel",finish);
   if(drop)drop.classList.remove("is-drop-target");
   if(moved&&!pane.floating&&drop){
    var from=cfg.panes.findIndex(function(item){return item.id===pane.id;}),to=cfg.panes.findIndex(function(item){return item.id===drop.dataset.pbmwPane;});
    if(from>=0&&to>=0&&from<cfg.count&&to<cfg.count){var item=cfg.panes.splice(from,1)[0];cfg.panes.splice(to,0,item);save();render();return;}
   }
   if(moved&&pane.floating)save();
  }
  document.addEventListener("pointermove",move);document.addEventListener("pointerup",finish);document.addEventListener("pointercancel",finish);
 }
 function bindResize(){
  if(!host)return;
  host.addEventListener("pointerdown",startPaneDrag);
  dragCleanup=function(){if(host)host.removeEventListener("pointerdown",startPaneDrag);};
  resizeCleanup=window.PBSplitStudy.bindPanelResize(host,{
   read:function(axis){return axis==="col"?cfg.colRatio:cfg.rowRatio;},
   update:function(axis,value){if(axis==="col")cfg.colRatio=value;else cfg.rowRatio=value;setGrid();},
   finish:save
  });
  host.addEventListener("scroll",function(event){
   var body=event.target;if(!body||!body.matches||!body.matches(".pb-mw-pane-body"))return;
   var pane=cfg.panes.find(function(p){return p.id===body.dataset.pbmwBody;});if(pane)saveScroll(pane,body);
  },true);
  host.addEventListener("scroll",function(event){
   var body=event.target;if(!body||!body.matches||!body.matches(".pb-mw-pane-body")||!columns||!columns.contains(body.querySelector("#chapter-body")))return;
   if(scrollTimer)clearTimeout(scrollTimer);
   scrollTimer=setTimeout(function(){
    if(!host||!host.isConnected)return;
    var rect=body.getBoundingClientRect(),line=rect.top+Math.min(50,rect.height/3),items=columns.querySelectorAll("#chapter-body .verse-line[data-verse]"),chosen=0,best=Infinity;
    items.forEach(function(item){var r=item.getBoundingClientRect();if(r.bottom<rect.top||r.top>rect.bottom)return;var distance=Math.abs(r.top-line);if(distance<best){best=distance;chosen=Number(item.dataset.verse)||0;}});
    if(chosen&&chosen!==env.state.selectedVerse){env.state.selectedVerse=chosen;persist();PBStudyBridge.selectVerse(env.state.book,env.state.chapter,chosen,"multi-window-scroll");var label=document.getElementById("selected-reference");if(label)label.textContent=ref();referenceChanged();}
   },120);
  },true);
 }
 function closePane(id){
  captureScroll();
  var index=cfg.panes.findIndex(function(pane){return pane.id===id;});
  if(index<0||index>=cfg.count)return;
  if(cfg.panes[index].pinned){notify("Desafixe o painel antes de fechá-lo.");return;}
  if(cfg.count===1){exit();return;}
  var closed=cfg.panes.splice(index,1)[0];
  cfg.panes.push(closed);closed.minimized=false;
  cfg.count--;cfg.maxPaneId="";save();render();
 }
 function actionClick(event){
  var target=event.target.closest("[data-pbmw],[data-pbmw-layout],[data-pbmw-orientation],[data-pbmw-exit],[data-pbmw-save-layout],[data-pbmw-restore-layout],[data-pbmw-action],[data-pbmw-open-ref],[data-pbmw-open-verse]");
  if(!target)return;
  if(target.closest("#pb-reader-multi-host")||target.closest(".pb-mw-toolbar")||target.closest(".pb-mw-minimized-bar")||target.hasAttribute("data-pbmw-open-ref")||target.hasAttribute("data-pbmw-open-verse")){
   if(target.dataset.pbmw==="menu"){var menu=document.getElementById("pb-mw-menu");if(menu){menu.hidden=!menu.hidden;target.setAttribute("aria-expanded",String(!menu.hidden));}event.preventDefault();return;}
   if(target.dataset.pbmwLayout){setLayout(Number(target.dataset.pbmwLayout));return;}
   if(target.hasAttribute("data-pbmw-orientation")){cfg.orientation=cfg.orientation==="horizontal"?"vertical":"horizontal";save();setGrid();var label=document.getElementById("pb-mw-orientation-label");if(label)label.textContent=cfg.orientation==="horizontal"?"Lado a lado":"Empilhadas";return;}
   if(target.hasAttribute("data-pbmw-exit")){exit();return;}
   if(target.hasAttribute("data-pbmw-save-layout")){saveLayoutSnapshot();return;}
   if(target.hasAttribute("data-pbmw-restore-layout")){restoreLayoutSnapshot();return;}
   if(target.hasAttribute("data-pbmw-open-ref")||target.hasAttribute("data-pbmw-open-verse")){
    var source=target.closest("[data-pbmw-pane]");
    var selected=source&&visible().find(function(p){return p.id===source.dataset.pbmwPane;});
    var book=target.dataset.book,chapter=Number(target.dataset.chapter);
    var verse=Number(target.dataset.pbmwOpenVerse||target.dataset.verse);
    if(selected&&selected.id!==primaryId){
     var group=selected.linkSet||(selected.linked?"A":"");
     if(group==="A")setRef(book,chapter,verse);
     else if(group)syncLinkSet(group,{book:book,chapter:chapter,verse:verse},selected.id);
     else{selected.book=book;selected.chapter=chapter;selected.verse=verse;if(target.hasAttribute("data-pbmw-open-ref"))selected.scrollTop=0;save();renderPane(selected);}
    }else setRef(book,chapter,verse);
    return;
   }
   var act=target.dataset.pbmwAction,id=target.dataset.paneId,pane=cfg.panes.find(function(p){return p.id===id;});
   if(pane&&(act==="context-prev"||act==="context-next")){
    var currentRef=referenceFor(pane),book=env.books.find(function(item){return item.slug===currentRef.book;})||env.activeBook;
    var chapter=currentRef.chapter+(act==="context-next"?1:-1);
    if(chapter<1||chapter>Number(book.chapters||150)){notify("Não há outro capítulo nesta direção.");return;}
    if(pane.id===primaryId){setRef(currentRef.book,chapter,1);return;}
    pane.linked=false;pane.chapter=chapter;pane.verse=1;pane.scrollTop=0;save();renderPane(pane);return;
   }
   if(pane&&act==="context-search"){if(env.onSearch)env.onSearch();else notify("Pesquisa bíblica indisponível.");return;}
   if(pane&&act==="context-bookmark"){if(env.onBookmark)env.onBookmark(referenceFor(pane));else notify("Marcação indisponível.");return;}
   if(pane&&act==="context-copy"){
    var copyBody=host&&host.querySelector('[data-pbmw-body="'+id+'"] .pb-mw-result');
    var copyText=(referenceFor(pane).name+" "+referenceFor(pane).chapter+"\n"+(copyBody?copyBody.innerText:"")).trim();
    if(copyText&&navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(copyText).then(function(){notify("Texto do capítulo copiado.");}).catch(function(){notify("Não foi possível copiar o texto.");});
    else notify("Não há texto disponível para copiar.");
    return;
   }
   if(pane&&act==="context-compare"){
    var alternatives=versionOptions(pane.moduleId).filter(function(item){return item[0]!==pane.moduleId;});
    if(!alternatives.length){notify("Instale outra tradução para comparar.");return;}
    openTool("bible",{moduleId:alternatives[0][0],reference:referenceFor(pane)});return;
   }
   if(pane&&act==="context-module-prev"){cyclePaneModule(pane,"commentary",-1);return;}
   if(pane&&act==="context-module-next"){cyclePaneModule(pane,"commentary",1);return;}
   if(pane&&act==="search-commentary"){runCommentarySearch(pane);return;}
   if(pane&&act==="focus-term"){var termInput=host&&host.querySelector('[data-pbmw-term][data-pane-id="'+id+'"]');if(termInput)termInput.focus();return;}
   if(pane&&act==="filter-module"){var moduleInput=host&&host.querySelector('[data-pbmw-module][data-pane-id="'+id+'"]');if(moduleInput)moduleInput.focus();return;}
   if(pane&&act==="strong-number"){var strongInput=host&&host.querySelector('[data-pbmw-term][data-pane-id="'+id+'"]');if(strongInput)strongInput.focus();return;}
   if(pane&&(act==="strong-original"||act==="strong-concordance"||act==="strong-lexicon")){
    pane.strongView=act==="strong-original"?"original":act==="strong-concordance"?"concordance":"lexicon";save();renderPane(pane);return;
   }
   if(pane&&act==="insert-commentary"){
    var row=(pane.searchMode?pane.searchResults:pane.commentRows)||[],entry=row[Number(target.dataset.resultIndex)];
    if(entry){var source=entry.moduleName||"Comentário",passage=entry.book?(entry.book+" "+(entry.fromChapter||1)+(entry.fromVerse?":"+entry.fromVerse:"")):(referenceFor(pane).name+" "+referenceFor(pane).chapter);env.state.sermon.context+=(env.state.sermon.context?"\n\n":"")+source+" — "+passage+"\n"+entry.text;persist();notify("Comentário inserido no sermão.");}
    return;
   }
   if(pane&&act==="search-commentary-clear"){pane.searchMode=false;pane.searchResults=null;pane.term="";save();renderPane(pane);return;}
   if(act==="sync"&&pane){
    var groups=["","A","B","C"],current=groups.indexOf(pane.linkSet||(pane.linked?"A":""));
    assignLinkSet(pane,groups[(current+1)%groups.length]);return;
   }
   if(act==="split"&&pane){splitPane(pane);return;}
   if(act==="pin"&&pane){pane.pinned=!pane.pinned;save();render();notify(pane.pinned?"Painel fixado.":"Painel desafixado.");return;}
   if(act==="float"&&pane){pane.floating=!pane.floating;if(pane.floating){pane.floatX=Math.max(8,Math.min(window.innerWidth-340,window.innerWidth-440));pane.floatY=88;}cfg.maxPaneId="";save();render();return;}
   if(act==="min"&&pane){if(pane.pinned){notify("Desafixe o painel antes de minimizá-lo.");return;}captureScroll();pane.minimized=true;if(cfg.maxPaneId===id)cfg.maxPaneId="";save();render();return;}
   if(act==="restore"&&pane){captureScroll();pane.minimized=false;save();render();return;}
   if(act==="add-tab"&&pane){addTab(pane,"bible");save();render();return;}
   if(act==="tab"&&pane){switchTab(pane,target.dataset.tabId);return;}
   if(act==="close-tab"&&pane){closeTab(pane,target.dataset.tabId);return;}
   if(act==="max"&&pane){toggleMaximized(id);return;}
   if(act==="swap"&&pane){if(pane.pinned){notify("Desafixe o painel antes de trocar sua posição.");return;}captureScroll();var i=cfg.panes.findIndex(function(p){return p.id===id;}),j=i+1<cfg.count?i+1:i-1;if(j>=0&&!cfg.panes[j].pinned){var tmp=cfg.panes[i];cfg.panes[i]=cfg.panes[j];cfg.panes[j]=tmp;save();render();}else if(j>=0)notify("O painel de destino está fixado.");return;}
   if(act==="close"&&pane){closePane(id);return;}
   if(act==="search"&&pane){var input=host.querySelector('[data-pbmw-term][data-pane-id="'+id+'"]');pane.term=input?input.value.trim():pane.term;pane.scrollTop=0;save();renderPane(pane);return;}
   if(act==="map"){page("map");return;}
   if(act==="insert-reference"){env.state.sermon.context+=(env.state.sermon.context?"\n\n":"")+ref();persist();notify("Referência inserida no sermão.");return;}
  }
 }
 function actionChange(event){
  var t=event.target;
  if(t.matches("[data-pbmw-type]")){var p=cfg.panes.find(function(x){return x.id===t.dataset.paneId;});if(p){if(p.type!==t.value){captureScroll();p.type=t.value;p.moduleId=p.type==="bible"?env.state.version:"";p.term="";p.scrollTop=0;}save();render();}return;}
  if(t.matches("[data-pbmw-module]")){var p=cfg.panes.find(function(x){return x.id===t.dataset.paneId;});if(p){p.moduleId=t.value;save();if(p.id===primaryId){env.state.version=t.value;persist();renderReader();}else renderPane(p);}return;}
  if(t.matches("[data-pbmw-ref]")){var p=cfg.panes.find(function(x){return x.id===t.dataset.paneId;});if(p){var value=t.dataset.pbmwRef==="book"?t.value:Number(t.value)||1,refNow=referenceFor(p);refNow[t.dataset.pbmwRef]=value;var book=env.books.find(function(item){return item.slug===refNow.book;});refNow.chapter=Math.max(1,Math.min(book.chapters||150,Math.floor(refNow.chapter)));refNow.verse=Math.max(1,Math.floor(refNow.verse)||1);var group=p.linkSet||(p.linked?"A":"");if(group==="A")setRef(refNow.book,refNow.chapter,refNow.verse);else if(group)syncLinkSet(group,refNow,p.id);else{p.book=refNow.book;p.chapter=refNow.chapter;p.verse=refNow.verse;p.scrollTop=0;save();renderPane(p);}}return;}
  if(t.matches("[data-pbmw-term]")){var p=cfg.panes.find(function(x){return x.id===t.dataset.paneId;});if(p){p.term=t.value;save();}}
 }
 function actionInput(event){var t=event.target;if(!t.matches("[data-pbmw-term]"))return;var p=cfg.panes.find(function(x){return x.id===t.dataset.paneId;});if(p)p.term=t.value;}
 function selfTest(){
  var ids=cfg.panes.flatMap(function(pane){return [pane.id].concat(pane.tabs.map(function(tab){return tab.id;}));});
  var checks=[
   {test:"one-to-four-panels",passed:Number.isInteger(cfg.count)&&cfg.count>=1&&cfg.count<=4},
   {test:"unique-panel-and-tab-ids",passed:new Set(ids).size===ids.length},
   {test:"valid-active-tabs",passed:cfg.panes.every(function(pane){return pane.tabs.some(function(tab){return tab.id===pane.activeTabId;});})},
   {test:"independent-sync-flags",passed:cfg.panes.every(function(pane){return typeof pane.linked==="boolean";})},
   {test:"valid-link-sets",passed:cfg.panes.every(function(pane){return ["","A","B","C"].includes(pane.linkSet||"");})},
   {test:"pin-and-float-state",passed:cfg.panes.every(function(pane){return typeof pane.pinned==="boolean"&&typeof pane.floating==="boolean";})}
  ];
  return {passed:checks.every(function(check){return check.passed;}),checks:checks};
 }
 function sourceReference(node){
  var element=node&&node.closest("[data-pbmw-pane]");
  var pane=element&&visible().find(function(pane){return pane.id===element.dataset.pbmwPane;});
  return pane?referenceFor(pane):{book:env.state.book,chapter:env.state.chapter,verse:env.state.selectedVerse||1};
 }
 document.addEventListener("click",actionClick);
 document.addEventListener("change",actionChange);
 document.addEventListener("input",actionInput);
 window.addEventListener("pagehide",function(){captureScroll();save();});
 document.addEventListener("keydown",function(event){
  var target=event.target;
  if(target.matches("[data-pbmw-term]")&&event.key==="Enter"){
   event.preventDefault();target.parentNode.querySelector("button").click();return;
  }
  if(!target.matches('[role="tab"][data-pbmw-action]'))return;
  var pane=cfg.panes.find(function(pane){return pane.id===target.dataset.paneId;});
  if(!pane||!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
  event.preventDefault();var index=pane.tabs.findIndex(function(tab){return tab.id===pane.activeTabId;});
  if(event.key==="Home")index=0;else if(event.key==="End")index=pane.tabs.length-1;
  else index=(index+(event.key==="ArrowRight"?1:-1)+pane.tabs.length)%pane.tabs.length;
  switchTab(pane,pane.tabs[index].id);document.getElementById(pane.activeTabId).focus();
 });
 function dismissMenu(restoreFocus){
  var menu=document.getElementById("pb-mw-menu");
  if(!menu||menu.hidden)return;
  var trigger=menu.parentElement.querySelector(".pb-mw-trigger");
  menu.hidden=true;trigger.setAttribute("aria-expanded","false");
  if(restoreFocus)trigger.focus();
 }
 document.addEventListener("click",function(event){if(!event.target.closest(".pb-mw-toolbar"))dismissMenu(false);});
 document.addEventListener("keydown",function(event){if(event.key==="Escape")dismissMenu(true);});
 return {isActive:isActive,prepareReaderState:prepareReaderState,mount:mount,unmount:unmount,setLayout:setLayout,splitPane:splitPane,openTool:openTool,assignLinkSet:assignLinkSet,saveLayoutSnapshot:saveLayoutSnapshot,restoreLayoutSnapshot:restoreLayoutSnapshot,referenceChanged:referenceChanged,readerReady:readerReady,sourceReference:sourceReference,selfTest:selfTest,getState:function(){return JSON.parse(JSON.stringify(cfg));}};

};
