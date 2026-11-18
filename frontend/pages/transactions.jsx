import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import "./styleSheets/style.css";
import "./styleSheets/theme.css";
import "./styleSheets/transactions.css";
import TopNav from "./components/TopNav.jsx";
import { buildEmailTemplate } from "./scripts/app.js";
import { analyze, cmpNullLast, fmtDate, plural, SOON_DAYS } from "./scripts/dashboardHelpers.js";

const STAGES = [
    { value: 'pre-contract',   label: 'Pre-Contract' },
    { value: 'active',         label: 'Active' },
    { value: 'inspection',     label: 'Inspection' },
    { value: 'appraisal',      label: 'Appraisal' },
    { value: 'underwriting',   label: 'Underwriting' },
    { value: 'clear-to-close', label: 'Clear to Close' },
    { value: 'closed',         label: 'Closed' },
    { value: 'terminated',     label: 'Terminated' },
];
const stageLabel = value => (STAGES.find(s => s.value === value) || {}).label || value || '—';

const TEMPLATES = [
    { value: 'welcome',   label: 'Welcome & Next Steps' },
    { value: 'emd',       label: 'EMD Received' },
    { value: 'inspection',label: 'Inspection Complete' },
    { value: 'appraisal', label: 'Appraisal Received' },
    { value: 'ctc',       label: 'Clear to Close' },
    { value: 'weekly',    label: 'Weekly Status Update' },
    { value: 'postclose', label: 'Post-Close Thank You' },
];

