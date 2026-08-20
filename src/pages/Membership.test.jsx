import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createMembershipCheckout,
  loadMembershipCategories,
  loadMembershipOffer,
  loadMembershipMemberCount,
  loadMembershipPosts,
  loadMembershipSession,
  requestMembershipCode,
  verifyMembershipCode,
} from '../api/client';
import Membership from './Membership';
import { parseMembershipLoginHandoff } from '../utils/membershipLoginHandoff';

vi.mock('../api/client', () => ({
  createMembershipBillingPortal: vi.fn(),
  createMembershipCheckout: vi.fn(),
  loadMembershipCategories: vi.fn(),
  loadMembershipOffer: vi.fn(),
  loadMembershipMemberCount: vi.fn(),
  loadMembershipPosts: vi.fn(),
  loadMembershipSession: vi.fn(),
  logoutMembership: vi.fn(),
  requestMembershipCode: vi.fn(),
  setMembershipPostSaved: vi.fn(),
  verifyMembershipCode: vi.fn(),
}));

const renderPage = (route = '/klub', props = {}) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Membership {...props} />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadMembershipOffer).mockResolvedValue({
    available: true,
    unitAmount: 299,
    currency: 'eur',
    interval: 'month',
  });
  vi.mocked(loadMembershipCategories).mockResolvedValue([]);
  vi.mocked(loadMembershipMemberCount).mockResolvedValue(0);
  vi.mocked(loadMembershipPosts).mockResolvedValue({
    access: 'preview',
    posts: [],
    nextCursor: null,
  });
});

