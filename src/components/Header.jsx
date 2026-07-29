import React from 'react';
import { Link } from 'react-router-dom';
import { CircleUserRound, ShoppingCart } from 'lucide-react';
import { useCart } from '../cart/useCart';
import '../styles/header.css';

const membershipPublic = import.meta.env.VITE_MEMBERSHIP_PUBLIC === 'true';

const Header = () => {
    const { itemCount } = useCart();

    return (
        <header className="site-header" aria-label="Rýchla navigácia">
            {membershipPublic ? (
                <Link className="site-header__club" to="/klub" aria-label="Zajkológia klub">
                    <CircleUserRound aria-hidden="true" size={22} strokeWidth={2.1} />
                    <span>Klub</span>
                </Link>
            ) : null}
            <Link className="site-header__cart" to="/cart" aria-label={`Košík, ${itemCount} položiek`}>
                <ShoppingCart aria-hidden="true" size={23} strokeWidth={2.2} />
                <span className="site-header__cart-label">Košík</span>
                <strong className={itemCount > 0 ? '' : 'is-empty'} aria-hidden="true">
                    {itemCount}
                </strong>
            </Link>
        </header>
    );
};

export default Header;
