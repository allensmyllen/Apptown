/**
 * Unit tests for support license helpers
 * Requirements: 1.7
 */

// isValidISODate is exported alongside the router
const { isValidISODate } = require('../../src/routes/admin');

describe('isValidISODate', () => {
  describe('invalid inputs', () => {
    test('rejects empty string', () => {
      expect(isValidISODate('')).toBeFalsy();
    });

    test('rejects "not-a-date"', () => {
      expect(isValidISODate('not-a-date')).toBeFalsy();
    });

    test('rejects "2024-13-01" (month 13 does not exist)', () => {
      expect(isValidISODate('2024-13-01')).toBeFalsy();
    });
  });

  describe('valid inputs', () => {
    test('accepts "2024-01-15"', () => {
      expect(isValidISODate('2024-01-15')).toBeTruthy();
    });

    test('accepts "2023-12-31"', () => {
      expect(isValidISODate('2023-12-31')).toBeTruthy();
    });
  });
});

// Key generation tests
const { generateSupportLicenseKey } = require('../../src/routes/support-licenses');

describe('generateSupportLicenseKey', () => {
  test('returns a string matching /^SL-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/', () => {
    const key = generateSupportLicenseKey();
    expect(key).toMatch(/^SL-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/);
  });

  test('produces unique keys across 100 calls', () => {
    const keys = new Set();
    for (let i = 0; i < 100; i++) {
      keys.add(generateSupportLicenseKey());
    }
    expect(keys.size).toBe(100);
  });
});
