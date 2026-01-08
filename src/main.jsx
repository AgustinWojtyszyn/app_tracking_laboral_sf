
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './contexts/SupabaseAuthContext';
import { ToastProvider } from './contexts/ToastContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <ToastProvider>
        <AuthProvider>
            <App />
        </AuthProvider>
    </ToastProvider>
  </>
);
