// assistant.js - the TC Pipeline help assistant (chatbot).
//
// Add  <script src="assistant.js"></script>  just before </body> on every page. It:
//   - adds an "Assistant" item with a robot icon to the left sidebar, under the other menu links
//   - opens a chat panel next to the sidebar when that item is clicked (Esc or the X closes it)
//   - remembers the conversation while the user moves between pages (this browser tab only)
//
// How answers are produced (STRATEGY pattern, so the "brain" can be swapped without touching the screen):
//   AssistantEngine        the interface: reply(message, context) -> Promise<{ text, links }>
//   LocalAssistantEngine   works offline. Matches the question against the Help guides below.
//   HttpAssistantEngine    sends the question to a server that talks to a real AI model.
//
// DEMO MODE: no backend exists for the assistant yet, so USE_LOCAL is true. When a server route
// POST api/assistant exists, set USE_LOCAL to false. The AI key must live on that server, never in this file.
(function () {
    'use strict';

    const USE_LOCAL = true;
    const ASSISTANT_URL = 'api/assistant';
    const STORE_KEY = 'tcAssistant';
    const MAX_HISTORY = 40;     // messages kept in the browser
    const SEND_HISTORY = 10;    // messages sent to the server for context
    const MAX_INPUT = 500;

    // ======================================================================
    //  What the local assistant knows. Answers match the Help page guides.
    //  To teach it something new, add an entry: keywords (lower case), the answer, and optional links.
    // ======================================================================
    const TOPICS = [
        {
            id: 'dashboard',
            keywords: ['dashboard', 'overview', 'stat card', 'stats', 'needs attention', 'upcoming deadline', 'active deals', 'refresh', 'home page'],
            text: 'The Dashboard is your daily overview of every active deal. The stat cards count deals closing in the next 7 days, overdue deadlines, high-risk deals, closings that have passed and your active deals. "Needs Attention" lists overdue deadlines, passed closing dates and blockers. "Upcoming Deadlines" shows open deadlines in the next 30 days. The Active Deals table can be searched, filtered by risk and sorted. Use Refresh to reload the latest data.',
            links: [{ label: 'Open the Dashboard', href: 'index.html' }]
        },
        {
            id: 'new-deal',
            keywords: ['new deal', 'add deal', 'add a deal', 'create a deal', 'create transaction', 'add transaction', 'new transaction', 'create a transaction', 'file id', 'add a transaction'],
            text: 'To create a transaction: 1) click New Deal in the menu, 2) enter a File ID (required, and it must be unique), 3) fill in the property, people, dates, prices and milestones you know. Everything else can be left blank and added later. 4) Click the save button at the bottom of the form.',
            links: [{ label: 'Go to New Deal', href: 'add.html' }]
        },
        {
            id: 'edit-delete',
            keywords: ['edit', 'delete', 'remove a deal', 'remove deal', 'change a deal', 'update a deal', 'update deal', 'modify', 'milestone', 'checkbox'],
            text: 'Open Transactions (or use Edit in the dashboard table), click Edit on the deal, change what you need and save. The File ID can’t be changed. To remove a deal, click Delete and confirm. Tick the milestone checkboxes as each step is completed: the dashboard uses them to work out risk and which deadlines are still open.',
            links: [{ label: 'Go to Transactions', href: 'transactions.html' }]
        },
        {
            id: 'analyzer',
            keywords: ['analyzer', 'analyze', 'analyse', 'investment', 'cap rate', 'grm', 'gross rent', 'cash on cash', 'cash-on-cash', 'yield', 'roi', 'rental property', 'rent'],
            text: 'The Analyzer evaluates an investment property. Enter the purchase price, total cash invested and expected monthly rent, then the vacancy rate and management fee as percentages, and your yearly property taxes, insurance, maintenance, other expenses and mortgage payments. Click the analyze button and you’ll see the gross rent multiplier (GRM), gross yield, cap rate and cash-on-cash return.',
            links: [{ label: 'Open the Analyzer', href: 'analyzer.html' }]
        },
        {
            id: 'settings',
            keywords: ['settings', 'profile', 'my name', 'signature', 'brokerage', 'linkedin', 'phone number', 'greeting', 'good evening', 'good morning'],
            text: 'In Settings, enter your full name, email, phone, company or brokerage, title and LinkedIn address, then click save. Your first name is used in the dashboard greeting, and your details go in the signature of emails you create from the Transactions page. They’re stored in this browser only, so you’ll need to enter them again on another device.',
            links: [{ label: 'Open Settings', href: 'settings.html' }]
        },
        {
            id: 'risk',
            keywords: ['risk', 'high risk', 'medium risk', 'low risk', 'why is my deal', 'risky'],
            text: 'Hover over the risk label in the dashboard to see the reason. A deal is High when its closing date has passed, or it closes within 7 days with 2 or more open milestones. It’s Medium when it closes within 14 days with an open milestone, has an overdue deadline, or has no closing date. If someone set a risk level by hand on the deal, that level is used instead and the label says "manual".',
            links: [{ label: 'Open the Dashboard', href: 'index.html' }]
        },
        {
            id: 'overdue',
            keywords: ['overdue', 'deadline', 'past due', 'earnest money', 'inspection', 'appraisal', 'financing'],
            text: 'A deadline (earnest money, inspection, appraisal or financing) is overdue when its date has passed and the matching milestone isn’t checked off yet. Tick the milestone on the deal and the deadline clears.',
            links: [{ label: 'Go to Transactions', href: 'transactions.html' }]
        },
        {
            id: 'data-to-fix',
            keywords: ['data to fix', 'missing info', 'missing information', 'invalid date', 'nan', 'missing address', 'missing closing'],
            text: '"Data to fix" lists deals that are missing information, such as a property address or closing date, or that have a date that isn’t valid. Open the deal with the Edit link in that list and fill in the missing details.',
            links: [{ label: 'Open the Dashboard', href: 'index.html' }]
        },
        {
            id: 'email',
            keywords: ['email', 'e-mail', 'gmail', 'outlook', 'template', 'compose', 'message my client', 'contact my client'],
            text: 'On Transactions, click Email on a deal and choose a template. The subject and message are filled in from the deal. You can then copy the text or open it in Gmail or Outlook.',
            links: [{ label: 'Go to Transactions', href: 'transactions.html' }]
        },
        {
            id: 'not-saving',
            keywords: ['not saving', 'won’t save', 'wont save', 'cant save', 'can’t save', 'nothing happened', 'clicked save', 'save button', 'save failed', 'error', 'failed', 'stuck', 'frozen'],
            text: 'Refresh the page and check whether your change is there. If it isn’t, the server may be unreachable. Try again in a minute, and if it keeps happening please report a bug so we can look into it.',
            links: [{ label: 'Report a bug', href: 'help.html#report' }]
        },
        {
            id: 'storage',
            keywords: ['stored', 'storage', 'where is my', 'where are my', 'privacy', 'my data', 'saved where', 'another device'],
            text: 'Transactions are stored on the TC Pipeline server. Your profile settings are stored in your own browser only.',
            links: []
        },
        {
            id: 'login',
            keywords: ['login', 'log in', 'sign in', 'register', 'registration', 'account', 'password', 'sign up', 'signup'],
            text: 'Account registration and login aren’t available yet. For now you can use TC Pipeline without signing in. When accounts are added, the Help page will explain how to register and sign in.',
            links: [{ label: 'Open Help', href: 'help.html' }]
        },
        {
            id: 'bug',
            keywords: ['bug', 'report a bug', 'report', 'broken', 'crash', 'not working', 'doesn’t work', 'doesnt work', 'problem', 'issue', 'wrong', 'support', 'human', 'contact'],
            text: 'Sorry something isn’t working. You can send us a bug report: choose a category, describe what happened, and optionally add your email to get a confirmation with a reference number.',
            links: [{ label: 'Report a bug', href: 'help.html#report' }]
        },
        {
            id: 'navigate',
            keywords: ['where', 'find', 'menu', 'sidebar', 'navigate', 'which page', 'how do i get'],
            text: 'Everything is in the menu on the left: Dashboard (overview of active deals), New Deal (create a transaction), Transactions (edit, delete, email), Analyzer (investment numbers), Settings (your profile) and Help (guides and bug reports).',
            links: [{ label: 'Open Help', href: 'help.html' }]
        },
        {
            id: 'about',
            keywords: ['what can you do', 'who are you', 'what are you', 'help me', 'how do you work', 'are you ai', 'are you a bot'],
            text: 'I’m the TC Pipeline assistant. I can walk you through the dashboard, creating and editing deals, the investment analyzer, your profile settings and common problems. I’m a simple helper that answers from the Help guides, so for anything I can’t solve, you can send a bug report.',
            links: [{ label: 'Open Help', href: 'help.html' }]
        }
    ];

    const GREETING_RE = /^\s*(hi|hello|hey|yo|good (morning|afternoon|evening)|howdy)\b/i;
    const THANKS_RE = /\b(thanks|thank you|thx|ty|appreciate)\b/i;

    const SUGGESTIONS = {
        'index.html':        ['Why is my deal High risk?', 'What is Needs Attention?', 'How do I add a deal?'],
        'add.html':          ['How do I create a transaction?', 'What is a File ID?', 'My deal won’t save'],
        'transactions.html': ['How do I edit a deal?', 'How do I email a client?', 'How do I delete a deal?'],
        'analyzer.html':     ['What is cap rate?', 'How do I analyze a property?', 'What is cash-on-cash?'],
        'settings.html':     ['What are settings used for?', 'Where is my profile stored?'],
        'help.html':         ['How do I report a bug?', 'What can you do?'],
        'default':           ['How do I add a deal?', 'Why is my deal High risk?', 'What can you do?']
    };

    // ======================================================================
    //  STRATEGY: how an answer is produced
    // ======================================================================
    class AssistantEngine {
        // context = { page: 'index.html', history: [{ role, text }, ...] }
        reply(message, context) { throw new Error('AssistantEngine.reply() must be implemented'); }
    }

    // ConcreteStrategy 1: works with no server. Matches keywords from the topics above.
    class LocalAssistantEngine extends AssistantEngine {
        constructor(topics) { super(); this.topics = topics; }

        reply(message, context) {
            const answer = this.answer(message);
            const delay = 350 + Math.floor(Math.random() * 350);
            return new Promise(function (resolve) { setTimeout(function () { resolve(answer); }, delay); });
        }

        answer(message) {
            const q = message.toLowerCase().replace(/[‘’]/g, '’');
            const plain = q.replace(/’/g, "'");

            if (THANKS_RE.test(q)) return { text: 'You’re welcome! Ask me anything else about TC Pipeline.', links: [] };
            if (GREETING_RE.test(q) && q.trim().split(/\s+/).length <= 4) {
                return { text: 'Hi! What do you need help with?', links: [] };
            }

            let best = null, bestScore = 0;
            this.topics.forEach(function (t) {
                let score = 0;
                t.keywords.forEach(function (k) {
                    const key = k.toLowerCase();
                    if (q.indexOf(key) !== -1 || plain.indexOf(key.replace(/’/g, "'")) !== -1) {
                        score += key.indexOf(' ') !== -1 ? 3 : 2; // phrases are more specific than single words
                    }
                });
                if (score > bestScore) { best = t; bestScore = score; }
            });

            if (best && bestScore >= 2) return { text: best.text, links: best.links };
            return {
                text: 'I’m not sure about that one. I can help with the dashboard, creating and editing deals, the analyzer, settings and common problems. You can also browse the Help guides, or send us a bug report if something isn’t working.',
                links: [{ label: 'Open Help', href: 'help.html' }, { label: 'Report a bug', href: 'help.html#report' }]
            };
        }
    }

    // ConcreteStrategy 2: a real AI behind a server route. Expects { reply: "text", links?: [...] }.
    class HttpAssistantEngine extends AssistantEngine {
        constructor(url) { super(); this.url = url; }

        async reply(message, context) {
            const res = await fetch(this.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    page: context.page,
                    history: context.history.slice(-SEND_HISTORY)
                })
            });
            if (!res.ok) throw new Error('Assistant server answered ' + res.status);
            const data = await res.json();
            if (!data || typeof data.reply !== 'string') throw new Error('Unexpected assistant reply');
            return { text: data.reply, links: Array.isArray(data.links) ? data.links : [] };
        }
    }

    // Context: the chat window only talks to this class.
    class AssistantService {
        constructor(engine) { this.engine = engine; }
        setEngine(engine) { this.engine = engine; }
        ask(message, context) { return this.engine.reply(message, context); }
    }

    const service = new AssistantService(USE_LOCAL ? new LocalAssistantEngine(TOPICS) : new HttpAssistantEngine(ASSISTANT_URL));

    // ======================================================================
    //  The screen
    // ======================================================================
    const ROBOT_SVG =
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<line x1="12" y1="3" x2="12" y2="6.5"/><circle cx="12" cy="2.6" r="1" fill="currentColor"/>' +
        '<rect x="4" y="6.5" width="16" height="12" rx="3.5"/>' +
        '<circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none"/>' +
        '<line x1="9.5" y1="15.5" x2="14.5" y2="15.5"/>' +
        '<line x1="2" y1="11" x2="2" y2="14"/><line x1="22" y1="11" x2="22" y2="14"/></svg>';

    const CSS =
        '#sidebar #assistantLink{display:flex;align-items:center;gap:10px;cursor:pointer;}' +
        '#assistantLink svg{display:block;flex:0 0 auto;}#assistantLink span{line-height:18px;}' +
        '#sidebar #assistantLink[aria-expanded="true"]{background-color:rgba(255,255,255,0.12);font-weight:700;}' +
        '#assistantPanel{position:fixed;z-index:1000;bottom:20px;width:380px;max-width:calc(100vw - 32px);height:540px;max-height:calc(100vh - 40px);' +
            'background:#fff;border-radius:12px;box-shadow:0 12px 40px rgba(15,23,42,0.28);display:flex;flex-direction:column;overflow:hidden;' +
            'font-family:Arial,sans-serif;color:#1E293B;border:1px solid #E2E8F0;}' +
        '#assistantPanel[hidden]{display:none;}' +
        '#assistantPanel .ah{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#1B2A3B;color:#fff;}' +
        '#assistantPanel .ah .av{width:34px;height:34px;border-radius:50%;background:#2563EB;display:flex;align-items:center;justify-content:center;flex:0 0 auto;}' +
        '#assistantPanel .ah .at{flex:1;min-width:0;}' +
        '#assistantPanel .ah .at strong{display:block;font-size:15px;}' +
        '#assistantPanel .ah .at span{display:block;font-size:12px;color:#CBD5E1;}' +
        '#assistantPanel .ah button{background:none;border:0;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:4px 8px;border-radius:6px;}' +
        '#assistantPanel .ah button:hover{background:rgba(255,255,255,0.15);}' +
        '#assistantPanel .am{flex:1;overflow-y:auto;padding:14px;background:#F7F9FC;display:flex;flex-direction:column;gap:10px;}' +
        '#assistantPanel .msg{max-width:88%;padding:10px 12px;border-radius:12px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;}' +
        '#assistantPanel .msg.bot{align-self:flex-start;background:#fff;border:1px solid #E2E8F0;border-bottom-left-radius:4px;}' +
        '#assistantPanel .msg.user{align-self:flex-end;background:#2563EB;color:#fff;border-bottom-right-radius:4px;}' +
        '#assistantPanel .msg.err{background:#FEF2F2;border-color:#FCA5A5;color:#7F1D1D;}' +
        '#assistantPanel .links{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}' +
        '#assistantPanel .links a{display:inline-block;padding:5px 10px;border-radius:999px;border:1px solid #2563EB;color:#2563EB;font-size:12px;font-weight:600;text-decoration:none;background:#fff;}' +
        '#assistantPanel .links a:hover{background:#2563EB;color:#fff;}' +
        '#assistantPanel .typing{display:inline-flex;gap:4px;align-items:center;height:14px;}' +
        '#assistantPanel .typing i{width:6px;height:6px;border-radius:50%;background:#94A3B8;animation:asstBlink 1s infinite;}' +
        '#assistantPanel .typing i:nth-child(2){animation-delay:.15s;}#assistantPanel .typing i:nth-child(3){animation-delay:.3s;}' +
        '@keyframes asstBlink{0%,80%,100%{opacity:.25}40%{opacity:1}}' +
        '#assistantPanel .chips[hidden]{display:none;}' +
        '#assistantPanel .chips{display:flex;flex-wrap:wrap;gap:6px;padding:8px 14px 0 14px;background:#F7F9FC;}' +
        '#assistantPanel .chips button{background:#fff;border:1px solid #CBD5E1;border-radius:999px;padding:6px 10px;font-size:12px;color:#334155;cursor:pointer;}' +
        '#assistantPanel .chips button:hover{border-color:#2563EB;color:#2563EB;}' +
        '#assistantPanel form{display:flex;gap:8px;padding:12px 14px;border-top:1px solid #E2E8F0;background:#fff;margin:0;}' +
        '#assistantPanel form input{flex:1;width:auto;min-width:0;padding:10px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:14px;outline:none;}' +
        '#assistantPanel form input:focus{border-color:#2563EB;}' +
        '#assistantPanel form button{background:#2563EB;color:#fff;border:0;border-radius:8px;padding:0 16px;font-size:14px;font-weight:600;cursor:pointer;margin:0;}' +
        '#assistantPanel form button:disabled{opacity:.6;cursor:default;}' +
        '#assistantPanel .foot{padding:0 14px 10px 14px;background:#fff;font-size:11px;color:#64748B;}' +
        '@media (max-width:560px){#assistantPanel{left:8px!important;right:8px;bottom:8px;width:auto;max-width:none;height:70vh;}}' +
        '@media (prefers-reduced-motion:reduce){#assistantPanel .typing i{animation:none;opacity:.6;}}';

    function pageName() {
        const f = location.pathname.split('/').pop();
        return f === '' ? 'index.html' : f;
    }

    // ---- remembered conversation (this tab only; works fine without it) ----
    function loadState() {
        try {
            const s = JSON.parse(sessionStorage.getItem(STORE_KEY));
            if (s && Array.isArray(s.messages)) return s;
        } catch (e) { /* storage blocked or empty */ }
        return { open: false, messages: [] };
    }
    function saveState() {
        try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    }

    const state = loadState();
    let panel, list, input, sendBtn, chips, link, busy = false;

    function el(tag, className, text) {
        const e = document.createElement(tag);
        if (className) e.className = className;
        if (text != null) e.textContent = text;
        return e;
    }

    function addMessage(role, text, links, isError, remember) {
        const m = el('div', 'msg ' + role + (isError ? ' err' : ''));
        m.appendChild(document.createTextNode(text)); // text only, never HTML
        if (links && links.length) {
            const box = el('div', 'links');
            links.forEach(function (l) {
                if (!l || typeof l.href !== 'string' || !/^\w[\w#./?=&-]*$/.test(l.href) || l.href.indexOf('..') !== -1) return; // same-site links only
                const a = el('a', null, l.label || l.href);
                a.href = l.href;
                box.appendChild(a);
            });
            if (box.childNodes.length) m.appendChild(box);
        }
        list.appendChild(m);
        list.scrollTop = list.scrollHeight;
        if (remember) {
            state.messages.push({ role: role, text: text, links: links || [], error: !!isError });
            if (state.messages.length > MAX_HISTORY) state.messages = state.messages.slice(-MAX_HISTORY);
            saveState();
        }
        return m;
    }

    function welcome() {
        const first = 'Hi! I’m the TC Pipeline assistant. Ask me how something works, or pick a question below.';
        addMessage('bot', first, [], false, true);
    }

    function showChips() {
        chips.textContent = '';
        const s = SUGGESTIONS[pageName()] || SUGGESTIONS['default'];
        s.forEach(function (q) {
            const b = el('button', null, q);
            b.type = 'button';
            b.addEventListener('click', function () { send(q); });
            chips.appendChild(b);
        });
    }

    async function send(text) {
        text = String(text || '').trim().slice(0, MAX_INPUT);
        if (!text || busy) return;
        busy = true; sendBtn.disabled = true;
        chips.hidden = true;
        input.value = '';
        addMessage('user', text, null, false, true);

        const typing = el('div', 'msg bot');
        typing.innerHTML = '<span class="typing" aria-label="Assistant is typing"><i></i><i></i><i></i></span>';
        list.appendChild(typing); list.scrollTop = list.scrollHeight;

        try {
            const history = state.messages.map(function (m) { return { role: m.role, text: m.text }; });
            const answer = await service.ask(text, { page: pageName(), history: history.slice(0, -1) });
            typing.remove();
            addMessage('bot', answer.text, answer.links, false, true);
        } catch (err) {
            typing.remove();
            addMessage('bot', 'Sorry, I couldn’t get an answer just now. Please try again in a moment, or check the Help page.',
                [{ label: 'Open Help', href: 'help.html' }], true, false);
        } finally {
            busy = false; sendBtn.disabled = false; input.focus();
        }
    }

    function place() {
        const sb = document.getElementById('sidebar');
        let left = sb ? Math.round(sb.getBoundingClientRect().right) + 16 : 16;
        const width = Math.min(380, window.innerWidth - 32);
        left = Math.max(16, Math.min(left, window.innerWidth - width - 16)); // never off-screen
        panel.style.left = left + 'px';
    }

    function openPanel() {
        place();
        panel.hidden = false;
        link.setAttribute('aria-expanded', 'true');
        state.open = true; saveState();
        list.scrollTop = list.scrollHeight;
        input.focus();
    }
    function closePanel() {
        panel.hidden = true;
        link.setAttribute('aria-expanded', 'false');
        state.open = false; saveState();
        link.focus();
    }

    function build() {
        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        // The sidebar item: an <a>, so it picks up the same look as Dashboard, Transactions, etc.
        link = document.createElement('a');
        link.id = 'assistantLink';
        link.href = '#assistant';
        link.setAttribute('role', 'button');
        link.setAttribute('aria-expanded', 'false');
        link.setAttribute('aria-controls', 'assistantPanel');
        link.innerHTML = ROBOT_SVG + '<span>Assistant</span>';
        const sb = document.getElementById('sidebar');
        if (sb) sb.appendChild(link);
        else { link.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:1000;display:flex;background:#1B2A3B;color:#fff;border-radius:999px;padding:10px 16px;text-decoration:none;'; document.body.appendChild(link); }

        panel = el('section');
        panel.id = 'assistantPanel';
        panel.hidden = true;
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'TC Pipeline assistant');

        const head = el('div', 'ah');
        const av = el('div', 'av'); av.innerHTML = ROBOT_SVG.replace('width="18" height="18"', 'width="22" height="22"'); av.style.color = '#fff';
        const at = el('div', 'at');
        at.appendChild(el('strong', null, 'TC Assistant'));
        at.appendChild(el('span', null, USE_LOCAL ? 'Basic helper · answers from the Help guides' : 'AI assistant'));
        const close = el('button', null, '×');
        close.type = 'button'; close.setAttribute('aria-label', 'Close assistant');
        close.addEventListener('click', closePanel);
        head.appendChild(av); head.appendChild(at); head.appendChild(close);

        list = el('div', 'am');
        list.setAttribute('role', 'log'); list.setAttribute('aria-live', 'polite');

        chips = el('div', 'chips');

        const form = el('form');
        input = el('input');
        input.type = 'text'; input.maxLength = MAX_INPUT; input.autocomplete = 'off';
        input.placeholder = 'Ask a question…'; input.setAttribute('aria-label', 'Your question');
        sendBtn = el('button', null, 'Send');
        sendBtn.type = 'submit';
        form.appendChild(input); form.appendChild(sendBtn);
        form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });

        const foot = el('div', 'foot', 'Please don’t share passwords or private client details here.');

        panel.appendChild(head); panel.appendChild(list); panel.appendChild(chips); panel.appendChild(form); panel.appendChild(foot);
        document.body.appendChild(panel);

        link.addEventListener('click', function (e) { e.preventDefault(); if (panel.hidden) openPanel(); else closePanel(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) closePanel(); });
        window.addEventListener('resize', function () { if (!panel.hidden) place(); });

        // restore the conversation from earlier pages in this tab
        if (state.messages.length) {
            state.messages.forEach(function (m) { addMessage(m.role, m.text, m.links, m.error, false); });
            chips.hidden = true;
        } else {
            welcome();
            showChips();
        }
        if (state.open) openPanel();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
    else build();
})();