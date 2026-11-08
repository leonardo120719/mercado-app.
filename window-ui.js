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
