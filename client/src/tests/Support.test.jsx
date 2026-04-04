/**
 * P15 — Closed ticket never renders a message input
 *
 * **Validates: Requirements 7.4**
 *
 * Property: For any ticket with status = 'closed', the Help Center rendering
 * logic never produces a message input element for that ticket.
 */

import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as fc from 'fast-check';
import Support from '../pages/Support';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@example.com', role: 'user' } }),
}));

jest.mock('../services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

const api = require('../services/api');

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderSupport() {
  return render(
    <MemoryRouter>
      <Support />
    </MemoryRouter>
  );
}

// ── Arbitraries ──────────────────────────────────────────────────────────────

const ticketIdArb = fc.uuid();
const productTitleArb = fc.string({ minLength: 1, maxLength: 80 });
const messageArb = fc.string({ minLength: 1, maxLength: 200 });
const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') })
  .map((d) => d.toISOString());

const closedTicketArb = fc.record({
  id: ticketIdArb,
  product_title: productTitleArb,
  status: fc.constant('closed'),
  created_at: dateArb,
  latest_message: fc.option(messageArb, { nil: null }),
  unread_count: fc.nat(5).map(String),
});

const messagesArb = fc.array(
  fc.record({
    id: fc.uuid(),
    sender_role: fc.constantFrom('user', 'admin'),
    body: messageArb,
    sender_name: fc.string({ minLength: 1, maxLength: 40 }),
    created_at: dateArb,
  }),
  { minLength: 0, maxLength: 5 }
);

// ── P15 Property Test ─────────────────────────────────────────────────────────

describe('P15 — Closed ticket never renders a message input', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('property: no textarea/input for sending messages when ticket is closed', async () => {
    await fc.assert(
      fc.asyncProperty(closedTicketArb, messagesArb, async (closedTicket, messages) => {
        // Mock API: tickets list returns the closed ticket; messages returns generated messages
        api.get.mockImplementation((url) => {
          if (url === '/support-tickets') {
            return Promise.resolve({ data: { tickets: [closedTicket] } });
          }
          if (url.startsWith('/support-tickets/') && url.endsWith('/messages')) {
            return Promise.resolve({ data: { messages } });
          }
          // payment verification — not triggered in this test
          return Promise.resolve({ data: {} });
        });

        let container;
        await act(async () => {
          ({ container } = renderSupport());
        });

        // Wait for tickets to load (ticketsLoading → false)
        await act(async () => {});

        // Find the ticket button and click it to expand the chat thread
        const ticketButton = container.querySelector('button[class*="bg-gray-50"]');
        if (!ticketButton) {
          // Tickets rendered — find by product title text
          const btn = screen.queryByText(closedTicket.product_title);
          if (btn) {
            await act(async () => { btn.closest('button')?.click(); });
          }
        } else {
          await act(async () => { ticketButton.click(); });
        }

        // Wait for messages to load
        await act(async () => {});

        // Assert: no text input for sending a reply is present
        const replyInput = container.querySelector('input[placeholder="Type a message…"]');
        expect(replyInput).toBeNull();

        // Assert: no Send button is present inside the chat thread
        const sendButton = screen.queryByRole('button', { name: /^send$/i });
        expect(sendButton).toBeNull();

        // Assert: closed notice is shown
        expect(screen.getByText(/this ticket is closed/i)).toBeTruthy();

        // Cleanup between runs
        container.remove();
      }),
      { numRuns: 100 }
    );
  });
});
