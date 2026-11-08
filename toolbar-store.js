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
