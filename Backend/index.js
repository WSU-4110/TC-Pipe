
const path = require('path');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { nanoid, customAlphabet } = require('nanoid');

dotenv.config({path: path.join(__dirname, 'server.env')});

app = express();
app.use(cors());
app.use(express.json());

// file attributes
const generateFileIDKey = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);
const API_PORT = process.env.DB_PORT;
const PORT = process.env.PORT;
const HOST = process.env.DB_HOST;
const USER = process.env.DB_USER;
const PASSWORD = process.env.DB_PASSWORD;
const DATABASE = process.env.DB_DATABASE;

// ===== CONFIGURATION ===== ///
const db = mysql.createPool({
    host: HOST,
    port: API_PORT,
    user: USER,
    password: PASSWORD,
    database: DATABASE
});

const createDatabaseIfNotExists = () => {
    db.query(`CREATE TABLE IF NOT EXISTS users (
        privateID INT AUTO_INCREMENT PRIMARY KEY,
        publicID VARCHAR(255) NOT NULL UNIQUE DEFAULT '${nanoid()}',
        email VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        linkedIN VARCHAR(255) UNIQUE default '',
        phoneNumber VARCHAR(255) UNIQUE default '',
        brokerageORcompany VARCHAR(255) default '',
        titleORrole VARCHAR(255) default ''
        )`, (err) => {(err) ? console.error('Error creating users table:', err) : console.log('Users table created or already exists.')}
    );

    db.query(`CREATE TABLE IF NOT EXISTS transactions (
        userID INT NOT NULL PRIMARY KEY,
        fileID VARCHAR(50) NOT NULL UNIQUE,
        
        closingsThisWeek INT,
        daysToClose INT,
        deadLineType VARCHAR(255),
        dueDate DATE,
        overDueMilestones INT,

        side VARCHAR(255),
        propertyType VARCHAR(255),
        transactionType VARCHAR(255),
        stage VARCHAR(255),
        MLSNumber BIGINT,

        buyerName VARCHAR(255),
        sellerName VARCHAR(255),
        listingAgent VARCHAR(255),
        AssignedTo VARCHAR(255),

        contractDate DATE,
        closingDate DATE,
        closingTime TIME,
        EMDdueDate DATE,
        inspectionDeadline DATE,
        appraisalDeadline DATE,
        financingContingencyDeadline DATE,

        address VARCHAR(255),
        closingLocation VARCHAR(255),

        purchasePrice DECIMAL(12,2),
        listingPrice DECIMAL(12,2),
        EMDamount DECIMAL(12,2),

        titleCompanyName VARCHAR(255),
        titleCompanyContact VARCHAR(255),
        lenderName VARCHAR(255),
        lenderContact VARCHAR(255),

        riskLevel VARCHAR(255),
        nextAction VARCHAR(255),
        nextActionDue DATE,
        blocker VARCHAR(255),
        notes TEXT,

        earnestMoneyReceived TINYINT(1) NOT NULL DEFAULT 0,
        inspectionComplete TINYINT(1) NOT NULL DEFAULT 0,
        appraisalReceived TINYINT(1) NOT NULL DEFAULT 0,
        titleClear TINYINT(1) NOT NULL DEFAULT 0,
        insuranceConfirmed TINYINT(1) NOT NULL DEFAULT 0,
        clearToCloseConfirmed TINYINT(1) NOT NULL DEFAULT 0,
        FOREIGN KEY (userID) REFERENCES users(privateID) ON DELETE CASCADE
        )`, (err) => {(err) ? console.error('Error creating transactions table:', err) : console.log('Transactions table created or already exists.')}
    );
};
createDatabaseIfNotExists();

// ===== USER REGISTRATION / USER LOGIN ===== ///
// registration
app.post('/register', (req, res) => {
    const { username, password, email } = req.body;


    // Check if the username already exists
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('Error checking username:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (results.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        // Insert the new user
        db.query('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [username, password, email], (err, results) => {
            if (err) {
                console.error('Error creating user:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.status(201).json({ message: 'User created successfully' });
        });
    });
});

// login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    //
    db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, result) => {
        if (err){
            console.error('Error logging in: ', err);
            return res.status(500).json({ error: 'Internal server error'});
        }
        if (result.length > 0){ // successfully logged in
            
            // create JWT token for user
            const user = result[0];
            const token = jwt.sign({ userID: user.privateID }, process.env.JWT_SECRET, { expiresIn: '24h' });
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    })
})

