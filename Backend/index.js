
const path = require('path');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
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
    database: DATABASE,
    dateStrings: true // return DATE columns as 'YYYY-MM-DD' strings instead of JS Dates (avoids timezone shifts)
});

const createDatabaseIfNotExists = () => {
    db.query(`CREATE TABLE IF NOT EXISTS users (
        privateID INT AUTO_INCREMENT PRIMARY KEY,
        publicID VARCHAR(255) NOT NULL UNIQUE DEFAULT '${nanoid()}',
        email VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        firstname VARCHAR(255) NOT NULL,
        lastname VARCHAR(255) NOT NULL,
        linkedIN VARCHAR(255) default NULL,
        phoneNumber VARCHAR(255) default NULL,
        brokerageORcompany VARCHAR(255) default NULL,
        titleORrole VARCHAR(255) default NULL
        )`, (err) => {(err) ? console.error('Error creating users table:', err) : console.log('Users table created or already exists.')}
    );

    db.query(`CREATE TABLE IF NOT EXISTS transactions (
        transactionID INT AUTO_INCREMENT PRIMARY KEY,
        userID INT NOT NULL,
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

console.log({ PORT, HOST, USER, PORT, API_PORT, hasJWT: !!process.env.JWT_SECRET });
// ===== USER REGISTRATION / USER LOGIN ===== ///
// registration
app.post('/register', async (req, res) => {
    const { username, password, email, firstname, lastname,
            phoneNumber, linkedIn, brokerageORcompany, titleORrole } = req.body;

    if (!username || !password || !email || !firstname || !lastname) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    if (linkedIn && !/^(https?:\/\/)?(www\.)?linkedin\.com\/.*$/.test(linkedIn)) {
        return res.status(400).json({ error: 'Invalid LinkedIn URL' });
    }
    if (phoneNumber && !/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
        return res.status(400).json({ error: 'Invalid phone number format' });
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character (@$!%*?&)' });
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        console.log('flag: start query');
        const [result] = await db.promise().query(
            `INSERT INTO users (publicID, username, password, email, firstname, lastname,
                                phoneNumber, linkedIN, brokerageORcompany, titleORrole)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nanoid(), username, hash, email, firstname, lastname,
             phoneNumber, linkedIn || '', brokerageORcompany || '', titleORrole || '']
        );
        const token = jwt.sign({ userID: result.insertId }, process.env.JWT_SECRET, { expiresIn: '24h' });
        console.log('flag: user created successfully');
        res.status(201).json({ message: 'User created successfully', token });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Username, email, phone number, or LinkedIn is already in use' });
        }
        console.error('Error creating user:', err);
        res.status(500).json({ error: 'Internal server error (registration)' });
    }
});

// login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);
        if (!rows.length || !(await bcrypt.compare(password, rows[0].password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ userID: rows[0].privateID }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).json({ error: 'Internal server error, (login)' });
    }
});

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
            return res.status(500).json({ error: 'Internal server error (transactions page)' });
        }
        res.json(results);
    });
});

app.get('/transactions', authenticateToken, (req, res) => {
    const userJWT = req.user.userID;

    db.query('SELECT * FROM transactions WHERE userID = ?', [userJWT], (err, results) => {
        if (err) {
            console.error('Error fetching transactions:', err);
            return res.status(500).json({ error: 'Internal server error (transactions page)' });
        }
        res.json(results);
    });
});


// ===== DASHBOARD PAGE ===== ///
app.post('/dashboard', authenticateToken, (req, res) => {
    const userJWT = req.user.userID;
    const { userID, fileID, address, stage, closingDate, closingsThisWeek, daysToClose, deadlineType, dueDate, overDueMilestones, riskLevel, action } = req.body;

    db.query('SELECT * FROM transactions WHERE userID = ?', [userJWT], (err, results) => {
        if (err) {
            console.error('Error fetching dashboard data:', err);
            return res.status(500).json({ error: 'Internal server error (dashboard)' });
        }
        res.json(results);
    });
})

// ===== New Deal ===== ///
// The token tells us WHO is adding the deal (req.user.userID), so the deal is
// always saved under the logged-in user, never under an ID the browser sends.
app.post('/newDeal', authenticateToken, async (req, res) => {
    const userJWT = req.user.userID;

    // Generate a fileID like 26_11_17-TC-AB12CD if the user left File ID blank
    const generateFileID = () => {
        const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '_');
        return `${datePrefix}-TC-${generateFileIDKey()}`;
    };

    // Only these columns may be filled in from the form (whitelist)
    const allowedFields = [
        'side', 'propertyType', 'transactionType', 'stage', 'MLSNumber',
        'buyerName', 'sellerName', 'listingAgent', 'assignedTo',
        'contractDate', 'closingDate', 'closingTime', 'EMDdueDate', 'inspectionDeadline',
        'appraisalDeadline', 'financingContingencyDeadline',
        'address', 'closingLocation',
        'purchasePrice', 'listingPrice', 'EMDamount',
        'titleCompanyName', 'titleCompanyContact', 'lenderName', 'lenderContact',
        'riskLevel', 'nextAction', 'nextActionDue', 'blocker', 'notes'
    ];
    const milestoneFields = [
        'earnestMoneyReceived', 'inspectionComplete', 'appraisalReceived',
        'titleClear', 'insuranceConfirmed', 'clearToCloseConfirmed'
    ];

    // Build { columnName: value } for the INSERT; empty strings become NULL
    // (MySQL rejects '' for DATE / DECIMAL columns)
    const fileID = (req.body.fileID || '').trim() || generateFileID();
    const newDeal = { userID: userJWT, fileID };
    for (const field of allowedFields) {
        const value = req.body[field];
        newDeal[field] = (value === '' || value === undefined) ? null : value;
    }
    for (const field of milestoneFields) {
        newDeal[field] = req.body[field] ? 1 : 0;
    }

    try {
        // "INSERT ... SET ?" lets mysql2 turn the object into `col1 = ?, col2 = ?, ...`
        // so the column list and values can never get out of sync
        await db.promise().query('INSERT INTO transactions SET ?', [newDeal]);
        res.status(201).json({ message: 'New deal created successfully', fileID });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: `File ID ${fileID} already exists` });
        }
        console.error('Error creating new deal:', err);
        res.status(500).json({ error: 'Internal server error (new Deal)' });
    }
});



// ===== Settings Page ===== ///
app.post('/settings', authenticateToken, (req, res) => {
    const userJWT = req.user.userID;
    const { email, username, password, linkedIN, phoneNumber, brokerageORcompany, titleORrole } = req.body;

    db.query('UPDATE users SET email = ?, username = ?, password = ?, linkedIN = ?, phoneNumber = ?, brokerageORcompany = ?, titleORrole = ? WHERE privateID = ?',
        [email, username, password, linkedIN, phoneNumber, brokerageORcompany, titleORrole, userJWT], (err, results) => {
            if (err) {
                console.error('Error updating user settings:', err);
                return res.status(500).json({ error: 'Internal server error (settings)' });
            }
            res.json({ message: 'User settings updated successfully' });
        });
});

// ===== Start the server ===== ///
app.listen(PORT, () => { 
    console.log(`Server is running on port ${PORT}`);
});

