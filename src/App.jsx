import React from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import PostDetails from './pages/PostDetails';
import ProductDetails from './pages/ProductDetails';
import Admin from './pages/Admin';
import CheckoutSuccess from './pages/CheckoutSuccess';
import Terms from './pages/Terms';
import About from './pages/About';
import WithdrawalRequest from './pages/WithdrawalRequest';

function App() {
  return (
    <BrowserRouter basename=''>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="categories" element={<div className="container">Categories Page (Placeholder)</div>} />
          <Route path="post/:slug" element={<PostDetails />} />
          <Route path="product/:slug" element={<ProductDetails />} />
          <Route path="checkout/success" element={<CheckoutSuccess />} />
          <Route path="o-nas" element={<About />} />
          <Route path="obchodne-podmienky" element={<Terms />} />
          <Route path="odstupenie-od-zmluvy" element={<WithdrawalRequest />} />
          <Route path="admin" element={<Navigate to="/admin/orders" replace />} />
          <Route path="admin/orders" element={<Admin section="orders" />} />
          <Route path="admin/posts" element={<Admin section="posts" />} />
          <Route path="*" element={<div className="container">404 Not Found</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
