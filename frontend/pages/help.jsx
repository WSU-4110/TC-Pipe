import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import "./styleSheets/style.css";
import "./styleSheets/theme.css";
import "./styleSheets/help.css";
import TopNav from "./components/TopNav.jsx";

// ======================== HELP CONTENT (as data) ========================= //
// Each topic is { title, body }. The body is JSX, so it can hold lists and
// <Link>s. <Link to="/settings"> moves between pages without reloading the app
// (a plain <a href> would reload everything).
const GUIDES = [
    {
        title: 'Registering and logging in',
        body: <>
            <p>Click <strong>Register here</strong> on the login page and fill in your name, username, email and a password. The password needs at least 8 characters with an uppercase letter, a lowercase letter, a number and a special character (@$!%*?&amp;).</p>
            <p>After that, sign in with your username and password. You stay signed in for 24 hours, then you&rsquo;ll be asked to log in again. Use <strong>Log Out</strong> in the top bar to sign out sooner.</p>
        </>,
    },
    {
        title: 'The dashboard',
        body: <>
            <p>The <Link to="/dashboard">Dashboard</Link> is your daily overview of every active deal.</p>
            <ul>
                <li><strong>Stat cards</strong> show deals closing in the next 7 days, overdue deadlines, high-risk deals, closings that have already passed, and your active deals.</li>
                <li><strong>Analytics</strong> charts show closings and dollar volume for the last 6 months, and your active deals by stage.</li>
                <li><strong>Needs Attention</strong> lists overdue deadlines, deals whose closing date has passed, and anything marked as a blocker.</li>
                <li><strong>Upcoming Deadlines</strong> shows open deadlines in the next 30 days. A deadline disappears once its milestone is checked off.</li>
                <li><strong>Active Deals</strong> is the full table. Search by file ID, address or client, filter by risk, or change the sort order.</li>
            </ul>
            <p>Use <strong>Refresh</strong> to reload the latest data. Closed and terminated deals are hidden.</p>
        </>,
    },
    {
        title: 'Creating a transaction',
        body: <>
            <ol>
                <li>Click <Link to="/newDeal">New Deal</Link> in the top bar.</li>
                <li>Enter a File ID, or leave it blank and one is created for you (for example <em>26_11_18-TC-AB12CD</em>). File IDs must be unique.</li>
                <li>Fill in the property, people, dates, prices and milestones you know. Everything else can be left blank.</li>
                <li>Click <strong>Save Deal</strong>. You&rsquo;ll land on Transactions with the new deal in the list.</li>
            </ol>
            <p>Tick the milestone boxes as each step is completed. The dashboard uses them to work out risk and which deadlines are still open.</p>
            <p className="note">Editing and deleting deals aren&rsquo;t available yet.</p>
        </>,
    },
    {
        title: 'Finding a transaction',
        body: <>
            <p><Link to="/transactions">Transactions</Link> lists every deal, including closed and terminated ones, sorted by closing date. Search by file ID, address or client, or filter by stage and risk.</p>
        </>,
    },
    {
        title: 'Profile settings and deal defaults',
        body: <>
            <ol>
                <li>Open <Link to="/settings">Settings</Link> in the top bar.</li>
                <li>Enter your full name, email, phone, company or brokerage, title and LinkedIn address, then click <strong>Save Profile</strong>.</li>
                <li>Under <strong>Deal Defaults</strong>, enter the title company, lender and assignee you use most and click <strong>Save Defaults</strong>. New deals start with those filled in.</li>
            </ol>
            <p>Your first name is used in the dashboard greeting and your initials in the top bar. Your details are also added to the signature of emails you create from the Transactions page.</p>
        </>,
    },
];

const FAQ = [
    {
        title: 'Why is my deal marked High risk?',
        body: <>
            <p>Hover over the risk label on the dashboard or Transactions page to see the reason. A deal is <strong>High</strong> when its closing date has passed, or it closes within 7 days with 2 or more open milestones. It&rsquo;s <strong>Medium</strong> when it closes within 14 days with an open milestone, has an overdue deadline, or has no closing date.</p>
            <p>If a risk level was picked by hand on the deal, that level is used instead and the dashboard labels it <em>manual</em>.</p>
        </>,
    },
    {
        title: 'What counts as an overdue deadline?',
        body: <p>A deadline (earnest money, inspection, appraisal or financing) is overdue when its date has passed and the matching milestone isn&rsquo;t checked off yet.</p>,
    },
    {
        title: 'Why does the dashboard say “Good morning, there”?',
        body: <p>No name is saved yet. Add your full name in <Link to="/settings">Settings</Link> and the greeting will use your first name.</p>,
    },
    {
        title: 'What does “Data to fix” on the dashboard mean?',
        body: <p>Some deals are missing information, such as a property address or closing date, or have a date that isn&rsquo;t valid. The list shows what&rsquo;s missing for each deal.</p>,
    },
    {
        title: 'Where is my information stored?',
        body: <>
            <p>Your account, profile and transactions are stored in the TC Pipeline database, and each user only sees their own deals.</p>
            <p>Deal defaults and preferences from Settings are saved in this browser only, so they won&rsquo;t follow you to another computer.</p>
        </>,
    },
    {
        title: 'Can I email my clients from TC Pipeline?',
        body: <p>Yes. On <Link to="/transactions">Transactions</Link>, click <em>Email</em> on a deal and choose a template. The subject and message are filled in from the deal, and you can edit them. Then copy the text or open it in Gmail or Outlook.</p>,
    },
    {
        title: 'I clicked Save and nothing happened',
        body: <p>Check for a red message near the button. &ldquo;Could not reach the server&rdquo; means the backend isn&rsquo;t running or can&rsquo;t be reached. Try again in a minute, and if it keeps happening please report a bug.</p>,
    },
];

