// localStorage helpers (still used for settings)

function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}
// stores data in the browser permanently
// only accepts strings. JSON.stringify() converts JS objects/arrays into a string first

function loadData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}
// JSON.parse() converts the stored string back into a usable JS object
// returns null if nothing is stored yet


// Settings (still uses localStorage since its simple and fast)

function loadSettings() {
    const settings = loadData('tcSettings');
    if (settings) {
        document.getElementById('fullName').value = settings.fullName || '';
        // || '' means "use the saved value, or fall back to empty string if it doesn't exist"
        document.getElementById('email').value = settings.email || '';
        document.getElementById('phoneNumber').value = settings.phoneNumber || '';
        document.getElementById('companyOrBrokerage').value = settings.companyOrBrokerage || '';
        document.getElementById('titleOrRole').value = settings.titleOrRole || '';
        document.getElementById('linkedInUrl').value = settings.linkedInUrl || '';
    }
}

function saveSettings(e) {
    e.preventDefault(); // stops the form from reloading the page on submit
    const settings = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phoneNumber: document.getElementById('phoneNumber').value,
        companyOrBrokerage: document.getElementById('companyOrBrokerage').value,
        titleOrRole: document.getElementById('titleOrRole').value,
        linkedInUrl: document.getElementById('linkedInUrl').value
    };
    saveData('tcSettings', settings); // saves the whole object to localStorage under the key 'tcSettings'
    alert('Settings saved!');
}


// Transaction API (async talks to PHP backend now)

async function getTransactions() {
    const response = await fetch('http://localhost:3000/api/transactions');
    const data = await response.json();
    return data;
}
// async marks the function as asynchronous... it can use await inside
// fetch() sends a GET request to our php api
// await pauses here until the server responds before continuing
// response.json() parses the JSON string back into a JS array

async function apiPost(transaction) {
    // sends a new transaction to the server (INSERT)
    const response = await fetch('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // tells PHP to expect JSON in the request body
        body: JSON.stringify(transaction) // converts the JS object into a JSON string PHP can read
    });
    return await response.json();
}
// method: 'POST' tells PHP this is an insert operation
// body: JSON.stringify() converts the JS object into a JSON string for PHP to read

async function apiPut(transaction) {
    // sends an updated transaction to the server (UPDATE)
    const response = await fetch('http://localhost:3000/api/transactions', {
        method: 'PUT', // PUT tells PHP this is an update, not a new insert
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
    });
    return await response.json();
}

async function apiDelete(fileID) {
    // tells server to delete a transaction by File ID
    const response = await fetch('http://localhost:3000/api/transactions?fileID=' + fileID, {
        method: 'DELETE' // DELETE tells PHP to remove the record
    });
    return await response.json();
}
// fileID is passed in the URL as a query parameter
// PHP reads it with $_GET['fileID']


// Utility functions (synchronous so no server needed)

function daysToClose(closingDate) {
    if (!closingDate) return '—'; // returns a dash if no closing date was entered
    const today = new Date();
    const closing = new Date(closingDate);
    const diff = Math.ceil((closing - today) / (1000 * 60 * 60 * 24));
    return diff;
}
// subtracting two Date objects gives milliseconds
// dividing by ms-per-day converts to days
// then Math.ceil rounds up so partial days count as a full day

function autoRisk(transaction) {
    const days = daysToClose(transaction.closingDate);
    const milestones = [
        transaction.earnestMoneyReceived,
        transaction.inspectionComplete,
        transaction.appraisalReceived,
        transaction.titleClear,
        transaction.insuranceConfirmed,
        transaction.clearToCloseConfirmed
    ];
    const incomplete = milestones.filter(m => !m).length;
    // filter(m => !m) keeps only false/unchecked milestones and counts them

    if (days !== '—' && days <= 7 && incomplete >= 2) return 'High';
    // closing within 7 days with 2+ open milestones = High risk
    if (days !== '—' && days <= 14 && incomplete >= 1) return 'Medium';
    // closing within 14 days with any open milestone = Medium
    return 'Low';
}


// Render transactions table (async)

