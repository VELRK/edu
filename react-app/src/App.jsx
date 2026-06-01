import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import './index.css';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Courses = lazy(() => import('./pages/Courses.jsx'));
const PYQExam = lazy(() => import('./pages/PYQExam.jsx'));
const Progress = lazy(() => import('./pages/Progress.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const WrongAnswers = lazy(() => import('./pages/WrongAnswers.jsx'));
const SRSReview = lazy(() => import('./pages/SRSReview.jsx'));
const MockTest = lazy(() => import('./pages/MockTest.jsx'));
const Bookmarks = lazy(() => import('./pages/Bookmarks.jsx'));
const Streak = lazy(() => import('./pages/Streak.jsx'));
const PYQPractice = lazy(() => import('./pages/PYQPractice.jsx'));
const WeakTopics = lazy(() => import('./pages/WeakTopics.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));

function ProtectedRoute({ children }) {
  const isAuthenticated = !!localStorage.getItem('jwt');
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppLoader() {
  return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f1f5f9' }}><div className="spinner" /></div>;
}

function App() {
  return (
    <Router>
      <Suspense fallback={<AppLoader />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/courses" element={<ProtectedRoute><Layout><Courses /></Layout></ProtectedRoute>} />
          <Route path="/exam" element={<ProtectedRoute><Layout><PYQExam /></Layout></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><Layout><Progress /></Layout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
          <Route path="/wrong-answers" element={<ProtectedRoute><Layout><WrongAnswers /></Layout></ProtectedRoute>} />
          <Route path="/srs" element={<ProtectedRoute><Layout><SRSReview /></Layout></ProtectedRoute>} />
          <Route path="/mock-test" element={<ProtectedRoute><Layout><MockTest /></Layout></ProtectedRoute>} />
          <Route path="/bookmarks" element={<ProtectedRoute><Layout><Bookmarks /></Layout></ProtectedRoute>} />
          <Route path="/streak" element={<ProtectedRoute><Layout><Streak /></Layout></ProtectedRoute>} />
          <Route path="/pyq" element={<ProtectedRoute><Layout><PYQPractice /></Layout></ProtectedRoute>} />
          <Route path="/weak-topics" element={<ProtectedRoute><Layout><WeakTopics /></Layout></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
