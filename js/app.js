/* 토계부 - 스포츠 배팅 가계부
   모든 데이터는 이 브라우저의 localStorage에만 저장됩니다. 서버 전송 없음. */

const STORAGE_KEY = 'tokebu_bets_v1';
const LAST_BACKUP_KEY = 'tokebu_last_backup_v1';
const FAV_TEAMS_KEY = 'tokebu_fav_teams_v1';
const BUDGET_KEY = 'tokebu_budget_v1';
const BACKUP_REMIND_DAYS = 3;
const SPORTS = ['축구', '야구', '농구', '배구', 'e스포츠', '기타', '폴더'];

// ---------- 데이터 계층 ----------
function loadBets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('데이터를 불러오지 못했습니다', e);
    showStorageWarning();
    return [];
  }
}

function saveBets(bets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));
    return true;
  } catch (e) {
    console.error('데이터를 저장하지 못했습니다', e);
    showStorageWarning();
    return false;
  }
}

function showStorageWarning() {
  const el = document.getElementById('storageWarning');
  if (el) el.hidden = false;
}

// ---------- 즐겨찾기 팀 ----------
function loadFavTeams() {
  try {
    const raw = localStorage.getItem(FAV_TEAMS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function saveFavTeams(list) {
  try {
    localStorage.setItem(FAV_TEAMS_KEY, JSON.stringify(list));
  } catch (e) {
    // 저장이 막힌 환경이면 조용히 무시 (storageWarning이 이미 안내함)
  }
}

// ---------- 예산/손실 한도 ----------
function loadBudget() {
  try {
    const raw = localStorage.getItem(BUDGET_KEY);
    return raw ? JSON.parse(raw) : { monthlyStakeLimit: null, monthlyLossLimit: null };
  } catch (e) {
    return { monthlyStakeLimit: null, monthlyLossLimit: null };
  }
}

function saveBudget(b) {
  try {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(b));
  } catch (e) {
    // 저장이 막힌 환경이면 조용히 무시
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 옛 데이터(match 문자열)와 새 데이터(home/away)를 함께 지원
function splitMatch(matchStr) {
  const parts = String(matchStr || '').split(/\s+vs\.?\s+/i);
  if (parts.length === 2) return { home: parts[0].trim(), away: parts[1].trim() };
  return { home: (matchStr || '').trim(), away: '' };
}

function getHomeAway(bet) {
  if (bet.home || bet.away) return { home: bet.home || '', away: bet.away || '' };
  return splitMatch(bet.match);
}

function matchLabel(bet) {
  const { home, away } = getHomeAway(bet);
  return [home, away].filter(Boolean).join(' vs ');
}

// 폴더(콤보) 배팅까지 포함한 표시용 라벨
function betLabel(bet) {
  if (bet.betMode === 'combo' && Array.isArray(bet.legs)) {
    return bet.legs.map(l => [l.home, l.away].filter(Boolean).join(' vs ')).filter(Boolean).join(' / ');
  }
  return matchLabel(bet);
}

function betTypeLabel(bet) {
  if (bet.betMode === 'combo' && Array.isArray(bet.legs)) {
    return `폴더 ${bet.legs.length}경기`;
  }
  return bet.betType || '';
}

// ---------- 백업 알림 ----------
function getLastBackupDate() {
  try {
    const raw = localStorage.getItem(LAST_BACKUP_KEY);
    return raw ? new Date(raw) : null;
  } catch (e) {
    return null;
  }
}

function markBackedUp() {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  } catch (e) {
    // 저장 자체가 막힌 환경이면 알림 갱신은 건너뜀 (storageWarning이 이미 안내함)
  }
  updateBackupStatus();
}

function daysSince(date) {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function updateBackupStatus() {
  const last = getLastBackupDate();
  const reminderCard = document.getElementById('backupReminder');
  const reminderText = document.getElementById('backupReminderText');
  const statusText = document.getElementById('lastBackupStatus');

  const overdue = !last || daysSince(last) >= BACKUP_REMIND_DAYS;
  const shouldRemind = bets.length > 0 && overdue;

  if (reminderCard && reminderText) {
    reminderCard.hidden = !shouldRemind;
    if (shouldRemind) {
      reminderText.textContent = last
        ? `📦 마지막 백업 후 ${daysSince(last)}일이 지났습니다. 기기를 바꾸거나 브라우저 데이터가 지워지면 기록이 사라져요. 지금 백업해 두세요.`
        : '📦 아직 백업한 적이 없어요. 브라우저 데이터가 지워지면 기록이 모두 사라질 수 있으니 지금 백업해 두는 걸 권장합니다.';
    }
  }
  if (statusText) {
    statusText.textContent = last
      ? `마지막 백업: ${last.toLocaleString('ko-KR')} (${daysSince(last)}일 전)`
      : '마지막 백업: 아직 백업한 적이 없습니다.';
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function calcProfit(bet) {
  const stake = Number(bet.stake) || 0;
  const odds = Number(bet.odds) || 0;
  switch (bet.result) {
    case '적중': return +(stake * (odds - 1)).toFixed(2);
    case '실패': return -stake;
    case '취소': return 0;
    default: return null; // 대기 중 (통계에서 제외)
  }
}

let bets = loadBets();
let favTeams = loadFavTeams();
let budget = loadBudget();
let lastFocusedTeamField = 'home';
let editingId = null;
let betMode = 'single';
let legCounter = 0;
let statsPeriod = { mode: 'all', from: null, to: null };
let calState = (() => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() }; // month: 0-indexed
})();
let selectedDay = null;

// ---------- 탭 전환 ----------
document.getElementById('tabNav').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  if (btn.dataset.tab === 'stats') renderStats();
  if (btn.dataset.tab === 'calendar') renderCalendar();
});

// ---------- 폼: 단일/폴더 모드 토글 ----------
const modeSingleBtn = document.getElementById('modeSingleBtn');
const modeComboBtn = document.getElementById('modeComboBtn');
const singleModeFields = document.getElementById('singleModeFields');
const comboModeFields = document.getElementById('comboModeFields');

function setBetMode(mode) {
  betMode = mode;
  if (modeSingleBtn) modeSingleBtn.classList.toggle('active', mode === 'single');
  if (modeComboBtn) modeComboBtn.classList.toggle('active', mode === 'combo');
  if (singleModeFields) singleModeFields.hidden = mode !== 'single';
  if (comboModeFields) comboModeFields.hidden = mode !== 'combo';
  if (mode === 'combo' && document.querySelectorAll('.leg-box').length < 2) {
    resetLegs();
  }
}

if (modeSingleBtn) modeSingleBtn.addEventListener('click', () => setBetMode('single'));
if (modeComboBtn) modeComboBtn.addEventListener('click', () => setBetMode('combo'));

// ---------- 폼: 폴더 배팅 다리(leg) 관리 ----------
function legTemplate(index) {
  return `
    <div class="leg-box" data-leg-index="${index}">
      <div class="leg-box-header">
        <span class="leg-box-title">경기 ${index + 1}</span>
        <button type="button" class="icon-btn leg-remove-btn" title="삭제">🗑️</button>
      </div>
      <div class="form-row">
        <label>스포츠
          <select class="leg-sport">
            <option value="축구">⚽ 축구</option>
            <option value="야구">⚾ 야구</option>
            <option value="농구">🏀 농구</option>
            <option value="배구">🏐 배구</option>
            <option value="e스포츠">🎮 e스포츠</option>
            <option value="기타">🔹 기타</option>
          </select>
        </label>
        <label>배당률
          <input type="number" class="leg-odds" step="0.01" min="1" placeholder="예) 1.95">
        </label>
      </div>
      <div class="form-row">
        <label>홈 팀
          <input type="text" class="leg-home" placeholder="홈팀">
        </label>
        <label>원정 팀
          <input type="text" class="leg-away" placeholder="원정팀">
        </label>
      </div>
      <div class="form-row form-row-full">
        <label>베팅 유형
          <input type="text" class="leg-bettype" placeholder="예) 승무패, 핸디캡">
        </label>
      </div>
    </div>`;
}

function addLegRow(prefill) {
  const legsList = document.getElementById('legsList');
  if (!legsList) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = legTemplate(legCounter++).trim();
  const legEl = wrapper.firstElementChild;
  legsList.appendChild(legEl);
  if (prefill) {
    legEl.querySelector('.leg-sport').value = prefill.sport || '축구';
    legEl.querySelector('.leg-home').value = prefill.home || '';
    legEl.querySelector('.leg-away').value = prefill.away || '';
    legEl.querySelector('.leg-bettype').value = prefill.betType || '';
    legEl.querySelector('.leg-odds').value = prefill.odds != null && !isNaN(prefill.odds) ? prefill.odds : '';
  }
  updateComboOddsPreview();
}

function resetLegs() {
  const legsList = document.getElementById('legsList');
  if (!legsList) return;
  legsList.innerHTML = '';
  legCounter = 0;
  addLegRow();
  addLegRow();
}

function readLegs() {
  return Array.from(document.querySelectorAll('.leg-box')).map(box => ({
    sport: box.querySelector('.leg-sport').value,
    home: box.querySelector('.leg-home').value.trim(),
    away: box.querySelector('.leg-away').value.trim(),
    betType: box.querySelector('.leg-bettype').value.trim(),
    odds: parseFloat(box.querySelector('.leg-odds').value),
  }));
}

function comboOdds(legs) {
  return legs.reduce((acc, l) => acc * (Number(l.odds) > 0 ? Number(l.odds) : 1), 1);
}

function updateComboOddsPreview() {
  const preview = document.getElementById('comboOddsPreview');
  if (!preview) return;
  const legs = readLegs();
  const valid = legs.length > 0 && legs.every(l => !isNaN(l.odds) && l.odds > 0);
  preview.textContent = valid
    ? `합산 배당률: ${comboOdds(legs).toFixed(2)}배 (${legs.length}경기)`
    : '각 경기의 배당률을 입력하면 합산 배당률이 자동 계산됩니다.';
}

const addLegBtn = document.getElementById('addLegBtn');
if (addLegBtn) addLegBtn.addEventListener('click', () => addLegRow());

const legsListEl = document.getElementById('legsList');
if (legsListEl) {
  legsListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.leg-remove-btn');
    if (!btn) return;
    if (document.querySelectorAll('.leg-box').length <= 2) {
      alert('폴더 배팅은 최소 2경기 이상이어야 합니다.');
      return;
    }
    btn.closest('.leg-box').remove();
    updateComboOddsPreview();
  });
  legsListEl.addEventListener('input', (e) => {
    if (e.target.classList.contains('leg-odds')) updateComboOddsPreview();
  });
}

