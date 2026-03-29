import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/Layout/Header';
import { ProtectedRoute } from './components/Layout/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import { PredictionPage } from './pages/PredictionPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { CompleteSignupPage } from './pages/CompleteSignupPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { MatchResultsPage } from './pages/MatchResultsPage';
import { ForgotPassword } from './components/Auth/ForgotPassword';
import { ResetPassword } from './components/Auth/ResetPassword';


function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="app">
            <Header />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/auth/complete-signup" element={<CompleteSignupPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route
                path="/predictions"
                element={
                  <ProtectedRoute>
                    <PredictionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute>
                    <LeaderboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/results"
                element={
                  <ProtectedRoute>
                    <MatchResultsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
