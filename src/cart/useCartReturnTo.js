import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { rememberCartReturnTo, resolveCartReturnTo } from '../utils/cartNavigation';

export const useCartReturnTo = () => {
  const { state } = useLocation();
  const returnTo = useMemo(() => resolveCartReturnTo(state), [state]);
  useEffect(() => rememberCartReturnTo(returnTo), [returnTo]);
  return returnTo;
};
