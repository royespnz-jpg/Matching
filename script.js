"use strict";
/* ===========================================================================
   SUSTAINABILITY · MATCHING ACTIVITY

   Motion (motion.js, loaded before this file) drives the choreography:
   spring physics, staggered reveals, scroll-triggered entrances.
   If motion.js is missing or the reader has asked for reduced motion, the
   page drops to a static state and every feature still works.
   =========================================================================== */

/* Column A number -> Column B number */
const ANSWER = { 1:5, 2:6, 3:3, 4:4, 5:2, 6:1 };
const TOTAL  = 6;

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const CALM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const M    = window.Motion || null;
const LIVE = !!M && !CALM;                       // full choreography available
if(!LIVE) document.body.classList.add('no-motion');
/* Elements are only hidden once we know the choreography can run, and a
   failsafe below un-hides them no matter what. A broken animation must never
   leave the activity invisible. */
if(LIVE) document.documentElement.classList.add('anim-armed');
function revealAll(){ document.documentElement.classList.remove('anim-armed'); }

/* Motion's spring, with a sensible fallback easing */
const spring = (bounce = .28, duration = .7) =>
  LIVE ? { type: M.spring, bounce, duration } : { duration: .28 };

let picked = null;          // Column A number currently selected
const placed = {};          // slot number -> term number

