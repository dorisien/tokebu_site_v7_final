/* 토계부 - 스포츠 배팅 가계부
   모든 데이터는 이 브라우저의 localStorage에만 저장됩니다. 서버 전송 없음. */

const STORAGE_KEY = 'tokebu_bets_v1';
const LAST_BACKUP_KEY = 'tokebu_last_backup_v1';
const BACKUP_REMIND_DAYS = 3;

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
let editingId = null;
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

// ---------- 폼 ----------
const form = document.getElementById('betForm');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

document.getElementById('f-date').valueAsDate = new Date();

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = {
    date: document.getElementById('f-date').value,
    sport: document.getElementById('f-sport').value,
    match: document.getElementById('f-match').value.trim(),
    betType: document.getElementById('f-bettype').value.trim(),
    odds: parseFloat(document.getElementById('f-odds').value),
    stake: parseFloat(document.getElementById('f-stake').value),
    result: document.getElementById('f-result').value,
    memo: document.getElementById('f-memo').value.trim(),
  };
  if (!data.date || !data.sport || isNaN(data.odds) || isNaN(data.stake)) return;

  if (editingId) {
    const idx = bets.findIndex(b => b.id === editingId);
    if (idx > -1) bets[idx] = { ...bets[idx], ...data };
    editingId = null;
    submitBtn.textContent = '기록 추가';
    cancelEditBtn.hidden = true;
  } else {
    bets.push({ id: uid(), ...data });
  }
  saveBets(bets);
  form.reset();
  document.getElementById('f-date').valueAsDate = new Date();
  renderAll();
});

cancelEditBtn.addEventListener('click', () => {
  editingId = null;
  form.reset();
  document.getElementById('f-date').valueAsDate = new Date();
  submitBtn.textContent = '기록 추가';
  cancelEditBtn.hidden = true;
});

function startEdit(id) {
  const bet = bets.find(b => b.id === id);
  if (!bet) return;
  editingId = id;
  document.getElementById('f-date').value = bet.date;
  document.getElementById('f-sport').value = bet.sport;
  document.getElementById('f-match').value = bet.match || '';
  document.getElementById('f-bettype').value = bet.betType || '';
  document.getElementById('f-odds').value = bet.odds;
  document.getElementById('f-stake').value = bet.stake;
  document.getElementById('f-result').value = bet.result;
  document.getElementById('f-memo').value = bet.memo || '';
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
      <td>${[bet.match, bet.betType].filter(Boolean).join(' · ') || '-'}</td>
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

// ---------- 통계 탭 ----------
let cumulativeChartInst, sportChartInst, resultChartInst;

function renderStats() {
  const resolved = bets.filter(b => b.result !== '대기').slice().sort((a, b) => a.date.localeCompare(b.date));
  const sports = ['축구', '야구', '농구', '배구', 'e스포츠', '기타'];

  // 종목별 상세 테이블 (차트 라이브러리 로드 여부와 무관하게 항상 먼저 갱신)
  const tbody = document.getElementById('sportStatsBody');
  tbody.innerHTML = '';
  sports.forEach(s => {
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

  // 차트는 Chart.js(외부 CDN)가 정상적으로 로드된 경우에만 그립니다.
  // 오프라인 상태 등으로 로드에 실패해도 위 표와 요약 카드는 항상 최신 상태를 보여줍니다.
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
      const sportProfits = sports.map(s =>
        resolved.filter(b => b.sport === s).reduce((sum, b) => sum + (calcProfit(b) || 0), 0)
      );
      const ctx2 = document.getElementById('sportChart');
      if (sportChartInst) sportChartInst.destroy();
      sportChartInst = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: sports,
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
      <td>${[bet.match, bet.betType].filter(Boolean).join(' · ') || '-'}</td>
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
  const header = ['날짜', '종목', '경기', '베팅유형', '배당률', '금액', '결과', '손익', '메모'];
  const rows = bets.map(b => [
    b.date, b.sport, b.match || '', b.betType || '', b.odds, b.stake, b.result,
    calcProfit(b) ?? '', (b.memo || '').replace(/,/g, ' ')
  ]);
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

document.getElementById('resetAllBtn').addEventListener('click', () => {
  if (!confirm('정말 모든 기록을 삭제할까요? 되돌릴 수 없습니다.')) return;
  if (!confirm('마지막 확인입니다. 삭제를 진행할까요?')) return;
  bets = [];
  saveBets(bets);
  renderAll();
});

// ---------- 초기 렌더 ----------
function renderAll() {
  renderSummary();
  renderList();
  updateBackupStatus();
  if (document.getElementById('panel-stats').classList.contains('active')) renderStats();
  if (document.getElementById('panel-calendar').classList.contains('active')) renderCalendar();
}

renderAll();