function Transactions() {
    // ======================== ATTRIBUTES ========================= //
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const navigate = useNavigate();

    const [transactions, setTransactions] = useState([]); // raw rows from the backend
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // filters
    const [searchTerm, setSearchTerm] = useState('');
    const [stageFilter, setStageFilter] = useState('');
    const [riskFilter, setRiskFilter] = useState('');

    // email composer: which deal is open + what's in the boxes
    const [composerDeal, setComposerDeal] = useState(null);
    const [template, setTemplate] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const composerRef = useRef(null);

    // ======================== LOAD TRANSACTIONS FROM BACKEND ========================= //
    // runs once when the page opens
    useEffect(() => {
        let ignore = false; // true if the user leaves the page before the fetch finishes

        const load = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            try {
                const response = await fetch(`${API_URL}/transactions`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    navigate('/login');
                    return;
                }
                const data = await response.json();
                if (!Array.isArray(data)) throw new Error(data.error || 'The server did not send back a list of transactions.');
                if (!ignore) setTransactions(data);
            } catch (err) {
                console.error('Error fetching transactions:', err);
                if (!ignore) setError(err.message || 'Check that the server is running.');
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        load();
        return () => { ignore = true; };
    }, [API_URL, navigate]);

    // ======================== DERIVED DATA ========================= //
    // analyze() is the same helper the dashboard uses, so risk levels and
    // days-to-close match on both pages
    const deals = useMemo(
        () => transactions.map(t => ({ raw: t, ...analyze(t) }))
                          .sort((a, b) => cmpNullLast(a.closeDays, b.closeDays)),
        [transactions]
    );

    // filters run on every render; no extra fetching needed
    const search = searchTerm.trim().toLowerCase();
    const visibleDeals = deals.filter(a =>
        (!search || a.haystack.includes(search)) &&
        (!stageFilter || a.stage === stageFilter) &&
        (!riskFilter || (!['closed', 'terminated'].includes(a.stage) && a.risk.toLowerCase() === riskFilter))
    );

    // ======================== EMAIL COMPOSER ========================= //
    const openComposer = (deal) => {
        setComposerDeal(deal);
        setTemplate('');
        setSubject('');
        setBody('');
    };

    const closeComposer = () => setComposerDeal(null);

    // picking a template fills in the subject + body
    const chooseTemplate = (key) => {
        setTemplate(key);
        // the templates in app.js use Julian's field names, so map our DB column names onto them
        const raw = composerDeal.raw;
        const email = buildEmailTemplate(key, {
            ...raw,
            propertyAddress: raw.address,
            emdAmount: raw.EMDamount,
            emdDueDate: raw.EMDdueDate,
        });
        setSubject(email ? email.subject : '');
        setBody(email ? email.body : '');
    };

    // scroll down to the composer when it opens
    // (an effect that only touches the page, no setState, is what effects are for)
    useEffect(() => {
        if (composerDeal && composerRef.current) {
            composerRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [composerDeal]);

    const copyEmail = async () => {
        await navigator.clipboard.writeText('Subject: ' + subject + '\n\n' + body);
        alert('Email copied to clipboard!');
    };
    const openInGmail = () =>
        window.open('https://mail.google.com/mail/?view=cm&su=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body));
    const openInOutlook = () =>
        window.open('https://outlook.live.com/mail/0/deeplink/compose?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body));

    // ======================== TRANSACTIONS UI ========================= //
    return (
        <div className="tc-dark tx-page">
            <TopNav />

            <main id="main">
                <div className="page-head">
                    <div>
                        <h1>Transactions</h1>
                        {!loading && !error && (
                            <p>{plural(deals.length, 'transaction')}{visibleDeals.length !== deals.length ? ` · ${visibleDeals.length} shown` : ''}</p>
                        )}
                    </div>
                    <button type="button" className="btn btn-primary" onClick={() => navigate('/newDeal')}>+ New Deal</button>
                </div>

                {error && (
                    <div className="error-banner">
                        <span><strong>Couldn’t load transactions.</strong> {error}</span>
                    </div>
                )}

                {/* ---------- FILTERS ---------- */}
                <div id="filters">
                    <label className="sr-only" htmlFor="search">Search transactions</label>
                    <input type="search" id="search" placeholder="Search file ID, address or client"
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />

                    <label className="sr-only" htmlFor="stageFilter">Filter by stage</label>
                    <select id="stageFilter" value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
                        <option value="">All Stages</option>
                        {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>

                    <label className="sr-only" htmlFor="riskFilter">Filter by risk</label>
                    <select id="riskFilter" value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
                        <option value="">All Risk</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>

                {/* ---------- TABLE ---------- */}
                <div id="table">
                    <h2>All Transactions</h2>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>File ID</th>
                                    <th>Address</th>
                                    <th>Stage</th>
                                    <th>Closing Date</th>
                                    <th>Days to Close</th>
                                    <th>Risk</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr className="empty-row"><td colSpan="7">Loading transactions…</td></tr>
                                ) : visibleDeals.length === 0 ? (
                                    <tr className="empty-row"><td colSpan="7">
                                        {deals.length === 0 ? 'No transactions yet. Add one with “+ New Deal”.' : 'No transactions match your filters.'}
                                    </td></tr>
                                ) : (
                                    // .map() turns each deal into one table row
                                    visibleDeals.map(a => {
                                        // closed/terminated deals are finished: no "late" color and no risk
                                        const finished = a.stage === 'closed' || a.stage === 'terminated';
                                        const daysCls = finished || a.closeDays === null ? '' : a.closeDays <= 0 ? 'late' : a.closeDays <= SOON_DAYS ? 'soon' : '';
                                        return (
                                            <tr key={a.id} className={composerDeal && composerDeal.id === a.id ? 'selected' : ''}>
                                                <td><strong>{a.id || '—'}</strong></td>
                                                <td>{a.address || '—'}</td>
                                                <td><span className={'badge ' + a.stage}>{stageLabel(a.stage)}</span></td>
                                                <td>{a.closeDate ? fmtDate(a.closeDate) : '—'}</td>
                                                <td className={daysCls}>
                                                    {a.closeDays === null ? '—' : a.closeDays < 0 ? plural(-a.closeDays, 'day') + ' ago' : a.closeDays}
                                                </td>
                                                {finished
                                                    ? <td>—</td>
                                                    : <td className={'risk-' + a.risk.toLowerCase()} title={a.riskReason}>{a.risk}</td>}
                                                <td><a onClick={() => openComposer(a)}>Email</a></td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ---------- EMAIL COMPOSER (only rendered when a deal is picked) ---------- */}
                {composerDeal && (
                    <div id="emailComposer" ref={composerRef}>
                        <h2>Email Composer: {composerDeal.id}</h2>
                        <div className="field">
                            <label htmlFor="templateSelect">Select Template</label>
                            <select id="templateSelect" value={template} onChange={e => chooseTemplate(e.target.value)}>
                                <option value="">Select a Template</option>
                                {TEMPLATES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="subjectLine">Subject Line</label>
                            <input type="text" id="subjectLine" value={subject} onChange={e => setSubject(e.target.value)} />
                        </div>
                        <div className="field">
                            <label htmlFor="emailBody">Email Body</label>
                            <textarea id="emailBody" value={body} onChange={e => setBody(e.target.value)}></textarea>
                        </div>
                        <div className="composer-actions">
                            <button type="button" className="btn btn-primary" onClick={copyEmail} disabled={!body}>Copy to Clipboard</button>
                            <button type="button" className="btn btn-ghost" onClick={openInGmail} disabled={!body}>Open in Gmail</button>
                            <button type="button" className="btn btn-ghost" onClick={openInOutlook} disabled={!body}>Open in Outlook</button>
                            <button type="button" className="btn btn-ghost" onClick={closeComposer}>Close</button>
                        </div>
                    </div>
                )}
            </main>

            <button id="chatbot-btn" title="TC Pipeline Assistant" onClick={() => alert('Chatbot coming soon!')}>🤖</button>
        </div>
    );
}

export default Transactions;