describe('Membership', () => {
  it('presents the member count as an icon badge', async () => {
    vi.mocked(loadMembershipSession).mockResolvedValue({ isAuthenticated: false });
    vi.mocked(loadMembershipMemberCount).mockResolvedValue(12);

    renderPage();

    const memberProof = await screen.findByRole('status', {
      name: '12 členov je už v klube.',
    });
    expect(memberProof).toHaveClass('membership-member-proof');
    expect(memberProof.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('shows the offer and requests a passwordless login code', async () => {
    const user = userEvent.setup();
    vi.mocked(loadMembershipSession).mockResolvedValue({ isAuthenticated: false });
    vi.mocked(requestMembershipCode).mockResolvedValue({ ok: true });

    renderPage();

    expect(await screen.findByRole('heading', { name: /Istota v starostlivosti/i })).toBeInTheDocument();
    expect(screen.getAllByText(/^2,99/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Zaplatíte prvý mesiac a druhý získate zadarmo/i)
    ).toBeInTheDocument();

    const loginEmail = screen.getByLabelText(/Členský e-mail/i);
    await user.type(loginEmail, 'member@example.com');
    await user.click(screen.getByRole('button', { name: /Poslať kód/i }));

    expect(requestMembershipCode).toHaveBeenCalledWith('member@example.com');
    expect(await screen.findByLabelText(/6-miestny kód/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Poslať kód znova (30 s)' })
    ).toBeDisabled();
  });

  it('resends a code after a wrong-code error, preserves the normalized email, and clears the field', async () => {
    const user = userEvent.setup();
    vi.mocked(loadMembershipSession).mockResolvedValue({ isAuthenticated: false });
    vi.mocked(requestMembershipCode)
      .mockResolvedValueOnce({ ok: true, resendCooldownSeconds: 0 })
      .mockResolvedValueOnce({ ok: true, resendCooldownSeconds: 30 });
    vi.mocked(verifyMembershipCode).mockRejectedValue({ data: { error: 'invalid_code' } });

    renderPage();

    await user.type(await screen.findByLabelText(/Členský e-mail/i), ' MEMBER@Example.com ');
    await user.click(screen.getByRole('button', { name: 'Poslať kód' }));
    await user.type(screen.getByLabelText(/6-miestny kód z e-mailu/i), '111111');
    await user.click(screen.getByRole('button', { name: 'Overiť a pokračovať' }));
    expect(await screen.findByText(/Kód nie je správny/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Poslať kód znova' }));

    expect(requestMembershipCode).toHaveBeenLastCalledWith('member@example.com');
    expect(screen.getByLabelText(/6-miestny kód z e-mailu/i)).toHaveValue('');
    expect(
      await screen.findByText('Poslali sme nový 6-miestny kód. Predchádzajúce kódy už neplatia.')
    ).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByLabelText(/6-miestny kód z e-mailu/i));
  });

  it('opens the email handoff in prepared code-entry state without leaving the secret in the URL', async () => {
    vi.mocked(loadMembershipSession).mockResolvedValue({ isAuthenticated: false });
    window.history.replaceState(
      null,
      '',
      '/klub#membership-login=1&email=MEMBER%40example.com&code=123456'
    );

    renderPage();

    expect(await screen.findByDisplayValue('123456')).toBeInTheDocument();
    expect(screen.getByLabelText(/6-miestny kód z e-mailu/i)).toBeInTheDocument();
    expect(window.location.hash).toBe('');
    expect(
      screen.getByText('Kód z e-mailu sme predvyplnili. Potvrďte prihlásenie.')
    ).toBeInTheDocument();
  });

  it('accepts only a complete, valid email handoff fragment', () => {
    expect(
      parseMembershipLoginHandoff('#membership-login=1&email=MEMBER%40example.com&code=123456')
    ).toEqual({ email: 'member@example.com', code: '123456' });
    expect(parseMembershipLoginHandoff('#membership-login=1&email=member@example.com&code=12'))
      .toBeNull();
    expect(parseMembershipLoginHandoff('#email=member@example.com&code=123456')).toBeNull();
  });

  it('keeps the unlinked login-only route free of offer, category, and post data', async () => {
    vi.mocked(loadMembershipSession).mockResolvedValue({ isAuthenticated: false });

    renderPage('/klub/prihlasenie', { loginOnly: true });

    expect(await screen.findByRole('heading', { name: /prihlásenie do členskej zóny/i })).toBeInTheDocument();
    expect(loadMembershipOffer).not.toHaveBeenCalled();
    expect(loadMembershipCategories).not.toHaveBeenCalled();
    expect(loadMembershipPosts).not.toHaveBeenCalled();
    expect(screen.queryByText(/jedno jednoduché členstvo/i)).not.toBeInTheDocument();
  });

  it('does not redirect-loop an authenticated account without active access', async () => {
    vi.mocked(loadMembershipSession).mockResolvedValue({
      isAuthenticated: true,
      hasAccess: false,
      member: { id: 18, email: 'inactive@example.com' },
    });

    renderPage('/klub/prihlasenie', { loginOnly: true });

    expect(
      await screen.findByRole('heading', { name: /členstvo nie je aktívne/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /použiť iný e-mail/i })).toBeInTheDocument();
  });

  it('starts the purchase with email verification before Stripe', async () => {
    const user = userEvent.setup();
    vi.mocked(loadMembershipSession).mockResolvedValue({ isAuthenticated: false });
    vi.mocked(requestMembershipCode).mockResolvedValue({ ok: true });

    renderPage();

    const signupEmail = await screen.findByLabelText(/E-mail pre členstvo/i);
    await user.type(signupEmail, 'new-member@example.com');
    await user.click(screen.getByRole('button', { name: /Pokračovať k platbe/i }));

    expect(requestMembershipCode).toHaveBeenCalledWith('new-member@example.com');
    expect(createMembershipCheckout).not.toHaveBeenCalled();
    expect(await screen.findByLabelText(/6-miestny kód/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Overiť a prejsť k platbe/i })).toBeInTheDocument();
  });

  it('continues directly to checkout after the purchase code is verified', async () => {
    const user = userEvent.setup();
    vi.mocked(loadMembershipSession).mockResolvedValue({ isAuthenticated: false });
    vi.mocked(requestMembershipCode).mockResolvedValue({ ok: true });
    vi.mocked(verifyMembershipCode).mockResolvedValue({
      isAuthenticated: true,
      hasAccess: false,
      member: { id: 8, email: 'new-member@example.com' },
    });
    vi.mocked(createMembershipCheckout).mockRejectedValue({
      data: { error: 'membership_checkout_unavailable' },
    });

    renderPage();

    await user.type(await screen.findByLabelText(/E-mail pre členstvo/i), 'new-member@example.com');
    await user.click(screen.getByRole('button', { name: /Pokračovať k platbe/i }));
    await user.type(screen.getByLabelText(/Členský e-mail/i), 'existing-member@example.com');
    await user.type(await screen.findByLabelText(/6-miestny kód/i), '123456');
    await user.click(screen.getByRole('button', { name: /Overiť a prejsť k platbe/i }));

    expect(verifyMembershipCode).toHaveBeenCalledWith({
      email: 'new-member@example.com',
      code: '123456',
    });
    expect(createMembershipCheckout).toHaveBeenCalledWith('new-member@example.com', 'monthly');
    expect(
      await screen.findByText(/Členstvo sa práve nedá objednať/i)
    ).toBeInTheDocument();
  });

  it('keeps the annual one-time option selected through email verification', async () => {
    const user = userEvent.setup();
    vi.mocked(loadMembershipOffer).mockResolvedValue({
      available: true,
      salesEnabled: true,
      plans: [
        {
          key: 'monthly',
          available: true,
          configured: true,
          unitAmount: 299,
          effectiveMonthlyUnitAmount: 299,
          currency: 'eur',
          billingMode: 'subscription',
        },
        {
          key: 'annual',
          available: true,
          configured: true,
          unitAmount: 2990,
          effectiveMonthlyUnitAmount: 2990 / 12,
          currency: 'eur',
          billingMode: 'payment',
          termMonths: 12,
          monthsFree: 2,
          renewsAutomatically: false,
        },
      ],
    });
    vi.mocked(loadMembershipSession).mockResolvedValue({ isAuthenticated: false });
    vi.mocked(requestMembershipCode).mockResolvedValue({ ok: true });
    vi.mocked(verifyMembershipCode).mockResolvedValue({
      isAuthenticated: true,
      hasAccess: false,
      member: { id: 88, email: 'annual@example.com' },
    });
    vi.mocked(createMembershipCheckout).mockRejectedValue({
      data: { error: 'membership_checkout_unavailable' },
    });

    renderPage();

    const annualOption = await screen.findByRole('radio', { name: /Na rok/i });
    await user.click(annualOption);
    expect(annualOption).toBeChecked();
    expect(screen.getByText(/2 mesiace zdarma/i)).toBeInTheDocument();
    expect(screen.getByText(/≈ 2,49 € \/ mesiac · jednorazová platba/i)).toBeInTheDocument();
    expect(screen.getByText(/Platba sa automaticky neobnoví/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/E-mail pre členstvo/i), 'annual@example.com');
    await user.click(screen.getByRole('button', { name: /Pokračovať k platbe/i }));
    await user.type(await screen.findByLabelText(/6-miestny kód/i), '123456');
    await user.click(screen.getByRole('button', { name: /Overiť a prejsť k platbe/i }));

    expect(createMembershipCheckout).toHaveBeenCalledWith('annual@example.com', 'annual');
  });

  it('selects and submits annual when it is the only available offer plan', async () => {
    const user = userEvent.setup();
    vi.mocked(loadMembershipOffer).mockResolvedValue({
      available: true,
      salesEnabled: true,
      plans: [{
        key: 'annual',
        available: true,
        configured: true,
        unitAmount: 2990,
        effectiveMonthlyUnitAmount: 2990 / 12,
        currency: 'eur',
        billingMode: 'payment',
        termMonths: 12,
        monthsFree: 2,
        renewsAutomatically: false,
      }],
    });
    vi.mocked(loadMembershipSession).mockResolvedValue({ isAuthenticated: false });
    vi.mocked(requestMembershipCode).mockResolvedValue({ ok: true });
    vi.mocked(verifyMembershipCode).mockResolvedValue({
      isAuthenticated: true,
      hasAccess: false,
      member: { id: 89, email: 'annual-only@example.com' },
    });
    vi.mocked(createMembershipCheckout).mockRejectedValue({
      data: { error: 'membership_checkout_unavailable' },
    });

    renderPage();

    const annualOption = await screen.findByRole('radio', { name: /Na rok/i });
    expect(annualOption).toBeChecked();
    expect(screen.getByText(/Platba sa automaticky neobnoví/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/E-mail pre členstvo/i), 'annual-only@example.com');
    await user.click(screen.getByRole('button', { name: /Pokračovať k platbe/i }));
    await user.type(await screen.findByLabelText(/6-miestny kód/i), '123456');
    await user.click(screen.getByRole('button', { name: /Overiť a prejsť k platbe/i }));

    expect(createMembershipCheckout).toHaveBeenCalledWith('annual-only@example.com', 'annual');
  });

  it('opens allowlisted prelaunch test access after real email verification without Checkout', async () => {
    const user = userEvent.setup();
    vi.mocked(loadMembershipOffer).mockResolvedValue({
      available: false,
      testAccessEnabled: true,
      unitAmount: 299,
      currency: 'eur',
      interval: 'month',
    });
    vi.mocked(loadMembershipSession).mockResolvedValue({ isAuthenticated: false });
    vi.mocked(requestMembershipCode).mockResolvedValue({ ok: true });
    vi.mocked(verifyMembershipCode).mockResolvedValue({
      isAuthenticated: true,
      hasAccess: true,
      testAccess: true,
      member: { id: 12, email: 'mar.cincura@gmail.com', hasStripeCustomer: false },
      subscription: null,
    });
    vi.mocked(loadMembershipPosts).mockResolvedValue({
      access: 'full',
      nextCursor: null,
      posts: [
        {
          id: 14,
          slug: 'testovaci-clensky-material',
          title: 'Testovací členský materiál',
          excerpt: 'Viditeľný v bezpečnom QA prístupe.',
          assetTypes: ['document'],
          commentCount: 0,
          locked: false,
          isSaved: false,
        },
      ],
    });

    renderPage();

    await user.type(
      await screen.findByLabelText(/E-mail pre členstvo/i),
      'mar.cincura@gmail.com'
    );
    await user.click(screen.getByRole('button', { name: /Otestovať členský prístup/i }));
    await user.type(await screen.findByLabelText(/6-miestny kód/i), '123456');
    await user.click(
      screen.getByRole('button', { name: /Overiť a otvoriť testovací prístup/i })
    );

    expect(requestMembershipCode).toHaveBeenCalledWith('mar.cincura@gmail.com');
    expect(createMembershipCheckout).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Testovací prístup je aktívny. Žiadna platba neprebehla.')
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Testovací členský materiál' })
    ).toBeInTheDocument();
  });

  it('opens permanent complimentary access through passwordless member login', async () => {
    const user = userEvent.setup();
    vi.mocked(loadMembershipSession).mockResolvedValue({ isAuthenticated: false });
    vi.mocked(requestMembershipCode).mockResolvedValue({ ok: true });
    vi.mocked(verifyMembershipCode).mockResolvedValue({
      isAuthenticated: true,
      hasAccess: true,
      complimentaryAccess: true,
      testAccess: false,
      member: {
        id: 18,
        email: 'stanka.cirmanova@gmail.com',
        hasStripeCustomer: false,
      },
      subscription: null,
    });

    renderPage();

    await user.type(
      await screen.findByLabelText(/Členský e-mail/i),
      'stanka.cirmanova@gmail.com'
    );
    await user.click(screen.getByRole('button', { name: 'Poslať kód' }));
    await user.type(screen.getByLabelText(/6-miestny kód z e-mailu/i), '123456');
    await user.click(
      screen.getByRole('button', { name: 'Overiť a pokračovať' })
    );

    expect(requestMembershipCode).toHaveBeenCalledWith(
      'stanka.cirmanova@gmail.com'
    );
    expect(createMembershipCheckout).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Bezplatné členstvo je aktívne. Vitajte v klube.')
    ).toBeInTheDocument();
    expect(screen.getByText('Máte trvalý prístup ku klubovému obsahu bez platby.'))
      .toBeInTheDocument();
  });

  it('shows the fixed end date and no subscription controls for annual access', async () => {
    vi.mocked(loadMembershipSession).mockResolvedValue({
      isAuthenticated: true,
      hasAccess: true,
      complimentaryAccess: false,
      testAccess: false,
      member: {
        id: 31,
        email: 'annual@example.com',
        hasStripeCustomer: true,
      },
      subscription: null,
      fixedTerm: {
        grantsAccess: true,
        status: 'active',
        endsAt: '2027-08-20T12:00:00.000Z',
      },
    });

    renderPage();

    expect(await screen.findByText('Ročný prístup je aktívny')).toBeInTheDocument();
    expect(screen.getByText(/Prístup máte do 20\. augusta 2027/i)).toBeInTheDocument();
    expect(screen.getByText(/Jednorazová ročná platba/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Spravovať členstvo/i })).not.toBeInTheDocument();
  });

  it('shows a non-duplicating confirmation state while Stripe access syncs', async () => {
    vi.mocked(loadMembershipSession).mockResolvedValue({
      isAuthenticated: true,
      hasAccess: false,
      member: { id: 9, email: 'pending@example.com', hasStripeCustomer: true },
      subscription: null,
    });

    renderPage('/klub?checkout=success');

    expect(await screen.findByText(/Potvrdzujeme platbu/i)).toBeInTheDocument();
    expect(screen.getByText(/Zvyčajne to trvá iba niekoľko sekúnd/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aktivovať členstvo/i })).not.toBeInTheDocument();
  });

  it('does not render discovery controls for a logged-in member without content access', async () => {
    vi.mocked(loadMembershipSession).mockResolvedValue({
      isAuthenticated: true,
      hasAccess: false,
      member: { id: 21, email: 'sorkasorinka@gmail.com', hasStripeCustomer: true },
      subscription: null,
    });
    vi.mocked(loadMembershipCategories).mockResolvedValue([
      { id: 2, name: 'Začíname', slug: 'zaciname' },
    ]);
    vi.mocked(loadMembershipPosts).mockResolvedValue({
      access: 'preview',
      nextCursor: null,
      posts: [],
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Zajkológia klub' })).toBeInTheDocument();
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Všetko' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Začíname' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Videá' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Audio' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'PDF a knihy' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Obrázky' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Diskusia' })).not.toBeInTheDocument();
  });

  it('keeps full-access discovery controls visible and applies search and filters', async () => {
    const user = userEvent.setup();
    vi.mocked(loadMembershipSession).mockResolvedValue({
      isAuthenticated: true,
      hasAccess: true,
      member: { id: 22, email: 'member@example.com', hasStripeCustomer: true },
      subscription: { status: 'active', grantsAccess: true },
    });
    vi.mocked(loadMembershipCategories).mockResolvedValue([
      { id: 2, name: 'Začíname', slug: 'zaciname' },
    ]);
    vi.mocked(loadMembershipPosts).mockResolvedValue({
      access: 'full',
      nextCursor: null,
      posts: [],
    });

    renderPage();

    const search = await screen.findByRole('searchbox', { name: 'Hľadať v klube' });
    const discussionLink = screen.getByRole('link', { name: 'Diskusia' });
    expect(discussionLink).toHaveAttribute('href', '/klub/diskusia');
    expect(discussionLink).toHaveClass('membership-feed__filter');
    expect(discussionLink.closest('.membership-feed__filters')).not.toBeNull();
    expect(screen.getAllByRole('button', { name: 'Všetko' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Začíname' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Videá' })).toBeInTheDocument();

    await user.type(search, 'králik');
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(loadMembershipPosts).toHaveBeenLastCalledWith({
        q: 'králik',
        category: '',
        type: '',
        saved: false,
      })
    );

    await user.click(screen.getByRole('button', { name: 'Videá' }));
    await waitFor(() =>
      expect(loadMembershipPosts).toHaveBeenLastCalledWith({
        q: 'králik',
        category: '',
        type: 'video',
        saved: false,
      })
    );

    await user.click(screen.getByRole('button', { name: 'Začíname' }));
    await waitFor(() =>
      expect(loadMembershipPosts).toHaveBeenLastCalledWith({
        q: 'králik',
        category: 'zaciname',
        type: 'video',
        saved: false,
      })
    );
  });

  it('resets paginated results for a new Slovak search and only renders the new page', async () => {
    const user = userEvent.setup();
    vi.mocked(loadMembershipSession).mockResolvedValue({
      isAuthenticated: true,
      hasAccess: true,
      member: { id: 22, email: 'member@example.com', hasStripeCustomer: true },
      subscription: { status: 'active', grantsAccess: true },
    });
    vi.mocked(loadMembershipPosts)
      .mockResolvedValueOnce({
        access: 'full',
        nextCursor: 'next-page',
        posts: [{ id: 1, slug: 'stary', title: 'Starý výsledok', assetTypes: [], locked: false }],
      })
      .mockResolvedValueOnce({
        access: 'full',
        nextCursor: null,
        posts: [{ id: 2, slug: 'zajačik', title: 'Zajačik a výživa', assetTypes: [], locked: false }],
      });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Starý výsledok' })).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Hľadať v klube' }), 'zajačik');
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: 'Zajačik a výživa' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Starý výsledok' })).not.toBeInTheDocument();
    expect(loadMembershipPosts).toHaveBeenLastCalledWith({
      q: 'zajačik',
      category: '',
      type: '',
      saved: false,
    });
  });

  it('shows a retryable error state when a member search fails', async () => {
    const user = userEvent.setup();
    vi.mocked(loadMembershipSession).mockResolvedValue({
      isAuthenticated: true,
      hasAccess: true,
      member: { id: 22, email: 'member@example.com', hasStripeCustomer: true },
      subscription: { status: 'active', grantsAccess: true },
    });
    vi.mocked(loadMembershipPosts)
      .mockRejectedValueOnce({ data: { error: 'membership_publishing_not_migrated' } })
      .mockResolvedValueOnce({ access: 'full', nextCursor: null, posts: [] });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Príspevky sa nepodarilo načítať/i);
    await user.click(screen.getByRole('button', { name: 'Skúsiť znova' }));
    await waitFor(() => expect(loadMembershipPosts).toHaveBeenCalledTimes(2));
  });

  it('unlocks the portal when the Stripe confirmation poll grants access', async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(loadMembershipSession)
        .mockResolvedValueOnce({
          isAuthenticated: true,
          hasAccess: false,
          member: { id: 10, email: 'pending@example.com', hasStripeCustomer: true },
          subscription: null,
        })
        .mockResolvedValueOnce({
          isAuthenticated: true,
          hasAccess: true,
          member: { id: 10, email: 'pending@example.com', hasStripeCustomer: true },
          subscription: {
            status: 'active',
            grantsAccess: true,
            currentPeriodEnd: '2026-08-29T00:00:00.000Z',
          },
        });
      vi.mocked(loadMembershipPosts).mockResolvedValue({
        access: 'full',
        nextCursor: null,
        posts: [
          {
            id: 11,
            slug: 'cerstvo-odomknuty-material',
            title: 'Čerstvo odomknutý materiál',
            excerpt: 'Obsah sprístupnený po potvrdení platby.',
            assetTypes: ['document'],
            commentCount: 0,
            locked: false,
            isSaved: false,
          },
        ],
      });

      renderPage('/klub?checkout=success');

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.getByText(/Potvrdzujeme platbu/i)).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1200);
      });

      expect(screen.getByText(/Členstvo je aktívne/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Čerstvo odomknutý materiál' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders protected member content for an active session', async () => {
    vi.mocked(loadMembershipSession).mockResolvedValue({
      isAuthenticated: true,
      hasAccess: true,
      member: { id: 7, email: 'member@example.com' },
      subscription: {
        status: 'active',
        grantsAccess: true,
        currentPeriodEnd: '2026-08-29T00:00:00.000Z',
      },
    });
    vi.mocked(loadMembershipPosts).mockResolvedValue({
      access: 'full',
      nextCursor: null,
      posts: [
        {
          id: 4,
          slug: 'letna-starostlivost',
          title: 'Letná starostlivosť',
          excerpt: 'Praktický členský materiál.',
          assetTypes: ['document'],
          commentCount: 0,
          locked: false,
          isSaved: false,
        },
      ],
    });

    renderPage();

    expect(await screen.findByText(/Členstvo je aktívne/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Letná starostlivosť' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Letná starostlivosť/i })).toHaveAttribute(
      'href',
      '/klub/letna-starostlivost'
    );
  });
});