resetLegs();

// ---------- 폼: 제출/수정 ----------
const form = document.getElementById('betForm');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

document.getElementById('f-date').valueAsDate = new Date();

function resetFormState() {
  editingId = null;
  form.reset();
  document.getElementById('f-date').valueAsDate = new Date();
  submitBtn.textContent = '기록 추가';
  cancelEditBtn.hidden = true;
  setBetMode('single');
  resetLegs();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  let data;

  if (betMode === 'combo') {
    const legs = readLegs();
    if (legs.length < 2) { alert('폴더 배팅은 최소 2경기 이상 입력해 주세요.'); return; }
    if (legs.some(l => !l.home && !l.away)) { alert('모든 경기의 팀 이름을 입력해 주세요.'); return; }
    if (legs.some(l => isNaN(l.odds) || l.odds <= 0)) { alert('모든 경기의 배당률을 입력해 주세요.'); return; }
    const stake = parseFloat(document.getElementById('f-stake').value);
    const dateVal = document.getElementById('f-date').value;
    if (!dateVal || isNaN(stake)) return;
    data = {
      date: dateVal,
      betMode: 'combo',
      sport: '폴더',
      legs,
      odds: +comboOdds(legs).toFixed(4),
      bookmaker: document.getElementById('f-bookmaker').value.trim(),
      stake,
      result: document.getElementById('f-result').value,
      memo: document.getElementById('f-memo').value.trim(),
    };
  } else {
    const dateVal = document.getElementById('f-date').value;
    const sport = document.getElementById('f-sport').value;
    const odds = parseFloat(document.getElementById('f-odds').value);
    const stake = parseFloat(document.getElementById('f-stake').value);
    if (!dateVal || !sport || isNaN(odds) || isNaN(stake)) return;
    data = {
      date: dateVal,
      betMode: 'single',
      sport,
      home: document.getElementById('f-home').value.trim(),
      away: document.getElementById('f-away').value.trim(),
      betType: document.getElementById('f-bettype').value.trim(),
      odds,
      bookmaker: document.getElementById('f-bookmaker').value.trim(),
      stake,
      result: document.getElementById('f-result').value,
      memo: document.getElementById('f-memo').value.trim(),
    };
  }

  if (editingId) {
    const idx = bets.findIndex(b => b.id === editingId);
    if (idx > -1) bets[idx] = { id: editingId, ...data };
  } else {
    bets.push({ id: uid(), ...data });
  }
  saveBets(bets);
  resetFormState();
  renderAll();
});

