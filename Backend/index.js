const path = require('path');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: 'us-east-2' });
const S3_BUCKET = 'tc-pipeline-assets';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ---------- config ----------
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
        firstname VARCHAR(255) NOT NULL,
        lastname VARCHAR(255) NOT NULL,
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
// TODO: Validate user email NEED
// TODO: Validate linkedIn URL NEED
// TODO: Validate user phone number NEED
// TODO: Validate user password strength WANT
app.post('/register', (req, res) => {
    const { username, password, email, firstname, lastname, phoneNumber, linkedIn, brokerageORcompany, titleORrole } = req.body;

    // Check if the username already exists
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('Error checking username:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (results.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }
    });
        
    // ----- validations ----- //
    // -- email validation -- //
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    // check if email is exists
    db.query(`SELECT * FROM users WHERE email = ?`, [email], (err, results) => {
        if (err) {
            console.error('Error checking email:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (results.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }
    });

    // -- linkedIn validation -- //
    const linkedInRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/.*$/;
    if (linkedIn && !linkedInRegex.test(linkedIn)) {
        return res.status(400).json({ error: 'Invalid LinkedIn URL' });
    }

    // -- phone number validation -- //
    const phoneNumberRegex = /^\+?[1-9]\d{1,14}$/;
    if (phoneNumber && !phoneNumberRegex.test(phoneNumber)) {
        return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // 2) initialize the singleton pool — connects to the database.
    //    dateStrings:true makes DATE columns come back as "2026-08-04" text,
    //    which is what the frontend and the <input type="date"> boxes expect.
    DatabasePool.getInstance().initialize({
        host: DB.host, port: DB.port, user: DB.user, password: DB.password, database: DB.database,
        connectionLimit: 10, dateStrings: true, charset: 'UTF8MB4_GENERAL_CI'
    });

    // 3) make sure the table exists
    await query(createTableSql());
    await query(createUserTableSql());
}

// ---------- cleaning data on the way in ----------

class ValidationError extends Error {
    constructor(message) { super(message); this.status = 400; }
}

// "" and MySQL's "0000-00-00" both mean "no date". They're stored as NULL, which is what
// the old "NaN days" problem on the dashboard came from.
function isBlankDate(v) {
    if (v == null) return true;
    const s = String(v).trim();
    return s === '' || /^0000-00-00/.test(s);
}

function isRealDate(s) {
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return y >= 1900 && dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function cleanValue(col, v) {
    switch (col.type) {
        case 'text': {
            if (v == null) return null;
            const s = String(v).trim();
            if (s === '') return null;
            if (s.length > col.max) throw new ValidationError(col.name + ' is too long (max ' + col.max + ' characters).');
            return s;
        }
        case 'date': {
            if (isBlankDate(v)) return null;
            const s = String(v).trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !isRealDate(s)) {
                throw new ValidationError(col.name + ' must be a valid date like 2026-08-04.');
            }
            return s;
        }
        case 'time': {
            if (v == null || String(v).trim() === '') return null;
            const m = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(String(v).trim());
            if (!m) throw new ValidationError(col.name + ' must be a valid time like 14:30.');
            return m[1] + ':' + m[2] + ':' + (m[3] || '00');
        }
        res.status(201).json({ message: 'User created successfully' });
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

// GET /api/user — load profile (creates default record on first visit)
app.get('/api/user', async (req, res) => {
    try {
        let rows = await query('SELECT * FROM users WHERE userID = ?', ['default']);
        if (rows.length === 0) {
            await query('INSERT INTO users (userID) VALUES (?)', ['default']);
            rows = await query('SELECT * FROM users WHERE userID = ?', ['default']);
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('GET /api/user error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/user — update profile fields
app.put('/api/user', async (req, res) => {
    try {
        const ALL_FIELDS = [
            'fullName','email','phone','company','role','linkedInUrl',
            'defaultTitleCompany','defaultTitleContact','defaultLender',
            'defaultLenderContact','defaultAssignedTo',
            'emailNotifications','deadlineReminderDays','profilePicUrl'
        ];
        const data = req.body;
        const fields = ALL_FIELDS.filter(f => Object.prototype.hasOwnProperty.call(data, f));
        if (fields.length === 0) return res.json({ success: true });

        const setClauses = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => data[f] !== undefined ? data[f] : null);

        await query(
            `INSERT INTO users (userID, ${fields.join(', ')}) VALUES ('default', ${fields.map(() => '?').join(', ')})
             ON DUPLICATE KEY UPDATE ${setClauses}`,
            [...values, ...values]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('PUT /api/user error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Anything else under /api is a JSON 404 instead of an HTML error page.
app.use('/api', (req, res) => res.status(404).json({ success: false, error: 'Not found.' }));

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
        fileID = newFileID,
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

// ---------- start ----------

function explainStartupError(err) {
    switch (err.code) {
        case 'ECONNREFUSED':
            return 'MySQL isn’t reachable at ' + DB.host + ':' + DB.port + '. Is the MySQL server running?';
        case 'ER_ACCESS_DENIED_ERROR':
            return 'MySQL rejected the login. Check DB_USER and DB_PASSWORD (currently user "' + DB.user + '").';
        case 'ER_NOT_SUPPORTED_AUTH_MODE':
            return 'The "mysql" package can’t use MySQL 8’s default login method. Either run\n' +
                   '  ALTER USER \'' + DB.user + '\'@\'localhost\' IDENTIFIED WITH mysql_native_password BY \'your_password\';\n' +
                   'in MySQL, or switch the backend to the "mysql2" package.';
        default:
            return err.message;
    }
}

initDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log('TC Pipeline API running at http://localhost:' + PORT + '/api/transactions.php');
            console.log('Database: ' + DB.database + ' on ' + DB.host + ':' + DB.port);
            if (FRONTEND_DIR) console.log('Frontend: http://localhost:' + PORT + '/index.html  (serving ' + FRONTEND_DIR + ')');
            else console.log('Frontend not served. Set FRONTEND_DIR to the folder with index.html to serve it from here.');
        });
});

// ===== Start the server ===== ///
app.listen(PORT, () => { 
    console.log(`Server is running on port ${PORT}`);
});

