/*! Rapport — the CRM that remembers every customer — © 2026 Hasib (OVERSHOOT). All rights reserved. Licensed, not sold: see LICENSE.md. */
/* =========================================================================
   RAPPORT — charts. Plain SVG, sized to their box (ResizeObserver), redrawn
   through the shared ticker (schedule) — never a second rAF loop.

   - areaChart: one or two smooth series, the area under the first filled.
     Enters by drawing left→right; new data MORPHS (values tween, the path
     follows). Pointer or arrow keys move a crosshair + tooltip.
   - barChart: bars grow on scaleY from the baseline (transform only).
   - donut: arcs sweep in by stroke-dashoffset; update re-sweeps.
   - spark(): a static sparkline string for table cells.
   ========================================================================= */

import { gsap, dur, schedule, esc } from './motion';

export type ChartTone = 'ink' | 'tomato' | 'pine' | 'butter' | 'muted';
export interface Series { name: string; values: number[]; tone: ChartTone; dashed?: boolean }
const NS = 'http://www.w3.org/2000/svg';
const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v)), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};
/** Monotone-ish smooth path through points (Catmull-Rom → Bézier, clamped). */
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return '';
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!, p1 = pts[i]!, p2 = pts[i + 1]!, p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    const lo = Math.min(p1[1], p2[1]), hi = Math.max(p1[1], p2[1]);
    c1[1] = Math.max(lo, Math.min(hi, c1[1]!)); c2[1] = Math.max(lo, Math.min(hi, c2[1]!));
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function areaChart(host: HTMLElement, o: { labels: string[]; series: Series[]; format: (v: number) => string; height?: number; label: string }) {
  host.classList.add('chart');
  host.innerHTML = `<svg class="chart__svg" role="img" aria-label="${esc(o.label)}"><defs><linearGradient id="g-${o.label.replace(/\W/g, '')}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="chart__stop0"/><stop offset="1" class="chart__stop1"/></linearGradient><clipPath id="c-${o.label.replace(/\W/g, '')}"><rect class="chart__clip" x="0" y="0" height="100%"/></clipPath></defs>
    <g class="chart__grid"></g><g class="chart__plot" clip-path="url(#c-${o.label.replace(/\W/g, '')})"><path class="chart__area" fill="url(#g-${o.label.replace(/\W/g, '')})"/></g><g class="chart__x"></g>
    <line class="chart__cross" y1="0" /><g class="chart__dots"></g></svg>
    <div class="chart__tip" role="status" aria-live="polite"></div>`;
  const svg = host.querySelector('svg')!;
  const plot = svg.querySelector('.chart__plot')!, grid = svg.querySelector('.chart__grid')!, xg = svg.querySelector('.chart__x')!;
  const area = svg.querySelector<SVGPathElement>('.chart__area')!, clip = svg.querySelector<SVGRectElement>('.chart__clip')!;
  const cross = svg.querySelector<SVGLineElement>('.chart__cross')!, dots = svg.querySelector('.chart__dots')!;
  const tip = host.querySelector<HTMLElement>('.chart__tip')!;
  let labels = o.labels, series = o.series;
  let cur = series.map((s) => [...s.values]);
  const lines: SVGPathElement[] = [];
  const reveal = { p: 0 };
  let W = 0, H = o.height ?? 220, hover = -1;
  const pad = { l: 44, r: 12, t: 12, b: 26 };
  host.tabIndex = 0;

  function ensureLines() {
    while (lines.length < series.length) { const p = document.createElementNS(NS, 'path'); plot.append(p); lines.push(p); }
    lines.forEach((p, i) => { const s = series[i]; p.style.display = s ? '' : 'none'; if (s) p.setAttribute('class', `chart__line chart__line--${s.tone}${s.dashed ? ' is-dashed' : ''}`); });
  }
  const max = () => niceMax(Math.max(1, ...cur.flat()) * 1.08);
  const X = (i: number) => pad.l + (labels.length < 2 ? 0 : (i / (labels.length - 1)) * (W - pad.l - pad.r));
  const Y = (v: number) => pad.t + (1 - v / max()) * (H - pad.t - pad.b);
  function draw() {
    W = host.clientWidth; if (!W) return;
    H = o.height ?? Math.max(160, host.clientHeight || 220);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', String(W)); svg.setAttribute('height', String(H));
    const m = max();
    grid.innerHTML = [0, 0.5, 1].map((f) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${Y(m * f)}" y2="${Y(m * f)}"/><text x="${pad.l - 8}" y="${Y(m * f) + 4}" text-anchor="end">${esc(o.format(m * f))}</text>`).join('');
    const step = Math.ceil(labels.length / Math.max(2, Math.floor((W - pad.l) / 56)));
    xg.innerHTML = labels.map((l, i) => (i % step === 0 || i === labels.length - 1) && !(i !== labels.length - 1 && labels.length - 1 - i < step && i % step === 0 && i !== 0 && labels.length - 1 - i < step / 2) ? `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>` : '').join('');
    ensureLines();
    cur.forEach((vals, si) => {
      const pts = vals.map((v, i) => [X(i), Y(v)] as [number, number]);
      const d = smooth(pts);
      lines[si]?.setAttribute('d', d);
      if (si === 0) area.setAttribute('d', `${d} L${X(vals.length - 1)},${H - pad.b} L${X(0)},${H - pad.b} Z`);
    });
    area.setAttribute('class', `chart__area chart__area--${series[0]?.tone ?? 'ink'}`);
    host.style.setProperty('--area', `var(--${series[0]?.tone === 'muted' ? 'faint' : series[0]?.tone ?? 'tomato'})`);
    clip.setAttribute('width', String(pad.l + (W - pad.l) * reveal.p + 2));
    cross.setAttribute('y1', String(pad.t)); cross.setAttribute('y2', String(H - pad.b));
    if (hover >= 0 && hover < labels.length) {
      cross.setAttribute('x1', String(X(hover))); cross.setAttribute('x2', String(X(hover)));
      cross.style.opacity = '1';
      dots.innerHTML = cur.map((v, si) => `<circle class="chart__dot chart__dot--${series[si]?.tone}" cx="${X(hover)}" cy="${Y(v[hover] ?? 0)}" r="4.5"/>`).join('');
      tip.innerHTML = `<b>${esc(labels[hover] ?? '')}</b>${series.map((s, si) => `<span><i class="tone--${s.tone}"></i>${esc(s.name)} <strong>${esc(o.format(cur[si]?.[hover] ?? 0))}</strong></span>`).join('')}`;
      tip.style.opacity = '1';
      const tx = Math.min(W - tip.offsetWidth - 4, Math.max(4, X(hover) - tip.offsetWidth / 2));
      tip.style.transform = `translate(${tx}px, ${Math.max(0, Y(Math.max(...cur.map((v) => v[hover] ?? 0))) - tip.offsetHeight - 14)}px)`;
    } else { cross.style.opacity = '0'; dots.innerHTML = ''; tip.style.opacity = '0'; }
  }
  const redraw = () => schedule(draw);
  new ResizeObserver(redraw).observe(host);
  host.addEventListener('card:resize', redraw);
  host.closest('.card')?.addEventListener('card:resize', () => setTimeout(redraw, 650));
  host.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - pad.l) / Math.max(1, W - pad.l - pad.r)) * (labels.length - 1));
    hover = Math.max(0, Math.min(labels.length - 1, i)); redraw();
  });
  host.addEventListener('pointerleave', () => { hover = -1; redraw(); });
  host.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    hover = Math.max(0, Math.min(labels.length - 1, (hover < 0 ? labels.length - 1 : hover) + (e.key === 'ArrowRight' ? 1 : -1))); redraw();
  });
  host.addEventListener('blur', () => { hover = -1; redraw(); });

  return {
    /** Draw in from the left. */
    play(delay = 0) {
      reveal.p = 0; redraw();
      gsap.to(reveal, { p: 1, duration: dur(1.4), delay: dur(delay), ease: 'power2.inOut', onUpdate: redraw, onComplete: redraw });
    },
    /** Morph to new data (same or different length — resampled to the new labels). */
    update(next: Series[], nextLabels = labels) {
      const from = next.map((s, si) => s.values.map((_, i) => {
        const old = cur[si] ?? cur[0] ?? [];
        const f = old.length < 2 ? 0 : (i / Math.max(1, s.values.length - 1)) * (old.length - 1);
        const a = old[Math.floor(f)] ?? 0, b = old[Math.ceil(f)] ?? a;
        return a + (b - a) * (f - Math.floor(f));
      }));
      series = next; labels = nextLabels; cur = from; reveal.p = 1;
      const st = { t: 0 };
      gsap.to(st, { t: 1, duration: dur(0.9), ease: 'power3.inOut', onUpdate: () => {
        cur = next.map((s, si) => s.values.map((v, i) => (from[si]![i] ?? 0) + (v - (from[si]![i] ?? 0)) * st.t)); redraw();
      }, onComplete: () => { cur = next.map((s) => [...s.values]); redraw(); } });
    },
    redraw,
  };
}

