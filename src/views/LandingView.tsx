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
        <div className="relative mb-8 cursor-pointer group animate-fade-in animate-duration-1000">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl group-hover:bg-indigo-500/35 transition duration-500 pointer-events-none" />
          
          <svg className="relative w-28 h-28 drop-shadow-[0_0_35px_rgba(99,102,241,0.55)] group-hover:scale-105 transition-transform duration-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="g-top-left" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              <linearGradient id="g-top-right" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
              <linearGradient id="g-vibrant-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
              <linearGradient id="g-vibrant-2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#7e22ce" />
              </linearGradient>
              <linearGradient id="g-dark-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4c1d95" />
                <stop offset="100%" stopColor="#1e1b4b" />
              </linearGradient>
              <linearGradient id="g-dark-2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2e1065" />
                <stop offset="100%" stopColor="#172554" />
              </linearGradient>
              <linearGradient id="g-light-accent" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e9d5ff" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>

            {/* LEFT LEG */}
            {/* Top cap */}
            <polygon points="25,15 43,15 34,28" fill="url(#g-light-accent)" />
            {/* Outer facet top */}
            <polygon points="25,15 34,28 25,48" fill="url(#g-vibrant-1)" />
            {/* Inner facet top */}
            <polygon points="43,15 34,28 43,48" fill="url(#g-dark-1)" />
            {/* Central diamond */}
            <polygon points="34,28 43,48 34,60 25,48" fill="url(#g-vibrant-2)" />
            {/* Bottom outer slant */}
            <polygon points="25,48 25,65 34,60" fill="url(#g-dark-2)" />
            {/* Bottom inner slant */}
            <polygon points="43,48 43,55 34,60" fill="url(#g-vibrant-1)" />

            {/* RIGHT LEG */}
            {/* Top cap */}
            <polygon points="75,15 57,15 66,28" fill="url(#g-top-right)" />
            {/* Outer facet top */}
            <polygon points="75,15 66,28 75,48" fill="url(#g-vibrant-2)" />
            {/* Inner facet top */}
            <polygon points="57,15 66,28 57,48" fill="url(#g-dark-2)" />
            {/* Central diamond */}
            <polygon points="66,28 57,48 66,60 75,48" fill="url(#g-vibrant-1)" />
            {/* Bottom outer slant */}
            <polygon points="75,48 75,65 66,60" fill="url(#g-dark-1)" />
            {/* Bottom inner slant */}
            <polygon points="57,48 57,55 66,60" fill="url(#g-vibrant-2)" />

            {/* BOTTOM JUNCTION (V-BASE) */}
            {/* Left-outer bottom triangle */}
            <polygon points="25,65 34,60 50,90" fill="url(#g-vibrant-1)" />
            {/* Right-outer bottom triangle */}
            <polygon points="75,65 66,60 50,90" fill="url(#g-vibrant-2)" />
            {/* Left-inner bottom triangle */}
            <polygon points="43,55 34,60 50,65" fill="url(#g-dark-1)" />
            {/* Right-inner bottom triangle */}
            <polygon points="57,55 66,60 50,65" fill="url(#g-dark-2)" />
            {/* Base left central facet */}
            <polygon points="34,60 50,90 50,65" fill="url(#g-vibrant-2)" />
            {/* Base right central facet */}
            <polygon points="66,60 50,90 50,65" fill="url(#g-vibrant-1)" />
          </svg>
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
