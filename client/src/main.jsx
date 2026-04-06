import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { AuthModalProvider } from './hooks/useAuthModal';
import { CartProvider } from './hooks/useCart';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import UserSidebar from './components/UserSidebar';
import { usePageTracking } from './hooks/usePageTracking';
import { useAuth } from './hooks/useAuth';

function PageTracker() {
  usePageTracking();
  return null;
}

import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import UserDashboard from './pages/UserDashboard';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import Orders from './pages/admin/Orders';
import Categories from './pages/admin/Categories';
import Users from './pages/admin/Users';
import AdminSupport from './pages/admin/AdminSupport';
import Cart from './pages/Cart';
import TermsOfUse from './pages/TermsOfUse';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ReturnPolicy from './pages/ReturnPolicy';
import LicenseUse from './pages/LicenseUse';
import Support from './pages/Support';

function PublicLayout({ children }) {
  const { user } = useAuth();
  const hasUserSidebar = user && user.role !== 'admin';
  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ color: '#181818' }}>
      <Navbar />
      <AuthModal />
      <UserSidebar />
      <div className={`flex-1 px-4 pt-[52px] sm:pt-[88px] transition-all ${hasUserSidebar ? 'lg:pl-56' : ''}`}>
        {children}
      </div>
      <Footer />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AuthModalProvider>
          <CartProvider>
            <PageTracker />
            <Routes>
              {/* Public routes — with Navbar + Footer */}
              <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
              <Route path="/products/:id" element={<PublicLayout><ProductDetail /></PublicLayout>} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
              <Route path="/reset-password" element={<PublicLayout><ResetPassword /></PublicLayout>} />
              <Route path="/checkout" element={<PublicLayout><Checkout /></PublicLayout>} />
              <Route path="/cart" element={<PublicLayout><Cart /></PublicLayout>} />
              <Route path="/downloads" element={<PublicLayout><ProtectedRoute><UserDashboard /></ProtectedRoute></PublicLayout>} />
              <Route path="/my-downloads" element={<Navigate to="/downloads" replace />} />
              <Route path="/profile" element={<PublicLayout><ProtectedRoute><UserDashboard /></ProtectedRoute></PublicLayout>} />
              <Route path="/terms-of-use" element={<PublicLayout><TermsOfUse /></PublicLayout>} />
              <Route path="/privacy-policy" element={<PublicLayout><PrivacyPolicy /></PublicLayout>} />
              <Route path="/return-policy" element={<PublicLayout><ReturnPolicy /></PublicLayout>} />
              <Route path="/license-use" element={<PublicLayout><LicenseUse /></PublicLayout>} />
              <Route path="/support" element={<PublicLayout><ProtectedRoute><Support /></ProtectedRoute></PublicLayout>} />

              {/* Admin routes — no Navbar or Footer */}
              <Route path="/admin" element={<AdminRoute><Dashboard /></AdminRoute>} />
              <Route path="/admin/products" element={<AdminRoute><Products /></AdminRoute>} />
              <Route path="/admin/orders" element={<AdminRoute><Orders /></AdminRoute>} />
              <Route path="/admin/categories" element={<AdminRoute><Categories /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><Users /></AdminRoute>} />
              <Route path="/admin/support" element={<AdminRoute><AdminSupport /></AdminRoute>} />
            </Routes>
          </CartProvider>
        </AuthModalProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
