import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { fetchSheet } from '../utils/api';
import { LOGIN_SHEET, APP_NAME, BRANDING } from '../config';
import Footer from '../components/Footer';

const Login = () => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id || !password) {
      toast.error('Please enter ID and Password');
      return;
    }
    setSubmitting(true);
    try {
      // Login columns: 0 Timestamp,1 Serial No,2 Full Name,3 Contact No,
      // 4 Email,5 Designation,6 User ID,7 Password,8 Role,9 Page Access,
      // 10 Edit Access,11 Scope Class,12 Scope Section
      const data = await fetchSheet(LOGIN_SHEET);
      const users = data.slice(1).map((row) => ({
        id: String(row[6] ?? '').trim(),
        pass: String(row[7] ?? ''),
        name: row[2],
        contact: row[3],
        designation: row[5],
        role: row[8] ? String(row[8]).toUpperCase() : 'USER',
        pageAccess: row[9] || '',
        editAccess: row[10] || '',
        scopeClass: row[11] || '',
        scopeSection: row[12] || '',
      }));

      const matched = users.find((u) => u.id === id.trim() && u.pass === password);
      if (!matched) {
        toast.error('Invalid credentials');
        setSubmitting(false);
        return;
      }

      toast.success('Login successful!');
      login({
        name: matched.name,
        username: matched.id,
        contact: matched.contact,
        role: matched.role,
        designation: matched.designation,
        pageAccess: matched.pageAccess,
        editAccess: matched.editAccess,
        scopeClass: matched.scopeClass,
        scopeSection: matched.scopeSection,
      });
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      toast.error('Login error or network issue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-[100dvh] overflow-hidden w-full flex flex-col bg-gradient-to-br from-sky-50 to-sky-100">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-20 h-20 flex items-center justify-center">
              <img src="/bps-logo.svg" alt={APP_NAME} className="w-full h-full object-contain" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-3xl font-semibold text-gray-900">{APP_NAME}</h1>
              {BRANDING.tagline && <p className="text-sky-600 text-xs font-semibold tracking-wide uppercase">{BRANDING.tagline}</p>}
              <p className="text-gray-600 text-base font-medium">Sign in to continue</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="id" className="text-sm font-medium text-gray-700">User ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="id"
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                  placeholder="Enter user ID"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 px-4 text-base font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-600 transition-all ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
