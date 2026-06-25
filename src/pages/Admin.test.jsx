import { describe, expect, it } from 'vitest';
import { isShippableOrder } from '../utils/orderTypes';

describe('isShippableOrder', () => {
  it('treats physical and mixed orders as shippable but not digital-only orders', () => {
    expect(isShippableOrder({ orderType: 'physical' })).toBe(true);
    expect(isShippableOrder({ orderType: 'mixed' })).toBe(true);
    expect(isShippableOrder({ orderType: 'digital' })).toBe(false);
  });
});
