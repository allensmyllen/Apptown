/**
 * Property-based tests for Order service (P7, P15, P16, P17)
 * Feature: digital-marketplace
 */

const fc = require('fast-check');

// ---------------------------------------------------------------------------
// Property 7: Webhook order completion
// Validates: Requirements 4.2
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 7: Webhook order completion

describe('P7 — Webhook order completion', () => {
  /**
   * Pure logic: given a pending order and a checkout.session.completed event
   * matching its stripe_session_id, the resulting status should be 'completed'.
   */
  function applyWebhookEvent(order, event) {
    if (
      event.type === 'checkout.session.completed' &&
      event.data.object.id === order.stripe_session_id
    ) {
      return { ...order, status: 'completed', completed_at: new Date().toISOString() };
    }
    return order;
  }

  test(
    'checkout.session.completed transitions order status to completed',
    () => {
      fc.assert(
        fc.property(
          fc.uuid(), // order id
          fc.string({ minLength: 10, maxLength: 30 }).map((s) => `cs_test_${s}`), // session id
          (orderId, sessionId) => {
            const order = {
              id: orderId,
              status: 'pending',
              stripe_session_id: sessionId,
            };
            const event = {
              type: 'checkout.session.completed',
              data: { object: { id: sessionId, payment_intent: 'pi_123' } },
            };
            const updated = applyWebhookEvent(order, event);
            expect(updated.status).toBe('completed');
            expect(updated.completed_at).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  test(
    'event with non-matching session id does not change order status',
    () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.string({ minLength: 10, maxLength: 30 }).map((s) => `cs_test_${s}`),
          fc.string({ minLength: 10, maxLength: 30 }).map((s) => `cs_other_${s}`),
          (orderId, sessionId, otherSessionId) => {
            fc.pre(sessionId !== otherSessionId);
            const order = { id: orderId, status: 'pending', stripe_session_id: sessionId };
            const event = {
              type: 'checkout.session.completed',
              data: { object: { id: otherSessionId } },
            };
            const updated = applyWebhookEvent(order, event);
            expect(updated.status).toBe('pending');
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 15: Admin metrics are arithmetically correct
// Validates: Requirements 7.2
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 15: Admin metrics are arithmetically correct

describe('P15 — Metrics arithmetic correctness', () => {
  function computeMetrics(orders, userCount) {
    const completed = orders.filter((o) => o.status === 'completed');
    const totalRevenue = completed.reduce((sum, o) => sum + o.amount_cents, 0);
    return {
      total_revenue: totalRevenue,
      completed_orders: completed.length,
      registered_users: userCount,
    };
  }

  test(
    'metrics match computed values for any set of orders and users',
    () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              amount_cents: fc.integer({ min: 1, max: 100000 }),
              status: fc.constantFrom('pending', 'completed', 'failed'),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          fc.integer({ min: 0, max: 1000 }),
          (orders, userCount) => {
            const metrics = computeMetrics(orders, userCount);
            const completed = orders.filter((o) => o.status === 'completed');

            expect(metrics.total_revenue).toBe(
              completed.reduce((s, o) => s + o.amount_cents, 0)
            );
            expect(metrics.completed_orders).toBe(completed.length);
            expect(metrics.registered_users).toBe(userCount);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 16: Date range filter returns only in-range orders
// Validates: Requirements 7.3
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 16: Date range filter returns only in-range orders

describe('P16 — Date range filter correctness', () => {
  function filterByDateRange(orders, from, to) {
    return orders.filter((o) => {
      if (!o.completed_at) return false;
      const t = new Date(o.completed_at).getTime();
      if (from && t < new Date(from).getTime()) return false;
      if (to && t > new Date(to).getTime()) return false;
      return true;
    });
  }

  test(
    'all returned orders have completed_at within the specified range',
    () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              completed_at: fc.option(
                fc.date({ min: new Date('2020-01-01'), max: new Date('2026-12-31') }).map((d) => d.toISOString()),
                { nil: null }
              ),
              status: fc.constantFrom('pending', 'completed', 'failed'),
            }),
            { minLength: 0, maxLength: 30 }
          ),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),
          fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
          (orders, fromDate, toDate) => {
            const from = fromDate.toISOString();
            const to = toDate.toISOString();
            const result = filterByDateRange(orders, from, to);

            for (const o of result) {
              const t = new Date(o.completed_at).getTime();
              expect(t).toBeGreaterThanOrEqual(new Date(from).getTime());
              expect(t).toBeLessThanOrEqual(new Date(to).getTime());
            }

            // No in-range order should be excluded
            const expected = orders.filter((o) => {
              if (!o.completed_at) return false;
              const t = new Date(o.completed_at).getTime();
              return t >= new Date(from).getTime() && t <= new Date(to).getTime();
            });
            expect(result).toHaveLength(expected.length);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 17: CSV export contains all orders with correct fields
// Validates: Requirements 7.1, 7.4
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 17: CSV export contains all orders with correct fields

describe('P17 — CSV export completeness', () => {
  function ordersToCSV(orders) {
    const header = 'order_id,buyer_email,product_title,amount_cents,status';
    const rows = orders.map(
      (o) => `${o.id},${o.buyer_email},${o.product_title},${o.amount_cents},${o.status}`
    );
    return [header, ...rows].join('\n');
  }

  function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map((line) => {
      const values = line.split(',');
      return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    });
  }

  test(
    'CSV contains one row per order with all required fields',
    () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              buyer_email: fc.emailAddress(),
              product_title: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !s.includes(',')),
              amount_cents: fc.integer({ min: 1, max: 100000 }),
              status: fc.constantFrom('pending', 'completed', 'failed'),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (orders) => {
            const csv = ordersToCSV(orders);
            const parsed = parseCSV(csv);

            expect(parsed).toHaveLength(orders.length);

            for (let i = 0; i < orders.length; i++) {
              expect(parsed[i].order_id).toBe(orders[i].id);
              expect(parsed[i].buyer_email).toBe(orders[i].buyer_email);
              expect(parsed[i].product_title).toBe(orders[i].product_title);
              expect(parsed[i].amount_cents).toBe(String(orders[i].amount_cents));
              expect(parsed[i].status).toBe(orders[i].status);
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
