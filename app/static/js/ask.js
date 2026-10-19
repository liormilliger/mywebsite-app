// /ask — streams answers from /api/ask (Server-Sent Events) and renders generated components.
(function () {
  const thread = document.getElementById('thread');
  const form = document.getElementById('askForm');
  const input = document.getElementById('q');
  const sendBtn = form.querySelector('.send');
  const CONTACT = window.ASK_CONTACT || {};

  // ── session state ──
  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  let sessionId;
  try { sessionId = sessionStorage.getItem('ask_sid') || newId(); sessionStorage.setItem('ask_sid', sessionId); }
  catch (_) { sessionId = newId(); }
  const state = { persona: null, history: [], turn: 0, tokens: 0, busy: false };

  // ── safe HTML ──
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => (/^(https?:\/\/|\/)/.test(String(u || '')) ? esc(u) : '#');
  function md(text) {
    return esc(text).split(/\n{2,}/).map(p =>
      '<p>' + p.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') + '</p>').join('');
  }

  // ── component renderers (data comes from the server, always escaped) ──
  const head = (kind, title) =>
    `<div class="gcard-h"><div><span class="kind">${esc(kind)}</span><h3>${esc(title)}</h3></div></div>`;
  // Sources open in a new tab so the conversation stays put. Site sections point to the
  // classic page (/classic#section), which doesn't switch the visitor's home view.
  const src = (href, label) => `<a href="${safeUrl(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
  const srcs = (...links) => `<div class="srcs"><span>sources</span>${links.filter(Boolean).join('')}</div>`;
  const FIT_LABEL = { strong: 'strong', good: 'good', growing: 'transferable', gap: 'to confirm' };
  const chipsOf = arr => '<div class="tchips">' + (arr || []).map(t => `<span>${esc(t)}</span>`).join('') + '</div>';

  // Reference cards collapse to one line under the answer; click it to expand the full card.
  // The role-fit table and the intro draft are the answer itself, so they stay open.
  const REF_LINE = {
    projects: c => ['Projects', c.items.map(p => p.name).join(' · '),
      [c.items[0] && c.items[0].url && src(c.items[0].url, c.items[0].name), src('/classic#projects', 'all projects')]],
    stack: c => ['Tech stack', c.groups.map(g => g.category).join(' · '), [src('/classic#tech', 'tech stack')]],
    timeline: c => ['Career story', c.items.map(i => i.title).join(' → '), [src('/classic#about', 'about'), src('/about-me', 'full story')]],
    stats: c => ['Impact', c.items.slice(0, 4).map(s => s.value + ' ' + s.label).join(' · '), [src('/classic#hero', 'home')]],
    certifications: c => ['Certifications', c.items.map(x => x.name).join(' · '), [src('/classic#education', 'education')]],
    architecture: c => ['How this site runs', c.title || '', [src('https://github.com/liormilliger/mywebsite-app', 'repo')]],
  };
  function renderComponent(c) {
    const fn = R[c.type];
    if (!fn) return '';
    const line = REF_LINE[c.type];
    if (!line) return fn(c);
    const [kind, text, links] = line(c);
    return `<details class="ref"><summary><span class="ref-k">${esc(kind)}</span><span class="ref-t">${esc(text)}</span>` +
      `<span class="ref-links">${links.filter(Boolean).join('')}</span><span class="ref-more" aria-hidden="true"></span></summary>${fn(c)}</details>`;
  }

  const R = {
    projects(c) {
      const [first, ...rest] = c.items;
      let html = '';
      if (first) {
        const img = first.image ? `<img src="${safeUrl(first.image)}" alt="${esc(first.name)} screenshot" loading="lazy">` : '';
        const links = [first.url && src(first.url, 'details'), first.repo && src(first.repo, 'repo'), src('/classic#projects', 'projects')].filter(Boolean).join('');
        html += `<div class="gcard">${head(first.featured ? 'Featured project' : 'Project', first.name)}
          <div class="proj${img ? '' : ' noimg'}">${img}<div><p>${esc(first.summary)}</p>${chipsOf(first.tags)}</div></div>
          ${links ? `<div class="srcs"><span>sources</span>${links}</div>` : ''}</div>`;
      }
      if (rest.length) {
        html += `<div class="gcard">${head('Also relevant', 'Ranked for you')}<div class="plist">` +
          rest.map(p => `<div><span>${esc(p.name)}<small>${esc(p.summary)}</small></span>${p.repo ? `<a href="${safeUrl(p.repo)}" target="_blank" rel="noopener noreferrer">repo ↗</a>` : ''}</div>`).join('') +
          '</div>' + srcs(src('/classic#projects', 'all projects')) + '</div>';
      }
      return html;
    },
    role_fit(c) {
      return `<div class="gcard">${head('Role fit', c.role)}
        <div class="fit-wrap"><table class="fit"><tr><th>Requirement</th><th>Evidence</th><th>Fit</th></tr>` +
        c.rows.map(r => `<tr><td>${esc(r.requirement)}</td><td>${esc(r.evidence)}</td><td><span class="lvl ${esc(r.fit)}">${esc(FIT_LABEL[r.fit] || r.fit)}</span></td></tr>`).join('') +
        `</table></div>${srcs(src('/static/files/LiorMilligerCV.pdf', 'CV'), src('/classic#about', 'about'), src('/classic#tech', 'tech stack'))}</div>`;
    },
    stack(c) {
      return `<div class="gcard">${head('Stack', 'Tools by area')}<div class="stack">` +
        c.groups.map(g => `<div><h5>${esc(g.category)}</h5>${chipsOf(g.items)}</div>`).join('') +
        '</div>' + srcs(src('/classic#tech', 'tech stack')) + '</div>';
    },
    timeline(c) {
      return `<div class="gcard">${head('Timeline', 'From jazz clubs to clusters')}<div class="tl">` +
        c.items.map(i => `<div><b>${esc(i.title)}</b><i>${esc(i.tag)}</i><p>${esc(i.text)}</p></div>`).join('') +
        '</div>' + srcs(src('/classic#about', 'about'), src('/about-me', 'full story')) + '</div>';
    },
    stats(c) {
      return `<div class="gcard">${head('Impact', 'In numbers')}<div class="stats">` +
        c.items.slice(0, 4).map(s => `<div><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join('') + '</div></div>';
    },
    certifications(c) {
      return `<div class="gcard">${head('Credentials', 'Certifications')}<div class="certs">` +
        c.items.map(x => `<a href="${safeUrl(x.url)}" target="_blank" rel="noopener noreferrer"><img src="${safeUrl(x.badge)}" alt="" loading="lazy">${esc(x.name)}</a>`).join('') +
        `</div><p class="note" style="margin-top:10px">Degrees: ${esc((c.education.degrees || []).join(' · '))}</p>${srcs(src('/classic#education', 'education'))}</div>`;
    },
    architecture(c) {
      const path = steps => `<div class="path">${(steps || []).map(esc).map(s => `<span>${s}</span>`).join('<i>→</i>')}</div>`;
      return `<div class="gcard">${head('How this site runs', c.title || 'How this site runs')}
        <p style="margin:0 0 10px;font-size:14px">${esc(c.summary)}</p>
        <p class="note" style="margin:0 0 6px">Production · Docker Compose on EC2</p>${path(c.pipeline)}
        ${c.pipeline_k8s ? `<p class="note" style="margin:10px 0 6px">Kubernetes path · EKS + ArgoCD, ready to switch on</p>${path(c.pipeline_k8s)}` : ''}
        ${srcs(src('https://github.com/liormilliger/mywebsite-app', 'mywebsite-app'), src('/classic#projects', 'projects'))}</div>`;
    },
    intro(c) {
      const id = 'intro' + Math.random().toString(36).slice(2, 8);
      return `<div class="gcard">${head('Action · needs your OK', 'Intro to Lior')}
        <div class="form"><label for="${id}to">To</label><input id="${id}to" value="${esc(c.to)}" readonly>
        <label for="${id}">Message</label><textarea id="${id}">${esc(c.message)}</textarea>
        <div class="row"><button class="btn" type="button" data-copy="${id}">Copy message</button>
        <a class="btn ghost" href="mailto:${esc(c.to)}?subject=${encodeURIComponent('Hello from your website')}" data-mail="${id}">Open in email</a>
        <span class="note" data-copynote="${id}"></span></div>
        <p class="note">Nothing is sent for you. Copy the message or open it in your email app.</p></div></div>`;
    },
  };

  // ── turns ──
  function addUserTurn(text) {
    const u = document.createElement('div');
    u.className = 'turn user';
    u.innerHTML = '<div class="bubble"></div>';
    u.firstChild.textContent = text;
    thread.appendChild(u);
  }
  const scroll = () => { thread.scrollTop = thread.scrollHeight; };

  function setBusy(b) {
    state.busy = b; sendBtn.disabled = b; input.disabled = b;
    document.querySelectorAll('.ask .chip').forEach(c => { if (c.tagName === 'BUTTON') c.disabled = b; });
  }

  async function ask(text, persona) {
    text = (text || '').trim();
    if (!text || state.busy) return;
    if (persona) {
      state.persona = persona;
      document.getElementById('ctxRole').textContent = persona;
      document.querySelectorAll('[data-persona]').forEach(x => x.classList.toggle('on', x.dataset.persona === persona));
    }
    setBusy(true);
    addUserTurn(text);
    const t = document.createElement('div');
    t.className = 'turn';
    t.innerHTML = '<div class="who"><b>lior.agent</b> · thinking</div><details class="trace" open><summary>trace</summary></details><div class="answer"><p><span class="caret"></span></p></div>';
    thread.appendChild(t); scroll();
    const trace = t.querySelector('.trace');
    const answerEl = t.querySelector('.answer');
    let answer = '', steps = 0, done = null;
    const comps = [];

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId, persona: state.persona, history: state.history, turn_index: state.turn }),
      });
      if (!res.ok || !res.body) {
        let msg = 'Something went wrong. Try again in a moment.';
        try { msg = (await res.json()).error || msg; } catch (_) {}
        throw new Error(msg);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done: end } = await reader.read();
        if (end) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const raw = buf.slice(0, i); buf = buf.slice(i + 2);
          const ev = (raw.match(/^event: (.*)$/m) || [])[1];
          const dataLine = (raw.match(/^data: (.*)$/m) || [])[1];
          if (!ev || dataLine == null) continue;
          const data = JSON.parse(dataLine);
          if (ev === 'trace') {
            steps++;
            const d = document.createElement('div'); d.className = 'step'; d.textContent = data.step; trace.appendChild(d);
          } else if (ev === 'text') {
            answer += data.delta;
            answerEl.innerHTML = md(answer);
            const last = answerEl.lastElementChild; if (last) last.insertAdjacentHTML('beforeend', '<span class="caret"></span>');
          } else if (ev === 'component') {
            comps.push(data);
            t.insertAdjacentHTML('beforeend', renderComponent(data));
          } else if (ev === 'done') {
            done = data;
          }
          scroll();
        }
      }
      answerEl.innerHTML = md(answer || '…');
    } catch (err) {
      answerEl.innerHTML = `<p class="err">${esc(err.message)}</p>`;
    }

    trace.open = false;
    trace.querySelector('summary').textContent = `trace · ${steps} steps`;
    const tok = done ? (done.input_tokens || 0) + (done.output_tokens || 0) : 0;
    state.tokens += tok;
    t.querySelector('.who').innerHTML = '<b>lior.agent</b>' + (done ? ` · ${esc(done.model)} · ${(done.latency_ms / 1000).toFixed(1)}s` + (tok ? ` · ${tok} tokens` : '') : '');
    if (done) {
      document.getElementById('hLat').textContent = (done.latency_ms / 1000).toFixed(1) + 's';
      document.getElementById('hTok').textContent = state.tokens.toLocaleString();
      document.getElementById('hModel').textContent = done.model;
    }
    if (answer) {
      addQaPin(t, text, answer, comps);
      state.history.push({ role: 'user', content: text }, { role: 'assistant', content: answer });
      state.history = state.history.slice(-10);
    }
    state.turn += 2;
    document.getElementById('ctxQ').textContent = state.turn / 2;
    setBusy(false);
    input.focus();
    scroll();
  }

  // ── brief: pin a whole question + answer ──
  const pins = [];
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
  function addQaPin(turnEl, question, answer, comps) {
    const fit = comps.find(c => c.type === 'role_fit');
    let detail = answer.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
    if (fit) {
      const by = lvl => fit.rows.filter(r => r.fit === lvl).map(r => r.requirement);
      const strong = by('strong'), trans = by('growing');
      detail += (strong.length ? ` Strong: ${strong.join(', ')}.` : '') + (trans.length ? ` Transferable: ${trans.join(', ')}.` : '');
    }
    const bar = document.createElement('div');
    bar.className = 'qa-actions';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'pin'; btn.textContent = 'Pin this Q&A';
    btn.addEventListener('click', () => {
      if (btn.classList.contains('done')) return;
      pins.push({ q: question, a: detail });
      renderPins();
      btn.textContent = 'Pinned'; btn.classList.add('done');
    });
    bar.appendChild(btn);
    turnEl.appendChild(bar);
  }
  function renderPins() {
    const box = document.getElementById('pins');
    box.innerHTML = pins.length ? '' : '<div class="empty">Nothing pinned yet. Use “Pin this Q&amp;A” under any answer.</div>';
    pins.forEach((p, i) => {
      const d = document.createElement('div');
      d.innerHTML = '<span></span><button type="button" aria-label="Remove">×</button>';
      d.firstChild.textContent = clip(p.q, 70);
      d.lastChild.addEventListener('click', () => { pins.splice(i, 1); renderPins(); });
      box.appendChild(d);
    });
  }
  document.getElementById('gen').addEventListener('click', () => {
    const out = document.getElementById('onepager');
    if (!pins.length) { out.innerHTML = '<p class="note">Pin at least one answer first.</p>'; return; }
    const aud = { Recruiter: 'hiring team', Engineer: 'engineering review', Founder: 'founding team' }[state.persona] || 'your team';
    out.innerHTML = `<div class="onepager"><h5>Lior Milliger</h5><div class="r">Platform Engineer · AI Systems · prepared for ${esc(aud)}</div><ul>` +
      pins.map(p => `<li><b>${esc(clip(p.q, 120))}</b><br>${esc(clip(p.a, 420))}</li>`).join('') +
      `</ul><div class="r" style="margin-top:8px">${[CONTACT.email, CONTACT.phone, (CONTACT.linkedin || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')].filter(Boolean).map(esc).join(' · ')}</div></div>` +
      `<button class="btn" id="dlPdf" type="button">Download PDF</button><span class="note" id="dlNote"></span>`;
    document.getElementById('dlPdf').addEventListener('click', () => downloadPdf(aud));
  });

  // ── one-pager as a PDF, built in the browser (jsPDF, self-hosted, loaded on first use) ──
  let jsPdfLoading = null;
  function loadJsPdf() {
    if (window.jspdf) return Promise.resolve(window.jspdf);
    if (!jsPdfLoading) {
      jsPdfLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '/static/js/vendor/jspdf-2.5.1.umd.min.js';
        s.onload = () => resolve(window.jspdf);
        s.onerror = () => { jsPdfLoading = null; reject(new Error('Could not load the PDF tool.')); };
        document.head.appendChild(s);
      });
    }
    return jsPdfLoading;
  }
  // The built-in PDF fonts cover Latin-1 only, so swap the few typographic characters we use.
  const pdfText = s => String(s || '')
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2192/g, '->').replace(/\u2026/g, '...').replace(/\u2022/g, '-').replace(/\u2726/g, '*')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
  async function downloadPdf(aud) {
    const note = document.getElementById('dlNote');
    try {
      const { jsPDF } = await loadJsPdf();
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = 210, M = 18, TW = W - 2 * M, BOTTOM = 297 - 22;
      const navy = [11, 25, 44], cyan = [20, 140, 190], grey = [90, 104, 122];
      let y = 24;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...navy);
      doc.text('Lior Milliger', M, y); y += 7;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...cyan);
      doc.text('Platform Engineer - DevOps & Cloud Infrastructure - AI Systems', M, y); y += 6;
      doc.setFontSize(9); doc.setTextColor(...grey);
      doc.text(pdfText(`Prepared for ${aud} - ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`), M, y); y += 4;
      doc.setDrawColor(...cyan); doc.setLineWidth(0.6); doc.line(M, y, W - M, y); y += 9;
      const footer = () => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...grey);
        doc.text(pdfText([CONTACT.email, CONTACT.phone, (CONTACT.linkedin || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), 'liormilliger.com'].filter(Boolean).join('  |  ')), M, 297 - 12);
      };
      pins.forEach((p, i) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5);
        const qt = pdfText(p.q).trim();
        const q = doc.splitTextToSize(qt.charAt(0).toUpperCase() + qt.slice(1), TW);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
        const a = doc.splitTextToSize(pdfText(p.a), TW);
        const need = q.length * 5.4 + a.length * 5 + 8;
        if (y + Math.min(need, 40) > BOTTOM) { footer(); doc.addPage(); y = 22; }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...navy);
        doc.text(q, M, y); y += q.length * 5.4 + 1;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(40, 48, 60);
        a.forEach(line => {
          if (y > BOTTOM) { footer(); doc.addPage(); y = 22; doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(40, 48, 60); }
          doc.text(line, M, y); y += 5;
        });
        y += i < pins.length - 1 ? 6 : 0;
      });
      footer();
      doc.save('Lior-Milliger-one-pager.pdf');
      if (note) note.textContent = '';
    } catch (err) {
      if (note) note.textContent = err.message || 'Could not create the PDF.';
    }
  }

  // ── events ──
  document.addEventListener('click', e => {
    const cp = e.target.closest('[data-copy]');
    if (cp) {
      const el = document.getElementById(cp.dataset.copy);
      const note = document.querySelector(`[data-copynote="${cp.dataset.copy}"]`);
      const fallback = () => { el.select(); if (note) note.textContent = 'Selected, press Ctrl/Cmd+C'; };
      try { navigator.clipboard.writeText(el.value).then(() => { if (note) note.textContent = 'Copied'; }, fallback); } catch (_) { fallback(); }
      return;
    }
    const ml = e.target.closest('[data-mail]');
    if (ml) { const el = document.getElementById(ml.dataset.mail); ml.href = ml.href.split('&body=')[0] + '&body=' + encodeURIComponent(el.value); return; }
    const chip = e.target.closest('.ask .chip[data-q]');
    if (chip) ask(chip.dataset.q, chip.dataset.persona || null);
  });
  // ── composer: Enter sends; Shift/Cmd/Ctrl/Alt+Enter adds a new line; grows with the text ──
  const hint = document.getElementById('qHint');
  const HINT = hint ? hint.textContent : '';
  function grow() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 200) + 'px';
    if (hint) hint.textContent = input.value.length > 1500 ? `${input.value.length.toLocaleString()} / 6,000 characters` : HINT;
  }
  input.addEventListener('input', grow);
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing) return;
    if (e.shiftKey) return; // browser inserts the new line
    e.preventDefault();
    if (e.metaKey || e.ctrlKey || e.altKey) {
      const { selectionStart: a, selectionEnd: b, value } = input;
      input.value = value.slice(0, a) + '\n' + value.slice(b);
      input.selectionStart = input.selectionEnd = a + 1;
      grow();
      return;
    }
    form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
  });
  form.addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; grow(); ask(v); });
})();
