import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import "./styleSheets/style.css";
import "./styleSheets/theme.css";
import "./styleSheets/settings.css";
import TopNav from "./components/TopNav.jsx";
import Assistant from "./components/Assistant.jsx";
import { loadData, saveData } from "./scripts/app.js";

// ======================== FIELDS (as data, like newDeal.jsx) ========================= //
// Profile keys match what the rest of the app reads from localStorage 'tcSettings'
// (TopNav initials, dashboard greeting, email signature in app.js).
const PROFILE_FIELDS = [
    { name: 'fullName',           label: 'Full Name',          type: 'text',  placeholder: 'First Last', required: true },
    { name: 'email',              label: 'Email',              type: 'email', placeholder: 'you@example.com', required: true },
    { name: 'phoneNumber',        label: 'Phone',              type: 'tel',   placeholder: '+15550000000' },
    { name: 'companyOrBrokerage', label: 'Company / Brokerage', type: 'text',  placeholder: 'Your brokerage' },
    { name: 'titleOrRole',        label: 'Title / Role',       type: 'text',  placeholder: 'Transaction Coordinator' },
    { name: 'linkedInUrl',        label: 'LinkedIn URL',       type: 'url',   placeholder: 'https://linkedin.com/in/...' },
];

// Deal Defaults keys are the New Deal form's field names, so newDeal.jsx can
// drop them straight into its starting state.
const DEFAULT_FIELDS = [
    { name: 'titleCompanyName',    label: 'Default Title Company',  placeholder: 'ABC Title Co.' },
    { name: 'titleCompanyContact', label: 'Default Title Contact',  placeholder: 'Jane Smith' },
    { name: 'lenderName',          label: 'Default Lender',         placeholder: 'First National Bank' },
    { name: 'lenderContact',       label: 'Default Lender Contact', placeholder: 'John Doe' },
    { name: 'assignedTo',          label: 'Default Assigned To',    placeholder: 'Your name or team member', full: true },
];

const EMPTY_PROFILE = Object.fromEntries(PROFILE_FIELDS.map(f => [f.name, '']));
const EMPTY_DEFAULTS = Object.fromEntries(DEFAULT_FIELDS.map(f => [f.name, '']));
const DEFAULT_PREFS = { emailNotifications: false, deadlineReminderDays: '3' };

const initialsOf = name =>
    name.trim() ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';

// backend row (users table columns) -> form keys
const fromBackend = u => ({
    fullName: [u.firstname, u.lastname].filter(Boolean).join(' '),
    email: u.email || '',
    phoneNumber: u.phoneNumber || '',
    companyOrBrokerage: u.brokerageORcompany || '',
    titleOrRole: u.titleORrole || '',
    linkedInUrl: u.linkedIN || '',
});

// form keys -> backend (users table columns). "Ana Maria Ruiz" -> first "Ana", last "Maria Ruiz"
const toBackend = p => {
    const [firstname, ...rest] = p.fullName.trim().split(/\s+/);
    return {
        firstname,
        lastname: rest.join(' '),
        email: p.email.trim(),
        phoneNumber: p.phoneNumber.trim(),
        brokerageORcompany: p.companyOrBrokerage.trim(),
        titleORrole: p.titleOrRole.trim(),
        linkedIN: p.linkedInUrl.trim(),
    };
};

// ======================== ONE INPUT ========================= //
function FormGroup({ field, value, onChange }) {
    return (
        <div className={'form-group' + (field.full ? ' full' : '')}>
            <label htmlFor={field.name}>{field.label}</label>
            <input
                type={field.type || 'text'}
                id={field.name}
                name={field.name}
                value={value}
                onChange={onChange}
                placeholder={field.placeholder}
                required={field.required}
            />
        </div>
    );
}

