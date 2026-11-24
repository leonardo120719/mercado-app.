/* Local EPUB and MOBI import. Only text and structural metadata reach the reader. */
(function (global) {
  "use strict";

  const MB = 1024 * 1024;
  const limit = 32 * MB;
  const parser = new DOMParser();
  const unpack = node => (node?.textContent || "").replace(/\s+/g, " ").trim();
  const elements = (doc, name) => Array.from(doc.getElementsByTagNameNS("*", name));
  const readXml = (source, name) => {
    const doc = parser.parseFromString(source, "application/xml");
    if (doc.documentElement.localName !== name || doc.getElementsByTagName("parsererror").length) {
      throw Error("Estrutura inválida no EPUB: " + name + ".");
    }
    return doc;
  };

  function resolvePath(base, path) {
    if (!path) return null;
    const url = new URL(path, new URL("/" + base.split("/").map(encodeURIComponent).join("/"), "https://epub.invalid"));
    if (url.origin !== "https://epub.invalid" || url.search) return null;
    return { path: decodeURIComponent(url.pathname.slice(1)), anchor: decodeURIComponent(url.hash.slice(1)) };
  }

  function inertBody(source) {
    const template = document.createElement("template");
    // Template contents stay inert and are never inserted into the reader DOM.
    template.innerHTML = source;
    return template.content;
  }

  function extractSections(root, toc, sections) {
    const skip = new Set(["script", "style", "head", "title", "noscript", "template", "nav", "svg", "math", "iframe", "object"]);
    const blocks = new Set(["address", "article", "blockquote", "dd", "div", "dt", "figcaption", "li", "p", "pre", "section", "td", "th"]);
    let section = { title: toc.get("") || "", blocks: [] };
    let buffer = "";
    const flush = () => {
      const line = buffer.replace(/\s+/g, " ").trim();
      buffer = "";
      if (line) section.blocks.push({ text: line });
    };
    const finish = () => {
      flush();
      if (!section.blocks.length) return;
      section.title ||= "Seção " + (sections.length + 1);
      sections.push(section);
      if (sections.length > 6000) throw Error("O livro contém mais de 6 mil seções.");
    };
    const walk = (node, depth) => {
      if (depth > 256) throw Error("A estrutura deste livro é complexa demais.");
      if (node.nodeType === 3) {
        buffer += node.nodeValue;
        return;
      }
      const tag = node.localName?.toLowerCase();
      if (skip.has(tag)) return;
      const heading = /^h[1-6]$/.test(tag || "");
      const anchor = node.getAttribute?.("data-pb-toc-anchor") || node.getAttribute?.("id") || node.getAttribute?.("name") || "";
      const tocTitle = anchor && toc.get(anchor);
      if (tocTitle || heading) {
        flush();
        const text = heading ? unpack(node) : "";
        if (tocTitle || (!toc.size && /^h[12]$/.test(tag) && text && section.blocks.length)) {
          finish();
          section = { title: tocTitle || text, blocks: [] };
        }
        if (text) {
          section.title ||= text;
          section.blocks.push({ text, heading: true });
          return;
        }
      }
      const boundary = tag === "br" || tag === "hr" || blocks.has(tag);
      if (boundary) flush();
      for (const child of node.childNodes) walk(child, depth + 1);
      if (boundary) flush();
    };
    walk(root, 0);
    finish();
  }

  async function parseEpub(file) {
    if (!global.JSZip) throw Error("O leitor ZIP não carregou. Abra o aplicativo online e tente novamente.");
    const zip = await global.JSZip.loadAsync(new Uint8Array(await file.arrayBuffer()));
    const entries = Object.values(zip.files).filter(entry => !entry.dir);
    if (entries.length > 6000) throw Error("O EPUB contém arquivos demais.");
    let expanded = 0;
    const read = async path => {
      const entry = zip.file(path);
      if (!entry) throw Error("Arquivo ausente no EPUB: " + path);
      const size = entry._data?.uncompressedSize;
      if (!Number.isSafeInteger(size) || size < 0 || size > 8 * MB || (expanded += size) > limit) {
        throw Error("O conteúdo de leitura do EPUB ultrapassa o limite de importação.");
      }
      return new Promise((resolve, reject) => {
        const decoder = new TextDecoder();
        const stream = entry.internalStream("uint8array");
        const chunks = [];
        let bytes = 0;
        stream.on("data", chunk => {
          bytes += chunk.length;
          if (bytes > size) {
            stream.pause();
            reject(Error("O EPUB contém uma entrada ZIP com tamanho inválido."));
          } else chunks.push(decoder.decode(chunk, { stream: true }));
        }).on("error", reject).on("end", () => {
          chunks.push(decoder.decode());
          resolve(chunks.join(""));
        }).resume();
      });
    };
    if (zip.file("META-INF/encryption.xml")) {
      const xml = readXml(await read("META-INF/encryption.xml"), "encryption");
      const fontAlgorithms = ["http://www.idpf.org/2008/embedding", "http://ns.adobe.com/pdf/enc#RC"];
      if (elements(xml, "EncryptedData").some(node => !fontAlgorithms.includes(elements(node, "EncryptionMethod")[0]?.getAttribute("Algorithm")))) {
        throw Error("Este EPUB tem conteúdo protegido por DRM.");
      }
    }
    const container = readXml(await read("META-INF/container.xml"), "container");
    const packagePath = elements(container, "rootfile")[0]?.getAttribute("full-path");
    if (!packagePath) throw Error("O EPUB não identifica o arquivo de conteúdo.");
    const opf = readXml(await read(packagePath), "package");
    const manifest = new Map(elements(opf, "item").map(node => [node.getAttribute("id"), {
      location: resolvePath(packagePath, node.getAttribute("href")),
      media: node.getAttribute("media-type"),
      nav: (node.getAttribute("properties") || "").split(/\s+/).includes("nav")
    }]));
    const metadata = elements(opf, "metadata")[0];
    const field = name => unpack(metadata && elements(metadata, name)[0]);
    const toc = new Map();
    const addEntry = (base, href, label) => {
      const target = resolvePath(base, href);
      if (!target || !label) return;
      if (!toc.has(target.path)) toc.set(target.path, new Map());
      const labels = toc.get(target.path);
      if (!labels.has(target.anchor)) labels.set(target.anchor, label);
    };
    const spine = elements(opf, "spine")[0];
    const nav = Array.from(manifest.values()).find(item => item.nav)?.location;
    const ncx = manifest.get(spine?.getAttribute("toc"))?.location;
    if (nav && zip.file(nav.path)) {
      const doc = inertBody(await read(nav.path));
      const navigation = Array.from(doc.querySelectorAll("nav")).find(node =>
        node.getAttribute("role") === "doc-toc" || (node.getAttribute("epub:type") || "").split(/\s+/).includes("toc"));
      navigation?.querySelectorAll("a[href]").forEach(link => addEntry(nav.path, link.getAttribute("href"), unpack(link)));
    } else if (ncx && zip.file(ncx.path)) {
      const doc = readXml(await read(ncx.path), "ncx");
      elements(doc, "navPoint").forEach(point => {
        const children = Array.from(point.children);
        addEntry(ncx.path, children.find(node => node.localName === "content")?.getAttribute("src"),
          unpack(children.find(node => node.localName === "navLabel")));
      });
    }
    const sections = [];
    const seen = new Set();
    for (const node of elements(opf, "itemref")) {
      const item = manifest.get(node.getAttribute("idref"));
      if (node.getAttribute("linear") === "no" || item?.nav || !item?.location || !/^(application\/xhtml\+xml|text\/html)$/.test(item.media)) continue;
      const path = item.location.path;
      if (seen.has(path)) continue;
      seen.add(path);
      extractSections(inertBody(await read(path)), toc.get(path) || new Map(), sections);
    }
    return { sections, title: field("title"), language: field("language"), rights: field("rights"), description: field("description") };
  }

  async function parseMobi(file) {
    const { MOBI, isMOBI } = await import("./ebook-mobi.js");
    if (file.size < 86 || !await isMOBI(file)) throw Error("Este arquivo não é um MOBI válido.");
    const mobi = new MOBI({});
    const book = await mobi.open(file);
    if (book.sections.length > 6000) throw Error("O MOBI contém seções demais.");
    const toc = new Map();
    const collect = (items, depth) => {
      if (depth > 64) return;
      for (const item of items || []) {
        if (item.href && item.label && !book.isExternal(item.href)) {
          const [index, anchor] = book.splitTOCHref(item.href);
          if (index >= 0 && !toc.has(index)) toc.set(index, new Map());
          if (toc.has(index)) toc.get(index).set(anchor || "", item.label);
        }
        collect(item.subitems, depth + 1);
      }
    };
    collect(book.toc, 0);
    const sections = [];
    for (const [index, section] of book.sections.entries()) {
      if (section.linear === "no") continue;
      const doc = await section.createDocument();
      const labels = new Map();
      for (const [target, label] of toc.get(index) || []) {
        if (typeof target === "string") labels.set(target, label);
        else {
          const node = book.getTOCFragment(doc, target);
          if (node && node !== doc.body) {
            const id = "toc-" + labels.size;
            node.setAttribute("data-pb-toc-anchor", id);
            labels.set(id, label);
          } else if (!labels.has("")) labels.set("", label);
        }
      }
      extractSections(doc.body || doc, labels, sections);
    }
    return { ...book.metadata, sections };
  }

  async function parse(file) {
    const format = file.name.toLowerCase().endsWith(".epub") ? "EPUB" : "MOBI";
    if (file.size > limit) throw Error("O arquivo " + format + " ultrapassa 32 MB.");
    const ebook = await (format === "EPUB" ? parseEpub(file) : parseMobi(file));
    if (!ebook.sections.length) throw Error("Não encontrei texto legível neste " + format + ".");
    const length = ebook.sections.reduce((total, section) => total + section.blocks.reduce((sum, block) => sum + block.text.length, 0), 0);
    if (length > limit) throw Error("O texto do livro ultrapassa o limite de importação.");
    return { ...ebook, format };
  }

  function commentaryRows(sections, parseReference) {
    const rows = [];
    for (const section of sections) {
      let ref = parseReference(section.title), lines = [];
      const flush = () => {
        if (ref && lines.length) {
          const text = lines.join("\n\n");
          for (let offset = 0; offset < text.length; offset += 18000) {
            rows.push({ book: ref.book, chapter: ref.chapter, verse: ref.verse || 1,
              chapter_to: ref.endChapter || ref.chapter,
              verse_to: ref.endChapter > ref.chapter ? ref.endRangeVerse : ref.endVerse || 176, text: text.slice(offset, offset + 18000) });
          }
        }
        lines = [];
      };
      for (const block of section.blocks) {
        if (block.heading) {
          const headingRef = parseReference(block.text);
          if (headingRef) { flush(); ref = headingRef; }
          else if (ref && block.text !== section.title) lines.push(block.text);
        } else if (ref) lines.push(block.text);
      }
      flush();
    }
    return rows;
  }

  global.PBEbookModules = { parse, commentaryRows };
})(window);
