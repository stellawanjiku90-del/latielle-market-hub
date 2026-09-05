import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ProtectedRoute from '@/components/ProtectedRoute';
import GuestOnlyRoute from '@/components/GuestOnlyRoute';
import OfflineGate from '@/components/OfflineGate';
import { AuthProvider } from '@/lib/AuthContext';
import Layout from './components/Layout.jsx';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import Browse from './pages/Browse';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import SellerDashboard from './pages/SellerDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Terms from './pages/Terms';
import HowItWorks from './pages/HowItWorks';
import SoldBusinesses from './pages/SoldBusinesses';
import RefundPolicy from './pages/RefundPolicy';
import PrivacyPolicy from './pages/PrivacyPolicy';

const AuthenticatedApp = () => {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      {/* Private staff entry. This path is intentionally not linked from the public app. */}
      <Route path="/staff-portal-login-7f4c2a" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Public pages — guests can browse freely */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/listing/:listingId" element={<ListingDetail />} />
        <Route path="/sold-businesses" element={<SoldBusinesses />} />
        <Route element={<GuestOnlyRoute />}>
          <Route path="/terms" element={<Terms />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Route>

      {/* Protected routes — buyers, sellers and admins only */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route element={<ProtectedRoute roles={["seller"]} />}>
            <Route path="/create-listing" element={<CreateListing />} />
            <Route path="/seller-dashboard" element={<SellerDashboard />} />
          </Route>
          <Route element={<ProtectedRoute roles={["buyer"]} />}>
            <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
          </Route>
          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
          <Route element={<ProtectedRoute roles={["buyer", "seller", "admin"]} />}>
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <OfflineGate>
            <AuthenticatedApp />
          </OfflineGate>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App