// token and authentication
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ===== USER TRANSACTION PAGE ===== ///
app.post('/transactions', authenticateToken, (req, res) => {
    const userJWT = req.user.userID;
    const { userID, fileID, address, stage, closingDate, daysToClose, riskLevel, action } = req.body;

    // grab user transactions
    db.query('SELECT * FROM transactions WHERE userID = ?', [userJWT], (err, results) => {
        if (err) {
            console.error('Error fetching transactions:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(results);
    });
});

//TODO: Transaction Creation 


// ===== DASHBOARD PAGE ===== ///
app.post('/dashboard', authenticateToken, (req, res) => {
    const userJWT = req.user.userID;
    const { userID, fileID, address, stage, closingDate, closingsThisWeek, daysToClose, deadlineType, dueDate, overDueMilestones, riskLevel, action } = req.body;

    db.query('SELECT * FROM transactions WHERE userID = ?', [userJWT], (err, results) => {
        if (err) {
            console.error('Error fetching dashboard data:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(results);
    });
})

// ===== New Deal ===== ///
app.post('/newDeal', authenticateToken, (req, res) => {
    const userJWT = req.user.userID;
    // Generate a new fileID for the transaction
    const generateFileID = () => {
        const generatedFileID = `TC-${generateFileIDKey()}`;
        const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '_');
        const finalFileID = `${datePrefix}-${generatedFileID}`;
    return finalFileID;
    }
    const newFileID = generateFileID();
    const { 
        fileID, 
        // ===== Transaction info ===== ///
        // Basic info
        side, 
        propertyType, 
        transactionType, 
        stage,
        MLSNumber,

        // Parties involved
        buyerName, 
        sellerName, 
        listingAgent, 
        assignedTo,

        // Dates and deadlines
        contractDate, 
        closingDate,
        closingTime,
        EMDdueDate, 
        inspectionDeadline, 
        appraisalDeadline, 
        financingContingencyDeadline,

        // Location
        address, 
        closingLocation,

        // Financials
        purchasePrice, 
        listingPrice, 
        EMDamount,

        // Title and Lender info
        titleCompanyName, 
        titleCompanyContact, 
        lenderName, 
        lenderContact,
        
        // Risk and Notes
        riskLevel, 
        nextAction, 
        nextActionDue, 
        blocker, 
        notes,

        // milestone flags
        earnestMoneyReceived, 
        inspectionComplete,
        appraisalReceived,
        titleClear, 
        insuranceConfirmed, 
        clearToCloseConfirmed } = req.body;

        // add new transaction to the database
        db.query('INSERT INTO transactions (userID, fileID, side, propertyType, transactionType, stage, MLSNumber, buyerName, sellerName, listingAgent, assignedTo, contractDate, closingDate, closingTime, EMDdueDate, inspectionDeadline, appraisalDeadline, financingContingencyDeadline, address, closingLocation, purchasePrice, listingPrice, EMDamount, titleCompanyName, titleCompanyContact, lenderName, lenderContact, riskLevel, nextAction, nextActionDue, blocker, notes, earnestMoneyReceived, inspectionComplete, appraisalReceived, titleClear, insuranceConfirmed, clearToCloseConfirmed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userJWT, newFileID, side, propertyType, transactionType, stage, MLSNumber, buyerName, sellerName, listingAgent, assignedTo, contractDate, closingDate, closingTime, EMDdueDate, inspectionDeadline, appraisalDeadline, financingContingencyDeadline, address, closingLocation, purchasePrice, listingPrice, EMDamount, titleCompanyName, titleCompanyContact, lenderName, lenderContact, riskLevel, nextAction, nextActionDue, blocker, notes, earnestMoneyReceived ? 1 : 0, inspectionComplete ? 1 : 0, appraisalReceived ? 1 : 0, titleClear ? 1 : 0, insuranceConfirmed ? 1 : 0, clearToCloseConfirmed ? 1 : 0], (err) => {
            if (err) {
                console.error('Error creating new deal:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.status(201).json({ message: 'New deal created successfully', fileID: newFileID });
        });
});



// ===== Settings Page ===== ///
app.post('/settings', authenticateToken, (req, res) => {
    const userJWT = req.user.userID;
    const { email, username, password, linkedIN, phoneNumber, brokerageORcompany, titleORrole } = req.body;

    db.query('UPDATE users SET email = ?, username = ?, password = ?, linkedIN = ?, phoneNumber = ?, brokerageORcompany = ?, titleORrole = ? WHERE privateID = ?',
        [email, username, password, linkedIN, phoneNumber, brokerageORcompany, titleORrole, userJWT], (err, results) => {
            if (err) {
                console.error('Error updating user settings:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json({ message: 'User settings updated successfully' });
        });
});

// ===== Start the server ===== ///
app.listen(PORT, () => { 
    console.log(`Server is running on port ${PORT}`);
});
