import {useState} from 'react';
import "./style.css";
import "./app.js";

function settings () {

    /* wire the form's submit event to saveSettings() in app.js
       e.preventDefault() inside saveSettings stops the page from reloading on submit */
    document.getElementById('settingsForm').addEventListener('submit', saveSettings);

    /* pre-fills  form fields with whatever was saved in localStorage
       runs immediately on page load so the TC never sees any empty fields after saving once */
    loadSettings();
    
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
                <h1>Settings</h1>
                <form id="settingsForm">
                    <fieldset>
                        <legend>User Settings</legend>
                        <div class="field-grid">
                            <div class="field">
                                <label for="fullName">Full Name</label>
                                <input type="text" id="fullName"/>
                            </div>
                            <div class="field">
                                <label for="email">Email</label>
                                <input type="email" id="email"/>
                            </div>
                            <div class="field">
                                <label for="phoneNumber">Phone Number</label>
                                <input type="text" id="phoneNumber"/>
                            </div>
                            <div class="field">
                                <label for="companyOrBrokerage">Company / Brokerage</label>
                                <input type="text" id="companyOrBrokerage"/>
                            </div>
                            <div class="field">
                                <label for="titleOrRole">Title / Role</label>
                                <input type="text" id="titleOrRole"/>
                            </div>
                            <div class="field">
                                <label for="linkedInUrl">LinkedIn URL</label>
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