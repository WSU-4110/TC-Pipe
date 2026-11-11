
const path = require('path');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const generateFileIDKey = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);
dotenv.config();

app.use(cors());
app.use(express.json());

// ===== CONFIGURATION ===== ///
const db = mysql.createPool({
    host: process.env.host,
    port: process.env.PORT,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
});

db.query(`
    CREATE TABLE IF NOT EXISTS users (
        privateID INT AUTO_INCREMENT PRIMARY KEY,
        publicID VARCHAR(255) NOT NULL UNIQUE DEFAULT '${nanoid()}',
        email VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
        linkedIN VARCHAR(255) UNIQUE,
        phoneNumber VARCHAR(255) UNIQUE,
        brokerageORcompany VARCHAR(255),
        titleORrole VARCHAR(255)
    )

    CREATE TABLE IF NOT EXISTS transactions (
        userID INT NOT NULL PRIMARY KEY,
        fileID VARCHAR(50) NOT NULL UNIQUE,
        
        ----- Dashboard fields -----
        closingsThisWeek INT,
        daysToClose INT,
        deadLineType VARCHAR(255),
        dueDate DATE,
        overDueMilestones INT,

        ----- Transaction info -----
        -- Basic info
        side VARCHAR(255),
        propertyType VARCHAR(255),
        transactionType VARCHAR(255),
        stage VARCHAR(255),
        MLSNumber BIGINT,

        -- Parties involved
        buyerName VARCHAR(255),
        sellerName VARCHAR(255),
        listingAgent VARCHAR(255),
        AssignedTo VARCHAR(255),

        -- Dates and deadlines
        contractDate DATE,
        closingDate DATE,
        closingTime TIME,
        EMDdueDate DATE,
        inspectionDeadline DATE,
        appraisalDeadline DATE,
        financingContingencyDeadline DATE,

        -- Location
        address VARCHAR(255),
        closingLocation VARCHAR(255),

        -- Financials
        purchasePrice DECIMAL(12,2),
        listingPrice DECIMAL(12,2),
        EMDamount DECIMAL(12,2),

        -- Title and Lender info
        titleCompanyName VARCHAR(255),
        titleCompanyContact VARCHAR(255),
        lenderName VARCHAR(255),
        lenderContact VARCHAR(255),

        -- Risk and Notes
        riskLevel VARCHAR(255),
        nextAction VARCHAR(255),
        nextActionDue DATE,
        blocker VARCHAR(255),
        notes TEXT,

        -- Milestone Flags
        earnestMoneyReceived TINYINT(1) NOT NULL DEFAULT 0,
        inspectionComplete TINYINT(1) NOT NULL DEFAULT 0,
        appraisalReceived TINYINT(1) NOT NULL DEFAULT 0,
        titleClear TINYINT(1) NOT NULL DEFAULT 0,
        insuranceConfirmed TINYINT(1) NOT NULL DEFAULT 0,
        clearToCloseConfirmed TINYINT(1) NOT NULL DEFAULT 0,
        FOREIGN KEY (userID) REFERENCES users(privateID) ON DELETE CASCADE
    ) 
`)