/* ======================================================================= */
/*  Pictures — read from images.js, so there is no folder to upload        */
/* ======================================================================= */
(function paintPictures(){
  const bank = window.PICTURES || null;
  $$('.term').forEach(t => {
    const img = t.querySelector('img');
    const key = t.dataset.pic;
    const word = t.querySelector('.word').textContent.trim();
    img.alt = word;
    if(bank && bank[key]){ img.src = bank[key]; return; }
    /* images.js missing: draw a labelled placeholder rather than a broken icon */
    img.src = 'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100">
         <rect width="160" height="100" fill="#0d1a12"/>
         <path d="M80 62c0-16 10-26 24-26 0 16-10 26-24 26z" fill="#46D68A" opacity=".55"/>
         <path d="M80 62c0-14-9-23-21-23 0 14 9 23 21 23z" fill="#D9A441" opacity=".55"/>
         <text x="80" y="86" text-anchor="middle" fill="#7B8E80"
               font-family="monospace" font-size="9">${key}</text>
       </svg>`);
  });
})();

/* ======================================================================= */
/*  Board state                                                            */
/* ======================================================================= */
function clearMarks(){
  $$('.def').forEach(d => d.classList.remove('right','wrong'));
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
  $('#tally').textContent = `${done} of ${TOTAL} matched`;

  /* progress ring */
  const ring = $('#ring'), C = 2 * Math.PI * 19;
  const offset = C * (1 - done / TOTAL);
  if(LIVE) M.animate(ring, { strokeDashoffset: offset }, { duration:.6, easing:[.22,.9,.28,1] });
  else ring.style.strokeDashoffset = offset;
  $('#ringN').textContent = done;
}

function select(n){
  picked = (picked === n) ? null : n;
  $$('.term').forEach(t => {
    const on = t.dataset.n === String(picked);
    t.classList.toggle('picked', on);
    t.setAttribute('aria-pressed', on ? 'true' : 'false');
    if(LIVE) M.animate(t, { scale: on ? 1.015 : 1 }, spring(.4,.5));
  });
  $$('.def').forEach(d => d.classList.toggle('armed', picked !== null && !placed[d.dataset.i]));
}

/* Decorative only: a ghost number arcs from the word to the bracket.
   The board state is never gated on this finishing — see assign(). */
function fly(from, to, label){
  if(!LIVE || !from || !to) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.className = 'flier';
  ghost.textContent = label;
  ghost.style.left = a.left + 'px';
  ghost.style.top  = a.top  + 'px';
  document.body.appendChild(ghost);

  const dx = (b.left + b.width/2) - (a.left + a.width/2);
  const dy = (b.top  + b.height/2) - (a.top  + a.height/2);

  M.animate(ghost,
    { x:[0, dx*.5, dx], y:[0, dy*.5 - 30, dy], scale:[1, 1.25, .5], opacity:[1, 1, 0] },
    { duration:.56, easing:[.22,1.1,.3,1] });
  /* a timer, not the animation's promise — the ghost is always cleaned up
     even if the animation is throttled or interrupted */
  setTimeout(() => ghost.remove(), 800);
}

function assign(slot, defEl){
  clearMarks();

  if(picked === null){
    if(placed[slot]){ delete placed[slot]; paint(); select(null); }
    return;
  }
  const n = picked;
  const termEl = $(`.term[data-n="${n}"]`);
  const slotEl = defEl.querySelector('.slot');

  /* commit the move first, so it can never be lost to an animation */
  for(const k in placed) if(placed[k] === n) delete placed[k];     // one home only
  placed[slot] = n;
  paint();

  fly(termEl && termEl.querySelector('.badge'), slotEl, n);
  if(LIVE) M.animate(slotEl, { scale:[.55, 1] }, spring(.55,.6));

  select(null);
}

/* ======================================================================= */
/*  Interaction                                                            */
/* ======================================================================= */
$$('.term').forEach(t => {
  const go = () => { clearMarks(); select(Number(t.dataset.n)); };
  t.addEventListener('click', go);
  t.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); go(); }
  });
  if(LIVE){
    const img = t.querySelector('.shot img');
    t.addEventListener('pointerenter', () => {
      M.animate(t, { y:-3 }, spring(.5,.5));
      M.animate(img, { scale:1.07 }, spring(.3,.7));
    });
    t.addEventListener('pointerleave', () => {
      M.animate(t, { y:0 }, spring(.3,.6));
      M.animate(img, { scale:1 }, spring(.2,.6));
    });
    t.addEventListener('pointerdown', () => M.animate(t, { scale:.985 }, { duration:.12 }));
    t.addEventListener('pointerup',   () => M.animate(t, { scale:1 },    spring(.5,.4)));
  }
});

$$('.def').forEach(d => {
  const go = () => assign(d.dataset.i, d);
  d.addEventListener('click', go);
  d.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); go(); }
  });
  if(LIVE){
    d.addEventListener('pointerenter', () => M.animate(d, { y:-2 }, spring(.5,.5)));
    d.addEventListener('pointerleave', () => M.animate(d, { y:0  }, spring(.3,.6)));
  }
});

/* spotlight inside each card */
if(!CALM){
  $$('.term, .def').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top)  + 'px');
    });
  });
}

/* magnetic buttons — the pull is written straight to transform, and the
   spring-back is a CSS transition, so pointermove stays cheap */
if(LIVE){
  $$('.magnet').forEach(b => {
    const inner = b.querySelector('.btn-in');
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width/2);
      const my = e.clientY - (r.top  + r.height/2);
      b.classList.add('pulling');
      b.style.transform     = `translate3d(${mx*.22}px,${my*.32}px,0)`;
      inner.style.transform = `translate3d(${mx*.10}px,${my*.14}px,0)`;
    });
    b.addEventListener('pointerleave', () => {
      b.classList.remove('pulling');
      b.style.transform = inner.style.transform = 'translate3d(0,0,0)';
    });
  });
}

/* soft light trailing the cursor — one rAF loop, not an animation per move */
if(LIVE){
  const light = $('#cursorLight');
  let tx = innerWidth/2, ty = innerHeight/2, x = tx, y = ty, shown = false, running = false;
  addEventListener('pointermove', e => {
    tx = e.clientX; ty = e.clientY;
    if(!shown){ light.style.opacity = 1; shown = true; }
    if(!running){ running = true; requestAnimationFrame(loop); }
  }, {passive:true});
  function loop(){
    x += (tx - x) * .09; y += (ty - y) * .09;
    light.style.transform = `translate3d(${x}px,${y}px,0)`;
    if(Math.abs(tx-x) > .5 || Math.abs(ty-y) > .5) requestAnimationFrame(loop);
    else running = false;
  }
}

/* ======================================================================= */
/*  Check                                                                  */
/* ======================================================================= */
$('#check').addEventListener('click', () => {
  clearMarks();
  let right = 0;
  const rows = $$('.def');

  rows.forEach((d, k) => {
    const slot = d.dataset.i, n = placed[slot];
    if(!n) return;
    const ok = ANSWER[n] === Number(slot);
    if(ok) right++;

    const reveal = () => {
      d.classList.add(ok ? 'right' : 'wrong');
      const tick = document.createElement('span');
      tick.className = 'tick ' + (ok ? 'ok' : 'no');
      tick.textContent = ok ? '✓' : '✗';
      d.querySelector('.text').appendChild(tick);
      if(LIVE){
        M.animate(tick, { opacity:[0,1], scale:[.4,1] }, spring(.5,.5));
        if(ok) M.animate(d.querySelector('.slot'), { scale:[1,1.12,1] }, { duration:.45 });
        else   M.animate(d, { x:[0,-6,5,-4,3,0] }, { duration:.45 });
      }
    };
    LIVE ? setTimeout(reveal, k * 95) : reveal();
  });

  const done = Object.keys(placed).length;
  const v = $('#verdict');
  v.hidden = false;
  v.classList.toggle('all', right === TOTAL);
  $('#msg').textContent =
      done < TOTAL       ? `${TOTAL - done} still to match.`
    : right === TOTAL    ? 'All six correct. Every word is matched to its meaning.'
    :                      'Look again at the lines marked ✗, then move those numbers and check once more.';

  if(LIVE) M.animate(v, { opacity:[0,1], y:[18,0] }, spring(.3,.7));

  /* count the score up */
  const el = $('#score');
  if(!LIVE){ el.textContent = right; return; }
  el.textContent = '0';
  let cur = 0;
  const step = () => { el.textContent = ++cur; if(cur < right) setTimeout(step, 95); };
  if(right > 0) setTimeout(step, rows.length * 95 + 140);

  if(right === TOTAL) setTimeout(celebrate, rows.length * 95 + 320);
});

$('#clear').addEventListener('click', () => {
  for(const k in placed) delete placed[k];
  select(null); clearMarks(); paint();
});

$('#print').addEventListener('click', () => window.print());

/* ======================================================================= */
/*  Celebration — a short gold-and-jade burst on a perfect score           */
/* ======================================================================= */
function celebrate(){
  if(!LIVE) return;
  const cv = $('#burst'), ctx = cv.getContext('2d');
  const dpr = devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;

  const cx = cv.width / 2, cy = cv.height * .42;
  const bits = Array.from({length:120}, () => {
    const ang = Math.random() * Math.PI * 2;
    const sp  = (Math.random() * 7 + 2.5) * dpr;
    return { x:cx, y:cy, vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp - 2*dpr,
             r:(Math.random()*3 + 1.4) * dpr, life:1,
             c: Math.random() < .45 ? '217,164,65' : '70,214,138' };
  });

  $$('.term').forEach((t,i) =>
    setTimeout(() => M.animate(t, { scale:[1,1.03,1] }, { duration:.5 }), i*70));

  let t0 = null;
  const frame = ts => {
    if(t0 === null) t0 = ts;
    const dt = Math.min((ts - t0)/16.7, 3); t0 = ts;
    ctx.clearRect(0,0,cv.width,cv.height);
    let alive = false;
    for(const b of bits){
      b.life -= .012 * dt;
      if(b.life <= 0) continue;
      alive = true;
      b.vy += .16 * dpr * dt; b.vx *= .992;
      b.x += b.vx * dt; b.y += b.vy * dt;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * b.life, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${b.c},${b.life})`;
      ctx.fill();
    }
    if(alive) requestAnimationFrame(frame);
    else ctx.clearRect(0,0,cv.width,cv.height);
  };
  requestAnimationFrame(frame);
}

/* ======================================================================= */
/*  Drifting motes backdrop                                                */
/* ======================================================================= */
(function motes(){
  if(CALM) return;
  const cv = $('#motes'), ctx = cv.getContext('2d');
  let w, h, dots = [], raf = null;

  const build = () => {
    const dpr = devicePixelRatio || 1;
    w = cv.width = innerWidth * dpr; h = cv.height = innerHeight * dpr;
    const n = Math.min(60, Math.round(innerWidth / 25));
    dots = Array.from({length:n}, () => ({
      x:Math.random()*w, y:Math.random()*h,
      r:(Math.random()*1.7 + .5)*dpr,
      vx:(Math.random()-.5)*.16*dpr, vy:-(Math.random()*.22 + .05)*dpr,
      a:Math.random()*.4 + .12,
      c:Math.random() < .3 ? '217,164,65' : '70,214,138'
    }));
  };
  const tick = () => {
    ctx.clearRect(0,0,w,h);
    for(const d of dots){
      d.x += d.vx; d.y += d.vy;
      if(d.y < -12){ d.y = h + 12; d.x = Math.random()*w; }
      if(d.x < -12) d.x = w + 12;
      if(d.x > w + 12) d.x = -12;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${d.c},${d.a})`; ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  };
  build(); tick();
  addEventListener('resize', build, {passive:true});
  document.addEventListener('visibilitychange', () => {
    if(document.hidden){ cancelAnimationFrame(raf); raf = null; }
    else if(raf === null) tick();
  });
})();

/* ======================================================================= */
/*  Entrance choreography                                                  */
/* ======================================================================= */
paint();

if(LIVE){
  const { animate, stagger, inView } = M;
  const EASE = [.22, 1, .3, 1];

  const revealCol = (col, start) => {
    animate(`${col} .col-head`, { opacity:[0,1], y:[14,0] }, { duration:.6, easing:EASE });
    animate(`${col} .term, ${col} .def`, { opacity:[0,1], y:[26,0], scale:[.97,1] },
      { delay: stagger(.075, {start}), duration:.8, easing:EASE });
  };

  try{
    animate('.masthead [data-anim]', { opacity:[0,1], y:[26,0] },
      { delay: stagger(.09, {start:.05}), duration:.85, easing:EASE });

    animate('h1 .line > span', { opacity:[0,1], y:['110%','0%'] },
      { delay: stagger(.11, {start:.12}), duration:.95, easing:EASE });

    animate('.toolbar', { opacity:[0,1], y:[20,0] }, { delay:.45, duration:.8, easing:EASE });

    /* columns arrive as they scroll in — but only where the browser can watch */
    if(typeof IntersectionObserver !== 'undefined'){
      inView('.col-a', () => revealCol('.col-a', .10), { amount:.12 });
      inView('.col-b', () => revealCol('.col-b', .16), { amount:.12 });
    } else {
      revealCol('.col-a', .10); revealCol('.col-b', .16);
    }

    /* the two glows breathe */
    animate('.glow-a', { x:[0,'7vw'], y:[0,'6vh'], scale:[1,1.14] },
      { duration:26, repeat:Infinity, repeatType:'mirror', easing:'ease-in-out' });
    animate('.glow-b', { x:[0,'-6vw'], y:[0,'-7vh'], scale:[1,1.1] },
      { duration:32, repeat:Infinity, repeatType:'mirror', easing:'ease-in-out' });
  }catch(err){
    /* anything unexpected: show the page rather than an empty screen */
    revealAll();
  }

  /* belt and braces — nothing stays hidden past three seconds */
  setTimeout(revealAll, 3000);
} else {
  revealAll();
}
