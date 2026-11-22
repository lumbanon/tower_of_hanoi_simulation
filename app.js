'use strict';
(function () {
  // ===========================================================================
  // Constants & helpers
  // ===========================================================================
  const PEG = ['A', 'B', 'C'];
  const MIN_N = 1;
  const MAX_N = 10;
  const HUES = [0, 26, 44, 92, 158, 188, 212, 248, 282, 322];
  const ROLE_TEXT = { from: 'from', to: 'to', via: 'spare' };

  const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reducedMotion = () => !!(motionQuery && motionQuery.matches);

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    const e = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  const pow2 = (k) => Math.pow(2, k);
  const fmt = (x) => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const last = (arr) => arr[arr.length - 1];
  const disksUpTo = (m) => (m === 1 ? 'disk 1' : `disks 1–${m}`);
  const sig = (k, f, t, v) => `hanoi(${k}, ${PEG[f]}, ${PEG[t]}, ${PEG[v]})`;
  const csig = (k, f, t, v) => `<code>${sig(k, f, t, v)}</code>`;
  const diskColor = (d) => `hsl(${HUES[(d - 1) % HUES.length]} 72% 60%)`;
  function shortenTerms(arr) {
    return arr.length > 7 ? arr.slice(0, 3).concat(['⋯'], arr.slice(-2)) : arr;
  }

  // ===========================================================================
  // The recursive algorithm, recorded step by step.
  //
  // We run the real recursion once and take a "snapshot" at every interesting
  // point (entering a call, each of its three steps, returning). The watch mode
  // simply moves back and forth through these snapshots.
  // ===========================================================================
  function buildTrace(n) {
    const pegs = [[], [], []];
    for (let d = n; d >= 1; d--) pegs[0].push(d);
    const stack = [];
    const steps = [];
    const nodes = [];
    let moves = 0;

    function snap(line, msg, move) {
      steps.push({
        pegs: pegs.map((p) => p.slice()),
        stack: stack.map((f) => Object.assign({}, f)),
        line, msg, moves,
        move: move || null,
      });
    }
    function moveDisk(from, to) {
      pegs[to].push(pegs[from].pop());
      moves++;
    }

    function hanoi(k, from, to, via, parent) {
      const node = { id: nodes.length, n: k, from, to, via, parent, depth: stack.length, moveIndex: 0, callStep: steps.length, moveStep: 0, retStep: 0 };
      nodes.push(node);
      const frame = { id: node.id, n: k, from, to, via, phase: 'enter' };
      stack.push(frame);
      const F = PEG[from], T = PEG[to], V = PEG[via];

      snap(1, `Call ${csig(k, from, to, via)}: move ${k === 1 ? 'disk 1' : disksUpTo(k)} from ${F} to ${T}, with ${V} as the spare peg.`);

      if (k === 1) {
        frame.phase = 'base';
        moveDisk(from, to);
        node.moveIndex = moves;
        node.moveStep = steps.length;
        snap(3, `Base case: <i>n</i> is 1, so there is nothing left to split up. Just move disk 1 from ${F} to ${T}. <b>(move #${moves})</b>`, { disk: 1, from, to });
      } else {
        frame.phase = 'step1';
        snap(6, `Step 1: disk ${k} is buried under ${disksUpTo(k - 1)}. Move them out of the way, from ${F} to the spare ${V}. That is the same puzzle with one disk fewer, so call ${csig(k - 1, from, via, to)}.`);
        hanoi(k - 1, from, via, to, node.id);

        frame.phase = 'step2';
        moveDisk(from, to);
        node.moveIndex = moves;
        node.moveStep = steps.length;
        snap(7, `Step 2, back in ${csig(k, from, to, via)}: disk ${k} is uncovered and ${T} has no smaller disk on it, so move disk ${k} from ${F} to ${T}. <b>(move #${moves})</b>`, { disk: k, from, to });

        frame.phase = 'step3';
        snap(8, `Step 3: put ${disksUpTo(k - 1)} back on top of disk ${k}, moving them from ${V} to ${T}. The same smaller puzzle again, so call ${csig(k - 1, via, to, from)}.`);
        hanoi(k - 1, via, to, from, node.id);
      }

      frame.phase = 'done';
      node.retStep = steps.length;
      const p = parent >= 0 ? nodes[parent] : null;
      snap(k === 1 ? 4 : 9, `${csig(k, from, to, via)} is finished: ${k === 1 ? 'disk 1 is' : disksUpTo(k) + ' are'} on ${T}. ` +
        (p ? `Return to the caller, ${csig(p.n, p.from, p.to, p.via)}.` : 'This was the top-level call, so the whole puzzle is solved.'));
      stack.pop();
    }

    snap(0, `Ready to run ${csig(n, 0, 2, 1)}: move ${n === 1 ? 'disk 1' : `all ${n} disks`} from A to C, using B as the spare. Press <b>Play</b> or <b>Next</b>.`);
    hanoi(n, 0, 2, 1, -1);
    snap(0, `Done! ${n === 1 ? '1 disk' : `${n} disks`} moved from A to C in ${fmt(moves)} moves: exactly 2<sup>${n}</sup> − 1 = ${fmt(pow2(n) - 1)}.`);
    return { n, steps, nodes, total: moves };
  }

  // ===========================================================================
  // State & DOM
  // ===========================================================================
  const app = {
    mode: 'watch',
    n: 3,
    trace: null,
    step: 0,
    playing: false,
    timer: 0,
    byMove: false,
    speed: 3,
    play: null,
  };

  const stage = $('#stage');
  const zones = $$('.zone', stage);
  const pegEls = $$('.peg', stage);
  const baseEl = $('.base', stage);
  const pegLabels = $$('.peg-label');
  const narration = $('#narration');
  const stageNote = $('#stage-note');
  const nOut = $('#n-out');
  const nMinus = $('#n-minus');
  const nPlus = $('#n-plus');
  const tabWatch = $('#tab-watch');
  const tabPlay = $('#tab-play');
  const watchControls = $('#watch-controls');
  const playControls = $('#play-controls');
  const codeCard = $('#code-card');
  const stackCard = $('#stack-card');
  const thinkCard = $('#think-card');
  const treeCard = $('#tree-card');
  const btnStart = $('#btn-start');
  const btnBack = $('#btn-back');
  const btnPlay = $('#btn-play');
  const btnNext = $('#btn-next');
  const btnEnd = $('#btn-end');
  const playLabel = $('#btn-play .txt');
  const scrub = $('#scrub');
  const speedInput = $('#speed');
  const progStep = $('#prog-step');
  const progMove = $('#prog-move');
  const segBtns = $$('.seg button');
  const codeEl = $('#code');
  const callDetail = $('#call-detail');
  const frameInfo = $('#frame-info');
  const stackEl = $('#stack');
  const treeWrap = $('#tree-wrap');
  const treeSvg = $('#tree');
  const tallyEq = $('#tally-eq');
  const tps = [$('#tp1'), $('#tp2'), $('#tp3')].map((e) => ({ box: e, fill: $('.fill', e), label: $('.tl', e) }));
  const stMoves = $('#st-moves');
  const stMin = $('#st-min');
  const stLeft = $('#st-left');
  const btnUndo = $('#btn-undo');
  const btnHint = $('#btn-hint');
  const btnRestart = $('#btn-restart');
  const dcEl = $('#disk-counts');
  const dcSum = $('#disk-sum');
  const unrollEl = $('#unroll');
  const growthBody = $('#growth tbody');

  // ===========================================================================
  // Board: geometry, disks, animation
  // ===========================================================================
  let geom = null;
  let diskEls = [];
  let diskPos = [];

  function computeGeom() {
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const baseH = 14;
    const headroom = 46;
    const pegH = H - baseH - headroom;
    const dh = clamp((pegH - 14) / app.n, 8, 28);
    const col = W / 3;
    const maxW = Math.min(col - 12, 230);
    const minW = Math.max(28, maxW * 0.28);
    return { W, H, baseH, pegH, dh, col, maxW, minW, cx: [col / 2, col * 1.5, col * 2.5], liftY: baseH + pegH + 10 };
  }

  function layoutStatic() {
    geom = computeGeom();
    pegEls.forEach((p, i) => {
      p.style.left = (geom.cx[i] - 5) + 'px';
      p.style.bottom = geom.baseH + 'px';
      p.style.height = geom.pegH + 'px';
    });
    baseEl.style.height = geom.baseH + 'px';
  }

  function diskWidth(d) {
    if (app.n === 1) return (geom.minW + geom.maxW) / 2;
    return geom.minW + (d - 1) * (geom.maxW - geom.minW) / (app.n - 1);
  }

  function buildDisks() {
    diskEls.forEach((e) => e && e.remove());
    diskEls = [];
    diskPos = [];
    for (let d = 1; d <= app.n; d++) {
      const e = el('div', 'disk', String(d));
      e.style.background = diskColor(d);
      stage.appendChild(e);
      diskEls[d] = e;
      diskPos[d] = null;
    }
  }

  // Put every disk where `pegs` says. If exactly one disk changes peg, animate
  // it (lift, slide across, drop). Bigger jumps are applied instantly.
  function placeDisks(pegs, opts) {
    const o = opts || {};
    const g = geom;
    const target = [];
    pegs.forEach((stack, i) => stack.forEach((d, lvl) => {
      const w = diskWidth(d);
      const lifted = i === o.lift && lvl === stack.length - 1;
      target[d] = { peg: i, left: g.cx[i] - w / 2, bottom: lifted ? g.liftY : g.baseH + lvl * g.dh, w };
    }));

    let pegChanges = 0;
    for (let d = 1; d <= app.n; d++) if (diskPos[d] && diskPos[d].peg !== target[d].peg) pegChanges++;
    const animate = !!o.animate && !reducedMotion() && pegChanges <= 1;
    const fontSize = clamp(g.dh - 5, 9, 13);

    for (let d = 1; d <= app.n; d++) {
      const e = diskEls[d];
      const t = target[d];
      const prev = diskPos[d];
      e.style.width = t.w + 'px';
      e.style.height = g.dh + 'px';
      e.style.fontSize = fontSize + 'px';
      e.style.lineHeight = g.dh + 'px';
      const moved = !prev || prev.left !== t.left || prev.bottom !== t.bottom;
      if (moved) {
        if (e.getAnimations) e.getAnimations().forEach((a) => a.cancel());
        e.style.left = t.left + 'px';
        e.style.bottom = t.bottom + 'px';
        if (animate && prev && e.animate) {
          const A = { left: prev.left + 'px', bottom: prev.bottom + 'px' };
          const B = { left: t.left + 'px', bottom: t.bottom + 'px' };
          let frames;
          let dur = o.dur || 400;
          if (prev.peg !== t.peg && !o.straight) {
            const up = { left: prev.left + 'px', bottom: g.liftY + 'px' };
            const over = { left: t.left + 'px', bottom: g.liftY + 'px' };
            frames = prev.bottom >= g.liftY - 0.5
              ? [A, Object.assign({ offset: 0.55 }, over), B]
              : [A, Object.assign({ offset: 0.3 }, up), Object.assign({ offset: 0.7 }, over), B];
          } else {
            frames = [A, B];
            dur = Math.min(dur, 200);
          }
          e.animate(frames, { duration: dur, easing: 'ease-in-out' });
        }
      }
      diskPos[d] = t;
    }
  }

  function setRoles(roles) {
    pegLabels.forEach((lab, i) => {
      const r = roles[i] || '';
      lab.dataset.role = r;
      $('.role', lab).textContent = r ? ROLE_TEXT[r] : '';
    });
    zones.forEach((z, i) => { z.dataset.role = roles[i] || ''; });
  }

  function say(html, tone) {
    narration.className = 'narration' + (tone ? ' ' + tone : '');
    narration.innerHTML = html;
  }

  // ===========================================================================
  // Watch mode
  // ===========================================================================
  const CODE = [
    ['function hanoi(n, from, to, via) {'],
    ['  if (n === 1) {', 'base case'],
    ['    move(1, from, to);'],
    ['    return;'],
    ['  }'],
    ['  hanoi(n - 1, from, via, to);', 'step 1'],
    ['  move(n, from, to);', 'step 2'],
    ['  hanoi(n - 1, via, to, from);', 'step 3'],
    ['}'],
  ].map(([c, cm]) => (cm ? c.padEnd(31) + '// ' + cm : c));

  function highlight(src) {
    const esc = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return esc.replace(/(\/\/.*$)|\b(function|if|return)\b|\b(hanoi|move)\b|\b(\d+)\b/g, (m, com, kw, fn, num) => {
      if (com) return `<span class="t-com">${com}</span>`;
      if (kw) return `<span class="t-kw">${kw}</span>`;
      if (fn) return `<span class="t-fn">${fn}</span>`;
      if (num) return `<span class="t-num">${num}</span>`;
      return m;
    });
  }

  let codeRows = [];
  function buildCode() {
    codeEl.innerHTML = '';
    codeRows = CODE.map((src, i) => {
      const row = el('div', 'ln');
      row.innerHTML = `<span class="no">${i + 1}</span><span class="src">${highlight(src)}</span>`;
      codeEl.appendChild(row);
      return row;
    });
  }

  function curStep() { return app.trace.steps[app.step]; }

  function renderWatch(animate) {
    const st = curStep();
    placeDisks(st.pegs, { animate, dur: animDuration() });
    const top = last(st.stack);

    const roles = ['', '', ''];
    if (top) { roles[top.from] = 'from'; roles[top.to] = 'to'; roles[top.via] = 'via'; }
    setRoles(roles);
    for (let d = 1; d <= app.n; d++) {
      diskEls[d].classList.toggle('frozen', !!top && d > top.n);
      diskEls[d].classList.toggle('just', !!st.move && st.move.disk === d);
    }

    say(st.msg, app.step === app.trace.steps.length - 1 ? 'good' : '');
    codeRows.forEach((row, i) => row.classList.toggle('cur', i + 1 === st.line));
    frameInfo.textContent = top ? `depth ${st.stack.length - 1}` : '';
    renderCallDetail(top);
    renderStack(st);
    updateTree(st);
    updateTally(st.moves);
    updateDiskCounts(st.moves);

    const lastIdx = app.trace.steps.length - 1;
    scrub.value = app.step;
    progStep.textContent = `Step ${fmt(app.step)} of ${fmt(lastIdx)}`;
    progMove.textContent = `Move ${fmt(st.moves)} of ${fmt(app.trace.total)}`;
    btnStart.disabled = btnBack.disabled = app.step === 0;
    btnNext.disabled = btnEnd.disabled = app.step === lastIdx;
  }

  function renderCallDetail(top) {
    callDetail.innerHTML = '';
    if (!top) {
      callDetail.appendChild(el('p', 'muted', app.step === 0 ? 'No call is running yet.' : 'Every call has returned. The stack is empty.'));
      return;
    }
    const k = top.n, F = top.from, T = top.to, V = top.via;
    const head = el('div', 'cd-head');
    head.innerHTML = `The running call with its values plugged in: ${csig(k, F, T, V)}`;
    callDetail.appendChild(head);

    let items;
    if (k === 1) {
      items = [{ label: 'base', html: `move disk 1: ${PEG[F]} → ${PEG[T]}`, state: top.phase === 'base' ? 'now' : top.phase === 'done' ? 'done' : '' }];
    } else {
      const p = ['enter', 'step1', 'step2', 'step3', 'done'].indexOf(top.phase);
      items = [
        { label: 'step 1', html: `<code>${sig(k - 1, F, V, T)}</code>`, sub: `${disksUpTo(k - 1)}: ${PEG[F]} → ${PEG[V]}`, i: 1 },
        { label: 'step 2', html: `move disk ${k}: ${PEG[F]} → ${PEG[T]}`, i: 2 },
        { label: 'step 3', html: `<code>${sig(k - 1, V, T, F)}</code>`, sub: `${disksUpTo(k - 1)}: ${PEG[V]} → ${PEG[T]}`, i: 3 },
      ].map((it) => Object.assign(it, { state: p > it.i ? 'done' : p === it.i ? 'now' : '' }));
    }
    const list = el('ol', 'cd-list');
    items.forEach((it) => {
      const li = el('li', 'cd-item' + (it.state ? ' ' + it.state : ''));
      li.innerHTML = `<span class="cd-lbl">${it.label}</span><span>${it.html}</span>` + (it.sub ? `<span class="cd-sub">${it.sub}</span>` : '');
      list.appendChild(li);
    });
    callDetail.appendChild(list);
  }

  function phaseText(f, isTop) {
    const k = f.n, F = f.from, T = f.to, V = f.via;
    switch (f.phase) {
      case 'enter': return 'just called';
      case 'base': return 'base case: moving disk 1';
      case 'step1': return (isTop ? 'step 1: about to call ' : 'step 1: waiting for ') + sig(k - 1, F, V, T);
      case 'step2': return `step 2: moving disk ${k}`;
      case 'step3': return (isTop ? 'step 3: about to call ' : 'step 3: waiting for ') + sig(k - 1, V, T, F);
      case 'done': return 'finished, returning';
    }
    return '';
  }

  function renderStack(st) {
    stackEl.innerHTML = '';
    if (!st.stack.length) {
      stackEl.appendChild(el('li', 'empty', app.step === 0 ? 'Empty: nothing has been called yet.' : 'Empty: every call has returned.'));
      return;
    }
    for (let i = st.stack.length - 1; i >= 0; i--) {
      const f = st.stack[i];
      const isTop = i === st.stack.length - 1;
      const li = el('li', 'frame' + (isTop ? ' cur' : ''));
      li.append(el('code', null, sig(f.n, f.from, f.to, f.via)), el('span', 'depth', `depth ${i}`), el('span', 'phase', phaseText(f, isTop)));
      stackEl.appendChild(li);
    }
  }

  // ---------- playback ----------
  function stepDelay() { return Math.round(2000 * Math.pow(40 / 2000, (app.speed - 1) / 9)); }
  function animDuration() { return clamp(stepDelay() * 0.8, 90, 520); }

  function setPlaying(on) {
    app.playing = on;
    btnPlay.classList.toggle('playing', on);
    playLabel.textContent = on ? 'Pause' : 'Play';
    btnPlay.setAttribute('aria-label', on ? 'Pause' : 'Play');
    narration.setAttribute('aria-live', on ? 'off' : 'polite');
    clearTimeout(app.timer);
    if (on) app.timer = setTimeout(tick, Math.min(stepDelay(), 250));
  }
  function tick() {
    if (!app.playing) return;
    if (!advance(1) || app.step >= app.trace.steps.length - 1) { setPlaying(false); return; }
    app.timer = setTimeout(tick, stepDelay());
  }
  function togglePlay() {
    if (app.playing) { setPlaying(false); return; }
    if (app.step >= app.trace.steps.length - 1) { app.step = 0; renderWatch(false); }
    setPlaying(true);
  }
  function advance(dir) {
    const steps = app.trace.steps;
    let i = app.step;
    if (dir > 0) {
      if (i >= steps.length - 1) return false;
      i++;
      if (app.byMove) while (i < steps.length - 1 && !steps[i].move) i++;
    } else {
      if (i <= 0) return false;
      i--;
      if (app.byMove) while (i > 0 && !steps[i].move) i--;
    }
    app.step = i;
    renderWatch(true);
    return true;
  }
  function goTo(i, animate) {
    app.step = clamp(i, 0, app.trace.steps.length - 1);
    renderWatch(animate);
  }

  // ===========================================================================
  // Recursion tree (x position = move number, y position = recursion depth)
  // ===========================================================================
  let tree = null;

  function buildTree() {
    const t = app.trace;
    const n = t.n;
    const slots = pow2(n);
    const avail = Math.max(280, treeWrap.clientWidth - 2);
    const full = n <= 5;
    const sx = full ? Math.max(62, avail / slots) : Math.max(n >= 9 ? 11 : 15, avail / slots);
    const sy = full ? 62 : 40;
    const bw = full ? Math.min(sx - 8, 64) : 0;
    const bh = 38;
    const r = full ? 0 : Math.min(sx * 0.42, 12);
    const half = full ? bh / 2 : r;
    const top = half + 10;
    const width = Math.round(slots * sx);
    const axisY = top + (n - 1) * sy + half + 20;
    const height = Math.round(axisY + 10);

    treeSvg.innerHTML = '';
    treeSvg.setAttribute('width', width);
    treeSvg.setAttribute('height', height);
    treeSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const gEdges = svgEl('g');
    const gNodes = svgEl('g');
    const gAxis = svgEl('g', { class: 'axis' });
    const pos = t.nodes.map((nd) => ({ x: nd.moveIndex * sx, y: top + nd.depth * sy }));
    const nodeEls = [];
    const edgeEls = [];

    t.nodes.forEach((nd, i) => {
      if (nd.parent >= 0) {
        const a = pos[nd.parent], b = pos[i];
        const y1 = a.y + half, y2 = b.y - half, ym = (y1 + y2) / 2;
        const path = svgEl('path', { d: `M${a.x},${y1} C${a.x},${ym} ${b.x},${ym} ${b.x},${y2}`, class: 'edge todo' });
        gEdges.appendChild(path);
        edgeEls[i] = path;
      }
      const g = svgEl('g', { class: 'tnode todo', transform: `translate(${pos[i].x},${pos[i].y})`, 'data-id': i });
      if (full) g.setAttribute('tabindex', '0');
      const title = svgEl('title');
      title.textContent = `${sig(nd.n, nd.from, nd.to, nd.via)}: its step 2 is move #${nd.moveIndex} (disk ${nd.n}, ${PEG[nd.from]} → ${PEG[nd.to]})`;
      g.appendChild(title);
      if (full) {
        g.appendChild(svgEl('rect', { x: -bw / 2, y: -bh / 2, width: bw, height: bh, rx: 8 }));
        const t1 = svgEl('text', { y: -3, class: 'l1' });
        t1.textContent = `n=${nd.n}`;
        const t2 = svgEl('text', { y: 13 });
        t2.textContent = `${PEG[nd.from]}→${PEG[nd.to]}`;
        g.append(t1, t2);
      } else {
        g.appendChild(svgEl('circle', { r }));
        if (r >= 7) {
          const tx = svgEl('text', { y: 4, class: 'l1' });
          tx.textContent = nd.n;
          g.appendChild(tx);
        }
      }
      gNodes.appendChild(g);
      nodeEls[i] = g;
    });

    let every = 1;
    while (every * sx < 26) every *= 2;
    const axisEls = [];
    for (let m = 1; m < slots; m++) {
      if (m !== 1 && m % every !== 0) continue;
      const tx = svgEl('text', { x: m * sx, y: axisY });
      tx.textContent = m;
      gAxis.appendChild(tx);
      axisEls.push({ m, el: tx });
    }

    treeSvg.append(gEdges, gNodes, gAxis);
    tree = { sx, nodeEls, edgeEls, axisEls, cls: [], axisDone: [] };
  }

  function updateTree(st) {
    if (!tree) return;
    const nodes = app.trace.nodes;
    const s = app.step;
    const topId = st.stack.length ? last(st.stack).id : -1;
    const onStack = new Set(st.stack.map((f) => f.id));
    for (let i = 0; i < nodes.length; i++) {
      const c = i === topId ? 'cur' : onStack.has(i) ? 'wait' : s > nodes[i].retStep ? 'done' : 'todo';
      if (tree.cls[i] !== c) {
        tree.cls[i] = c;
        tree.nodeEls[i].setAttribute('class', 'tnode ' + c);
        if (tree.edgeEls[i]) tree.edgeEls[i].setAttribute('class', 'edge ' + c);
      }
    }
    tree.axisEls.forEach((a, j) => {
      const done = a.m <= st.moves;
      if (tree.axisDone[j] !== done) {
        tree.axisDone[j] = done;
        a.el.setAttribute('class', done ? 'done' : '');
      }
    });
    if (topId >= 0 && treeWrap.scrollWidth > treeWrap.clientWidth + 2 && !treeCard.hidden) {
      const x = nodes[topId].moveIndex * tree.sx;
      const L = treeWrap.scrollLeft, W = treeWrap.clientWidth;
      if (x < L + 50 || x > L + W - 50) {
        const fast = app.playing && stepDelay() < 250;
        treeWrap.scrollTo({ left: x - W / 2, behavior: fast || reducedMotion() ? 'auto' : 'smooth' });
      }
    }
  }

  function jumpToNode(id) {
    const nd = app.trace.nodes[id];
    if (!nd) return;
    setPlaying(false);
    goTo(nd.moveStep, true);
  }

  // ===========================================================================
  // Formula panels
  // ===========================================================================
  function setupTally() {
    const n = app.n, half = pow2(n - 1) - 1, total = pow2(n) - 1;
    tallyEq.innerHTML = n === 1
      ? 'T(1) = 1 (base case: a single move)'
      : `T(${n}) = T(${n - 1}) + 1 + T(${n - 1}) = ${fmt(half)} + 1 + ${fmt(half)} = <b>${fmt(total)}</b>`;
    tps[0].box.hidden = tps[2].box.hidden = n === 1;
  }

  function updateTally(m) {
    const n = app.n, half = pow2(n - 1) - 1;
    const a = Math.min(m, half);
    const b = m > half ? 1 : 0;
    const c = clamp(m - half - 1, 0, half);
    tps[0].fill.style.width = half ? (a / half * 100) + '%' : '0';
    tps[1].fill.style.width = (b * 100) + '%';
    tps[2].fill.style.width = half ? (c / half * 100) + '%' : '0';
    tps[0].label.textContent = `Step 1 · ${fmt(a)} / ${fmt(half)}`;
    tps[1].label.textContent = `disk ${n}`;
    tps[2].label.textContent = `Step 3 · ${fmt(c)} / ${fmt(half)}`;
    tps[0].box.title = `Step 1: hanoi(${n - 1}, A, B, C) takes T(${n - 1}) = ${fmt(half)} moves`;
    tps[1].box.title = `Step 2: move disk ${n} from A to C, 1 move`;
    tps[2].box.title = `Step 3: hanoi(${n - 1}, B, C, A) takes T(${n - 1}) = ${fmt(half)} moves`;
  }

  let dcRows = [];
  function buildDiskCounts() {
    const n = app.n;
    dcEl.innerHTML = '';
    dcRows = [];
    for (let k = 1; k <= n; k++) {
      const total = pow2(n - k);
      const row = el('div', 'dc-row');
      const label = el('span', 'dc-k');
      const dot = el('i');
      dot.style.background = diskColor(k);
      label.append(dot, document.createTextNode(`Disk ${k}`));
      const wrap = el('div');
      const track = el('div', 'dc-track');
      track.style.width = (total / pow2(n - 1) * 100) + '%';
      const fill = el('div', 'dc-fill');
      fill.style.background = diskColor(k);
      track.appendChild(fill);
      wrap.appendChild(track);
      const num = el('span', 'dc-num');
      row.append(label, wrap, num);
      dcEl.appendChild(row);
      dcRows.push({ k, total, fill, num });
    }
    const terms = [];
    for (let k = 1; k <= n; k++) terms.push(fmt(pow2(n - k)));
    dcSum.innerHTML = `${shortenTerms(terms).join(' + ')} = <b>${fmt(pow2(n) - 1)}</b> = 2<sup>${n}</sup> − 1`;
  }

  // Disk k moves on move numbers 2^(k-1) · (odd number), so after m moves it
  // has moved floor((m + 2^(k-1)) / 2^k) times.
  function updateDiskCounts(m) {
    dcRows.forEach((r) => {
      const c = Math.floor((m + pow2(r.k - 1)) / pow2(r.k));
      r.fill.style.width = (c / r.total * 100) + '%';
      r.num.textContent = `${fmt(c)} / ${fmt(r.total)}`;
    });
  }

  function renderUnroll() {
    const n = app.n;
    const terms = (j) => {
      const arr = [];
      for (let e = j - 1; e >= 0; e--) arr.push(fmt(pow2(e)));
      return shortenTerms(arr).join(' + ');
    };
    const rows = [];
    if (n === 1) {
      rows.push(['T(1)', '= 1 = 2<sup>1</sup> − 1']);
    } else {
      rows.push([`T(${n})`, `= 2·T(${n - 1}) + 1`]);
      for (let j = 2; j <= n - 1; j++) rows.push(['', `= ${fmt(pow2(j))}·T(${n - j}) + ${terms(j)}`]);
      rows.push(['', `= ${terms(n)} <span class="muted">(using T(1) = 1)</span>`]);
      rows.push(['', `= <b>${fmt(pow2(n) - 1)}</b> = 2<sup>${n}</sup> − 1`]);
    }
    unrollEl.innerHTML = rows.map(([l, r]) => `<span>${l}</span><span>${r}</span>`).join('');
    $$('.nval').forEach((e) => { e.textContent = n; });
  }

  function duration(s) {
    const unit = (v, name) => `${v} ${name}${v === 1 ? '' : 's'}`;
    const MIN = 60, HR = 3600, DAY = 86400, YR = 365.25 * DAY;
    if (s < MIN) return unit(s, 'second');
    if (s < HR) return 'about ' + unit(Math.round(s / MIN), 'minute');
    if (s < DAY) return 'about ' + unit(Math.round(s / HR), 'hour');
    if (s < YR) return 'about ' + unit(Math.round(s / DAY), 'day');
    const y = s / YR;
    if (y < 1e3) return 'about ' + unit(Math.round(y), 'year');
    if (y < 1e6) return `about ${Math.round(y / 1e3)} thousand years`;
    if (y < 1e9) return `about ${Math.round(y / 1e6)} million years`;
    return `about ${Math.round(y / 1e9)} billion years`;
  }

  function renderGrowth() {
    const rows = Array.from(new Set([3, 5, 8, 10, 20, 32, 64, app.n])).sort((a, b) => a - b);
    growthBody.innerHTML = rows.map((k) => {
      const exact = typeof BigInt === 'function' ? ((BigInt(1) << BigInt(k)) - BigInt(1)).toString() : String(pow2(k) - 1);
      return `<tr class="${k === app.n ? 'cur' : ''}"><td>${k}${k === app.n ? ' (now)' : ''}</td><td>${fmt(exact)}</td><td>${duration(pow2(k) - 1)}</td></tr>`;
    }).join('');
  }

  // ===========================================================================
  // Play mode
  // ===========================================================================
  function newPlay() {
    const pegs = [[], [], []];
    for (let d = app.n; d >= 1; d--) pegs[0].push(d);
    app.play = { pegs, moves: 0, history: [], sel: -1, won: false, hint: null };
  }

  function diskPositions(pegs) {
    const pos = [];
    pegs.forEach((p, i) => p.forEach((d) => { pos[d] = i; }));
    return pos;
  }

  // Fewest moves to get every disk onto `target` from any legal position.
  // Look at the biggest disk: if it's already on target, ignore it. Otherwise it
  // needs one move, after which the k-1 smaller disks must be rebuilt on top of
  // it (2^(k-1) - 1 moves), and before that they must gather on the other peg.
  function bestRemaining(pegs, n, target) {
    const pos = diskPositions(pegs);
    let total = 0, tgt = target;
    for (let k = n; k >= 1; k--) {
      if (pos[k] === tgt) continue;
      total += pow2(k - 1);
      tgt = 3 - pos[k] - tgt;
    }
    return total;
  }

  // The optimal next move, plus the chain of recursive sub-goals behind it.
  function bestNext(pegs, n, target) {
    const pos = diskPositions(pegs);
    const chain = [];
    let tgt = target;
    for (let k = n; k >= 1; k--) {
      if (pos[k] === tgt) continue;
      const other = 3 - pos[k] - tgt;
      chain.push({ disk: k, to: tgt, other });
      let clear = true;
      for (let j = 1; j < k; j++) if (pos[j] !== other) { clear = false; break; }
      if (clear) return { move: { disk: k, from: pos[k], to: tgt }, chain };
      tgt = other;
    }
    return null;
  }

  function renderPlay(animate, straight) {
    const p = app.play;
    placeDisks(p.pegs, { animate, lift: p.sel, dur: 320, straight });
    zones.forEach((z, i) => {
      z.classList.toggle('sel', p.sel === i);
      z.classList.toggle('hint-from', !!p.hint && p.hint.from === i);
      z.classList.toggle('hint-to', !!p.hint && p.hint.to === i);
    });
    stMoves.textContent = fmt(p.moves);
    stMin.textContent = fmt(pow2(app.n) - 1);
    stLeft.textContent = fmt(bestRemaining(p.pegs, app.n, 2));
    btnUndo.disabled = !p.history.length;
    btnHint.disabled = p.won;
    stage.classList.toggle('won', p.won);
  }

  function introPlay() {
    say(`Move all ${app.n === 1 ? '' : app.n + ' '}disk${app.n === 1 ? '' : 's'} from A to C. Click a peg to pick up its top disk, then click where it should go, or just drag it.`, '');
  }

  function shakeZone(i) {
    const z = zones[i];
    z.classList.remove('shake');
    void z.offsetWidth;
    z.classList.add('shake');
    setTimeout(() => z.classList.remove('shake'), 400);
  }

  function selectPeg(i) {
    const p = app.play;
    if (!p.pegs[i].length) { say(`Peg ${PEG[i]} is empty. Pick a peg that has a disk on it.`, 'bad'); return; }
    p.sel = i;
    p.hint = null;
    renderPlay(true);
    say(`Picked up disk ${last(p.pegs[i])} from ${PEG[i]}. Now choose where to put it.`, '');
  }

  function deselect() {
    const p = app.play;
    if (p.sel < 0) return;
    p.sel = -1;
    renderPlay(true);
    say('Put it back.', '');
  }

  function attemptMove(from, to, straight) {
    const p = app.play;
    const src = p.pegs[from], dst = p.pegs[to];
    p.sel = -1;
    p.hint = null;
    if (!src.length || from === to) { renderPlay(true, straight); return; }
    const d = last(src), under = last(dst);
    if (under !== undefined && under < d) {
      renderPlay(true, straight);
      shakeZone(to);
      say(`Not allowed: disk ${d} is bigger than disk ${under}, and a bigger disk can never sit on a smaller one.`, 'bad');
      return;
    }
    dst.push(src.pop());
    p.moves++;
    p.history.push([from, to]);
    if (p.pegs[2].length === app.n) {
      p.won = true;
      renderPlay(true, straight);
      const min = pow2(app.n) - 1;
      if (p.moves === min) {
        say(`Solved in ${fmt(p.moves)} moves, the minimum possible (2<sup>${app.n}</sup> − 1 = ${fmt(min)}). Perfect! ${app.n < MAX_N ? `Try ${app.n + 1} disks next.` : ''}`, 'good');
      } else {
        say(`Solved in ${fmt(p.moves)} moves. The minimum is 2<sup>${app.n}</sup> − 1 = ${fmt(min)}, so you used ${fmt(p.moves - min)} extra. Press Restart and follow the recursive plan, or switch to “Watch the recursion” for a demo.`, 'good');
      }
      return;
    }
    renderPlay(true, straight);
    say(`Moved disk ${d} from ${PEG[from]} to ${PEG[to]}.`, '');
  }

  function undo() {
    const p = app.play;
    if (!p.history.length) return;
    const [from, to] = p.history.pop();
    p.pegs[from].push(p.pegs[to].pop());
    p.moves--;
    p.won = false;
    p.sel = -1;
    p.hint = null;
    renderPlay(true);
    say('Undid the last move.', '');
  }

  function hint() {
    const p = app.play;
    if (p.won) return;
    const r = bestNext(p.pegs, app.n, 2);
    if (!r) return;
    p.sel = -1;
    p.hint = r.move;
    renderPlay(true);
    let goals = r.chain.slice(0, -1).map((g) => `disk ${g.disk} → ${PEG[g.to]} needs ${disksUpTo(g.disk - 1)} parked on ${PEG[g.other]}`);
    if (goals.length > 3) goals = goals.slice(0, 2).concat(['…', goals[goals.length - 1]]);
    const why = goals.length ? ` <span class="muted">Why: ${goals.join(', so ')}.</span>` : '';
    say(`Hint: move <b>disk ${r.move.disk}</b> from <b>${PEG[r.move.from]}</b> to <b>${PEG[r.move.to]}</b>.${why}`, 'info');
  }

  function keyPick(i) {
    const p = app.play;
    if (p.won) return;
    if (p.sel < 0) selectPeg(i);
    else if (p.sel === i) deselect();
    else attemptMove(p.sel, i);
  }

  // ---------- pointer: click or drag ----------
  let drag = null;
  const pegAt = (x) => clamp(Math.floor(x / (stage.clientWidth / 3)), 0, 2);

  function clearDropMarks() {
    zones.forEach((z) => z.classList.remove('drop-ok', 'drop-bad'));
  }

  stage.addEventListener('pointerdown', (e) => {
    if (app.mode !== 'play' || e.button > 0) return;
    const p = app.play;
    if (p.won) { say('Solved! Press Restart (or change the number of disks) to play again.', 'good'); return; }
    const rect = stage.getBoundingClientRect();
    const peg = pegAt(e.clientX - rect.left);
    e.preventDefault();
    if (p.sel >= 0 && p.sel !== peg) { attemptMove(p.sel, peg); return; }
    if (!p.pegs[peg].length) { say(`Peg ${PEG[peg]} is empty. Pick a peg that has a disk on it.`, 'bad'); return; }
    drag = { peg, x0: e.clientX, y0: e.clientY, moved: false, wasSel: p.sel === peg, id: e.pointerId };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (p.sel !== peg) selectPeg(peg);
  });

  stage.addEventListener('pointermove', (e) => {
    if (app.mode !== 'play') return;
    const rect = stage.getBoundingClientRect();
    const over = pegAt(e.clientX - rect.left);
    if (!drag || e.pointerId !== drag.id) {
      zones.forEach((z, i) => z.classList.toggle('hover', i === over && !app.play.won));
      return;
    }
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
    drag.moved = true;
    const p = app.play;
    const d = last(p.pegs[drag.peg]);
    const de = diskEls[d];
    if (de.getAnimations) de.getAnimations().forEach((a) => a.cancel());
    de.classList.add('dragging');
    const left = e.clientX - rect.left - diskPos[d].w / 2;
    const bottom = clamp(rect.bottom - e.clientY - geom.dh / 2, 0, geom.H - geom.dh);
    de.style.left = left + 'px';
    de.style.bottom = bottom + 'px';
    diskPos[d] = Object.assign({}, diskPos[d], { left, bottom });
    const under = last(p.pegs[over]);
    zones.forEach((z, i) => {
      const target = i === over && i !== drag.peg;
      z.classList.toggle('drop-ok', target && (under === undefined || under > d));
      z.classList.toggle('drop-bad', target && under !== undefined && under < d);
    });
  });

  function endDrag(e, cancelled) {
    if (!drag || e.pointerId !== drag.id) return;
    const dd = drag;
    drag = null;
    clearDropMarks();
    const p = app.play;
    $$('.disk.dragging', stage).forEach((x) => x.classList.remove('dragging'));
    if (dd.moved) {
      const rect = stage.getBoundingClientRect();
      const over = pegAt(e.clientX - rect.left);
      if (!cancelled && over !== dd.peg) attemptMove(dd.peg, over, true);
      else { p.sel = -1; renderPlay(true); }
    } else if (dd.wasSel) {
      deselect();
    }
  }
  stage.addEventListener('pointerup', (e) => endDrag(e, false));
  stage.addEventListener('pointercancel', (e) => endDrag(e, true));
  stage.addEventListener('pointerleave', () => { if (!drag) zones.forEach((z) => z.classList.remove('hover')); });

  // ===========================================================================
  // Mode, disk count, URL
  // ===========================================================================
  function writeHash() {
    try { history.replaceState(null, '', `#mode=${app.mode}&n=${app.n}`); } catch (err) { /* ignore */ }
  }
  function readHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    const n = parseInt(params.get('n'), 10);
    return { n: Number.isFinite(n) ? clamp(n, MIN_N, MAX_N) : 3, mode: params.get('mode') === 'play' ? 'play' : 'watch' };
  }

  function clearBoardMarks() {
    setRoles(['', '', '']);
    zones.forEach((z) => z.classList.remove('sel', 'hint-from', 'hint-to', 'hover', 'drop-ok', 'drop-bad'));
    for (let d = 1; d <= app.n; d++) diskEls[d].classList.remove('frozen', 'just');
    stage.classList.remove('won');
  }

  function setMode(mode) {
    setPlaying(false);
    app.mode = mode;
    const watch = mode === 'watch';
    tabWatch.setAttribute('aria-selected', String(watch));
    tabPlay.setAttribute('aria-selected', String(!watch));
    watchControls.hidden = !watch;
    codeCard.hidden = !watch;
    stackCard.hidden = !watch;
    treeCard.hidden = !watch;
    stageNote.hidden = !watch;
    playControls.hidden = watch;
    thinkCard.hidden = watch;
    stage.classList.toggle('playable', !watch);
    clearBoardMarks();
    if (watch) {
      renderWatch(false);
    } else {
      renderPlay(false);
      if (app.play.won) attemptWinMessage();
      else if (!app.play.moves) introPlay();
      else say(`Back to your game: ${fmt(app.play.moves)} move${app.play.moves === 1 ? '' : 's'} so far.`, '');
    }
    writeHash();
  }
  function attemptWinMessage() {
    say(`Solved in ${fmt(app.play.moves)} moves. Press Restart to play again.`, 'good');
  }

  function setN(n) {
    n = clamp(n, MIN_N, MAX_N);
    setPlaying(false);
    app.n = n;
    nOut.textContent = n;
    nMinus.disabled = n <= MIN_N;
    nPlus.disabled = n >= MAX_N;
    app.trace = buildTrace(n);
    app.step = 0;
    scrub.max = app.trace.steps.length - 1;
    buildDisks();
    layoutStatic();
    newPlay();
    buildTree();
    setupTally();
    buildDiskCounts();
    renderUnroll();
    renderGrowth();
    clearBoardMarks();
    if (app.mode === 'watch') renderWatch(false);
    else { renderPlay(false); introPlay(); }
    writeHash();
  }

  // ===========================================================================
  // Events
  // ===========================================================================
  tabWatch.addEventListener('click', () => { if (app.mode !== 'watch') setMode('watch'); });
  tabPlay.addEventListener('click', () => { if (app.mode !== 'play') setMode('play'); });
  nMinus.addEventListener('click', () => setN(app.n - 1));
  nPlus.addEventListener('click', () => setN(app.n + 1));

  btnPlay.addEventListener('click', togglePlay);
  btnNext.addEventListener('click', () => { setPlaying(false); advance(1); });
  btnBack.addEventListener('click', () => { setPlaying(false); advance(-1); });
  btnStart.addEventListener('click', () => { setPlaying(false); goTo(0, false); });
  btnEnd.addEventListener('click', () => { setPlaying(false); goTo(app.trace.steps.length - 1, false); });
  scrub.addEventListener('input', () => { setPlaying(false); goTo(+scrub.value, true); });
  speedInput.addEventListener('input', () => { app.speed = +speedInput.value; });
  segBtns.forEach((b) => b.addEventListener('click', () => {
    app.byMove = b.dataset.by === 'move';
    segBtns.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  }));

  btnUndo.addEventListener('click', undo);
  btnHint.addEventListener('click', hint);
  btnRestart.addEventListener('click', () => { newPlay(); clearBoardMarks(); renderPlay(false); introPlay(); });

  treeSvg.addEventListener('click', (e) => {
    const g = e.target.closest && e.target.closest('.tnode');
    if (g) jumpToNode(+g.getAttribute('data-id'));
  });
  treeSvg.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const g = e.target.closest && e.target.closest('.tnode');
    if (!g) return;
    e.preventDefault();
    e.stopPropagation();
    jumpToNode(+g.getAttribute('data-id'));
  });

  document.addEventListener('keydown', (e) => {
    if (e.altKey) return;
    const tag = e.target && e.target.tagName;
    if (e.ctrlKey || e.metaKey) {
      if (app.mode === 'play' && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      return;
    }
    if (app.mode === 'watch') {
      const inInput = tag === 'INPUT';
      if (e.key === ' ' && tag !== 'BUTTON' && !inInput) { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowRight' && !inInput) { e.preventDefault(); setPlaying(false); advance(1); }
      else if (e.key === 'ArrowLeft' && !inInput) { e.preventDefault(); setPlaying(false); advance(-1); }
      else if (e.key === 'Home' && !inInput) { e.preventDefault(); setPlaying(false); goTo(0, false); }
      else if (e.key === 'End' && !inInput) { e.preventDefault(); setPlaying(false); goTo(app.trace.steps.length - 1, false); }
    } else {
      const k = e.key.toLowerCase();
      if (k.length === 1 && '123'.includes(k)) keyPick('123'.indexOf(k));
      else if (k.length === 1 && 'abc'.includes(k)) keyPick('abc'.indexOf(k));
      else if (k === 'u') undo();
      else if (k === 'h') hint();
      else if (k === 'escape') deselect();
    }
  });

  if (window.ResizeObserver) {
    let stageW = 0, stageH = 0, treeW = 0, treeTimer = 0;
    new ResizeObserver(() => {
      if (stage.clientWidth === stageW && stage.clientHeight === stageH) return;
      stageW = stage.clientWidth;
      stageH = stage.clientHeight;
      layoutStatic();
      if (app.mode === 'watch') placeDisks(curStep().pegs, {});
      else placeDisks(app.play.pegs, { lift: app.play.sel });
    }).observe(stage);
    new ResizeObserver(() => {
      const w = treeWrap.clientWidth;
      if (!w || Math.abs(w - treeW) < 2) return;
      treeW = w;
      clearTimeout(treeTimer);
      treeTimer = setTimeout(() => {
        buildTree();
        if (app.mode === 'watch') updateTree(curStep());
      }, 120);
    }).observe(treeWrap);
  }

  // ===========================================================================
  // Start
  // ===========================================================================
  buildCode();
  const initial = readHash();
  app.mode = initial.mode;
  setN(initial.n);
  setMode(initial.mode);
})();
