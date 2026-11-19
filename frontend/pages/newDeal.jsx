import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./styleSheets/style.css";
import "./styleSheets/theme.css";
import "./styleSheets/newDeal.css";
import TopNav from "./components/TopNav.jsx";
import Assistant from "./components/Assistant.jsx";
import { loadData } from "./scripts/app.js";

// ======================== FORM FIELDS (as data) ========================= //
// Instead of writing the same <div className="field"><label/><input/></div>
// 31 times, each section lists its fields here and the JSX below loops over
// them with .map(). To add a field: add one line here (and a DB column).
//
// `name` is the MySQL column name in Backend/index.js, so the form state
// can be sent to the backend as-is: no renaming needed on submit.
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
            { name: 'assignedTo', label: 'Assigned To' },
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
];

const MILESTONES = [
    { name: 'earnestMoneyReceived',  label: 'Earnest Money Received' },
    { name: 'inspectionComplete',    label: 'Inspection Complete' },
    { name: 'appraisalReceived',     label: 'Appraisal Received' },
    { name: 'titleClear',            label: 'Title Clear' },
    { name: 'insuranceConfirmed',    label: 'Insurance Confirmed' },
    { name: 'clearToCloseConfirmed', label: 'Clear to Close Confirmed' },
];

// starting values: '' for every text field, false for every checkbox
const EMPTY_DEAL = {
    ...Object.fromEntries(SECTIONS.flatMap(s => s.fields).map(f => [f.name, ''])),
    ...Object.fromEntries(MILESTONES.map(m => [m.name, false])),
};

// ======================== ONE FORM FIELD ========================= //
// picks <select>, <textarea> or <input> based on field.type
function Field({ field, value, onChange }) {
    let control;
    if (field.type === 'select') {
        control = (
            <select id={field.name} name={field.name} value={value} onChange={onChange}>
                {field.options.map(([optValue, optLabel]) => <option key={optValue} value={optValue}>{optLabel}</option>)}
            </select>
        );
    } else if (field.type === 'textarea') {
        control = <textarea id={field.name} name={field.name} value={value} onChange={onChange}></textarea>;
    } else {
        control = (
            <input
                type={field.type || 'text'}
                id={field.name}
                name={field.name}
                value={value}
                onChange={onChange}
                placeholder={field.placeholder}
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

// ======================== NEW DEAL PAGE ========================= //
function NewDeal() {
    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    // the whole form lives in ONE state object: { fileID: '', side: '', ..., titleClear: false }
    // ...pre-filled with the Deal Defaults saved on the Settings page (title company, lender, etc.)
    const [deal, setDeal] = useState(() => ({ ...EMPTY_DEAL, ...(loadData('tcDealDefaults') || {}) }));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // ======================== HANDLE FORM CHANGES ========================= //
    // one handler for every input: `name` says which key in `deal` to update.
    // Checkboxes report .checked (true/false); everything else reports .value.
    const handleChange = (e) => {
        const { name, type, value, checked } = e.target;
        setDeal(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    // ======================== SUBMIT ========================= //
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // who is saving? the token from login tells the backend
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        setSaving(true);
        try {
            // `deal` already uses the DB column names, so it's sent as-is
            const response = await fetch(`${API_URL}/newDeal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ ...deal, fileID: deal.fileID.trim() }),
            });

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                navigate('/login');
                return;
            }

            const data = await response.json();
            if (!response.ok) {
                setError(data.error || 'Could not save deal.');
                setSaving(false);
                return;
            }

            // saved! the transactions page loads this user's deals again
            navigate('/transactions');
        } catch (err) {
            console.error('Error saving deal:', err);
            setError('Could not reach the server. Check that the backend is running.');
            setSaving(false);
        }
    };

    // ======================== NEW DEAL UI ========================= //
    return (
        <div className="tc-dark nd-page">
            <TopNav />

            <main id="main">
                <div className="page-head">
                    <div>
                        <h1>Add Transaction</h1>
                        <p>Only the fields you fill in are saved. Everything can be left blank.</p>
                    </div>
                </div>

                <form id="dealForm" onSubmit={handleSubmit}>
                    {/* one <fieldset> per section, one <Field> per field */}
                    {SECTIONS.map(section => (
                        <fieldset key={section.title}>
                            <legend>{section.title}</legend>
                            <div className="field-grid">
                                {section.fields.map(field => (
                                    <Field key={field.name} field={field} value={deal[field.name]} onChange={handleChange} />
                                ))}
                            </div>
                        </fieldset>
                    ))}

                    <fieldset>
                        <legend>Milestones</legend>
                        <div className="milestone-grid">
                            {/* the whole box is a <label>, so clicking anywhere on it toggles the checkbox */}
                            {MILESTONES.map(m => (
                                <label key={m.name} className="milestone-item" htmlFor={m.name}>
                                    <input type="checkbox" id={m.name} name={m.name} checked={deal[m.name]} onChange={handleChange} />
                                    <span>{m.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    {error && (
                        <div className="error-banner" role="alert">
                            <span><strong>Couldn’t save this deal.</strong> {error}</span>
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving…' : 'Save Deal'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => navigate('/transactions')}>
                            Cancel
                        </button>
                    </div>
                </form>
            </main>

            <Assistant />
        </div>
    );
}

export default NewDeal;
