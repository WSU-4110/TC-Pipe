// =====================================================================
// DASHBOARD HELPERS
// ---------------------------------------------------------------------
// Pure functions (no React, no DOM) that turn raw transaction rows from
// the backend into the numbers/lists the dashboard shows.
// Moved out of dashboard.html's <script> block so dashboard.jsx stays
// focused on UI.
// =====================================================================

// ---------- settings ----------
export const SOON_DAYS           = 7;
export const WATCH_DAYS          = 14;
export const UPCOMING_WINDOW     = 30;
export const DEALS_PAGE_SIZE     = 8;
export const ATTENTION_PAGE_SIZE = 6;
export const DEADLINES_PAGE_SIZE = 8;
export const STALE_AFTER_MS      = 5 * 60 * 1000;

export const MILESTONES = [
    { field: 'earnestMoneyReceived',  label: 'Earnest money' },
    { field: 'inspectionComplete',    label: 'Inspection' },
    { field: 'appraisalReceived',     label: 'Appraisal' },
    { field: 'titleClear',            label: 'Title clear' },
    { field: 'insuranceConfirmed',    label: 'Insurance' },
    { field: 'clearToCloseConfirmed', label: 'Clear to close' }
];

// field names match the MySQL columns in Backend/index.js
const DEADLINES = [
    { field: 'EMDdueDate',                   label: 'EMD',        doneField: 'earnestMoneyReceived' },
    { field: 'inspectionDeadline',           label: 'Inspection', doneField: 'inspectionComplete' },
    { field: 'appraisalDeadline',            label: 'Appraisal',  doneField: 'appraisalReceived' },
    { field: 'financingContingencyDeadline', label: 'Financing',  doneField: 'clearToCloseConfirmed' }
];

export const RANK = { Low: 0, Medium: 1, High: 2 };

// ---------- small helpers ----------
export const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');
const isTrue = v => v === true || v === 1 || v === '1' || v === 'true';
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function isBlank(v) {
    if (v == null) return true;
    const s = String(v).trim();
    return s === '' || /^0000-00-00/.test(s);
}

// 'YYYY-MM-DD' -> local Date (or null if missing/invalid)
function parseDate(v) {
    if (isBlank(v)) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v).trim());
    if (!m) return null;
    const y = +m[1], mo = +m[2] - 1, d = +m[3];
    if (y < 1900) return null;
    const date = new Date(y, mo, d);
    return (date.getMonth() === mo && date.getDate() === d) ? date : null;
}

function startOfToday() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export const diffDays = date => Math.round((date - startOfToday()) / 86400000);

export const fmtDate = date =>
    date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const fmtShort = date =>
    date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

export function relative(days) {
    if (days === null) return '—';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days === -1) return 'Yesterday';
    return days > 0 ? 'In ' + days + ' days' : -days + ' days ago';
}

function parseMoney(v) {
    const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.-]/g, ''));
    return isFinite(n) ? n : 0;
}

export const money = n =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const moneyCompact = n =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });

// sort helper: nulls go to the end
export function cmpNullLast(a, b) {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
}

// ---------- analysis ----------
function assessRisk(t, closeDays, openCount, overdueCount) {
    const reasons = [];
    let level = 'Low';
    const bump = (lvl, why) => {
        if (RANK[lvl] > RANK[level]) level = lvl;
        reasons.push(why);
    };

    if (closeDays === null) {
        bump('Medium', 'No closing date set');
    } else if (closeDays < 0) {
        bump('High', 'Closing date passed ' + plural(-closeDays, 'day') + ' ago');
    } else if (closeDays <= SOON_DAYS && openCount >= 2) {
        bump('High', 'Closes in ' + plural(closeDays, 'day') + ' with ' + openCount + ' open milestones');
    } else if (closeDays <= WATCH_DAYS && openCount >= 1) {
        bump('Medium', 'Closes in ' + plural(closeDays, 'day') + ' with ' + plural(openCount, 'open milestone'));
    }
    if (overdueCount > 0) bump('Medium', plural(overdueCount, 'overdue deadline'));

    // a risk level typed in by hand on the New Deal page wins over the calculated one
    const manualRaw = String(t.riskLevel == null ? '' : t.riskLevel).trim().toLowerCase();
    const manual = RANK[cap(manualRaw)] !== undefined ? cap(manualRaw) : null;
    return {
        level: manual || level,
        manual: !!manual && manual !== level,
        reason: reasons.length ? reasons.join(' · ') : 'On track'
    };
}

