import React from 'react';
import { Outlet } from 'react-router-dom';
import Footer from './Footer';

const Layout = () => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh'
        }}>
            <main style={{ flex: 1, padding: '0rem 0' }}>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default Layout;
