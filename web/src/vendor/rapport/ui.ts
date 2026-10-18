/*! Rapport — the CRM that remembers every customer — © 2026 Hasib (OVERSHOOT). All rights reserved. Licensed, not sold: see LICENSE.md. */
/* Parts of the Rapport UI kit (page head entrance, segmented pill) ported for the React Dashboard. Formats are injected by the page. */
import { gsap, $, $$, $maybe, esc, dur, reduced, riseTitle, fileIn, countTo } from './motion';

/** Number formatters used by [data-fmt] (the page sets them: money follows the chosen currency). */
export const FORMATS: Record<string, (v: number) => string> = {
  int: (v) => Math.round(v).toLocaleString('en-US'),
  pct: (v) => `${(v * 100).toFixed(0)}%`,
  money: (v) => Math.round(v).toLocaleString('en-US'),
};
const int = (n: number) => FORMATS.int!(n);


/** Count every [data-count] under root up from 0 (first visit) or on from where it is. */
export function playCounts(root: ParentNode, { from0 = true, delay = 0 } = {}) {
  $$<HTMLElement>('[data-count]', root).forEach((el, i) => {
    const f = FORMATS[el.dataset.fmt ?? 'int'] ?? int;
    countTo(el, Number(el.dataset.count), f, { from: from0 ? 0 : undefined, duration: 1.4, delay: delay + i * 0.06 });
  });
}
/** Set a [data-count] element to a new value and roll to it. */
export function recount(el: HTMLElement | null, to: number) {
  if (!el) return;
  el.dataset.count = String(to);
  countTo(el, to, FORMATS[el.dataset.fmt ?? 'int'] ?? int, { duration: 0.9 });
}
export function enterHead(root: HTMLElement, delay = 0) {
  const tl = gsap.timeline({ delay: dur(delay) });
  tl.add(riseTitle($maybe('.head__title', root)), 0);
  const back = $maybe('.head__back', root);
  if (back) tl.fromTo(back, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: dur(0.6), ease: 'power3.out', clearProps: 'transform,opacity' }, 0);
  tl.add(fileIn($$('.head .stat, .head__actions > *', root), { y: 14, stagger: 0.08 }), 0.12);
  tl.add(() => playCounts($('.head', root)), 0.15);
  return tl;
}

/* ── Travelling pills ────────────────────────────────────────────────────
   A pill that moves between options is a full-width layer CLIPPED to the
   current option: clip-path inset(0 R 0 L round 999px). Its two edges tween
   on their own — the leading edge leaves first and the trailing one follows
   — so it stretches in flight and gathers on arrival, and the rounded ends
   never distort the way a scaleX pill's do. Clip is paint-only: no layout. */
export function slidePill(pill: HTMLElement, box: HTMLElement, target: HTMLElement | null, animate = true) {
  if (!target || !target.offsetWidth) { gsap.set(pill, { opacity: 0 }); return; }
  const W = box.scrollWidth, H = box.offsetHeight;
  const L = target.offsetLeft, R = W - (target.offsetLeft + target.offsetWidth);
  const T = target.offsetTop, B = H - (target.offsetTop + target.offsetHeight);
  const clip = (l: number, r: number) => `inset(${T}px ${r}px ${B}px ${l}px round 999px)`;
  const prev = (pill as HTMLElement & { __lr?: [number, number] }).__lr;
  (pill as HTMLElement & { __lr?: [number, number] }).__lr = [L, R];
  if (!animate || reduced() || !prev || Number(gsap.getProperty(pill, 'opacity')) === 0) { gsap.set(pill, { clipPath: clip(L, R), opacity: 1 }); return; }
  const o = { l: prev[0], r: prev[1] };
  const right = L > prev[0];
  gsap.killTweensOf(o);
  // the leading edge goes first and faster; the trailing edge catches up
  gsap.to(o, { l: L, duration: right ? 0.55 : 0.36, ease: right ? 'power3.inOut' : 'power3.out', onUpdate: () => gsap.set(pill, { clipPath: clip(o.l, o.r) }) });
  gsap.to(o, { r: R, duration: right ? 0.36 : 0.55, ease: right ? 'power3.out' : 'power3.inOut', onUpdate: () => gsap.set(pill, { clipPath: clip(o.l, o.r) }) });
}

/* ── Segmented control ───────────────────────────────────────────────── */
export function segHtml(name: string, opts: [value: string, label: string][], value: string) {
  return `<div class="seg" role="group" aria-label="${esc(name)}"><span class="seg__pill" aria-hidden="true"></span>${opts.map(([v, l]) =>
    `<button type="button" class="seg__btn" data-value="${esc(v)}" aria-pressed="${v === value}">${esc(l)}</button>`).join('')}</div>`;
}
export interface Segmented { place(animate?: boolean): void; select(v: string, o?: { silent?: boolean }): void; readonly value: string }
export function segmented(seg: HTMLElement, onChange: (value: string) => void): Segmented {
  const pill = $('.seg__pill', seg);
  const btns = $$<HTMLButtonElement>('.seg__btn', seg);
  const current = () => btns.find((b) => b.getAttribute('aria-pressed') === 'true') ?? btns[0]!;
  const place = (animate = true) => slidePill(pill, seg, current(), animate);
  function select(value: string, { silent = false } = {}) {
    const b = btns.find((x) => x.dataset.value === value);
    if (!b || b === current()) return;
    btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    place();
    if (!silent) onChange(value);
  }
  btns.forEach((b) => b.addEventListener('click', () => select(b.dataset.value ?? '')));
  new ResizeObserver(() => place(false)).observe(seg);
  requestAnimationFrame(() => place(false));
  return { place, select, get value() { return current().dataset.value ?? ''; } };
}

/* ── Popovers and menus ──────────────────────────────────────────────────
   One open at a time. Positioned in a fixed layer under its anchor (above
   when there is no room), kept inside the viewport, grown from the anchor's
   side. Outside press, Escape, scroll or resize closes it; Escape hands
   focus back to the anchor. */
let openPop: { el: HTMLElement; anchor: HTMLElement; close: (focus?: boolean) => void } | null = null;
export function closePopover(focus = false) { openPop?.close(focus); }