import { useState } from 'react'   
import { Link, useNavigate } from 'react-router-dom'
import "./styleSheets/loginStyle.css"

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

    // ======================== HANDLE SUBMISSION FORM ========================= //
    // TODO: make sure to fetch from correct local host port for backend server
   const handleSubmit = async (event) => {
        event.preventDefault();
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
                navigate('/dashboard');
            } else {
                setMessage(data.error || 'Registration failed.');
            }
        } catch (error) {
            console.error('Error during registration:', error);
            setMessage('Could not reach the server. Is the backend running?');
        }
    };

    // ======================== REGISTRATION UI ========================= //
    return (
        <>
            <div className="login-page">
                <div className="login-container">
                    <h2>Create Account</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label className="required">Username</label>
                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label className="required">Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label className="required">First Name</label>
                            <input type="text" value={firstname} onChange={(e) => setFirstname(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label className="required">Last Name</label>
                            <input type="text" value={lastname} onChange={(e) => setLastname(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label className="required">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label>Phone Number</label>
                            <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label>Linkedin</label>
                            <input type="text" value={linkedIn} onChange={(e) => setLinkedin(e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label>Brokerage or Company</label>
                            <input type="text" value={brokerageORcompany} onChange={(e) => setBrokerageORcompany(e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label>Title or Role</label>
                            <input type="text" value={titleORrole} onChange={(e) => setTitleORrole(e.target.value)} />
                        </div>
                        <button type="submit">Register</button>
                    </form>
                    <div className="message">{message}</div>
                    <div style={{marginTop: '10px'}}>
                        <Link to="/login">Already have an account? Login here</Link>
                    </div>
                </div>
            </div>
        </>
    )

}
export default Registration;
