import { useState } from 'react'   
import { useNavigate } from 'react-router-dom'
import "./styleSheets/loginStyle.css"

function Registration(event){
    // navigation hook
    const navigate = useNavigate();

    // state variables for form inputs
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [firstname, setFirstname] = useState('');
    const [lastname, setLastname] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [linkedIn, setLinkedin] = useState('');
    const [brokerageORcompany, setBrokerageORcompany] = useState('');
    const [titleORrole, setTitleORrole] = useState('');
    const [message, setMessage] = useState('');

    // handle form submission
    const handleSubmit = async (event) => {
        event.preventDefault(); // Prevent the default form submission behavior
    }

    //

}
export default Registration;
