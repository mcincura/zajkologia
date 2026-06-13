import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import PostDetails from './pages/PostDetails';
import ProductDetails from './pages/ProductDetails';
import Admin from './pages/Admin';
import CheckoutSuccess from './pages/CheckoutSuccess';
import Terms from './pages/Terms';

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
          <Route path="obchodne-podmienky" element={<Terms />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<div className="container">404 Not Found</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