// one raw DB row -> everything the dashboard needs to know about that deal
export function analyze(t) {
    const address = t.address ?? t.propertyAddress; // DB column is "address"
    const closeDate = parseDate(t.closingDate);
    const closeDays = closeDate ? diffDays(closeDate) : null;

    const openMilestones = MILESTONES.filter(m => !isTrue(t[m.field])).map(m => m.label);
    const doneCount = MILESTONES.length - openMilestones.length;

    const deadlines = [];
    const issues = [];
    DEADLINES.forEach(d => {
        const raw = t[d.field];
        if (isBlank(raw)) return;
        const date = parseDate(raw);
        if (!date) { issues.push(d.label + ' date looks invalid ("' + raw + '")'); return; }
        deadlines.push({ type: d.label, date, days: diffDays(date), done: isTrue(t[d.doneField]) });
    });
    const overdue = deadlines.filter(d => !d.done && d.days < 0);

    if (isBlank(address)) issues.push('No property address');
    if (!closeDate) issues.push(isBlank(t.closingDate) ? 'No closing date' : 'Closing date looks invalid ("' + t.closingDate + '")');

    const risk = assessRisk(t, closeDays, openMilestones.length, overdue.length);
    const id = String(t.fileID == null ? '' : t.fileID);

    return {
        id,
        address: isBlank(address) ? '' : String(address),
        stage: String(t.stage || '').trim().toLowerCase(),
        closeDate, closeDays,
        openMilestones, doneCount,
        deadlines, overdue,
        risk: risk.level, riskManual: risk.manual, riskReason: risk.reason,
        nextAction: String(t.nextAction || '').trim(),
        nextActionDate: parseDate(t.nextActionDue),
        blocker: String(t.blocker || '').trim(),
        assignee: String(t.assignedTo || t.AssignedTo || '').trim(),
        buyer: String(t.buyerName || '').trim(),
        seller: String(t.sellerName || '').trim(),
        price: parseMoney(t.purchasePrice) || parseMoney(t.listingPrice),
        issues,
        // one lowercase string to search through
        haystack: [id, address, t.buyerName, t.sellerName, t.assignedTo, t.MLSNumber]
            .map(x => String(x == null ? '' : x).toLowerCase()).join(' ')
    };
}

const stageOf = t => String(t.stage || '').trim().toLowerCase();

// all raw rows -> { deals, closedDeals, deadlines }
export function compute(transactions) {
    const deals = transactions.filter(t => !['closed', 'terminated'].includes(stageOf(t))).map(analyze);
    const closedDeals = transactions.filter(t => stageOf(t) === 'closed').map(analyze);
    const deadlines = [];
    deals.forEach(a => a.deadlines.forEach(d => deadlines.push({ deal: a, ...d })));
    return { deals, closedDeals, deadlines };
}

// "Needs Attention" items, most urgent first
export function attentionItems(deals) {
    const items = [];
    deals.forEach(a => {
        a.overdue.forEach(d => items.push({
            weight: 3, deal: a, tag: 'Overdue', cls: 'high', order: d.days,
            text: d.type + ' deadline was ' + fmtDate(d.date),
            meta: plural(-d.days, 'day') + ' overdue'
        }));
        if (a.closeDays !== null && a.closeDays < 0) items.push({
            weight: 3, deal: a, tag: 'Past due', cls: 'high', order: a.closeDays,
            text: 'Closing date ' + fmtDate(a.closeDate) + ' has passed',
            meta: 'Update the stage or closing date, or close/terminate the file'
        });
        if (a.blocker) items.push({
            weight: 2, deal: a, tag: 'Blocked', cls: 'medium', order: 0,
            text: a.blocker, meta: a.nextAction ? 'Next: ' + a.nextAction : ''
        });
    });
    return items.sort((x, y) => y.weight - x.weight || x.order - y.order);
}

// the last n months as { y, m, label }, oldest first
export function lastMonths(n) {
    const arr = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        arr.push({ y: d.getFullYear(), m: d.getMonth(),
            label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) });
    }
    return arr;
}
