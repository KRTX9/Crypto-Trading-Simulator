import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { TradingProvider } from "./contexts/TradingContext";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import EmailVerificationPage from "./components/auth/EmailVerificationPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";
import ResetPasswordPage from "./components/auth/ResetPasswordPage";
import TradingDashboard from "./components/trading/TradingDashboard";
import MarketAnalysisPage from "./components/analysis/MarketAnalysisPage";
import EconomicCalendarPage from "./components/calendar/EconomicCalendarPage";
import ProfilePage from "./components/profile/ProfilePage";
import AboutPage from "./components/about/AboutPage";
import BotDashboard from "./components/bots/BotDashboard";
import AnalyticsDashboard from "./components/analytics/AnalyticsDashboard";
import LoadingSpinner from "./components/ui/LoadingSpinner";
import "./App.css";

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route component (redirects to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppContent() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Initializing..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <TradingProvider>
                <TradingDashboard />
              </TradingProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/market-analysis"
          element={
            <ProtectedRoute>
              <TradingProvider>
                <MarketAnalysisPage />
              </TradingProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/economic-calendar"
          element={
            <ProtectedRoute>
              <TradingProvider>
                <EconomicCalendarPage />
              </TradingProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <TradingProvider>
                <ProfilePage />
              </TradingProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/bots"
          element={
            <ProtectedRoute>
              <TradingProvider>
                <BotDashboard />
              </TradingProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <TradingProvider>
                <AnalyticsDashboard />
              </TradingProvider>
            </ProtectedRoute>
          }
        />

        <Route path="/about" element={<AboutPage />} />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
