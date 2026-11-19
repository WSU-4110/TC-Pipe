import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';
import TopNav from "./components/TopNav.jsx";
import Assistant from "./components/Assistant.jsx";
import "./styleSheets/style.css";
import "./styleSheets/theme.css";
import "./styleSheets/dashboard.css";
import { loadData } from "./scripts/app.js";
import {
    SOON_DAYS, UPCOMING_WINDOW, DEALS_PAGE_SIZE, ATTENTION_PAGE_SIZE, DEADLINES_PAGE_SIZE,
    STALE_AFTER_MS, MILESTONES, RANK,
    plural, diffDays, fmtDate, fmtShort, relative, money, moneyCompact, cmpNullLast,
    compute, attentionItems, lastMonths
} from "./scripts/dashboardHelpers.js";

// ======================== CHART COLORS ========================= //
const ACCENT = '#3b82f6', GREEN = '#22c55e', AMBER = '#f59e0b', PURPLE = '#a855f7', INDIGO = '#6366f1';
const GRID = 'rgba(36,51,72,0.9)', TICK = '#7a95b2';
const TOOLTIP = { backgroundColor: '#152032', titleColor: '#e2eaf4', bodyColor: '#7a95b2', borderColor: '#243348', borderWidth: 1, padding: 10 };

const STAGE_ORDER  = ['pre-contract', 'active', 'inspection', 'appraisal', 'underwriting', 'clear-to-close'];
const STAGE_LABELS = { 'pre-contract': 'Pre-Contract', 'active': 'Active', 'inspection': 'Inspection', 'appraisal': 'Appraisal', 'underwriting': 'Underwriting', 'clear-to-close': 'Clear to Close' };
const STAGE_COLORS = { 'pre-contract': INDIGO, 'active': ACCENT, 'inspection': AMBER, 'appraisal': AMBER, 'underwriting': PURPLE, 'clear-to-close': GREEN };

const shortMoney = v => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(0) + 'K' : '$' + v;

// ======================== SMALL COMPONENTS ========================= //

// bar chart
// TODO: make sure bar chart is pulling from deals actually in the backend
function BarChart({ labels, values, colors, isMoney }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const ticks = { color: TICK, font: { size: 11 } };
        const chart = new Chart(canvasRef.current, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors.map(c => c + 'bb'),
                    borderColor: colors,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: isMoney ? { ...TOOLTIP, callbacks: { label: ctx => ' ' + shortMoney(ctx.parsed.y) } } : TOOLTIP
                },
                scales: {
                    x: { grid: { color: GRID }, ticks },
                    y: { grid: { color: GRID }, beginAtZero: true,
                         ticks: isMoney ? { ...ticks, callback: shortMoney } : { ...ticks, stepSize: 1 } }
                }
            }
        });
        return () => chart.destroy();
    }, [labels, values, colors, isMoney]);

    return <canvas ref={canvasRef}></canvas>;
}

function StatCard({ value, label, hint, alert }) {
    return (
        <div className={'card' + (alert ? ' alert' : '')}>
            <h2>{value}</h2>
            <p>{label}</p>
            <small>{hint}</small>
        </div>
    );
}

// "Showing 8 of 20 deals  [Show all 20]"
function ListFooter({ shown, total, expanded, onToggle, noun }) {
    if (total <= shown && !expanded) return <div className="panel-foot"><span>{plural(total, noun)}</span></div>;
    return (
        <div className="panel-foot">
            <span>Showing {shown} of {total} {noun}s</span>
            <button type="button" className="btn-link" onClick={onToggle}>
                {expanded ? 'Show fewer' : 'Show all ' + total}
            </button>
        </div>
    );
}

