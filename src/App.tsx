import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { PwaToast } from './components/PwaToast';
import { MobileBottomNav } from './components/MobileBottomNav';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { CalculatorPage } from './pages/CalculatorPage';
import { CycleHistoryPage } from './pages/CycleHistoryPage';

const AppLayout: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className={`min-h-screen flex flex-col justify-between w-full overflow-x-hidden ${user ? 'pb-20 md:pb-0' : ''}`}>
      <div className="w-full">
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calculator"
            element={
              <ProtectedRoute>
                <CalculatorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cycles"
            element={
              <ProtectedRoute>
                <CycleHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
      {user && <MobileBottomNav />}
      <PwaToast />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </BrowserRouter>
    </I18nextProvider>
  );
};

export default App;
