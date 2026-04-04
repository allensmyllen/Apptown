/**
 * Unit tests for generateLicenseKey and deriveSlug
 * Requirements: 8.1
 */

const { generateLicenseKey } = require('../../src/routes/orders');
const { deriveSlug } = require('../../src/routes/categories');

// ── generateLicenseKey ────────────────────────────────────────────────────────

describe('generateLicenseKey', () => {
  const LICENSE_REGEX = /^DM-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/;

  test('returns a string matching the expected format', () => {
    const key = generateLicenseKey();
    expect(key).toMatch(LICENSE_REGEX);
  });

  test('generates unique keys across multiple calls', () => {
    const keys = new Set(Array.from({ length: 1000 }, () => generateLicenseKey()));
    expect(keys.size).toBe(1000);
  });

  test('always starts with DM-', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateLicenseKey().startsWith('DM-')).toBe(true);
    }
  });

  test('has exactly 3 segments of 8 uppercase hex chars', () => {
    const key = generateLicenseKey();
    const parts = key.split('-');
    expect(parts).toHaveLength(4); // DM + 3 segments
    expect(parts[0]).toBe('DM');
    parts.slice(1).forEach((seg) => {
      expect(seg).toMatch(/^[0-9A-F]{8}$/);
    });
  });
});

// ── deriveSlug ────────────────────────────────────────────────────────────────

describe('deriveSlug', () => {
  test.each([
    ['UI Kits', 'ui_kits'],
    ['theme', 'theme'],
    ['Source Code', 'source_code'],
    ['  Trim Me  ', 'trim_me'],
    ['Hello-World!', 'helloworld'],
    ['café', 'caf'],
    ['123 Numbers', '123_numbers'],
    ['multiple   spaces', 'multiple_spaces'],
  ])('deriveSlug(%s) === %s', (input, expected) => {
    expect(deriveSlug(input)).toBe(expected);
  });

  test('is idempotent: deriveSlug(deriveSlug(name)) === deriveSlug(name)', () => {
    const inputs = ['UI Kits', 'Source Code', 'Hello World!', 'theme', '  spaces  '];
    inputs.forEach((name) => {
      const once = deriveSlug(name);
      const twice = deriveSlug(once);
      expect(twice).toBe(once);
    });
  });

  test('result contains only lowercase alphanumeric and underscores', () => {
    const inputs = ['UI Kits', 'Hello-World!', 'café latte', 'Test123'];
    inputs.forEach((name) => {
      expect(deriveSlug(name)).toMatch(/^[a-z0-9_]*$/);
    });
  });
});
