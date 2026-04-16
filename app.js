// ============================================================
//  FLASHCARDS APP — app.js
// ============================================================

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444',
                '#f59e0b','#10b981','#06b6d4','#3b82f6'];

// ---- State ----
let decks         = [];
let currentDeckId = null;
let studyCards    = [];
let studyIdx      = 0;
let knownCount    = 0;
let unknownCount  = 0;
let isFlipped     = false;
let editDeckId    = null;
let editCardId    = null;
let selColor      = COLORS[0];
let currentView   = 'view-home';

// ---- Boot ----
function init() {
  loadData();
  buildColorGrid();
  bindEvents();
  renderHome();
  registerSW();
}

// ---- Storage ----
function loadData() {
  try { decks = JSON.parse(localStorage.getItem('fc-decks') || '[]'); }
  catch { decks = []; }
}
function save() {
  localStorage.setItem('fc-decks', JSON.stringify(decks));
}

// ---- Utils ----
function uid()      { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function $(id)      { return document.getElementById(id); }
function getDeck(id){ return decks.find(d => d.id === id); }
function esc(str)   {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Navigation ----
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $(id).classList.add('active');
  currentView = id;
}

// ---- HOME ----
function renderHome() {
  const list  = $('home-decks');
  const empty = $('home-empty');

  if (decks.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = decks.map(d => {
    const n = d.cards ? d.cards.length : 0;
    const src = d.source
      ? `<div class="deck-meta-text">📂 ${esc(d.source)}</div>` : '';
    return `
      <button class="deck-card" onclick="openDeck('${d.id}')">
        <div class="deck-dot" style="background:${d.color}"></div>
        <div class="deck-info">
          <div class="deck-name">${esc(d.name)}</div>
          ${src}
        </div>
        <div class="deck-badge">${n} carte${n !== 1 ? 's' : ''}</div>
      </button>`;
  }).join('');
}

// ---- DECK VIEW ----
function openDeck(id) {
  currentDeckId = id;
  const d = getDeck(id);
  if (!d) return;

  $('deck-title').textContent = d.name;
  $('deck-source-label').textContent = d.source ? `📂 ${d.source}` : '';
  $('deck-source-label').style.color = d.color;

  renderDeckCards();
  showView('view-deck');
}

function renderDeckCards() {
  const d     = getDeck(currentDeckId);
  const list  = $('deck-cards');
  const empty = $('deck-empty');

  if (!d || !d.cards || d.cards.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = d.cards.map(c => `
    <div class="card-item">
      <div class="card-texts">
        <div class="card-front-txt">${esc(c.front)}</div>
        <div class="card-back-txt">${esc(c.back)}</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm" onclick="openEditCard('${c.id}')" title="Modifier">✏️</button>
        <button class="btn-sm del" onclick="deleteCard('${c.id}')" title="Supprimer">🗑️</button>
      </div>
    </div>`).join('');
}

// ---- STUDY ----
function startStudy() {
  const d = getDeck(currentDeckId);
  if (!d || !d.cards || d.cards.length === 0) {
    alert('Ajoute des cartes avant d\'étudier !');
    return;
  }
  studyCards   = shuffle(d.cards);
  studyIdx     = 0;
  knownCount   = 0;
  unknownCount = 0;
  isFlipped    = false;

  $('study-deck-name').textContent = d.name;
  showView('view-study');
  renderStudyCard();
}

function renderStudyCard() {
  const card = studyCards[studyIdx];
  if (!card) return;

  // Reset flip
  isFlipped = false;
  $('flip-card').classList.remove('flipped');

  $('study-front').textContent = card.front;
  $('study-back').textContent  = card.back;

  $('study-count').textContent  = `${studyIdx + 1} / ${studyCards.length}`;
  $('study-progress').style.width = `${(studyIdx / studyCards.length) * 100}%`;

  $('btn-unknown').disabled = true;
  $('btn-known').disabled   = true;
}

function flipCard() {
  isFlipped = !isFlipped;
  $('flip-card').classList.toggle('flipped', isFlipped);
  if (isFlipped) {
    $('btn-unknown').disabled = false;
    $('btn-known').disabled   = false;
  }
}

function markCard(known) {
  if (known) knownCount++;
  else unknownCount++;
  studyIdx++;
  if (studyIdx >= studyCards.length) { showResults(); return; }
  renderStudyCard();
}

// ---- RESULTS ----
function showResults() {
  const total = studyCards.length;
  const pct   = Math.round((knownCount / total) * 100);

  let emoji, title, sub;
  if (pct === 100)    { emoji = '🏆'; title = 'Parfait !';  sub = 'Tu maîtrises toutes les cartes !'; }
  else if (pct >= 75) { emoji = '🎉'; title = 'Excellent !'; sub = `${pct} % des cartes maîtrisées.`; }
  else if (pct >= 50) { emoji = '👍'; title = 'Bien joué !'; sub = `${pct} % de réussite, continue !`; }
  else                { emoji = '💪'; title = 'Continue !';  sub = `${pct} % — tu vas y arriver !`; }

  $('res-emoji').textContent   = emoji;
  $('res-title').textContent   = title;
  $('res-sub').textContent     = sub;
  $('res-known').textContent   = knownCount;
  $('res-unknown').textContent = unknownCount;
  showView('view-results');
}

// ---- DECK MODAL ----
function openNewDeck() {
  editDeckId = null;
  $('modal-deck-title').textContent = 'Nouveau jeu';
  $('btn-save-deck').textContent    = 'Créer';
  $('inp-deck-name').value   = '';
  $('inp-deck-source').value = '';
  selColor = COLORS[0];
  refreshColorGrid();
  openModal('modal-deck');
}

function openEditDeck() {
  const d = getDeck(currentDeckId);
  if (!d) return;
  editDeckId = currentDeckId;
  $('modal-deck-title').textContent = 'Modifier le jeu';
  $('btn-save-deck').textContent    = 'Enregistrer';
  $('inp-deck-name').value   = d.name;
  $('inp-deck-source').value = d.source || '';
  selColor = d.color;
  refreshColorGrid();
  closeSheet();
  openModal('modal-deck');
}

function saveDeck() {
  const name = $('inp-deck-name').value.trim();
  if (!name) { $('inp-deck-name').focus(); return; }
  const source = $('inp-deck-source').value.trim();

  if (editDeckId) {
    const d = getDeck(editDeckId);
    if (d) { d.name = name; d.source = source; d.color = selColor; }
    save();
    closeModal('modal-deck');
    openDeck(editDeckId);
  } else {
    const d = { id: uid(), name, source, color: selColor, cards: [], createdAt: Date.now() };
    decks.push(d);
    save();
    closeModal('modal-deck');
    openDeck(d.id);
  }
  renderHome();
}

function confirmDeleteDeck() {
  const d = getDeck(currentDeckId);
  if (!d) return;
  if (!confirm(`Supprimer "${d.name}" et toutes ses cartes ?`)) return;
  decks = decks.filter(x => x.id !== currentDeckId);
  save();
  renderHome();
  showView('view-home');
  closeSheet();
}

// ---- CARD MODAL ----
function openAddCard() {
  editCardId = null;
  $('modal-card-title').textContent = 'Nouvelle carte';
  $('btn-save-card').textContent    = 'Ajouter';
  $('inp-card-front').value = '';
  $('inp-card-back').value  = '';
  openModal('modal-card');
}

function openEditCard(cardId) {
  const d = getDeck(currentDeckId);
  if (!d) return;
  const c = d.cards.find(x => x.id === cardId);
  if (!c) return;
  editCardId = cardId;
  $('modal-card-title').textContent = 'Modifier la carte';
  $('btn-save-card').textContent    = 'Enregistrer';
  $('inp-card-front').value = c.front;
  $('inp-card-back').value  = c.back;
  openModal('modal-card');
}

function saveCard() {
  const front = $('inp-card-front').value.trim();
  const back  = $('inp-card-back').value.trim();
  if (!front) { $('inp-card-front').focus(); return; }
  if (!back)  { $('inp-card-back').focus();  return; }

  const d = getDeck(currentDeckId);
  if (!d) return;

  if (editCardId) {
    const c = d.cards.find(x => x.id === editCardId);
    if (c) { c.front = front; c.back = back; }
  } else {
    d.cards.push({ id: uid(), front, back, createdAt: Date.now() });
  }
  save();
  closeModal('modal-card');
  renderDeckCards();
  renderHome();
}

function deleteCard(cardId) {
  if (!confirm('Supprimer cette carte ?')) return;
  const d = getDeck(currentDeckId);
  if (!d) return;
  d.cards = d.cards.filter(c => c.id !== cardId);
  save();
  renderDeckCards();
  renderHome();
}

// ---- MODAL MANAGEMENT ----
function openModal(id) {
  $('overlay').classList.remove('hidden');
  $(id).classList.remove('hidden');
  setTimeout(() => { const el = $(id).querySelector('input,textarea'); if (el) el.focus(); }, 100);
}
function closeModal(id) {
  $(id).classList.add('hidden');
  $('overlay').classList.add('hidden');
}
function closeAllOverlays() {
  ['modal-deck','modal-card'].forEach(id => $(id).classList.add('hidden'));
  $('overlay').classList.add('hidden');
  closeSheet();
}

// ---- BOTTOM SHEET ----
function openDeckSheet() {
  $('sheet-content').innerHTML = `
    <button class="sheet-item" onclick="openEditDeck()">✏️ &nbsp; Modifier le jeu</button>
    <button class="sheet-item danger" onclick="confirmDeleteDeck()">🗑️ &nbsp; Supprimer le jeu</button>`;
  $('overlay').classList.remove('hidden');
  $('sheet').classList.remove('hidden');
}
function closeSheet() {
  $('sheet').classList.add('hidden');
}

// ---- COLOR GRID ----
function buildColorGrid() {
  $('color-grid').innerHTML = COLORS.map(c =>
    `<div class="color-swatch${c === selColor ? ' active' : ''}"
          data-color="${c}" style="background:${c}"
          onclick="selectColor('${c}',this)"></div>`
  ).join('');
}
function refreshColorGrid() {
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === selColor);
  });
}
function selectColor(color, el) {
  selColor = color;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
}

