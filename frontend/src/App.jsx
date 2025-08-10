import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import PrivateRoute from './components/PrivateRoute';
import HostRoute from './components/HostRoute';
import PublicRoute from './components/PublicRoute';

// Lazy load components for better performance
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const RentalList = lazy(() => import('./pages/RentalList'));
const RentalDetail = lazy(() => import('./pages/RentalDetail'));
const CreateRental = lazy(() => import('./pages/CreateRental'));
const Profile = lazy(() => import('./pages/Profile'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const BookingDetail = lazy(() => import('./pages/BookingDetail'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const CalendarDemo = lazy(() => import('./pages/CalendarDemo'));
const VerifyHost = lazy(() => import('./pages/VerifyHost'));
const AdminVerifications = lazy(() => import('./pages/AdminVerifications'));
const HostDashboard = lazy(() => import('./pages/HostDashboard'));
const AdminReviews = lazy(() => import('./pages/AdminReviews'));
const Messages = lazy(() => import('./pages/Messages'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <Router>
        <div className="App min-h-screen bg-gray-50">
          <Navbar />
          <main className="pt-16 lg:pt-20">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route 
                  path="/login" 
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/register" 
                  element={
                    <PublicRoute>
                      <Register />
                    </PublicRoute>
                  } 
                />
                <Route path="/rentals" element={<RentalList />} />
                <Route path="/rentals/:id" element={<RentalDetail />} />
                <Route 
                  path="/booking/:id" 
                  element={
                    <PrivateRoute>
                      <BookingPage />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/create-rental" 
                  element={
                    <PrivateRoute>
                      <HostRoute>
                        <CreateRental />
                      </HostRoute>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/verify-host" 
                  element={
                    <PrivateRoute>
                      <VerifyHost />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/host" 
                  element={
                    <PrivateRoute>
                      <HostDashboard />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/admin/verifications" 
                  element={
                    <PrivateRoute requireAdmin>
                      <AdminVerifications />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/admin/reviews" 
                  element={
                    <PrivateRoute requireAdmin>
                      <AdminReviews />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/admin/analytics" 
                  element={
                    <PrivateRoute requireAdmin>
                      <AnalyticsDashboard />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <PrivateRoute>
                      <Profile />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/bookings" 
                  element={
                    <PrivateRoute>
                      <MyBookings />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/bookings/:id" 
                  element={
                    <PrivateRoute>
                      <BookingDetail />
                    </PrivateRoute>
                  } 
                />
                <Route path="/calendar-demo" element={<CalendarDemo />} />
                <Route 
                  path="/messages" 
                  element={
                    <PrivateRoute>
                      <Messages />
                    </PrivateRoute>
                  } 
                />
              </Routes>
            </Suspense>
          </main>
        </div>
      </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

