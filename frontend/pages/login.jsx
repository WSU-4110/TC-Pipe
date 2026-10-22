import { useState } from 'react'   
import "./loginStyle.css"

function login(event){
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [messageClass, setMessageClass] = useState('');

    function onLoginSubmit(event) {
        event.preventDefault(); // Prevent the default form submission behavior

        const usernameInput = document.getElementById('username').value;
        const passwordInput = document.getElementById('password').value;
        const messageDiv = document.getElementById('message');

        if (usernameInput === "admin" && passwordInput === "admin") {
            setMessage("Login successful! Welcome back.");
            setMessageClass("success");
            setTimeout(() => {
                window.location.href = '/pages/index.html';
            }, 1000); // Redirect after 1 second
        } else {
            setMessage("Invalid username or password.");
            setMessageClass("error");
        }
    }

    // return(
    //     <>
    //         <head>
    //             <meta charset="UTF-8"></meta>
    //             <meta name="viewport" content="width=device-width, initial-scale=1.0"></meta>
    //             <title>Login Demo</title>

    //         </head>

    //         {/* Body of the HTML document */}
    //         <body>
                return(
                    <>
                <div class="login-container">
                <h2>Login Demo</h2>
                <form id="loginForm" onSubmit={onLoginSubmit}>
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
                    <button type="submit">Sign In</button>
                </form>
                <div id="message"></div>
                </div>
                </>
                );
            {/* </body>
        </>
    ) */}
}

export default login