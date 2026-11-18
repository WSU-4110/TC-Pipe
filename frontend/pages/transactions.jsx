import {useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import "./styleSheets/style.css";
import * as appScript from "./scripts/app.js";

function transactions() {
    // ======================== ATTRIBUTES ========================= //
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    // navigation hook
    const navigate = useNavigate();
    // use states
    const [searchTerm, setSearchTerm] = useState('');
    const [stageFilter, setStageFilter] = useState('');
    const [riskFilter, setRiskFilter] = useState('');
    const [transactions, setTransactions] = useState([]);

    const [loading, setLoading] = useState(true);

    // ======================== LOAD TRANSACTIONS FROM BACKEND ========================= //
    // useEffect with [] runs ONCE when the page first opens
    useEffect(() => {
        const currentTransactions = async () => {
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
                setTransactions(data); // saving to state makes React re-draw the table
            } catch (error) {
                console.error('Error fetching transactions:', error);
            } finally {
                setLoading(false);
            }
        };
        currentTransactions();
    }, []);

    // ======================== FILTERS ========================= //
    // no extra fetching needed: every time a filter state changes, React re-runs
    // this function and recalculates the visible rows from the data we already have
    const visibleTransactions = transactions.filter(t => {
        const search = searchTerm.toLowerCase();
        const matchesSearch = !search ||
            (t.fileID || '').toLowerCase().includes(search) ||
            (t.address || '').toLowerCase().includes(search);
        const matchesStage = !stageFilter || t.stage === stageFilter;
        const risk = t.riskLevel || appScript.autoRisk(t);
        const matchesRisk = !riskFilter || (risk || '').toLowerCase() === riskFilter;
        return matchesSearch && matchesStage && matchesRisk;
    });

    // ======================== HANDLE FILTER CHANGES ========================= //
    const changeSearchTerm = (event) => setSearchTerm(event.target.value);
    const changeRiskFilter = (event) => setRiskFilter(event.target.value);
    const changeStageFilter = (event) => setStageFilter(event.target.value);

    // ======================== LOGOUT ========================= //
    const logout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    // ======================== TRANSACTIONS UI ========================= //
    return (
        <>
            <div id="app">
                <div id="sidebar">
                    <a href="/dashboard" onClick={(e) => { navigate('/dashboard')}} id="brand">TC Pipeline</a>
                    <a href="/dashboard" onClick={(e) => { navigate('/dashboard')}}>Dashboard</a>
                    <a href="/newDeal" onClick={(e) => { navigate('/newDeal')}}>New Deal</a>
                    <a href="/transactions" onClick={(e) => { navigate('/transactions')}}>Transactions</a>
                    <a href="/settings" onClick={(e) => { navigate('/settings')}}>Settings</a>
                    <a onClick={logout} style={{ cursor: 'pointer' }}>Log Out</a>


                </div>

                <div id="main">
                    <h1>Transactions</h1>
                    <div id="filters">
                        <input type="text" id="search" placeholder="Search by File ID or Address: " onChange={changeSearchTerm}/>
                        <select id="stageFilter" onChange={changeStageFilter}>
                            <option value="" default>All Stages</option>
                            <option value="pre-contract">Pre-Contract</option>
                            <option value="active">Active</option>
                            <option value="inspection">Inspection</option>
                            <option value="appraisal">Appraisal</option>
                            <option value="underwriting">Underwriting</option>
                            <option value="clear-to-close">Clear to Close</option>
                            <option value="closed">Closed</option>
                            <option value="terminated">Terminated</option>
                        </select>

                        <select id="riskFilter" onChange={changeRiskFilter}>
                            <option value="" default>All Risk</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>

                    <div id="table">
                        <h2>All Transactions</h2>
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
                            <tbody id="transactionTableBody">
                            {loading ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Loading transactions...</td></tr>
                            ) : visibleTransactions.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center' }}>No transactions found.</td></tr>
                            ) : (
                                // .map() turns each transaction object into one table row
                                visibleTransactions.map(t => {
                                    const risk = t.riskLevel || appScript.autoRisk(t);
                                    const riskClass = /high/i.test(risk) ? 'risk-high' : /medium/i.test(risk) ? 'risk-medium' : 'risk-low';
                                    return (
                                        <tr key={t.fileID}>
                                            <td>{t.fileID}</td>
                                            <td>{t.address || '—'}</td>
                                            <td>{t.stage || '—'}</td>
                                            <td>{t.closingDate || '—'}</td>
                                            <td>{appScript.daysToClose(t.closingDate)}</td>
                                            <td className={riskClass}>{risk}</td>
                                            <td>
                                                <a href="#" onClick={(e) => { e.preventDefault(); appScript.openComposer(t.fileID); }}>Email</a>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>

                    <div id="emailComposer" style={{display:"none"}}>
                        <h2>Email Composer</h2>
                        <div className="field">
                            <label htmlFor="templateSelect">Select Template</label>
                            <select id="templateSelect" onChange={appScript.loadTemplate}>
                                <option value="">Select a Template</option>
                                <option value="welcome">Welcome & Next Steps</option>
                                <option value="emd">EMD Received</option>
                                <option value="inspection">Inspection Complete</option>
                                <option value="appraisal">Appraisal Received</option>
                                <option value="ctc">Clear to Close</option>
                                <option value="weekly">Weekly Status Update</option>
                                <option value="postclose">Post-Close Thank You</option>
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="subjectLine">Subject Line</label>
                            <input type="text" id="subjectLine" readOnly/>
                        </div>
                        <div className="field">
                            <label htmlFor="emailBody">Email Body</label>
                            <textarea id="emailBody" style={{minHeight: "300px"}}></textarea>
                        </div>
                        <button onClick={appScript.copyEmail}>Copy to Clipboard</button>
                        <button onClick={appScript.openInGmail}>Open in Gmail</button>
                        <button onClick={appScript.openInOutlook}>Open in Outlook</button>
                        <button onClick={appScript.closeComposer}>Close</button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default transactions;