"use strict";
/* ===========================================================================
   SUSTAINABILITY · MATCHING ACTIVITY
   Vanilla JS — no dependencies, so it runs from GitHub Pages or straight off a
   USB stick. Motion follows the same principles a library would apply:
   transform-only animation, spring easing, staggered orchestration, and a hard
   stop when the reader has asked for reduced motion.
   =========================================================================== */

/* Column A number -> Column B number. */
const ANSWER = { 1:5, 2:6, 3:3, 4:4, 5:2, 6:1 };
const TOTAL  = 6;

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const CALM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let picked = null;      // Column A number currently selected
const placed = {};      // slot number -> term number

/* ---------------------------------------------------------------- helpers */
function clearMarks(){
  $$('.def').forEach(d => d.classList.remove('right','wrong','shake'));
  $$('.tick').forEach(t => t.remove());
  const v = $('#verdict');
  v.hidden = true;
  v.classList.remove('all');
}

function paint(){
  $$('.slot').forEach(s => {
    const n = placed[s.dataset.slot];
    s.textContent = n || '';
    s.classList.toggle('filled', !!n);
  });
  const used = new Set(Object.values(placed).map(String));
  $$('.term').forEach(t => t.classList.toggle('placed', used.has(t.dataset.n)));
  const done = Object.keys(placed).length;
  $('#tally').innerHTML = `<b>${done}</b> of ${TOTAL} matched`;
}

function select(n){
  picked = (picked === n) ? null : n;
  $$('.term').forEach(t => {
    const on = t.dataset.n === String(picked);
    t.classList.toggle('picked', on);
    t.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  $$('.def').forEach(d => d.classList.toggle('armed', picked !== null && !placed[d.dataset.i]));
}

/* The one high-impact moment: the number flies from the word to the bracket. */
function fly(fromEl, toEl, label, done){
  if(CALM || !fromEl || !toEl){ done(); return; }
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.className = 'flier';
  ghost.textContent = label;
  ghost.style.left = a.left + 'px';
  ghost.style.top  = a.top  + 'px';
  document.body.appendChild(ghost);

  const dx = (b.left + b.width/2) - (a.left + a.width/2);
  const dy = (b.top  + b.height/2) - (a.top  + a.height/2);

  const anim = ghost.animate([
    { transform:'translate(0,0) scale(1)',                          opacity:1 },
    { transform:`translate(${dx*0.5}px, ${dy*0.5 - 26}px) scale(1.22)`, opacity:1, offset:.55 },
    { transform:`translate(${dx}px, ${dy}px) scale(.55)`,           opacity:0 }
  ], { duration:520, easing:'cubic-bezier(.22,1.2,.32,1)' });

  anim.onfinish = () => { ghost.remove(); done(); };
}

function assign(slot, defEl){
  clearMarks();

  if(picked === null){
    if(placed[slot]){ delete placed[slot]; paint(); select(null); }
    return;
  }
  const n = picked;
  const termEl = $(`.term[data-n="${n}"]`);

  fly(termEl && termEl.querySelector('.badge'), defEl.querySelector('.slot'), n, () => {
    for(const k in placed) if(placed[k] === n) delete placed[k];   // one place only
    placed[slot] = n;
    paint();
    const s = defEl.querySelector('.slot');
    s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop');
  });

  select(null);
}

/* ------------------------------------------------------------- interaction */
$$('.term').forEach(t => {
  const go = () => { clearMarks(); select(Number(t.dataset.n)); };
  t.addEventListener('click', go);
  t.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); go(); }
  });
});

$$('.def').forEach(d => {
  const go = () => assign(d.dataset.i, d);
  d.addEventListener('click', go);
  d.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); go(); }
  });
});

/* cursor spotlight on the cards */
if(!CALM){
  $$('.term, .def').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top)  + 'px');
    });
  });
}

/* ------------------------------------------------------------------ check */
$('#check').addEventListener('click', () => {
  clearMarks();
  let right = 0;
  const rows = $$('.def');

  rows.forEach((d, k) => {
    const slot = d.dataset.i, n = placed[slot];
    if(!n) return;
    const ok = ANSWER[n] === Number(slot);
    if(ok) right++;
    setTimeout(() => {
      d.classList.add(ok ? 'right' : 'wrong');
      if(!ok) d.classList.add('shake');
      const tick = document.createElement('span');
      tick.className = 'tick ' + (ok ? 'ok' : 'no');
      tick.textContent = ok ? '✓' : '✗';
      d.querySelector('.text').appendChild(tick);
    }, CALM ? 0 : k * 90);
  });

  const done = Object.keys(placed).length;
  const v = $('#verdict');
  v.hidden = false;
  v.classList.toggle('all', right === TOTAL);
  $('#msg').textContent =
      done < TOTAL ? `${TOTAL - done} still to match.`
    : right === TOTAL ? 'All six correct. Every word is matched to its meaning.'
    : 'Look again at the lines marked ✗, then move those numbers and check once more.';

  /* count the score up rather than snapping it */
  const el = $('#score');
  if(CALM){ el.textContent = right; return; }
  let cur = 0;
  el.textContent = '0';
  const step = () => {
    cur++;
    el.textContent = cur;
    if(cur < right) setTimeout(step, 90);
  };
  if(right > 0) setTimeout(step, rows.length * 90 + 120);
});

/* ------------------------------------------------------------------ clear */
$('#clear').addEventListener('click', () => {
  for(const k in placed) delete placed[k];
  select(null); clearMarks(); paint();
});

$('#print').addEventListener('click', () => window.print());

/* ------------------------------------------------- drifting motes backdrop */
(function motes(){
  if(CALM) return;
  const cv = $('#motes'), ctx = cv.getContext('2d');
  let w, h, dots = [], raf;

  const build = () => {
    w = cv.width  = innerWidth  * devicePixelRatio;
    h = cv.height = innerHeight * devicePixelRatio;
    const n = Math.min(58, Math.round(innerWidth / 26));
    dots = Array.from({length:n}, () => ({
      x: Math.random()*w,
      y: Math.random()*h,
      r: (Math.random()*1.7 + .5) * devicePixelRatio,
      vx:(Math.random()-.5) * .16 * devicePixelRatio,
      vy:-(Math.random()*.22 + .05) * devicePixelRatio,
      a: Math.random()*.4 + .12,
      hue: Math.random() < .3 ? '217,164,65' : '70,214,138'
    }));
  };

  const tick = () => {
    ctx.clearRect(0,0,w,h);
    for(const d of dots){
      d.x += d.vx; d.y += d.vy;
      if(d.y < -12) { d.y = h + 12; d.x = Math.random()*w; }
      if(d.x < -12) d.x = w + 12;
      if(d.x > w+12) d.x = -12;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${d.hue},${d.a})`;
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  };

  build(); tick();
  addEventListener('resize', build, {passive:true});
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) cancelAnimationFrame(raf); else tick();
  });
})();

/* ------------------------------------------------------------------- boot */
paint();
requestAnimationFrame(() => document.body.classList.add('ready'));
