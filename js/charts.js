// Leichtgewichtige SVG-Diagramme (Linie, gestapelte Säulen) mit Tooltip, Legende und Tabellenansicht.
// Diagramme werden als HTML-String gerendert; die Hover-Logik hängt per Event-Delegation am Dokument.

const registry = new Map();
let seq = 0;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function resetCharts() {
  registry.clear();
}

/** Verfügbare Breite eines Diagramms in einer Karte (Seite max. 920px, Rand + Kartenpadding). */
export function chartWidth() {
  return Math.max(260, Math.min(window.innerWidth, 920) - 66);
}

function niceStep(span, count) {
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

function yScale(values, { zero = false, max: fixedMax } = {}) {
  let lo = zero ? 0 : Math.min(...values), hi = fixedMax ?? Math.max(...values);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) { lo = 0; hi = 1; }
  if (hi === lo) { hi += 1; lo = Math.max(0, lo - 1); }
  const step = niceStep(hi - lo, 4);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  if (zero) lo = 0;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
  return { lo, hi, ticks };
}

function legend(series, kind) {
  if (series.length < 2) return '';
  return `<div class="chart-legend">${series.map(s => `<span class="lg-item"><span class="lg-key ${kind}" style="--c:${s.color}"></span>${esc(s.name)}</span>`).join('')}</div>`;
}