cancelEditBtn.addEventListener('click', () => {
  resetFormState();
});

function startEdit(id) {
  const bet = bets.find(b => b.id === id);
  if (!bet) return;
  editingId = id;
  document.getElementById('f-date').value = bet.date;
  document.getElementById('f-bookmaker').value = bet.bookmaker || '';
  document.getElementById('f-stake').value = bet.stake;
  document.getElementById('f-result').value = bet.result;
  document.getElementById('f-memo').value = bet.memo || '';

  if (bet.betMode === 'combo' && Array.isArray(bet.legs)) {
    setBetMode('combo');
    const legsList = document.getElementById('legsList');
    legsList.innerHTML = '';
    legCounter = 0;
    bet.legs.forEach(leg => addLegRow(leg));
  } else {
    setBetMode('single');
    const { home, away } = getHomeAway(bet);
    document.getElementById('f-sport').value = bet.sport;
    document.getElementById('f-home').value = home;
    document.getElementById('f-away').value = away;
    document.getElementById('f-bettype').value = bet.betType || '';
    document.getElementById('f-odds').value = bet.odds;
  }

  submitBtn.textContent = '수정 완료';
  cancelEditBtn.hidden = false;
  document.getElementById('panel-record').scrollIntoView({ behavior: 'smooth' });
}

function deleteBet(id) {
  if (!confirm('이 기록을 삭제할까요?')) return;
  bets = bets.filter(b => b.id !== id);
  saveBets(bets);
  renderAll();
}

