// Students document download grid
// This script is intended to be loaded only by `pdf.html`.

const DEFAULT_MANIFEST = [
  {
    name: "de-minh-hoa-danh-gia-nang-luc-mon-toan-nam-2025-truong-dhsp-tp-ho-chi-minh (1).pdf",
    type: "pdf",
    sizeBytes: 1317822,
    lastModifiedMs: 1774942088942
  },
  {
    name: "de-thi-thu-thpt-qg-mon-toan-nam-2026-cum-truong-thpt-hai-phong.pdf",
    type: "pdf",
    sizeBytes: 1669411,
    lastModifiedMs: 1774942059812
  },
  {
    name: "de-thi-thu-tot-nghiep-thpt-nam-2026-mon-toan-so-gddt-ha-tinh.pdf",
    type: "pdf",
    sizeBytes: 1946960,
    lastModifiedMs: 1774942023725
  },
  {
    name: "Monday1.1.docx",
    type: "docx",
    sizeBytes: 160714,
    lastModifiedMs: 1774942092194
  },
  {
    name: "Monday1.2.pdf",
    type: "pdf",
    sizeBytes: 2862819,
    lastModifiedMs: 1774942094076
  },
  {
    name: "Monday1.3-output-output.pdf",
    type: "pdf",
    sizeBytes: 80706,
    lastModifiedMs: 1774942094651
  },
  {
    name: "Tuesday1.1.docx",
    type: "docx",
    sizeBytes: 118892,
    lastModifiedMs: 1774942095956
  },
  {
    name: "Tuesday1.2.docx",
    type: "docx",
    sizeBytes: 614688,
    lastModifiedMs: 1774942098550
  },
  {
    name: "Tuesday1.3.docx",
    type: "docx",
    sizeBytes: 309059,
    lastModifiedMs: 1774942097680
  }
];

function safeParseJsonDate(v) {
  // PowerShell `ConvertTo-Json` usually outputs: "/Date(1774942088942)/"
  if (typeof v === 'number') return v;
  const m = /\/Date\((\d+)\)\//.exec(String(v));
  return m ? Number(m[1]) : 0;
}

function detectFileType(name) {
  const lower = String(name).toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.docx')) return 'docx';
  return 'unknown';
}

function formatBytes(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let i = -1;
  let val = b;
  do {
    val /= 1024;
    i++;
  } while (val >= 1024 && i < units.length - 1);
  const fixed = val >= 10 ? 1 : 2;
  return `${val.toFixed(fixed)} ${units[i]}`;
}

