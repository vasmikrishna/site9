/**
 * Editor script + CSS injected into the builder iframe.
 * Handles: click-to-select any element, hover highlights, delete,
 * inline "+" insert dividers between sections, change syncing (for
 * undo/redo + publish), and postMessage communication with the parent.
 */

export const EDITOR_OVERLAY_CSS = `
* { cursor: pointer !important; }
*:hover { outline: 1px dashed rgba(43,107,255,0.3); outline-offset: 2px; }
.s9-selected { outline: 2px solid #2B6BFF !important; outline-offset: 3px; position: relative; }
.s9-selected::after {
  content: attr(data-s9-tag);
  position: absolute; top: -20px; left: 0;
  background: #2B6BFF; color: #fff; font-size: 10px; padding: 1px 6px;
  border-radius: 3px; font-family: system-ui; pointer-events: none; z-index: 99999;
  white-space: nowrap;
}
/* Inline insert dividers between sections — a hoverable strip whose negative
   margins keep it from visually pushing sections apart. */
[data-s9-divider] {
  position: relative; height: 26px; margin: -13px 0; z-index: 9998;
  display: flex; align-items: center; justify-content: center;
  outline: none !important;
}
[data-s9-divider]:hover, [data-s9-divider] * { outline: none !important; }
.s9-divider-line {
  position: absolute; left: 5%; right: 5%; top: 50%; height: 2px;
  background: rgba(43,107,255,0.4); border-radius: 2px; opacity: 0;
  transition: opacity 0.15s ease;
}
[data-s9-divider]:hover .s9-divider-line { opacity: 1; }
.s9-add-btn {
  position: relative; display: inline-flex; align-items: center; gap: 6px;
  background: #2B6BFF; color: #fff; font-family: system-ui, sans-serif;
  font-size: 12px; font-weight: 600; border: none; border-radius: 9999px;
  padding: 6px 14px; box-shadow: 0 4px 12px rgba(43,107,255,0.4);
  cursor: pointer !important; z-index: 9999; line-height: 1; opacity: 0;
  transition: opacity 0.15s ease;
}
[data-s9-divider]:hover .s9-add-btn { opacity: 1; }
.s9-add-btn:hover { background: #1f5ae6; }
`

