import { useState } from 'react'   
import { Link, useNavigate } from 'react-router-dom'
import "./styleSheets/loginStyle.css"

function Login(event){
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [messageClass, setMessageClass] = useState('');

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    async function onLoginSubmit(event) {
        event.preventDefault(); // Prevent the default form submission behavior

        try {
            // send the username/password to the backend; it checks them against the database
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();

            if (response.ok && data.token) {
                // save the JWT so other pages (dashboard, etc.) can prove who we are
                localStorage.setItem('token', data.token);
                setMessage("Login successful! Welcome back.");
                setMessageClass("success");
                setTimeout(() => navigate('/dashboard'), 1000);
            } else {
                setMessage(data.error || "Invalid username or password.");
                setMessageClass("error");
            }
        } catch (err) {
            setMessage("Could not reach the server.");
            setMessageClass("error");
        }
    }

    return(
        <>
            <title>Login Demo</title>
            <div className="login-container">
                <h2>Login Demo</h2>
                <form id="loginForm" onSubmit={onLoginSubmit}>
                    <div className="input-group">
                        <label htmlFor="username" className="required">Username</label>
                        <input 
                            type="text" 
                            id="username" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password" className="required">Password</label>
                        <input 
                            type="password" 
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required

                        />
                    </div>
                    <button type="submit">Sign In</button>
                </form>
                <div id="message" className={messageClass}>{message}</div>
                <div style={{marginTop: '10px'}}>
                    <Link to="/register">Don't have an account? Register here</Link>
                </div>
            </div>
        </>
    );
}

export default Login