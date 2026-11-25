(function () {
  var root = document.documentElement;
  if (window.location.protocol === 'capacitor:') root.classList.add('app');      // the App Store app: everything is already on the device
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // ---- theme
  var saved = get('gsb-theme');
  if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  }

  // ---- translation: fixed on a translation's own pages; chosen by the reader on shared pages (Gill, compare)
  var EDS = ['bsb', 'msb', 'kjv'];
  var OWN = root.getAttribute('data-ed'), ED = OWN;
  if (OWN) set('gsb-ed', OWN);
  else {
    var qe = /[?&]ed=(kjv|bsb|msb)/.exec(window.location.search), se = get('gsb-ed');
    ED = qe ? qe[1] : (EDS.indexOf(se) >= 0 ? se : 'bsb');
    root.setAttribute('data-ed', ED); set('gsb-ed', ED);
  }
  function withEd(h) {      // point a link on a shared page at the chosen translation
    if (/^(\.\.\/)?(kjv|bsb|msb)\//.test(h)) return h.replace(/^(\.\.\/)?(kjv|bsb|msb)\//, '$1' + ED + '/');
    var m = /^((?:\.\.\/(?:gill|compare|confessions)\/)?[a-z0-9-]+\.html)(?:\?ed=[a-z]+)?(#.*)?$/.exec(h);
    return m ? m[1] + '?ed=' + ED + (m[2] || '') : h;
  }
  function pointLinks() {
    var as = document.querySelectorAll('a[href]:not([data-keep])'), i, h, n;
    for (i = 0; i < as.length; i++) { h = as[i].getAttribute('href'); if (h.charAt(0) === '#') continue; n = withEd(h); if (n !== h) as[i].setAttribute('href', n); }
    var os = document.querySelectorAll('.chsel option');
    for (i = 0; i < os.length; i++) os[i].value = withEd(os[i].value);
  }

  var EMBED = /[?&]embed=1/.test(window.location.search);
  if (EMBED) {
    root.className += ' embed';
    var tm = /[?&]theme=(dark|light)/.exec(window.location.search);
    if (tm) root.setAttribute('data-theme', tm[1]);
  }

  // ---- "Go to" box: a reference goes to the text, a single word to the concordance
  function norm(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function findBook(tok) {
    var B = window.GSB_BOOKS || [], t = norm(tok).replace(/^iii/, '3').replace(/^ii/, '2').replace(/^i(?=[a-z]{2})/, '1'), i, j;
    if (/^i(sam|ki|ch|co|th|ti|pe|jo|jn)/.test(norm(tok))) t = '1' + norm(tok).slice(1);
    for (i = 0; i < B.length; i++) {
      if (norm(B[i][1]) === t) return B[i];
      for (j = 0; j < B[i][3].length; j++) if (B[i][3][j] === t) return B[i];
    }
    if (t.length >= 2) for (i = 0; i < B.length; i++) if (norm(B[i][1]).indexOf(t) === 0) return B[i];
    return null;
  }
  function resolve(q) {
    q = q.replace(/^\s+|\s+$/g, '');
    if (!q) return null;
    var m = /^((?:[1-3]|i{1,3})?\s*[a-z]+(?:\s+of\s+[a-z]+)?)\.?\s*(\d+)?(?:\s*[:.,\s]\s*(\d+))?/i.exec(q);
    if (m) {
      var b = findBook(m[1]);
      if (b) {
        if (!m[2]) return { href: 'bible/' + b[0] + '.html' };
        var c = +m[2], v = m[3] ? +m[3] : 0;
        if (b[2] === 1 && !m[3] && c > 1) { v = c; c = 1; }
        if (c < 1 || c > b[2]) return { msg: b[1] + ' has ' + b[2] + (b[2] === 1 ? ' chapter' : ' chapters') };
        return { href: 'bible/' + b[0] + '-' + c + '.html' + (v ? '#v' + v : '') };
      }
    }
    if (/^[a-z][a-z'’-]+$/i.test(q)) {
      var w = q.toLowerCase().replace(/’/g, "'").replace(/'s$/, '');
      return { href: 'concordance/' + w.charAt(0) + '.html#w-' + w };
    }
    return { msg: 'Try a reference such as John 3:16' };
  }

  // ---- notes and cross-references shown in place
  var pop = null, popFor = null;
  function closePop() { if (pop) { pop.parentNode.removeChild(pop); pop = null; popFor = null; } }
  function openPop(a) {
    var id = (a.getAttribute('href') || '').slice(1), target = id && document.getElementById(id);
    if (!target) return false;
    if (popFor === a) { closePop(); return true; }
    closePop();
    pop = document.createElement('div'); pop.className = 'pop'; pop.setAttribute('role', 'note');
    var c = target.cloneNode(true); c.removeAttribute('id');
    var back = c.querySelector('.fnb'); if (back) back.parentNode.removeChild(back);
    pop.innerHTML = c.innerHTML;
    document.body.appendChild(pop);
    var r = a.getBoundingClientRect(), w = pop.offsetWidth, vw = document.documentElement.clientWidth;
    var left = Math.max(8, Math.min(r.left - 16, vw - w - 8));
    pop.style.left = (left + window.pageXOffset) + 'px';
    pop.style.top = (r.bottom + window.pageYOffset + 6) + 'px';
    popFor = a;
    return true;
  }

  // ---- a box over the text: Gill's comment on a verse, a paragraph of the confession, or the verses a reference points to
  var gbox = null, gboxFor = null;
  function closeGill() { if (gbox) { gbox.parentNode.removeChild(gbox); gbox = null; gboxFor = null; } }
  function embedUrl(href) {
    var p = href.split('#'), u = p[0] + (p[0].indexOf('?') < 0 ? '?' : '&') + 'embed=1&theme=' + (isDark() ? 'dark' : 'light');
    if (!/[?&]ed=/.test(u)) u += '&ed=' + ED;
    return u + '#' + (p[1] || '');
  }
  function openBox(a, title, tabs) {
    if (gboxFor === a) { closeGill(); return; }
    closeGill(); closePop();
    if (!tabs.length) return;
    gbox = document.createElement('div'); gbox.className = 'gbox'; gbox.setAttribute('role', 'dialog'); gbox.setAttribute('aria-label', title);
    var head = document.createElement('div'); head.className = 'gbox-h';
    var ttl = document.createElement('span'); ttl.textContent = title;
    var x = document.createElement('button'); x.type = 'button'; x.textContent = 'Close'; x.addEventListener('click', closeGill);
    var full = document.createElement('a'); full.className = 'gbox-full';
    head.appendChild(ttl); head.appendChild(full); head.appendChild(x);
    var fr = document.createElement('iframe'); fr.title = title;
    gbox.appendChild(head);
    var btns = [];
    var show = function (i) {
      fr.src = embedUrl(tabs[i].href); full.href = tabs[i].full || tabs[i].href; full.textContent = tabs[i].fullLabel;
      for (var k = 0; k < btns.length; k++) btns[k].setAttribute('aria-selected', k === i ? 'true' : 'false');
    };
    if (tabs.length > 1) {
      var bar = document.createElement('div'); bar.className = 'gbox-tabs'; bar.setAttribute('role', 'tablist');
      tabs.forEach(function (t, i) {
        var bt = document.createElement('button'); bt.type = 'button'; bt.textContent = t.label; bt.setAttribute('role', 'tab');
        bt.addEventListener('click', function () { show(i); }); btns.push(bt); bar.appendChild(bt);
      });
      gbox.appendChild(bar);
    }
    gbox.appendChild(fr);
    document.body.appendChild(gbox);
    show(0);
    var r = a.getBoundingClientRect(), vw = document.documentElement.clientWidth, w = gbox.offsetWidth;
    var main = document.querySelector('main'), mr = main ? main.getBoundingClientRect() : { left: 8 };
    gbox.style.left = (Math.max(8, Math.min(mr.left + 8, vw - w - 8)) + window.pageXOffset) + 'px';
    gbox.style.top = (r.bottom + window.pageYOffset + 8) + 'px';
    gboxFor = a; x.focus();
  }
  // everything tied to one verse: Gill, and each place the confession or a catechism cites it
  function openVerse(el) {
    var top = document.body.getAttribute('data-top') || '', tabs = [], href = el.tagName === 'A' ? el.getAttribute('href') : null;
    if (href) tabs.push({ label: 'Gill', href: href, fullLabel: 'Open the full commentary' });
    var s = (el.getAttribute('data-s') || '').split(' ');
    for (var i = 0; i < s.length; i++) {
      var k = s[i].charAt(0), id = s[i].slice(1), pp = id.split('.');
      if (k === 'l') tabs.push({ label: 'Confession ' + id, href: top + 'confessions/lbcf-' + pp[0] + '.html#p' + pp[1], fullLabel: 'Open the Confession' });
      if (k === 'k') tabs.push({ label: 'Boys and Girls ' + id, href: top + 'confessions/cbg.html#q' + id, fullLabel: 'Open the catechism' });
      if (k === 'b') tabs.push({ label: 'Baptist Catechism ' + id, href: top + 'confessions/bc.html#q' + id, fullLabel: 'Open the catechism' });
      if (k === 'o') tabs.push({ label: 'Orthodox Catechism ' + id, href: top + 'confessions/oc.html#q' + id, fullLabel: 'Open the catechism' });
    }
    var h1 = document.querySelector('.chead h1'), n = (el.id || '').replace(/^[a-z]+/, '');
    var title = (el.getAttribute('title') || '').replace(/^Gill on /, '').replace(/ in the confession.*$/, '') || (h1 ? h1.textContent.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '') + ':' + n : 'Verse ' + n);
    openBox(el, title, tabs);
  }
  // a scripture reference in the confession or a catechism: the verses, in the translation being read
  function openRef(a) {
    var top = document.body.getAttribute('data-top') || '', v = a.getAttribute('data-v'), c = a.getAttribute('data-c');
    openBox(a, (a.getAttribute('title') || a.textContent) + ' \u00b7 ' + ED.toUpperCase(),
      [{ label: '', href: top + 'compare/' + c + '.html?v=' + v + '#v' + v.split('-')[0], full: a.getAttribute('href'), fullLabel: 'Open the chapter' }]);
  }
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (gbox && d && typeof d.gsbHeight === 'number') {
      var max = Math.max(220, Math.round(window.innerHeight * 0.6));
      gbox.querySelector('iframe').style.height = Math.min(max, Math.max(90, d.gsbHeight)) + 'px';
      var br = gbox.getBoundingClientRect();
      if (br.bottom > window.innerHeight) window.scrollBy(0, Math.min(br.bottom - window.innerHeight + 12, Math.max(0, br.top - 110)));
    }
    if (d && d.gsbClose) closeGill();
  });

  document.addEventListener('DOMContentLoaded', function () {
    var top = document.body.getAttribute('data-top') || '';
    var base = OWN ? (document.body.getAttribute('data-root') || '') : top + ED + '/';
    var page = /([a-z0-9]+)-(\d+)\.html$/.exec(window.location.pathname);
    if (!OWN) pointLinks();

    // translation picker: keeps the place
    var es = document.getElementById('edsel');
    if (es) {
      es.value = ED;
      es.addEventListener('change', function () {
        var to = es.value;
        if (!OWN) {          // Gill and compare pages change in place
          ED = to; set('gsb-ed', ED); root.setAttribute('data-ed', ED); base = top + ED + '/'; pointLinks(); closeGill();
          return;
        }
        var m = /\/(kjv|bsb|msb)\/([^?#]*)$/.exec(window.location.pathname), path = (m && m[2]) || 'index.html';
        var cl = /^concordance\/([a-z])\.html$/.exec(path);
        if (cl && window.GSB_CONC && (window.GSB_CONC[to] || '').indexOf(cl[1]) < 0) path = 'concordance/index.html';
        set('gsb-ed', to);
        window.location.href = top + to + '/' + path + window.location.hash;
      });
    }

    // compare view: which translations to show
    var cmp = document.querySelector('.cmp'), boxes = document.querySelectorAll('.cmpsel input');
    if (cmp && boxes.length) {
      var want = (get('gsb-cmp') || EDS.join(',')).split(',');
      var apply = function (save) {
        var on = [], i;
        for (i = 0; i < boxes.length; i++) if (boxes[i].checked) on.push(boxes[i].value);
        for (i = 0; i < EDS.length; i++) cmp.classList.toggle('hide-' + EDS[i], on.indexOf(EDS[i]) < 0);
        cmp.style.setProperty('--n', on.length);
        if (save) set('gsb-cmp', on.join(','));
      };
      for (var b = 0; b < boxes.length; b++) {
        boxes[b].checked = want.indexOf(boxes[b].value) >= 0;
        boxes[b].addEventListener('change', function (e) {
          var any = false;
          for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) any = true;
          if (!any) e.target.checked = true;      // always at least one
          apply(true);
        });
      }
      var anyOn = false;
      for (b = 0; b < boxes.length; b++) if (boxes[b].checked) anyOn = true;
      if (!anyOn) for (b = 0; b < boxes.length; b++) boxes[b].checked = true;
      apply(false);
    }

    // hosted copy: keep pages for offline reading
    // opened from a home-screen icon, or as the App Store app, there is no browser Back button, so give one
    var inApp = window.location.protocol === 'capacitor:' || window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    var barEl = document.querySelector('header.bar');
    if (inApp && barEl && !EMBED && window.history.length > 1) {
      var bk = document.createElement('button'); bk.type = 'button'; bk.className = 'back'; bk.setAttribute('aria-label', 'Back'); bk.textContent = '\u2039';
      bk.addEventListener('click', function () { window.history.back(); });
      barEl.insertBefore(bk, barEl.firstChild);
    }
    var hosted = window.location.protocol === 'https:' || ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && /^http/.test(window.location.protocol));
    if (hosted && 'serviceWorker' in navigator && window.caches && !EMBED) {
      navigator.serviceWorker.register(top + 'sw.js').catch(function () {});
      var off = document.getElementById('offline'), om = document.getElementById('offmsg');
      if (off) {
        off.hidden = false;
        var saveAll = function (which, btn) {
          btn.disabled = true; om.textContent = 'Starting…';
          var rootUrl = new URL(top, window.location.href).href;
          fetch(rootUrl + 'assets/files-' + which + '.json').then(function (r) { return r.json(); }).then(function (list) {
            return caches.open('gsb-' + window.GSB_BUILD).then(function (cache) {
              var i = 0, done = 0, failed = 0;
              var one = function () {
                if (i >= list.length) return Promise.resolve();
                var u = rootUrl + list[i++];
                return cache.match(u).then(function (hit) {
                  if (hit) return null;
                  return fetch(u).then(function (r) {
                    if (!r.ok) { failed++; return null; }
                    if (!r.redirected) return cache.put(u, r);
                    return r.blob().then(function (bl) { return cache.put(u, new Response(bl, { status: r.status, statusText: r.statusText, headers: r.headers })); });
                  });
                }).catch(function () { failed++; }).then(function () {
                  done++;
                  if (done % 20 === 0 || done === list.length) om.textContent = 'Saved ' + done + ' of ' + list.length + ' pages…';
                  return one();
                });
              };
              return Promise.all([one(), one(), one(), one(), one(), one()]).then(function () {
                om.textContent = failed ? (list.length - failed) + ' pages saved; ' + failed + ' could not be fetched. Press the button again to finish.'
                                        : 'Done: ' + list.length + ' pages are saved on this device.';
                btn.disabled = false;
              });
            });
          }).catch(function () { om.textContent = 'Could not save just now. Check the connection and try again.'; btn.disabled = false; });
        };
        var sb = off.querySelectorAll('button[data-save]');
        for (var k = 0; k < sb.length; k++) sb[k].addEventListener('click', function (e) { saveAll(e.target.getAttribute('data-save'), e.target); });
      }
    }

    if (EMBED) {
      // show only the verse asked for; links to other pages open in the main window
      var id = window.location.hash.slice(1), sec = id && document.getElementById(id);
      var vm = /[?&]v=(\d+)-(\d+)/.exec(window.location.search);
      if (vm && cmp) {          // a few verses of one translation
        for (var vv = +vm[1]; vv <= +vm[2]; vv++) { var row = document.getElementById('v' + vv); if (row) row.className += ' only'; }
        for (var ee = 0; ee < EDS.length; ee++) cmp.classList.toggle('hide-' + EDS[ee], EDS[ee] !== ED);
      } else if (sec) sec.className += ' only';
      var as = document.querySelectorAll('a[href]');
      for (var q = 0; q < as.length; q++) if (as[q].getAttribute('href').charAt(0) !== '#') as[q].target = '_top';
      var tell = function () { if (window.parent !== window) window.parent.postMessage({ gsbHeight: Math.ceil((document.querySelector('main') || document.body).getBoundingClientRect().height) + 2 }, '*'); };
      tell(); window.addEventListener('load', tell); window.setTimeout(tell, 300);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !document.querySelector('.pop')) window.parent.postMessage({ gsbClose: 1 }, '*'); });
    }

    var tb = document.getElementById('theme');
    if (tb) {
      var label = function () { tb.textContent = isDark() ? 'Light' : 'Dark'; };
      label();
      tb.addEventListener('click', function () {
        var next = isDark() ? 'light' : 'dark';
        root.setAttribute('data-theme', next); set('gsb-theme', next); label();
      });
    }

    var go = document.getElementById('go'), msg = document.getElementById('gomsg');
    if (go && go.form) {
      go.form.addEventListener('submit', function (e) {
        e.preventDefault();
        var r = resolve(go.value);
        if (!r) return;
        if (r.href) {
          var cm = cmp && /^bible\/([a-z0-9]+-\d+\.html)(#.*)?$/.exec(r.href);      // on a compare page, stay in the compare view
          window.location.href = cm ? cm[1] + '?ed=' + ED + (cm[2] || '') : base + r.href; return;
        }
        msg.textContent = r.msg;
      });
      go.addEventListener('input', function () { msg.textContent = ''; });
    }

    // catechism questions at the end of a chapter: open the catechism last used, reveal answers
    var chq = document.querySelectorAll('.chq details');
    if (chq.length) {
      var lastDoc = get('gsb-chq');
      for (var d = 0; d < chq.length; d++) {
        if (chq[d].getAttribute('data-doc') === lastDoc) chq[d].open = true;
        chq[d].addEventListener('toggle', function (e) { if (e.target.open) set('gsb-chq', e.target.getAttribute('data-doc')); });
      }
      var showA = function (li, on) {
        var a = li.querySelector('.qa'), b = li.querySelector('.reveal');
        a.hidden = !on; b.textContent = on ? 'Hide answer' : 'Show answer'; b.setAttribute('aria-expanded', on ? 'true' : 'false');
      };
      document.querySelector('.chq').addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.classList.contains('reveal')) { var li = b.closest('li'); showA(li, li.querySelector('.qa').hidden); }
        if (b.classList.contains('revealall')) {
          var lis = b.closest('details').querySelectorAll('li'), all = true, i;
          for (i = 0; i < lis.length; i++) if (lis[i].querySelector('.qa').hidden) all = false;
          for (i = 0; i < lis.length; i++) showA(lis[i], !all);
          b.textContent = all ? 'Show all answers' : 'Hide all answers';
        }
      });
    }

    // catechisms: jump to a question by number
    var qj = document.querySelector('.qjump input');
    if (qj) qj.addEventListener('change', function () {
      var el = document.getElementById(qj.getAttribute('data-pre') + (+qj.value));
      if (el) { window.location.hash = '#' + el.id; qj.blur(); }
    });

    // chapter list in the page head
    var sel = document.querySelector('.chsel');
    if (sel) sel.addEventListener('change', function () { window.location.href = sel.value; });

    // left and right arrow keys turn the chapter; "/" puts the cursor in the Go box
    document.addEventListener('keydown', function (e) {
      var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
      if (e.key === 'Escape') { closePop(); closeGill(); return; }
      if (e.key === 'Enter' && t && t.matches && t.matches('span.vn[data-s]') && !EMBED) { openVerse(t); return; }
      if (typing || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === '/' && go) { e.preventDefault(); go.focus(); return; }
      var a = e.key === 'ArrowLeft' ? document.querySelector('.cnav a[rel=prev]') : e.key === 'ArrowRight' ? document.querySelector('.cnav a[rel=next]') : null;
      if (a) window.location.href = a.href;
    });

    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('.scripture a.xm, .scripture a.fnr, .gill a.nm:not(.fnb)') : null;
      if (a) { if (openPop(a)) e.preventDefault(); return; }
      if (pop && !(e.target.closest && e.target.closest('.pop'))) closePop();
      var plainClick = !EMBED && e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
      var vn = e.target.closest ? e.target.closest('.scripture a.vn, .cmp a.vn, .scripture .vn[data-s], .cmp .vn[data-s]') : null;
      if (vn && plainClick) { e.preventDefault(); openVerse(vn); return; }
      var sr = e.target.closest ? e.target.closest('a.sref[data-v]') : null;
      if (sr && plainClick) { e.preventDefault(); openRef(sr); return; }
      if (gbox && !(e.target.closest && e.target.closest('.gbox'))) closeGill();
    });
    window.addEventListener('resize', function () { closePop(); closeGill(); });

    // remember the last chapter read; offer it on the home page
    var art = document.querySelector('article.chapter, article.gill, article.cmpart');
    var h1 = art && art.querySelector('.chead h1');
    var isConf = /\bconfpage\b/.test(document.body.className) && !/\/index\.html$|\/$/.test(window.location.pathname);
    if (isConf && !EMBED) set('gsb-last', JSON.stringify({ href: window.location.pathname.split('/').slice(-2).join('/'), label: document.title.split(' \u2013 ')[0] }));
    else if (h1 && !EMBED) {
      var path = (OWN ? OWN + '/' : '') + window.location.pathname.split('/').slice(-2).join('/');
      set('gsb-last', JSON.stringify({ href: path, label: (document.body.className.indexOf('gillpage') >= 0 ? 'Gill on ' : document.body.className.indexOf('cmppage') >= 0 ? 'Comparing ' : '') + h1.textContent.replace(/\s+/g, ' ') + (OWN ? ' (' + OWN.toUpperCase() + ')' : '') }));
    }
    var res = document.getElementById('resume');
    if (res) {
      try {
        var last = JSON.parse(get('gsb-last') || 'null');
        if (last && /^((kjv|bsb|msb)\/bible|gill|compare|confessions)\/[a-z0-9-]+\.html$/.test(last.href)) {
          var link = res.querySelector('a'); link.href = top + last.href; link.textContent = last.label; res.hidden = false;
        }
      } catch (err) {}
    }

    // reading plans: mark today's row and offer a jump to it
    var d = new Date(), id = 'd' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    var row = document.getElementById(id), nav = document.querySelector('.monthnav');
    if (row && nav) {
      row.className += ' today';
      var j = document.createElement('a');
      j.href = '#' + id; j.className = 'jump'; j.textContent = 'Today';
      nav.insertBefore(j, nav.firstChild);
      if (window.location.hash === '#today') row.scrollIntoView({ block: 'center' });
    }

    // reading plans: tick off readings, catch up to today, start over (ticks stay on this device)
    var ptab = document.querySelector('table.plan.mc, table.plan.ch');
    if (ptab && nav) {
      var mc = /\bmc\b/.test(ptab.className), pkey = 'gsb-plan-' + (mc ? 'mcheyne' : 'chronological');
      var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      var todayKey = id.slice(1), done = {}, cells = [], undoSnap = null;
      try { var arr = JSON.parse(get(pkey) || '[]'); for (var a = 0; a < arr.length; a++) done[arr[a]] = 1; } catch (err) {}
      function save() { var out = []; for (var k in done) if (done[k]) out.push(k); out.sort(); set(pkey, JSON.stringify(out)); }
      function dateName(k) { return parseInt(k.slice(3), 10) + ' ' + MONTHS[parseInt(k.slice(0, 2), 10) - 1]; }
      var ptabs = document.querySelectorAll('table.plan'), rows = document.querySelectorAll('table.plan tr[id^="d"]');
      for (var r = 0; r < rows.length; r++) {
        var day = rows[r].id.slice(1), tds = rows[r].querySelectorAll('td');
        for (var c = 0; c < tds.length; c++) {
          var key = mc ? day + '.' + c : day, first = tds[c].querySelector('a, .na');
          var cb = document.createElement('input');
          cb.type = 'checkbox'; cb.className = 'tick'; cb.setAttribute('data-k', key);
          cb.setAttribute('aria-label', 'Read: ' + dateName(day) + ', ' + (first ? first.textContent : 'reading'));
          tds[c].insertBefore(cb, tds[c].firstChild);
          cells.push({ k: key, day: day, cb: cb, td: tds[c] });
        }
      }
      var box = document.createElement('div'); box.className = 'planprog';
      box.innerHTML = '<p class="pstat"></p><p class="pnext"></p>' +
        '<p class="pact"><button type="button" class="pcatch">Catch up to today</button> <button type="button" class="preset">Start over</button></p>' +
        '<p class="pmsg" hidden></p><p class="pnote">Your ticks are kept on this device only.</p>';
      nav.parentNode.insertBefore(box, nav);
      var stat = box.querySelector('.pstat'), nxt = box.querySelector('.pnext'), msg = box.querySelector('.pmsg');
      function refresh() {
        var n = 0, firstOpen = null, behind = {}, i;
        for (i = 0; i < cells.length; i++) {
          var on = !!done[cells[i].k];
          cells[i].cb.checked = on; cells[i].td.classList.toggle('done', on);
          if (on) n++;
          else { if (!firstOpen) firstOpen = cells[i].day; if (cells[i].day < todayKey) behind[cells[i].day] = 1; }
        }
        var nb = 0; for (i in behind) nb++;
        var total = cells.length, unit = mc ? 'readings' : 'days';
        stat.textContent = n.toLocaleString() + ' of ' + total.toLocaleString() + ' ' + unit + ' read. Today is ' + dateName(todayKey) + '.' +
          (nb ? ' ' + nb + (nb === 1 ? ' earlier day is' : ' earlier days are') + ' not finished.' : '');
        if (n === total) nxt.textContent = 'You have read the whole plan. Start over to read it again.';
        else nxt.innerHTML = 'Next unread: <a href="#d' + firstOpen + '">' + dateName(firstOpen) + '</a>';
      }
      function say(text) {
        msg.innerHTML = ''; msg.appendChild(document.createTextNode(text + ' '));
        var u = document.createElement('button'); u.type = 'button'; u.className = 'linkbtn'; u.textContent = 'Undo';
        u.addEventListener('click', function () { done = undoSnap || {}; undoSnap = null; save(); refresh(); msg.hidden = true; });
        msg.appendChild(u); msg.hidden = false;
      }
      function snap() { undoSnap = {}; for (var k in done) undoSnap[k] = done[k]; }
      function onTick(e) {
        var t = e.target; if (!t.classList || !t.classList.contains('tick')) return;
        if (t.checked) done[t.getAttribute('data-k')] = 1; else delete done[t.getAttribute('data-k')];
        save(); refresh();
      }
      for (var pt = 0; pt < ptabs.length; pt++) ptabs[pt].addEventListener('change', onTick);
      box.querySelector('.pcatch').addEventListener('click', function () {
        snap(); var added = 0;
        for (var i = 0; i < cells.length; i++) if (cells[i].day < todayKey && !done[cells[i].k]) { done[cells[i].k] = 1; added++; }
        save(); refresh();
        if (added) say('Marked ' + added.toLocaleString() + (mc ? (added === 1 ? ' reading' : ' readings') : (added === 1 ? ' day' : ' days')) + ' before today as read.');
        else { msg.textContent = 'Everything before today is already ticked.'; msg.hidden = false; }
      });
      box.querySelector('.preset').addEventListener('click', function () {
        msg.innerHTML = '';
        msg.appendChild(document.createTextNode('Clear every tick in this plan? '));
        var y = document.createElement('button'); y.type = 'button'; y.className = 'linkbtn'; y.textContent = 'Yes, start over';
        var no = document.createElement('button'); no.type = 'button'; no.className = 'linkbtn'; no.textContent = 'Cancel';
        y.addEventListener('click', function () { snap(); done = {}; save(); refresh(); say('All ticks cleared.'); });
        no.addEventListener('click', function () { msg.hidden = true; });
        msg.appendChild(y); msg.appendChild(document.createTextNode(' ')); msg.appendChild(no); msg.hidden = false;
      });
      refresh();
    }

    // audio Bible: a Listen button on every chapter, streaming the public-domain recordings from OpenBible.com
    var lb = document.querySelector('button.listen');
    if (lb) {
      var ed = document.documentElement.getAttribute('data-ed') || 'bsb', ab = lb.getAttribute('data-a'), nt = parseInt(ab, 10) >= 40;
      var NARR = ed === 'msb' ? [['david', 'David', 'msb/MSB_', '_D']] : ed === 'kjv' ? [['david', 'David', 'kjv/KJV_', '']] :
        [['souer', 'Bob Souer', 'souer/BSB_', ''], ['hays', 'Barry Hays', 'hays/BSB_', '_H'], ['gilbert', 'Jordan Scott Gilbert', 'gilbert/BSB_', '_G']]
          .concat(nt ? [['gilbert_music', 'Jordan Scott Gilbert, with music', 'gilbert_music/BSB_', '_Gm']] : []).concat([['david', 'David', 'david/BSB_', '_D']]);
      var panel = null, player = null;
      function pick() { var want = get('gsb-narrator-' + ed); for (var i = 0; i < NARR.length; i++) if (NARR[i][0] === want) return NARR[i]; return NARR[0]; }
      function srcFor(n) { return 'https://openbible.com/audio/' + n[2] + ab + n[3] + '.mp3'; }
      function build() {
        panel = document.createElement('div'); panel.className = 'player';
        var n = pick(), sel = '';
        if (NARR.length > 1) {
          sel = '<label class="narr">Read by <select>';
          for (var i = 0; i < NARR.length; i++) sel += '<option value="' + NARR[i][0] + '"' + (NARR[i] === n ? ' selected' : '') + '>' + NARR[i][1] + '</option>';
          sel += '</select></label>';
        } else sel = '<span class="narr">Read by ' + n[1] + '</span>';
        panel.innerHTML = '<audio controls preload="none" playsinline></audio><div class="pmeta">' + sel +
          '<label class="speed">Speed <select><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label></div>' +
          '<p class="perr" hidden>The recording could not be loaded. Audio needs an internet connection.</p>';
        lb.parentNode.parentNode.insertBefore(panel, lb.parentNode.nextSibling);
        player = panel.querySelector('audio'); player.src = srcFor(n);
        var ns = panel.querySelector('.narr select'), sp = panel.querySelector('.speed select'), er = panel.querySelector('.perr');
        var rate = parseFloat(get('gsb-audio-speed') || '1'); sp.value = String(rate); if (!sp.value) sp.value = '1';
        player.playbackRate = parseFloat(sp.value);
        player.addEventListener('loadedmetadata', function () { player.playbackRate = parseFloat(sp.value); });
        player.addEventListener('error', function () { er.hidden = false; });
        player.addEventListener('playing', function () { er.hidden = true; });
        sp.addEventListener('change', function () { player.playbackRate = parseFloat(sp.value); set('gsb-audio-speed', sp.value); });
        if (ns) ns.addEventListener('change', function () {
          for (var i = 0; i < NARR.length; i++) if (NARR[i][0] === ns.value) {
            if (NARR[i][0] !== 'gilbert_music') set('gsb-narrator-' + ed, ns.value);
            var playing = !player.paused; player.src = srcFor(NARR[i]); player.playbackRate = parseFloat(sp.value);
            if (playing) player.play().catch(function () {});
          }
        });
      }
      lb.addEventListener('click', function () {
        if (!panel) { build(); player.play().catch(function () {}); lb.setAttribute('aria-expanded', 'true'); lb.textContent = 'Hide player'; return; }
        var open = panel.hidden; panel.hidden = !open;
        if (!open) player.pause();
        lb.setAttribute('aria-expanded', open ? 'true' : 'false'); lb.textContent = open ? 'Hide player' : 'Listen';
      });
    }

    // concordance: narrow the word list while typing
    var wf = document.getElementById('wf');
    if (wf) {
      var secs = document.querySelectorAll('.widx');
      wf.addEventListener('input', function () {
        var q = wf.value.toLowerCase().replace(/^\s+|\s+$/g, '');
        for (var i = 0; i < secs.length; i++) {
          var links = secs[i].querySelectorAll('a'), any = false;
          for (var k = 0; k < links.length; k++) {
            var ok = !q || links[k].textContent.toLowerCase().indexOf(q) === 0;
            links[k].hidden = !ok; if (ok) any = true;
          }
          secs[i].hidden = !any;
        }
      });
    }
  });
})();