// ---------- 즐겨찾기 팀 UI ----------
function renderFavTeams() {
  const box = document.getElementById('favTeamsBox');
  const chipsEl = document.getElementById('favTeamsChips');
  if (!box || !chipsEl) return;
  chipsEl.innerHTML = '';
  if (!favTeams.length) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  favTeams.forEach(name => {
    const chip = document.createElement('span');
    chip.className = 'fav-chip';
    const safeName = escapeHtml(name);
    chip.innerHTML = `<button type="button" class="fav-chip-name" data-name="${safeName}">${safeName}</button><button type="button" class="fav-chip-remove" data-name="${safeName}" title="즐겨찾기에서 삭제">×</button>`;
    chipsEl.appendChild(chip);
  });
}

function addFavTeam(name) {
  name = (name || '').trim();
  if (!name || favTeams.includes(name)) return;
  favTeams.push(name);
  saveFavTeams(favTeams);
  renderFavTeams();
}

const homeInput = document.getElementById('f-home');
const awayInput = document.getElementById('f-away');
if (homeInput) homeInput.addEventListener('focus', () => { lastFocusedTeamField = 'home'; });
if (awayInput) awayInput.addEventListener('focus', () => { lastFocusedTeamField = 'away'; });

const homeStarBtn = document.getElementById('f-home-star');
const awayStarBtn = document.getElementById('f-away-star');
if (homeStarBtn) homeStarBtn.addEventListener('click', () => addFavTeam(homeInput.value));
if (awayStarBtn) awayStarBtn.addEventListener('click', () => addFavTeam(awayInput.value));

const favTeamsChipsEl = document.getElementById('favTeamsChips');
if (favTeamsChipsEl) {
  favTeamsChipsEl.addEventListener('click', (e) => {
    const nameBtn = e.target.closest('.fav-chip-name');
    const removeBtn = e.target.closest('.fav-chip-remove');
    if (nameBtn) {
      const target = document.getElementById('f-' + lastFocusedTeamField);
      if (target) target.value = nameBtn.dataset.name;
      return;
    }
    if (removeBtn) {
      favTeams = favTeams.filter(n => n !== removeBtn.dataset.name);
      saveFavTeams(favTeams);
      renderFavTeams();
    }
  });
}

renderFavTeams();

// ---------- 북메이커 자동완성 ----------
function renderBookmakerList() {
  const list = document.getElementById('bookmakerList');
  if (!list) return;
  const names = Array.from(new Set(bets.map(b => b.bookmaker).filter(Boolean)));
  list.innerHTML = names.map(n => `<option value="${escapeHtml(n)}"></option>`).join('');
}

// ---------- 목록 렌더링 ----------
const fmtWon = (n) => (n < 0 ? '-' : '') + Math.abs(Math.round(n)).toLocaleString('ko-KR') + '원';

