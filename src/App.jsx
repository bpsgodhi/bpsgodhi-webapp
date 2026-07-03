import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ConfirmDialog from './components/ConfirmDialog';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Records from './pages/Records';
import Setting from './pages/Setting';
import MyFees from './pages/MyFees';
import MyClass from './pages/MyClass';
import MyStudents from './pages/MyStudents';
import MyChild from './pages/MyChild';
import { useAuthStore } from './store/authStore';
import { firstAllowedPath } from './config';

// Land each user on their first permitted page (e.g. parents skip Dashboard).
const IndexRedirect = () => {
  const { user } = useAuthStore();
  return <Navigate to={firstAllowedPath(user)} replace />;
};

function App() {
  return (
    <div className="h-[100dvh] w-full overflow-hidden">
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <ConfirmDialog />
        <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<IndexRedirect />} />
            <Route path="dashboard" element={<Dashboard />} />
            {/* One generic CRUD route serves every module via :key */}
            <Route path="m/:key" element={<Records />} />
            <Route path="my-students" element={<MyStudents />} />
            <Route path="my-child" element={<MyChild />} />
            <Route path="my-fees" element={<MyFees />} />
            <Route path="my-class" element={<MyClass />} />
            <Route path="setting" element={<Setting />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </Router>
    </div>
  );
}

export default App;
