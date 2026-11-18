import { NavLink, useNavigate } from 'react-router-dom';
import { loadData } from '../scripts/app.js';

// =====================================================================
// TOP NAV: shared by every page that uses the dark theme (.tc-dark).
// Write it once here and use <TopNav /> on each page instead of copying
// the nav markup into every file.
// =====================================================================
function TopNav() {
    const navigate = useNavigate();

    // initials for the avatar (name comes from Settings, saved in localStorage for now)
    const fullName = String((loadData('tcSettings') || {}).fullName || '').trim();
    const initials = fullName
        ? fullName.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
        : '?';

    const logout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <nav className="top-nav">
            <div className="nav-brand" onClick={() => navigate('/dashboard')}>TC<span>Pipeline</span></div>
            {/* NavLink adds class="active" automatically on the current page */}
            <div className="nav-links">
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/newDeal">New Deal</NavLink>
                <NavLink to="/transactions">Transactions</NavLink>
                <NavLink to="/settings">Settings</NavLink>
                <a onClick={logout}>Log Out</a>
            </div>
            <div className="nav-right">
                <div className="nav-avatar" title={fullName || 'Set your name in Settings'}>{initials}</div>
            </div>
        </nav>
    );
}

export default TopNav;