export function barChart(host: HTMLElement, o: { labels: string[]; values: number[]; format: (v: number) => string; tone?: ChartTone; label: string; highlight?: number }) {
  host.classList.add('bars');
  host.setAttribute('role', 'list');
  host.setAttribute('aria-label', o.label);
  let vals = o.values;
  const render = () => {
    const m = niceMax(Math.max(1, ...vals));
    host.innerHTML = o.labels.map((l, i) => `<div class="bars__col${i === (o.highlight ?? -1) ? ' is-hi' : ''}" role="listitem" aria-label="${esc(l)}: ${esc(o.format(vals[i] ?? 0))}" title="${esc(l)}: ${esc(o.format(vals[i] ?? 0))}">
      <div class="bars__track"><span class="bars__bar bars__bar--${o.tone ?? 'ink'}" style="height:${((vals[i] ?? 0) / m) * 100}%"></span></div><span class="bars__lab">${esc(l)}</span></div>`).join('');
  };
  render();
  return {
    play(delay = 0) {
      gsap.fromTo(host.querySelectorAll('.bars__bar'), { scaleY: 0 }, { scaleY: 1, transformOrigin: '50% 100%', duration: dur(0.9), ease: 'power3.out', stagger: dur(0.035), delay: dur(delay), clearProps: 'transform' });
    },
    update(next: number[]) {
      const m0 = niceMax(Math.max(1, ...vals)), m1 = niceMax(Math.max(1, ...next));
      const old = vals; vals = next; render();
      host.querySelectorAll<HTMLElement>('.bars__bar').forEach((b, i) => {
        const from = ((old[i] ?? 0) / m0) / Math.max(0.0001, (next[i] ?? 0) / m1);
        gsap.fromTo(b, { scaleY: Math.min(6, from) }, { scaleY: 1, transformOrigin: '50% 100%', duration: dur(0.7), ease: 'power3.inOut', clearProps: 'transform' });
      });
    },
  };
}

