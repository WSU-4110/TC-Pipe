// assistantApi.js - how the chat window gets its answers.
//
// STRATEGY pattern: the chat window (components/Assistant.jsx) only talks to AssistantService.
// The engine behind it can be swapped without touching the screen:
//   AssistantEngine       the interface: reply(message, context) -> Promise<{ text, links }>
//   HttpAssistantEngine   sends the question to POST /assistant on the backend (Backend/assistant.js),
//                         which answers from the Help guides, or from an AI model when the server has a key.
//
// The AI key lives on the server only. Nothing secret is in the browser.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const MAX_INPUT = 500;   // same limit the server enforces
const SEND_HISTORY = 10;        // how many earlier messages are sent along for context

// Thrown when the server says the login token is missing or expired
export class AuthError extends Error {}

// Only short relative page names are allowed as links ("dashboard", "help#report").
// Mirrors the check on the server so a bad link can never turn into a clickable URL.
export function safeLinks(links) {
    return (Array.isArray(links) ? links : []).filter(l =>
        l && typeof l.label === 'string' && typeof l.href === 'string' &&
        /^\w[\w#./?=&-]*$/.test(l.href) && !l.href.includes('..')
    );
}

class AssistantEngine {
    // context = { page: '/dashboard', history: [{ role: 'user' | 'bot', text }, ...] }
    // eslint-disable-next-line no-unused-vars
    reply(message, context) { throw new Error('AssistantEngine.reply() must be implemented'); }
}

class HttpAssistantEngine extends AssistantEngine {
    constructor(baseUrl) { super(); this.url = baseUrl + '/assistant'; }

    async reply(message, context, signal) {
        const token = localStorage.getItem('token');
        if (!token) throw new AuthError('Please log in again.');

        const response = await fetch(this.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                message,
                page: context.page,
                history: context.history.slice(-SEND_HISTORY).map(m => ({ role: m.role, text: m.text }))
            }),
            signal
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            throw new AuthError('Your session expired. Please log in again.');
        }

        let data = null;
        try { data = await response.json(); } catch { /* not JSON, handled below */ }

        if (!response.ok) throw new Error((data && data.error) || `The assistant answered with an error (${response.status}).`);
        if (!data || typeof data.reply !== 'string') throw new Error('The assistant sent back something unexpected.');
        return { text: data.reply, links: safeLinks(data.links) };
    }
}

// Context: the chat window only talks to this class
class AssistantService {
    constructor(engine) { this.engine = engine; }
    ask(message, context, signal) { return this.engine.reply(message, context, signal); }
}

export const assistant = new AssistantService(new HttpAssistantEngine(API_URL));

// Quick questions shown under the greeting, by page (keys are the route paths)
export const SUGGESTIONS = {
    '/dashboard':    ['Why is my deal High risk?', 'What is Needs Attention?', 'How do I add a deal?'],
    '/newDeal':      ['How do I create a transaction?', 'What is a File ID?', 'My deal won’t save'],
    '/transactions': ['How do I edit a deal?', 'How do I email a client?', 'How do I delete a deal?'],
    '/settings':     ['What are Deal Defaults?', 'Where is my profile stored?'],
    '/help':         ['How do I report a bug?', 'What can you do?'],
    default:         ['How do I add a deal?', 'Why is my deal High risk?', 'What can you do?']
};
