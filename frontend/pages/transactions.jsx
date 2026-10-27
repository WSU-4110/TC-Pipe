import {useState} from 'react';
import "./style.css";
import "./app.js";

function transactions() {
    // use states
    const [searchTerm, setSearchTerm] = useState('');
    const [stageFilter, setStageFilter] = useState('');
    const [riskFilter, setRiskFilter] = useState('');

    // render transactions table
    renderTransactions(searchTerm, stageFilter, riskFilter);

    function changeSearchTerm(event) {
        setSearchTerm(event.target.value);
        renderTransactions(event.target.value, stageFilter, riskFilter);
    }

    function changeRiskFilter(event) {
        setRiskFilter(event.target.value);
        renderTransactions(searchTerm, stageFilter, event.target.value);
    }

    // Change the filter by stages
    function changeStageFilter(event) {
        setStageFilter(event.target.value);
        renderTransactions(searchTerm, event.target.value, riskFilter);
    }

    // transactions UI
    return (
        <>
            <div id="app">
                <div id="sidebar">
                    <a href="index.html" id="brand">TC Pipeline</a>
                    <a href="index.html">Dashboard</a>
                    <a href="add.html">New Deal</a>
                    <a href="transactions.html">Transactions</a>
                    <a href="analyzer.html">Analyzer</a>
                    <a href="settings.html">Settings</a>


                </div>

                <div id="main">
                    <h1>Transactions</h1>
                    <div id="filters">
                        <input type="text" id="search" placeholder="Search by File ID or Address: " onChange={changeSearchTerm}/>
                        <select id="stageFilter" onChange={changeStageFilter}>
                            <option value="" selected>All Stages</option>
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
                            <option value="" selected>All Risk</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>

                    <div id="table">
                        <h2>All Transactions</h2>
                        <table>
                            <tr>
                                <th>File ID</th>
                                <th>Address</th>
                                <th>Stage</th>
                                <th>Closing Date</th>
                                <th>Days to Close</th>
                                <th>Risk</th>
                                <th>Actions</th>
                            </tr>
                            <tbody id="transactionTableBody">
                            {/* populated after a transaction is submitted */}
                            </tbody>
                        </table>
                    </div>

                    <div id="emailComposer" style={{display:"none"}}>
                        <h2>Email Composer</h2>
                        <div className="field">
                            <label htmlFor="templateSelect">Select Template</label>
                            <select id="templateSelect" onChange={loadTemplate}>
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
                        <button onClick={copyEmail}>Copy to Clipboard</button>
                        <button onClick={openInGmail}>Open in Gmail</button>
                        <button onClick={openInOutlook}>Open in Outlook</button>
                        <button onClick={closeComposer}>Close</button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default transactions;