function formatDate(ms) {
  const d = new Date(Number(ms) || 0);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function buildDownloadUrl(fileName) {
  // Ensure proper URL encoding for spaces/parentheses.
  return `./documents/${encodeURIComponent(fileName)}`;
}

function renderDocumentsGrid(documents, state) {
  const grid = document.getElementById('documents-grid');
  const emptyEl = document.getElementById('doc-empty');
  const countEl = document.getElementById('doc-count');

  if (!grid) return;

  if (countEl) countEl.textContent = documents.length;
  grid.innerHTML = '';

  if (!documents.length) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    lucide.createIcons();
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  const fragment = document.createDocumentFragment();
  documents.forEach((doc) => {
    const fileType = doc.type || detectFileType(doc.name);

    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl border border-slate-mid p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow';

    const iconName = fileType === 'pdf' ? 'file-text' : 'file';
    const typeLabel = fileType.toUpperCase();
    const typeColor =
      fileType === 'pdf'
        ? { bg: 'rgba(165,28,48,0.08)', fg: '#A51C30' }
        : { bg: 'rgba(0,0,0,0.04)', fg: '#1a1a1a' };

    const downloadUrl = buildDownloadUrl(doc.name);

    card.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style="background:${typeColor.bg}">
              <i data-lucide="${iconName}" class="w-5 h-5" style="color:${typeColor.fg}"></i>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full" style="background:${typeColor.bg}; color:${typeColor.fg};">${typeLabel}</span>
          </div>
          <p class="text-sm font-semibold text-[#1a1a1a] truncate" title="${doc.name}">${doc.name}</p>
          <div class="mt-2 text-xs text-[#666] space-y-1">
            <div><span class="opacity-70">Dung lượng:</span> ${formatBytes(doc.sizeBytes)}</div>
            <div><span class="opacity-70">Cập nhật:</span> ${formatDate(doc.lastModifiedMs)}</div>
          </div>
        </div>
      </div>
      <div class="mt-4 flex gap-3">
        <a href="${downloadUrl}" download="${doc.name}"
           class="inline-flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-xl text-white font-semibold text-sm transition-all hover:shadow-lg hover:scale-[1.01]"
           style="background:#A51C30; text-decoration:none;">
          <i data-lucide="download" class="w-4 h-4"></i> Tải về
        </a>
      </div>
    `;

    fragment.appendChild(card);
  });

  grid.appendChild(fragment);
  lucide.createIcons();
}

async function loadDocumentsManifest() {
  // Prefer fetching manifest so it can be updated without changing JS.
  try {
    const res = await fetch(`./documents/manifest.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('manifest fetch failed');
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error('manifest invalid');

    return json.map((f) => {
      const type = f.type || detectFileType(f.name);
      return {
        name: f.name,
        type,
        sizeBytes: f.sizeBytes ?? f.Length ?? f.length ?? 0,
        lastModifiedMs: f.lastModifiedMs ?? safeParseJsonDate(f.lastModifiedMs ?? f.LastWriteTime ?? f.lastWriteTime)
      };
    });
  } catch {
    // Fallback to embedded manifest.
    return DEFAULT_MANIFEST;
  }
}

function applyFilterAndSort(documents, state) {
  const q = String(state.query || '').trim().toLowerCase();
  const type = state.typeFilter;

  let filtered = documents.slice();

  if (q) {
    filtered = filtered.filter((d) => String(d.name).toLowerCase().includes(q));
  }

  if (type !== 'all') {
    filtered = filtered.filter((d) => d.type === type);
  }

  const sort = state.sort;
  filtered.sort((a, b) => {
    if (sort === 'name_asc') return a.name.localeCompare(b.name, 'vi');
    if (sort === 'name_desc') return b.name.localeCompare(a.name, 'vi');
    if (sort === 'newest') return (b.lastModifiedMs || 0) - (a.lastModifiedMs || 0);
    if (sort === 'oldest') return (a.lastModifiedMs || 0) - (b.lastModifiedMs || 0);
    return 0;
  });

  return filtered;
}

function initDocumentsGrid() {
  const gridEl = document.getElementById('documents-grid');
  if (!gridEl) return; // Ensure this script stays scoped to pdf.html only.

  const searchEl = document.getElementById('doc-search');
  const typeEl = document.getElementById('doc-type');
  const sortEl = document.getElementById('doc-sort');
  const clearBtn = document.getElementById('doc-clear');

  const state = {
    query: '',
    typeFilter: typeEl ? typeEl.value : 'all',
    sort: sortEl ? sortEl.value : 'name_asc',
    all: []
  };

  function syncStateFromUi() {
    state.query = searchEl ? searchEl.value : '';
    state.typeFilter = typeEl ? typeEl.value : 'all';
    state.sort = sortEl ? sortEl.value : 'name_asc';
  }

  function rerender() {
    const docs = applyFilterAndSort(state.all, state);
    renderDocumentsGrid(docs, state);
  }

  (async () => {
    const manifest = await loadDocumentsManifest();
    state.all = manifest.map((f) => ({
      name: f.name,
      type: f.type || detectFileType(f.name),
      sizeBytes: f.sizeBytes ?? f.size ?? f.sizeBytes ?? 0,
      lastModifiedMs: f.lastModifiedMs ?? f.lastModified ?? 0
    }));
    // Initialize UI defaults & render
    syncStateFromUi();
    rerender();

    let lastSignature = JSON.stringify(
      state.all.map((d) => `${d.name}|${d.type}|${d.sizeBytes}|${d.lastModifiedMs}`)
    );

    // Poll manifest periodically so newly added files appear automatically.
    // (Manifest changes happen via the PowerShell watcher.)
    setInterval(async () => {
      const nextManifest = await loadDocumentsManifest();
      const nextAll = nextManifest.map((f) => ({
        name: f.name,
        type: f.type || detectFileType(f.name),
        sizeBytes: f.sizeBytes ?? f.size ?? f.sizeBytes ?? 0,
        lastModifiedMs: f.lastModifiedMs ?? f.lastModified ?? 0
      }));

      const nextSignature = JSON.stringify(
        nextAll.map((d) => `${d.name}|${d.type}|${d.sizeBytes}|${d.lastModifiedMs}`)
      );

      if (nextSignature !== lastSignature) {
        lastSignature = nextSignature;
        state.all = nextAll;
        rerender();
      }
    }, 10000);
  })();

  if (searchEl) searchEl.addEventListener('input', () => { syncStateFromUi(); rerender(); });
  if (typeEl) typeEl.addEventListener('change', () => { syncStateFromUi(); rerender(); });
  if (sortEl) sortEl.addEventListener('change', () => { syncStateFromUi(); rerender(); });
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchEl) searchEl.value = '';
      if (typeEl) typeEl.value = 'all';
      if (sortEl) sortEl.value = 'name_asc';
      syncStateFromUi();
      rerender();
    });
  }
}

document.addEventListener('DOMContentLoaded', initDocumentsGrid);

