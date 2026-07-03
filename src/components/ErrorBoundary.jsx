import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// Catches render-time crashes so a single bad page never white-screens
// the whole app. Shows a friendly recover option instead.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertTriangle size={30} className="text-red-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Something went wrong</h2>
        <p className="text-sm text-gray-600 mt-1 max-w-md">
          This page hit an unexpected error. Your data is safe. Try reloading.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 px-5 py-2.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-all flex items-center gap-2 shadow-sm"
        >
          <RefreshCw size={16} /> Reload
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
