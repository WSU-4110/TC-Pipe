import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import "./styleSheets/theme.css"
import "./styleSheets/loginStyle.css"
import logoSrc from '../src/assets/logo.png'

function Login() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [messageClass, setMessageClass] = useState('');
    const [loading, setLoading] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    async function onLoginSubmit(event) {
        event.preventDefault(); // Prevent the default form submission behavior
        setMessage('');
        setLoading(true);

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
                setTimeout(() => navigate('/dashboard'), 800);
                return; // keep the button disabled while we redirect
            }
            setMessage(data.error || "Invalid username or password.");
            setMessageClass("error");
        } catch {
            setMessage("Could not reach the server.");
            setMessageClass("error");
        }
        setLoading(false);
    }

    return (
        <div className="tc-dark auth-page">
            <title>TC Pipeline | Log In</title>
            <div className="auth-card">
                <div className="auth-brand"><img src={logoSrc} alt="TC-Pipe" className="auth-logo" /></div>
                <h1>Welcome back</h1>
                <p className="auth-sub">Sign in to see your pipeline.</p>

                <form id="loginForm" onSubmit={onLoginSubmit}>
                    <div className="input-group">
                        <label htmlFor="username" className="required">Username</label>
                        <input
                            type="text"
                            id="username"
                            autoComplete="username"
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
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                {message && <div className={'auth-message ' + messageClass} role="status">{message}</div>}

                <p className="auth-switch">
                    Don&rsquo;t have an account? <Link to="/register">Register here</Link>
                </p>
            </div>
        </div>
    );
}

export default Login
