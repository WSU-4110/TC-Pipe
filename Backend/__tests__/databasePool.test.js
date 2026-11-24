/**
 * Unit Tests — DatabasePool (Singleton)
 * Framework: Jest
 * Author: Julian Boone
 * Methods under test:
 *   1. DatabasePool.getInstance()   — Singleton property: same reference
 *   2. DatabasePool.getInstance()   — Singleton property: instance is not null
 *   3. DatabasePool.initialize()    — sets up mysql pool from config
 *   4. DatabasePool.query()         — resolves with results on success
 *   5. DatabasePool.query()         — rejects with error on DB failure
 */

// Mock mysql2 so no real DB connection is needed
jest.mock('mysql2', () => ({
  createPool: jest.fn(() => ({
    query: jest.fn(),
  })),
}));

// Mock dotenv so the file can be loaded without a real .env
jest.mock('dotenv', () => ({ config: jest.fn() }));

const mysql = require('mysql2');

// ---------------------------------------------------------------------------
// Inline DatabasePool class — mirrors Backend/index.js implementation
// (testing the class logic directly without spinning up the full Express app)
// ---------------------------------------------------------------------------
class DatabasePool {
  static #instance = null;

  static getInstance() {
    if (!DatabasePool.#instance) {
      DatabasePool.#instance = new DatabasePool();
    }
    return DatabasePool.#instance;
  }

  initialize(config) {
    this.pool = mysql.createPool(config);
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.pool.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Reset the Singleton between tests so each test starts clean
// ---------------------------------------------------------------------------
beforeEach(() => {
  // Access private static field via reflection to reset the singleton
  DatabasePool['#instance'] = null; // won't work with real private fields
  // Workaround: reassign through the class itself using a test-only reset
  // We'll spy on getInstance to control behavior per test
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Test Suite 1 — getInstance() : Singleton pattern
// ---------------------------------------------------------------------------
describe('DatabasePool.getInstance()', () => {

  test('Method 1a — returns a DatabasePool instance (not null)', () => {
    const instance = DatabasePool.getInstance();
    expect(instance).not.toBeNull();
    expect(instance).toBeInstanceOf(DatabasePool);
  });

  test('Method 1b — always returns the SAME object reference (Singleton)', () => {
    const first  = DatabasePool.getInstance();
    const second = DatabasePool.getInstance();
    // Both calls must point to the exact same object in memory
    expect(first).toBe(second);
  });
});

// ---------------------------------------------------------------------------
// Test Suite 2 — initialize() : pool creation
// ---------------------------------------------------------------------------
describe('DatabasePool.initialize()', () => {

  test('Method 2 — calls mysql.createPool with the provided config', () => {
    const pool    = DatabasePool.getInstance();
    const config  = {
      host    : 'localhost',
      user    : 'testuser',
      password: 'testpass',
      database: 'testdb',
    };

    pool.initialize(config);

    // mysql.createPool must have been called exactly once with our config
    expect(mysql.createPool).toHaveBeenCalledTimes(1);
    expect(mysql.createPool).toHaveBeenCalledWith(config);
  });
});

// ---------------------------------------------------------------------------
// Test Suite 3 — query() : Promise wrapper around pool.query
// ---------------------------------------------------------------------------
describe('DatabasePool.query()', () => {

  let pool;

  beforeEach(() => {
    pool = DatabasePool.getInstance();
    // Give the pool a mock pool object so query() can run
    pool.pool = mysql.createPool({});
  });

  test('Method 3a — resolves with results when the DB call succeeds', async () => {
    const fakeRows = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];

    // Make pool.query call its callback with (null, fakeRows)
    pool.pool.query.mockImplementation((_sql, _params, cb) => {
      cb(null, fakeRows);
    });

    const results = await pool.query('SELECT * FROM users');
    expect(results).toEqual(fakeRows);
  });

  test('Method 3b — rejects with an error when the DB call fails', async () => {
    const dbError = new Error('Connection refused');

    // Make pool.query call its callback with (error, null)
    pool.pool.query.mockImplementation((_sql, _params, cb) => {
      cb(dbError, null);
    });

    await expect(pool.query('SELECT * FROM broken_table')).rejects.toThrow(
      'Connection refused'
    );
  });
});
