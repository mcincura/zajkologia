import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { storeWelcomeDiscountOffer } from '../utils/welcomeDiscount';

const WelcomeDiscountTokenSync = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const discountCode = searchParams.get('welcome_discount_code');
    const discountToken = searchParams.get('welcome_discount_token');

    if (!discountCode || !discountToken) return;

    storeWelcomeDiscountOffer({ discountCode, discountToken });

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('welcome_discount_code');
    nextSearchParams.delete('welcome_discount_token');
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return null;
};

export default WelcomeDiscountTokenSync;
