import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { storeWelcomeDiscountOffer } from '../utils/welcomeDiscount';
import { useCart } from '../cart/useCart';

const WelcomeDiscountTokenSync = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { applyCoupon } = useCart();

  useEffect(() => {
    const discountCode = searchParams.get('welcome_discount_code');
    const discountToken = searchParams.get('welcome_discount_token');

    if (!discountCode || !discountToken) return;

    storeWelcomeDiscountOffer({ discountCode, discountToken });
    applyCoupon({
      code: discountCode,
      claimToken: discountToken,
      source: 'welcome',
    });

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('welcome_discount_code');
    nextSearchParams.delete('welcome_discount_token');
    setSearchParams(nextSearchParams, { replace: true });
  }, [applyCoupon, searchParams, setSearchParams]);

  return null;
};

export default WelcomeDiscountTokenSync;
