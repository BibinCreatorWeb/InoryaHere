// Konfigurasi Supabase
const SUPA_URL = 'https://ihykejeacueeitthgkze.supabase.co';
const SUPA_KEY = 'sb_publishable_W7N9zRqZlirQdLQvURiexA_Mj8Nvx5C';

// Inisialisasi Supabase client
const { createClient } = supabase;
const db = createClient(SUPA_URL, SUPA_KEY);

// Palet warna untuk badge kategori
const PALETTE = [
    { bg: 'rgba(108,99,255,0.12)', color: '#6c63ff' },
    { bg: 'rgba(255,101,132,0.12)', color: '#ff6584' },
    { bg: 'rgba(67,233,123,0.12)', color: '#2ec265' },
    { bg: 'rgba(255,184,0,0.12)', color: '#e0a800' },
    { bg: 'rgba(0,196,255,0.12)', color: '#00b8e0' },
    { bg: 'rgba(220,80,255,0.12)', color: '#c040e8' },
];

// State global
let cats = [];
let prompts = [];
let activeCat = 'all';
let query = '';
let sort = 'newest';
let curPrompt = null;

// ==================== HELPER FUNCTIONS ====================
function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
}

function toggleTheme() {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pv-theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (theme === 'light') {
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
    } else {
        icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    }
}

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast() {
    const t = document.getElementById('toast');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

function showErr() {
    document.getElementById('grid').innerHTML = '<div class="empty"><div class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><p>Gagal konek ke database.<br>Pastiin config Supabase sudah benar.</p></div>';
}

// ==================== RENDER FUNCTIONS ====================
function renderCats() {
    const el = document.getElementById('catList');
    let html = `<button class="cat-item ${activeCat === 'all' ? 'active' : ''}" onclick="setCat('all')">
        <span class="cat-item-left">
            <svg class="icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span class="cat-item-name">Semua</span>
        </span>
        <span class="cat-count">${prompts.length}</span>
    </button>`;

    cats.forEach(c => {
        const n = prompts.filter(p => p.category_ids.includes(c.id)).length;
        html += `<button class="cat-item ${activeCat === c.id ? 'active' : ''}" onclick="setCat('${c.id}')">
            <span class="cat-item-left">
                <svg class="icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                <span class="cat-item-name">${esc(c.name)}</span>
            </span>
            <span class="cat-count">${n}</span>
        </button>`;
    });
    el.innerHTML = html;
}

function renderGrid() {
    let data = [...prompts];
    
    // Filter by category
    if (activeCat !== 'all') {
        data = data.filter(p => p.category_ids.includes(activeCat));
    }
    
    // Filter by search query
    if (query) {
        const q = query.toLowerCase();
        data = data.filter(p => 
            p.title.toLowerCase().includes(q) || 
            p.content.toLowerCase().includes(q) || 
            (p.description || '').toLowerCase().includes(q)
        );
    }
    
    // Sort data
    if (sort === 'oldest') {
        data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sort === 'az') {
        data.sort((a, b) => a.title.localeCompare(b.title));
    } else {
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Update header labels
    const lbl = activeCat === 'all' ? 'Semua Prompt' : (cats.find(c => c.id === activeCat)?.name || '');
    document.getElementById('activeLabel').textContent = lbl;
    document.getElementById('countLabel').textContent = `(${data.length})`;

    const grid = document.getElementById('grid');
    
    // Handle empty state
    if (!data.length) {
        grid.innerHTML = `<div class="empty"><div class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><p>Belum ada prompt di sini.<br>Tambahkan lewat admin panel.</p></div>`;
        return;
    }

    // Render cards
    grid.innerHTML = data.map((p, i) => {
        const catNames = p.categories.map(c => c.name).join(', ');
        const catEmojis = p.categories.map(c => c.emoji).filter(Boolean).join(' ');
        const ci = cats.findIndex(c => c.id === (p.categories[0]?.id || ''));
        const col = PALETTE[(ci >= 0 ? ci : i) % PALETTE.length];
        const date = new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        
        return `<div class="card" onclick="openModal('${p.id}')">
            <div class="card-cat-badge" style="background:${col.bg};color:${col.color}">
                <svg class="icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                ${catEmojis} ${esc(catNames)}
            </div>
            <div class="card-title">${esc(p.title)}</div>
            ${p.description ? `<div class="card-description">📝 ${esc(p.description)}</div>` : ''}
            <div class="card-preview">${esc(p.content)}</div>
            <div class="card-footer">
                <button class="copy-btn" onclick="event.stopPropagation();quickCopy('${p.id}',this)">
                    <svg class="icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    Copy
                </button>
                <span class="card-date">${date}</span>
            </div>
        </div>`;
    }).join('');
}

// ==================== CATEGORY & MODAL FUNCTIONS ====================
function setCat(id) {
    activeCat = id;
    renderCats();
    renderGrid();
}

function openModal(id) {
    const p = prompts.find(x => x.id === id);
    if (!p) return;
    curPrompt = p;
    
    const catNames = p.categories.map(c => c.name).join(', ');
    const catEmojis = p.categories.map(c => c.emoji).filter(Boolean).join(' ');
    const ci = cats.findIndex(c => c.id === (p.categories[0]?.id || ''));
    const col = PALETTE[(ci >= 0 ? ci : 0) % PALETTE.length];
    
    const badge = document.getElementById('mBadge');
    badge.style.cssText = `background:${col.bg};color:${col.color}`;
    badge.textContent = `${catEmojis} ${catNames}`;
    
    document.getElementById('mTitle').textContent = p.title;
    document.getElementById('mDescription').textContent = p.description || '';
    document.getElementById('mBody').textContent = p.content;
    
    const btn = document.getElementById('mCopyBtn');
    btn.className = 'modal-copy';
    btn.innerHTML = '<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy Prompt';
    
    document.getElementById('overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('overlay').classList.remove('open');
    document.body.style.overflow = '';
}

function copyModal() {
    if (!curPrompt) return;
    navigator.clipboard.writeText(curPrompt.content);
    
    const btn = document.getElementById('mCopyBtn');
    btn.className = 'modal-copy ok';
    btn.innerHTML = '<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Tersalin!';
    
    showToast();
    setTimeout(() => {
        btn.className = 'modal-copy';
        btn.innerHTML = '<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy Prompt';
    }, 2200);
}

function quickCopy(id, btn) {
    const p = prompts.find(x => x.id === id);
    if (!p) return;
    
    navigator.clipboard.writeText(p.content);
    btn.className = 'copy-btn ok';
    btn.innerHTML = '<svg class="icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
    
    showToast();
    setTimeout(() => {
        btn.className = 'copy-btn';
        btn.innerHTML = '<svg class="icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy';
    }, 2200);
}

// ==================== INITIALIZATION ====================
async function init() {
    const [{ data: c, error: ce }, { data: p, error: pe }, { data: pc }] = await Promise.all([
        db.from('categories').select('*').order('name'),
        db.from('prompts').select('*').order('created_at', { ascending: false }),
        db.from('prompt_categories').select('*')
    ]);
    
    if (ce || pe) {
        showErr();
        return;
    }
    
    cats = c || [];
    prompts = (p || []).map(prompt => {
        prompt.category_ids = (pc || [])
            .filter(x => x.prompt_id === prompt.id)
            .map(x => x.category_id);
        prompt.categories = cats.filter(c => prompt.category_ids.includes(c.id));
        return prompt;
    });
    
    document.getElementById('statP').textContent = prompts.length;
    document.getElementById('statC').textContent = cats.length;
    
    renderCats();
    renderGrid();
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
    // Theme initialization
    const savedTheme = localStorage.getItem('pv-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    // Theme button
    document.getElementById('themeBtn').addEventListener('click', toggleTheme);
    
    // Search input
    document.getElementById('searchInput').addEventListener('input', e => {
        query = e.target.value;
        renderGrid();
    });
    
    // Sort select
    document.getElementById('sortSel').addEventListener('change', e => {
        sort = e.target.value;
        renderGrid();
    });
    
    // Modal overlay click
    document.getElementById('overlay').addEventListener('click', e => {
        if (e.target.id === 'overlay') closeModal();
    });
    
    // Escape key
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });
    
    // Start the app
    init();
});

// Expose functions to global scope for onclick handlers
window.setCat = setCat;
window.openModal = openModal;
window.closeModal = closeModal;
window.copyModal = copyModal;
window.quickCopy = quickCopy;
window.toggleTheme = toggleTheme;
