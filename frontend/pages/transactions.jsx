import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import "./styleSheets/style.css";
import "./styleSheets/theme.css";
import "./styleSheets/transactions.css";
import TopNav from "./components/TopNav.jsx";
import Assistant from "./components/Assistant.jsx";
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

// ======================== FUNCTION FOR VIEW TRANSACTIONS ========================= //
function ViewDetailField({ field, value }) {
    let display;
    const blank = value === null || value === undefined || value === '';

    if (field.type === 'check') {
        // milestones come back from MySQL as 1 or 0
        display = value ? '✓ Done' : '✗ Not yet';
    } else if (blank) {
        display = '—';
    } else if (field.type === 'select') {
        // turn the stored value ('singleFamily') back into its label ('Single Family')
        const match = field.options.find(([optValue]) => optValue === value);
        display = match ? match[1] : value;
    } else if (field.type === 'date') {
        // MySQL sends '2026-12-05T05:00:00.000Z'; the first 10 characters are the date
        const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
        display = new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (field.type === 'number') {
        display = '$' + Number(value).toLocaleString('en-US');
    } else {
        display = String(value);
    }

    return (
        <div className={'field' + (field.full ? ' full' : '')}>
            <span className="field-label">{field.label}</span>
            <span className="field-value">{display}</span>
        </div>
    );
}

// ======================== FUNCTION FOR EDIT TRANSACTIONS ========================= //
function EditDetailField({ field, value, onChange }) {
    // milestones: a checkbox. The whole box is a <label>, so clicking anywhere toggles it
    if (field.type === 'check') {
        return (
            <label className="field milestone-item" htmlFor={field.name}>
                <input type="checkbox" id={field.name} name={field.name} checked={!!value} onChange={onChange} />
                <span>{field.label}</span>
            </label>
        );
    }

    let control;
    if (field.type === 'select') {
        control = (
            <select id={field.name} name={field.name} value={value ?? ''} onChange={onChange}>
                {field.options.map(([optValue, optLabel]) => <option key={optValue} value={optValue}>{optLabel}</option>)}
            </select>
        );
    } else if (field.type === 'textarea') {
        control = <textarea id={field.name} name={field.name} value={value ?? ''} onChange={onChange}></textarea>;
    } else {
        // File ID is how the backend finds this deal, so it can't be changed here
        const locked = field.name === 'fileID';
        control = (
            <input
                type={field.type || 'text'}
                id={field.name}
                name={field.name}
                value={value ?? ''}
                onChange={onChange}
                readOnly={locked}
                title={locked ? 'The File ID can’t be changed' : undefined}
                placeholder={locked ? undefined : field.placeholder}
                inputMode={field.inputMode}
                min={field.type === 'number' ? 0 : undefined}
                step={field.type === 'number' ? 'any' : undefined}
            />
        );
    }
    return (
        <div className={'field' + (field.full ? ' full' : '')}>
            <label htmlFor={field.name}>{field.label}</label>
            {control}
        </div>
    );
}


// ======================== TRANSACTIONS PAGE SCRIPT ========================= //
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

    // action
    const [action, setAction] = useState('');  // which action is chosen

    // email composer
    const [composerDeal, setComposerDeal] = useState(null);
    const [template, setTemplate] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const composerRef = useRef(null);

    // edit transaction: an editable copy of the selected deal (filled in by toggleAction)
    const [draft, setDraft] = useState({});
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState('');

    // delete transaction
    const [deletingId, setDeletingId] = useState(null);   // fileID being deleted right now
    const [deleteError, setDeleteError] = useState('');

    // transaction data
    const SECTIONS = [
        {
            title: 'Basic Info',
            fields: [
                { name: 'fileID', label: 'File ID', placeholder: 'Leave blank to auto-generate' },
                { name: 'side', label: 'Side', type: 'select', options: [
                    ['', 'Select Side'], ['buyer', 'Buyer'], ['seller', 'Seller'], ['dual', 'Dual Agency']] },
                { name: 'propertyType', label: 'Property Type', type: 'select', options: [
                    ['', 'Select Property Type'], ['singleFamily', 'Single Family'], ['condoOrTownhouse', 'Condo/Townhouse'],
                    ['multiFamily', 'Multi-Family'], ['commercial', 'Commercial'], ['landOrLot', 'Land/Lot']] },
                { name: 'transactionType', label: 'Transaction Type', type: 'select', options: [
                    ['', 'Select Type'], ['standardSale', 'Standard Sale'], ['shortSale', 'Short Sale'],
                    ['reoOrBankOwned', 'REO/Bank Owned'], ['newConstruction', 'New Construction']] },
                { name: 'stage', label: 'Stage', type: 'select', options: [
                    ['', 'Select Stage'], ['pre-contract', 'Pre-Contract'], ['active', 'Active'], ['inspection', 'Inspection'],
                    ['appraisal', 'Appraisal'], ['underwriting', 'Underwriting'], ['clear-to-close', 'Clear to Close'],
                    ['closed', 'Closed'], ['terminated', 'Terminated']] },
                { name: 'MLSNumber', label: 'MLS Number', inputMode: 'numeric' },
            ],
        },
        {
            title: 'Parties',
            fields: [
                { name: 'buyerName', label: 'Buyer Name' },
                { name: 'sellerName', label: 'Seller Name' },
                { name: 'listingAgent', label: 'Listing Agent' },
                { name: 'assignedTo', label: 'Assigned To', column: 'AssignedTo' }, // DB column has a capital A
            ],
        },
        {
            title: 'Dates & Deadlines',
            fields: [
                { name: 'contractDate', label: 'Contract Date', type: 'date' },
                { name: 'closingDate', label: 'Closing Date', type: 'date' },
                { name: 'closingTime', label: 'Closing Time', type: 'time' },
                { name: 'EMDdueDate', label: 'EMD Due Date', type: 'date' },
                { name: 'inspectionDeadline', label: 'Inspection Deadline', type: 'date' },
                { name: 'appraisalDeadline', label: 'Appraisal Deadline', type: 'date' },
                { name: 'financingContingencyDeadline', label: 'Financing Contingency Deadline', type: 'date' },
            ],
        },
        {
            title: 'Location',
            fields: [
                { name: 'address', label: 'Property Address' },
                { name: 'closingLocation', label: 'Closing Location' },
            ],
        },
        {
            title: 'Financials',
            fields: [
                { name: 'purchasePrice', label: 'Purchase Price ($)', type: 'number' },
                { name: 'listingPrice', label: 'Listing Price ($)', type: 'number' },
                { name: 'EMDamount', label: 'EMD Amount ($)', type: 'number' },
            ],
        },
        {
            title: 'Title & Lender',
            fields: [
                { name: 'titleCompanyName', label: 'Title Company Name' },
                { name: 'titleCompanyContact', label: 'Title Company Contact' },
                { name: 'lenderName', label: 'Lender Name' },
                { name: 'lenderContact', label: 'Lender Contact' },
            ],
        },
        {
            title: 'Risk & Notes',
            fields: [
                { name: 'riskLevel', label: 'Risk Level', type: 'select', options: [
                    ['', 'Calculate automatically'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']] },
                { name: 'nextAction', label: 'Next Action' },
                { name: 'nextActionDue', label: 'Next Action Due Date', type: 'date' },
                { name: 'blocker', label: 'Blocker' },
                { name: 'notes', label: 'Notes', type: 'textarea', full: true },
            ],
        },
        {
            title: 'MILESTONES',
            fields: [
                { name: 'earnestMoneyReceived',  label: 'Earnest Money Received',   type: 'check' },
                { name: 'inspectionComplete',    label: 'Inspection Complete',      type: 'check' },
                { name: 'appraisalReceived',     label: 'Appraisal Received',       type: 'check' },
                { name: 'titleClear',            label: 'Title Clear',              type: 'check' },
                { name: 'insuranceConfirmed',    label: 'Insurance Confirmed',      type: 'check' },
                { name: 'clearToCloseConfirmed', label: 'Clear to Close Confirmed', type: 'check' },
            ]
        },
    ];

    // ======================== EDIT FORM HELPERS ========================= //
    // MySQL row -> form values. Inputs can't show null, and checkboxes want true/false (not 1/0).
    const toFormValues = (raw) => {
        const values = {};
        SECTIONS.forEach(section => section.fields.forEach(f => {
            const v = raw[f.column || f.name];          // column: 'AssignedTo' is used here too
            if (f.type === 'check')     values[f.name] = !!v;
            else if (f.type === 'date') values[f.name] = v ? String(v).slice(0, 10) : '';
            else                        values[f.name] = v == null ? '' : String(v);
        }));
        return values;
    };

    // one handler for every edit input: `name` says which key in `draft` to update
    const handleChange = (e) => {
        const { name, type, value, checked } = e.target;
        setDraft(d => ({ ...d, [name]: type === 'checkbox' ? checked : value }));
    };

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

    
    // ======================== TRANSACTION ACTIONS ========================= //
    /* 
     * grab data specific to the selected transaction
     * and create the frame based on the selected action
    */
    // scroll down to the panel when it opens or switches (View -> Edit on the same row too)
    useEffect(() => {
        if (composerDeal && composerRef.current) {
            composerRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [composerDeal, action]);

    // ---------- open / switch / close a panel ---------- //
    // name is 'view', 'email' or 'edit'.
    //  - same link on the same row again -> close the panel
    //  - anything else -> show that panel for THIS row (switching rows works too)
    const toggleAction = (deal, name) => {
        if (composerDeal && composerDeal.id === deal.id && action === name) {
            closePanel();
            return;
        }
        setComposerDeal(deal);
        setAction(name);
        if (name === 'edit') {           // fill the edit form with this deal's current values
            setDraft(toFormValues(deal.raw));
            setEditError('');
        }
        if (name === 'email') {          // start the composer empty
            setTemplate('');
            setSubject('');
            setBody('');
        }
    };
    const closePanel = () => { setComposerDeal(null); setAction(''); };

    // ---------- delete a deal ---------- //
    const deleteDeal = async (deal) => {
        // deleting can't be undone, so ask first (Cancel = stop here)
        const label = deal.address ? `${deal.id} (${deal.address})` : deal.id;
        if (!window.confirm(`Delete ${label}?\n\nThis can't be undone.`)) return;

        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        setDeletingId(deal.id);
        setDeleteError('');
        try {
            const response = await fetch(`${API_URL}/transactions/${encodeURIComponent(deal.id)}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                navigate('/login');
                return;
            }
            const data = await response.json();
            if (!response.ok) {
                setDeleteError(`${deal.id}: ${data.error || 'Could not delete this deal.'}`);
                return;
            }

            // take the row out of the list; the table and count update by themselves
            setTransactions(list => list.filter(t => t.fileID !== deal.id));
            // if a View/Edit/Email panel was open for this deal, close it
            if (composerDeal && composerDeal.id === deal.id) closePanel();
        } catch {
            setDeleteError('Could not reach the server. Check that the backend is running.');
        } finally {
            setDeletingId(null);
        }
    };

    // ---------- save the edit form ---------- //
    const saveEdit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        setSaving(true);
        setEditError('');
        try {
            const response = await fetch(`${API_URL}/transactions/${encodeURIComponent(composerDeal.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(draft),
            });
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                navigate('/login');
                return;
            }
            const saved = await response.json();
            if (!response.ok) {
                setEditError(saved.error || 'Could not save changes.');
                return;
            }

            // swap the old row for the saved one. `deals` is built from `transactions`,
            // so the table, badges and risk all update by themselves
            setTransactions(list => list.map(t => (t.fileID === saved.fileID ? saved : t)));
            closePanel();
        } catch {
            setEditError('Could not reach the server. Check that the backend is running.');
        } finally {
            setSaving(false);
        }
    };

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

                {deleteError && (
                    <div className="error-banner" role="alert">
                        <span><strong>Couldn’t delete.</strong> {deleteError}</span>
                        <button type="button" className="btn btn-ghost" onClick={() => setDeleteError('')}>Dismiss</button>
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
                <div id="table" className="scrollable">
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
                                            <tr key={a.id} className={composerDeal && composerDeal.id === a.id && action ? 'selected' : ''}>
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
                                                <td>
                                                    <span>
                                                        <a className="tableLinks" onClick={() => toggleAction(a, 'view')}>View</a>
                                                        <a className="tableLinks" onClick={() => toggleAction(a, 'email')}>Email</a>
                                                        <a className="tableLinks" onClick={() => toggleAction(a, 'edit')}>Edit</a>
                                                        <a className="tableLinks delete-link" onClick={() => deletingId || deleteDeal(a)}>
                                                            {deletingId === a.id ? 'Deleting…' : 'Delete'}
                                                        </a>
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ---------- EMAIL COMPOSER UI ---------- */}
                {action == 'email' && (
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
                            <button type="button" className="btn btn-ghost" onClick={closePanel}>Close</button>
                        </div>
                    </div>
                )}

                {/* ---------- VIEW TRANSACTION UI ---------- */}
                {action == 'view' && (
                    <div id="viewTransaction" ref={composerRef}>
                        <h2>Transaction Info for File: {composerDeal.id}</h2>

                        {/* outer loop: one <fieldset> box per section */}
                        {SECTIONS.map(section => (
                            <fieldset key={section.title}>
                                <legend>{section.title}</legend>
                                <div className="field-grid">
                                    {section.fields.map(field => (
                                        <ViewDetailField  // calling the ViewDetailField function above to write the names out
                                            key={field.name}
                                            field={field}
                                            value={composerDeal.raw[field.column || field.name]}
                                        />
                                    ))}
                                </div>
                            </fieldset>
                        ))}

                        <div className="composer-actions">
                            <button type="button" className="btn btn-primary" onClick={() => toggleAction(composerDeal, 'edit')}>Edit</button>
                            <button type="button" className="btn btn-ghost" onClick={closePanel}>Close</button>
                        </div>
                    </div>
                )}

                {/* ---------- EDIT TRANSACTION UI ---------- */}
                {action == 'edit' && (
                    <form id="editTransaction" ref={composerRef} onSubmit={saveEdit}>
                        <h2>Edit File: {composerDeal.id}</h2>

                        {/* outer loop: one <fieldset> box per section */}
                        {SECTIONS.map(section => (
                            <fieldset key={section.title}>
                                <legend>{section.title}</legend>
                                <div className="field-grid">
                                    {section.fields.map(field => (
                                        <EditDetailField key={field.name} field={field} value={draft[field.name]} onChange={handleChange} />
                                    ))}
                                </div>
                            </fieldset>
                        ))}

                        {editError && (
                            <div className="error-banner" role="alert">
                                <span><strong>Couldn’t save changes.</strong> {editError}</span>
                            </div>
                        )}

                        <div className="composer-actions">
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving…' : 'Save Changes'}
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={closePanel}>Cancel</button>
                        </div>
                    </form>
                )}
            </main>

            <Assistant />
        </div>
    );
}

export default Transactions;