function tableView(points, series, fmt) {
  return `<details class="chart-table"><summary>Als Tabelle anzeigen</summary><div class="table-wrap"><table class="stats-table">
    <thead><tr><th class="left">${esc(points.header || '')}</th>${series.map(s => `<th>${esc(s.name)}</th>`).join('')}</tr></thead>
    <tbody>${points.map((p, i) => `<tr><td class="left">${esc(p.label)}</td>${series.map(s => `<td>${s.values[i] == null ? '–' : esc(fmt(s.values[i]))}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div></details>`;
}

/**
 * Liniendiagramm.
 * points: [{ label (Tooltip/Tabelle), tick (Achse) }], points.header = Spaltenname
 * series: [{ name, color, values: [number|null] }]
 */
export function lineChart({ points, series, fmt = v => String(v), ariaLabel, width, height = 220, area = false, zero = false, max, endName = false }) {
  const id = 'c' + ++seq;
  const W = width || chartWidth(), H = height;
  const all = series.flatMap(s => s.values).filter(v => v != null);
  const { lo, hi, ticks } = yScale(all, { zero, max });
  const showEnd = series.length <= 4;
  const M = { l: 36, r: showEnd ? (endName ? 104 : 58) : 12, t: 10, b: 26 };
  const n = points.length;
  const x = i => M.l + (n === 1 ? (W - M.l - M.r) / 2 : (i * (W - M.l - M.r)) / (n - 1));
  const y = v => M.t + (H - M.t - M.b) * (1 - (v - lo) / (hi - lo));
  const dots = n <= 40;

  const grid = ticks.map(t => `<line class="grid" x1="${M.l}" x2="${W - M.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${M.l - 6}" y="${y(t) + 4}" text-anchor="end">${esc(fmt(t, true))}</text>`).join('');
  const tickIdx = xTicks(n, Math.max(2, Math.floor((W - M.l - M.r) / 70)));
  const xt = tickIdx.map(i => `<text class="axis" x="${x(i)}" y="${H - 8}" text-anchor="${n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle'}">${esc(points[i].tick)}</text>`).join('');

  // Endbeschriftungen nur, wenn sie sich nicht überlappen
  const ends = series.map(s => {
    let i = s.values.length - 1;
    while (i >= 0 && s.values[i] == null) i--;
    return i >= 0 ? { s, i, yy: y(s.values[i]) } : null;
  }).filter(Boolean);
  const sortedY = ends.map(e => e.yy).sort((a, b) => a - b);
  const collide = sortedY.some((v, k) => k > 0 && v - sortedY[k - 1] < 15);

  const marks = series.map(s => {
    const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);
    if (!pts.length) return '';
    const d = pts.map((p, k) => `${k ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
    const wash = area && series.length === 1 && pts.length > 1
      ? `<path d="${d}L${pts[pts.length - 1][0].toFixed(1)},${y(lo)}L${pts[0][0].toFixed(1)},${y(lo)}Z" fill="${s.color}" opacity=".1"/>` : '';
    const markers = (dots ? pts : [pts[pts.length - 1]]).map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" fill="${s.color}" class="ring"/>`).join('');
    return `${wash}<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${markers}`;
  }).join('');
  const endLabels = showEnd && !collide
    ? ends.map(e => `<text class="end-label" x="${x(e.i) + 8}" y="${e.yy + 4}">${endName ? esc(e.s.name.slice(0, 9)) + ' ' : ''}${esc(fmt(e.s.values[e.i]))}</text>`).join('') : '';

  registry.set(id, { kind: 'line', W, H, M, xs: points.map((_, i) => x(i)), points, series, fmt });
  return `<div class="chart" data-chart="${id}">
    ${legend(series, 'line')}
    <div class="chart-plot" tabindex="0" role="img" aria-label="${esc(ariaLabel)}">
      <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
        ${grid}${xt}
        <line class="crosshair" x1="0" x2="0" y1="${M.t}" y2="${H - M.b}" visibility="hidden"/>
        ${marks}${endLabels}
      </svg>
      <div class="chart-tip" hidden></div>
    </div>
    ${tableView(points, series, fmt)}
  </div>`;
}

/** Gestapeltes Säulendiagramm (auch für eine einzelne Reihe). */
export function barChart({ points, series, fmt = v => String(v), ariaLabel, width, height = 200, max, capLabel }) {
  const id = 'c' + ++seq;
  const W = width || chartWidth(), H = height;
  const totals = points.map((_, i) => series.reduce((a, s) => a + (s.values[i] || 0), 0));
  const { lo, hi, ticks } = yScale([...totals, 0], { zero: true, max });
  const M = { l: 36, r: 8, t: 18, b: 26 };
  const n = points.length;
  const band = (W - M.l - M.r) / n;
  const bw = Math.min(24, band * 0.6);
  const cx = i => M.l + band * (i + 0.5);
  const y = v => M.t + (H - M.t - M.b) * (1 - (v - lo) / (hi - lo));

  const grid = ticks.map(t => `<line class="grid" x1="${M.l}" x2="${W - M.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${M.l - 6}" y="${y(t) + 4}" text-anchor="end">${esc(fmt(t, true))}</text>`).join('');
  const tickIdx = xTicks(n, Math.max(2, Math.floor((W - M.l - M.r) / 56)));
  const xt = tickIdx.map(i => `<text class="axis" x="${cx(i)}" y="${H - 8}" text-anchor="middle">${esc(points[i].tick)}</text>`).join('');

  const bars = points.map((_, i) => {
    let acc = 0;
    const segs = [];
    const topIdx = series.map((s, k) => (s.values[i] ? k : -1)).reduce((a, b) => Math.max(a, b), -1);
    series.forEach((s, k) => {
      const v = s.values[i] || 0;
      if (!v) return;
      const y0 = y(acc), y1 = y(acc + v);
      acc += v;
      const gap = acc > v ? 2 : 0; // 2px Flächen-Lücke zwischen Segmenten
      const h = Math.max(0, y0 - y1 - gap);
      const x0 = cx(i) - bw / 2;
      segs.push(k === topIdx ? roundTop(x0, y1, bw, h, s.color) : `<rect x="${x0}" y="${y1}" width="${bw}" height="${h}" fill="${s.color}"/>`);
    });
    const cap = capLabel && n <= 12 && totals[i] ? `<text class="cap-label" x="${cx(i)}" y="${y(totals[i]) - 5}" text-anchor="middle">${esc(capLabel(i, totals[i]))}</text>` : '';
    return segs.join('') + cap;
  }).join('');

  registry.set(id, { kind: 'bar', W, H, M, xs: points.map((_, i) => cx(i)), band, points, series, fmt });
  return `<div class="chart" data-chart="${id}">
    ${legend(series, 'rect')}
    <div class="chart-plot" tabindex="0" role="img" aria-label="${esc(ariaLabel)}">
      <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
        <rect class="band-hl" x="0" y="${M.t}" width="${band}" height="${H - M.t - M.b}" visibility="hidden" rx="6"/>
        ${grid}${xt}${bars}
      </svg>
      <div class="chart-tip" hidden></div>
    </div>
    ${tableView(points, series, fmt)}
  </div>`;
}

function roundTop(x, y, w, h, color) {
  const r = Math.min(4, h, w / 2);
  return `<path d="M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z" fill="${color}"/>`;
}

function xTicks(n, maxTicks) {
  if (n <= maxTicks) return [...Array(n).keys()];
  const step = Math.ceil((n - 1) / (maxTicks - 1));
  const idx = [];
  for (let i = 0; i < n - 1; i += step) idx.push(i);
  if (n - 1 - idx[idx.length - 1] < step / 2) idx.pop();
  idx.push(n - 1);
  return idx;
}

/* ---------- Hover / Fokus ---------- */

function show(plot, i) {
  const c = registry.get(plot.parentElement.dataset.chart);
  if (!c) return;
  i = Math.max(0, Math.min(c.points.length - 1, i));
  plot.dataset.idx = i;
  const svg = plot.querySelector('svg');
  const scale = svg.getBoundingClientRect().width / c.W || 1;
  const px = c.xs[i];
  if (c.kind === 'line') {
    const ch = svg.querySelector('.crosshair');
    ch.setAttribute('x1', px); ch.setAttribute('x2', px); ch.setAttribute('visibility', 'visible');
  } else {
    const hl = svg.querySelector('.band-hl');
    hl.setAttribute('x', px - c.band / 2); hl.setAttribute('visibility', 'visible');
  }
  const tip = plot.querySelector('.chart-tip');
  tip.replaceChildren();
  const head = document.createElement('div');
  head.className = 'tip-head';
  head.textContent = c.points[i].label;
  tip.append(head);
  for (const s of [...c.series].reverse()) {
    const v = s.values[i];
    const row = document.createElement('div');
    row.className = 'tip-row';
    const key = document.createElement('span');
    key.className = 'tip-key';
    key.style.setProperty('--c', s.color);
    const val = document.createElement('b');
    val.textContent = v == null ? '–' : c.fmt(v);
    const name = document.createElement('span');
    name.className = 'muted';
    name.textContent = s.name;
    row.append(key, val, name);
    tip.append(row);
  }
  tip.hidden = false;
  const w = tip.offsetWidth;
  const left = px * scale;
  tip.style.left = Math.max(0, Math.min(left - w / 2, plot.clientWidth - w)) + 'px';
}

function hide(plot) {
  plot.querySelector('.chart-tip').hidden = true;
  plot.querySelector('.crosshair')?.setAttribute('visibility', 'hidden');
  plot.querySelector('.band-hl')?.setAttribute('visibility', 'hidden');
}

function nearest(plot, clientX) {
  const c = registry.get(plot.parentElement.dataset.chart);
  const rect = plot.querySelector('svg').getBoundingClientRect();
  const vx = ((clientX - rect.left) / rect.width) * c.W;
  let best = 0;
  c.xs.forEach((x, i) => { if (Math.abs(x - vx) < Math.abs(c.xs[best] - vx)) best = i; });
  return best;
}

document.addEventListener('pointermove', e => {
  const plot = e.target.closest?.('.chart-plot');
  if (plot) show(plot, nearest(plot, e.clientX));
});
document.addEventListener('pointerdown', e => {
  const plot = e.target.closest?.('.chart-plot');
  if (plot) show(plot, nearest(plot, e.clientX));
});
document.addEventListener('pointerout', e => {
  const plot = e.target.closest?.('.chart-plot');
  if (plot && !plot.contains(e.relatedTarget) && document.activeElement !== plot) hide(plot);
});
document.addEventListener('focusin', e => {
  if (e.target.classList?.contains('chart-plot')) {
    const c = registry.get(e.target.parentElement.dataset.chart);
    if (c) show(e.target, +(e.target.dataset.idx ?? c.points.length - 1));
  }
});
document.addEventListener('focusout', e => {
  if (e.target.classList?.contains('chart-plot')) hide(e.target);
});
document.addEventListener('keydown', e => {
  const plot = e.target.classList?.contains('chart-plot') ? e.target : null;
  if (!plot || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  const c = registry.get(plot.parentElement.dataset.chart);
  const cur = +(plot.dataset.idx ?? c.points.length - 1);
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? c.points.length - 1 : cur + (e.key === 'ArrowLeft' ? -1 : 1);
  show(plot, next);
});
