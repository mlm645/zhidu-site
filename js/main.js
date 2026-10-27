/* ===================================================================
   智都科技官网 · 交互脚本
   - 共享标志（首页 / 减少动效 / 引导动画是否已播放）
   - 首页轮播（自动生成指示条 / 计数 / 键盘控制，防抖启动）
   - 移动端导航
   - 滚动入场（含兜底，任何异常内容都不会看不见）
   - 首页首次滚动：无人机式文字飞入 + 图片随后浮现（仅首次，不重播）
   =================================================================== */

/* ---- 共享标志 ---- */
(function () {
  var HOME = !!document.querySelector('.hero');
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var INTRO_DONE = false;
  try { INTRO_DONE = sessionStorage.getItem('zhidu_intro') === '1'; } catch (e) {}
  window.ZD = {
    HOME: HOME,
    REDUCE: REDUCE,
    INTRO_DONE: INTRO_DONE,
    INTRO_WILL_PLAY: HOME && !REDUCE && !INTRO_DONE
  };
})();

/* ===== 首页轮播 ===== */
(function () {
  function init() {
    var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
    if (!slides.length) return;

    var dotsBox = document.querySelector('.dots');
    var counter = document.querySelector('.hero-count');
    var idx = 0, timer = null, DUR = 5200;

    var dots = slides.map(function (_, i) {
      var d = document.createElement('span');
      d.className = 'dot' + (i === 0 ? ' active' : '');
      d.setAttribute('role', 'button');
      d.setAttribute('aria-label', '第 ' + (i + 1) + ' 张');
      d.addEventListener('click', function () { go(i); restart(); });
      if (dotsBox) dotsBox.appendChild(d);
      return d;
    });

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function go(i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('active', k === idx); });
      dots.forEach(function (d, k) { d.classList.toggle('active', k === idx); });
      if (counter) counter.textContent = pad(idx + 1) + ' / ' + pad(slides.length);
    }
    function next() { go(idx + 1); }
    function prev() { go(idx - 1); }
    function start() { stop(); timer = setInterval(next, DUR); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { start(); }

    var nx = document.querySelector('.slide-arrow.next');
    var pv = document.querySelector('.slide-arrow.prev');
    if (nx) nx.addEventListener('click', function () { next(); restart(); });
    if (pv) pv.addEventListener('click', function () { prev(); restart(); });

    var hero = document.querySelector('.hero');
    if (hero) {
      hero.addEventListener('mouseenter', stop);
      hero.addEventListener('mouseleave', start);
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { prev(); restart(); }
      if (e.key === 'ArrowRight') { next(); restart(); }
    });

    /* 防抖启动：先定帧，等首帧绘制后再开始自动轮播，避免可能的初始闪烁 */
    go(0);
    requestAnimationFrame(function () {
      requestAnimationFrame(start);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ===== 移动端导航 ===== */
(function () {
  var t = document.querySelector('.menu-toggle');
  var m = document.querySelector('.menu');
  if (!t || !m) return;
  t.addEventListener('click', function () {
    m.classList.toggle('open');
    t.textContent = m.classList.contains('open') ? '✕' : '☰';
  });
})();

/* ===== 滚动入场（含兜底：任何情况下内容都不会看不见） ===== */
(function () {
  /* 首页首次引导由 homeIntro 接管，这里跳过，避免双重动画 */
  if (window.ZD && window.ZD.INTRO_WILL_PLAY) return;

  var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (!els.length) return;

  function showAll() {
    els.forEach(function (e) { e.classList.add('in'); });
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { showAll(); return; }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  els.forEach(function (e) { io.observe(e); });

  /* 安全兜底：2.6 秒后仍未入场的一律显示，避免 JS/观察器异常导致空白 */
  setTimeout(showAll, 2600);
})();

/* ===== 首页首次滚动：无人机式文字飞入 + 图片随后浮现（仅首次，不重播） ===== */
(function () {
  if (!(window.ZD && window.ZD.INTRO_WILL_PLAY)) return;

  var DIRS = [
    'translate(-130vw,-35vh) rotate(-10deg)',
    'translate(130vw,-25vh) rotate(9deg)',
    'translate(-120vw,42vh) rotate(11deg)',
    'translate(120vw,35vh) rotate(-9deg)',
    'translate(0,-130vh) rotate(5deg)',
    'translate(0,130vh) rotate(-5deg)'
  ];

  var secs = Array.prototype.slice.call(document.querySelectorAll('.hero ~ .sec'));
  var groups = secs.map(function (sec, gi) {
    var texts = Array.prototype.slice.call(sec.querySelectorAll('.reveal:not(figure)'));
    var imgs = Array.prototype.slice.call(sec.querySelectorAll('figure'));
    return { sec: sec, gi: gi, texts: texts, imgs: imgs, played: false };
  }).filter(function (g) { return g.texts.length || g.imgs.length; });

  if (!groups.length) {
    /* 兜底：没有任何可动画元素时，直接显示全部 .reveal，避免空白 */
    Array.prototype.slice.call(document.querySelectorAll('.reveal')).forEach(function (e) { e.classList.add('in'); });
    window.ZD.INTRO_WILL_PLAY = false;
    return;
  }

  /* 初始：文字藏到屏幕外，图片先隐后现 */
  groups.forEach(function (g) {
    g.texts.forEach(function (el, i) {
      el.style.transition = 'opacity .8s ease, transform 1.05s cubic-bezier(.16,.84,.3,1)';
      el.style.transitionDelay = (i * 0.075) + 's';
      el.style.opacity = '0';
      el.style.transform = DIRS[(g.gi * 3 + i) % DIRS.length];
      el.style.willChange = 'transform,opacity';
    });
    g.imgs.forEach(function (el, j) {
      el.style.transition = 'opacity 1s ease, transform 1s ease';
      el.style.transitionDelay = ((g.texts.length - 1) * 0.075 + 1.2 + j * 0.15) + 's';
      el.style.opacity = '0';
      el.style.transform = 'scale(1.06)';
    });
  });

  function playGroup(g) {
    if (g.played) return;
    g.played = true;
    try { sessionStorage.setItem('zhidu_intro', '1'); } catch (e) {}
    g.texts.forEach(function (el) { el.style.opacity = '1'; el.style.transform = 'none'; });
    g.imgs.forEach(function (el) { el.style.opacity = '1'; el.style.transform = 'none'; });
  }

  /* 仅在「向下滑动后」触发；组进入视口即播放该组（文字先飞，图片随后） */
  function check() {
    if (window.scrollY <= 8) return;            // 必须真的往下滚过一点
    var vh = window.innerHeight || document.documentElement.clientHeight;
    groups.forEach(function (g) {
      if (g.played) return;
      var r = g.sec.getBoundingClientRect();
      if (r.top < vh * 0.85) playGroup(g);
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { check(); ticking = false; });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('touchmove', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  check();

  /* 终极兜底：20s 后强制全部显示，避免任何异常导致空白 */
  setTimeout(function () { groups.forEach(playGroup); }, 20000);
})();
