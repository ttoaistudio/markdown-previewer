const dropZone = document.getElementById('dropZone');
const fileListEl = document.getElementById('fileList');
const previewFrame = document.getElementById('previewFrame');
const folderInput = document.getElementById('folderInput');
const fileInput = document.getElementById('fileInput');
const fileFab = document.getElementById('fileFab');
const searchInput = document.getElementById('searchInput');
const themeSelect = document.getElementById('themeSelect');
const themeDialog = document.getElementById('themeDialog');
const themeJson = document.getElementById('themeJson');
const themeEditorBtn = document.getElementById('themeEditorBtn');
const applyThemeBtn = document.getElementById('applyThemeBtn');
const exportHtmlBtn = document.getElementById('exportHtmlBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const zoomOut = document.getElementById('zoomOut');
const zoomIn = document.getElementById('zoomIn');
const zoomRange = document.getElementById('zoomRange');
const zoomLabel = document.getElementById('zoomLabel');
const drawer = document.getElementById('drawer');
const drawerToggle = document.getElementById('drawerToggle');
const drawerClose = document.getElementById('drawerClose');
const exportBtn = document.getElementById('exportBtn');

const files = [];
let currentTheme = 'github';

const themes = {
  'github': {
    '--bg': '#ffffff', '--fg': '#24292f', '--muted': '#57606a', '--border': '#d0d7de', '--accent': '#0969da',
    '--code-bg': '#f6f8fa', '--sidebar-bg': '#f6f8fa', '--sidebar-fg': '#24292f', '--link': '#0969da',
    '--blockquote': '#6e7781', '--table-border': '#d0d7de', '--preview-bg': '#ffffff', '--topbar-bg': '#ffffff'
  },
  'github-dark': {
    '--bg': '#0d1117', '--fg': '#c9d1d9', '--muted': '#8b949e', '--border': '#30363d', '--accent': '#58a6ff',
    '--code-bg': '#161b22', '--sidebar-bg': '#0d1117', '--sidebar-fg': '#c9d1d9', '--link': '#58a6ff',
    '--blockquote': '#8b949e', '--table-border': '#30363d', '--preview-bg': '#0d1117', '--topbar-bg': '#0d1117'
  },
  'solarized-light': {
    '--bg': '#fdf6e3', '--fg': '#586e75', '--muted': '#657b83', '--border': '#eee8d5', '--accent': '#268bd2',
    '--code-bg': '#eee8d5', '--sidebar-bg': '#fdf6e3', '--sidebar-fg': '#586e75', '--link': '#268bd2',
    '--blockquote': '#93a1a1', '--table-border': '#eee8d5', '--preview-bg': '#fdf6e3', '--topbar-bg': '#fdf6e3'
  },
  'solarized-dark': {
    '--bg': '#002b36', '--fg': '#93a1a1', '--muted': '#839496', '--border': '#073642', '--accent': '#268bd2',
    '--code-bg': '#073642', '--sidebar-bg': '#002b36', '--sidebar-fg': '#93a1a1', '--link': '#268bd2',
    '--blockquote': '#839496', '--table-border': '#073642', '--preview-bg': '#002b36', '--topbar-bg': '#002b36'
  },
  'monokai': {
    '--bg': '#272822', '--fg': '#f8f8f2', '--muted': '#75715e', '--border': '#3e3d32', '--accent': '#a6e22e',
    '--code-bg': '#3e3d32', '--sidebar-bg': '#272822', '--sidebar-fg': '#f8f8f2', '--link': '#66d9ef',
    '--blockquote': '#75715e', '--table-border': '#3e3d32', '--preview-bg': '#272822', '--topbar-bg': '#272822'
  },
  'dracula': {
    '--bg': '#282a36', '--fg': '#f8f8f2', '--muted': '#6272a4', '--border': '#44475a', '--accent': '#bd93f9',
    '--code-bg': '#44475a', '--sidebar-bg': '#282a36', '--sidebar-fg': '#f8f8f2', '--link': '#8be9fd',
    '--blockquote': '#6272a4', '--table-border': '#44475a', '--preview-bg': '#282a36', '--topbar-bg': '#282a36'
  }
};

function applyTheme(name) {
  currentTheme = name;
  const theme = themes[name] || themes['github'];
  Object.entries(theme).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  if (name !== 'custom') themeSelect.value = name;
  saveCustomThemeIfNeeded(name);
}

function saveCustomThemeIfNeeded(name) {
  if (name === 'custom') {
    localStorage.setItem('customTheme', JSON.stringify(themes.custom || {}, null, 2));
  }
}

function loadCustomTheme() {
  const stored = localStorage.getItem('customTheme');
  if (stored) {
    try { themes.custom = JSON.parse(stored); }
    catch { /* ignore */ }
  } else {
    themes.custom = { ...themes.github };
  }
}

function renderFileList() {
  const q = (searchInput.value || '').toLowerCase();
  fileListEl.innerHTML = '';
  files
    .filter(f => f.path.toLowerCase().includes(q))
    .forEach((f, idx) => {
      const li = document.createElement('li');
      li.textContent = f.path;
      li.dataset.index = idx;
      if (f.active) li.classList.add('active');
      li.addEventListener('click', () => openFile(idx));
      fileListEl.appendChild(li);
    });
}

function openFile(idx) {
  files.forEach(f => (f.active = false));
  const f = files[idx];
  if (!f) return;
  f.active = true;
  currentFileEl.textContent = f.path;
  f.file.text().then(text => {
    const html = markdownToHtml(text);
    renderPreview(html);
    renderFileList();
  });
}

function addFiles(fileList) {
  for (const file of fileList) {
    if (!file.name.match(/\.md$|\.markdown$/i)) continue;
    files.push({
      file,
      path: file.webkitRelativePath || file.name,
      active: false
    });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  renderFileList();
  if (files.length && !files.some(f => f.active)) openFile(0);
}

function handleDrop(e) {
  e.preventDefault();
  dropZone.classList.remove('drop-hint');
  const items = e.dataTransfer.items;
  if (!items) return;
  const entries = [];
  for (const item of items) {
    const entry = item.webkitGetAsEntry?.();
    if (entry) entries.push(entry);
  }
  if (entries.length) {
    traverseEntries(entries).then(list => addFiles(list));
  } else {
    addFiles(e.dataTransfer.files);
  }
}

async function traverseEntries(entries) {
  const fileList = [];
  async function traverse(entry, path = '') {
    if (entry.isFile) {
      await new Promise(resolve => {
        entry.file(file => { fileList.push(file); resolve(); });
      });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const readBatch = () => new Promise(resolve => reader.readEntries(resolve));
      let batch = await readBatch();
      while (batch.length) {
        for (const ent of batch) await traverse(ent, path + entry.name + '/');
        batch = await readBatch();
      }
    }
  }
  for (const entry of entries) await traverse(entry);
  return fileList;
}

function markdownToHtml(md) {
  // Minimal offline markdown parser
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // code fences
  html = html.replace(/```([\s\S]*?)```/g, (m, code) => `<pre><code>${code}</code></pre>`);
  // headings
  html = html.replace(/^###### (.*)$/gm, '<h6>$1</h6>')
             .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
             .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
             .replace(/^### (.*)$/gm, '<h3>$1</h3>')
             .replace(/^## (.*)$/gm, '<h2>$1</h2>')
             .replace(/^# (.*)$/gm, '<h1>$1</h1>');
  // blockquote
  html = html.replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');
  // bold/italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
             .replace(/\*(.*?)\*/g, '<em>$1</em>');
  // inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // links
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // images
  html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img alt="$1" src="$2" />');
  // lists
  html = html.replace(/^(\s*)- (.*)$/gm, '$1<li>$2</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  // tables (simple)
  html = html.replace(/^\|(.+)\|$/gm, '<tr><td>$1</td></tr>');
  html = html.replace(/<tr><td>(.+)<\/td><\/tr>/g, (m, row) => {
    const cells = row.split('|').map(c => c.trim());
    return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
  });
  html = html.replace(/(<tr>.*<\/tr>)/gs, '<table>$1</table>');

  // paragraphs
  html = html.split(/\n{2,}/).map(block => {
    if (block.match(/^<h\d|^<ul|^<pre|^<blockquote|^<table/)) return block;
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

async function renderPreview(contentHtml) {
  const cssText = await fetch('styles.css').then(r => r.text()).catch(() => '');
  const root = getComputedStyle(document.documentElement);
  const keys = ['--bg','--fg','--muted','--border','--accent','--code-bg','--sidebar-bg','--sidebar-fg','--link','--blockquote','--table-border','--preview-bg','--topbar-bg'];
  const lines = keys.map(k => `${k}: ${root.getPropertyValue(k)};`).join('');
  const inlineCss = `:root{${lines}}\n${cssText}\n.preview{padding:28px 40px; line-height:1.7;} body{margin:0; overflow:auto; background:var(--preview-bg);} `;

  const scale = parseInt(zoomRange.value, 10) / 100;
  const iframeHtml = `<!doctype html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <style>${inlineCss}</style></head>
    <body>
      <div id="wrap" style="transform:scale(${scale}); transform-origin: top left; width:${100/scale}%;">
        <article class="preview">${contentHtml}</article>
      </div>
    </body></html>`;

  previewFrame.srcdoc = iframeHtml;
  previewFrame.dataset.lastHtml = iframeHtml;
}

async function exportHtml() {
  const html = previewFrame.dataset.lastHtml;
  if (!html) return;
  const blob = new Blob([html], { type: 'text/html' });
  downloadBlob(blob, 'preview.html');
}

function exportPdf() {
  if (previewFrame.contentWindow) {
    previewFrame.contentWindow.focus();
    previewFrame.contentWindow.print();
  }
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Events
folderInput.addEventListener('change', e => addFiles(e.target.files));
fileInput.addEventListener('change', e => addFiles(e.target.files));
fileFab.addEventListener('change', e => addFiles(e.target.files));

exportBtn.addEventListener('click', () => {
  drawer.classList.add('open');
});

drawerToggle.addEventListener('click', () => drawer.classList.add('open'));
drawerClose.addEventListener('click', () => drawer.classList.remove('open'));
searchInput.addEventListener('input', renderFileList);

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drop-hint'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drop-hint'));
dropZone.addEventListener('drop', handleDrop);

exportHtmlBtn.addEventListener('click', exportHtml);
exportPdfBtn.addEventListener('click', exportPdf);

themeSelect.addEventListener('change', e => {
  if (e.target.value === 'custom') {
    themeDialog.showModal();
    themeJson.value = JSON.stringify(themes.custom || themes.github, null, 2);
  } else {
    applyTheme(e.target.value);
  }
});

themeEditorBtn.addEventListener('click', () => {
  themeDialog.showModal();
  themeJson.value = JSON.stringify(themes.custom || themes.github, null, 2);
});

applyThemeBtn.addEventListener('click', () => {
  try {
    themes.custom = JSON.parse(themeJson.value);
    applyTheme('custom');
    themeSelect.value = 'custom';
  } catch (e) {
    alert('JSONの形式が正しくありません');
  }
});

loadCustomTheme();
function setZoom(value) {
  const v = Math.max(50, Math.min(200, value));
  zoomRange.value = v;
  zoomLabel.textContent = `${v}%`;
  const scale = v / 100;
  // update iframe content scale
  const doc = previewFrame.contentDocument;
  if (doc) {
    const wrap = doc.getElementById('wrap');
    if (wrap) {
      wrap.style.transform = `scale(${scale})`;
      wrap.style.width = `${100 / scale}%`;
    }
  }
}

zoomOut.addEventListener('click', () => setZoom(parseInt(zoomRange.value, 10) - 10));
zoomIn.addEventListener('click', () => setZoom(parseInt(zoomRange.value, 10) + 10));
zoomRange.addEventListener('input', e => setZoom(parseInt(e.target.value, 10)));

// prevent iOS pinch-zoom on whole page
['gesturestart','gesturechange','gestureend'].forEach(evt => {
  document.addEventListener(evt, e => e.preventDefault(), { passive: false });
});

// stronger iOS pinch/zoom block: allow scrolling only in sidebar or preview iframe
const previewWrap = document.querySelector('.preview-shell');
document.addEventListener('touchmove', (e) => {
  if (!previewWrap.contains(e.target)) {
    e.preventDefault();
  }
}, { passive: false });

// block double-tap zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

loadCustomTheme();
applyTheme('github');
setZoom(100);