function renderList() {
  const sportFilter = document.getElementById('filterSport').value;
  const resultFilter = document.getElementById('filterResult').value;
  const tbody = document.getElementById('betTableBody');
  const emptyMsg = document.getElementById('emptyMsg');

  let filtered = bets.filter(b =>
    (!sportFilter || b.sport === sportFilter) &&
    (!resultFilter || b.result === resultFilter)
  );
  filtered = filtered.slice().sort((a, b) => b.date.localeCompare(a.date));

  tbody.innerHTML = '';
  emptyMsg.style.display = filtered.length ? 'none' : 'block';

  filtered.forEach(bet => {
    const profit = calcProfit(bet);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${bet.date}</td>
      <td>${bet.sport}</td>
      <td>${[betLabel(bet), betTypeLabel(bet)].filter(Boolean).join(' · ') || '-'}</td>
      <td>${bet.bookmaker || '-'}</td>
      <td>${bet.odds}</td>
      <td>${fmtWon(bet.stake)}</td>
      <td><span class="result-badge result-${bet.result}">${bet.result}</span></td>
      <td class="${profit == null ? '' : profit >= 0 ? 'profit-positive' : 'profit-negative'}">${profit == null ? '-' : fmtWon(profit)}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" data-action="edit" data-id="${bet.id}" title="수정">✏️</button>
          <button class="icon-btn" data-action="delete" data-id="${bet.id}" title="삭제">🗑️</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById('betTableBody').addEventListener('click', (e) => {
  const btn = e.target.closest('.icon-btn');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === 'edit') startEdit(id);
  if (btn.dataset.action === 'delete') deleteBet(id);
});

document.getElementById('filterSport').addEventListener('change', renderList);
document.getElementById('filterResult').addEventListener('change', renderList);

// ---------- 요약 카드 ----------
function computeSummary(list) {
  const resolved = list.filter(b => b.result !== '대기');
  const totalStake = resolved.reduce((s, b) => s + (Number(b.stake) || 0), 0);
  const totalProfit = resolved.reduce((s, b) => s + (calcProfit(b) || 0), 0);
  const winLose = resolved.filter(b => b.result === '적중' || b.result === '실패');
  const wins = winLose.filter(b => b.result === '적중').length;
  const winRate = winLose.length ? (wins / winLose.length) * 100 : 0;
  const roi = totalStake ? (totalProfit / totalStake) * 100 : 0;
  return { totalStake, totalProfit, winRate, roi };
}

function renderSummary() {
  const { totalStake, totalProfit, winRate, roi } = computeSummary(bets);
  document.getElementById('sumStake').textContent = fmtWon(totalStake);
  const profitEl = document.getElementById('sumProfit');
  profitEl.textContent = fmtWon(totalProfit);
  profitEl.className = 'summary-value ' + (totalProfit >= 0 ? 'positive' : 'negative');
  const roiEl = document.getElementById('sumRoi');
  roiEl.textContent = roi.toFixed(1) + '%';
  roiEl.className = 'summary-value ' + (roi >= 0 ? 'positive' : 'negative');
  document.getElementById('sumWinRate').textContent = winRate.toFixed(1) + '%';
  updatePendingHint();
}

function updatePendingHint() {
  const pendingCount = bets.filter(b => b.result === '대기').length;
  const text = pendingCount
    ? ('⏳ 결과가 "대기" 상태인 ' + pendingCount + '건은 통계·수익률 계산에서 제외됩니다. 경기 결과가 나오면 목록에서 ✏️를 눌러 결과를 "적중" 또는 "실패"로 수정해 주세요.')
    : '';
  ['pendingHint', 'pendingHintStats'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.hidden = !pendingCount;
  });
}

// ---------- 예산/손실 한도 경고 ----------
function updateBudgetWarning() {
  const card = document.getElementById('budgetWarningCard');
  const text = document.getElementById('budgetWarningText');
  if (!card || !text) return;
  if (!budget.monthlyStakeLimit && !budget.monthlyLossLimit) {
    card.hidden = true;
    return;
  }
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthBets = bets.filter(b => b.date && b.date.startsWith(ym) && b.result !== '대기');
  const monthStake = monthBets.reduce((s, b) => s + (Number(b.stake) || 0), 0);
  const monthProfit = monthBets.reduce((s, b) => s + (calcProfit(b) || 0), 0);

  const msgs = [];
  if (budget.monthlyStakeLimit && monthStake > budget.monthlyStakeLimit) {
    msgs.push(`⚠️ 이번 달 배팅 금액(${fmtWon(monthStake)})이 설정한 한도(${fmtWon(budget.monthlyStakeLimit)})를 초과했습니다.`);
  }
  if (budget.monthlyLossLimit && monthProfit < 0 && Math.abs(monthProfit) > budget.monthlyLossLimit) {
    msgs.push(`⚠️ 이번 달 손실(${fmtWon(Math.abs(monthProfit))})이 설정한 한도(${fmtWon(budget.monthlyLossLimit)})를 초과했습니다. 잠시 쉬어가는 것도 좋은 선택입니다.`);
  }
  card.hidden = msgs.length === 0;
  text.innerHTML = msgs.join('<br>');
}

const budgetLimitInput = document.getElementById('f-budget-limit');
const lossLimitInput = document.getElementById('f-loss-limit');
if (budgetLimitInput) budgetLimitInput.value = budget.monthlyStakeLimit ?? '';
if (lossLimitInput) lossLimitInput.value = budget.monthlyLossLimit ?? '';

const saveBudgetBtn = document.getElementById('saveBudgetBtn');
if (saveBudgetBtn) {
  saveBudgetBtn.addEventListener('click', () => {
    const stakeLimit = parseFloat(budgetLimitInput.value);
    const lossLimit = parseFloat(lossLimitInput.value);
    budget = {
      monthlyStakeLimit: isNaN(stakeLimit) ? null : stakeLimit,
      monthlyLossLimit: isNaN(lossLimit) ? null : lossLimit,
    };
    saveBudget(budget);
    alert('한도가 저장되었습니다.');
    updateBudgetWarning();
  });
}

const clearBudgetBtn = document.getElementById('clearBudgetBtn');
if (clearBudgetBtn) {
  clearBudgetBtn.addEventListener('click', () => {
    budget = { monthlyStakeLimit: null, monthlyLossLimit: null };
    saveBudget(budget);
    if (budgetLimitInput) budgetLimitInput.value = '';
    if (lossLimitInput) lossLimitInput.value = '';
    updateBudgetWarning();
  });
}

// ---------- 통계 탭: 기간 필터 ----------
const statsPeriodBar = document.getElementById('statsPeriodBar');
const customPeriodRow = document.getElementById('customPeriodRow');
if (statsPeriodBar) {
  statsPeriodBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.period-btn');
    if (!btn) return;
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    statsPeriod.mode = btn.dataset.period;
    if (customPeriodRow) customPeriodRow.hidden = statsPeriod.mode !== 'custom';
    renderStats();
  });
}
['statsFrom', 'statsTo'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('change', () => {
    statsPeriod.from = document.getElementById('statsFrom').value || null;
    statsPeriod.to = document.getElementById('statsTo').value || null;
    if (statsPeriod.mode === 'custom') renderStats();
  });
});

