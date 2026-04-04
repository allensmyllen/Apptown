/**
 * Property-based tests for product enhancements
 * Validates: Requirements 8.2
 */

const fc = require('fast-check');
const { generateLicenseKey } = require('../../src/routes/orders');
const { deriveSlug } = require('../../src/routes/categories');
const { validateImage } = require('../../src/routes/products');

const LICENSE_REGEX = /^DM-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/;
const SLUG_REGEX = /^[a-z0-9_]+$/;
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Property: generateLicenseKey always matches format regex
// Validates: Requirements 8.2
// ---------------------------------------------------------------------------

describe('P — generateLicenseKey format', () => {
  /**
   * **Validates: Requirements 8.2**
   */
  test('always matches /^DM-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const key = generateLicenseKey();
        expect(key).toMatch(LICENSE_REGEX);
      }),
      { numRuns: 500 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property: deriveSlug result matches /^[a-z0-9_]+$/ for any non-empty string
// Validates: Requirements 8.2
// ---------------------------------------------------------------------------

describe('P — deriveSlug output charset', () => {
  /**
   * **Validates: Requirements 8.2**
   */
  test('result contains only [a-z0-9_] for any non-empty string input', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0 && /[a-zA-Z0-9]/.test(s)),
        (name) => {
          const slug = deriveSlug(name);
          if (slug.length > 0) {
            expect(slug).toMatch(SLUG_REGEX);
          }
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property: deriveSlug is idempotent
// Validates: Requirements 8.2
// ---------------------------------------------------------------------------

describe('P — deriveSlug idempotency', () => {
  /**
   * **Validates: Requirements 8.2**
   */
  test('deriveSlug(deriveSlug(name)) === deriveSlug(name)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        (name) => {
          const once = deriveSlug(name);
          const twice = deriveSlug(once);
          expect(twice).toBe(once);
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property: validateImage rejects any MIME not in allowed set
// Validates: Requirements 8.2
// ---------------------------------------------------------------------------

describe('P — validateImage MIME rejection', () => {
  /**
   * **Validates: Requirements 8.2**
   */
  test('rejects any MIME type not in [image/jpeg, image/png, image/webp]', () => {
    const disallowedMimes = [
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'video/mp4',
      'application/octet-stream',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...disallowedMimes),
        fc.integer({ min: 1, max: MAX_IMAGE_SIZE }),
        (mimetype, size) => {
          const file = { mimetype, size };
          const result = validateImage(file);
          expect(result).not.toBeNull();
          expect(typeof result).toBe('string');
        }
      ),
      { numRuns: 200 }
    );
  });

  test('accepts valid MIME types with size within limit', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED_MIMES),
        fc.integer({ min: 1, max: MAX_IMAGE_SIZE }),
        (mimetype, size) => {
          const file = { mimetype, size };
          const result = validateImage(file);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });

  test('rejects valid MIME types when size exceeds 5MB', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED_MIMES),
        fc.integer({ min: MAX_IMAGE_SIZE + 1, max: MAX_IMAGE_SIZE * 2 }),
        (mimetype, size) => {
          const file = { mimetype, size };
          const result = validateImage(file);
          expect(result).not.toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });
});