async function renderTransactions(filter = '') {
    // filter defaults to empty string so the function works with or without a search term
    const tbody = document.getElementById('transactionTableBody');
    if (!tbody) return; // exits early if the table doesn't exist on this page

    let transactions = await getTransactions();
    // await here waits for the API response before trying to display anything

    // apply search filter
    if (filter) {
        filter = filter.toLowerCase();
        transactions = transactions.filter(t =>
            t.fileID.toLowerCase().includes(filter) ||
            t.propertyAddress.toLowerCase().includes(filter)
        );
        // .filter() returns a new array with only the matching deals
    }

    // apply stage filter
    const stageFilter = document.getElementById('stageFilter');
    if (stageFilter && stageFilter.value) {
        transactions = transactions.filter(t => t.stage === stageFilter.value);
    }

    // apply risk filter
    const riskFilter = document.getElementById('riskFilter');
    if (riskFilter && riskFilter.value) {
        transactions = transactions.filter(t =>
            (t.riskLevel || autoRisk(t)).toLowerCase() === riskFilter.value
        );
    }

    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No transactions found.</td></tr>';
        return;
    }

    tbody.innerHTML = transactions.map(t => {
        const days = daysToClose(t.closingDate);
        const risk = t.riskLevel || autoRisk(t); // uses manual risk if set, otherwise auto-calculates
        const riskClass = risk === 'High' ? 'risk-high' : risk === 'Medium' ? 'risk-medium' : 'risk-low';
        return `
            <tr>
                <td>${t.fileID}</td>
                <td>${t.propertyAddress || '—'}</td>
                <td>${t.stage || '—'}</td>
                <td>${t.closingDate || '—'}</td>
                <td>${days}</td>
                <td class="${riskClass}">${risk}</td>
                <td>
                    <a href="#">View</a> |
                    <a href="add.html?fileID=${t.fileID}">Edit</a> |
                    <a href="#" onclick="deleteTransaction('${t.fileID}'); return false;">Delete</a> |
                    <a href="#" onclick="openComposer('${t.fileID}'); return false;">Email</a>
                </td>
            </tr>
        `;
    }).join('');
    // .map() builds one <tr> string per transaction, .join('') merges them into one big HTML string
}


// Render dashboard (now async)

async function renderDashboard() {
    const transactions = await getTransactions();
    // await: "dashboard can't show up until server sends transaction data"

    // closing this week
    const closingThisWeek = transactions.filter(t => {
        if (!t.closingDate) return false;
        const days = daysToClose(t.closingDate);
        return days >= 0 && days <= 7; // days >= 0 excludes already-closed deals
    }).length;

    // overdue milestones
    const overdueMilestones = transactions.filter(t => {
        const milestones = [
            t.earnestMoneyReceived,
            t.inspectionComplete,
            t.appraisalReceived,
            t.titleClear,
            t.insuranceConfirmed,
            t.clearToCloseConfirmed
        ];
        const incomplete = milestones.filter(m => !m).length;
        const days = daysToClose(t.closingDate);
        return days !== '—' && days <= 14 && incomplete > 0;
    }).length;

    // high risk deals
    const highRisk = transactions.filter(t =>
        (t.riskLevel || autoRisk(t)) === 'High'
    ).length;

    // update stat cards
    const closingEl = document.getElementById('statClosing');
    const overdueEl = document.getElementById('statOverdue');
    const riskEl = document.getElementById('statRisk');

    if (closingEl) closingEl.innerHTML = closingThisWeek;
    if (overdueEl) overdueEl.innerHTML = overdueMilestones;
    if (riskEl) riskEl.innerHTML = highRisk;
    // if() checks prevent errors on pages that don't have these elements

    // render active deals table
    const tbody = document.getElementById('dashboardTableBody');
    if (!tbody) return;

    const active = transactions
        .filter(t => t.stage !== 'closed' && t.stage !== 'terminated') // only show active deals
        .sort((a, b) => new Date(a.closingDate) - new Date(b.closingDate)) // sorts soonest closing first
        .slice(0, 5); // shows only the top 5 most urgent deals

    if (active.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No active deals.</td></tr>';
        return;
    }

    tbody.innerHTML = active.map(t => {
        const days = daysToClose(t.closingDate);
        const risk = t.riskLevel || autoRisk(t);
        const riskClass = risk === 'High' ? 'risk-high' : risk === 'Medium' ? 'risk-medium' : 'risk-low';
        return `
            <tr>
                <td>${t.fileID}</td>
                <td>${t.propertyAddress || '—'}</td>
                <td>${t.stage || '—'}</td>
                <td>${t.closingDate || '—'}</td>
                <td>${days}</td>
                <td class="${riskClass}">${risk}</td>
                <td><a href="transactions.html">View</a></td>
            </tr>
        `;
    }).join('');

    // render upcoming deadlines
    const deadlinesTbody = document.getElementById('deadlinesTableBody');
    if (!deadlinesTbody) return;

    const deadlines = [];
    transactions.forEach(t => {
        // pulls every deadline type from every deal into one flat array
        if (t.inspectionDeadline) deadlines.push({ fileID: t.fileID, type: 'Inspection', date: t.inspectionDeadline });
        if (t.appraisalDeadline) deadlines.push({ fileID: t.fileID, type: 'Appraisal', date: t.appraisalDeadline });
        if (t.financingContingencyDeadline) deadlines.push({ fileID: t.fileID, type: 'Financing', date: t.financingContingencyDeadline });
        if (t.emdDueDate) deadlines.push({ fileID: t.fileID, type: 'EMD', date: t.emdDueDate });
    });

    deadlines.sort((a, b) => new Date(a.date) - new Date(b.date)); // soonest deadline first
    const upcoming = deadlines.slice(0, 5); // show only the next 5

    if (upcoming.length === 0) {
        deadlinesTbody.innerHTML = '<tr><td colspan="4">No upcoming deadlines.</td></tr>';
        return;
    }

    deadlinesTbody.innerHTML = upcoming.map(d => {
        const days = daysToClose(d.date);
        return `
            <tr>
                <td>${d.fileID}</td>
                <td>${d.type}</td>
                <td>${d.date}</td>
                <td>${days}</td>
            </tr>
        `;
    }).join('');
}


