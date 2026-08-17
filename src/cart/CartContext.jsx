import React, { useCallback, useEffect, useMemo, useReducer } from 'react';
import { CartContext } from './cartContextValue';
import {
  cartReducer,
  getCartItemCount,
  getPhysicalCartItemCount,
  loadCartStateFromStorage,
  saveCartStateToStorage,
} from './cartState';

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCartStateFromStorage);

  useEffect(() => {
    saveCartStateToStorage(state);
  }, [state]);

  const addItem = useCallback((item) => dispatch({ type: 'addItem', item }), []);
  const removeItem = useCallback(
    (item) => dispatch({ type: 'removeItem', item }),
    []
  );
  const updateQuantity = useCallback(
    (item, quantity) => dispatch({ type: 'updateQuantity', item, quantity }),
    []
  );
  const replaceCart = useCallback((items) => dispatch({ type: 'replaceCart', items }), []);
  const clearCart = useCallback(() => dispatch({ type: 'clearCart' }), []);
  const applyCoupon = useCallback((coupon) => dispatch({ type: 'applyCoupon', coupon }), []);
  const removeCoupon = useCallback(() => dispatch({ type: 'removeCoupon' }), []);
  const clearCheckout = useCallback(() => dispatch({ type: 'clearCheckout' }), []);

  const value = useMemo(() => ({
    items: state.items,
    coupon: state.coupon,
    itemCount: getCartItemCount(state.items),
    physicalItemCount: getPhysicalCartItemCount(state.items),
    addItem,
    removeItem,
    updateQuantity,
    replaceCart,
    clearCart,
    applyCoupon,
    removeCoupon,
    clearCheckout,
  }), [
    addItem,
    applyCoupon,
    clearCart,
    clearCheckout,
    removeCoupon,
    removeItem,
    replaceCart,
    state.coupon,
    state.items,
    updateQuantity,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