// ---- EVENTS ----
function bindEvents() {
  // Home
  $('btn-new-deck').addEventListener('click', openNewDeck);
  $('btn-new-deck-empty').addEventListener('click', openNewDeck);

  // Deck view
  $('btn-back-home').addEventListener('click', () => {
    renderHome();
    showView('view-home');
  });
  $('btn-deck-menu').addEventListener('click', openDeckSheet);
  $('btn-add-card').addEventListener('click', openAddCard);
  $('btn-study').addEventListener('click', startStudy);

  // Study
  $('flip-card').addEventListener('click', flipCard);
  $('btn-exit-study').addEventListener('click', () => {
    if (studyIdx === 0 || confirm('Quitter la session en cours ?')) {
      showView('view-deck');
    }
  });
  $('btn-unknown').addEventListener('click', () => markCard(false));
  $('btn-known').addEventListener('click',   () => markCard(true));

  // Results
  $('btn-retry').addEventListener('click', () => {
    showView('view-deck');
    startStudy();
  });
  $('btn-back-results').addEventListener('click', () => showView('view-deck'));

  // Deck modal
  $('btn-close-deck').addEventListener('click',  () => closeModal('modal-deck'));
  $('btn-cancel-deck').addEventListener('click', () => closeModal('modal-deck'));
  $('btn-save-deck').addEventListener('click', saveDeck);
  $('inp-deck-name').addEventListener('keydown', e => { if (e.key === 'Enter') saveDeck(); });

  // Card modal
  $('btn-close-card').addEventListener('click',  () => closeModal('modal-card'));
  $('btn-cancel-card').addEventListener('click', () => closeModal('modal-card'));
  $('btn-save-card').addEventListener('click', saveCard);

  // Overlay
  $('overlay').addEventListener('click', closeAllOverlays);

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeAllOverlays(); }
    if (currentView === 'view-study') {
      if (e.key === ' ')           { e.preventDefault(); flipCard(); }
      if (e.key === 'ArrowRight' && isFlipped) markCard(true);
      if (e.key === 'ArrowLeft'  && isFlipped) markCard(false);
    }
  });
}

// ---- SERVICE WORKER ----
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

// ---- START ----
init();
