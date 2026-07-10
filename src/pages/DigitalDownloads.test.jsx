import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  downloadDigitalDeliveryFile,
  loadDigitalDeliveryClaim,
  sendDigitalDeliveryCode,
  verifyDigitalDeliveryCode,
} from '../api/client';
import DigitalDownloads from './DigitalDownloads';

vi.mock('../api/client', () => ({
  downloadDigitalDeliveryFile: vi.fn(),
  loadDigitalDeliveryClaim: vi.fn(),
  sendDigitalDeliveryCode: vi.fn(),
  verifyDigitalDeliveryCode: vi.fn(),
}));

const renderPortal = () =>
  render(
    <MemoryRouter initialEntries={['/downloads/claim-token']}>
      <Routes>
        <Route path="/downloads/:token" element={<DigitalDownloads />} />
      </Routes>
    </MemoryRouter>
  );

const summary = {
  order: {
    id: 'order-1',
    productName: 'Košík',
  },
  maskedEmail: 'bu...@example.com',
  accessStatus: 'available',
  verifiedSessionTtlMinutes: 30,
  links: [
    {
      id: 1,
      productName: 'Digital Journal',
      filename: 'journal-sk.pdf',
      expiresAt: '2026-08-01T12:00:00.000Z',
      downloadCount: 0,
      maxDownloads: null,
      status: 'available',
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DigitalDownloads', () => {
  it('requests a code, verifies it, and downloads with the verified session', async () => {
    const user = userEvent.setup();
    vi.mocked(loadDigitalDeliveryClaim).mockResolvedValue(summary);
    vi.mocked(sendDigitalDeliveryCode).mockResolvedValue({ maskedEmail: 'bu...@example.com' });
    vi.mocked(verifyDigitalDeliveryCode).mockResolvedValue({
      sessionToken: 'session-token',
      ttlMinutes: 30,
    });
    vi.mocked(downloadDigitalDeliveryFile).mockResolvedValue(undefined);

    renderPortal();

    expect(await screen.findByText(/Digital Journal/)).toBeInTheDocument();
    expect(screen.getByText(/bez limitu/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Poslať kód/i }));
    expect(await screen.findByText(/Kód sme poslali/)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/6-miestny kód/i), '123456');
    await user.click(screen.getByRole('button', { name: /Overiť/i }));
    expect(await screen.findByText(/Overenie je aktívne/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Stiahnuť/i }));
    expect(downloadDigitalDeliveryFile).toHaveBeenCalledWith({
      deliveryLinkId: 1,
      sessionToken: 'session-token',
      filename: 'journal-sk.pdf',
    });
  });

  it('shows a friendly invalid link state', async () => {
    const error = new Error('invalid_token');
    error.data = { error: 'invalid_token' };
    vi.mocked(loadDigitalDeliveryClaim).mockRejectedValue(error);

    renderPortal();

    expect(await screen.findByText(/Stiahnutie nie je dostupné/)).toBeInTheDocument();
    expect(screen.getByText(/Odkaz nie je platný/)).toBeInTheDocument();
  });
});
