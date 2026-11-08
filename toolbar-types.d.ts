/**
 * Contrato TypeScript da Toolbar do Púlpito Bible.
 * A implementação de produção fica em toolbar-store.js e é incluída no app.js.
 */
export type ReadingMode = 'normal' | 'study' | 'fullscreen';
export type AudioState = 'idle' | 'playing' | 'paused';
export type BibleTheme = 'light' | 'dark' | 'sepia';
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';
export type ToolbarMode = 'selection' | ReadingMode;
export type ToolbarActionId =
  | 'copy' | 'share' | 'highlight' | 'note' | 'clear'
  | 'navigate' | 'font' | 'audio' | 'search' | 'menu'
  | 'strong' | 'comments' | 'notes'
  | 'prev' | 'next' | 'expand' | 'exit-fullscreen'
  | 'study' | 'normal' | 'font-down' | 'font-up' | 'theme'
  | 'modules' | 'bookmarks' | 'sermon' | 'tutor'
  | 'preferences-changed' | 'font-changed'
  | 'mode-changed' | 'theme-changed' | 'highlight-applied'
  | 'selection-cleared';

export interface ToolbarState {
  readonly currentVerseSelection: readonly string[];
  readonly readingMode: ReadingMode;
  readonly audioState: AudioState;
  readonly fontSize: number;
  readonly theme: BibleTheme;
  readonly highlights: Readonly<Record<string, HighlightColor>>;
  readonly menuOpen: boolean;
  readonly paletteOpen: boolean;
  readonly expandFullScreen: boolean;
  readonly showNumbers: boolean;
  readonly showStrong: boolean;
  readonly showComments: boolean;
  readonly showCrossRefs: boolean;
  readonly showParallel: boolean;
  readonly continuousText: boolean;
}
export interface SelectOption {
  readonly value: string;
  readonly label: string;
}
export interface ToolbarNavigation {
  readonly version: string;
  readonly book: string;
  readonly chapter: number;
  readonly versions: readonly SelectOption[];
  readonly books: readonly SelectOption[];
  readonly chapters: readonly SelectOption[];
}
export interface ToolbarMountConfig {
  readonly root: HTMLElement | string;
  readonly readNavigation: () => ToolbarNavigation;
  readonly onAction: (action: ToolbarActionId) => void;
}
export interface ToolbarActions {
  selectVerse(id: string): void;
  toggleVerse(id: string): void;
  setSelection(ids: string[]): void;
  clearSelection(): void;
  setReadingMode(mode: ReadingMode): void;
  setAudioState(audio: AudioState): void;
  setFontSize(sizePx: number): void;
  setTheme(theme: BibleTheme): void;
  applyHighlight(color: HighlightColor): void;
  clearHighlight(ids?: string[]): void;
  toggleMenu(): void;
  closeMenu(): void;
  togglePalette(): void;
  toggleExpanded(): void;
  setPreference(name: 'showNumbers' | 'showStrong' | 'showComments' | 'showCrossRefs' | 'showParallel' | 'continuousText', enabled: boolean): void;
  setPreferences(values: Partial<Pick<ToolbarState, 'showNumbers' | 'showStrong' | 'showComments' | 'showCrossRefs' | 'showParallel' | 'continuousText'>>): void;
}
export interface ToolbarStore {
  getState(): ToolbarState;
  subscribe<T>(selector: (state: ToolbarState) => T, handler: (value: T, previous: T) => void): () => void;
  subscribe(handler: (state: ToolbarState, previous: ToolbarState) => void): () => void;
  readonly actions: ToolbarActions;
  priority(state?: ToolbarState): ToolbarMode;
  visibleActions(state?: ToolbarState): ToolbarActionId[];
  mount(config: ToolbarMountConfig): () => void;
  unmount(): void;
  readonly COLORS: Readonly<Record<HighlightColor, string>>;
}
declare global {
  interface Window { PBToolbar: ToolbarStore; }
}

/**
 * Exemplo solicitado:
 * window.PBToolbar.actions.setSelection(['JN.3.16']);
 * window.PBToolbar.actions.applyHighlight('yellow');
 * // highlight de 'JN.3.16' = yellow
 * // currentVerseSelection = [], exibindo novamente a navegação padrão.
 */