// CRUD operations (now async! talk to PHP API.)

async function deleteTransaction(fileID) {
    if (!confirm('Are you sure you want to delete ' + fileID + '?')) return;
    // confirm() pops up a browser dialog. if they click Cancel, return exits early and nothing gets deleted
    await apiDelete(fileID);
    // await: "wait for server to confirm we deleted the file before we try to render anything again"
    await renderTransactions();
}

async function loadTransactionForEdit(fileID) {
    const transactions = await getTransactions();
    // await: "need the data from server before we can fill the form"
    const t = transactions.find(t => t.fileID === fileID);
    // .find() returns the first match, or undefined if nothing matches
    if (!t) return;

    document.getElementById('fileID').value = t.fileID;
    document.getElementById('fileID').readOnly = true; // locks File ID so it can't be accidentally changed while editing
    document.getElementById('side').value = t.side;
    document.getElementById('propertyType').value = t.propertyType;
    document.getElementById('transactionType').value = t.transactionType;
    document.getElementById('stage').value = t.stage;
    document.getElementById('mlsNumber').value = t.mlsNumber;
    document.getElementById('buyerName').value = t.buyerName;
    document.getElementById('sellerName').value = t.sellerName;
    document.getElementById('listingAgent').value = t.listingAgent;
    document.getElementById('assignee').value = t.assignedTo;
    document.getElementById('propertyAddress').value = t.propertyAddress;
    document.getElementById('closingLocation').value = t.closingLocation;
    document.getElementById('contractDate').value = t.contractDate;
    document.getElementById('closingDate').value = t.closingDate;
    document.getElementById('closingTime').value = t.closingTime;
    document.getElementById('emdDueDate').value = t.emdDueDate;
    document.getElementById('inspectionDeadline').value = t.inspectionDeadline;
    document.getElementById('appraisalDeadline').value = t.appraisalDeadline;
    document.getElementById('financingContingencyDeadline').value = t.financingContingencyDeadline;
    document.getElementById('purchasePrice').value = t.purchasePrice;
    document.getElementById('listingPrice').value = t.listingPrice;
    document.getElementById('emdAmount').value = t.emdAmount;
    document.getElementById('titleCompanyName').value = t.titleCompanyName;
    document.getElementById('titleCompanyContact').value = t.titleCompanyContact;
    document.getElementById('lenderName').value = t.lenderName;
    document.getElementById('lenderContact').value = t.lenderContact;
    document.getElementById('riskLevel').value = t.riskLevel;
    document.getElementById('nextAction').value = t.nextAction;
    document.getElementById('nextActionDue').value = t.nextActionDue;
    document.getElementById('blocker').value = t.blocker;
    document.getElementById('notes').value = t.notes;
    document.getElementById('earnestMoneyReceived').checked = t.earnestMoneyReceived;
    // checkboxes use .checked instead of .value — returns true or false
    document.getElementById('inspectionComplete').checked = t.inspectionComplete;
    document.getElementById('appraisalReceived').checked = t.appraisalReceived;
    document.getElementById('titleClear').checked = t.titleClear;
    document.getElementById('insuranceConfirmed').checked = t.insuranceConfirmed;
    document.getElementById('clearToCloseConfirmed').checked = t.clearToCloseConfirmed;
}


