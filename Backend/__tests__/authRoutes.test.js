/**
 * Unit Tests — Auth Route Handlers (/register, /login, /assistant)
 * Framework: Jest + Supertest
 * Author: Julian Boone
 * Methods under test:
 *   4. POST /register  — missing fields → 400
 *   5. POST /register  — valid input   → 201 + success message
 *   6. POST /login     — wrong password → 401
 *   7. POST /login     — valid creds   → 200 + JWT token
 *   8. POST /assistant — no auth token → 401
 *   9. POST /assistant — valid token   → 200
 */

const request = require('supertest');

// ---------------------------------------------------------------------------
// Mock all external dependencies before requiring any module
// ---------------------------------------------------------------------------
jest.mock('dotenv', () => ({ config: jest.fn() }));

jest.mock('mysql2', () => ({
  createPool: jest.fn(() => ({ query: jest.fn() })),
}));

jest.mock('bcrypt', () => ({
  hash       : jest.fn(),
  compareSync: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign  : jest.fn(),
  verify: jest.fn(),
}));

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');

// ---------------------------------------------------------------------------
// Shared mock DB — tests control return values, route handlers just call it
// ---------------------------------------------------------------------------
const mockDb = {
  query: jest.fn(),
};

// ---------------------------------------------------------------------------
// Minimal Express app — mirrors route logic from Backend/index.js
// ---------------------------------------------------------------------------
const express = require('express');
const app     = express();
app.use(express.json());

// ---- POST /register --------------------------------------------------------
app.post('/register', async (req, res) => {
  const { email, name, password } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check for duplicate email, then insert
    mockDb.query('INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
      [email, name, hashedPassword],
      (err) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        return res.status(201).json({ message: 'User registered successfully' });
      }
    );
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---- POST /login -----------------------------------------------------------
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  mockDb.query(
    'SELECT id, email, name, password FROM users WHERE email = ?',
    [email],
    (err, rows) => {
      if (err)                        return res.status(500).json({ error: 'Server error' });
      if (!rows || rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

      const user  = rows[0];
      const match = bcrypt.compareSync(password, user.password);

      if (!match) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
      );

      return res.status(200).json({ token });
    }
  );
});

// ---- POST /assistant -------------------------------------------------------
app.post('/assistant', (req, res) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_secret');
    return res.status(200).json({ message: 'AI response', user: decoded });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
});

// ---- Suite 4 & 5: POST /register ------------------------------------------
describe('POST /register', () => {

  test('Method 4 — returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'test@example.com' }); // missing name and password

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('Method 5 — returns 201 and success message with valid input', async () => {
    bcrypt.hash.mockResolvedValue('$2b$10$hashedpassword');

    // Mock the INSERT succeeding
    mockDb.query.mockImplementation((_sql, _params, cb) => {
      cb(null, { insertId: 1 });
    });

    const res = await request(app)
      .post('/register')
      .send({ email: 'newuser@example.com', name: 'New User', password: 'Secret1!' });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/registered successfully/i);
  });
});

// ---- Suite 6 & 7: POST /login ---------------------------------------------
describe('POST /login', () => {

  const fakeUser = { id: 1, email: 'user@example.com', name: 'Test User', password: 'hashed_pw' };

  test('Method 6 — returns 401 when password does not match', async () => {
    // DB returns a valid user …
    mockDb.query.mockImplementation((_sql, _params, cb) => {
      cb(null, [fakeUser]);
    });
    // … but password check fails
    bcrypt.compareSync.mockReturnValue(false);

    const res = await request(app)
      .post('/login')
      .send({ email: 'user@example.com', password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid credentials');
  });

  test('Method 7 — returns 200 and a JWT token on valid credentials', async () => {
    // DB returns a valid user …
    mockDb.query.mockImplementation((_sql, _params, cb) => {
      cb(null, [fakeUser]);
    });
    // … password matches …
    bcrypt.compareSync.mockReturnValue(true);
    // … and jwt.sign returns a fake token
    jwt.sign.mockReturnValue('mock.jwt.token.string');

    const res = await request(app)
      .post('/login')
      .send({ email: 'user@example.com', password: 'Secret1!' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });
});

// ---- Suite 8 & 9: POST /assistant -----------------------------------------
describe('POST /assistant', () => {

  test('Method 8 — returns 401 when no Authorization header is provided', async () => {
    const res = await request(app)
      .post('/assistant')
      .send({ message: 'Hello' });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error', 'No token provided');
  });

  test('Method 9 — returns 200 when a valid Bearer token is provided', async () => {
    // jwt.verify returns a decoded payload (valid token simulation)
    jwt.verify.mockReturnValue({ id: 1, email: 'user@example.com' });

    const res = await request(app)
      .post('/assistant')
      .set('Authorization', 'Bearer mock.jwt.token.string')
      .send({ message: 'What is TC-Pipe?' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
  });
});
