/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, User, ScanFace, ArrowLeft, Database, Terminal, Settings2, Code, Key, Server } from 'lucide-react';
import { getActiveMode, DatabaseMode, dbService } from '../dbService';

interface LoginViewProps {
  onBack: () => void;
  onNavigate: (view: 'login' | 'register' | 'user-dashboard' | 'admin-dashboard') => void;
  onLoginSuccess: (emailOrUsername: string, password: string) => Promise<void>;
  onGoogleLogin: () => void;
}

export default function LoginView({ onBack, onNavigate, onLoginSuccess, onGoogleLogin }: LoginViewProps) {
  const [bankingTab, setBankingTab] = useState<'personal' | 'business'>('personal');
  const [username, setUsername] = useState('james');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDbSettings, setShowDbSettings] = useState(false);
  
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(() => {
    return (import.meta as any).env.VITE_SUPABASE_URL || localStorage.getItem("VITE_SUPABASE_URL") || "";
  });
  const [supabaseAnonKeyInput, setSupabaseAnonKeyInput] = useState(() => {
    return (import.meta as any).env.VITE_SUPABASE_ANON_KEY || localStorage.getItem("VITE_SUPABASE_ANON_KEY") || "";
  });
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connTestResult, setConnTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const saveSupabaseCredentials = () => {
    localStorage.setItem("VITE_SUPABASE_URL", supabaseUrlInput.trim());
    localStorage.setItem("VITE_SUPABASE_ANON_KEY", supabaseAnonKeyInput.trim());
    alert("Supabase credentials saved successfully. Reloading view to apply credentials and hydrate the database driver...");
    window.location.reload();
  };

  const testSupabaseConnection = async () => {
    setIsTestingConn(true);
    setConnTestResult(null);
    try {
      const result = await dbService.testSupabaseConnection();
      setConnTestResult(result);
    } catch (err: any) {
      setConnTestResult({
        success: false,
        message: err.message || "Failed to initiate test connection."
      });
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('Please enter your username or email');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    try {
      setErrorMessage('');
      setIsSubmitting(true);
      await onLoginSuccess(username.trim(), password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFaceID = () => {
    alert('Biometric login simulated: Face ID setup can be verified in user settings after logging in with standard email/password.');
  };

  return (
    <div className="min-h-screen bg-[#070b19] text-white flex flex-col justify-between items-center px-4 py-6 relative overflow-y-auto">
      
      {/* Subtle DB Config Toggle Button - hidden by default to keep screen clean */}
      <button
        type="button"
        onClick={() => setShowDbSettings(!showDbSettings)}
        className="absolute top-4 right-4 z-20 p-2 text-slate-500 hover:text-blue-400 bg-slate-900/40 hover:bg-slate-850 border border-slate-800/10 hover:border-slate-800 rounded-xl transition cursor-pointer"
        id="btn-toggle-dev-db"
        title="Toggle Database Settings"
      >
        <Settings2 className="w-4 h-4" />
      </button>

      {/* Background Soft Gradients */}
      <div className="absolute top-0 right-1/4 w-[280px] h-[280px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[200px] h-[200px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Header Buttons */}
      <div className="w-full max-w-sm flex justify-between items-center relative z-10 mb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900 border border-slate-800 shadow-sm hover:bg-slate-800 transition py-1.5 px-3 rounded-full cursor-pointer animate-fade-in"
          id="btn-login-back"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-blue-400" /> Back
        </button>
        <button
          onClick={() => onNavigate('register')}
          className="text-xs text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
          id="btn-login-register"
        >
          Create account
        </button>
      </div>

      {/* Elegant Login Card */}
      <div className="w-full max-w-sm bg-[#0f172a] border border-slate-800 rounded-3xl p-6 relative z-10 shadow-2xl my-auto animate-fade-in">

        {/* Logo and Brand Title Header */}
        <div className="flex items-center justify-center gap-3.5 mb-6">
          <svg className="w-9 h-11 drop-shadow-sm" viewBox="0 0 100 120" fill="none">
            <path 
              d="M25 20 V65 C25 80 35 90 50 90 C65 90 75 80 75 65 V20" 
              stroke="url(#uGradLogin)" 
              strokeWidth="16" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            <defs>
              <linearGradient id="uGradLogin" x1="0.1" y1="0.1" x2="0.9" y2="0.9">
                <stop offset="0%" stopColor="#1e40af" />
                <stop offset="50%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="text-left">
            <h1 className="text-base font-extrabold tracking-[0.2em] text-white uppercase leading-none">UNITYCORE</h1>
            <span className="text-sm font-light tracking-[0.14em] text-blue-400 leading-tight">BANK</span>
          </div>
        </div>

        {/* Welcome Back & Subheader */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
          <p className="text-xs text-slate-400 mt-1">Sign in to access your account</p>
        </div>

        {getActiveMode() === "firebase" && (
          <div className="mb-5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
            <span className="inline-flex items-center gap-1.5 text-amber-400 font-extrabold text-[10.5px] uppercase tracking-wide">
              <Database className="w-3.5 h-3.5 animate-pulse" />
              Firebase Cloud Database Active
            </span>
            <p className="text-[11px] text-slate-300 leading-normal mt-1">
              Currently connected to the secure <span className="text-white font-semibold">Firebase Enterprise Cloud</span> database.
              We recommend registering or signing in with Google for direct, zero-configuration sandbox access!
            </p>
          </div>
        )}

        {/* Tab Selector Buttons */}
        <div className="flex border-b border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => setBankingTab('personal')}
            className={`flex-1 pb-2.5 text-xs font-bold text-center transition-all cursor-pointer ${
              bankingTab === 'personal'
                ? 'text-blue-450 text-blue-400 border-b-2 border-blue-500 font-extrabold'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            Personal Banking
          </button>
          <button
            type="button"
            onClick={() => setBankingTab('business')}
            className={`flex-1 pb-2.5 text-xs font-bold text-center transition-all cursor-pointer ${
              bankingTab === 'business'
                ? 'text-blue-450 text-blue-400 border-b-2 border-blue-500 font-extrabold'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            Business Banking
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email input field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Username or Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrorMessage('');
              }}
              placeholder="Enter your username or email"
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-3 px-4 text-sm text-white transition placeholder-slate-600 font-medium"
              id="input-login-username"
            />
          </div>

          {/* Password input with eye toggler */}
          <div className="space-y-1.5 relative">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400">Password</label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="Enter your password"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-3 pl-4 pr-11 text-sm text-white transition placeholder-slate-600 font-medium font-mono"
                id="input-login-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-505 text-slate-500 hover:text-slate-300 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <p className="text-rose-405 text-rose-400 text-xs font-bold text-center bg-rose-950/20 border border-rose-900/40 p-2.5 rounded-lg font-mono">
              {errorMessage}
            </p>
          )}

          {/* Checkbox and Forgot Password Link */}
          <div className="flex justify-between items-center pt-1 text-xs">
            <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded-md border-slate-800 bg-slate-950 accent-blue-600 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="font-bold text-slate-305 text-slate-300">Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => alert('Forgot password helper: Try entering username "james" and any password to sign in immediately.')}
              className="text-blue-400 hover:text-blue-300 font-bold transition cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold py-3 px-4 rounded-xl transition duration-150 shadow-md shadow-blue-900/40 text-xs sm:text-sm font-sans mt-2 cursor-pointer flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            id="btn-login-submit"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Signing In...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-4">
          <span className="flex-1 h-px bg-slate-800" />
          <span className="text-[10px] text-slate-500 px-3 uppercase tracking-widest font-mono">or</span>
          <span className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Continue with Google (Always visible for robust pre-configured Firebase Access) */}
        <button
          type="button"
          onClick={onGoogleLogin}
          className="w-full flex items-center justify-center gap-2 bg-[#0f172a] hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 text-white font-bold py-3.5 px-4 rounded-xl transition duration-150 text-xs cursor-pointer active:scale-98"
          id="btn-google-login-loginview"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5.04c1.61 0 3.05.55 4.19 1.64l3.12-3.12C17.43 1.84 14.9 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.6 2.8C6.01 7.24 8.76 5.04 12 5.04z" />
            <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.6 2.8c2.11-1.95 3.33-4.82 3.33-8.48z" />
            <path fill="#FBBC05" d="M5.1 14.7c-.24-.71-.38-1.47-.38-2.7s.14-1.99.38-2.7L1.5 6.5C.54 8.42 0 10.61 0 12s.54 3.58 1.5 5.5l3.6-2.8z" />
            <path fill="#34A853" d="M12 23c3.24 0 5.97-1.08 7.96-2.92l-3.6-2.8c-1.11.74-2.53 1.18-4.36 1.18-3.24 0-5.99-2.2-6.97-5.26l-3.6 2.8C3.4 20.35 7.35 23 12 23z" />
          </svg>
          <span className="font-extrabold text-blue-400">Continue with Google</span>
        </button>

        {/* Face ID Login Button */}
        <button
          onClick={handleFaceID}
          className="w-full bg-slate-900/40 hover:bg-slate-850 tracking-wide text-slate-400 border border-slate-800/40 py-2.5 px-4 rounded-xl transition duration-150 text-[10.5px] flex items-center justify-center gap-2 cursor-pointer mt-2"
          id="btn-face-id-login"
        >
          <ScanFace className="w-3.5 h-3.5 text-slate-500" />
          <span>Sign in with Face ID</span>
        </button>
      </div>

      {/* Database Schema & Integrations Guideline Drawer */}
      {showDbSettings && (
        <div className="w-full max-w-sm bg-[#0a0f1d] border border-slate-800/80 rounded-2xl p-4.5 mt-5 relative z-10 shadow-lg text-left text-xs text-slate-350">
          <div className="flex items-center gap-2 mb-3 text-blue-400 font-bold">
            <Database className="w-4 h-4" />
            <span>Database & Integration Control</span>
          </div>

          <p className="text-slate-400 leading-normal mb-3">
            Integrate with <span className="text-white font-bold">Firebase (Firestore)</span>, <span className="text-white font-bold">Supabase (PostgreSQL)</span> or a local sandbox database. Configure your active database driver:
          </p>

          {/* Database Driver Toggle Buttons */}
          <div className="grid grid-cols-3 gap-1.5 mb-4">
            <button
              type="button"
              onClick={() => {
                localStorage.setItem("active_db_driver", "firebase");
                alert("Firebase driver selected as active live connector. Ensure your Firebase project configuration is loaded.");
                window.location.reload();
              }}
              className={`py-2 px-1 rounded-lg border text-[10px] font-bold text-center cursor-pointer transition flex flex-col items-center justify-center gap-1 ${
                getActiveMode() === "firebase"
                  ? "bg-amber-950/20 border-amber-500/60 text-amber-400 font-extrabold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Firebase
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem("active_db_driver", "supabase");
                alert("Supabase driver selected as active live connector. Ensure VITE_SUPABASE_URL is configured.");
                window.location.reload();
              }}
              className={`py-2 px-1 rounded-lg border text-[10px] font-bold text-center cursor-pointer transition flex flex-col items-center justify-center gap-1 ${
                getActiveMode() === "supabase"
                  ? "bg-emerald-900/20 border-emerald-500/60 text-emerald-400 font-extrabold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              Supabase
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem("active_db_driver", "fallback_secure");
                alert("Switched to Secure Sandbox database driver. Accounts are securely isolated and persisted in browser storage.");
                window.location.reload();
              }}
              className={`py-2 px-1 rounded-lg border text-[10px] font-bold text-center cursor-pointer transition flex flex-col items-center justify-center gap-1 ${
                getActiveMode() === "fallback_secure"
                  ? "bg-blue-900/30 border-blue-500/60 text-blue-400 font-extrabold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Secure Fallback
            </button>
          </div>

          {/* Interactive Supabase configuration panel */}
          {getActiveMode() === "supabase" && (
            <div className="mt-1 mb-4 p-3 bg-slate-900 border border-emerald-500/40 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-extrabold">
                  <Server className="w-3.5 h-3.5" />
                  <span>Supabase Credentials Setup</span>
                </div>
                <span className="text-[8px] bg-emerald-950 text-emerald-400 px-1 py-0.5 rounded font-mono font-bold tracking-wider">ACTIVE</span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[9px] text-slate-400 uppercase tracking-wider font-extrabold mb-0.5">
                    Supabase Project URL:
                  </label>
                  <input
                    type="text"
                    placeholder="https://your-project.supabase.co"
                    value={supabaseUrlInput}
                    onChange={(e) => setSupabaseUrlInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 leading-tight font-mono text-[10px] text-slate-200 focus:outline-none focus:border-emerald-500/60"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-slate-400 uppercase tracking-wider font-extrabold mb-0.5">
                    Supabase Anon Key:
                  </label>
                  <input
                    type="password"
                    placeholder="your-anon-key-here..."
                    value={supabaseAnonKeyInput}
                    onChange={(e) => setSupabaseAnonKeyInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 leading-tight font-mono text-[10px] text-slate-200 focus:outline-none focus:border-emerald-500/60"
                  />
                </div>

                <div className="flex gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={saveSupabaseCredentials}
                    className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 py-1 px-2 rounded text-[10px] font-extrabold cursor-pointer transition text-center"
                  >
                    Save & Load
                  </button>
                  <button
                    type="button"
                    onClick={testSupabaseConnection}
                    disabled={isTestingConn}
                    className="flex-1 bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-800 py-1 px-2 rounded text-[10px] font-extrabold cursor-pointer transition text-center disabled:opacity-50"
                  >
                    {isTestingConn ? "Testing..." : "Test Connection"}
                  </button>
                </div>

                {connTestResult && (
                  <div className={`p-2 rounded text-[9.5px] font-mono leading-snug whitespace-pre-wrap ${
                    connTestResult.success 
                      ? "bg-emerald-950/30 border border-emerald-800/40 text-emerald-400" 
                      : "bg-red-950/30 border border-red-900/40 text-red-400"
                  }`}>
                    {connTestResult.success ? "✅ " : "❌ "}
                    {connTestResult.message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Informative Accordion for Schemas */}
          <div className="space-y-2 mt-3 bg-[#070b14] border border-slate-800/60 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-slate-400 mb-1 font-bold">
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
              <span>Schema Setup Reference SQL:</span>
            </div>
            
            <div className="space-y-1 text-[10px] font-mono">
              <span className="text-emerald-400 font-bold block mt-1"># For Supabase (Postgres Console SQL):</span>
              <pre className="bg-slate-950 p-2 rounded text-[8.5px] text-slate-300 overflow-x-auto whitespace-pre leading-tight max-h-[140px]">
{`-- 1. Create Users profile ledger table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  profile_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Audit logs trail table
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  username TEXT,
  user_id TEXT,
  action TEXT,
  details TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`}
              </pre>
            </div>

            <div className="space-y-1 text-[10px] font-mono">
              <span className="text-yellow-405 text-yellow-500 font-bold block mt-2"># For phpMyAdmin (MySQL SQL Console):</span>
              <pre className="bg-slate-950 p-2 rounded text-[9px] text-slate-300 overflow-x-auto whitespace-pre leading-tight">
{`CREATE TABLE users (
  id VARCHAR(128) PRIMARY KEY,
  email VARCHAR(128) UNIQUE NOT NULL,
  username VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(128),
  role VARCHAR(32) DEFAULT 'user',
  profile_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`}
              </pre>
            </div>

            <div className="text-[10px] text-slate-400 mt-2 bg-blue-950/20 border border-blue-900/30 p-2 rounded">
              💡 <span className="text-white font-bold">Vercel Setup:</span> Set your <span className="font-mono text-blue-400">VITE_SUPABASE_URL</span> and <span className="font-mono text-blue-400">VITE_SUPABASE_ANON_KEY</span> as Environment Variables during project deployment for instantaneous native database binding.
            </div>
          </div>
        </div>
      )}


      {/* Footer Indicators */}
      <div className="w-full max-w-sm relative z-10 pt-4 mt-2">
        <div className="flex items-center justify-center gap-4 text-[10px] text-slate-450 border-t border-slate-800 pt-5">
          <div className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">Secure Connection</span>
          </div>

          <div className="w-1 h-1 rounded-full bg-slate-700" />

          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">Privacy Protection</span>
          </div>

          <div className="w-1 h-1 rounded-full bg-slate-700" />

          <div className="flex items-center gap-1 text-slate-400">
            <span className="font-extrabold underline text-white">FDIC</span>
            <span>Insured</span>
          </div>
        </div>
      </div>
    </div>
  );
}
