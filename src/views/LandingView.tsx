/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lock, CheckCircle, Award, Terminal } from 'lucide-react';

interface LandingViewProps {
  onNavigate: (view: 'login' | 'register' | 'user-dashboard' | 'admin-dashboard') => void;
  onQuickLogin: (type: 'user' | 'admin') => void;
  onGoogleLogin: () => void;
}

export default function LandingView({ onNavigate, onQuickLogin, onGoogleLogin }: LandingViewProps) {
  return (
    <div className="min-h-screen bg-[#070b19] text-white flex flex-col justify-between items-center px-6 py-8 relative overflow-hidden font-sans">
      
      {/* Background Soft Gradients to emulate high-end screen lighting */}
      <div className="absolute top-0 right-1/4 w-[380px] h-[380px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[240px] h-[240px] bg-blue-500/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Header spacing */}
      <div className="h-6" />

      {/* Main Content Area */}
      <div className="flex flex-col items-center justify-center flex-grow max-w-sm w-full text-center relative z-10 py-8">
        
        {/* Glowing Minimalist Premium Bank Emblem */}
        <div className="relative mb-6 cursor-pointer group">
          <div className="absolute -inset-3 bg-gradient-to-tr from-indigo-500 to-blue-500 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition duration-500" />
          
          <div className="relative w-20 h-20 rounded-2xl bg-slate-900/90 border border-indigo-500/30 flex items-center justify-center p-4 shadow-xl">
            <svg className="w-12 h-12 text-indigo-400 group-hover:text-blue-400 transition-colors duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="1.5" />
              <path d="M12 8v8" strokeWidth="1.5" />
              <path d="M9 11h6" strokeWidth="1.5" />
              <path d="M9 14h6" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Brand Display Typography */}
        <div className="space-y-1 mt-4 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[0.22em] text-white uppercase leading-none">
            UNITYCORE
          </h1>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[0.22em] text-white uppercase leading-none">
            BANK
          </h1>
        </div>

        {/* Pure Elegant Tagline to emulate layout design */}
        <p className="text-base sm:text-lg font-medium text-white/90 mt-10 tracking-wide leading-relaxed font-sans">
          Banking Simplified.<br />
          Life Amplified.
        </p>

        {/* Main Interface Action Triggers */}
        <div className="w-full mt-12 space-y-3.5">
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="w-full bg-[#5c4fff] hover:bg-[#4d3df2] active:scale-98 text-white font-extrabold py-4 px-6 rounded-2xl transition-all duration-150 shadow-lg shadow-indigo-950/40 text-sm sm:text-base font-sans cursor-pointer tracking-wide"
            id="btn-go-login"
          >
            Log In
          </button>

          <button
            type="button"
            onClick={onGoogleLogin}
            className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-[#131a30] border border-slate-800/80 text-white font-bold py-3.5 px-6 rounded-2xl transition duration-150 text-xs sm:text-sm font-sans cursor-pointer tracking-wide"
            id="btn-google-login-landing"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.61 0 3.05.55 4.19 1.64l3.12-3.12C17.43 1.84 14.9 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.6 2.8C6.01 7.24 8.76 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.6 2.8c2.11-1.95 3.33-4.82 3.33-8.48z" />
              <path fill="#FBBC05" d="M5.1 14.7c-.24-.71-.38-1.47-.38-2.7s.14-1.99.38-2.7L1.5 6.5C.54 8.42 0 10.61 0 12s.54 3.58 1.5 5.5l3.6-2.8z" />
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.08 7.96-2.92l-3.6-2.8c-1.11.74-2.53 1.18-4.36 1.18-3.24 0-5.99-2.2-6.97-5.26l-3.6 2.8C3.4 20.35 7.35 23 12 23z" />
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="w-full text-slate-350 hover:text-white font-bold py-2 px-6 transition duration-150 text-xs sm:text-sm font-sans cursor-pointer tracking-wide"
            id="btn-go-register"
          >
            Create an Account
          </button>
        </div>
      </div>

      {/* Tri-badges Footnotes Grid */}
      <div className="w-full max-w-xs mt-4">
        <div className="grid grid-cols-3 gap-1 border-t border-slate-800/60 pt-6">
          
          <div className="flex flex-col items-center border-r border-slate-800/60 py-1">
            <Lock className="w-5 h-5 text-blue-400 mb-1.5" />
            <span className="text-[10px] text-slate-400 font-bold tracking-wide font-sans">Secure</span>
          </div>

          <div className="flex flex-col items-center border-r border-slate-800/60 py-1">
            <CheckCircle className="w-5 h-5 text-blue-400 mb-1.5" />
            <span className="text-[10px] text-slate-400 font-bold tracking-wide font-sans">Reliable</span>
          </div>

          <div className="flex flex-col items-center py-1">
            <Award className="w-5 h-5 text-blue-400 mb-1.5" />
            <span className="text-[10px] text-slate-400 font-bold tracking-wide font-sans">Trusted</span>
          </div>

        </div>

        {/* Legal Statement */}
        <p className="text-[9px] text-slate-500 text-center mt-5 tracking-wider font-mono">
          © {new Date().getFullYear()} Unitycore Bank. All rights reserved.
        </p>
      </div>

    </div>
  );
}
