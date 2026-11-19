import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import "./styleSheets/theme.css"
import "./styleSheets/loginStyle.css"
import logoSrc from '../src/assets/logo.png'

function Registration(){
    // ======================== ATTRIBUTES ========================= //
    // navigation hook
    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    // state variables for form inputs
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [firstname, setFirstname] = useState('');
    const [lastname, setLastname] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [linkedIn, setLinkedin] = useState('');
    const [brokerageORcompany, setBrokerageORcompany] = useState('');
    const [titleORrole, setTitleORrole] = useState('');
    const [message, setMessage] = useState('');
    const [messageClass, setMessageClass] = useState('');
    const [loading, setLoading] = useState(false);

    // ======================== HANDLE SUBMISSION FORM ========================= //
    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, email, firstname, lastname,
                                    phoneNumber, linkedIn, brokerageORcompany, titleORrole })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                setMessage('Registration successful! Redirecting...');
                setMessageClass('success');
                navigate('/dashboard');
                return;
            }
            setMessage(data.error || 'Registration failed.');
            setMessageClass('error');
        } catch (error) {
            console.error('Error during registration:', error);
            setMessage('Could not reach the server. Is the backend running?');
            setMessageClass('error');
        }
        setLoading(false);
    };

    // ======================== REGISTRATION UI ========================= //
    return (
        <div className="tc-dark auth-page">
            <title>TC Pipeline | Create Account</title>
            <div className="auth-card wide">
                <div className="auth-brand"><img src={logoSrc} alt="TC-Pipe" className="auth-logo" /></div>
                <h1>Create your account</h1>
                <p className="auth-sub">Track every deal from contract to close.</p>

                <form onSubmit={handleSubmit}>
                    <div className="auth-grid">
                        <div className="input-group">
                            <label htmlFor="firstname" className="required">First Name</label>
                            <input id="firstname" type="text" autoComplete="given-name"
                                value={firstname} onChange={(e) => setFirstname(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="lastname" className="required">Last Name</label>
                            <input id="lastname" type="text" autoComplete="family-name"
                                value={lastname} onChange={(e) => setLastname(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="regUsername" className="required">Username</label>
                            <input id="regUsername" type="text" autoComplete="username"
                                value={username} onChange={(e) => setUsername(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="email" className="required">Email</label>
                            <input id="email" type="email" autoComplete="email" placeholder="you@example.com"
                                value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="input-group full">
                            <label htmlFor="regPassword" className="required">Password</label>
                            <input id="regPassword" type="password" autoComplete="new-password"
                                value={password} onChange={(e) => setPassword(e.target.value)} required />
                            {/* same rule the backend checks in /register */}
                            <small>At least 8 characters, with an uppercase letter, a lowercase letter, a number and one of @$!%*?&amp;</small>
                        </div>

                        <div className="auth-divider">Optional</div>

                        <div className="input-group">
                            <label htmlFor="phoneNumber">Phone Number</label>
                            <input id="phoneNumber" type="tel" autoComplete="tel" placeholder="+15551234567"
                                value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label htmlFor="linkedIn">LinkedIn</label>
                            <input id="linkedIn" type="text" placeholder="linkedin.com/in/..."
                                value={linkedIn} onChange={(e) => setLinkedin(e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label htmlFor="brokerageORcompany">Brokerage or Company</label>
                            <input id="brokerageORcompany" type="text" autoComplete="organization"
                                value={brokerageORcompany} onChange={(e) => setBrokerageORcompany(e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label htmlFor="titleORrole">Title or Role</label>
                            <input id="titleORrole" type="text" autoComplete="organization-title" placeholder="Transaction Coordinator"
                                value={titleORrole} onChange={(e) => setTitleORrole(e.target.value)} />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                {message && <div className={'auth-message ' + messageClass} role="status">{message}</div>}

                <p className="auth-switch">
                    Already have an account? <Link to="/login">Log in here</Link>
                </p>
            </div>
        </div>
    )
}

export default Registration;
