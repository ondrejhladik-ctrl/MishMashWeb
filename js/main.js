/* =====================================================================
   MISH MASH — main.js
   Čistý JavaScript bez knihoven (jen Lenis na plynulý scroll, když je k dispozici).
   Každý blok si sám zkontroluje, jestli má na stránce co dělat,
   takže stejný soubor běží na všech podstránkách.
   ===================================================================== */
(function () {
    'use strict';
    window.MM_READY = true;      // pro pojistku v <head>

    var doc = document.documentElement;
    var site = document.getElementById('site');
    var menu = document.getElementById('menu');
    function mq(q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; }
    var REDUCED = mq('(prefers-reduced-motion: reduce)').matches;
    var HOVER = mq('(hover: hover) and (pointer: fine)').matches;
    var MOBILE = mq('(max-width: 860px), (hover: none)');      // stejné jako v CSS

    function qs(s, c) { return (c || document).querySelector(s); }
    function qsa(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function lerp(a, b, t) { return a + (b - a) * Math.min(1, t); }
    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }
    function unit() { return clamp(window.innerWidth * 0.00069444, 0.6, 1.25); }   // = --u v CSS
    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function inView(node, cb, opts) {
        if (!('IntersectionObserver' in window)) { cb(true); return; }
        new IntersectionObserver(function (en) { cb(en[0].isIntersecting); }, opts || {}).observe(node);
    }


    /* ─── BAREVNÉ PÁRY (stejné hodnoty jako v CSS = varianty loga) ─── */
    var PAIRS = ['pink', 'blue', 'lime', 'mint', 'red', 'rose'];
    var PAGE_PAIR = { '': 'pink', index: 'pink', koncerty: 'blue', clenove: 'lime', releasy: 'mint', fotky: 'red', poptavka: 'rose', odeslano: 'pink' };
    function slug(url) { return url.pathname.split('/').pop().replace(/\.html?$/i, ''); }
    var IG = 'https://www.instagram.com/mish.mash.official/';


    /* ─── JEDNA SMYČKA requestAnimationFrame PRO VŠECHNY ANIMACE ─── */
    var tasks = [];
    function onFrame(fn) { tasks.push(fn); }
    var scroll = { y: window.scrollY, v: 0 };      // v = vyhlazená rychlost scrollu (px / snímek)
    var lenis = null;
    if (!REDUCED && HOVER && typeof window.Lenis === 'function') {
        try { lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 }); }
        catch (e) { lenis = null; }   // fallback: nativní scroll
    }
    var last = performance.now();
    function loop(now) {
        var dt = clamp((now - last) / 16.667, 0.2, 4);
        last = now;
        if (lenis) lenis.raf(now);
        var y = window.scrollY;
        scroll.v = lerp(scroll.v, y - scroll.y, 0.25);
        scroll.y = y;
        for (var i = 0; i < tasks.length; i++) tasks[i](dt, now);
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);


    /* ─── ROZDĚLENÍ TEXTU NA SLOVA / ZNAKY (kvůli animacím) ─── */
    function splitWords(node) {
        var text = node.textContent.replace(/\s+/g, ' ').trim();
        if (!node.hasAttribute('aria-label')) node.setAttribute('aria-label', text);
        node.textContent = '';
        text.split(' ').forEach(function (w, i, arr) {
            var o = el('span', 'w'), inner = el('span', 'wi', w);
            o.setAttribute('aria-hidden', 'true');
            inner.style.setProperty('--i', i);
            o.appendChild(inner);
            node.appendChild(o);
            if (i < arr.length - 1) node.appendChild(document.createTextNode(' '));
        });
    }
    function splitChars(node) {
        var text = node.textContent.trim();
        node.textContent = '';
        Array.prototype.forEach.call(text, function (ch, i) {
            var s = el('span', 'c', ch === ' ' ? ' ' : ch);
            s.style.setProperty('--i', i);
            node.appendChild(s);
        });
    }
    qsa('[data-split]').forEach(splitWords);
    qsa('[data-chars]').forEach(splitChars);


    /* ─── ODHALOVÁNÍ PŘI SCROLLU (.is-in) ─── */
    var revealIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            en.target.classList.add('is-in');
            revealIO.unobserve(en.target);
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 }) : null;
    function reveal(node) { if (revealIO) revealIO.observe(node); else node.classList.add('is-in'); }
    qsa('[data-reveal], [data-split], .statement, .hero, .page-hero, .album').forEach(reveal);


    /* ─── TITULKY ROZTAŽENÉ PŘES CELOU ŠÍŘKU (scaleX jako Frontier Dialogues) ─── */
    var measureCtx = null;
    function leftBearing(node) {      // skutečná mezera vlevo od tvaru prvního písmene (každé písmeno má jinou)
        var ch = (node.textContent || '').trim().charAt(0);
        if (!ch) return 0;
        var cs = getComputedStyle(node);
        try {
            measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
            measureCtx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
            var m = measureCtx.measureText(ch);
            if (typeof m.actualBoundingBoxLeft === 'number') return Math.max(0, -m.actualBoundingBoxLeft);
        } catch (e) {}
        return 0;
    }
    function fitStretch() {
        qsa('.stretch').forEach(function (box) {
            var inner = box.firstElementChild;
            if (!inner) return;
            var w = inner.offsetWidth, W = box.clientWidth;
            // u titulků podstránek se písmo posouvá doleva o boční mezeru prvního písmene (--lsb) → o ni roztáhnout víc
            var lsb = box.closest('.ph-title') ? leftBearing(inner) : 0;
            box.style.setProperty('--lsb', lsb.toFixed(2) + 'px');
            if (w && W) box.style.setProperty('--sx', clamp(W / Math.max(1, w - lsb), 0.4, 3.2).toFixed(4));
        });
    }


    /* ─── ZUBATÝ OKRAJ LISTU – barva zubů podle sekce vedle ─── */
    var EDGE = { black: '#0B0B0B', paper: '#F3EFE6' };
    function offsetIn(node, root) {
        var y = 0;
        while (node && node !== root) { y += node.offsetTop; node = node.offsetParent; }
        return y;
    }
    function paintEdge() {
        var edge = site ? qs('.site-edge', site) : null;
        if (!edge) return;
        var stops = [], pos = 0;
        qsa('[data-edge]', site).forEach(function (s) {
            var top = offsetIn(s, site), bot = top + s.offsetHeight, c = EDGE[s.dataset.edge] || s.dataset.edge;
            if (top > pos) stops.push(EDGE.paper + ' ' + pos + 'px ' + top + 'px');
            stops.push(c + ' ' + top + 'px ' + bot + 'px');
            pos = bot;
        });
        stops.push(EDGE.paper + ' ' + pos + 'px');
        edge.style.background = 'linear-gradient(180deg,' + stops.join(',') + ')';
    }


    /* ─── MENU / ROZCESTNÍK – list stránky se odklopí (Frontier Dialogues) ───
       Desktop: najetí na rail vlevo (nebo klik na MENU) → list se otočí a odhalí menu.
       Mobil: list odjede doprava. Najetí na řádek přebarví podklad barvou podstránky. */
    var menuInner = menu ? qs('.menu-inner', menu) : null;
    var toggles = qsa('[data-menu-toggle]');
    var creatureBox = document.getElementById('creature');
    var isOpen = false, openT = 0, closeT = 0, leaving = false, lastToggle = null, preloaded = false, openY = 0, openedAt = 0, openedByHover = false;

    function setGround(pair) {
        if (!menu) return;
        if (pair) menu.setAttribute('data-pair', pair); else menu.removeAttribute('data-pair');
    }

    function setOpen(v, focus) {
        if (!menu || !site || v === isOpen) return;
        isOpen = v;
        clearTimeout(openT); clearTimeout(closeT);
        if (v) {
            var y = window.scrollY, h = window.innerHeight;
            openY = y;
            openedAt = Date.now();
            // osa otáčení = pod spodním okrajem okna (aby šly přečíst všechny řádky menu)
            site.style.transformOrigin = MOBILE.matches ? ('0px ' + y + 'px') : ('50% ' + Math.round(y + h * 1.15) + 'px');
            if (lenis) lenis.stop();
            doc.style.overflow = 'hidden';
            preloadCreatures();
        } else {
            setGround(null);
            hideCreature();
            if (lenis) lenis.start();
            doc.style.overflow = '';
        }
        doc.classList.toggle('menu-open', v);
        if (menuInner) menuInner.inert = !v;
        toggles.forEach(function (b) { b.setAttribute('aria-expanded', String(v)); });
        if (v && focus) { var f = qs('.menu-row', menu); if (f) f.focus({ preventScroll: true }); }
        if (!v && focus && lastToggle) lastToggle.focus({ preventScroll: true });
    }

    function trapFocus(e) {
        var f = qsa('a[href], button:not([disabled])', menu);
        if (!f.length) return;
        var first = f[0], lastF = f[f.length - 1], a = document.activeElement;
        if (!menu.contains(a)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && a === first) { e.preventDefault(); lastF.focus(); }
        else if (!e.shiftKey && a === lastF) { e.preventDefault(); first.focus(); }
    }

    // fotka („stvoření“), která při najetí na řádek vykoukne zpod odklopeného listu
    var creature = null, creatureImg = null;
    function edgeX(y) {   // kde je při odklopení levý okraj listu (v souřadnicích okna)
        var th = 30 * Math.PI / 180, W = site.offsetWidth, rail = site.offsetLeft;
        var Ox = rail + W / 2, Oy = window.innerHeight * 1.15, shift = 560 * unit();
        return Ox - (W / 2) * Math.cos(th) - Math.tan(th) * (y - Oy + (W / 2) * Math.sin(th)) + shift;
    }
    function preloadCreatures() {
        if (preloaded || !menu) return;
        preloaded = true;
        qsa('.menu-row[data-img]', menu).forEach(function (r) { var i = new Image(); i.src = r.dataset.img; });
    }
    function showCreature(row) {
        if (!creatureBox || !row.dataset.img || MOBILE.matches) return;
        if (!creature) {
            creature = el('div', 'creature tri');
            creatureImg = el('img');
            creatureImg.alt = '';
            creatureImg.decoding = 'async';
            creature.appendChild(creatureImg);
            creatureBox.appendChild(creature);
        }
        var r = row.getBoundingClientRect(), t = qs('.menu-title', row).getBoundingClientRect();
        var cw = creature.offsetWidth || 300, ch = cw * 4 / 3;
        var cy = clamp(r.top + r.height / 2 - ch * 0.45, 12, window.innerHeight - ch - 12);
        var cx = Math.max(t.right + 30, edgeX(cy + ch / 2) - cw * 0.62);
        creature.style.left = Math.round(cx) + 'px';
        creature.style.top = Math.round(cy) + 'px';
        creature.setAttribute('data-pair', row.dataset.pair);
        if (creatureImg.getAttribute('src') !== row.dataset.img) creatureImg.src = row.dataset.img;
        creature.classList.remove('is-on');
        void creature.offsetWidth;
        creature.classList.add('is-on');
    }
    function hideCreature() { if (creature) creature.classList.remove('is-on'); }

    if (menu && site) {
        if (HOVER) {
            menu.addEventListener('mouseenter', function () {
                if (!isOpen && !MOBILE.matches && !leaving) openT = setTimeout(function () { openedByHover = true; setOpen(true); }, 140);
            });
            menu.addEventListener('mouseleave', function () { clearTimeout(openT); });
            site.addEventListener('mouseenter', function () {
                // zavírat najetím jen když se menu otevřelo najetím na rail a list už dojel
                // (při otevření tlačítkem MENU by se jinak list pod stojícím kurzorem točil tam a zpět)
                if (isOpen && openedByHover && !leaving && !MOBILE.matches && Date.now() - openedAt > 900) closeT = setTimeout(function () { setOpen(false); }, 320);
            });
            site.addEventListener('mouseleave', function () { clearTimeout(closeT); });
        }
        // klik na rail (zavřené menu) = otevřít
        menu.addEventListener('click', function (e) {
            if (!isOpen && !e.target.closest('.menu-home')) { e.preventDefault(); setOpen(true); }
        });
        // klik na odklopený list = zavřít (a nic na stránce nespustit)
        site.addEventListener('click', function (e) {
            if (isOpen && !leaving) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
        }, true);
        toggles.forEach(function (b) {
            b.addEventListener('click', function (e) {
                e.stopPropagation();
                lastToggle = b;
                openedByHover = false;
                setOpen(!isOpen, e.detail === 0);       // detail 0 = ovládání klávesnicí → přesunout fokus
            });
        });
        // pojistka: kdyby se stránka pod menu přece jen posunula (iOS), menu se zavře
        window.addEventListener('scroll', function () {
            if (isOpen && !leaving && Math.abs(window.scrollY - openY) > 40) setOpen(false);
        }, { passive: true });
        document.addEventListener('keydown', function (e) {
            if (!isOpen) return;
            if (e.key === 'Escape') setOpen(false, true);
            else if (e.key === 'Tab') trapFocus(e);
        });
        qsa('.menu-row', menu).forEach(function (row) {
            row.addEventListener('mouseenter', function () {
                if (MOBILE.matches || leaving) return;
                setGround(row.dataset.pair);
                showCreature(row);
            });
            row.addEventListener('mouseleave', function () {
                if (leaving) return;
                setGround(null);
                hideCreature();
            });
            row.addEventListener('focus', function () { if (isOpen) setGround(row.dataset.pair); });
            row.addEventListener('blur', function () { if (!leaving) setGround(null); });
        });
        // náhled barvy podstránky na railu při najetí na odkaz (navbar, rozcestník, tlačítka…)
        if (HOVER) qsa('a[data-pair]').forEach(function (a) {
            if (menu.contains(a)) return;
            a.addEventListener('mouseenter', function () { if (!isOpen && !leaving) setGround(a.dataset.pair); });
            a.addEventListener('mouseleave', function () { if (!isOpen && !leaving) setGround(null); });
        });
    }


    /* ─── PŘECHODY MEZI STRÁNKAMI ───
       Odchod: list „odletí“ dolů (nebo se při otevřeném menu dotočí pryč) a podklad
       se přebarví barvou cílové stránky. Příchod: nový list přiletí zespoda. */
    function arrive() {
        if (!site || !doc.classList.contains('is-entering')) return;
        site.style.transformOrigin = '0px ' + Math.round(window.scrollY + window.innerHeight) + 'px';
        void site.offsetWidth;
        doc.classList.add('is-arriving');
        doc.classList.remove('is-entering');
        setTimeout(function () { doc.classList.remove('is-arriving'); }, 1250);
    }
    function leave(href) {
        if (leaving) return;
        leaving = true;
        if (REDUCED || !site) { window.location.href = href; return; }
        var pair = PAGE_PAIR[slug(new URL(href, window.location.href))];
        setGround(pair || null);
        hideCreature();
        if (!isOpen) site.style.transformOrigin = '0px ' + Math.round(window.scrollY + window.innerHeight) + 'px';
        doc.classList.add('is-leaving');
        setTimeout(function () { window.location.href = href; }, 640);
    }
    function toTop() {
        if (lenis) lenis.scrollTo(0, { duration: 1.6 });
        else window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
    }
    document.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var a = e.target.closest ? e.target.closest('a[href]') : null;
        if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
        var url = new URL(a.href, window.location.href);
        if (url.protocol !== window.location.protocol || url.host !== window.location.host) return;
        if (/\.[a-z0-9]+$/i.test(url.pathname) && !/\.html?$/i.test(url.pathname)) return;   // soubory normálně
        var here = slug(window.location) || 'index', there = slug(url) || 'index';
        if (here === there) {                                   // odkaz na stránku, kde už jsem
            if (url.hash) return;
            e.preventDefault();
            if (isOpen) setOpen(false); else toTop();
            return;
        }
        e.preventDefault();
        leave(url.href);
    });
    // návrat tlačítkem Zpět (bfcache) → vrátit list na místo
    window.addEventListener('pageshow', function (e) {
        if (!e.persisted) return;
        leaving = false;
        doc.classList.remove('is-leaving', 'is-entering', 'is-arriving');
        setOpen(false);
        setGround(null);
    });


    /* ─── INTRO (jen při první návštěvě v relaci) ───
       MISH nahoře, MASH dole, barvy se míchají → půlky se rozjedou a přiletí stránka. */
    function runIntro(done) {
        var intro = document.getElementById('intro');
        if (!intro || REDUCED || doc.classList.contains('no-intro')) {
            if (intro) intro.parentNode.removeChild(intro);
            done();
            return;
        }
        var count = qs('.intro-count', intro), circles = qsa('.duo-b', intro);
        var t0 = performance.now(), DUR = 1350, k = 0;
        var swap = setInterval(function () { k++; intro.setAttribute('data-pair', PAIRS[k % PAIRS.length]); }, 130);
        function tick(now) {
            var p = clamp((now - t0) / DUR, 0, 1), e = 1 - Math.pow(1 - p, 3);
            if (count) count.textContent = ('00' + Math.round(p * 100)).slice(-3) + ' %';
            circles.forEach(function (c) {
                c.setAttribute('cx', (40 + e * 640).toFixed(1));
                c.setAttribute('r', (70 + Math.sin(p * Math.PI) * 150).toFixed(1));
            });
            if (p < 1) requestAnimationFrame(tick); else finish();
        }
        function finish() {
            clearInterval(swap);
            intro.setAttribute('data-pair', doc.getAttribute('data-pair') || 'pink');
            setTimeout(function () {
                intro.classList.add('is-out');
                done();
                setTimeout(function () {
                    if (intro.parentNode) intro.parentNode.removeChild(intro);
                    doc.classList.add('no-intro');
                }, 1100);
            }, 140);
        }
        requestAnimationFrame(tick);
    }


    /* ─── DUOTÓNOVÉ LOGO – kruh jezdí za kurzorem, klik přemíchá barvy ─── */
    function svgPoint(svg, x, y) {
        var m = svg.getScreenCTM();
        if (!m) return null;
        var p = svg.createSVGPoint();
        p.x = x; p.y = y;
        return p.matrixTransform(m.inverse());
    }
    function cyclePair() {
        var cur = doc.getAttribute('data-pair') || 'pink';
        doc.setAttribute('data-pair', PAIRS[(PAIRS.indexOf(cur) + 1) % PAIRS.length]);
    }
    qsa('[data-duo]').forEach(function (svg, n) {
        var c = qs('.duo-b', svg);
        if (!c) return;
        var vb = svg.viewBox.baseVal;
        var st = { x: +c.getAttribute('cx'), y: +c.getAttribute('cy'), r: +c.getAttribute('r') };
        var base = st.r, tx = st.x, ty = st.y, hover = false, vis = false, seed = n * 1.7;
        var zone = svg.closest('.hero, .footer, .sleeve, .page-hero') || svg;
        zone.addEventListener('pointermove', function (e) {
            if (e.pointerType !== 'mouse') return;
            var p = svgPoint(svg, e.clientX, e.clientY);
            if (p) { tx = p.x; ty = p.y; hover = true; }
        });
        zone.addEventListener('pointerleave', function () { hover = false; });
        svg.addEventListener('click', function () { cyclePair(); st.r = 0; });
        inView(svg, function (v) { vis = v; });
        if (REDUCED) return;
        onFrame(function (dt, now) {
            if (!vis) return;
            if (!hover) {                                       // bez myši kruh sám bloudí
                var t = now / 1000 + seed;
                tx = vb.x + vb.width * (0.5 + 0.42 * Math.sin(t * 0.43));
                ty = vb.y + vb.height * (0.5 + 0.55 * Math.sin(t * 0.71 + 1));
            }
            st.x = lerp(st.x, tx, 0.085 * dt);
            st.y = lerp(st.y, ty, 0.085 * dt);
            st.r = lerp(st.r, base * (hover ? 1.06 : 1), 0.06 * dt);
            c.setAttribute('cx', st.x.toFixed(1));
            c.setAttribute('cy', st.y.toFixed(1));
            c.setAttribute('r', st.r.toFixed(1));
        });
    });


    /* ─── TITULEK PODSTRÁNKY – „reflektor“ v barvě B, který jezdí za kurzorem ─── */
    qsa('.ph-title').forEach(function (title, n) {
        var copy = qs('.ph-copy', title);
        if (!copy || REDUCED) return;
        var zone = title.closest('.page-hero') || title;
        var w = 1, h = 1, x = -1, y = -1, tx = 0, ty = 0, r = 0, hover = false, vis = false;
        function size() { w = title.offsetWidth; h = title.offsetHeight; }
        size();
        window.addEventListener('resize', size);
        zone.addEventListener('pointermove', function (e) {
            if (e.pointerType !== 'mouse') return;
            var b = title.getBoundingClientRect();
            tx = e.clientX - b.left; ty = e.clientY - b.top; hover = true;
        });
        zone.addEventListener('pointerleave', function () { hover = false; });
        inView(title, function (v) { vis = v; if (v) size(); });
        onFrame(function (dt, now) {
            if (!vis) return;
            if (!hover) {
                var t = now / 1000 + n * 2;
                tx = w * (0.5 + 0.46 * Math.sin(t * 0.5));
                ty = h * (0.5 + 0.32 * Math.sin(t * 0.93));
            }
            if (x < 0) { x = tx; y = ty; }
            x = lerp(x, tx, 0.09 * dt);
            y = lerp(y, ty, 0.09 * dt);
            r = lerp(r, Math.max(70, h * 0.62), 0.05 * dt);
            copy.style.setProperty('--x', x.toFixed(1) + 'px');
            copy.style.setProperty('--y', y.toFixed(1) + 'px');
            copy.style.setProperty('--r', r.toFixed(1) + 'px');
        });
    });


    /* ─── PSACÍ STROJ: MISH MASH = bicí / basa / … ─── */
    qsa('[data-typer]').forEach(function (node) {
        if (REDUCED) return;
        var words = node.dataset.typer.split('|'), wi = words.length - 1, txt = node.textContent;
        function type() {
            var w = words[wi];
            if (txt.length < w.length) {
                txt = w.slice(0, txt.length + 1);
                node.textContent = txt;
                setTimeout(type, 65 + Math.random() * 70);
            } else {
                setTimeout(erase, wi === words.length - 1 ? 2800 : 1250);
            }
        }
        function erase() {
            if (txt.length) {
                txt = txt.slice(0, -1);
                node.textContent = txt;
                setTimeout(erase, 30);
            } else {
                wi = (wi + 1) % words.length;
                setTimeout(type, 240);
            }
        }
        setTimeout(erase, 3400);
    });


    /* ─── BĚŽÍCÍ PÁS – rychlost a směr podle scrollu ─── */
    qsa('[data-marquee]').forEach(function (m) {
        var track = qs('.marquee-track', m), unitEl = track ? qs('.mq-unit', track) : null;
        if (!unitEl) return;
        var copies = 1;
        while (track.scrollWidth < window.innerWidth * 2.6 && copies < 14) {
            track.appendChild(unitEl.cloneNode(true));
            copies++;
        }
        var x = 0, dir = -1, w = unitEl.offsetWidth, vis = false;
        inView(m, function (v) { vis = v; });
        window.addEventListener('resize', function () { w = unitEl.offsetWidth; });
        if (REDUCED) return;
        onFrame(function (dt) {
            if (!vis || !w) return;
            if (Math.abs(scroll.v) > 0.6) dir = scroll.v > 0 ? -1 : 1;
            x += dir * (1.15 + Math.min(Math.abs(scroll.v) * 0.55, 32)) * dt;
            if (x <= -w) x += w;
            if (x > 0) x -= w;
            track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
            m.style.setProperty('--skew', clamp(-scroll.v * 0.3, -14, 14).toFixed(2) + 'deg');
        });
    });


    /* ─── VARIABILNÍ TLOUŠŤKA PÍSMA – písmena u kurzoru „zhubnou“ (Urbanist 100–900) ─── */
    qsa('[data-weight]').forEach(function (block) {
        if (!HOVER || REDUCED) return;
        // výchozí tloušťka a tloušťka u kurzoru (jde nastavit atributy data-weight-base / data-weight-near)
        var BASE = +block.dataset.weightBase || 850, MIN = +block.dataset.weightNear || 160, R = 260;
        var chars = [];
        qsa('[data-w]', block).forEach(function (n) {
            var text = n.textContent;
            n.textContent = '';
            Array.prototype.forEach.call(text, function (ch) {
                if (ch === ' ') { n.appendChild(document.createTextNode(' ')); return; }
                var s = el('span', 'ch', ch);
                n.appendChild(s);
                chars.push({ el: s, w: BASE, x: 0, y: 0 });
            });
        });
        var cx = -1e4, cy = -1e4, active = false, idle = true;
        function measure() {
            chars.forEach(function (c) {
                var r = c.el.getBoundingClientRect();
                c.x = r.left + r.width / 2;
                c.y = r.top + r.height / 2 + window.scrollY;
            });
        }
        block.addEventListener('pointerenter', function () { measure(); active = true; });
        block.addEventListener('pointermove', function (e) { cx = e.clientX; cy = e.clientY; });
        block.addEventListener('pointerleave', function () { active = false; });
        onFrame(function () {
            if (!active && idle) return;
            var py = cy + window.scrollY, moving = false;
            for (var i = 0; i < chars.length; i++) {
                var c = chars[i], target = BASE;
                if (active) {
                    var k = Math.max(0, 1 - Math.hypot(c.x - cx, c.y - py) / R);
                    target = BASE - (BASE - MIN) * k * k;
                }
                var nw = c.w + (target - c.w) * 0.2;
                if (Math.abs(nw - target) < 3) nw = target; else moving = true;
                if (Math.round(nw / 10) !== Math.round(c.w / 10)) c.el.style.fontWeight = String(Math.round(nw / 10) * 10);
                c.w = nw;
            }
            idle = !moving && !active;
        });
    });


    /* ─── ROZCESTNÍK NA ÚVODU – fotka letí za kurzorem ─── */
    qsa('[data-ix]').forEach(function (list) {
        var sec = list.closest('section'), fl = sec ? qs('.ix-float', sec) : null, img = fl ? qs('img', fl) : null;
        if (!fl || !img || !HOVER) return;
        var x = 0, y = 0, tx = 0, ty = 0, on = false, rot = 0, fresh = true;
        qsa('.ix-row', list).forEach(function (row) {
            row.addEventListener('mouseenter', function () {
                if (img.getAttribute('src') !== row.dataset.img) img.src = row.dataset.img;
                fl.setAttribute('data-pair', row.dataset.pair);
                fl.classList.add('is-on');
                on = true;
            });
            row.addEventListener('mouseleave', function () { fl.classList.remove('is-on'); on = false; });
        });
        sec.addEventListener('pointermove', function (e) {
            var b = sec.getBoundingClientRect();
            tx = e.clientX - b.left; ty = e.clientY - b.top;
            if (fresh) { x = tx; y = ty; fresh = false; }
        });
        sec.addEventListener('pointerleave', function () { fresh = true; });
        onFrame(function (dt) {
            if (!on && !fl.classList.contains('is-on')) return;
            var nx = lerp(x, tx, 0.14 * dt), ny = lerp(y, ty, 0.14 * dt);
            rot = lerp(rot, clamp((nx - x) * 0.7, -16, 16), 0.12 * dt);
            x = nx; y = ny;
            fl.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
            fl.style.setProperty('--rot', rot.toFixed(2) + 'deg');
        });
    });


    /* ─── VIDEO – náhled potichu ve smyčce (jen když je vidět), klik = pustit se zvukem ─── */
    qsa('[data-video]').forEach(function (v) {
        var vid = qs('.video-el', v), tc = qs('[data-timecode]', v);
        if (!vid) return;
        var vis = false, playing = false;
        function preview() {
            if (playing || REDUCED) return;
            if (vis) { var p = vid.play(); if (p && p.catch) p.catch(function () {}); } else vid.pause();
        }
        inView(v, function (s) { vis = s; preview(); }, { threshold: 0.15 });
        if (tc) onFrame(function () {
            if (!vis || playing) return;
            var s = vid.currentTime || 0;
            tc.textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, Math.floor(s) % 60, Math.floor((s % 1) * 25)].map(pad2).join(':');
        });
        function start() {
            if (playing) return;
            playing = true;
            vid.currentTime = 0;
            vid.muted = false;
            vid.loop = false;
            vid.controls = true;
            vid.setAttribute('data-lenis-prevent', '');
            var p = vid.play(); if (p && p.catch) p.catch(function () {});
            v.classList.add('is-playing');
            v.removeAttribute('data-cursor');
            v.removeAttribute('role');
            v.removeAttribute('tabindex');
        }
        // klik (nebo Enter/mezerník) kamkoli do videa = pustit od začátku se zvukem
        v.addEventListener('click', start);
        v.addEventListener('keydown', function (e) { if (!playing && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); start(); } });
    });


    /* ─── KONCERTY – vykreslení ze souboru js/koncerty.js ───
       Seřadí podle data, nejbližší zvýrazní, po datu přesune do „Odehráno“. */
    var DNY = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
    function parseDate(s) {
        var p = String(s).split('-');
        return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
    }
    function gigData() {
        var list = (window.MM_KONCERTY || []).filter(function (g) { return g && /^\d{4}-\d{2}-\d{2}$/.test(g.datum || ''); })
            .map(function (g) { var o = {}; for (var k in g) o[k] = g[k]; o.d = parseDate(g.datum); return o; });
        var today = new Date(); today.setHours(0, 0, 0, 0);
        return {
            up: list.filter(function (g) { return g.d >= today; }).sort(function (a, b) { return a.d - b.d; }),
            past: list.filter(function (g) { return g.d < today; }).sort(function (a, b) { return b.d - a.d; })
        };
    }
    function gigRow(g, isNext, isPast) {
        var href = (g.odkaz && /^https?:\/\//i.test(g.odkaz)) ? g.odkaz : '';
        var row = el(href && !isPast ? 'a' : 'div', 'gig' + (isNext ? ' is-next' : '') + (isPast ? ' is-past' : ''));
        if (row.tagName === 'A') {
            row.href = href; row.target = '_blank'; row.rel = 'noopener';
            row.setAttribute('data-cursor', g.tlacitko || 'Vstupenky');
        }
        var date = el('span', 'gig-date');
        date.appendChild(el('b', '', pad2(g.d.getDate()) + '.' + pad2(g.d.getMonth() + 1) + '.'));
        row.appendChild(date);
        row.appendChild(el('span', 'gig-city', g.mesto || ''));
        var venue = el('span', 'gig-venue', g.misto || '');
        row.appendChild(venue);
        row.appendChild(el('span', 'gig-time', g.cas || ''));
        row.appendChild(el('span', 'gig-cta', isPast ? 'Odehráno' : (row.tagName === 'A' ? (g.tlacitko || 'Vstupenky') + ' ↗' : (g.pozn || 'Info brzy'))));
        return row;
    }
    function plural(n, one, few, many) { return n === 1 ? one : (n >= 2 && n <= 4 ? few : many); }
    var gigs = gigData();
    qsa('[data-gigs]').forEach(function (box) {
        var past = box.dataset.gigs === 'past', arr = past ? gigs.past : gigs.up, limit = +box.dataset.limit || 99;
        box.textContent = '';
        if (!arr.length) {
            var empty = el('p', 'gigs-empty', box.dataset.empty || 'Nové koncerty brzy oznámíme.');
            if (!past) {
                empty.appendChild(document.createTextNode(' '));
                var a = el('a', '', 'Sleduj nás na Instagramu ↗');
                a.href = IG; a.target = '_blank'; a.rel = 'noopener';
                empty.appendChild(a);
            }
            box.appendChild(empty);
            return;
        }
        arr.slice(0, limit).forEach(function (g, i) {
            var row = gigRow(g, !past && i === 0, past);
            row.setAttribute('data-reveal', '');
            row.style.setProperty('--i', i);
            box.appendChild(row);
            reveal(row);
        });
    });
    qsa('[data-gig-count]').forEach(function (n) {
        var c = gigs.up.length;
        n.textContent = c ? c + ' ' + plural(c, 'koncert', 'koncerty', 'koncertů') + ' v plánu' : 'Brzy oznámíme';
    });
    qsa('[data-next-gig]').forEach(function (n) {
        var g = gigs.up[0];
        n.textContent = g ? 'Nejbližší koncert ' + g.d.getDate() + '. ' + (g.d.getMonth() + 1) + '. ' + (g.mesto || '') : 'Koncerty brzy';
    });


    /* ─── ČLENOVÉ – míchání písmen ve jméně + paralaxa velkého slova v pozadí ─── */
    var GLYPHS = 'MISHAMASH✱#*/+=';
    function scramble(node) {
        var final = node.dataset.text || node.textContent;
        node.dataset.text = final;
        if (!node.hasAttribute('aria-label')) node.setAttribute('aria-label', final);
        if (REDUCED || node._busy) return;
        node._busy = true;
        var start = performance.now(), dur = 650;
        (function step(now) {
            var p = clamp((now - start) / dur, 0, 1), n = Math.floor(p * final.length), out = '';
            for (var i = 0; i < final.length; i++) {
                out += (i < n || final[i] === ' ') ? final[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
            }
            node.textContent = out;
            if (p < 1) requestAnimationFrame(step);
            else { node.textContent = final; node._busy = false; }
        })(start);
    }
    qsa('[data-scramble]').forEach(function (node) {
        var host = node.closest('[data-scramble-host]') || node;
        host.addEventListener('mouseenter', function () { scramble(node); });
        inView(node, function (v) { if (v && !node._seen) { node._seen = true; scramble(node); } }, { threshold: 0.6 });
    });
    qsa('[data-parallax]').forEach(function (node) {
        if (REDUCED) return;
        var k = parseFloat(node.dataset.parallax) || 0.2, host = node.parentNode, vis = false;
        inView(host, function (v) { vis = v; });
        onFrame(function () {
            if (!vis) return;
            var r = host.getBoundingClientRect();
            node.style.setProperty('--px', ((r.top + r.height / 2 - window.innerHeight / 2) * k).toFixed(1) + 'px');
        });
    });
    // bez myši (mobil): druhá fotka člena se ukáže, když fotka dojede doprostřed obrazovky
    qsa('.member').forEach(function (m) {
        var photo = qs('.member-photo', m);
        if (!photo || !qs('.m-alt', m)) return;
        inView(photo, function (v) { m.classList.toggle('is-alt', v && MOBILE.matches); }, { rootMargin: '-40% 0px -40% 0px' });
    });


    /* ─── FOTKY – hromada (táhni myší) ⇄ mřížka, lightbox ─── */
    qsa('[data-gallery]').forEach(function (gal) {
        var items = qsa('.ph', gal), btns = qsa('[data-mode]');
        if (!items.length) return;
        // hromada jen s myší na širší obrazovce; přepínač se ukáže/schová i při změně velikosti okna
        function canPile() { return !MOBILE.matches; }
        var toggle = btns.length ? btns[0].closest('.gal-toggle') : null;
        function syncToggle() { if (toggle) toggle.style.display = ''; }   // přepínač je vidět vždy
        var mode = canPile() ? 'pile' : 'grid', pos = [], z = items.length + 10, first = true;
        // první fotky v HTML leží v hromadě navrchu
        items.forEach(function (it, i) { it.style.zIndex = items.length - i; });
        syncToggle();
        function rnd(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
        function ratio(it) { return (+it.dataset.h || 3) / (+it.dataset.w || 4); }

        function layout() {
            var W = gal.clientWidth;
            var cols = W > 1100 ? 4 : W > 640 ? 3 : 2, gap = W > 640 ? 14 : 10;
            var cw = (W - gap * (cols - 1)) / cols;
            gal.style.setProperty('--cw', cw.toFixed(1) + 'px');
            if (mode === 'grid') {
                var hs = [];
                for (var c = 0; c < cols; c++) hs.push(0);
                items.forEach(function (it, i) {
                    var col = hs.indexOf(Math.min.apply(null, hs));
                    pos[i] = { x: col * (cw + gap), y: hs[col], r: 0, s: 1 };
                    hs[col] += cw * ratio(it) + gap;
                });
                gal.style.height = Math.round(Math.max.apply(null, hs) - gap) + 'px';
            } else {
                var H = clamp(window.innerHeight * 0.92, 640, 1040);
                items.forEach(function (it, i) {
                    var rr = ratio(it), vw = W * (rr > 1 ? 0.16 : 0.22) * (0.85 + rnd(i + 1) * 0.4);
                    pos[i] = {
                        x: 16 + rnd(i + 7) * Math.max(0, W - vw - 32),
                        y: 16 + rnd(i + 13) * Math.max(0, H - vw * rr - 32),
                        r: (rnd(i + 21) - 0.5) * 28,
                        s: vw / cw
                    };
                });
                gal.style.height = Math.round(H) + 'px';
            }
            items.forEach(function (it, i) { apply(it, pos[i]); });
        }
        function apply(it, p) {
            it.style.setProperty('--x', p.x.toFixed(1) + 'px');
            it.style.setProperty('--y', p.y.toFixed(1) + 'px');
            it.style.setProperty('--r', p.r.toFixed(2) + 'deg');
            it.style.setProperty('--s', p.s.toFixed(4));
        }
        function setMode(m) {
            mode = m;
            gal.classList.toggle('is-pile', m === 'pile');
            gal.classList.toggle('is-grid', m === 'grid');
            btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === m)); });
            items.forEach(function (it) { it.setAttribute('data-cursor', m === 'pile' ? 'Táhni' : 'Zvětšit'); });
            layout();
            setTimeout(paintEdge, 1000);
        }
        btns.forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode); }); });

        // start: všechny fotky na jedné kupce uprostřed → při příjezdu se rozletí
        gal.classList.add('is-ready', mode === 'pile' ? 'is-pile' : 'is-grid');
        if (mode === 'grid') items.forEach(function (it) { it.setAttribute('data-cursor', 'Zvětšit'); });
        var W0 = gal.clientWidth;
        items.forEach(function (it, i) {
            it.style.transition = 'none';
            apply(it, { x: W0 / 2 - 150, y: 120, r: (rnd(i + 3) - 0.5) * 40, s: 0.6 });
        });
        gal.style.height = clamp(window.innerHeight * 0.92, 640, 1040) + 'px';
        void gal.offsetWidth;
        inView(gal, function (v) {
            if (!v || !first) return;
            first = false;
            items.forEach(function (it, i) {
                it.style.transition = '';
                it.style.transitionDelay = (i * 30) + 'ms';
                setTimeout(function () { it.style.transitionDelay = ''; }, 1400 + i * 30);
            });
            layout();
            setTimeout(paintEdge, 1200);
        }, { threshold: 0.05 });
        var rT;
        window.addEventListener('resize', function () {
            clearTimeout(rT);
            rT = setTimeout(function () {
                syncToggle();
                if (!first) layout();
                paintEdge();
            }, 160);
        });

        // tahání fotek v hromadě
        var drag = null;
        items.forEach(function (it, i) {
            it.addEventListener('pointerdown', function (e) {
                if (mode !== 'pile' || e.button !== 0) return;
                e.preventDefault();
                drag = { i: i, sx: e.clientX, sy: e.clientY, ox: pos[i].x, oy: pos[i].y, moved: false };
                try { it.setPointerCapture(e.pointerId); } catch (err) {}
                it.style.zIndex = ++z;
                it.classList.add('is-drag');
            });
            it.addEventListener('pointermove', function (e) {
                if (!drag || drag.i !== i) return;
                var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
                if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
                pos[i].x = drag.ox + dx;
                pos[i].y = drag.oy + dy;
                pos[i].r = lerp(pos[i].r, clamp(dx * 0.05, -20, 20), 0.15);
                apply(it, pos[i]);
            });
            function end() {
                if (!drag || drag.i !== i) return;
                var moved = drag.moved;
                drag = null;
                it.classList.remove('is-drag');
                if (!moved) openLb(i);
            }
            it.addEventListener('pointerup', end);
            it.addEventListener('pointercancel', end);
            it.addEventListener('click', function (e) {
                if (mode === 'grid' || e.detail === 0) openLb(i);   // detail 0 = Enter / mezerník
                else e.preventDefault();
            });
        });

        // lightbox
        var lb = qs('.lightbox');
        if (!lb) return;
        var lbImg = qs('.lb-img', lb), lbCount = qs('.lb-count', lb), cur = 0, back = null, sx = 0;
        function show(i) {
            cur = (i + items.length) % items.length;
            var it = items[cur], im = qs('img', it);
            lbImg.src = it.dataset.full || im.currentSrc || im.src;
            lbImg.alt = im.alt;
            lbCount.textContent = pad2(cur + 1) + ' / ' + pad2(items.length);
            // kdo fotil: atribut u fotky, jinak výchozí autor galerie
            var credit = qs('.lb-credit', lb), name = it.dataset.author || gal.dataset.author;
            if (credit) {
                credit.hidden = !name;
                var link = qs('a', credit);
                if (link && name) { link.textContent = name; link.href = it.dataset.authorUrl || gal.dataset.authorUrl || '#'; }
            }
        }
        function openLb(i) {
            back = document.activeElement;
            show(i);
            lb.hidden = false;
            requestAnimationFrame(function () { lb.classList.add('is-open'); });
            if (lenis) lenis.stop();
            doc.style.overflow = 'hidden';
            qs('.lb-close', lb).focus({ preventScroll: true });
        }
        function closeLb() {
            lb.classList.remove('is-open');
            setTimeout(function () { lb.hidden = true; }, 350);
            if (lenis) lenis.start();
            doc.style.overflow = '';
            if (back) back.focus({ preventScroll: true });
        }
        qs('.lb-close', lb).addEventListener('click', closeLb);
        qs('.lb-prev', lb).addEventListener('click', function () { show(cur - 1); });
        qs('.lb-next', lb).addEventListener('click', function () { show(cur + 1); });
        lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
        document.addEventListener('keydown', function (e) {
            if (lb.hidden) return;
            if (e.key === 'Escape') closeLb();
            else if (e.key === 'ArrowLeft') show(cur - 1);
            else if (e.key === 'ArrowRight') show(cur + 1);
            else if (e.key === 'Tab') {                      // fokus zůstane v lightboxu
                var f = qsa('button', lb), a = document.activeElement;
                if (e.shiftKey && a === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
                else if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
            }
        });
        lb.addEventListener('pointerdown', function (e) { sx = e.clientX; });
        lb.addEventListener('pointerup', function (e) {
            var dx = e.clientX - sx;
            if (Math.abs(dx) > 60 && e.pointerType !== 'mouse') show(cur + (dx < 0 ? 1 : -1));
        });
    });


    /* ─── SPOTIFY – přehrávač se načte až po kliknutí (kvůli soukromí) ───
       Do data-spotify vlož např. "artist/XXXX" nebo "album/XXXX" z odkazu na Spotify. */
    qsa('[data-spotify]').forEach(function (box) {
        var id = (box.dataset.spotify || '').trim().replace(/^\/+/, ''), btn = qs('.spotify-load', box);
        if (!btn) return;
        if (!/^(artist|album|track|playlist)\/[A-Za-z0-9]+$/.test(id)) {
            id = '';
            var note = qs('.spotify-note', box), lab = qs('b', btn);
            if (lab) lab.textContent = 'Otevřít Spotify';
            if (note) note.textContent = 'Otevře se v novém okně.';
        }
        btn.addEventListener('click', function () {
            if (!id) { window.open(box.dataset.fallback || 'https://open.spotify.com/', '_blank', 'noopener'); return; }
            var f = document.createElement('iframe');
            f.src = 'https://open.spotify.com/embed/' + id + '?utm_source=generator&theme=0';
            f.title = 'MISH MASH na Spotify';
            f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
            f.setAttribute('data-lenis-prevent', '');
            box.textContent = '';
            box.appendChild(f);
            box.classList.add('is-loaded');
        });
    });


    /* ─── FORMULÁŘ → ODESLAT NA MAIL (Web3Forms) ───
       Stejný nástroj jako na webu Live District: statický web sám maily neposílá,
       odeslání řeší Web3Forms (zdarma, bez účtu). Po úspěchu → stránka odeslano.html.
       KAM CHODÍ MAILY = přístupový klíč ACCESS_KEY níže:
         vlastní formulář „MISH MASH“ v dashboardu Web3Forms → příjemce mishmash.off@gmail.com
         (příjemce se mění v nastavení formuláře na web3forms.com, ne tady). */
    var ACCESS_KEY = 'c2b056bd-821c-4cb2-830a-1b391c78838e';

    function autosize(input) {     // políčka ve větě rostou podle textu
        var field = input.closest('.ml-field');
        if (!field) return;
        var m = field._m;
        if (!m) { m = field._m = el('span', 'ml-measure'); m.setAttribute('aria-hidden', 'true'); field.appendChild(m); }
        var cs = window.getComputedStyle(input);
        m.style.fontFamily = cs.fontFamily;
        m.style.fontSize = cs.fontSize;
        m.style.fontWeight = cs.fontWeight;
        m.style.letterSpacing = cs.letterSpacing;
        var isSel = input.tagName === 'SELECT', empty = !isSel && !input.value;
        m.style.fontStyle = cs.fontStyle;
        if (empty) { m.style.fontWeight = '600'; m.style.fontStyle = 'italic'; }
        var txt = isSel
            ? ((input.options[input.selectedIndex] || {}).text || '')
            : (input.value || input.placeholder || '');
        m.textContent = txt;
        var extra = isSel ? parseFloat(cs.fontSize) * 0.85 : 10;
        var max = field.parentNode ? field.parentNode.clientWidth : 9999;
        input.style.width = Math.min(max, Math.ceil(m.offsetWidth + extra)) + 'px';
    }

    qsa('form[data-form]').forEach(function (form) {
        form.setAttribute('novalidate', '');      // vlastní validace místo nativních bublin
        var status = qs('.form-status', form), btn = qs('.form-submit', form), label = btn ? qs('.fs-label', btn) : null;
        var sizers = qsa('[data-autosize]', form);
        function sizeAll() { sizers.forEach(autosize); }
        sizers.forEach(function (i) {
            i.addEventListener('input', function () { autosize(i); });
            i.addEventListener('change', function () { autosize(i); });
        });
        sizeAll();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeAll);
        window.addEventListener('resize', sizeAll);

        function setStatus(msg, isErr) {
            if (!status) return;
            status.textContent = msg || '';
            status.classList.toggle('is-error', !!isErr);
        }
        function validate() {
            var bad = null;
            qsa('input, select, textarea', form).forEach(function (n) {
                if (n.name === 'botcheck') return;
                var f = n.closest('.field'), ok = n.checkValidity();
                if (f) {
                    f.classList.remove('field-invalid');
                    if (!ok) { void f.offsetWidth; f.classList.add('field-invalid'); }
                }
                if (!ok && !bad) bad = n;
            });
            return bad;
        }
        form.addEventListener('input', function (e) {
            var f = e.target.closest ? e.target.closest('.field') : null;
            if (f && f.classList.contains('field-invalid') && e.target.checkValidity()) f.classList.remove('field-invalid');
        });
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var bad = validate();
            if (bad) { setStatus('Vyplň prosím zvýrazněná pole (jméno a e-mail jsou povinné).', true); bad.focus(); return; }
            var hp = form.querySelector('[name="botcheck"]');
            if (hp && hp.checked) return;                                   // robot
            var orig = label ? label.textContent : '';
            if (btn) btn.disabled = true;
            if (label) label.textContent = 'Odesílám…';
            setStatus('');

            var data = new FormData(form);
            data.append('access_key', ACCESS_KEY);
            data.append('subject', 'Nová poptávka — MISH MASH');
            data.append('from_name', 'MISH MASH web');
            var email = form.querySelector('[name="email"]');
            if (email && email.value) data.append('replyto', email.value);   // odpověď půjde rovnou poptávajícímu

            function fail(msg) {
                if (btn) btn.disabled = false;
                if (label) label.textContent = orig;
                setStatus(msg, true);
            }
            fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Accept': 'application/json' }, body: data })
                .then(function (r) { return r.json(); })
                .then(function (res) {
                    if (res && res.success) leave(new URL('odeslano.html', window.location.href).href);
                    else fail('Odeslání se nepovedlo. Zkus to prosím znovu, nebo nám napiš na Instagram.');
                })
                .catch(function () { fail('Odeslání se nepovedlo – zkontroluj připojení a zkus to znovu.'); });
        });
    });


    /* ─── VLASTNÍ KURZOR (jen myš) – kolečko, které u odkazů naroste a ukáže popisek ─── */
    if (HOVER && !REDUCED) {
        var cur = el('div', 'cursor'), dot = el('span', 'cursor-dot'), lab = el('span', 'cursor-label');
        cur.setAttribute('aria-hidden', 'true');
        cur.appendChild(dot); cur.appendChild(lab);
        document.body.appendChild(cur);
        doc.classList.add('has-cursor');
        var mx = -100, my = -100, kx = -100, ky = -100, shown = false;
        window.addEventListener('pointermove', function (e) {
            if (e.pointerType !== 'mouse') return;
            mx = e.clientX; my = e.clientY;
            if (!shown) { kx = mx; ky = my; shown = true; cur.classList.add('is-on'); }
        }, { passive: true });
        document.addEventListener('mouseleave', function () { shown = false; cur.classList.remove('is-on'); });
        document.addEventListener('pointerover', function (e) {
            var t = e.target.closest ? e.target : null;
            if (!t) return;
            var labelled = t.closest('[data-cursor]');
            var text = t.closest('input, textarea, select');
            var link = t.closest('a, button, label, [role="button"]');
            cur.classList.toggle('is-label', !!labelled && !text);
            cur.classList.toggle('is-text', !!text);
            cur.classList.toggle('is-link', !!link && !labelled && !text);
            if (labelled) lab.textContent = labelled.getAttribute('data-cursor');
        });
        onFrame(function (dt) {
            if (!shown) return;
            kx = lerp(kx, mx, 0.32 * dt);
            ky = lerp(ky, my, 0.32 * dt);
            cur.style.transform = 'translate3d(' + kx.toFixed(1) + 'px,' + ky.toFixed(1) + 'px,0)';
        });
    }


    /* ─── NAVBAR ČERNOBÍLE – podle světlosti pozadí pod ním ─── */
    (function () {
        var bar = qs('.topbar');
        if (!bar || !document.elementsFromPoint) return;
        function lum(c) {
            var m = c.match(/rgba?\(([^)]+)\)/);
            if (!m) return null;
            var p = m[1].split(',').map(parseFloat);
            if (p.length > 3 && p[3] === 0) return null;          // průhledné → hledat dál
            return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
        }
        var lastY = -1, lastW = -1;
        function check() {
            if (isOpen || !site) return;
            var x = site.getBoundingClientRect().left + 30, y = 40;
            var els = document.elementsFromPoint(x, y), L = null;
            for (var i = 0; i < els.length && L === null; i++) {
                if (bar.contains(els[i])) continue;
                for (var n = els[i]; n && n !== document.documentElement && L === null; n = n.parentElement) {
                    L = lum(getComputedStyle(n).backgroundColor);
                }
            }
            bar.classList.toggle('is-dark', L !== null && L > 0.5);
        }
        onFrame(function () {
            if (scroll.y === lastY && window.innerWidth === lastW) return;
            lastY = scroll.y; lastW = window.innerWidth;
            check();
        });
        window.addEventListener('load', check);
    })();


    /* ─── DROBNOSTI ─── */
    qsa('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });
    qsa('[data-top]').forEach(function (b) { b.addEventListener('click', toTop); });


    /* ─── START ─── */
    fitStretch();
    paintEdge();
    runIntro(function () { requestAnimationFrame(function () { requestAnimationFrame(arrive); }); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitStretch(); paintEdge(); });
    window.addEventListener('load', function () { fitStretch(); paintEdge(); });
    var resizeT;
    window.addEventListener('resize', function () {
        clearTimeout(resizeT);
        resizeT = setTimeout(function () { fitStretch(); paintEdge(); }, 120);
    });
})();
