import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./styleSheets/style.css";
import "./scripts/app.js";

function Dashboard() {
    // ======================== ATTRIBUTES ========================= //
    // navigation hook
    const navigate = useNavigate();

    // useStates
    const [greeting, setGreeting] = useState('');
    const [stats, setStats] = useState({
        closing: 0,
        overdue: 0,
        risk: 0,
    });
    const [deals, setDeals] = useState(null); // null = still loading
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    // ======================== TOKEN AUTHENTICATION ========================= //
    // 1. read the token saved at login/registration
    // 2. no token -> send the user back to login
    // 3. send the token to the backend in the Authorization header
    // 4. backend says 401/403 (missing/expired/fake) -> delete token, back to login
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const loadDashboard = async () => {
            try {
                const response = await fetch(`${API_URL}/dashboard`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    navigate('/login');
                    return;
                }

                const data = await response.json();
                setDeals(data);
                setStats({
                    closing: data.filter(d => d.daysToClose != null && d.daysToClose <= 7).length,
                    overdue: data.reduce((sum, d) => sum + (d.overDueMilestones || 0), 0),
                    risk: data.filter(d => d.riskLevel === 'High').length,
                });
            } catch (err) {
                console.error('Error loading dashboard:', err);
                setDeals([]);
            }
        };

        loadDashboard();
    }, [navigate, API_URL]);

    const logout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    /// ======================== LOAD GREETINGS MESSAGE ========================= //
    useEffect(() => {
        const greetingsMSG = () => {
            const settings = typeof loadData === 'function' ? loadData('tcSettings') : null;
            const name = settings ? settings.fullName.split(' ')[0] : 'there';
            const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
            const day = days[Date().getDay];
            
            let timeOfDay = 'Good morning';
            if (Date().getHours >= 12 && Date().getHours < 17) timeOfDay = 'Good afternoon';
            else if (Date().getHours >= 17) timeOfDay = 'Good evening';
            
           return `${timeOfDay}, ${name} — here's your pipeline for ${day}.`;

        };
    
        setGreeting(greetingsMSG());
    }, []);

    // ======================== DASHBOARD UI ========================= //
    return (
        <>
            <div id="app">
                <div id="sidebar">
                    <a onClick={() => navigate('/dashboard')} id="brand">TC Pipeline</a>
                    <a href="/dashboard" onClick={() => navigate('/dashboard')}>Dashboard</a>
                    <a href="/newDeal" onClick={() => navigate('/newDeal')}>New Deal</a>
                    <a href="/transactions" onClick={() => navigate('/transactions')}>Transactions</a>
                    <a href="/settings" onClick={() => navigate('/settings')}>Settings</a>
                    <a onClick={logout} style={{ cursor: 'pointer' }}>Log Out</a>
                </div>

                <div id="main">
                    <h1>Dashboard</h1>
                    <p id="greeting">{greeting}</p>

                    <div id="stats">
                        <div className="card">
                            <h2 id="statClosing">{stats.closing}</h2>
                            <p>Closing This Week</p>
                        </div>

                        <div className="card">
                            <h2 id="statOverdue">{stats.overdue}</h2>
                            <p>Overdue Milestones</p>
                        </div>

                        <div className="card">
                            <h2 id="statRisk">{stats.risk}</h2>
                            <p>High Risk Deals</p>
                        </div>

                    </div>

                    <div id="table">
                        <h2>Active Deals</h2>
                        
                        {/* Active Deals table */}
                        <table>
                            <tbody>
                            <tr>
                                <th>File ID</th>
                                <th>Address</th>
                                <th>Stage</th>
                                <th>Closing Date</th>
                                <th>Days to Close</th>
                                <th>Risk</th>
                                <th>Actions</th>
                            </tr>
                            </tbody>
                            <tbody id="dashboardTableBody">
                                {deals === null ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center' }}>Loading deals...</td>
                                    </tr>
                                ) : deals.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center' }}>No active deals yet.</td>
                                    </tr>
                                ) : (
                                    deals.map(deal => (
                                        <tr key={deal.fileID}>
                                            <td>{deal.fileID}</td>
                                            <td>{deal.address}</td>
                                            <td>{deal.stage}</td>
                                            <td>{deal.closingDate ? deal.closingDate.slice(0, 10) : ''}</td>
                                            <td>{deal.daysToClose}</td>
                                            <td>{deal.riskLevel}</td>
                                            <td>{deal.nextAction}</td>
                                        </tr>
                                    ))
                                )}

                            </tbody>
                        </table>

                        {/* Upcoming Deadlines table */}
                        <h2>Upcoming Deadlines</h2>
                        <table>
                            <tbody>
                            <tr>
                                <th>File ID</th>
                                <th>Deadline Type</th>
                                <th>Due Date</th>
                                <th>Days Remaining</th>
                            </tr>
                            </tbody>
                            <tbody id="deadlinesTableBody">
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center' }}>Loading deadlines...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    )

}

export default Dashboard;