// Email composer

let currentComposerDeal = null;
// stored outside the function so other functions (loadTemplate, closeComposer) can access the same deal

async function openComposer(fileID) {
    const transactions = await getTransactions();
    // await: "Im going to need server data to write the email template first..."
    currentComposerDeal = transactions.find(t => t.fileID === fileID);
    if (!currentComposerDeal) return;

    document.getElementById('templateSelect').value = '';
    document.getElementById('subjectLine').value = '';
    document.getElementById('emailBody').value = '';
    document.getElementById('emailComposer').style.display = 'block'; // shows the hidden composer panel
    document.getElementById('emailComposer').scrollIntoView({ behavior: 'smooth' }); // scrolls down to it smoothly
}

function closeComposer() {
    document.getElementById('emailComposer').style.display = 'none'; // hides the panel
    currentComposerDeal = null; // clears the stored deal so the next Email click starts fresh
}

function getSignature() {
    // settings still come from localStorage (no API call needed)
    const settings = loadData('tcSettings') || {};
    // || {} means "if no settings saved yet, use an empty object so the template strings don't crash"
    return `
Best,

${settings.fullName || 'Your TC'}
${settings.titleOrRole || 'Transaction Coordinator'}
${settings.companyOrBrokerage || ''}
${settings.phoneNumber || ''} | ${settings.email || ''}
${settings.linkedInUrl ? 'LinkedIn: ' + settings.linkedInUrl : ''}
    `.trim();
}

