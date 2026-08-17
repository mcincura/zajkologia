import { describe, expect, it } from 'vitest';
import {
  CART_STORAGE_KEY,
  cartReducer,
  getCartItemCount,
  loadCartStateFromStorage,
  saveCartStateToStorage,
} from './cartState';

describe('cartReducer', () => {
  it('adds, merges, updates, and removes cart items', () => {
    let state = { items: [] };
    state = cartReducer(state, {
      type: 'addItem',
      item: { productSlug: 'digital-guide', productType: 'digital', quantity: 3 },
    });
    expect(state.items[0].quantity).toBe(1);

    state = cartReducer(state, {
      type: 'addItem',
      item: {
        productSlug: 'physical-ball',
        variantCode: 'black',
        productType: 'physical',
        quantity: 1,
        maxQuantity: 2,
      },
    });
    state = cartReducer(state, {
      type: 'addItem',
      item: {
        productSlug: 'physical-ball',
        variantCode: 'black',
        productType: 'physical',
        quantity: 2,
        maxQuantity: 2,
      },
    });

    expect(getCartItemCount(state.items)).toBe(3);
    expect(state.items.find((item) => item.variantCode === 'black').quantity).toBe(2);

    state = cartReducer(state, {
      type: 'updateQuantity',
      item: {
        productSlug: 'physical-ball',
        variantCode: 'black',
        productType: 'physical',
        maxQuantity: 2,
      },
      quantity: 1,
    });
    expect(state.items.find((item) => item.variantCode === 'black').quantity).toBe(1);

    state = cartReducer(state, {
      type: 'removeItem',
      item: { productSlug: 'digital-guide' },
    });
    expect(state.items).toHaveLength(1);
  });

  it('requires a variant and preserves quantity rules for mixed bundles', () => {
    let state = { items: [] };

    state = cartReducer(state, {
      type: 'addItem',
      item: {
        productSlug: 'mixed-bundle',
        productType: 'mixed',
        quantity: 1,
      },
    });
    expect(state.items).toEqual([]);

    state = cartReducer(state, {
      type: 'addItem',
      item: {
        productSlug: 'mixed-bundle',
        variantCode: 'bundle',
        productType: 'mixed',
        quantity: 2,
        maxQuantity: 2,
      },
    });
    state = cartReducer(state, {
      type: 'addItem',
      item: {
        productSlug: 'mixed-bundle',
        variantCode: 'bundle',
        productType: 'mixed',
        quantity: 1,
        maxQuantity: 2,
      },
    });

    expect(state.items).toEqual([
      expect.objectContaining({
        productSlug: 'mixed-bundle',
        variantCode: 'bundle',
        quantity: 2,
      }),
    ]);
  });
});

describe('cart storage', () => {
  it('recovers from malformed localStorage data', () => {
    const storage = {
      getItem: () => '{not-json',
      setItem: () => {},
    };

    expect(loadCartStateFromStorage(storage)).toEqual({ items: [], coupon: null });
  });

  it('saves only source-of-truth cart fields', () => {
    const saved = {};
    const removed = [];
    const storage = {
      getItem: () => null,
      setItem: (key, value) => {
        saved[key] = value;
      },
      removeItem: (key) => removed.push(key),
    };

    saveCartStateToStorage({
      items: [{
        productSlug: 'physical-ball',
        variantCode: 'black',
        quantity: 1,
        addedAt: '2026-06-25T12:00:00.000Z',
        productName: 'Ignored',
        unitAmount: 799,
      }],
    }, storage);

    expect(JSON.parse(saved[CART_STORAGE_KEY])).toEqual({
      version: 2,
      items: [{
        productSlug: 'physical-ball',
        variantCode: 'black',
        quantity: 1,
        addedAt: '2026-06-25T12:00:00.000Z',
      }],
      coupon: null,
    });
    expect(removed).toEqual(expect.arrayContaining([
      'zajkologia_cart_v1',
      'zajkologia.welcomeDiscountCode',
      'zajkologia.welcomeDiscountToken',
    ]));
  });

  it('migrates legacy welcome state once without resurrecting an explicit removal', () => {
    const values = new Map([
      ['zajkologia.welcomeDiscountCode', 'welcome25'],
      ['zajkologia.welcomeDiscountToken', 'signed-token'],
    ]);
    const storage = { getItem: (key) => values.get(key) ?? null };

    expect(loadCartStateFromStorage(storage).coupon).toEqual(expect.objectContaining({
      code: 'WELCOME25',
      claimToken: 'signed-token',
    }));

    values.set(CART_STORAGE_KEY, JSON.stringify({ version: 2, items: [], coupon: null }));
    expect(loadCartStateFromStorage(storage).coupon).toBeNull();
  });

  it('persists one coupon across cart changes and clears it only explicitly', () => {
    let state = { items: [], coupon: null };
    state = cartReducer(state, {
      type: 'applyCoupon',
      coupon: { code: ' welcome25 ', claimToken: 'signed-token', source: 'welcome' },
    });
    expect(state.coupon).toEqual(expect.objectContaining({
      code: 'WELCOME25',
      claimToken: 'signed-token',
      source: 'welcome',
    }));

    state = cartReducer(state, { type: 'clearCart' });
    expect(state.coupon.code).toBe('WELCOME25');
    state = cartReducer(state, { type: 'removeCoupon' });
    expect(state.coupon).toBeNull();
  });
});
