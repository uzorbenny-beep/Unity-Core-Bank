import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { Mail, CheckCircle2, RotateCw, LogOut, ShieldAlert } from "lucide-react";
import { BankUser } from "../types";

interface VerificationPendingViewProps {
  currentUser: BankUser | null;
  onBack: () => void;
  onVerifiedAndProceed: () => void;
}

export default function VerificationPendingView({
  currentUser,
  onBack,
  onVerifiedAndProceed,
}: VerificationPendingViewProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleCheckVerification = async () => {
    setIsChecking(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const user = auth.currentUser;
      if (user) {
        // Force reload identity from Firebase core databases
        await user.reload();
        if (user.emailVerified) {
          setSuccessMsg("Email successfully verified! Proceeding to your ledger dashboard...");
          setTimeout(() => {
            onVerifiedAndProceed();
          }, 1500);
        } else {
          setErrorMsg(
            "Registration email is pending validation. Please activate the link sent to your registered email address."
          );
        }
      } else {
        setErrorMsg("Authentication session lost. Please log in again.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while verifying.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsResending(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { sendEmailVerification } = await import("firebase/auth");
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        setSuccessMsg(`Verification email has been resent to: ${user.email}`);
        setCooldown(60);
      } else {
        setErrorMsg("Authentication session lost. Please log in again.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend. Please try again shortly.");
    } finally {
      setIsResending(false);
    }
  };

  const targetEmail = currentUser?.email || auth.currentUser?.email || "your email address";

  return (
    <div id="verification-pending-screen" className="flex flex-col flex-1 justify-center items-center px-6 py-12 text-slate-200">
      <div className="w-full max-w-md p-8 rounded-2xl bg-[#0f172a]/90 border border-slate-800/80 shadow-2xl backdrop-blur-sm relative overflow-hidden">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col items-center text-center space-y-6">
          {/* Logo / Badge */}
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Mail className="w-8 h-8 animate-pulse" />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-sans tracking-tight text-white">
              Verify your Email
            </h2>
            <p className="text-slate-400 text-sm">
              We've dispatched a secure activation confirmation link to:
            </p>
            <div className="font-mono text-sm px-3 py-1.5 bg-slate-900/60 rounded-lg text-emerald-400 inline-block max-w-full truncate border border-slate-800/40 select-all">
              {targetEmail}
            </div>
          </div>

          <p className="text-[#a0aec0] text-sm leading-relaxed max-w-sm">
            Please log into your mail provider and open the confirmation link to fully activate your secure ledger accounts.
          </p>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="w-full p-4.5 rounded-xl bg-red-950/40 border border-red-500/20 text-red-200 text-xs text-left flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="w-full p-4.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-200 text-xs text-left flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="w-full space-y-3 pt-2">
            {/* Primary confirmation checking */}
            <button
              id="btn-confirm-verif-click"
              onClick={handleCheckVerification}
              disabled={isChecking}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium text-white transition-all flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98] disabled:opacity-55"
            >
              {isChecking ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Checking Activation...</span>
                </>
              ) : (
                <>
                  <span>I've verified my email</span>
                </>
              )}
            </button>

            {/* Resend confirmation */}
            <button
              id="btn-resend-verif-email"
              onClick={handleResend}
              disabled={isResending || cooldown > 0}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-slate-300 font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-55"
            >
              {isResending ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Resending link...</span>
                </>
              ) : cooldown > 0 ? (
                <span>Resend available in {cooldown}s</span>
              ) : (
                <span>Resend Verification Email</span>
              )}
            </button>
          </div>

          {/* Logout / Switch accounts link */}
          <div className="pt-4 border-t border-slate-800/60 w-full flex justify-center">
            <button
              id="btn-logout-verif-screen"
              onClick={onBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-mono transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Click to Exit & Register/Login with other identity</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
