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

  const value = useMemo(() => ({
    items: state.items,
    itemCount: getCartItemCount(state.items),
    physicalItemCount: getPhysicalCartItemCount(state.items),
    addItem,
    removeItem,
    updateQuantity,
    replaceCart,
    clearCart,
  }), [addItem, clearCart, removeItem, replaceCart, state.items, updateQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
