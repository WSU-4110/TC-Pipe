import { useState } from 'react'   
import "./loginStyle.css"

function login(){
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    function onLoginSubmit(event) {
    const MOCK_USERNAME = "admin";
    const MOCK_PASSWORD = "admin";

    document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');

    if (usernameInput === MOCK_USERNAME && passwordInput === MOCK_PASSWORD) {
        messageDiv.textContent = "Login successful! Welcome back.";
        messageDiv.className = "success";
    window.location.href = 'index.html';
        } else {
        messageDiv.textContent = "Invalid username or password.";
        messageDiv.className = "error";
        }
    });
}

    return(
        <>
        <head>
            <meta charset="UTF-8"></meta>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"></meta>
            <title>Login Demo</title>

        </head>

        {/* Body of the HTML document */}
        <body>
            <div class="login-container">
            <h2>Login Demo</h2>
            <form id="loginForm">
                <div class="input-group">
                    <label for="username">Username</label>
                    <input 
                        type="text" 
                        id="username" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div class="input-group">
                    <label for="password">Password</label>
                    <input 
                        type="password" 
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required

                    />
                </div>
                <button type="submit" onClick={onLoginSubmit}>Sign In</button>
            </form>
            <div id="message"></div>
            </div>
        </body>
    </>
    )
}

export default login