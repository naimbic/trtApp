/*! Rapport — the CRM that remembers every customer — © 2026 Hasib (OVERSHOOT). All rights reserved. Licensed, not sold: see LICENSE.md. */
/* =========================================================================
   Motion vocabulary — shared by every page so Rapport moves as one product.

   GSAP owns every transform. CSS never transitions a property GSAP tweens,
   and nothing animates layout — only transform and opacity. Every duration
   goes through dur(), which is 0 under reduced motion, so each state still
   lands — it just lands at rest.
   ========================================================================= */

import gsap from 'gsap';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);
export { gsap, Flip };

export const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
export const reduced = () => reducedMQ.matches;
export const fine = matchMedia('(hover: hover) and (pointer: fine)');
export const dur = (d: number) => (reducedMQ.matches ? 0 : d);

/* ---- one clock -----------------------------------------------------------
   A recorder overcranks: it slows GSAP's timeline and resamples. Anything
   that waits on real time reads vDelay() so it slows with it. */
let tScale = 1;
export const vDelay = (ms: number) => ms / tScale;
export function setTimeScale(s: number) { tScale = s; gsap.globalTimeline.timeScale(s); }

/* ---- DOM ----------------------------------------------------------------- */
export function $<T extends Element = HTMLElement>(s: string, r: ParentNode = document): NoInfer<T> {
  const el = r.querySelector<T>(s);
  if (!el) throw new Error(`Missing ${s}`);
  return el;
}
export const $maybe = <T extends Element = HTMLElement>(s: string, r: ParentNode = document): NoInfer<T> | null => r.querySelector<T>(s);
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document): NoInfer<T>[] => [...r.querySelectorAll<T>(s)];

export const esc = (s: unknown) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/* ---- text ----------------------------------------------------------------
   Letters ride up out of a per-word mask. The heading keeps its words in an
   aria-label, so a screen reader hears "Pipeline", not P-i-p-e-l-i-n-e.
   Lines are kept: a <br> in the source stays a line break. */
export function split(el: HTMLElement) {
  const src = el.dataset.text ?? el.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
  if (el.dataset.split === src) return $$('.ch', el);
  const text = src.replace(/&amp;/g, '&').trim();
  el.setAttribute('aria-label', text.replace(/\n/g, ' '));
  el.innerHTML = text.split('\n').map((line) => line.trim().split(' ').map((w) =>
    `<span class="word" aria-hidden="true">${[...w].map((c) => `<span class="ch">${esc(c)}</span>`).join('')}</span>`).join(' ')).join('<br>');
  el.dataset.split = src;
  return $$('.ch', el);
}
export function riseTitle(el: HTMLElement | null, delay = 0) {
  if (!el) return gsap.timeline();
  const chars = split(el);
  return gsap.fromTo(chars, { yPercent: 115, rotation: 6 }, { yPercent: 0, rotation: 0, duration: dur(0.85), ease: 'power4.out', stagger: dur(0.022), delay: dur(delay), clearProps: 'transform' });
}