// ===== USER REGISTRATION / USER LOGIN ===== ///
// registration
app.post('./register', (req, res) => {
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
app.post('./login', (req, res) => {
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
app.post('./transactions', authenticateToken, (req, res) => {
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
app.post('./dashboard', authenticateToken, (req, res) => {
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
app.post('./newDeal', authenticateToken, (req, res) => {
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
app.post('./settings', authenticateToken, (req, res) => {
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



// // ---------- the transaction fields ----------
// // One list drives the table, the validation and the SQL, so they can't drift apart.
// // These names match what add.html sends and what index.html / app.js read.

// const text  = (name, max) => ({ name, type: 'text', max });
// const date  = name => ({ name, type: 'date' });
// const time  = name => ({ name, type: 'time' });
// const money = name => ({ name, type: 'money' });
// const flag  = name => ({ name, type: 'flag' });

// const COLUMNS = [
//     text('side', 50), text('propertyType', 50), text('transactionType', 50), text('stage', 50),
//     text('mlsNumber', 50),
//     text('buyerName', 150), text('sellerName', 150), text('listingAgent', 150), text('assignedTo', 150),
//     text('propertyAddress', 255), text('closingLocation', 255),
//     date('contractDate'), date('closingDate'), time('closingTime'),
//     date('emdDueDate'), date('inspectionDeadline'), date('appraisalDeadline'), date('financingContingencyDeadline'),
//     money('purchasePrice'), money('listingPrice'), money('emdAmount'),
//     text('titleCompanyName', 150), text('titleCompanyContact', 255),
//     text('lenderName', 150), text('lenderContact', 255),
//     text('riskLevel', 20),
//     text('nextAction', 255), date('nextActionDue'), text('blocker', 255), text('notes', 65535),
//     flag('earnestMoneyReceived'), flag('inspectionComplete'), flag('appraisalReceived'),
//     flag('titleClear'), flag('insuranceConfirmed'), flag('clearToCloseConfirmed')
// ];

// const COLUMN_NAMES = COLUMNS.map(c => mysql.escapeId(c.name)).join(', ');

// function columnSql(c) {
//     const id = mysql.escapeId(c.name);
//     switch (c.type) {
//         case 'text':  return c.max > 1000 ? id + ' TEXT NULL' : id + ' VARCHAR(' + c.max + ') NULL';
//         case 'date':  return id + ' DATE NULL';
//         case 'time':  return id + ' TIME NULL';
//         case 'money': return id + ' DECIMAL(12,2) NULL';
//         case 'flag':  return id + ' TINYINT(1) NOT NULL DEFAULT 0';
//     }
// }

// function createTableSql() {
//     return 'CREATE TABLE IF NOT EXISTS transactions (\n' +
//         '  fileID VARCHAR(50) NOT NULL PRIMARY KEY,\n  ' +
//         COLUMNS.map(columnSql).join(',\n  ') + ',\n' +
//         '  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n' +
//         '  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n' +
//         ') CHARACTER SET utf8mb4';
// }

// // ---------- database ----------

// let pool; // created in start() once the database exists

// // mysql's query() uses callbacks; this wraps it so we can use async/await.
// function query(sql, params) {
//     return new Promise((resolve, reject) => {
//         pool.query(sql, params || [], (err, result) => (err ? reject(err) : resolve(result)));
//     });
// }

// async function initDatabase() {
//     // 1) make sure the database exists (needs permission to CREATE DATABASE; skipped if it already exists)
//     const admin = mysql.createConnection({ host: DB.host, port: DB.port, user: DB.user, password: DB.password });
//     await new Promise((resolve, reject) => admin.connect(err => (err ? reject(err) : resolve())));
//     try {
//         await new Promise((resolve, reject) => admin.query(
//             'CREATE DATABASE IF NOT EXISTS ' + mysql.escapeId(DB.database) + ' CHARACTER SET utf8mb4',
//             err => (err ? reject(err) : resolve())));
//     } catch (err) {
//         console.warn('Could not create database "' + DB.database + '" (' + err.code + '). Assuming it already exists.');
//     }
//     admin.end();

//     // 2) connect to it. dateStrings:true makes DATE columns come back as "2026-08-04" text,
//     //    which is what the frontend and the <input type="date"> boxes expect.
//     pool = mysql.createPool({
//         host: DB.host, port: DB.port, user: DB.user, password: DB.password, database: DB.database,
//         connectionLimit: 10, dateStrings: true, charset: 'UTF8MB4_GENERAL_CI'
//     });

//     // 3) make sure the table exists
//     await query(createTableSql());
// }

// // ---------- cleaning data on the way in ----------

// class ValidationError extends Error {
//     constructor(message) { super(message); this.status = 400; }
// }

// // "" and MySQL's "0000-00-00" both mean "no date". They're stored as NULL, which is what
// // the old "NaN days" problem on the dashboard came from.
// function isBlankDate(v) {
//     if (v == null) return true;
//     const s = String(v).trim();
//     return s === '' || /^0000-00-00/.test(s);
// }

// function isRealDate(s) {
//     const [y, m, d] = s.split('-').map(Number);
//     const dt = new Date(Date.UTC(y, m - 1, d));
//     return y >= 1900 && dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
// }

// function cleanValue(col, v) {
//     switch (col.type) {
//         case 'text': {
//             if (v == null) return null;
//             const s = String(v).trim();
//             if (s === '') return null;
//             if (s.length > col.max) throw new ValidationError(col.name + ' is too long (max ' + col.max + ' characters).');
//             return s;
//         }
//         case 'date': {
//             if (isBlankDate(v)) return null;
//             const s = String(v).trim();
//             if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !isRealDate(s)) {
//                 throw new ValidationError(col.name + ' must be a valid date like 2026-08-04.');
//             }
//             return s;
//         }
//         case 'time': {
//             if (v == null || String(v).trim() === '') return null;
//             const m = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(String(v).trim());
//             if (!m) throw new ValidationError(col.name + ' must be a valid time like 14:30.');
//             return m[1] + ':' + m[2] + ':' + (m[3] || '00');
//         }
//         case 'money': {
//             if (v == null || String(v).trim() === '') return null;
//             const n = Number(String(v).replace(/[$,\s]/g, ''));
//             if (!isFinite(n) || Math.abs(n) >= 1e10) throw new ValidationError(col.name + ' must be a number.');
//             return Math.round(n * 100) / 100;
//         }
//         case 'flag':
//             // Checkboxes: only a real "yes" counts. (A string "0" does NOT count as checked.)
//             return (v === true || v === 1 || v === '1' || v === 'true') ? 1 : 0;
//     }
// }

// function cleanFileID(v) {
//     const s = v == null ? '' : String(v).trim();
//     if (!s) throw new ValidationError('File ID is required.');
//     if (s.length > 50) throw new ValidationError('File ID is too long (max 50 characters).');
//     return s;
// }

// // ---------- shaping data on the way out ----------

// // Turns a database row into the JSON the frontend expects:
// // checkboxes become true/false, prices become numbers, empty text/date fields become "".
// function toApi(row) {
//     const out = { fileID: row.fileID };
//     COLUMNS.forEach(c => {
//         const v = row[c.name];
//         if (c.type === 'flag') out[c.name] = !!v;
//         else if (c.type === 'money') out[c.name] = v == null ? null : Number(v);
//         else if (c.type === 'time') out[c.name] = v == null ? '' : String(v).slice(0, 5); // "14:30:00" -> "14:30"
//         else out[c.name] = v == null ? '' : v;
//     });
//     return out;
// }

// // ---------- routes ----------

// const router = express.Router();

// // List everything (or just one deal with ?fileID=...). The frontend does its own filtering/sorting.
// router.get('/', async (req, res) => {
//     const fileID = req.query.fileID != null ? String(req.query.fileID) : null;
//     const rows = await query(
//         'SELECT fileID, ' + COLUMN_NAMES + ' FROM transactions' +
//         (fileID ? ' WHERE fileID = ?' : '') +
//         ' ORDER BY closingDate IS NULL, closingDate ASC, fileID ASC',
//         fileID ? [fileID] : []);
//     res.json(rows.map(toApi));
// });

// // Add a new transaction.
// router.post('/', async (req, res) => {
//     const body = req.body || {};
//     const fileID = cleanFileID(body.fileID);
//     const values = COLUMNS.map(c => cleanValue(c, body[c.name]));
//     try {
//         await query(
//             'INSERT INTO transactions (fileID, ' + COLUMN_NAMES + ') VALUES (?' + ', ?'.repeat(COLUMNS.length) + ')',
//             [fileID].concat(values));
//     } catch (err) {
//         if (err.code === 'ER_DUP_ENTRY') {
//             return res.status(409).json({ success: false, error: 'File ID ' + fileID + ' already exists.' });
//         }
//         throw err;
//     }
//     res.status(201).json({ success: true, fileID: fileID });
// });

// // Update a transaction. Only the fields included in the request are changed.
// router.put('/', async (req, res) => {
//     const body = req.body || {};
//     const fileID = cleanFileID(body.fileID);
//     const cols = COLUMNS.filter(c => Object.prototype.hasOwnProperty.call(body, c.name));
//     if (cols.length === 0) throw new ValidationError('Nothing to update.');

//     const sets = cols.map(c => mysql.escapeId(c.name) + ' = ?').join(', ');
//     const values = cols.map(c => cleanValue(c, body[c.name]));
//     const result = await query('UPDATE transactions SET ' + sets + ' WHERE fileID = ?', values.concat([fileID]));
//     if (result.affectedRows === 0) {
//         return res.status(404).json({ success: false, error: 'No transaction with File ID ' + fileID + '.' });
//     }
//     res.json({ success: true, fileID: fileID });
// });

// // Delete a transaction: DELETE /api/transactions.php?fileID=08062605
// router.delete('/', async (req, res) => {
//     const fileID = cleanFileID(req.query.fileID);
//     const result = await query('DELETE FROM transactions WHERE fileID = ?', [fileID]);
//     if (result.affectedRows === 0) {
//         return res.status(404).json({ success: false, error: 'No transaction with File ID ' + fileID + '.' });
//     }
//     res.json({ success: true, fileID: fileID });
// });

// // ---------- app ----------

// const app = express();
// app.use(cors());          // lets the frontend call this API even if it's opened from another port
// app.use(express.json());  // reads JSON request bodies into req.body

// // Quick check that the server and database are alive: http://localhost:3000/api/health
// app.get('/api/health', async (req, res) => {
//     await query('SELECT 1');
//     res.json({ ok: true, database: DB.database });
// });

// // Both URLs work, so the existing app.js (which calls api/transactions.php) needs no changes.
// app.use(['/api/transactions', '/api/transactions.php'], router);

// // Anything else under /api is a JSON 404 instead of an HTML error page.
// app.use('/api', (req, res) => res.status(404).json({ success: false, error: 'Not found.' }));

// // Optionally serve the frontend from the same server (same origin = no CORS headaches).
// if (FRONTEND_DIR) app.use(express.static(FRONTEND_DIR));

// // Error handler. Express 5 sends errors from async routes here automatically.
// app.use((err, req, res, next) => {
//     const status = err.status || err.statusCode || 500;
//     if (status >= 500) console.error(err);
//     res.status(status).json({
//         success: false,
//         error: status >= 500 ? 'Server error. Check the backend console for details.' : err.message
//     });
// });

// // ---------- start ----------

// function explainStartupError(err) {
//     switch (err.code) {
//         case 'ECONNREFUSED':
//             return 'MySQL isn\u2019t reachable at ' + DB.host + ':' + DB.port + '. Is the MySQL server running?';
//         case 'ER_ACCESS_DENIED_ERROR':
//             return 'MySQL rejected the login. Check DB_USER and DB_PASSWORD (currently user "' + DB.user + '").';
//         case 'ER_NOT_SUPPORTED_AUTH_MODE':
//             return 'The "mysql" package can\u2019t use MySQL 8\u2019s default login method. Either run\n' +
//                    '  ALTER USER \'' + DB.user + '\'@\'localhost\' IDENTIFIED WITH mysql_native_password BY \'your_password\';\n' +
//                    'in MySQL, or switch the backend to the "mysql2" package.';
//         default:
//             return err.message;
//     }
// }

initDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log('TC Pipeline API running at http://localhost:' + PORT + '/api/transactions.php');
            console.log('Database: ' + DB.database + ' on ' + DB.host + ':' + DB.port);
            if (FRONTEND_DIR) console.log('Frontend: http://localhost:' + PORT + '/index.html  (serving ' + FRONTEND_DIR + ')');
            else console.log('Frontend not served. Set FRONTEND_DIR to the folder with index.html to serve it from here.');
        });
    })
    .catch(err => {
        console.error('Could not start: ' + explainStartupError(err));
        process.exit(1);
    });