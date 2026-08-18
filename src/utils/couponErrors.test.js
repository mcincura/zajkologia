import { describe, expect, it } from 'vitest';

import {
  getCouponErrorMessage,
  normalizeCouponCode,
} from './couponErrors';

describe('checkout coupon messages', () => {
  it('normalizes manual codes exactly like the server contract', () => {
    expect(normalizeCouponCode('  save 20\n')).toBe('SAVE20');
  });

  it.each([
    ['coupon_invalid', 'nepoznáme'],
    ['coupon_inactive', 'nie je aktívny'],
    ['coupon_not_started', 'ešte nezačala'],
    ['coupon_expired', 'skončila'],
    ['coupon_max_redemptions_reached', 'maximálnom počte'],
    ['coupon_not_valid_for_product', 'žiadny produkt'],
    ['coupon_not_valid_for_variant', 'vybraný variant'],
    ['coupon_minimum_amount_not_met', 'minimum'],
    ['coupon_currency_mismatch', 'mene'],
    ['coupon_not_combinable_with_sale', 'akciovou cenou'],
    ['coupon_claim_required', 'osobný odkaz'],
    ['coupon_claim_invalid', 'pôvodný odkaz'],
    ['coupon_sync_error', 'platobnom systéme'],
    ['checkout_coupon_locked_for_payment', 'pred pokračovaním'],
    ['checkout_coupon_session_replacement_failed', 'Pôvodná cena'],
    ['checkout_coupon_response_invalid', 'neúplný prepočet'],
    ['checkout_coupon_mutation_pending', 'Predchádzajúci prepočet'],
    ['checkout_coupon_attempt_expiring', 'Platnosť tejto pokladne'],
    ['checkout_coupon_cleanup_reconciliation_required', 'Pôvodná pokladňa'],
  ])('maps %s to a specific Slovak recovery message', (code, fragment) => {
    expect(getCouponErrorMessage({ data: { error: code } })).toContain(fragment);
  });
});
