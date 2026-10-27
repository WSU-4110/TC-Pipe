import {useState} from 'react';
import "./style.css";
import "./app.js";


function newDeal() {

    const [formData, setFormData] = useState({
        fileID: '',
        addrerss: '',
        clientName: '',
        stage: 'Lead',
        closingDate: '',
        riskLevel: 'Low'
    });

    // when field or input changes update the corresponding value in formData state
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    }

    const handleSubmit = (e) => {
        e.preventDefault();

        console.log("sending data to SQL database: ", formData);

        // enter the fetch and post request to the backend here to send the formData to the SQL database
    }


    // function newDealHandler() {
    //     const params = new URLSearchParams(window.location.search);
    //     const editFileID = params.get('fileID');

    //     if (editFileID) {
    //         document.querySelector('h1').innerHTML = 'Edit Transaction';
    //         document.querySelector('button[type="submit"]').innerHTML = 'Update Deal';
    //         loadTransactionForEdit(editFileID);
    //     }

    //     document.getElementById('dealForm').addEventListener('submit', async function(e) {
    //         e.preventDefault();

    //         const transaction = {
    //             fileID: document.getElementById('fileID').value.trim(),
    //             side: document.getElementById('side').value,
    //             propertyType: document.getElementById('propertyType').value,
    //             transactionType: document.getElementById('transactionType').value,
    //             stage: document.getElementById('stage').value,
    //             mlsNumber: document.getElementById('mlsNumber').value.trim(),
    //             buyerName: document.getElementById('buyerName').value.trim(),
    //             sellerName: document.getElementById('sellerName').value.trim(),
    //             listingAgent: document.getElementById('listingAgent').value.trim(),
    //             assignedTo: document.getElementById('assignee').value.trim(),
    //             propertyAddress: document.getElementById('propertyAddress').value.trim(),
    //             closingLocation: document.getElementById('closingLocation').value.trim(),
    //             contractDate: document.getElementById('contractDate').value,
    //             closingDate: document.getElementById('closingDate').value,
    //             closingTime: document.getElementById('closingTime').value,
    //             emdDueDate: document.getElementById('emdDueDate').value,
    //             inspectionDeadline: document.getElementById('inspectionDeadline').value,
    //             appraisalDeadline: document.getElementById('appraisalDeadline').value,
    //             financingContingencyDeadline: document.getElementById('financingContingencyDeadline').value,
    //             purchasePrice: document.getElementById('purchasePrice').value,
    //             listingPrice: document.getElementById('listingPrice').value,
    //             emdAmount: document.getElementById('emdAmount').value,
    //             titleCompanyName: document.getElementById('titleCompanyName').value.trim(),
    //             titleCompanyContact: document.getElementById('titleCompanyContact').value.trim(),
    //             lenderName: document.getElementById('lenderName').value.trim(),
    //             lenderContact: document.getElementById('lenderContact').value.trim(),
    //             riskLevel: document.getElementById('riskLevel').value,
    //             nextAction: document.getElementById('nextAction').value.trim(),
    //             nextActionDue: document.getElementById('nextActionDue').value,
    //             blocker: document.getElementById('blocker').value.trim(),
    //             notes: document.getElementById('notes').value.trim(),
    //             earnestMoneyReceived: document.getElementById('earnestMoneyReceived').checked,
    //             inspectionComplete: document.getElementById('inspectionComplete').checked,
    //             appraisalReceived: document.getElementById('appraisalReceived').checked,
    //             titleClear: document.getElementById('titleClear').checked,
    //             insuranceConfirmed: document.getElementById('insuranceConfirmed').checked,
    //             clearToCloseConfirmed: document.getElementById('clearToCloseConfirmed').checked,
    //         };

    //         if (!transaction.fileID) {
    //             alert('File ID is required.');
    //             return;
    //         }

    //         if (editFileID) {
    //             await apiPut(transaction);
    //             alert('Deal updated successfully!');
    //         } else {
    //             await apiPost(transaction);
    //             alert('Deal saved successfully!');
    //         }

    //         window.location.href = '/transactions';
    //     });
    // }

    return (
        <>
            <div id="app">
                <div id="sidebar">
                    <a href="/" id="brand">TC Pipeline</a>
                    <a href="/dashboard">Dashboard</a>
                    <a href="/newDeal">New Deal</a>
                    <a href="/transactions">Transactions</a>
                    <a href="/analyzer">Analyzer</a>
                    <a href="/settings">Settings</a>
                </div>
                <div id="main">
                    <h1>Add Transaction</h1>
                    <form onSubmit={handleSubmit} className="deal-form">
                        <fieldset>
                            <legend>Basic Info</legend>
                            <div className="field-grid">
                                <div className="field">
                                    <label for="fileID">File ID</label>
                                    <input 
                                        type="text" 
                                        id="fileID"
                                        value={formData.fileID}
                                        onChange={handleChange}
                                        placeholder="Enter File ID"
                                    />
                                </div>
                                <div className="field">
                                    <label for="side">Side</label>
                                    <select id="side">
                                        <option value="" selected>Select Side</option>
                                        <option value="buyer">Buyer</option>
                                        <option value="seller">Seller</option>
                                        <option value="dual">Dual Agency</option>
                                    </select>
                                </div>
                                <div className="field">
                                    <label for="propertyType">Property Type</label>
                                    <select id="propertyType">
                                        <option value="" selected>Select Property Type</option>
                                        <option value="singleFamily">Single Family</option>
                                        <option value="condoOrTownhouse">Condo/Townhouse</option>
                                        <option value="multiFamily">Multi-Family</option>
                                        <option value="commercial">Commercial</option>
                                        <option value="landOrLot">Land/Lot</option>
                                    </select>
                                </div>
                                <div className="field">
                                    <label for="transactionType">Transaction Type</label>
                                    <select id="transactionType">
                                        <option value="" selected>Select Type</option>
                                        <option value="standardSale">Standard Sale</option>
                                        <option value="shortSale">Short Sale</option>
                                        <option value="reoOrBankOwned">REO/Bank Owned</option>
                                        <option value="newConstruction">New Construction</option>
                                    </select>
                                </div>
                                <div className="field">
                                    <label for="stage">Stage</label>
                                    <select id="stage">
                                        <option value="" selected>Select Stage</option>
                                        <option value="pre-contract">Pre-Contract</option>
                                        <option value="active">Active</option>
                                        <option value="inspection">Inspection</option>
                                        <option value="appraisal">Appraisal</option>
                                        <option value="underwriting">Underwriting</option>
                                        <option value="clear-to-close">Clear to Close</option>
                                        <option value="closed">Closed</option>
                                        <option value="terminated">Terminated</option>
                                    </select>
                                </div>
                                <div className="field">
                                    <label for="mlsNumber">MLS Number</label>
                                    <input 
                                        type="text"
                                        id="mlsNumber"
                                    />
                                </div>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>Parties</legend>
                            <div className="field-grid">
                                <div className="field">
                                    <label for="buyerName">Buyer Name</label>
                                    <input 
                                        type="text" 
                                        id="buyerName"
                                    />
                                </div>
                                <div className="field">
                                    <label for="sellerName">Seller Name</label>
                                    <input 
                                        type="text" 
                                        id="sellerName"
                                    />
                                </div>
                                <div className="field">
                                    <label for="listingAgent">Listing Agent</label>
                                    <input 
                                        type="text" 
                                        id="listingAgent"
                                    />
                                </div>
                                <div className="field">
                                    <label for="assignee">Assigned To</label>
                                    <input 
                                        type="text" 
                                        id="assignee"
                                    />
                                </div>
                            </div>
                        </fieldset>

                        {/* <!-- DATES & DEADLINES --> */}
                        <fieldset>
                            <legend>Dates & Deadlines</legend>
                            <div className="field-grid">
                                <div className="field">
                                    <label for="contractDate">Contract Date</label>
                                    <input 
                                        type="date" 
                                        id="contractDate"
                                    />
                                </div>
                                <div className="field">
                                    <label for="closingDate">Closing Date</label>
                                    <input 
                                        type="date" 
                                        id="closingDate"
                                    />
                                </div>
                                <div className="field">
                                    <label for="closingTime">Closing Time</label>
                                    <input 
                                        type="time" 
                                        id="closingTime"
                                    />
                                </div>
                                <div className="field">
                                    <label for="emdDueDate">EMD Due Date</label>
                                    <input 
                                        type="date" 
                                        id="emdDueDate"
                                    />
                                </div>
                                <div className="field">
                                    <label for="inspectionDeadline">Inspection Deadline</label>
                                    <input 
                                        type="date" 
                                        id="inspectionDeadline"
                                    />
                                </div>
                                <div className="field">
                                    <label for="appraisalDeadline">Appraisal Deadline</label>
                                    <input 
                                        type="date" 
                                        id="appraisalDeadline"
                                    />
                                </div>
                                <div className="field">
                                    <label for="financingContingencyDeadline">Financing Contingency Deadline</label>
                                    <input 
                                        type="date" 
                                        id="financingContingencyDeadline"
                                    />
                                </div>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>Location</legend>
                            <div className="field-grid">
                                <div className="field">
                                    <label for="propertyAddress">Property Address</label>
                                    <input 
                                        type="text" 
                                        id="propertyAddress"
                                    />
                                </div>
                                <div className="field">
                                    <label for="closingLocation">Closing Location</label>
                                    <input 
                                        type="text" 
                                        id="closingLocation"
                                    />
                                </div>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>Financials</legend>
                            <div className="field-grid">
                                <div className="field">
                                    <label for="purchasePrice">Purchase Price ($)</label>
                                    <input 
                                        type="number" 
                                        id="purchasePrice"
                                    />
                                </div>
                                <div className="field">
                                    <label for="listingPrice">Listing Price ($)</label>
                                    <input 
                                        type="number" 
                                        id="listingPrice"
                                    />
                                </div>
                                <div className="field">
                                    <label for="emdAmount">EMD Amount ($)</label>
                                    <input 
                                        type="number" 
                                        id="emdAmount"
                                    />
                                </div>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>Title & Lender</legend>
                            <div className="field-grid">
                                <div className="field">
                                    <label for="titleCompanyName">Title Company Name</label>
                                    <input 
                                        type="text" 
                                        id="titleCompanyName"
                                    />
                                </div>
                                <div className="field">
                                    <label for="titleCompanyContact">Title Company Contact</label>
                                    <input 
                                        type="text" 
                                        id="titleCompanyContact"
                                    />
                                </div>
                                <div className="field">
                                    <label for="lenderName">Lender Name</label>
                                    <input 
                                        type="text" 
                                        id="lenderName"
                                    />
                                </div>
                                <div className="field">
                                    <label for="lenderContact">Lender Contact</label>
                                    <input 
                                        type="text" 
                                        id="lenderContact"
                                    />
                                </div>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>Risk & Notes</legend>
                            <div className="field-grid">
                                <div className="field">
                                    <label for="riskLevel">Risk Level</label>
                                    <select id="riskLevel">
                                        <option value="" selected>Select Risk Level</option>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div className="field">
                                    <label for="nextAction">Next Action</label>
                                    <input 
                                        type="text" 
                                        id="nextAction"
                                    />
                                </div>
                                <div className="field">
                                    <label for="nextActionDue">Next Action Due Date</label>
                                    <input 
                                        type="date" 
                                        id="nextActionDue"
                                    />
                                </div>
                                <div className="field">
                                    <label for="blocker">Blocker</label>
                                    <input 
                                        type="text" 
                                        id="blocker"
                                    />
                                </div>
                                <div className="field" style="grid-column: span 2;">
                                    <label for="notes">Notes</label>
                                    <textarea id="notes"></textarea>
                                </div>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>Milestones</legend>
                            <div className="milestone-grid">
                                <div className="milestone-item">
                                    <input 
                                        type="checkbox" 
                                        id="earnestMoneyReceived"
                                    />
                                    <label for="earnestMoneyReceived">Earnest Money Received</label>
                                </div>
                                <div className="milestone-item">
                                    <input 
                                        type="checkbox" 
                                        id="inspectionComplete"
                                    />
                                    <label for="inspectionComplete">Inspection Complete</label>
                                </div>
                                <div className="milestone-item">
                                    <input 
                                        type="checkbox" 
                                        id="appraisalReceived"
                                    />
                                    <label for="appraisalReceived">Appraisal Received</label>
                                </div>
                                <div className="milestone-item">
                                    <input 
                                        type="checkbox" 
                                        id="titleClear"
                                    />
                                    <label for="titleClear">Title Clear</label>
                                </div>
                                <div className="milestone-item">
                                    <input 
                                        type="checkbox" 
                                        id="insuranceConfirmed"
                                    />
                                    <label for="insuranceConfirmed">Insurance Confirmed</label>
                                </div>
                                <div className="milestone-item">
                                    <input 
                                        type="checkbox" 
                                        id="clearToCloseConfirmed"
                                    />
                                    <label for="clearToCloseConfirmed">Clear to Close Confirmed</label>
                                </div>
                            </div>
                        </fieldset>

                        <button type="submit">Save Deal</button>

                    </form>
                </div>
            </div>
        </>
    )
}