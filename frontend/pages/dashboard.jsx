import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./style.css";
import "./app.js";

function Dashboard() {
    // navigation hook
    const navigate = useNavigate();

    // useStates
    const [greeting, setGreeting] = useState('');
    const [stats, setStats] = useState({
        closing: 0,
        overdue: 0,
        risk: 0,
    });

    // load greetings message
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

    // dashboard UI
    return (
        <>
            <div id="app">
                <div id="sidebar">
                    <a onClick={() => navigate('/dashboard')} id="brand">TC Pipeline</a>
                    <a href="/dashboard" onClick={() => navigate('/dashboard')}>Dashboard</a>
                    <a href="/newDeal" onClick={() => navigate('/newDeal')}>New Deal</a>
                    <a href="/transactions" onClick={() => navigate('/transactions')}>Transactions</a>
                    <a href="/settings" onClick={() => navigate('/settings')}>Settings</a>
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
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center' }}>Loading deals...</td>
                                </tr>

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