// ======================== SETTINGS PAGE ========================= //
function Settings() {
    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    // Start from what's saved in this browser, then replace the profile with the
    // backend's copy once it loads. (A function passed to useState only runs once.)
    const [profile, setProfile] = useState(() => ({ ...EMPTY_PROFILE, ...(loadData('tcSettings') || {}) }));
    const [defaults, setDefaults] = useState(() => ({ ...EMPTY_DEFAULTS, ...(loadData('tcDealDefaults') || {}) }));
    const [prefs, setPrefs] = useState(() => ({ ...DEFAULT_PREFS, ...(loadData('tcPreferences') || {}) }));
    const [username, setUsername] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    // ======================== TOAST MESSAGE ========================= //
    const [toast, setToast] = useState({ message: '', type: 'success', show: false });
    const toastTimer = useRef(null);
    const showToast = (message, type = 'success') => {
        setToast({ message, type, show: true });
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
    };
    // clear the timer if the user leaves the page while a toast is showing
    useEffect(() => () => clearTimeout(toastTimer.current), []);

    // keeps the auth check + headers in one place
    const authHeaders = () => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    };
    const logoutIfRejected = (response) => {
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            navigate('/login');
            return true;
        }
        return false;
    };

    // ======================== LOAD PROFILE FROM BACKEND ========================= //
    useEffect(() => {
        let ignore = false;

        const load = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            try {
                const response = await fetch(`${API_URL}/settings`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    navigate('/login');
                    return;
                }
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Could not load your profile.');
                if (ignore) return;
                const loaded = fromBackend(data);
                setProfile(loaded);
                setUsername(data.username || '');
                saveData('tcSettings', loaded); // keep the browser copy in sync for TopNav / greeting / emails
            } catch (err) {
                console.error('Error loading settings:', err);
                if (!ignore) showToast('Could not load your profile from the server.', 'error');
            }
        };

        load();
        return () => { ignore = true; };
    }, [API_URL, navigate]);

    // ======================== SAVE: PROFILE (backend) ========================= //
    const saveProfile = async (e) => {
        e.preventDefault(); // the browser already checked the required fields + email format
        const headers = authHeaders();
        if (!headers) {
            navigate('/login');
            return;
        }

        setSavingProfile(true);
        try {
            const response = await fetch(`${API_URL}/settings`, {
                method: 'POST',
                headers,
                body: JSON.stringify(toBackend(profile)),
            });
            if (logoutIfRejected(response)) return;
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Save failed.');

            saveData('tcSettings', profile); // TopNav re-renders with the new initials
            showToast('Profile saved.', 'success');
        } catch (err) {
            showToast(err.message === 'Failed to fetch' ? 'Could not reach the server.' : err.message, 'error');
        } finally {
            setSavingProfile(false);
        }
    };

    // ======================== SAVE: DEAL DEFAULTS + PREFERENCES (this browser) ========================= //
    const saveDefaults = (e) => {
        e.preventDefault();
        const trimmed = Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, v.trim()]));
        saveData('tcDealDefaults', trimmed);
        showToast('Deal defaults saved.', 'success');
    };

    // preferences save as soon as they change (no Save button, like Julian's page)
    const changePref = (name, value) => {
        const next = { ...prefs, [name]: value };
        setPrefs(next);
        saveData('tcPreferences', next);
        showToast('Preferences saved.', 'success');
    };

    // one change handler per form: `name` says which key to update
    const onProfileChange = e => setProfile(p => ({ ...p, [e.target.name]: e.target.value }));
    const onDefaultsChange = e => setDefaults(d => ({ ...d, [e.target.name]: e.target.value }));

    // ======================== SETTINGS UI ========================= //
    return (
        <div className="tc-dark st-page">
            <TopNav />

            <div className="page-wrap">
                <div className="page-header">
                    <h1>Settings</h1>
                    <p>Manage your profile, preferences, and deal defaults.</p>
                </div>

                {/* ---------- PROFILE ---------- */}
                <form className="settings-card" onSubmit={saveProfile}>
                    <div className="settings-card-header">
                        <h2>Profile</h2>
                        <p>Your name and contact info, used in the nav, the dashboard greeting and your email signature.</p>
                    </div>

                    <div className="profile-photo-row">
                        <div className="photo-circle" aria-hidden="true">{initialsOf(profile.fullName)}</div>
                        <div className="photo-actions">
                            <strong>{profile.fullName || 'Your name'}</strong>
                            <p>{username ? '@' + username : 'Signed in'}</p>
                        </div>
                    </div>

                    <div className="form-grid">
                        {PROFILE_FIELDS.map(f => (
                            <FormGroup key={f.name} field={f} value={profile[f.name]} onChange={onProfileChange} />
                        ))}
                    </div>

                    <div className="save-row">
                        <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                            {savingProfile ? <><span className="spin"></span> Saving…</> : 'Save Profile'}
                        </button>
                    </div>
                </form>

                {/* ---------- DEAL DEFAULTS ---------- */}
                <form className="settings-card" onSubmit={saveDefaults}>
                    <div className="settings-card-header">
                        <h2>Deal Defaults</h2>
                        <p>Pre-fill these fields whenever you create a new deal.</p>
                    </div>

                    <div className="form-grid">
                        {DEFAULT_FIELDS.map(f => (
                            <FormGroup key={f.name} field={f} value={defaults[f.name]} onChange={onDefaultsChange} />
                        ))}
                    </div>

                    <div className="save-row">
                        <span className="note">Saved in this browser.</span>
                        <button type="submit" className="btn btn-primary">Save Defaults</button>
                    </div>
                </form>

                {/* ---------- PREFERENCES ---------- */}
                <div className="settings-card">
                    <div className="settings-card-header">
                        <h2>Preferences</h2>
                        <p>Notifications and app behavior. Saved in this browser.</p>
                    </div>

                    <div className="toggle-row">
                        <div>
                            <div className="toggle-label" id="emailNotificationsLabel">Email Notifications</div>
                            <div className="toggle-desc">Receive deal updates and reminders by email.</div>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                aria-labelledby="emailNotificationsLabel"
                                checked={prefs.emailNotifications}
                                onChange={e => changePref('emailNotifications', e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    <div className="toggle-row">
                        <div>
                            <div className="toggle-label" id="reminderLabel">Deadline Reminder</div>
                            <div className="toggle-desc">Days before a deadline to send a reminder.</div>
                        </div>
                        <select
                            aria-labelledby="reminderLabel"
                            value={prefs.deadlineReminderDays}
                            onChange={e => changePref('deadlineReminderDays', e.target.value)}
                        >
                            {['1', '2', '3', '5', '7'].map(d => <option key={d} value={d}>{d} day{d === '1' ? '' : 's'}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div id="toast" className={(toast.show ? 'show ' : '') + toast.type} role="status" aria-live="polite">
                {toast.message}
            </div>

            <Assistant />
        </div>
    );
}

export default Settings;
