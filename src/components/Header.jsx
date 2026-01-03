import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Menu } from 'lucide-react';

const Header = () => {
    return (
        <header style={{
            backgroundColor: 'var(--color-white)',
            boxShadow: 'var(--shadow)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <div className="container" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '70px'
            }}>
                <Link to="/" style={{
                    fontSize: '1.5rem',
                    fontWeight: '800',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    ZAJKOLÓGIA
                </Link>

                <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <Link to="/" style={{ fontWeight: '600' }}>Home</Link>
                    <Link to="/categories" style={{ fontWeight: '600' }}>Categories</Link>
                    <Link to="/admin" style={{ opacity: 0.7 }}>Admin</Link>
                </nav>
            </div>
        </header>
    );
};

export default Header;