const CATEGORIES = [
    ['', 'Select a category…'],
    ['display', 'Something looks wrong on the page'],
    ['data', 'Wrong numbers, dates or risk levels'],
    ['save', 'Can’t save a deal or my settings'],
    ['email', 'Email composer'],
    ['settings', 'Profile settings'],
    ['login', 'Logging in or registering'],
    ['other', 'Something else'],
];

const PAGES = [
    ['dashboard', 'Dashboard'],
    ['new-deal', 'New Deal'],
    ['transactions', 'Transactions'],
    ['settings', 'Settings'],
    ['help', 'Help'],
    ['login', 'Login / Register'],
    ['other', 'Not sure / other'],
];

const MAX_CHARS = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY_REPORT = { category: '', page: 'dashboard', description: '', email: '' };

// DEMO MODE: there is no bug-report route on the backend yet, so this fakes
// a successful send and makes up a reference number. Open /help?mock=fail to
// see the failure message. Replace with a real fetch() once the route exists.
function sendReport(report, forceFail) {
    return new Promise(resolve => {
        setTimeout(() => {
            if (forceFail) {
                resolve({ ok: false });
                return;
            }
            const d = new Date();
            const p = n => String(n).padStart(2, '0');
            const reportID = 'BR-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' +
                Math.random().toString(16).slice(2, 10).toUpperCase().padEnd(8, '0');
            resolve({ ok: true, reportID, emailRequested: !!report.email });
        }, 400);
    });
}

// one accordion row: <details> opens/closes by itself, no state needed
function Topic({ topic }) {
    return (
        <details className="topic">
            <summary>{topic.title}</summary>
            <div className="body">{topic.body}</div>
        </details>
    );
}

