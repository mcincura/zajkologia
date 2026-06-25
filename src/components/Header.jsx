import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../cart/useCart';
import '../styles/header.css';

const Header = () => {
    const { itemCount } = useCart();

    return (
        <header className="site-header" aria-label="Košík">
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
