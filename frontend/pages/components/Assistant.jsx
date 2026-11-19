import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styleSheets/assistant.css';
import { assistant, AuthError, SUGGESTIONS, MAX_INPUT } from '../scripts/assistantApi.js';

// =====================================================================
// ASSISTANT: the 🤖 button (bottom right) and the chat window it opens.
// Put <Assistant /> once at the bottom of every page that uses the dark
// theme, in place of the old "Chatbot coming soon" button.
// It keeps the conversation while you move between pages (this tab only).
// =====================================================================

const STORE_KEY = 'tcAssistant';
const MAX_KEPT = 40; // messages kept in the browser

const GREETING = { greeting: true, role: 'bot', text: 'Hi! I’m the TC Pipeline assistant. Ask me how something works, or pick a question below.', links: [] };

// sessionStorage can be blocked (private windows), so every use is wrapped in try/catch
function loadChat() {
    try {
        const saved = JSON.parse(sessionStorage.getItem(STORE_KEY));
        if (Array.isArray(saved) && saved.length) return saved;
    } catch { /* start fresh */ }
    return [GREETING];
}
function saveChat(messages) {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-MAX_KEPT))); } catch { /* ignore */ }
}

function Assistant() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState(loadChat);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);

    const logRef = useRef(null);
    const inputRef = useRef(null);
    const abortRef = useRef(null);

    useEffect(() => { saveChat(messages); }, [messages]);

    // keep the newest message in view
    useEffect(() => {
        if (open && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [messages, busy, open]);

    // focus the box when the window opens; Esc closes it
    useEffect(() => {
        if (!open) return;
        inputRef.current?.focus();
        const onKey = e => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    // cancel an answer that is still loading if the page is left
    useEffect(() => () => abortRef.current?.abort(), []);

    const ask = async (question) => {
        const q = question.trim();
        if (!q || busy) return;

        const history = messages.filter(m => !m.error && !m.greeting);
        setMessages(m => [...m, { role: 'user', text: q }]);
        setText('');
        setBusy(true);

        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const answer = await assistant.ask(q, { page: pathname, history }, controller.signal);
            setMessages(m => [...m, { role: 'bot', text: answer.text, links: answer.links }]);
        } catch (err) {
            if (err.name === 'AbortError') return;
            if (err instanceof AuthError) {
                navigate('/login');
                return;
            }
            const msg = err instanceof TypeError
                ? 'I couldn’t reach the server. Check that the backend is running and try again.'
                : err.message;
            setMessages(m => [...m, { role: 'bot', text: msg, links: [], error: true }]);
        } finally {
            setBusy(false);
            inputRef.current?.focus();
        }
    };

    const submit = e => { e.preventDefault(); ask(text); };
    const reset = () => { setMessages([GREETING]); setText(''); inputRef.current?.focus(); };

    const onlyGreeting = messages.length === 1 && messages[0].greeting;
    const chips = SUGGESTIONS[pathname] || SUGGESTIONS.default;

    return (
        <>
            <button id="chatbot-btn" type="button" title="TC Pipeline Assistant" aria-label="Open the TC Pipeline assistant"
                aria-expanded={open} onClick={() => setOpen(o => !o)}>🤖</button>

            {open && (
                <section className="as-panel" role="dialog" aria-label="TC Pipeline assistant">
                    <header className="as-head">
                        <div className="as-avatar" aria-hidden="true">🤖</div>
                        <div className="as-title">
                            <strong>TC Pipeline Assistant</strong>
                            <span>Ask me how anything works</span>
                        </div>
                        <button type="button" className="as-icon" title="Start a new chat" aria-label="Start a new chat" onClick={reset}>↺</button>
                        <button type="button" className="as-icon" title="Close" aria-label="Close the assistant" onClick={() => setOpen(false)}>×</button>
                    </header>

                    <div className="as-log" ref={logRef} role="log" aria-live="polite">
                        {messages.map((m, i) => (
                            <div key={i} className={'as-msg as-' + m.role + (m.error ? ' as-err' : '')}>
                                <p>{m.text}</p>
                                {m.links && m.links.length > 0 && (
                                    <div className="as-links">
                                        {m.links.map(l => (
                                            <Link key={l.href + l.label} to={'/' + l.href} onClick={() => setOpen(false)}>{l.label} →</Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {busy && <div className="as-msg as-bot as-typing" aria-label="The assistant is typing"><span /><span /><span /></div>}
                    </div>

                    {onlyGreeting && (
                        <div className="as-chips">
                            {chips.map(c => <button key={c} type="button" onClick={() => ask(c)}>{c}</button>)}
                        </div>
                    )}

                    <form className="as-form" onSubmit={submit}>
                        <input ref={inputRef} type="text" value={text} maxLength={MAX_INPUT} autoComplete="off"
                            placeholder="Type your question…" aria-label="Your question"
                            onChange={e => setText(e.target.value)} />
                        <button type="submit" disabled={busy || !text.trim()}>Send</button>
                    </form>
                </section>
            )}
        </>
    );
}

export default Assistant;