function getStatsDateRange() {
  const now = new Date();
  if (statsPeriod.mode === 'month') {
    const y = now.getFullYear(), m = now.getMonth();
    return { from: `${y}-${String(m + 1).padStart(2, '0')}-01`, to: localDateStr(new Date(y, m + 1, 0)) };
  }
  if (statsPeriod.mode === 'lastMonth') {
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    return { from: `${y}-${String(m + 1).padStart(2, '0')}-01`, to: localDateStr(new Date(y, m + 1, 0)) };
  }
  if (statsPeriod.mode === 'custom') {
    return { from: statsPeriod.from, to: statsPeriod.to };
  }
  return { from: null, to: null };
}

// ---------- 통계 탭: 연승/연패 ----------
function computeStreaks(allBets) {
  const decided = allBets
    .filter(b => b.result === '적중' || b.result === '실패')
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  let bestWin = 0, bestLose = 0, runWin = 0, runLose = 0;
  decided.forEach(b => {
    if (b.result === '적중') { runWin++; runLose = 0; bestWin = Math.max(bestWin, runWin); }
    else { runLose++; runWin = 0; bestLose = Math.max(bestLose, runLose); }
  });

  let current = 0, currentType = null;
  for (let i = decided.length - 1; i >= 0; i--) {
    const r = decided[i].result;
    if (currentType === null) { currentType = r; current = 1; }
    else if (r === currentType) current++;
    else break;
  }
  return { current, currentType, bestWin, bestLose };
}

function renderStreaks() {
  const grid = document.getElementById('streakGrid');
  if (!grid) return;
  const { current, currentType, bestWin, bestLose } = computeStreaks(bets);
  const currentLabel = current === 0 ? '기록 없음' : `${current}연${currentType === '적중' ? '승' : '패'}`;
  const currentClass = current === 0 ? '' : (currentType === '적중' ? 'positive' : 'negative');
  grid.innerHTML = `
    <div class="summary-item"><span class="summary-label">현재 연속</span><span class="summary-value ${currentClass}">${currentLabel}</span></div>
    <div class="summary-item"><span class="summary-label">최고 연승</span><span class="summary-value positive">${bestWin}연승</span></div>
    <div class="summary-item"><span class="summary-label">최고 연패</span><span class="summary-value negative">${bestLose}연패</span></div>`;
}

// ---------- 통계 탭 ----------
let cumulativeChartInst, sportChartInst, resultChartInst;