export const EDITOR_SCRIPT = `
(function() {
  var selected = null;
  var editCounter = 0;
  var SECTION_TAGS = ['section','header','footer','nav','div','article','aside','main'];

  function clearSelection() {
    if (selected) {
      selected.classList.remove('s9-selected');
      selected.removeAttribute('data-s9-tag');
    }
    selected = null;
  }

  function getType(el) {
    var explicit = el.getAttribute('data-s9-type');
    if (explicit) return explicit;
    var tag = el.tagName.toLowerCase();
    if (tag === 'img') return 'image';
    if (tag === 'a') return 'link';
    if (SECTION_TAGS.indexOf(tag) !== -1) return 'section';
    return 'text';
  }

  function tagLabel(el) {
    var tag = el.tagName.toLowerCase();
    var cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.split(' ')[0].replace('s9-selected','').trim() : '';
    if (cls === '.') cls = '';
    var id = el.id ? '#' + el.id : '';
    return tag + id + cls;
  }

  // -- Insert dividers (the "+" between sections) ---------------------------
  function clearDividers() {
    var ds = document.querySelectorAll('[data-s9-divider]');
    for (var i = 0; i < ds.length; i++) ds[i].parentNode && ds[i].parentNode.removeChild(ds[i]);
  }

  function makeDivider(afterKey) {
    var wrap = document.createElement('div');
    wrap.setAttribute('data-s9-divider', afterKey);
    wrap.setAttribute('contenteditable', 'false');
    var line = document.createElement('div');
    line.className = 's9-divider-line';
    var btn = document.createElement('button');
    btn.className = 's9-add-btn';
    btn.setAttribute('data-s9-add', afterKey);
    btn.type = 'button';
    btn.innerHTML = '<span style="font-size:15px;line-height:0;">+</span> Add section';
    wrap.appendChild(line);
    wrap.appendChild(btn);
    return wrap;
  }

  function addDividers() {
    clearDividers();
    var body = document.body;
    var children = Array.prototype.slice.call(body.children);
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      if (el.id === 's9-script') continue;
      if (el.hasAttribute && el.hasAttribute('data-s9-divider')) continue;
      var tag = el.tagName.toLowerCase();
      if (SECTION_TAGS.indexOf(tag) === -1) continue;
      if (!el.getAttribute('data-s9-edit')) {
        el.setAttribute('data-s9-edit', 's9-auto-' + (++editCounter));
      }
      var divider = makeDivider(el.getAttribute('data-s9-edit'));
      body.insertBefore(divider, el.nextSibling);
    }
  }

  // -- Clean HTML extraction (for undo/redo snapshots + publish) -------------
  function getCleanHtml() {
    var clone = document.documentElement.cloneNode(true);
    var script = clone.querySelector('#s9-script'); if (script) script.parentNode.removeChild(script);
    var overlay = clone.querySelector('#s9-overlay'); if (overlay) overlay.parentNode.removeChild(overlay);
    var divs = clone.querySelectorAll('[data-s9-divider]');
    for (var i = 0; i < divs.length; i++) divs[i].parentNode.removeChild(divs[i]);
    var sel = clone.querySelectorAll('.s9-selected');
    for (var j = 0; j < sel.length; j++) sel[j].classList.remove('s9-selected');
    var tagged = clone.querySelectorAll('[data-s9-tag]');
    for (var k = 0; k < tagged.length; k++) tagged[k].removeAttribute('data-s9-tag');
    return '<!doctype html>' + clone.outerHTML;
  }

  function emitChange() {
    window.parent.postMessage({ type: 's9:changed', html: getCleanHtml() }, '*');
  }

  document.addEventListener('click', function(e) {
    // Inline "+" add-section button takes priority.
    var addBtn = e.target.closest ? e.target.closest('[data-s9-add]') : null;
    if (addBtn) {
      e.preventDefault(); e.stopPropagation();
      window.parent.postMessage({ type: 's9:insertRequest', afterEditKey: addBtn.getAttribute('data-s9-add') }, '*');
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    var el = e.target;
    if (el === document.documentElement || el === document.body) {
      clearSelection();
      window.parent.postMessage({ type: 's9:deselect' }, '*');
      return;
    }
    if (el.closest && el.closest('[data-s9-divider]')) return;

    if (!el.getAttribute('data-s9-edit')) {
      el.setAttribute('data-s9-edit', 's9-auto-' + (++editCounter));
    }

    clearSelection();
    el.setAttribute('data-s9-tag', tagLabel(el));
    el.classList.add('s9-selected');
    selected = el;

    var s9Type = getType(el);
    var content = s9Type === 'image' ? (el.getAttribute('src') || '') : el.innerHTML;
    var href = '';
    if (el.tagName.toLowerCase() === 'a') href = el.getAttribute('href') || '';
    else { var p = el.closest('a'); if (p) href = p.getAttribute('href') || ''; }

    var rect = el.getBoundingClientRect();
    var cs = window.getComputedStyle(el);
    function px(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
    var box = {
      pt: px(cs.paddingTop), pr: px(cs.paddingRight), pb: px(cs.paddingBottom), pl: px(cs.paddingLeft),
      mt: px(cs.marginTop), mr: px(cs.marginRight), mb: px(cs.marginBottom), ml: px(cs.marginLeft),
      ta: cs.textAlign || 'left'
    };

    window.parent.postMessage({
      type: 's9:select',
      editKey: el.getAttribute('data-s9-edit'),
      content: content,
      tagName: el.tagName.toLowerCase(),
      s9Type: s9Type,
      href: href,
      rect: { width: Math.round(rect.width), height: Math.round(rect.height) },
      box: box,
    }, '*');
  }, true);

  window.addEventListener('message', function(e) {
    var d = e.data;
    if (!d || !d.type) return;

    if (d.type === 's9:update' && d.editKey) {
      var t = document.querySelector('[data-s9-edit="' + d.editKey + '"]');
      if (t) { t.innerHTML = d.content; emitChange(); }
    }

    if (d.type === 's9:updateAttr' && d.editKey) {
      var a = document.querySelector('[data-s9-edit="' + d.editKey + '"]');
      if (a) { a.setAttribute(d.attr, d.value); emitChange(); }
    }

    if (d.type === 's9:setStyle' && d.editKey && d.prop) {
      var st = document.querySelector('[data-s9-edit="' + d.editKey + '"]');
      if (st) {
        if (d.value === '' || d.value == null) st.style.removeProperty(d.prop);
        else st.style.setProperty(d.prop, d.value);
        emitChange();
      }
    }

    if (d.type === 's9:delete' && d.editKey) {
      clearDividers();
      var del = document.querySelector('[data-s9-edit="' + d.editKey + '"]');
      if (del) { del.remove(); selected = null; }
      window.parent.postMessage({ type: 's9:deleted', editKey: d.editKey }, '*');
      emitChange();
      addDividers();
    }

    if (d.type === 's9:deselect') { clearSelection(); }

    if (d.type === 's9:getHtml') {
      clearSelection();
      setTimeout(function() {
        window.parent.postMessage({ type: 's9:html', html: getCleanHtml() }, '*');
      }, 30);
    }

    if (d.type === 's9:insertSection' && d.html) {
      clearDividers();
      var temp = document.createElement('div');
      temp.innerHTML = d.html;
      var section = temp.firstElementChild || temp;
      var anchor = d.afterEditKey ? document.querySelector('[data-s9-edit="' + d.afterEditKey + '"]') : null;
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(section, anchor.nextSibling);
      } else if (selected && selected.getAttribute('data-s9-type') === 'section') {
        selected.parentNode.insertBefore(section, selected.nextSibling);
      } else {
        document.body.appendChild(section);
      }
      clearSelection();
      window.parent.postMessage({ type: 's9:sectionInserted' }, '*');
      emitChange();
      addDividers();
      section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (d.type === 's9:addCss' && d.css) {
      var style = document.createElement('style');
      style.textContent = d.css;
      document.head.appendChild(style);
    }

    if (d.type === 's9:moveSection' && d.editKey && d.direction) {
      clearDividers();
      var sec = document.querySelector('[data-s9-edit="' + d.editKey + '"]');
      if (sec) {
        if (d.direction === 'up' && sec.previousElementSibling) {
          sec.parentNode.insertBefore(sec, sec.previousElementSibling);
        } else if (d.direction === 'down' && sec.nextElementSibling) {
          sec.parentNode.insertBefore(sec.nextElementSibling, sec);
        }
      }
      emitChange();
      addDividers();
    }
  });

  // Initial setup
  addDividers();
  window.parent.postMessage({ type: 's9:ready' }, '*');
})();
`

export function buildEditorSrcDoc(html: string, css: string): string {
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${css}</style>
<style id="s9-overlay">${EDITOR_OVERLAY_CSS}</style>
</head><body>
${html}
<script id="s9-script">${EDITOR_SCRIPT}<` + `/script>
</body></html>`
}