// ======================== HELP PAGE ========================= //
function Help() {
    const navigate = useNavigate();
    const location = useLocation();

    // which of the three screens is showing: 'help' | 'report' | 'done'
    // (/help#report opens the bug form directly)
    const [view, setView] = useState(location.hash === '#report' ? 'report' : 'help');

    // bug report form
    const [report, setReport] = useState(EMPTY_REPORT);
    const [invalid, setInvalid] = useState({});       // { category: true, ... } = red border
    const [formError, setFormError] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);       // { reportID, emailRequested, email }

    const categoryRef = useRef(null);
    const descriptionRef = useRef(null);
    const emailRef = useRef(null);
    const donePanelRef = useRef(null);

    // when the screen changes: scroll to top and put keyboard focus somewhere useful
    useEffect(() => {
        window.scrollTo(0, 0);
        if (view === 'report') categoryRef.current?.focus();
        if (view === 'done') donePanelRef.current?.focus();
    }, [view]);

    // back to wherever the user came from (or the dashboard if they opened Help directly)
    const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard'));

    const openReport = () => setView('report');
    const backToHelp = () => setView('help');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setReport(r => ({ ...r, [name]: value }));
        setInvalid(i => ({ ...i, [name]: false })); // clear the red border as soon as they fix it
    };

    // ---------- validation ----------
    const validate = () => {
        const missing = [];
        if (!report.category) missing.push('category');
        if (!report.description.trim()) missing.push('description');
        if (missing.length) {
            setInvalid(Object.fromEntries(missing.map(n => [n, true])));
            setFormError('Please fill in all required fields');
            (missing[0] === 'category' ? categoryRef : descriptionRef).current?.focus();
            return false;
        }
        if (report.email.trim() && !EMAIL_RE.test(report.email.trim())) {
            setInvalid({ email: true });
            setFormError('Please enter a valid email address or leave the field blank');
            emailRef.current?.focus();
            return false;
        }
        setInvalid({});
        setFormError('');
        return true;
    };

    // ---------- submit ----------
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (sending || !validate()) return;

        const payload = {
            ...report,
            description: report.description.trim(),
            email: report.email.trim(),
            browser: navigator.userAgent,
            clientTime: new Date().toISOString(),
        };

        setSending(true);
        try {
            const forceFail = new URLSearchParams(location.search).get('mock') === 'fail';
            const res = await sendReport(payload, forceFail);
            if (!res.ok) {
                setFormError('We could not submit your report. Please try again later.');
                return;
            }
            setResult({ reportID: res.reportID, emailRequested: res.emailRequested, email: payload.email });
            setReport(EMPTY_REPORT);
            setView('done');
        } finally {
            setSending(false);
        }
    };

    const chars = report.description.length;

    // ======================== HELP UI ========================= //
    return (
        <div className="tc-dark hp-page">
            <TopNav />

            <main id="main">
                <div className="page-head">
                    <div>
                        <h1>Help</h1>
                        <p className="lede">Guides and answers for using TC Pipeline. If you can&rsquo;t find what you need, you can report a bug.</p>
                    </div>
                    <button type="button" className="btn btn-ghost" onClick={goBack}>← Go Back</button>
                </div>

                {/* ---------- VIEW 1: guides + FAQ ---------- */}
                {view === 'help' && (
                    <>
                        <section className="panel cta" aria-label="Report a bug">
                            <div>
                                <h2>Something not working?</h2>
                                <p>Tell us what went wrong and we&rsquo;ll look into it.</p>
                            </div>
                            <button type="button" className="btn btn-primary" onClick={openReport}>Report a Bug</button>
                        </section>

                        <section className="panel" aria-labelledby="guidesTitle">
                            <h2 id="guidesTitle">Help guides</h2>
                            <p className="sub">Step-by-step instructions for the main parts of the app.</p>
                            {GUIDES.map(t => <Topic key={t.title} topic={t} />)}
                        </section>

                        <section className="panel" aria-labelledby="faqTitle">
                            <h2 id="faqTitle">Frequently asked questions</h2>
                            <p className="sub">Quick answers to common questions.</p>
                            {FAQ.map(t => <Topic key={t.title} topic={t} />)}
                        </section>

                        <section className="panel cta" aria-label="Still need help">
                            <div>
                                <h2>Still stuck?</h2>
                                <p>If these guides didn&rsquo;t solve your problem, send us a bug report.</p>
                            </div>
                            <button type="button" className="btn btn-primary" onClick={openReport}>Report a Bug</button>
                        </section>
                    </>
                )}

                {/* ---------- VIEW 2: bug report form ---------- */}
                {view === 'report' && (
                    <section className="panel" aria-labelledby="reportTitle">
                        <h2 id="reportTitle">Report a Bug</h2>
                        <p className="sub">Fields marked <span className="req">*</span> are required.</p>
                        <div className="demo-note"><strong>Demo mode:</strong> reports are not saved or emailed yet.</div>

                        {/* noValidate: we show our own messages instead of the browser's pop-ups */}
                        <form onSubmit={handleSubmit} noValidate>
                            {formError && <div className="form-error" role="alert">{formError}</div>}

                            <div className="field">
                                <label htmlFor="category">Issue category <span className="req">*</span></label>
                                <select id="category" name="category" ref={categoryRef} required
                                    value={report.category} onChange={handleChange} aria-invalid={invalid.category || undefined}>
                                    {CATEGORIES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                                </select>
                            </div>

                            <div className="field">
                                <label htmlFor="page">Page where the problem occurred</label>
                                <select id="page" name="page" value={report.page} onChange={handleChange}>
                                    {PAGES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                                </select>
                            </div>

                            <div className="field">
                                <label htmlFor="description">Describe the issue <span className="req">*</span></label>
                                <textarea id="description" name="description" ref={descriptionRef} required
                                    maxLength={MAX_CHARS} rows={7}
                                    placeholder="What did you do, what did you expect, and what happened instead?"
                                    value={report.description} onChange={handleChange} aria-invalid={invalid.description || undefined} />
                                <span className={'counter' + (chars >= MAX_CHARS * 0.9 ? ' near' : '')} aria-live="polite">
                                    {chars.toLocaleString('en-US')} / {MAX_CHARS.toLocaleString('en-US')}
                                </span>
                            </div>

                            <div className="field">
                                <label htmlFor="bugEmail">Email address (optional)</label>
                                <input type="email" id="bugEmail" name="email" ref={emailRef} autoComplete="email"
                                    placeholder="you@example.com"
                                    value={report.email} onChange={handleChange} aria-invalid={invalid.email || undefined} />
                                <small>Add your email if you&rsquo;d like a confirmation with your reference number.</small>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={sending}>
                                    {sending ? 'Submitting…' : 'Submit'}
                                </button>
                                <button type="button" className="btn btn-ghost" onClick={backToHelp}>Cancel</button>
                            </div>
                        </form>
                    </section>
                )}

                {/* ---------- VIEW 3: confirmation ---------- */}
                {view === 'done' && result && (
                    <section className="panel done" aria-labelledby="doneTitle" tabIndex={-1} ref={donePanelRef}>
                        <div className="check" aria-hidden="true">✓</div>
                        <h2 id="doneTitle">Thanks, your report was submitted</h2>
                        <div className="ref">{result.reportID}</div>
                        <p>Please keep this reference number if you need to follow up.</p>
                        {result.emailRequested && <p>We&rsquo;ll send a confirmation email to {result.email}.</p>}
                        <div className="form-actions">
                            <button type="button" className="btn btn-ghost" onClick={backToHelp}>Back to Help</button>
                            <button type="button" className="btn btn-primary" onClick={goBack}>Close Help</button>
                        </div>
                    </section>
                )}
            </main>

        </div>
    );
}

export default Help;
