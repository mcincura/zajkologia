import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../cart/useCart';
import '../styles/header.css';

const Header = () => {
    const { itemCount } = useCart();

    return (
        <header className="site-header">
            <div className="container site-header__inner">
                <Link className="site-header__brand" to="/">
                    ZAJKOLÓGIA
                </Link>

                <nav className="site-header__nav" aria-label="Hlavná navigácia">
                    <Link to="/">Domov</Link>
                    <Link to="/?category=Produkty">Produkty</Link>
                    <Link to="/o-nas">O nás</Link>
                    <Link to="/obchodne-podmienky">Podmienky</Link>
                    <Link className="site-header__cart" to="/cart" aria-label={`Košík, ${itemCount} položiek`}>
                        <ShoppingCart size={18} />
                        <span>Košík</span>
                        {itemCount > 0 && <strong>{itemCount}</strong>}
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default Header;
