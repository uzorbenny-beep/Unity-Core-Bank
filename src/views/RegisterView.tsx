/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, User, Mail, Landmark, Sparkles, Eye, EyeOff, ShieldCheck, Globe, Phone, KeyRound, Database, Settings2, Terminal, Server } from 'lucide-react';
import { getActiveMode, dbService } from '../dbService';

interface RegisterViewProps {
  onBack: () => void;
  onRegisterSuccess: (
    email: string,
    password: string,
    username: string,
    name: string,
    amount: number,
    additionalFields: {
      legalFirstName: string;
      middleName: string;
      legalLastName: string;
      phoneNumber: string;
      country: string;
      typeOfAccount: string;
      currency: string;
      transactionPin: string;
    }
  ) => Promise<void>;
  onGoogleLogin: () => void;
}

export default function RegisterView({ onBack, onRegisterSuccess, onGoogleLogin }: RegisterViewProps) {
  const [legalFirstName, setLegalFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [legalLastName, setLegalLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState('');
  const [typeOfAccount, setTypeOfAccount] = useState('checking');
  const [currency, setCurrency] = useState('USD');
  const [transactionPin, setTransactionPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);
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

  const handleRegisterInput = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict verification - "all are must fill"
    if (!legalFirstName.trim()) {
      setErrorMessage('Please enter your legal first name');
      return;
    }
    if (!middleName.trim()) {
      setErrorMessage('Please enter your middle name');
      return;
    }
    if (!legalLastName.trim()) {
      setErrorMessage('Please enter your legal last name');
      return;
    }
    if (!username.trim()) {
      setErrorMessage('Please choose a preferred username');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMessage('Please enter your phone number with country code');
      return;
    }
    if (!country.trim()) {
      setErrorMessage('Please enter your country of residence');
      return;
    }
    if (!typeOfAccount) {
      setErrorMessage('Please select a type of account');
      return;
    }
    if (!currency) {
      setErrorMessage('Please select your preferred currency');
      return;
    }
    if (transactionPin.trim().length !== 4 || isNaN(Number(transactionPin))) {
      setErrorMessage('Transaction PIN must be exactly 4 digits');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }
    if (!agreedTerms) {
      setErrorMessage('You must agree to the Disclosure Statement');
      return;
    }

    // Construct full name
    const fullName = `${legalFirstName.trim()} ${middleName.trim()} ${legalLastName.trim()}`;

    try {
      setErrorMessage('');
      setIsSubmitting(true);
      await onRegisterSuccess(
        email.trim(),
        password,
        username.trim(),
        fullName,
        0,
        {
          legalFirstName: legalFirstName.trim(),
          middleName: middleName.trim(),
          legalLastName: legalLastName.trim(),
          phoneNumber: phoneNumber.trim(),
          country: country.trim(),
          typeOfAccount,
          currency,
          transactionPin: transactionPin.trim(),
        }
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b19] text-white flex flex-col justify-between items-center px-4 py-8 relative overflow-y-auto">
      
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
      <div className="w-full max-w-xl flex justify-between items-center relative z-10 mb-4 font-sans">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900 border border-slate-800 shadow-sm hover:bg-slate-800 transition py-1.5 px-3 rounded-full cursor-pointer animate-fade-in"
          id="btn-register-back"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-blue-400" /> Back
        </button>
        <span className="text-xs text-slate-400 font-mono font-bold">Secure Registration</span>
      </div>

      {/* Elegant Registration Card */}
      <div className="w-full max-w-xl bg-[#0f172a] border border-slate-800 rounded-3xl p-6 md:p-8 relative z-10 shadow-2xl my-auto animate-fade-in">

        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3.5 mb-6">
          <svg className="w-9 h-11" viewBox="0 0 100 120" fill="none">
            <path 
              d="M25 20 V65 C25 80 35 90 50 90 C65 90 75 80 75 65 V20" 
              stroke="url(#uGradReg)" 
              strokeWidth="16" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            <defs>
              <linearGradient id="uGradReg" x1="0.1" y1="0.1" x2="0.9" y2="0.9">
                <stop offset="0%" stopColor="#1e40af" />
                <stop offset="50%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="text-left">
            <h1 className="text-base font-extrabold tracking-[0.2em] text-white uppercase leading-none font-sans">UNITYCORE</h1>
            <span className="text-sm font-light tracking-[0.14em] text-blue-400 leading-tight font-sans">BANK</span>
          </div>
        </div>

        {/* Header Title */}
        <div className="text-center mb-6 font-sans">
          <h2 className="text-2xl font-bold text-white tracking-tight">Open an Account</h2>
          <p className="text-xs text-slate-400 mt-1">Configure your verified core ledger profile</p>
        </div>

        {/* Input Form Setup */}
        <form onSubmit={handleRegisterInput} className="space-y-4 font-sans">
          
          {/* Section 1: Legal Name Info */}
          <div className="bg-[#0b0f19] border border-slate-800 p-4 rounded-2xl space-y-3.5">
            <span className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-wider block">1. Legal Identity Credentials</span>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Legal First Name field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Legal First Name *</label>
                <input
                  type="text"
                  value={legalFirstName}
                  onChange={(e) => {
                    setLegalFirstName(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="James"
                  className="w-full bg-[#070a13] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white transition placeholder-slate-600 font-medium"
                  id="input-reg-firstname"
                />
              </div>

              {/* Legal Middle Name field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Middle Name *</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => {
                    setMiddleName(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="Alexander"
                  className="w-full bg-[#070a13] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white transition placeholder-slate-600 font-medium"
                  id="input-reg-middlename"
                />
              </div>

              {/* Legal Last Name field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Legal Last Name *</label>
                <input
                  type="text"
                  value={legalLastName}
                  onChange={(e) => {
                    setLegalLastName(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="Cooper"
                  className="w-full bg-[#070a13] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white transition placeholder-slate-600 font-medium"
                  id="input-reg-lastname"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Registry Locations */}
          <div className="bg-[#0b0f19] border border-slate-800 p-4 rounded-2xl space-y-3.5">
            <span className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-wider block">2. Contact & Registry Details</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Preferred Username field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Preferred Username *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="james_cooper"
                  className="w-full bg-[#070a13] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white transition placeholder-slate-600 font-medium"
                  id="input-reg-username"
                />
              </div>

              {/* Email Address field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="james@cooper.com"
                  className="w-full bg-[#070a13] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white transition placeholder-slate-600 font-medium"
                  id="input-reg-email"
                />
              </div>

              {/* Phone with Country Code field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-blue-400" /> Phone (with Country Code) *
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="e.g. +1 415 555 0199"
                  className="w-full bg-[#070a13] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white transition placeholder-slate-600 font-medium"
                  id="input-reg-phone"
                />
              </div>

              {/* Country field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-blue-400" /> Country *
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="e.g. United States"
                  className="w-full bg-[#070a13] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white transition placeholder-slate-600 font-medium"
                  id="input-reg-country"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Ledger Details & Settings */}
          <div className="bg-[#0b0f19] border border-slate-800 p-4 rounded-2xl space-y-3.5">
            <span className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-wider block">3. Ledger Configurations & Security</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Type of Account select dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Landmark className="w-3 h-3 text-blue-400" /> Type of Account *
                </label>
                <select
                  value={typeOfAccount}
                  onChange={(e) => setTypeOfAccount(e.target.value)}
                  className="w-full bg-[#070a13] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-2.5 px-3 text-xs text-white transition font-medium"
                  id="input-reg-accounttype"
                >
                  <option value="checking">Chamber Checking Account</option>
                  <option value="savings">High-Yield Vault Savings</option>
                  <option value="credit">Pro-Limit Credit Ledger</option>
                  <option value="investment">Wealth & Arbitrage Lock</option>
                </select>
              </div>

              {/* Currency select dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-400" /> Lead Currency *
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-[#070a13] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-2.5 px-3 text-xs text-white transition font-medium"
                  id="input-reg-currency"
                >
                  <option value="USD">USD ($) - United States Dollar</option>
                  <option value="EUR">EUR (€) - Euro Zone</option>
                  <option value="GBP">GBP (£) - Great British Pound</option>
                  <option value="CAD">CAD (C$) - Canadian Dollar</option>
                  <option value="AUD">AUD (A$) - Australian Dollar</option>
                </select>
              </div>

              {/* 4 Digit Transaction PIN */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-blue-400" /> 4-Digit Transaction PIN *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={transactionPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ''); // Digits only
                    setTransactionPin(val);
                    setErrorMessage('');
                  }}
                  placeholder="e.g. 1234"
                  className="w-full bg-[#070a13] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white font-mono tracking-widest text-center transition placeholder-slate-600 font-bold"
                  id="input-reg-pin"
                />
              </div>

              {/* Password field */}
              <div className="space-y-1 relative">
                <label className="text-[11px] font-bold text-slate-400">Auth Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="Choose strong login password"
                    className="w-full bg-[#070a13] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-xl py-2.5 pl-3.5 pr-11 text-xs text-white transition placeholder-slate-600 font-medium font-mono"
                    id="input-reg-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message alert */}
          {errorMessage && (
            <p className="text-rose-400 text-xs font-bold text-center bg-rose-950/20 border border-rose-900/40 p-2.5 rounded-lg font-mono">
              {errorMessage}
            </p>
          )}

          {/* Terms Agreement switch checkbox */}
          <div className="flex items-start gap-2.5 pt-1 text-xs">
            <input
              type="checkbox"
              id="agree-checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="w-4.5 h-4.5 rounded-md border-slate-800 bg-[#0a0e1a] accent-blue-600 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer mt-0.5"
            />
            <label htmlFor="agree-checkbox" className="text-slate-400 leading-normal cursor-pointer select-none">
              I agree to the <span className="text-blue-400 hover:text-blue-300 underline font-extrabold cursor-pointer">Unitycore Disclosure Agreement</span> and standard zero-trust cryptographic ledger guidelines.
            </label>
          </div>

          {/* Registration Submission CTA button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold py-3 px-4 rounded-xl transition duration-150 shadow-md shadow-blue-900/40 text-xs sm:text-sm font-sans mt-2 cursor-pointer flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            id="btn-register-submit"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Activating Ledger Node...</span>
              </>
            ) : (
              'Create Free Ledger Account'
            )}
          </button>

          <div className="flex items-center my-3">
            <span className="flex-1 h-px bg-slate-800/80" />
            <span className="text-[10px] text-slate-500 px-3 uppercase tracking-widest font-mono">or</span>
            <span className="flex-1 h-px bg-slate-800/80" />
          </div>

          <button
            type="button"
            onClick={onGoogleLogin}
            className="w-full flex items-center justify-center gap-2 bg-[#0f172a] hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 text-white font-bold py-3.5 px-4 rounded-xl transition duration-150 text-xs cursor-pointer active:scale-98"
            id="btn-google-login-registerview"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.61 0 3.05.55 4.19 1.64l3.12-3.12C17.43 1.84 14.9 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.6 2.8C6.01 7.24 8.76 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.6 2.8c2.11-1.95 3.33-4.82 3.33-8.48z" />
              <path fill="#FBBC05" d="M5.1 14.7c-.24-.71-.38-1.47-.38-2.7s.14-1.99.38-2.7L1.5 6.5C.54 8.42 0 10.61 0 12s.54 3.58 1.5 5.5l3.6-2.8z" />
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.08 7.96-2.92l-3.6-2.8c-1.11.74-2.53 1.18-4.36 1.18-3.24 0-5.99-2.2-6.97-5.26l-3.6 2.8C3.4 20.35 7.35 23 12 23z" />
            </svg>
            <span className="font-extrabold text-blue-400">Onboard Instantly with Google</span>
          </button>
        </form>
      </div>

      {/* Database Schema & Integrations Guideline Drawer */}
      {showDbSettings && (
        <div className="w-full max-w-xl bg-[#070b14] border border-amber-500/20 rounded-2xl p-5.5 mt-5 relative z-10 shadow-lg text-left text-xs text-slate-300 font-sans">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2 text-amber-500 font-extrabold">
              <Database className="w-4 h-4 text-amber-500" />
              <span>Core Firestore Active</span>
            </div>
            <span className="text-[9px] bg-amber-950/40 border border-amber-500/30 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">PRIMARY</span>
          </div>

          <p className="text-slate-400 leading-relaxed mb-3">
            This Unitycore Ledger Node runs with <span className="text-amber-400 font-bold">Firebase (Firestore)</span> fully integrated as its default, primary storage and real-time database.
          </p>

          <p className="text-slate-400 leading-relaxed">
            All customer registrations, banking profiles, deposits/transfers, audit trails, and system-wide configurations are synchronized securely in real-time.
          </p>
        </div>
      )}

      <p className="text-[10px] text-slate-500 text-center relative z-10 mt-4">
        🔒 Encrypted, instant setup under regulatory compliance.
      </p>

    </div>
  );
}
