/* =========================================================
   Muhammad Sohaib Shoukat — Portfolio interactions
   ========================================================= */
(function () {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Preloader ---------- */
  document.body.classList.add('loading');
  const hidePreloader = () => {
    const p = $('.preloader');
    if (p) p.classList.add('hidden');
    document.body.classList.remove('loading');
  };
  window.addEventListener('load', () => setTimeout(hidePreloader, 300));
  setTimeout(hidePreloader, 2500); // safety net

  /* ---------- Marquee: duplicate items so the loop is seamless ---------- */
  const track = $('.marquee-track');
  if (track) {
    Array.from(track.children).forEach((n) => {
      const c = n.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      track.appendChild(c);
    });
  }

  /* ---------- Year ---------- */
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- Theme ---------- */
  const themeListeners = [];
  const toggle = $('#theme-toggle');
  const setTheme = (t) => {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch (e) { /* storage unavailable */ }
    themeListeners.forEach((fn) => fn(t));
  };
  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      if (!document.startViewTransition || reduceMotion) { setTheme(next); return; }
      // Circular reveal that grows from the toggle button
      const r = toggle.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const t = document.startViewTransition(() => setTheme(next));
      t.ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
          { duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(() => {});
    });
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    let saved = null;
    try { saved = localStorage.getItem('theme'); } catch (err) { /* ignore */ }
    if (!saved) {
      root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      themeListeners.forEach((fn) => fn(root.getAttribute('data-theme')));
    }
  });

  /* ---------- Navigation ---------- */
  const nav = $('#nav');
  const burger = $('#hamburger');
  const links = $('#nav-links');
  const closeMenu = () => {
    burger.classList.remove('open');
    links.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  };
  if (burger && links) {
    burger.addEventListener('click', () => {
      const open = !links.classList.contains('open');
      links.classList.toggle('open', open);
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('a', links).forEach((a) => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    document.addEventListener('click', (e) => {
      if (links.classList.contains('open') && !links.contains(e.target) && !burger.contains(e.target)) closeMenu();
    });
  }

  // Scroll state + progress
  const progress = $('.scroll-progress');
  const toTop = $('#to-top');
  let ticking = false;
  let lastY = window.scrollY;
  const onScroll = () => {
    const sy = window.scrollY;
    nav.classList.toggle('scrolled', sy > 20);
    // hide nav while scrolling down, reveal on scroll up (never while the menu is open)
    const menuOpen = links && links.classList.contains('open');
    if (!menuOpen) nav.classList.toggle('nav-hidden', sy > lastY && sy > 400);
    lastY = sy;
    if (toTop) toTop.classList.toggle('show', sy > 700);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? sy / max : 0})`;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  // Active section highlight
  const navLinks = $$('.nav-link');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === `#${id}`));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => sectionObserver.observe(s));

  /* ---------- Reveal on scroll (staggered) ---------- */
  const reveals = $$('.reveal');
  // stagger siblings inside the same parent
  const groups = new Map();
  reveals.forEach((el) => {
    const p = el.parentElement;
    const i = groups.get(p) || 0;
    el.style.setProperty('--d', `${Math.min(i * 0.08, 0.5)}s`);
    groups.set(p, i + 1);
  });
  if ('IntersectionObserver' in window && !reduceMotion) {
    const ro = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          ro.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => ro.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Counters ---------- */
  const counters = $$('[data-count]');
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const dur = reduceMotion ? 0 : 1400;
      const start = performance.now();
      const step = (now) => {
        const t = dur ? Math.min((now - start) / dur, 1) : 1;
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      countObserver.unobserve(el);
    });
  }, { threshold: 0.6 });
  counters.forEach((c) => countObserver.observe(c));

  /* ---------- Typewriter ---------- */
  const typed = $('#typed');
  const roles = [
    'AI / ML Engineer',
    'Generative AI Engineer',
    'Agentic AI Developer',
    'Computer Vision & NLP',
    'Cloud Computing & DevOps',
    'LLM Fine-Tuning · LoRA / QLoRA',
  ];
  if (typed && !reduceMotion) {
    let r = 0, c = roles[0].length, deleting = true;
    const tick = () => {
      const word = roles[r];
      typed.textContent = word.slice(0, c);
      let delay = deleting ? 35 : 70;
      if (deleting) {
        c--;
        if (c < 0) { deleting = false; r = (r + 1) % roles.length; c = 0; delay = 300; }
      } else {
        c++;
        if (c > roles[r].length) { deleting = true; c = roles[r].length; delay = 2000; }
      }
      setTimeout(tick, delay);
    };
    setTimeout(tick, 2400);
  }

  /* ---------- 3D tilt ---------- */
  if (canHover && !reduceMotion) {
    $$('.tilt').forEach((el) => {
      const max = parseFloat(el.dataset.tiltMax || 8);
      let raf = null;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.classList.add('tilting');
          el.style.setProperty('--ry', `${(px - 0.5) * max * 2}deg`);
          el.style.setProperty('--rx', `${(0.5 - py) * max * 2}deg`);
          el.style.setProperty('--mx', `${px * 100}%`);
          el.style.setProperty('--my', `${py * 100}%`);
        });
      });
      el.addEventListener('pointerleave', () => {
        if (raf) cancelAnimationFrame(raf);
        el.classList.remove('tilting');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });

    // Magnetic buttons
    $$('.magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y2 = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.18}px, ${y2 * 0.3}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });

    // Cursor glow
    const glow = $('.cursor-glow');
    if (glow) {
      window.addEventListener('pointermove', (e) => {
        glow.style.left = `${e.clientX}px`;
        glow.style.top = `${e.clientY}px`;
      }, { passive: true });
    }
  }

  /* ---------- Project filter ---------- */
  const filters = $$('.filter');
  const projects = $$('.project');
  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const f = btn.dataset.filter;
      let i = 0;
      projects.forEach((p) => {
        const show = f === 'all' || p.dataset.category.split(' ').includes(f);
        p.classList.toggle('hide', !show);
        p.classList.remove('pop');
        if (show) {
          void p.offsetWidth; // restart animation
          p.style.animationDelay = `${i++ * 0.06}s`;
          p.classList.add('pop');
        }
      });
    });
  });

  /* ---------- Contact form (opens the visitor's email client) ---------- */
  const form = $('#contact-form');
  const note = $('#form-note');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      $$('.field', form).forEach((f) => {
        const input = $('input, textarea', f);
        const valid = input.checkValidity() && input.value.trim() !== '';
        f.classList.toggle('invalid', !valid);
        if (!valid) ok = false;
      });
      if (!ok) {
        note.textContent = 'Please fill in every field with a valid email address.';
        note.classList.add('error');
        return;
      }
      const d = Object.fromEntries(new FormData(form));
      const body = `${d.message}\n\nFrom: ${d.name}\n${d.email}`;
      window.location.href = `mailto:sohaibshoukat56@gmail.com?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(body)}`;
      note.classList.remove('error');
      note.textContent = 'Opening your email app… Thanks for reaching out!';
      form.reset();
    });
    $$('input, textarea', form).forEach((i) => i.addEventListener('input', () => i.parentElement.classList.remove('invalid')));
  }

  /* =========================================================
     3D HERO — rotating neural-network sphere (Three.js)
     ========================================================= */
  const canvas = $('#hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const css = (v) => getComputedStyle(root).getPropertyValue(v).trim();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) { return; } // WebGL unavailable — portrait still shows
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 5.2;

  const group = new THREE.Group();
  scene.add(group);

  // --- Nodes on a Fibonacci sphere
  const isSmall = window.innerWidth < 640;
  const N = isSmall ? 140 : 220;
  const R = 1.65;
  const nodes = [];
  for (let i = 0; i < N; i++) {
    const yv = 1 - (i / (N - 1)) * 2;
    const rad = Math.sqrt(1 - yv * yv);
    const th = Math.PI * (3 - Math.sqrt(5)) * i;
    const jitter = R * (0.92 + Math.random() * 0.16);
    nodes.push(new THREE.Vector3(Math.cos(th) * rad * jitter, yv * jitter, Math.sin(th) * rad * jitter));
  }
  const nodeGeo = new THREE.BufferGeometry().setFromPoints(nodes);
  const nodeColors = new Float32Array(N * 3);
  nodeGeo.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));
  const nodeMat = new THREE.PointsMaterial({ size: 0.055, vertexColors: true, transparent: true, opacity: 0.95, sizeAttenuation: true, depthWrite: false });
  group.add(new THREE.Points(nodeGeo, nodeMat));

  // --- Synapses between near neighbours
  const linePos = [];
  const pairs = [];
  const maxD = 0.62;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (nodes[i].distanceTo(nodes[j]) < maxD) {
        linePos.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
        pairs.push([i, j]);
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
  const lineColors = new Float32Array(linePos.length);
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
  const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false });
  group.add(new THREE.LineSegments(lineGeo, lineMat));

  // --- Travelling signal pulses along synapses
  const P = isSmall ? 14 : 26;
  const pulseGeo = new THREE.BufferGeometry();
  const pulsePos = new Float32Array(P * 3);
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3));
  const pulseMat = new THREE.PointsMaterial({ size: 0.11, transparent: true, opacity: 1, depthWrite: false });
  group.add(new THREE.Points(pulseGeo, pulseMat));
  const pulses = Array.from({ length: P }, () => ({ pair: pairs[(Math.random() * pairs.length) | 0], t: Math.random(), speed: 0.006 + Math.random() * 0.012 }));

  // --- Orbit rings of particles
  const ringGroup = new THREE.Group();
  scene.add(ringGroup);
  const makeRing = (radius, count, tiltX, tiltZ) => {
    const pts = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const rr = radius + (Math.random() - 0.5) * 0.08;
      pts.push(new THREE.Vector3(Math.cos(a) * rr, (Math.random() - 0.5) * 0.04, Math.sin(a) * rr));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.PointsMaterial({ size: 0.03, transparent: true, opacity: 0.7, depthWrite: false });
    const p = new THREE.Points(g, m);
    p.rotation.x = tiltX; p.rotation.z = tiltZ;
    ringGroup.add(p);
    return m;
  };
  const ringMats = [makeRing(2.15, 220, 1.2, 0.3), makeRing(2.35, 260, 1.9, -0.5)];

  // --- Theme-aware colours
  const applyColors = () => {
    const dark = root.getAttribute('data-theme') === 'dark';
    const c1 = new THREE.Color(css('--accent') || '#6366f1');
    const c2 = new THREE.Color(css('--accent-2') || '#06b6d4');
    const c3 = new THREE.Color(css('--accent-3') || '#8b5cf6');
    const blend = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    for (let i = 0; i < N; i++) {
      const t = (nodes[i].y / R + 1) / 2;
      const col = c1.clone().lerp(t > 0.5 ? c2 : c3, Math.abs(t - 0.5) * 2);
      nodeColors.set([col.r, col.g, col.b], i * 3);
    }
    nodeGeo.attributes.color.needsUpdate = true;
    for (let k = 0; k < linePos.length / 3; k++) {
      const t = (linePos[k * 3 + 1] / R + 1) / 2;
      const col = c3.clone().lerp(c2, t);
      lineColors.set([col.r, col.g, col.b], k * 3);
    }
    lineGeo.attributes.color.needsUpdate = true;
    lineMat.opacity = dark ? 0.3 : 0.38;
    pulseMat.color = c2;
    ringMats[0].color = c1; ringMats[1].color = c3;
    [nodeMat, lineMat, pulseMat, ...ringMats].forEach((m) => { m.blending = blend; m.needsUpdate = true; });
    renderer.render(scene, camera);
  };
  applyColors();
  themeListeners.push(() => requestAnimationFrame(applyColors));

  // --- Sizing
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  // --- Pointer parallax
  const target = { x: 0, y: 0 };
  if (!reduceMotion) {
    window.addEventListener('pointermove', (e) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 0.8;
      target.y = (e.clientY / window.innerHeight - 0.5) * 0.6;
    }, { passive: true });
  }

  // --- Loop (paused when off-screen / tab hidden)
  let visible = true, running = false, last = performance.now();
  const clock = { t: 0 };
  const frame = (now) => {
    if (!visible || document.hidden) { running = false; return; }
    const dt = Math.min((now - last) / 16.67, 3);
    last = now;
    clock.t += 0.004 * dt;

    group.rotation.y += 0.0022 * dt;
    group.rotation.x += (target.y - group.rotation.x) * 0.04;
    group.rotation.z += (-target.x * 0.3 - group.rotation.z) * 0.04;
    ringGroup.rotation.y -= 0.0015 * dt;
    ringGroup.rotation.x = target.y * 0.4;
    const s = 1 + Math.sin(clock.t * 4) * 0.015;
    group.scale.set(s, s, s);

    for (let k = 0; k < P; k++) {
      const p = pulses[k];
      p.t += p.speed * dt;
      if (p.t >= 1) { p.t = 0; p.pair = pairs[(Math.random() * pairs.length) | 0]; }
      const a = nodes[p.pair[0]], b = nodes[p.pair[1]];
      pulsePos[k * 3] = a.x + (b.x - a.x) * p.t;
      pulsePos[k * 3 + 1] = a.y + (b.y - a.y) * p.t;
      pulsePos[k * 3 + 2] = a.z + (b.z - a.z) * p.t;
    }
    pulseGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    if (!reduceMotion) requestAnimationFrame(frame); else running = false;
  };
  const start = () => {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  };
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) start();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) start(); });
  start();
})();
