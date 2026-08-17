import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiFetch,
  createAdminCoupon,
  loadAdminCoupon,
  loadAdminCoupons,
  runAdminCouponAction,
} from '../../api/client';
import AdminCouponsSection from './AdminCouponsSection';

vi.mock('../../api/client', () => ({
  apiFetch: vi.fn(),
  createAdminCoupon: vi.fn(),
  loadAdminCoupon: vi.fn(),
  loadAdminCoupons: vi.fn(),
  runAdminCouponAction: vi.fn(),
  updateAdminCoupon: vi.fn(),
}));

const activeCoupon = {
  id: 1,
  code: 'JAR10',
  name: 'Jarná zľava',
  kind: 'manual',
  status: 'active',
  lifecycleState: 'active',
  discountType: 'percent_off',
  percentOff: 10,
  amountOff: null,
  currency: 'eur',
  scope: 'all',
  productSlug: null,
  variantCode: null,
  minimumAmount: null,
  maxRedemptions: 100,
  redemptionCount: 4,
  timesRedeemed: 4,
  totalDiscounted: 1200,
  activeReservations: 1,
  allowWithSales: false,
  claimRequired: false,
  claimType: null,
  version: 2,
  syncVersion: 2,
  syncStatus: 'synced',
  isCurrentVersionSynced: true,
};

const errorCoupon = {
  ...activeCoupon,
  id: 2,
  code: 'VIP20',
  name: 'VIP zľava',
  lifecycleState: 'sync_error',
  percentOff: 20,
  version: 3,
  syncVersion: 2,
  syncStatus: 'error',
  isCurrentVersionSynced: false,
  syncErrorCode: 'stripe_coupon_sync_failed',
};

const archivedCoupon = {
  ...activeCoupon,
  id: 3,
  code: 'OLD10',
  name: 'Archivovaný kupón',
  status: 'archived',
  lifecycleState: 'archived',
  archivedAt: '2026-08-17T09:00:00.000Z',
};

const detailFor = (coupon) => ({
  coupon,
  versions: [{ id: `${coupon.id}-v`, version: coupon.version, syncStatus: coupon.syncStatus, createdAt: '2026-08-17T10:00:00.000Z' }],
  redemptions: [],
  reservations: [],
  claimStats: { total: 0, available: 0, reserved: 0, consumed: 0, revoked: 0 },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiFetch).mockResolvedValue({ products: [{ slug: 'guide', name: 'Guide', colorVariants: [] }] });
  vi.mocked(loadAdminCoupons).mockResolvedValue({
    coupons: [activeCoupon, errorCoupon, archivedCoupon],
    stateCounts: { active: 1, sync_error: 1, archived: 1 },
  });
  vi.mocked(loadAdminCoupon).mockImplementation(async (id) => detailFor(id === 2 ? errorCoupon : activeCoupon));
});

describe('AdminCouponsSection', () => {
  it('lists, searches, and filters lifecycle states accessibly', async () => {
    render(<AdminCouponsSection />);
    expect(await screen.findByRole('button', { name: /JAR10/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /VIP20/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /OLD10/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Stav kupónu')).toHaveValue('current');

    await userEvent.selectOptions(screen.getByLabelText('Stav kupónu'), 'sync_error');
    expect(screen.queryByRole('button', { name: /JAR10/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /VIP20/ })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Stav kupónu'), 'all');
    expect(screen.getByRole('button', { name: /OLD10/ })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Hľadať kupón'), 'jarná');
    expect(screen.getByRole('button', { name: /JAR10/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /VIP20/ })).not.toBeInTheDocument();
  });

  it('shows sync failure detail and exposes retry as recovery action', async () => {
    vi.mocked(runAdminCouponAction).mockResolvedValue({ coupon: { ...errorCoupon, syncStatus: 'synced', syncVersion: 3, isCurrentVersionSynced: true }, sync: { ok: true } });
    render(<AdminCouponsSection />);
    await userEvent.click(await screen.findByRole('button', { name: /VIP20/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/aktuálna verzia nie je použiteľná/i);

    await userEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: /obnoviť synchronizáciu/i }));
    await waitFor(() => expect(runAdminCouponAction).toHaveBeenCalledWith(2, 'retry-sync'));
    expect(await screen.findByText(/aktuálna verzia je synchronizovaná/i)).toBeInTheDocument();
  });

  it('creates with automatic sync and archives without destructive delete', async () => {
    const created = { ...activeCoupon, id: 3, code: 'NOVY15', name: 'Nový kupón', status: 'draft', lifecycleState: 'draft', version: 1 };
    vi.mocked(createAdminCoupon).mockResolvedValue({ coupon: created, sync: { ok: true } });
    vi.mocked(loadAdminCoupon).mockImplementation(async (id) => detailFor(id === 3 ? created : activeCoupon));
    vi.mocked(runAdminCouponAction).mockResolvedValue({ coupon: { ...activeCoupon, status: 'archived', lifecycleState: 'archived', archivedAt: '2026-08-17T12:00:00.000Z' }, sync: { ok: true } });

    render(<AdminCouponsSection />);
    await screen.findByRole('button', { name: /JAR10/ });
    await userEvent.click(screen.getByRole('button', { name: /nový kupón/i }));
    await userEvent.type(screen.getByLabelText(/kód/i), 'novy15');
    await userEvent.type(screen.getByLabelText(/názov/i), 'Nový kupón');
    await userEvent.click(screen.getByRole('button', { name: /uložiť a synchronizovať/i }));

    await waitFor(() => expect(createAdminCoupon).toHaveBeenCalledWith(expect.objectContaining({
      code: 'NOVY15',
      name: 'Nový kupón',
      status: 'draft',
    })));
    expect(await screen.findByText(/je uložený a jeho aktuálna verzia je synchronizovaná/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /JAR10/ }));
    await userEvent.click(await screen.findByRole('button', { name: /archivovať/i }));
    const dialog = screen.getByRole('dialog', { name: /archivovať kupón/i });
    expect(within(dialog).getByText(/história a objednávky zostanú zachované/i)).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /zrušiť/i })).toHaveFocus());
    await userEvent.click(within(dialog).getByRole('button', { name: /^archivovať kupón$/i }));
    await waitFor(() => expect(runAdminCouponAction).toHaveBeenCalledWith(1, 'archive'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps lifecycle actions reversible until the accessible confirmation is accepted', async () => {
    render(<AdminCouponsSection />);
    await userEvent.click(await screen.findByRole('button', { name: /JAR10/ }));
    await userEvent.click(await screen.findByRole('button', { name: /pozastaviť/i }));

    const dialog = screen.getByRole('dialog', { name: /pozastaviť kupón/i });
    expect(within(dialog).getByText(/zákazníci prestanú môcť používať/i)).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /zrušiť/i })).toHaveFocus());
    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(runAdminCouponAction).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: /pozastaviť/i })).toHaveFocus());
  });
});
