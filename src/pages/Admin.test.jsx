import { describe, expect, it } from 'vitest';
import { getFullRefundDigitalWarning } from '../utils/adminRefunds';
import { isShippableOrder } from '../utils/orderTypes';

describe('isShippableOrder', () => {
  it('treats physical and mixed orders as shippable but not digital-only orders', () => {
    expect(isShippableOrder({ orderType: 'physical' })).toBe(true);
    expect(isShippableOrder({ orderType: 'mixed' })).toBe(true);
    expect(isShippableOrder({ orderType: 'digital' })).toBe(false);
  });
});

describe('getFullRefundDigitalWarning', () => {
  it('warns before full refunds for mixed orders with digital content', () => {
    const warning = getFullRefundDigitalWarning({
      order: { orderType: 'mixed', items: [{ variantCode: 'black_white' }, { variantCode: null }] },
      amount: 1198,
      refundableMinor: 1198,
      formattedRefundAmount: '11,98 €',
    });

    expect(warning).toContain('full');
    expect(warning).toContain('mixed order');
    expect(warning).toContain('digital');
  });

  it('does not warn for partial mixed refunds', () => {
    const warning = getFullRefundDigitalWarning({
      order: { orderType: 'mixed', items: [{ variantCode: 'black_white' }, { variantCode: null }] },
      amount: 799,
      refundableMinor: 1198,
      formattedRefundAmount: '11,98 €',
    });

    expect(warning).toBe('');
  });
});