function loadTemplate() {
    const t = currentComposerDeal;
    if (!t) return;
    const template = document.getElementById('templateSelect').value;
    const sig = getSignature();

    const templates = {
        // each key maps to a subject and body
        // ${} inside backtick strings pulls live data from the current deal
        welcome: {
            subject: `${t.fileID} – Welcome to Your Transaction | Next Steps & Key Dates`,
            body: `Hi ${t.buyerName || '[Buyer/Seller/Agent Names]'},

I'm ${(loadData('tcSettings') || {}).fullName || '[Your Name]'}, your Transaction Coordinator for ${t.fileID} at ${t.propertyAddress || '[Property Address]'}. I'll be managing this file from contract through closing to keep everything on track and transparent.

Key Dates:
- Contract Date: ${t.contractDate || '[Date]'}
- Inspection Deadline: ${t.inspectionDeadline || '[Date]'}
- Appraisal Deadline: ${t.appraisalDeadline || '[Date]'}
- Financing Contingency: ${t.financingContingencyDeadline || '[Date]'}
- Closing Date: ${t.closingDate || '[Date]'}

Immediate Next Steps:
- Earnest Money Deposit (EMD) of $${t.emdAmount || '[Amount]'} is due by ${t.emdDueDate || '[Date]'} to ${t.titleCompanyName || '[Title Company]'}.
- Please confirm receipt once wired.
- I've attached the full executed Purchase Agreement for your records.

Who to Contact for What:
- Questions about the contract or timeline → reply to this email
- Lender / financing questions → ${t.lenderName || '[Lender Name]'} at ${t.lenderContact || '[Lender Contact]'}
- Title / escrow questions → ${t.titleCompanyName || '[Title Company]'} at ${t.titleCompanyContact || '[Title Contact]'}

I'll send a weekly status update every Monday. Let me know if you need anything at all.

Looking forward to a smooth close!

${sig}`
        },

        emd: {
            subject: `${t.fileID} – Earnest Money Deposit Confirmed ✅`,
            body: `Hi Team,

Great news — the Earnest Money Deposit for ${t.fileID} has been received and confirmed by ${t.titleCompanyName || '[Title Company]'}.

Updated Status:
- File is officially moving forward
- EMD: $${t.emdAmount || '[Amount]'} received

All other key dates remain the same. I'll continue monitoring and will send the next update as soon as the inspection is scheduled.

Let me know if you have any questions.

${sig}`
        },

        inspection: {
            subject: `${t.fileID} – Inspection Complete | Next Steps`,
            body: `Hi Team,

The inspection for ${t.fileID} has been completed.

Key Takeaways:
- [Brief summary — e.g., "No major issues noted" or "Buyer requesting repairs on X, Y, Z"]

Next:
- Buyer has until ${t.inspectionDeadline || '[Inspection Response Deadline]'} to submit any repair requests or amendments.
- I will route any addendums for signatures as soon as they come in.

I'll keep you posted on the buyer's response.

${sig}`
        },

        appraisal: {
            subject: `${t.fileID} – Appraisal Received | Update`,
            body: `Hi Team,

The appraisal for ${t.fileID} has been received.

Property Address: ${t.propertyAddress || '[Address]'}
Purchase Price: $${t.purchasePrice || '[Amount]'}
Appraisal Result: [Insert appraised value]

[Add any notes about the appraisal result — came in at value, came in low, etc.]

I'll continue monitoring and will flag anything immediately if action is needed.

${sig}`
        },

        ctc: {
            subject: `${t.fileID} – Clear to Close Issued 🎉 | Closing Scheduled`,
            body: `Hi Team,

Excellent update — we are officially Clear to Close on ${t.fileID}!

Closing Details:
- Closing Date: ${t.closingDate || '[Date]'}
- Closing Time: ${t.closingTime || '[Time]'}
- Location: ${t.closingLocation || '[Title Company / Virtual / Attorney Office]'}

Final Walk-Through: Please confirm if you need to attend.

I will confirm funding status on closing day and send the final CD once it's ready.

This one is tracking perfectly. Looking forward to getting it closed!

${sig}`
        },

        weekly: {
            subject: `${t.fileID} Weekly Update – ${t.stage || '[Current Stage]'} | ${t.closingDate || '[Closing Date]'}`,
            body: `Hi Team,

Quick weekly update on ${t.fileID} – ${t.propertyAddress || '[Property Address]'}. We are currently in the ${t.stage || '[Current Stage]'} phase with ${daysToClose(t.closingDate)} days until closing.

Done This Week:
- [Bullet 1]
- [Bullet 2]

Next Week / Upcoming:
- [Bullet 1]
- [Bullet 2]

What I Need from You:
- [Specific request]

Critical Deadlines:
- ${t.inspectionDeadline ? 'Inspection Deadline: ' + t.inspectionDeadline : '[Add deadlines]'}
- ${t.appraisalDeadline ? 'Appraisal Deadline: ' + t.appraisalDeadline : ''}

Everything is tracking well. I'm monitoring the pipeline daily and will flag anything immediately.

Reply with any questions — happy to hop on a quick call.

${sig}`
        },

        postclose: {
            subject: `${t.fileID} – Closed! Thank You & Final Documents`,
            body: `Hi Team,

Closed and recorded! 🎉

${t.fileID} at ${t.propertyAddress || '[Property Address]'} has successfully closed.

Attached / Available:
- Final Closing Disclosure (CD)
- Recorded Deed (when available)
- Keys / possession instructions

Thank you all for the smooth cooperation. If you need anything post-closing or have another deal coming up, I'm here.

${sig}`
        }
    };

    if (templates[template]) {
        document.getElementById('subjectLine').value = templates[template].subject;
        document.getElementById('emailBody').value = templates[template].body;
    }
}

function copyEmail() {
    const subject = document.getElementById('subjectLine').value;
    const body = document.getElementById('emailBody').value;
    const full = 'Subject: ' + subject + '\n\n' + body;
    navigator.clipboard.writeText(full).then(() => {
        // navigator.clipboard is the browser's built-in clipboard API
        // .then() runs after the copy succeeds since it's async
        alert('Email copied to clipboard!');
    });
}

function openInGmail() {
    const subject = encodeURIComponent(document.getElementById('subjectLine').value);
    const body = encodeURIComponent(document.getElementById('emailBody').value);
    // encodeURIComponent converts spaces and special characters into URL-safe format
    window.open('https://mail.google.com/mail/?view=cm&su=' + subject + '&body=' + body);
    // window.open opens a new tab instead of navigating away from the page
}

function openInOutlook() {
    const subject = encodeURIComponent(document.getElementById('subjectLine').value);
    const body = encodeURIComponent(document.getElementById('emailBody').value);
    window.open('https://outlook.live.com/mail/0/deeplink/compose?subject=' + subject + '&body=' + body);
}