/* ---- entrances ----------------------------------------------------------- */
/** Cards land in reading order: up, a touch of scale, settle. */
export function landCards(cards: Element[], { y = 34, stagger = 0.07, delay = 0 } = {}) {
  if (!cards.length) return gsap.timeline();
  return gsap.fromTo(cards, { opacity: 0, y, scale: 0.985 },
    { opacity: 1, y: 0, scale: 1, duration: dur(0.9), ease: 'power3.out', stagger: dur(stagger), delay: dur(delay), clearProps: 'transform,opacity' });
}
/** Rows and small things file in after their card. */
export function fileIn(els: Element[], { x = 0, y = 12, stagger = 0.045, delay = 0 } = {}) {
  if (!els.length) return gsap.timeline();
  return gsap.fromTo(els, { opacity: 0, x, y },
    { opacity: 1, x: 0, y: 0, duration: dur(0.55), ease: 'power3.out', stagger: dur(stagger), delay: dur(delay), clearProps: 'transform,opacity' });
}
/** Colour tiles are DEALT: they rise with a slight turn, like cards off a deck. */
export function deal(tiles: Element[], { delay = 0, stagger = 0.06 } = {}) {
  if (!tiles.length) return gsap.timeline();
  return gsap.fromTo(tiles, { opacity: 0, y: 40, rotation: (i: number) => (i % 2 ? 3 : -3), scale: 0.94 },
    { opacity: 1, y: 0, rotation: 0, scale: 1, duration: dur(0.8), ease: 'back.out(1.4)', stagger: dur(stagger), delay: dur(delay), clearProps: 'transform,opacity' });
}
/** A small thing arriving: it overshoots and settles. */
export function pop(el: Element | Element[] | null, { from = 0.6, delay = 0, stagger = 0.05 } = {}) {
  if (!el || reducedMQ.matches) return;
  gsap.fromTo(el, { scale: from, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(3)', delay, stagger, overwrite: 'auto', clearProps: 'transform,opacity' });
}
/** A figure that changed under you: a quick lift and a flash. */
export function bump(el: Element | null) {
  if (!el) return;
  el.classList.remove('is-flash');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('is-flash');
  if (reducedMQ.matches) return;
  gsap.fromTo(el, { y: -4, scale: 1.06 }, { y: 0, scale: 1, duration: 0.55, ease: 'back.out(2.4)', overwrite: 'auto', clearProps: 'transform' });
}
/** "+$12,400" rises off a figure and fades: something just landed in it. */
export function floatUp(anchor: Element | null, text: string) {
  if (!anchor || reducedMQ.matches) return;
  const r = anchor.getBoundingClientRect();
  const el = Object.assign(document.createElement('span'), { className: 'float-up', textContent: text });
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, { left: `${r.left + r.width / 2}px`, top: `${r.top}px` });
  document.body.append(el);
  gsap.fromTo(el, { opacity: 0, y: 6, xPercent: -50, scale: 0.9 }, {
    keyframes: [{ opacity: 1, y: -12, scale: 1, duration: 0.35, ease: 'back.out(2)' }, { opacity: 0, y: -40, duration: 0.8, ease: 'power2.in', delay: 0.6 }],
    onComplete: () => el.remove(),
  });
}

/* ---- numbers -------------------------------------------------------------
   countTo tweens a value and writes it through the formatter it is given,
   so money rolls as money ($12,480) and never as a bare float. The element
   remembers where it is, so a second call counts on from there. */
const counts = new WeakMap<HTMLElement, { v: number }>();
export function countTo(el: HTMLElement | null, to: number, format: (v: number) => string, { duration = 1.2, delay = 0, from }: { duration?: number; delay?: number; from?: number } = {}) {
  if (!el) return;
  let st = counts.get(el);
  if (!st) counts.set(el, (st = { v: from ?? 0 }));
  if (from !== undefined) st.v = from;
  gsap.killTweensOf(st);
  if (reducedMQ.matches || !duration || st.v === to) { st.v = to; el.textContent = format(to); return; }
  const o = st;
  el.textContent = format(o.v);
  gsap.to(o, { v: to, duration, delay, ease: 'power3.out', onUpdate: () => { el.textContent = format(o.v); }, onComplete: () => { el.textContent = format(to); } });
}

/* ---- hands ---------------------------------------------------------------
   Squish the INNER icon on press, so it never fights the magnetic pull or a
   hover lift on the button itself. */
export function squish(btn: Element) {
  if (reducedMQ.matches) return;
  const t = btn.querySelector('svg') ?? btn;
  gsap.fromTo(t, { scale: 0.72 }, { scale: 1, duration: 0.55, ease: 'back.out(3)', overwrite: true });
}

interface Mag extends HTMLElement { __mag?: boolean; __lift?: boolean }
/** Buttons marked .magnetic lean toward the pointer (inner transform only). */
export function magnetic(root: ParentNode = document) {
  if (!fine.matches) return;
  $$<Mag>('.magnetic', root).forEach((b) => {
    if (b.__mag) return;
    b.__mag = true;
    const qx = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3.out' });
    const qy = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3.out' });
    b.addEventListener('pointermove', (e) => {
      if (reducedMQ.matches) return;
      const r = b.getBoundingClientRect();
      qx((e.clientX - r.left - r.width / 2) * 0.24);
      qy((e.clientY - r.top - r.height / 2) * 0.3);
    });
    b.addEventListener('pointerleave', () => { qx(0); qy(0); });
  });
}

/* Things marked [data-lift] rise on hover — a tween, never a CSS transition,
   so it can't fight the choreography that lands the same element. It is
   gated until the page has settled. */
export const settled = { v: false };
export function hoverLift(root: ParentNode = document, by = -4) {
  if (!fine.matches) return;
  $$<Mag>('[data-lift]', root).forEach((c) => {
    if (c.__lift) return;
    c.__lift = true;
    c.addEventListener('pointerenter', () => { if (!reducedMQ.matches && settled.v) gsap.to(c, { y: by, duration: 0.45, ease: 'power3.out', overwrite: 'auto' }); });
    c.addEventListener('pointerleave', () => { if (settled.v) gsap.to(c, { y: 0, duration: 0.5, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform' }); });
  });
}

/* ---- the shared ticker ---------------------------------------------------
   Charts redraw at most once per frame: tweens mark them dirty, GSAP's
   ticker draws. There is no second requestAnimationFrame loop. */
const dirty = new Set<() => void>();
gsap.ticker.add(() => {
  if (!dirty.size) return;
  const jobs = [...dirty];
  dirty.clear();
  jobs.forEach((draw) => draw());
});
export const schedule = (draw: () => void) => { dirty.add(draw); };