export function donut(host: HTMLElement, o: { parts: { label: string; value: number; tone: ChartTone }[]; center: string; sub: string; label: string }) {
  host.classList.add('donut');
  const R = 52, C = 2 * Math.PI * R;
  let parts = o.parts;
  const render = () => {
    const total = parts.reduce((s, p) => s + p.value, 0) || 1;
    let acc = 0;
    host.innerHTML = `<svg viewBox="0 0 140 140" role="img" aria-label="${esc(o.label)}"><circle class="donut__track" cx="70" cy="70" r="${R}"/>${parts.map((p) => {
      const len = (p.value / total) * C, gap = parts.length > 1 ? 3 : 0;
      const s = `<circle class="donut__arc tone-stroke--${p.tone}" cx="70" cy="70" r="${R}" stroke-dasharray="${Math.max(0, len - gap)} ${C}" stroke-dashoffset="${-acc}" data-len="${Math.max(0, len - gap)}"/>`;
      acc += len; return s;
    }).join('')}</svg><div class="donut__mid"><b>${esc(o.center)}</b><span>${esc(o.sub)}</span></div>`;
  };
  render();
  const play = (delay = 0) => {
    host.querySelectorAll<SVGCircleElement>('.donut__arc').forEach((a, i) => {
      const len = Number(a.dataset.len);
      gsap.fromTo(a, { attr: { 'stroke-dasharray': `0 ${C}` } }, { attr: { 'stroke-dasharray': `${len} ${C}` }, duration: dur(1), delay: dur(delay + i * 0.12), ease: 'power3.inOut' });
    });
  };
  return { play, update(next: typeof parts, center?: string) { parts = next; if (center) o.center = center; render(); play(); } };
}

export function spark(values: number[], tone: ChartTone = 'ink', w = 84, h = 26) {
  const m = Math.max(1, ...values), lo = Math.min(...values);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * w, h - 3 - ((v - lo) / Math.max(1, m - lo)) * (h - 6)] as [number, number]);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path class="chart__line chart__line--${tone}" d="${smooth(pts)}"/></svg>`;
}
