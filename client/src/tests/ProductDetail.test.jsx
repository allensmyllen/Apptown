/**
 * Unit test — Preview_Link renders with target="_blank"
 * Requirements: 3.5
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import ProductDetail from '../pages/ProductDetail';

// Mock api module
jest.mock('../services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

const api = require('../services/api');

function renderWithRouter(productId) {
  return render(
    <MemoryRouter initialEntries={[`/products/${productId}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/products/:id" element={<ProductDetail />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Req 3.5 — Preview_Link renders with target="_blank"', () => {
  test('preview_link renders as <a> with target="_blank" and rel="noopener noreferrer"', async () => {
    api.get.mockResolvedValue({
      data: {
        id: 'prod-1',
        title: 'Test Product',
        description: 'A product',
        price_cents: 999,
        category: 'theme',
        preview_link: 'https://example.com/preview',
      },
    });

    renderWithRouter('prod-1');

    const link = await screen.findByRole('link', { name: /live preview/i });
    expect(link).toHaveAttribute('href', 'https://example.com/preview');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('no preview link rendered when preview_link is null', async () => {
    api.get.mockResolvedValue({
      data: {
        id: 'prod-2',
        title: 'No Preview',
        description: 'No preview link',
        price_cents: 499,
        category: 'plugin',
        preview_link: null,
      },
    });

    renderWithRouter('prod-2');

    await screen.findByText('No Preview');
    expect(screen.queryByRole('link', { name: /live preview/i })).toBeNull();
  });
});
