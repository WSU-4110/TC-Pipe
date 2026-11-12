import {useState, useEffect} from 'react';
import "./style.css";
import "./app.js";

function Settings() {

    // fetch current user information
    // useEffect(() => {
    //     fetch()
    //         .then()
    // }, []);
    
    return (
        <>
        <div id="app">
            <div id="sidebar">
                <a onClick={() => navigate('/dashboard')} id="brand">TC Pipeline</a>
                <a href='/dashboard' onClick={() => navigate('/dashboard')}>Dashboard</a>
                <a href='/newDeal' onClick={() => navigate('/newDeal')}>New Deal</a>
                <a href='/transactions' onClick={() => navigate('/transactions')}>Transactions</a>
                {/* <a href='/analyzer' onClick={() => navigate('/analyzer')}>Analyzer</a> */}
                <a href='/settings' onClick={() => navigate('/settings')}>Settings</a>
            </div>
            <div id="main">
                <h1>Settings</h1>
                <form id="settingsForm">
                    <fieldset>
                        <legend>User Settings</legend>
                        <div className="field-grid">
                            <div className="field">
                                <label htmlFor="fullName">Full Name</label>
                                <input type="text" id="fullName"/>
                            </div>
                            <div className="field">
                                <label htmlFor="email">Email</label>
                                <input type="email" id="email"/>
                            </div>
                            <div className="field">
                                <label htmlFor="phoneNumber">Phone Number</label>
                                <input type="text" id="phoneNumber"/>
                            </div>
                            <div className="field">
                                <label htmlFor="companyOrBrokerage">Company / Brokerage</label>
                                <input type="text" id="companyOrBrokerage"/>
                            </div>
                            <div className="field">
                                <label htmlFor="titleOrRole">Title / Role</label>
                                <input type="text" id="titleOrRole"/>
                            </div>
                            <div className="field">
                                <label htmlFor="linkedInUrl">LinkedIn URL</label>
                                <input type="text" id="linkedInUrl"/>
                            </div>
                        </div>
                    </fieldset>
                    <button type="submit">Save Settings</button>
                </form>
            </div>
        </div>
    </>
    )
}

export default Settings;