// ======================== DASHBOARD PAGE ========================= //
function Dashboard() {
    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    // ---------- state ----------
    const [transactions, setTransactions] = useState([]); // raw rows from the backend
    const [status, setStatus] = useState('loading');      // 'loading' | 'ok' | 'error'
    const [errorMsg, setErrorMsg] = useState('');
    const [loadedAt, setLoadedAt] = useState(null);

    const [search, setSearch] = useState('');
    const [risk, setRisk] = useState('');
    const [sort, setSort] = useState('closing');
    const [showAllDeals, setShowAllDeals] = useState(false);
    const [showAllAttention, setShowAllAttention] = useState(false);
    const [showAllDeadlines, setShowAllDeadlines] = useState(false);

    // name for greeting + avatar (from Settings, saved in localStorage for now)
    const settings = loadData('tcSettings') || {};
    const fullName = String(settings.fullName || '').trim();
    const firstName = fullName ? fullName.split(/\s+/)[0] : 'there';

    // ======================== LOAD DATA (with token) ========================= //
    // reloadkey to re-run the useEffect below
    const [reloadKey, setReloadKey] = useState(0);
    const refresh = () => {
        setStatus('loading');
        setReloadKey(k => k + 1);
    };

    useEffect(() => {
        let ignore = false; // set to true if the page closes before the fetch finishes

        const load = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            try {
                const response = await fetch(`${API_URL}/dashboard`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                });
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    navigate('/login');
                    return;
                }
                const data = await response.json();
                if (!Array.isArray(data)) throw new Error(data.error || 'The server did not send back a list of transactions.');
                if (ignore) return;
                setTransactions(data);
                setLoadedAt(new Date());
                setStatus('ok');
            } catch (err) {
                if (ignore) return;
                console.error('Error loading dashboard:', err);
                setErrorMsg(err.message || 'Check that the server is running.');
                setStatus('error');
            }
        };

        load();
        return () => { ignore = true; };
    }, [reloadKey, API_URL, navigate]);

    // reload when you come back to the tab after 5+ minutes
    useEffect(() => {
        const onVisible = () => {
            if (!document.hidden && loadedAt && Date.now() - loadedAt > STALE_AFTER_MS) {
                setReloadKey(k => k + 1);
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [loadedAt]);


    // ======================== DERIVED DATA ========================= //
    // useMemo: only recalculate when `transactions` changes, not on every keystroke
    const { deals, closedDeals, deadlines } = useMemo(() => compute(transactions), [transactions]);

    // ----- greeting -----
    const now = new Date();
    const hour = now.getHours();
    const timeOfDay = hour >= 17 ? 'Good evening' : hour >= 12 ? 'Good afternoon' : 'Good morning';
    const dayText = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    // ----- stat cards -----
    const closingSoon = deals.filter(a => a.closeDays !== null && a.closeDays >= 0 && a.closeDays <= SOON_DAYS);
    const nextClosing = deals.filter(a => a.closeDays !== null && a.closeDays >= 0).sort((a, b) => a.closeDays - b.closeDays)[0];
    const overdueCount = deals.reduce((n, a) => n + a.overdue.length, 0);
    const dealsWithOverdue = deals.filter(a => a.overdue.length > 0).length;
    const highRisk = deals.filter(a => a.risk === 'High').length;
    const pastDue = deals.filter(a => a.closeDays !== null && a.closeDays < 0).length;
    const volume = deals.reduce((n, a) => n + a.price, 0);

    // ----- needs attention + upcoming deadlines -----
    const attention = useMemo(() => attentionItems(deals), [deals]);
    const upcoming = deadlines
        .filter(d => !d.done && d.days >= 0 && d.days <= UPCOMING_WINDOW)
        .sort((a, b) => a.date - b.date);

    // ----- active deals table (search + risk filter + sort) -----
    const q = search.trim().toLowerCase();
    const sorters = {
        closing:  (a, b) => cmpNullLast(a.closeDays, b.closeDays),
        risk:     (a, b) => RANK[b.risk] - RANK[a.risk] || cmpNullLast(a.closeDays, b.closeDays),
        progress: (a, b) => a.doneCount - b.doneCount || cmpNullLast(a.closeDays, b.closeDays)
    };
    const visibleDeals = deals
        .filter(a => (!risk || a.risk.toLowerCase() === risk) && (!q || a.haystack.includes(q)))
        .sort(sorters[sort]);

    const shownDeals     = showAllDeals ? visibleDeals : visibleDeals.slice(0, DEALS_PAGE_SIZE);
    const shownAttention = showAllAttention ? attention : attention.slice(0, ATTENTION_PAGE_SIZE);
    const shownUpcoming  = showAllDeadlines ? upcoming : upcoming.slice(0, DEADLINES_PAGE_SIZE);
    const dealsWithIssues = deals.filter(a => a.issues.length > 0);

    // ----- charts -----
    const charts = useMemo(() => {
        const months = lastMonths(6);
        const inMonth = (a, mo) => a.closeDate && a.closeDate.getFullYear() === mo.y && a.closeDate.getMonth() === mo.m;
        const stageCounts = {};
        deals.forEach(a => { stageCounts[a.stage] = (stageCounts[a.stage] || 0) + 1; });
        const stages = STAGE_ORDER.filter(s => stageCounts[s]);
        return {
            monthLabels: months.map(m => m.label),
            closings: months.map(mo => closedDeals.filter(a => inMonth(a, mo)).length),
            volume: months.map(mo => closedDeals.filter(a => inMonth(a, mo)).reduce((s, a) => s + a.price, 0)),
            stageLabels: stages.map(s => STAGE_LABELS[s]),
            stageValues: stages.map(s => stageCounts[s]),
            stageColors: stages.map(s => STAGE_COLORS[s]),
            accent: months.map(() => ACCENT),
            green: months.map(() => GREEN),
        };
    }, [deals, closedDeals]);

    // one deal ID that links to the transactions page
    const dealLink = deal => <a onClick={() => navigate('/transactions')}>{deal.id}</a>;

    // ======================== DASHBOARD UI ========================= //
    return (
        <div className="tc-dark">
            <TopNav />

            {/* ---------- MAIN CONTENT ---------- */}
            <main id="main">
                {/* Header: greeting, summary, refresh */}
                <div className="page-head">
                    <div>
                        <h1>Dashboard</h1>
                        <p id="greeting">{timeOfDay}, {firstName}. Here’s your pipeline for {dayText}.</p>
                        <p id="summary">
                            {plural(deals.length, 'active deal')} · {highRisk} high risk · {plural(overdueCount, 'overdue deadline')}
                        </p>
                    </div>
                    <div className="head-actions">
                        {loadedAt && <span>Updated {loadedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
                        <button type="button" className="btn btn-ghost" onClick={refresh} disabled={status === 'loading'}>Refresh</button>
                    </div>
                </div>

                {/* Loading / error messages */}
                <div role="status" aria-live="polite">
                    {status === 'loading' && <div className="loading">Loading your pipeline…</div>}
                    {status === 'error' && (
                        <div className="error-banner">
                            <span><strong>Couldn’t load transactions.</strong> {errorMsg}</span>
                            <button type="button" className="btn btn-ghost" onClick={refresh}>Try again</button>
                        </div>
                    )}
                </div>

                {/* Stat cards */}
                <div id="stats">
                    <StatCard value={closingSoon.length} label="Closing in 7 Days"
                        hint={nextClosing ? `Next: ${nextClosing.id} · ${fmtShort(nextClosing.closeDate)}` : 'No upcoming closings'} />
                    <StatCard value={overdueCount} label="Overdue Deadlines" alert={overdueCount > 0}
                        hint={overdueCount ? 'across ' + plural(dealsWithOverdue, 'deal') : 'Nothing overdue'} />
                    <StatCard value={highRisk} label="High Risk Deals" alert={highRisk > 0}
                        hint={'of ' + plural(deals.length, 'active deal')} />
                    <StatCard value={pastDue} label="Past-Due Closings" alert={pastDue > 0}
                        hint={pastDue ? 'Update the stage or closing date' : 'None'} />
                    <StatCard value={deals.length} label="Active Deals"
                        hint={volume ? moneyCompact(volume) + ' in contracts' : 'No prices entered'} />
                </div>

                {/* Analytics charts */}
                <section className="panel charts-section" aria-labelledby="chartsTitle">
                    <h2 id="chartsTitle">Analytics</h2>
                    <div className="charts-grid">
                        <div className="chart-box">
                            <div className="chart-label">Closings — Last 6 Months</div>
                            <BarChart labels={charts.monthLabels} values={charts.closings} colors={charts.accent} />
                        </div>
                        <div className="chart-box">
                            <div className="chart-label">Volume Closed — Last 6 Months</div>
                            <BarChart labels={charts.monthLabels} values={charts.volume} colors={charts.green} isMoney />
                        </div>
                        <div className="chart-box">
                            <div className="chart-label">Pipeline by Stage</div>
                            {charts.stageLabels.length === 0
                                ? <div className="chart-empty">No active deals</div>
                                : <BarChart labels={charts.stageLabels} values={charts.stageValues} colors={charts.stageColors} />}
                        </div>
                    </div>
                </section>

                {/* Needs Attention + Upcoming Deadlines */}
                <div className="two-col">
                    <section className="panel" aria-labelledby="attnTitle">
                        <h2 id="attnTitle">Needs Attention</h2>
                        <p className="sub">Overdue deadlines, blockers and closings that have passed.</p>
                        <ul className="attn-list">
                            {attention.length === 0 && <li className="empty">Nothing needs attention right now.</li>}
                            {shownAttention.map((item, i) => (
                                <li key={item.deal.id + item.tag + i}>
                                    <span className={'badge ' + item.cls}>{item.tag}</span>
                                    <div className="attn-main">
                                        {dealLink(item.deal)} —{item.deal.address || 'No address'}
                                        <span className="attn-meta">{item.text}{item.meta ? ' · ' + item.meta : ''}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        {attention.length > 0 && (
                            <ListFooter shown={shownAttention.length} total={attention.length} noun="item"
                                expanded={showAllAttention} onToggle={() => setShowAllAttention(v => !v)} />
                        )}
                    </section>

                    <section className="panel" aria-labelledby="upTitle">
                        <h2 id="upTitle">Upcoming Deadlines</h2>
                        <p className="sub">Next {UPCOMING_WINDOW} days. Deadlines whose milestone is already checked off are hidden.</p>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th scope="col">Due</th>
                                        <th scope="col">File ID</th>
                                        <th scope="col">Type</th>
                                        <th scope="col">In</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {upcoming.length === 0 && (
                                        <tr><td colSpan="4" className="empty">No open deadlines in the next {UPCOMING_WINDOW} days.</td></tr>
                                    )}
                                    {shownUpcoming.map((d, i) => (
                                        <tr key={d.deal.id + d.type + i}>
                                            <td>{fmtDate(d.date)}</td>
                                            <td>{dealLink(d.deal)}</td>
                                            <td>{d.type}</td>
                                            <td className={d.days <= 2 ? 'late' : d.days <= SOON_DAYS ? 'soon' : ''}>{relative(d.days)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {upcoming.length > 0 && (
                            <ListFooter shown={shownUpcoming.length} total={upcoming.length} noun="deadline"
                                expanded={showAllDeadlines} onToggle={() => setShowAllDeadlines(v => !v)} />
                        )}
                    </section>
                </div>

                {/* Active Deals */}
                <section className="panel" aria-labelledby="dealsTitle">
                    <h2 id="dealsTitle">Active Deals</h2>
                    <p className="sub">Closed and terminated deals are hidden.</p>

                    <div id="filters">
                        <label className="sr-only" htmlFor="dealSearch">Search deals</label>
                        <input type="search" id="dealSearch" placeholder="Search file ID, address or client"
                            value={search} onChange={e => { setSearch(e.target.value); setShowAllDeals(false); }} />
                        <label className="sr-only" htmlFor="riskFilter">Filter by risk</label>
                        <select id="riskFilter" value={risk} onChange={e => { setRisk(e.target.value); setShowAllDeals(false); }}>
                            <option value="">All risk levels</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                        <label className="sr-only" htmlFor="sortBy">Sort deals</label>
                        <select id="sortBy" value={sort} onChange={e => setSort(e.target.value)}>
                            <option value="closing">Sort: Closing date</option>
                            <option value="risk">Sort: Risk</option>
                            <option value="progress">Sort: Fewest milestones done</option>
                        </select>
                    </div>

                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th scope="col">File ID</th>
                                    <th scope="col">Property</th>
                                    <th scope="col">Stage</th>
                                    <th scope="col">Closing</th>
                                    <th scope="col">Milestones</th>
                                    <th scope="col">Risk</th>
                                    <th scope="col">Next Action</th>
                                    <th scope="col">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleDeals.length === 0 && (
                                    <tr><td colSpan="8" className="empty">
                                        {search || risk ? 'No deals match your filters.' : 'No active deals.'}
                                    </td></tr>
                                )}
                                {shownDeals.map(a => <DealRow key={a.id} deal={a} onView={() => navigate('/transactions')} />)}
                            </tbody>
                        </table>
                    </div>
                    {visibleDeals.length > 0 && (
                        <ListFooter shown={shownDeals.length} total={visibleDeals.length} noun="deal"
                            expanded={showAllDeals} onToggle={() => setShowAllDeals(v => !v)} />
                    )}
                </section>

                {/* Deals with missing / bad data */}
                {dealsWithIssues.length > 0 && (
                    <details className="panel">
                        <summary>Data to fix ({plural(dealsWithIssues.length, 'deal')})</summary>
                        <ul>
                            {dealsWithIssues.map(a => (
                                <li key={a.id}><strong>{a.id}</strong>: {a.issues.join('; ')}</li>
                            ))}
                        </ul>
                    </details>
                )}
            </main>

            {/* Chatbot button */}
            <Assistant />
        </div>
    );
}

// ======================== ONE ROW OF THE ACTIVE DEALS TABLE ========================= //
function DealRow({ deal: a, onView }) {
    const people = [a.buyer && 'Buyer: ' + a.buyer, a.seller && 'Seller: ' + a.seller].filter(Boolean).join(' · ');
    const subParts = [a.price ? money(a.price) : '', people].filter(Boolean).join(' · ');

    // closing column
    let closingRel = '', closingCls = '';
    if (a.closeDays !== null) {
        if (a.closeDays < 0)               { closingRel = plural(-a.closeDays, 'day') + ' past due'; closingCls = 'late'; }
        else if (a.closeDays === 0)        { closingRel = 'Today'; closingCls = 'late'; }
        else if (a.closeDays <= SOON_DAYS) { closingRel = 'In ' + plural(a.closeDays, 'day'); closingCls = 'soon'; }
        else                               { closingRel = 'In ' + plural(a.closeDays, 'day'); }
    }

    // milestones column
    const total = MILESTONES.length;
    const pct = Math.round(a.doneCount / total * 100);
    const allDone = a.doneCount === total;

    // next action column
    const nextDue = a.nextActionDate ? diffDays(a.nextActionDate) : null;

    return (
        <tr>
            <td>
                <strong>{a.id}</strong>
                {a.assignee && <span className="sub-line">{a.assignee}</span>}
            </td>
            <td className="wrap">
                {a.address || <span className="sub-line">No address</span>}
                {subParts && <span className="sub-line">{subParts}</span>}
            </td>
            <td><span className="badge stage">{a.stage || '—'}</span></td>
            <td>
                {a.closeDays === null ? '—' : <>{fmtDate(a.closeDate)}<span className={'sub-line ' + closingCls}>{closingRel}</span></>}
            </td>
            <td title={allDone ? 'All milestones complete' : 'Still open: ' + a.openMilestones.join(', ')}>
                <div className={'progress' + (allDone ? ' done' : '')} role="img" aria-label={`${a.doneCount} of ${total} milestones complete`}>
                    <span style={{ width: pct + '%' }}></span>
                </div>
                {a.doneCount}/{total} done
            </td>
            <td title={a.riskReason}>
                <span className={'badge ' + a.risk.toLowerCase()}>{a.risk}</span>
                {a.riskManual && <span className="badge manual" title="Set by hand on the deal.">manual</span>}
            </td>
            <td className="wrap">
                {a.nextAction || <span className="sub-line">—</span>}
                {a.nextActionDate && (
                    <span className={'sub-line ' + (nextDue < 0 ? 'late' : '')}>
                        Due {fmtShort(a.nextActionDate)}{nextDue < 0 ? ' (overdue)' : ''}
                    </span>
                )}
                {a.blocker && <span className="blocker">Blocked: {a.blocker}</span>}
            </td>
            <td><a onClick={onView}>View</a></td>
        </tr>
    );
}

export default Dashboard;