function renderStats() {
  const { from, to } = getStatsDateRange();
  const inRange = (d) => (!from || d >= from) && (!to || d <= to);
  const resolved = bets.filter(b => b.result !== '대기' && inRange(b.date)).slice().sort((a, b) => a.date.localeCompare(b.date));

  renderStreaks();

  // 종목별 상세 테이블 (차트 라이브러리 로드 여부와 무관하게 항상 먼저 갱신)
  const tbody = document.getElementById('sportStatsBody');
  tbody.innerHTML = '';
  SPORTS.forEach(s => {
    const list = resolved.filter(b => b.sport === s);
    if (!list.length) return;
    const { totalStake, totalProfit, winRate, roi } = computeSummary(list);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s}</td>
      <td>${list.length}</td>
      <td>${winRate.toFixed(1)}%</td>
      <td>${fmtWon(totalStake)}</td>
      <td class="${totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}">${fmtWon(totalProfit)}</td>
      <td>${roi.toFixed(1)}%</td>`;
    tbody.appendChild(tr);
  });

  // 차트는 Chart.js가 정상적으로 로드된 경우에만 그립니다.
  // 로드에 실패해도 위 표와 요약 카드는 항상 최신 상태를 보여줍니다.
  let chartError = typeof Chart === 'undefined';

  if (!chartError) {
    try {
      // 누적 손익
      let running = 0;
      const labels = [];
      const dataPoints = [];
      resolved.forEach(b => {
        running += calcProfit(b) || 0;
        labels.push(b.date);
        dataPoints.push(+running.toFixed(2));
      });

      const ctx1 = document.getElementById('cumulativeChart');
      if (cumulativeChartInst) cumulativeChartInst.destroy();
      cumulativeChartInst = new Chart(ctx1, {
        type: 'line',
        data: {
          labels: labels.length ? labels : ['데이터 없음'],
          datasets: [{
            label: '누적 손익',
            data: dataPoints.length ? dataPoints : [0],
            borderColor: '#d4af37',
            backgroundColor: 'rgba(212,175,55,0.15)',
            fill: true,
            tension: 0.25,
            pointRadius: 2,
          }]
        },
        options: chartBaseOptions()
      });

      // 종목별 손익
      const sportProfits = SPORTS.map(s =>
        resolved.filter(b => b.sport === s).reduce((sum, b) => sum + (calcProfit(b) || 0), 0)
      );
      const ctx2 = document.getElementById('sportChart');
      if (sportChartInst) sportChartInst.destroy();
      sportChartInst = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: SPORTS,
          datasets: [{
            label: '손익',
            data: sportProfits,
            backgroundColor: sportProfits.map(v => v >= 0 ? '#3ecf8e' : '#ef5b5b'),
          }]
        },
        options: chartBaseOptions()
      });

      // 적중/실패 비율
      const winCount = resolved.filter(b => b.result === '적중').length;
      const loseCount = resolved.filter(b => b.result === '실패').length;
      const voidCount = resolved.filter(b => b.result === '취소').length;
      const ctx3 = document.getElementById('resultChart');
      if (resultChartInst) resultChartInst.destroy();
      resultChartInst = new Chart(ctx3, {
        type: 'doughnut',
        data: {
          labels: ['적중', '실패', '적특/환불'],
          datasets: [{
            data: [winCount, loseCount, voidCount],
            backgroundColor: ['#3ecf8e', '#ef5b5b', '#9aa5bd'],
          }]
        },
        options: { ...chartBaseOptions(), plugins: { legend: { position: 'bottom', labels: { color: '#e8ecf5' } } } }
      });
    } catch (e) {
      console.error('차트를 그리는 중 오류가 발생했습니다', e);
      chartError = true;
    }
  }

  const chartWarning = document.getElementById('chartWarning');
  if (chartWarning) chartWarning.hidden = !chartError;
}

function chartBaseOptions() {
  return {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#9aa5bd', maxTicksLimit: 6 }, grid: { color: '#2a3550' } },
      y: { ticks: { color: '#9aa5bd' }, grid: { color: '#2a3550' } }
    }
  };
}

// ---------- 캘린더 탭 ----------
const DOW = ['일', '월', '화', '수', '목', '금', '토'];

function renderCalendar() {
  const { year, month } = calState;
  document.getElementById('calMonthLabel').textContent = `${year}년 ${month + 1}월`;

  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';
  DOW.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-dow';
    el.textContent = d;
    grid.appendChild(el);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = localDateStr(new Date());

  const betsByDay = {};
  bets.forEach(b => {
    if (!b.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) return;
    (betsByDay[b.date] = betsByDay[b.date] || []).push(b);
  });

  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    grid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayBets = betsByDay[dateStr] || [];
    const resolvedDayBets = dayBets.filter(b => b.result !== '대기');
    const profit = resolvedDayBets.reduce((s, b) => s + (calcProfit(b) || 0), 0);

    const el = document.createElement('div');
    el.className = 'cal-day';
    if (dateStr === todayStr) el.classList.add('today');
    if (dayBets.length) {
      el.classList.add('has-bets');
      if (resolvedDayBets.length) el.classList.add(profit >= 0 ? 'profit-up' : 'profit-down');
    }
    if (dateStr === selectedDay) el.classList.add('selected');

    let amountHtml = '';
    if (dayBets.length) {
      const amountText = resolvedDayBets.length ? fmtCalAmount(profit) : '대기중';
      amountHtml = `<span class="cal-amount">${amountText}</span>`;
    }
    el.innerHTML = `<span class="cal-date-num">${d}</span>${amountHtml}`;
    el.addEventListener('click', () => {
      selectedDay = dateStr;
      renderCalendar();
      showDayDetail(dateStr, dayBets);
    });
    grid.appendChild(el);
  }
}

function fmtCalAmount(n) {
  const rounded = Math.round(n);
  return (rounded > 0 ? '+' : '') + rounded.toLocaleString('ko-KR');
}

function showDayDetail(dateStr, dayBets) {
  const card = document.getElementById('dayDetailCard');
  if (!dayBets.length) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  document.getElementById('dayDetailTitle').textContent = `${dateStr} 배팅 내역`;
  const tbody = document.getElementById('dayDetailBody');
  tbody.innerHTML = '';
  dayBets.forEach(bet => {
    const profit = calcProfit(bet);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${bet.sport}</td>
      <td>${[betLabel(bet), betTypeLabel(bet)].filter(Boolean).join(' · ') || '-'}</td>
      <td>${bet.bookmaker || '-'}</td>
      <td>${bet.odds}</td>
      <td>${fmtWon(bet.stake)}</td>
      <td><span class="result-badge result-${bet.result}">${bet.result}</span></td>
      <td class="${profit == null ? '' : profit >= 0 ? 'profit-positive' : 'profit-negative'}">${profit == null ? '-' : fmtWon(profit)}</td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById('prevMonth').addEventListener('click', () => {
  calState.month -= 1;
  if (calState.month < 0) { calState.month = 11; calState.year -= 1; }
  selectedDay = null;
  document.getElementById('dayDetailCard').hidden = true;
  renderCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
  calState.month += 1;
  if (calState.month > 11) { calState.month = 0; calState.year += 1; }
  selectedDay = null;
  document.getElementById('dayDetailCard').hidden = true;
  renderCalendar();
});

// ---------- 설정: 백업 / 초기화 ----------
function exportJson() {
  downloadFile(JSON.stringify(bets, null, 2), 'tokebu_backup.json', 'application/json');
  markBackedUp();
}

function exportCsv() {
  const header = ['날짜', '종목', '홈팀', '원정팀', '베팅유형', '배당률', '금액', '결과', '손익', '메모', '북메이커'];
  const rows = bets.map(b => {
    let home, away;
    if (b.betMode === 'combo' && Array.isArray(b.legs)) {
      home = betLabel(b);
      away = '';
    } else {
      ({ home, away } = getHomeAway(b));
    }
    return [
      b.date, b.sport, home, away, betTypeLabel(b), b.odds, b.stake, b.result,
      calcProfit(b) ?? '', (b.memo || '').replace(/,/g, ' '), b.bookmaker || ''
    ];
  });
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadFile('﻿' + csv, 'tokebu_backup.csv', 'text/csv');
  markBackedUp();
}

document.getElementById('exportJsonBtn').addEventListener('click', exportJson);
document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
document.getElementById('backupNowBtn').addEventListener('click', exportJson);

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error('형식 오류');
      if (!confirm(`${imported.length}건의 기록을 가져옵니다. 기존 기록에 추가됩니다. 계속할까요?`)) return;
      const existingIds = new Set(bets.map(b => b.id));
      imported.forEach(b => {
        if (!b.id || existingIds.has(b.id)) b.id = uid();
        bets.push(b);
      });
      saveBets(bets);
      renderAll();
      alert('가져오기가 완료되었습니다.');
    } catch (err) {
      alert('올바른 백업 파일이 아닙니다.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ---------- CSV 가져오기 ----------
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else if (c === '\r') {
      // skip
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

function importCsvText(text) {
  const rows = parseCsv(text);
  if (!rows.length) throw new Error('빈 파일입니다.');
  const header = rows[0];
  const idx = (name) => header.indexOf(name);
  const iDate = idx('날짜'), iSport = idx('종목'), iHome = idx('홈팀'), iAway = idx('원정팀'),
    iType = idx('베팅유형'), iOdds = idx('배당률'), iStake = idx('금액'), iResult = idx('결과'),
    iMemo = idx('메모'), iBookmaker = idx('북메이커');

  if (iDate === -1 || iOdds === -1 || iStake === -1 || iResult === -1) {
    throw new Error('CSV 형식을 인식할 수 없습니다. 토계부에서 내보낸 CSV 형식을 사용해 주세요.');
  }

  return rows.slice(1)
    .filter(r => r.length > 1 || r[0])
    .map(r => ({
      id: uid(),
      date: r[iDate] || '',
      betMode: 'single',
      sport: (iSport > -1 && r[iSport]) ? r[iSport] : '기타',
      home: iHome > -1 ? (r[iHome] || '') : '',
      away: iAway > -1 ? (r[iAway] || '') : '',
      betType: iType > -1 ? (r[iType] || '') : '',
      odds: parseFloat(r[iOdds]),
      bookmaker: iBookmaker > -1 ? (r[iBookmaker] || '') : '',
      stake: parseFloat(r[iStake]),
      result: r[iResult] || '대기',
      memo: iMemo > -1 ? (r[iMemo] || '') : '',
    }))
    .filter(b => b.date && !isNaN(b.odds) && !isNaN(b.stake));
}

const importCsvFile = document.getElementById('importCsvFile');
if (importCsvFile) {
  importCsvFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = importCsvText(reader.result);
        if (!imported.length) throw new Error('가져올 수 있는 기록이 없습니다.');
        if (!confirm(`${imported.length}건의 기록을 CSV에서 가져옵니다. 기존 기록에 추가됩니다. 계속할까요?`)) return;
        bets.push(...imported);
        saveBets(bets);
        renderAll();
        alert('CSV 가져오기가 완료되었습니다.');
      } catch (err) {
        alert(err.message || '올바른 CSV 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

document.getElementById('resetAllBtn').addEventListener('click', () => {
  if (!confirm('정말 모든 기록을 삭제할까요? 되돌릴 수 없습니다.')) return;
  if (!confirm('마지막 확인입니다. 삭제를 진행할까요?')) return;
  bets = [];
  saveBets(bets);
  renderAll();
});

// ---------- PWA: 서비스 워커 등록 ----------
if ('serviceWorker' in navigator && typeof location !== 'undefined' && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      // 서비스 워커 등록 실패는 조용히 무시 (오프라인 지원만 안 될 뿐 앱은 정상 동작)
    });
  });
}

// ---------- 초기 렌더 ----------
function renderAll() {
  renderSummary();
  renderList();
  renderBookmakerList();
  updateBackupStatus();
  updateBudgetWarning();
  if (document.getElementById('panel-stats').classList.contains('active')) renderStats();
  if (document.getElementById('panel-calendar').classList.contains('active')) renderCalendar();
}

renderAll();
