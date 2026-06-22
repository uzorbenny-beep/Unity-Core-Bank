/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  MessageSquare, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  ArrowLeft, 
  Send, 
  Landmark, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  CreditCard as CardIcon, 
  PiggyBank, 
  LineChart as InvestIcon, 
  Unlock, 
  Lock, 
  LogOut, 
  RefreshCw, 
  Settings, 
  CheckCircle,
  Smartphone,
  Navigation,
  Sparkles,
  Search,
  Plus,
  Fingerprint,
  ScanFace,
  ShieldAlert
} from 'lucide-react';
import { BankUser, Account, Transaction, CreditCard, SavingsGoal, Biller, SupportTicket, BankNotification } from '../../types';
import FinancialChart from '../../components/FinancialChart';
import { saveUsersData as saveUsersDataOrig, loadUsersData, addAuditLog, getRelativeDateString, formatTransactionDate, loadDepositWithdrawConfigs, DepositWithdrawMethodConfig } from '../../mockData';
import { notificationService } from '../../notificationService';

const TIMEZONES = [
  { id: 'auto', label: 'Default / Local Browser', offset: 'Auto' },
  { id: 'Africa/Lagos', label: 'West Africa Time (WAT)', offset: 'WAT (Lagos, UTC+1)', flag: '🇳🇬' },
  { id: 'America/New_York', label: 'Eastern Time (EST/EDT)', offset: 'EST (New York, UTC-5)', flag: '🇺🇸' },
  { id: 'America/Chicago', label: 'Central Time (CST/CDT)', offset: 'CST (Chicago, UTC-6)', flag: '🇺🇸' },
  { id: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)', offset: 'PST (Los Angeles, UTC-8)', flag: '🇺🇸' },
  { id: 'Europe/London', label: 'Greenwich Mean Time (GMT)', offset: 'GMT (London, UTC+0)', flag: '🇬🇧' },
  { id: 'Europe/Paris', label: 'Central European Time (CET)', offset: 'CET (Paris, UTC+1)', flag: '🇫🇷' },
  { id: 'Asia/Dubai', label: 'Gulf Standard Time (GST)', offset: 'GST (Dubai, UTC+4)', flag: '🇦🇪' },
  { id: 'Asia/Singapore', label: 'Singapore Standard Time (SGT)', offset: 'SGT (Singapore, UTC+8)', flag: '🇸🇬' },
];

interface UserDashboardViewProps {
  currentUser: BankUser;
  onLogout: () => void;
  onRoleSwitch: (role: 'admin') => void;
  onRefreshUser: (username: string) => void;
  onInitiateTransaction?: (userId: string, tx: Transaction) => Promise<void>;
}

export default function UserDashboardView({ currentUser, onLogout, onRoleSwitch, onRefreshUser, onInitiateTransaction }: UserDashboardViewProps) {
  // Simultaneous write interceptor to ensure all initiated transaction creations go to global Firebase queues
  const saveUsersData = (updatedUsers: BankUser[]) => {
    // 1. Call standard origin persist
    saveUsersDataOrig(updatedUsers);

    // 2. Identify and simultaneously write any newly logged transactions through App.tsx's handler
    const updatedMe = updatedUsers.find(u => u.id === currentUser.id);
    if (updatedMe && onInitiateTransaction) {
      const existingTxIds = new Set((currentUser.transactions || []).map(t => t.id));
      const newTxs = (updatedMe.transactions || []).filter(t => !existingTxIds.has(t.id));
      
      newTxs.forEach(tx => {
        onInitiateTransaction(currentUser.id, tx).catch(err => {
          console.warn("Direct real-time transaction submission failed:", err);
        });
      });
    }
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'transfers' | 'cards' | 'more' | 'activity' | 'intl-wire' | 'deposit' | 'loan' | 'irs-refund' | 'support' | 'investment' | 'crypto' | 'grant' | 'vaults'>('dashboard');
  const [showBankingMenu, setShowBankingMenu] = useState(false);

  // Timezone & Live clock states
  const [selectedTimezone, setSelectedTimezone] = useState(() => {
    return (typeof localStorage !== 'undefined' ? localStorage.getItem('user_timezone') : null) || 'auto';
  });
  const [currentHeaderTime, setCurrentHeaderTime] = useState<Date>(new Date());
  const [showTzDropdown, setShowTzDropdown] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeaderTime(new Date());
    }, 1000);

    const handleTzChanged = () => {
      setSelectedTimezone((typeof localStorage !== 'undefined' ? localStorage.getItem('user_timezone') : null) || 'auto');
    };
    window.addEventListener('timezone-changed', handleTzChanged);

    return () => {
      clearInterval(timer);
      window.removeEventListener('timezone-changed', handleTzChanged);
    };
  }, []);

  // Profile Editable state
  const [profileFirstName, setProfileFirstName] = useState(currentUser.legalFirstName || '');
  const [profileMiddleName, setProfileMiddleName] = useState(currentUser.middleName || '');
  const [profileLastName, setProfileLastName] = useState(currentUser.legalLastName || '');
  const [profileUsername, setProfileUsername] = useState(currentUser.username || '');
  const [profileEmail, setProfileEmail] = useState(currentUser.email || '');
  const [profilePhone, setProfilePhone] = useState(currentUser.phoneNumber || '');
  const [profileCountry, setProfileCountry] = useState(currentUser.country || '');
  const [profileAccountType, setProfileAccountType] = useState(currentUser.typeOfAccount || 'checking');
  const [profileCurrency, setProfileCurrency] = useState(currentUser.currency || 'USD');
  const [profilePin, setProfilePin] = useState(currentUser.transactionPin || '');
  const [profilePassword, setProfilePassword] = useState(currentUser.password || '');

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState('');
  const [profileUpdateError, setProfileUpdateError] = useState('');

  // Profile Picture (Avatar) States & Handler
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const handleUpdateAvatar = async (newUrl: string) => {
    if (!newUrl) return;
    try {
      setAvatarError('');
      const allUsers = loadUsersData();
      const updatedList = allUsers.map((u) => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            avatarUrl: newUrl,
          };
        }
        return u;
      });
      saveUsersData(updatedList);

      // Save to Firebase if enabled
      try {
        const { getActiveMode } = await import('../../dbService');
        if (getActiveMode() === "firebase") {
          const { db } = await import('../../firebase');
          const { doc, updateDoc } = await import('firebase/firestore');
          if (db) {
            const userDocRef = doc(db, 'users', currentUser.id);
            await updateDoc(userDocRef, {
              avatarUrl: newUrl
            });
          }
        }
      } catch (fErr) {
        console.warn("Firestore update skipped or offline:", fErr);
      }

      onRefreshUser(currentUser.id);
      addAuditLog(currentUser.username, currentUser.id, 'PROFILE_AVATAR_UPDATE', 'Successfully updated security display photo.');
      setShowAvatarModal(false);
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to update avatar photo.');
    }
  };

  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [showProfilePin, setShowProfilePin] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);

  useEffect(() => {
    setProfileFirstName(currentUser.legalFirstName || '');
    setProfileMiddleName(currentUser.middleName || '');
    setProfileLastName(currentUser.legalLastName || '');
    setProfileUsername(currentUser.username || '');
    setProfileEmail(currentUser.email || '');
    setProfilePhone(currentUser.phoneNumber || '');
    setProfileCountry(currentUser.country || '');
    setProfileAccountType(currentUser.typeOfAccount || 'checking');
    setProfileCurrency(currentUser.currency || 'USD');
    setProfilePin(currentUser.transactionPin || '');
    setProfilePassword(currentUser.password || '');
  }, [currentUser]);

  // Security Verification Modal State (requested PIN 1234, all codes 1234)
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityCodeInput, setSecurityCodeInput] = useState('');
  const [securityModalType, setSecurityModalType] = useState<'PIN' | 'OTP' | 'WIRE_CODE'>('PIN');
  const [securityModalTitle, setSecurityModalTitle] = useState('Transaction PIN Required');
  const [securityModalDesc, setSecurityModalDesc] = useState('Please enter your 4-digit security PIN to authorize this request.');
  const [securityOnSuccess, setSecurityOnSuccess] = useState<() => void>(() => {});
  const [securityErrorMsg, setSecurityErrorMsg] = useState('');

  // Investment State Variables
  const [investPlan, setInvestPlan] = useState<'starter' | 'silver' | 'gold' | 'sapphire'>('starter');
  const [investAmount, setInvestAmount] = useState('');
  const [investSuccessMsg, setInvestSuccessMsg] = useState('');
  const [investmentsList, setInvestmentsList] = useState<Array<{ id: string; planName: string; amount: number; rate: number; startDate: string; daysRemaining: number; currentEarnings: number; status: 'Active' | 'Matured' }>>([
    { id: 'inv-3091', planName: 'Silver (5% Daily ROI)', amount: 15000, rate: 5.0, startDate: getRelativeDateString(17, true), daysRemaining: 14, currentEarnings: 5250, status: 'Active' }
  ]);

  // Crypto Swap State Variables
  const [cryptoFrom, setCryptoFrom] = useState<'USD' | 'BTC' | 'ETH' | 'USDT'>('USD');
  const [cryptoTo, setCryptoTo] = useState<'USD' | 'BTC' | 'ETH' | 'USDT'>('BTC');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [cryptoSwapSuccess, setCryptoSwapSuccess] = useState('');
  const [cryptoWallets, setCryptoWallets] = useState<{ BTC: number; ETH: number; USDT: number }>({
    BTC: 0.14502,
    ETH: 1.84102,
    USDT: 450.00
  });

  // Capital Grants / Welfare State Variables
  const [grantType, setGrantType] = useState<'recovery' | 'sme' | 'welfare' | 'imf'>('recovery');
  const [grantAmountStr, setGrantAmountStr] = useState('25000');
  const [grantReason, setGrantReason] = useState('');
  const [grantStep, setGrantStep] = useState<0 | 1 | 2 | 3>(0); // 0: Apply, 1: Loading, 2: Code Step (1234), 3: Success
  const [grantErr, setGrantErr] = useState('');

  // International Wire State variables
  const [wireTargetAccount, setWireTargetAccount] = useState('acc-checking');
  const [wireAmount, setWireAmount] = useState('');
  const [wireSwift, setWireSwift] = useState('');
  const [wireBankName, setWireBankName] = useState('');
  const [wireBeneficiary, setWireBeneficiary] = useState('');
  const [wireCountry, setWireCountry] = useState('united-kingdom');
  const [wireCurrency, setWireCurrency] = useState('EUR');
  const [wireRemarks, setWireRemarks] = useState('');
  const [wireProcessing, setWireProcessing] = useState(false);
  const [wireSuccessMsg, setWireSuccessMsg] = useState('');

  // Mobile Check Deposit State overrides
  const [depositCheckNumber, setDepositCheckNumber] = useState('');
  const [depositBackCaptured, setDepositBackCaptured] = useState(false);
  const [depositFrontCaptured, setDepositFrontCaptured] = useState(false);
  const [depositPhotoFile, setDepositPhotoFile] = useState<string | null>(null);
  const [depositProcessingState, setDepositProcessingState] = useState(false);
  const [depositReportMsg, setDepositReportMsg] = useState('');

  // Loan Applications and history states
  const [loanAmount, setLoanAmount] = useState('15000');
  const [loanTerm, setLoanTerm] = useState('36');
  const [loanCategory, setLoanCategory] = useState<'personal' | 'vehicle' | 'business' | 'real-estate'>('personal');
  const [loanProcessing, setLoanProcessing] = useState(false);
  const [loanSuccessMsg, setLoanSuccessMsg] = useState('');
  const [loansList, setLoansList] = useState<Array<{id: string, category: string, principal: number, rate: number, term: number, monthlyPayment: number, status: 'Active' | 'Paid' | 'Pending'}>>([
    { id: 'loan-3958', category: 'Personal Finance Boost', principal: 12000, rate: 5.4, term: 24, monthlyPayment: 528.50, status: 'Active' }
  ]);

  // IRS Tax Refund state machines
  const [irsSsn, setIrsSsn] = useState('');
  const [irsExpectedAmount, setIrsExpectedAmount] = useState('3050');
  const [irsStatusStep, setIrsStatusStep] = useState<0 | 1 | 2 | 3 | 4>(0); // 0: Idle, 1: Verifying records, 2: Found, 3: Direct deposit auth, 4: Dispatched payout
  const [irsProcessing, setIrsProcessing] = useState(false);
  const [irsError, setIrsError] = useState('');

  // Smart Live Support client messages state
  const [supportMessages, setSupportMessages] = useState<Array<{sender: 'user' | 'bot', text: string, timestamp: string}>>([
    { sender: 'bot', text: 'Welcome to Unitycore Autonomous Help Desk. Type your banking query or choose a direct quick command below for atomic sandbox resolution.', timestamp: 'Just Now' }
  ]);
  const [supportInput, setSupportInput] = useState('');
  
  // Checking statement drill-down state
  // If null, we show the accounts grid (Screen 3), if set, we show checking details (Screen 2)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  
  // Balance Visibility Toggle (Eye icon in Screen 4)
  const [showBalance, setShowBalance] = useState(true);

  // Biometric Auth Simulation states
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(() => {
    return localStorage.getItem('biometric_auth_enabled') === 'true';
  });
  const [biometricType, setBiometricType] = useState<'face-id' | 'touch-id'>(() => {
    return (localStorage.getItem('biometric_auth_type') as 'face-id' | 'touch-id') || 'face-id';
  });
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricScanSuccess, setBiometricScanSuccess] = useState(false);
  const [useBackupPin, setUseBackupPin] = useState(false);

  const toggleBiometric = () => {
    const nextValue = !biometricEnabled;
    setBiometricEnabled(nextValue);
    localStorage.setItem('biometric_auth_enabled', String(nextValue));
    addAuditLog(
      currentUser.username,
      currentUser.id,
      "SECURITY_CHANGE",
      `${nextValue ? "Activated" : "Deactivated"} biometric fingerprint and face verification simulations in sandbox profile.`
    );
  };

  const handleBiometricScan = () => {
    if (biometricScanning || biometricScanSuccess) return;
    setBiometricScanning(true);
    setSecurityErrorMsg('');
    
    setTimeout(() => {
      setBiometricScanning(false);
      setBiometricScanSuccess(true);
      
      setTimeout(() => {
        setShowSecurityModal(false);
        if (typeof securityOnSuccess === 'function') {
          securityOnSuccess();
        }
      }, 800);
    }, 1500);
  };

  // Quick check deposit/withdraw state
  const [depositAmount, setDepositAmount] = useState('');
  const [depositTarget, setDepositTarget] = useState('acc-checking');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositOrWithdraw, setDepositOrWithdraw] = useState<'deposit' | 'withdraw'>('deposit');
  
  // Rearranged deposit/withdrawal state
  const [selectedMethodId, setSelectedMethodId] = useState<'bank' | 'check' | 'crypto'>('bank');
  const [dwConfigs, setDwConfigs] = useState<DepositWithdrawMethodConfig[]>(() => loadDepositWithdrawConfigs());
  const [dwReference, setDwReference] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const activeCfg = dwConfigs.find(c => c.id === selectedMethodId);
  const isDeposit = depositOrWithdraw === 'deposit';
  const isEnabled = activeCfg ? (isDeposit ? activeCfg.depositEnabled : activeCfg.withdrawEnabled) : true;

  useEffect(() => {
    if (showDepositModal || activeTab === 'deposit') {
      setDwConfigs(loadDepositWithdrawConfigs());
    }
  }, [showDepositModal, activeTab]);
  
  // Transfer state
  const [transferFrom, setTransferFrom] = useState('acc-checking');
  const [transferTo, setTransferTo] = useState('acc-savings');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferType, setTransferType] = useState<'internal' | 'external'>('internal');
  const [transferCategory, setTransferCategory] = useState<Transaction['category']>('transfer');
  const [recipientName, setRecipientName] = useState('');
  const [recipientRouting, setRecipientRouting] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [transferProcessing, setTransferProcessing] = useState(false);
  const [transferSuccessMsg, setTransferSuccessMsg] = useState('');

  // Notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [generatedSecurityCode, setGeneratedSecurityCode] = useState('1234');
  const [selectedEmailForViewer, setSelectedEmailForViewer] = useState<BankNotification | null>(null);
  const [notificationInboxFilter, setNotificationInboxFilter] = useState<'all' | 'email' | 'push'>('all');
  const [activeInAppToasts, setActiveInAppToasts] = useState<BankNotification[]>([]);
  
  // Search state for transactions
  const [searchQuery, setSearchQuery] = useState('');

  // --- ADDITIONAL CUSTOM STATE VARIABLES ---
  const [transferMode, setTransferMode] = useState<'standard' | 'p2p' | 'billpay'>('standard');
  const [p2pTarget, setP2pTarget] = useState('');
  const [billerName, setBillerName] = useState('');
  const [billerAccount, setBillerAccount] = useState('');
  const [billerCategory, setBillerCategory] = useState<'utilities' | 'internet' | 'entertainment' | 'other'>('utilities');
  const [billerSchedule, setBillerSchedule] = useState<'one-time' | 'weekly' | 'monthly' | 'quarterly'>('monthly');
  const [billerAmount, setBillerAmount] = useState('');
  
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({});
  const [cardTimers, setCardTimers] = useState<Record<string, number>>({});
  const [showIssueCardModal, setShowIssueCardModal] = useState(false);
  const [newCardHolder, setNewCardHolder] = useState(currentUser.name.toUpperCase());
  const [newCardType, setNewCardType] = useState<'virtual' | 'physical'>('virtual');
  const [newCardNetwork, setNewCardNetwork] = useState<'visa' | 'mastercard'>('visa');
  const [newCardTheme, setNewCardTheme] = useState<'purple' | 'cyberpunk' | 'gold' | 'emerald'>('purple');
  const [newCardLimit, setNewCardLimit] = useState('15000');

  const [newVaultName, setNewVaultName] = useState('');
  const [newVaultTarget, setNewVaultTarget] = useState('');
  const [newVaultCategory, setNewVaultCategory] = useState('Emergency Fund');
  const [newVaultDate, setNewVaultDate] = useState('');
  const [fundingVaultId, setFundingVaultId] = useState<string | null>(null);
  const [fundingAmount, setFundingAmount] = useState('');
  const [fundingDirection, setFundingDirection] = useState<'in' | 'out'>('in');

  const [ciPrincipal, setCiPrincipal] = useState(10000);
  const [ciMonthly, setCiMonthly] = useState(250);
  const [ciRate, setCiRate] = useState(5.5);
  const [ciYears, setCiYears] = useState(10);

  const [supportChatMode, setSupportChatMode] = useState<'chat' | 'disputes'>('chat');
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedTxForDispute, setSelectedTxForDispute] = useState<Transaction | null>(null);
  const [disputeReason, setDisputeReason] = useState('Double charged');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeUrgency, setDisputeUrgency] = useState<'low' | 'medium' | 'high'>('medium');

  // Savings Vault Interactive Modals & Projection model States
  const [showCreateVaultModal, setShowCreateVaultModal] = useState(false);
  const [showFundVaultModal, setShowFundVaultModal] = useState(false);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [newVaultTitle, setNewVaultTitle] = useState('');
  const [fundVaultSourceId, setFundVaultSourceId] = useState('');
  const [fundVaultAmount, setFundVaultAmount] = useState('');
  const [projectPrincipal, setProjectPrincipal] = useState(10000);
  const [projectMonthly, setProjectMonthly] = useState(200);
  const [projectYears, setProjectYears] = useState(5);

  // Triggering the Security countdown timers on credentials
  useEffect(() => {
    const interval = setInterval(() => {
      setCardTimers(prev => {
        const next = { ...prev };
        let updated = false;
        Object.keys(next).forEach(k => {
          if (next[k] > 0) {
            next[k] -= 1;
            updated = true;
          } else if (next[k] === 0) {
            delete next[k];
            setRevealedCards(curr => {
              const c = { ...curr };
              delete c[k];
              return c;
            });
            updated = true;
          }
        });
        return updated ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Set accurate default account IDs dynamically based on the actual currentUser's accounts
  useEffect(() => {
    if (currentUser?.accounts && currentUser.accounts.length > 0) {
      const checking = currentUser.accounts.find(a => a.type === 'checking') || currentUser.accounts[0];
      const savings = currentUser.accounts.find(a => a.type === 'savings') || currentUser.accounts[1] || currentUser.accounts[0];
      
      if (depositTarget === 'acc-checking' && checking) {
        setDepositTarget(checking.id);
      }
      if (transferFrom === 'acc-checking' && checking) {
        setTransferFrom(checking.id);
      }
      if (transferTo === 'acc-savings' && savings) {
        setTransferTo(savings.id);
      }
      if (wireTargetAccount === 'acc-checking' && checking) {
        setWireTargetAccount(checking.id);
      }
    }
  }, [currentUser, depositTarget, transferFrom, transferTo, wireTargetAccount]);

  // Helper to re-fetch and update parent layout state
  const triggerStateRefresh = () => {
    onRefreshUser(currentUser.username);
  };

  // Listen for real-time notification events to display sliding dynamic push toasts in current window
  useEffect(() => {
    const handleNewNotification = (e: Event) => {
      const customEvent = e as CustomEvent<BankNotification>;
      if (customEvent.detail) {
        const notif = customEvent.detail;
        setActiveInAppToasts(prev => [notif, ...prev]);

        // Auto-refresh layout databases to remain synced
        triggerStateRefresh();

        // Auto-clear toast alert after 6 seconds
        setTimeout(() => {
          setActiveInAppToasts(prev => prev.filter(t => t.id !== notif.id));
        }, 6000);
      }
    };

    window.addEventListener('new-bank-notification', handleNewNotification);
    return () => {
      window.removeEventListener('new-bank-notification', handleNewNotification);
    };
  }, []);

  // PIN Verification Trigger Callback helper
  const promptSecurityCheck = (
    type: 'PIN' | 'OTP' | 'WIRE_CODE',
    title: string,
    desc: string,
    onSuccessCallback: () => void
  ) => {
    const tempCode = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedSecurityCode(tempCode);

    setSecurityModalType(type);
    setSecurityModalTitle(title);
    setSecurityModalDesc(desc);
    setSecurityCodeInput('');
    setSecurityErrorMsg('');
    setSecurityOnSuccess(() => onSuccessCallback);
    setBiometricScanning(false);
    setBiometricScanSuccess(false);
    setUseBackupPin(false);
    setShowSecurityModal(true);

    // Trigger interactive notification dispatch alert for the code!
    notificationService.sendOtpAuthenticationCode(
      currentUser,
      `${title} Authorization Requested`,
      tempCode
    ).catch(err => console.error("Error dispatching OTP action notification code:", err));
  };

  const handleVerifySecurityCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (securityCodeInput === generatedSecurityCode || securityCodeInput === '1234') {
      setShowSecurityModal(false);
      setSecurityCodeInput('');
      setSecurityErrorMsg('');
      if (typeof securityOnSuccess === 'function') {
        securityOnSuccess();
      }
    } else {
      setSecurityErrorMsg(`Invalid security authorization dynamic code or PIN (${generatedSecurityCode} or 1234). Access denied.`);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileFirstName.trim()) {
      setProfileUpdateError("Legal First Name is required.");
      return;
    }
    if (!profileMiddleName.trim()) {
      setProfileUpdateError("Middle Name is required.");
      return;
    }
    if (!profileLastName.trim()) {
      setProfileUpdateError("Legal Last Name is required.");
      return;
    }
    if (!profileUsername.trim()) {
      setProfileUpdateError("Username is required.");
      return;
    }
    if (!profileEmail.trim() || !profileEmail.includes("@")) {
      setProfileUpdateError("Please provide a valid email address.");
      return;
    }
    if (!profilePhone.trim()) {
      setProfileUpdateError("Phone number with country code is required.");
      return;
    }
    if (!profileCountry.trim()) {
      setProfileUpdateError("Country is required.");
      return;
    }
    if (profilePin.trim().length !== 4 || isNaN(Number(profilePin))) {
      setProfileUpdateError("Transaction PIN must be exactly 4 digits.");
      return;
    }
    if (!profilePassword || profilePassword.length < 6) {
      setProfileUpdateError("Password must be at least 6 characters.");
      return;
    }

    try {
      setProfileUpdateError('');
      setProfileUpdateSuccess('');

      // Auto update active timezone based on Residing Country
      let determinedTz = (typeof localStorage !== 'undefined' ? localStorage.getItem('user_timezone') : null) || 'auto';
      const c = profileCountry.trim().toLowerCase();
      if (c.includes('nigeria') || c.includes('lagos') || c.includes('west africa') || c.includes('africa') || c.includes('niger') || c.includes('ghana') || c.includes('cameroon')) {
        determinedTz = 'Africa/Lagos';
      } else if (c.includes('united states') || c.includes('america') || c.includes('new york') || c.includes('est') || c.includes('us') || c.includes('washington') || c.includes('canada') || c.includes('toronto')) {
        determinedTz = 'America/New_York';
      } else if (c.includes('united kingdom') || c.includes('london') || c.includes('england') || c.includes('gmt') || c.includes('uk')) {
        determinedTz = 'Europe/London';
      } else if (c.includes('france') || c.includes('paris') || c.includes('cet') || c.includes('europe')) {
        determinedTz = 'Europe/Paris';
      } else if (c.includes('dubai') || c.includes('uae') || c.includes('emirates') || c.includes('gst')) {
        determinedTz = 'Asia/Dubai';
      } else if (c.includes('singapore') || c.includes('sgt') || c.includes('asia')) {
        determinedTz = 'Asia/Singapore';
      }
      localStorage.setItem('user_timezone', determinedTz);
      setSelectedTimezone(determinedTz);
      window.dispatchEvent(new Event('timezone-changed'));

      // 1. Update localStorage
      const allUsers = loadUsersData();
      const updatedList = allUsers.map((u) => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            name: `${profileFirstName.trim()} ${profileMiddleName.trim()} ${profileLastName.trim()}`,
            username: profileUsername.trim(),
            email: profileEmail.trim(),
            legalFirstName: profileFirstName.trim(),
            middleName: profileMiddleName.trim(),
            legalLastName: profileLastName.trim(),
            phoneNumber: profilePhone.trim(),
            country: profileCountry.trim(),
            typeOfAccount: profileAccountType,
            currency: profileCurrency,
            transactionPin: profilePin.trim(),
            password: profilePassword,
            iban: currentUser.iban || u.iban,
          };
        }
        return u;
      });

      saveUsersData(updatedList);

      // 2. Try Firestore edit if non-local database setup is operational
      try {
        const { db } = await import('../../firebase');
        const { doc, updateDoc } = await import('firebase/firestore');
        const userDocRef = doc(db, 'users', currentUser.id);
        await updateDoc(userDocRef, {
          name: `${profileFirstName.trim()} ${profileMiddleName.trim()} ${profileLastName.trim()}`,
          username: profileUsername.trim(),
          email: profileEmail.trim(),
          legalFirstName: profileFirstName.trim(),
          middleName: profileMiddleName.trim(),
          legalLastName: profileLastName.trim(),
          phoneNumber: profilePhone.trim(),
          country: profileCountry.trim(),
          typeOfAccount: profileAccountType,
          currency: profileCurrency,
          transactionPin: profilePin.trim(),
          password: profilePassword,
          iban: currentUser.iban || "",
        });
      } catch (fbErr) {
        console.warn("Firestore profile synchronization skipped or offline:", fbErr);
      }

      // Add audit log
      addAuditLog(
        currentUser.username,
        currentUser.id,
        "PROFILE_UPDATED",
        "Updated core regulatory registry fields inside user profile settings."
      );

      // Refresh parent state
      onRefreshUser(currentUser.id);
      setIsEditingProfile(false);
      setProfileUpdateSuccess("Profile database updated successfully!");
    } catch (err: any) {
      setProfileUpdateError(err.message || "Failed to update profile registry.");
    }
  };

  // Investment actions
  const handleCreateInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid investment amount');
      return;
    }

    // Check balance in checking account
    const checkingAcc = currentUser.accounts.find(a => a.type === 'checking');
    if (!checkingAcc || checkingAcc.balance < amount) {
      alert('Insufficient funds in your Checking Account to fund this plan.');
      return;
    }

    promptSecurityCheck('PIN', 'Authorize Investment', `Enter your 4-digit PIN (1234) to authorize $${amount.toLocaleString()} USD from checking into ${investPlan.toUpperCase()} plan.`, () => {
      // Execute
      const allUsers = loadUsersData();
      const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
      if (userIdx !== -1) {
        const userChecking = allUsers[userIdx].accounts.find(a => a.type === 'checking');
        const userInvestment = allUsers[userIdx].accounts.find(a => a.type === 'investment');
        if (userChecking && userInvestment) {
          // Do NOT adjust balances yet since it requires admin confirmation!
          // userChecking.balance -= amount;
          // userInvestment.balance += amount;
          
          const dailyRates = { starter: 2.0, silver: 5.0, gold: 10.0, sapphire: 20.0 };
          const planNames = { starter: 'Starter Package', silver: 'Silver Accumulator', gold: 'Gold Vanguard', sapphire: 'Pioneer Sapphire Elite' };
          
          const newInv = {
            id: `inv-${Date.now()}`,
            planName: `${planNames[investPlan]} (${dailyRates[investPlan]}% Daily ROI)`,
            amount,
            rate: dailyRates[investPlan],
            startDate: 'Today',
            daysRemaining: 30,
            currentEarnings: 0,
            status: 'Active' as const // local session view
          };

          // Append transaction item with status 'pending'
          const newTx: Transaction = {
            id: `tx-inv-${Date.now()}`,
            description: `Funded ${planNames[investPlan]}`,
            amount: -amount,
            date: formatTransactionDate(Date.now()),
            timestamp: Date.now(),
            category: 'transfer' as const,
            status: 'pending',
            targetAccountId: userChecking.id
          };

          allUsers[userIdx].transactions = [newTx, ...allUsers[userIdx].transactions];
          saveUsersData(allUsers);
          addAuditLog(currentUser.username, currentUser.id, 'INVEST_CREATE', `Requested funding of ${planNames[investPlan]} with ${amount}. Pending admin authorization.`);
          
          setInvestmentsList([newInv, ...investmentsList]);
          setInvestAmount('');
          setInvestSuccessMsg(`Investment request submitted! $${amount} has been queued and awaits Admin verification before execution.`);
          triggerStateRefresh();
        }
      }
    });
  };

  // Crypto Swap action
  const handleCryptoSwap = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(cryptoAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const usdEquivalents = { USD: 1, BTC: 68000, ETH: 3800, USDT: 1 };
    
    // Check if source has balance
    let hasBalance = false;
    if (cryptoFrom === 'USD') {
      const checkingAcc = currentUser.accounts.find(a => a.type === 'checking');
      if (checkingAcc && checkingAcc.balance >= amount) {
        hasBalance = true;
      }
    } else {
      const balance = cryptoWallets[cryptoFrom];
      if (balance >= amount) {
        hasBalance = true;
      }
    }

    if (!hasBalance) {
      alert(`Insufficient funds in your ${cryptoFrom} wallet.`);
      return;
    }

    promptSecurityCheck('OTP', 'Authorize Coin Trade', `Enter your 4-digit code (1234) to execute swap of ${amount} ${cryptoFrom} to ${cryptoTo}.`, () => {
      const valueInUSD = amount * usdEquivalents[cryptoFrom];
      const targetReceivedAmount = valueInUSD / usdEquivalents[cryptoTo];

      const allUsers = loadUsersData();
      const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
      if (userIdx !== -1) {
        // Do NOT adjust balances yet since it requires admin confirmation!
        const userChecking = allUsers[userIdx].accounts.find(a => a.type === 'checking');
        const newTx: Transaction = {
          id: `tx-swap-${Date.now()}`,
          description: `Crypto Swapped ${cryptoFrom} to ${cryptoTo}`,
          amount: cryptoFrom === 'USD' ? -amount : cryptoTo === 'USD' ? targetReceivedAmount : 0,
          date: formatTransactionDate(Date.now()),
          timestamp: Date.now(),
          category: 'transfer' as const,
          status: 'pending',
          targetAccountId: userChecking ? userChecking.id : undefined
        };

        allUsers[userIdx].transactions = [newTx, ...allUsers[userIdx].transactions];
        saveUsersData(allUsers);
        addAuditLog(currentUser.username, currentUser.id, 'CRYPTO_SWAP', `Requested exchange of ${amount} ${cryptoFrom} to ${targetReceivedAmount} ${cryptoTo}. Pending admin approval.`);
        
        setCryptoAmount('');
        setCryptoSwapSuccess(`Swap transaction generated! Swapping ${amount} ${cryptoFrom} to ${cryptoTo} is now pending administrative authorization.`);
        triggerStateRefresh();
      }
    });
  };

  // Capital Grant Apply
  const handleApplyGrant = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(grantAmountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid grant target amount');
      return;
    }
    if (!grantReason.trim()) {
      alert('Please explain the reason or business purpose of the grant');
      return;
    }

    setGrantErr('');
    setGrantStep(1);

    setTimeout(() => {
      setGrantStep(2);
    }, 1500);
  };

  const handleVerifyGrantCode = (code: string) => {
    if (code === '1234') {
      setGrantStep(1);
      setTimeout(() => {
        const allUsers = loadUsersData();
        const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
        if (userIdx !== -1) {
          const userChecking = allUsers[userIdx].accounts.find(a => a.type === 'checking');
          if (userChecking) {
            const parsedAmt = parseFloat(grantAmountStr);
            // Do NOT adjust balance yet since it requires admin confirmation!
            // userChecking.balance += parsedAmt;

            const newTx: Transaction = {
              id: `tx-grant-${Date.now()}`,
              description: `Approved Capital Welfare Grant`,
              amount: parsedAmt,
              date: formatTransactionDate(Date.now()),
              timestamp: Date.now(),
              category: 'salary' as const,
              status: 'pending',
              targetAccountId: userChecking.id
            };

            allUsers[userIdx].transactions = [newTx, ...allUsers[userIdx].transactions];
            saveUsersData(allUsers);
            addAuditLog(currentUser.username, currentUser.id, 'GRANT_APPROVED', `Submitted capital grant request of $${parsedAmt}. Pending admin confirmation.`);
            
            setGrantStep(3);
            setGrantReason('');
            triggerStateRefresh();
          }
        }
      }, 1800);
    } else {
      setGrantErr('Validation failed. The government authorization OTP code holds invalid status.');
    }
  };

  // Keep checking drill down synced if balance changes
  useEffect(() => {
    if (selectedAccount) {
      const updated = currentUser.accounts.find(a => a.id === selectedAccount.id);
      if (updated) setSelectedAccount(updated);
    }
  }, [currentUser, selectedAccount]);

  // Compute total balance dynamically
  const computedTotal = currentUser.accounts.reduce((acc, current) => {
    // If credit, it represents a negative outstanding balance
    return acc + current.balance;
  }, 0);

  // Formatting helper
  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const text = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(absVal);
    return isNegative ? `-${text}` : text;
  };

  // Clipboard copying helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1500);
  };

  // Trigger Mock Check Deposit / Withdrawal
  const handleCheckDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert(`Please enter a valid ${depositOrWithdraw === 'deposit' ? 'deposit' : 'withdrawal'} amount`);
      return;
    }

    const currentConfigs = loadDepositWithdrawConfigs();
    const activeCfg = currentConfigs.find(c => c.id === selectedMethodId);
    
    if (activeCfg) {
      const isDeposit = depositOrWithdraw === 'deposit';
      if (isDeposit && !activeCfg.depositEnabled) {
        alert(`This deposit method (${activeCfg.name}) is currently suspended or disabled by administrative security policies.`);
        return;
      }
      if (!isDeposit && !activeCfg.withdrawEnabled) {
        alert(`This withdrawal method (${activeCfg.name}) is currently suspended or disabled by administrative security policies.`);
        return;
      }
    }

    const allUsers = loadUsersData();
    const userIdx = allUsers.findIndex(u => u.id === currentUser.id);

    if (userIdx !== -1) {
      const isDeposit = depositOrWithdraw === 'deposit';
      let finalRef = dwReference.trim();
      if (!finalRef) {
        if (selectedMethodId === 'bank') {
          finalRef = isDeposit 
            ? `Wire #${Math.floor(100000 + Math.random() * 900000)}-Chase` 
            : `IBAN DE89 ${Math.floor(1000 + Math.random() * 9500)} ${Math.floor(1000 + Math.random() * 9500)} ${Math.floor(100000 + Math.random() * 900000)}`;
        } else if (selectedMethodId === 'check') {
          finalRef = `Check #${Math.floor(200000 + Math.random() * 700000)}`;
        } else {
          finalRef = isDeposit 
            ? `TXID: tf${Math.floor(100000 + Math.random() * 900000)}b8d` 
            : `TRC20-TA${Math.floor(100000 + Math.random() * 900000)}xyz`;
        }
      }

      let matchAcc = allUsers[userIdx].accounts.find(a => a.id === depositTarget);
      if (!matchAcc && allUsers[userIdx].accounts.length > 0) {
        matchAcc = allUsers[userIdx].accounts.find(a => a.type === 'checking') || allUsers[userIdx].accounts[0];
      }

      if (matchAcc) {
        if (!isDeposit && matchAcc.balance < amount) {
          alert(`Insufficient funds in ${matchAcc.name}! Available balance is ${formatCurrency(matchAcc.balance)}`);
          return;
        }

        // Submitting creates a transaction with status 'pending'
        let description = '';
        if (selectedMethodId === 'bank') {
          description = isDeposit 
            ? `Bank wire deposit to ${matchAcc.name}` 
            : `Bank wire withdrawal from ${matchAcc.name}`;
        } else if (selectedMethodId === 'check') {
          description = isDeposit 
            ? `Mobile check deposit to ${matchAcc.name}` 
            : `Check issue withdrawal from ${matchAcc.name}`;
        } else {
          description = isDeposit 
            ? `Crypto (USDT) deposit to ${matchAcc.name}` 
            : `Crypto (USDT) withdrawal from ${matchAcc.name}`;
        }
        
        if (finalRef) {
          description += ` (${finalRef})`;
        }

        const newTx: Transaction = {
          id: isDeposit ? `tx-dep-${Date.now()}` : `tx-wdr-${Date.now()}`,
          description,
          amount: isDeposit ? amount : -amount,
          date: formatTransactionDate(Date.now()),
          timestamp: Date.now(),
          category: isDeposit ? 'salary' : 'transfer',
          status: 'pending',
          targetAccountId: matchAcc.id
        };

        allUsers[userIdx].transactions = [newTx, ...allUsers[userIdx].transactions];
        saveUsersData(allUsers);
        
        const actionType = isDeposit ? 'DEPOSIT' : 'WITHDRAW';
        addAuditLog(
          currentUser.username, 
          currentUser.id, 
          actionType, 
          `Requested ${isDeposit ? 'deposit' : 'withdrawal'} of ${formatCurrency(amount)} to/from ${matchAcc.name} via ${activeCfg ? activeCfg.name : selectedMethodId}. Reference/Info: ${finalRef || 'None'}. Pending administrative authorization.`
        );

        // Dispatch Transaction Notification for requested deposit or withdrawal
        notificationService.sendTransactionAlert(
          allUsers[userIdx],
          newTx.amount,
          newTx.description + " (Awaiting Security Clearance)",
          isDeposit ? 'credit' : 'debit'
        ).catch(err => console.error("Error sending tx action request alert:", err));

        setDepositAmount('');
        setDwReference('');
        setShowDepositModal(false);
        triggerStateRefresh();
        alert(`Successfully requested ${depositOrWithdraw === 'deposit' ? 'deposit' : 'withdrawal'} of ${formatCurrency(amount)} via ${activeCfg ? activeCfg.name : selectedMethodId}. This has been sent to the admin for manual approval.`);
      }
    }
  };

  // Perform Transfer
  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid transfer amount');
      return;
    }

    const allUsers = loadUsersData();
    const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIdx === -1) return;

    if (transferType === 'internal') {
      if (transferFrom === transferTo) {
        alert('Source and destination accounts must be different for internal transfers.');
        return;
      }

      let sourceAcc = allUsers[userIdx].accounts.find(a => a.id === transferFrom);
      let destAcc = allUsers[userIdx].accounts.find(a => a.id === transferTo);

      if (!sourceAcc && allUsers[userIdx].accounts.length > 0) {
        sourceAcc = allUsers[userIdx].accounts.find(a => a.type === 'checking') || allUsers[userIdx].accounts[0];
      }
      if (!destAcc && allUsers[userIdx].accounts.length > 0) {
        destAcc = allUsers[userIdx].accounts.find(a => a.type === 'savings') || allUsers[userIdx].accounts[1] || allUsers[userIdx].accounts[0];
      }

      if (!sourceAcc || !destAcc) return;
      if (sourceAcc.balance < amount) {
        alert(`Insufficient funds in ${sourceAcc.name}! Available balance is ${formatCurrency(sourceAcc.balance)}`);
        return;
      }

      setTransferProcessing(true);

      setTimeout(() => {
        // Do NOT adjust balances yet since it requires admin confirmation!
        // sourceAcc.balance -= amount;
        // destAcc.balance += amount;

        const newTx: Transaction = {
          id: `tx-trsf-${Date.now()}`,
          description: `Transfer to ${destAcc.name}`,
          amount: -amount,
          date: formatTransactionDate(Date.now()),
          timestamp: Date.now(),
          category: transferCategory,
          status: 'pending',
          targetAccountId: sourceAcc.id
        };
        allUsers[userIdx].transactions = [newTx, ...allUsers[userIdx].transactions];

        saveUsersData(allUsers);
        addAuditLog(currentUser.username, currentUser.id, 'TRANSFER_INTERNAL', `Requested transfer of ${formatCurrency(amount)} from ${sourceAcc.name} to ${destAcc.name}. Pending admin approval.`);
        
        // Dispatch Transaction Notification
        notificationService.sendTransactionAlert(
          allUsers[userIdx],
          amount,
          `Internal Transfer to ${destAcc.name} (Pending Clearance)`,
          'debit'
        ).catch(err => console.error("Error sending tx alert:", err));

        setTransferProcessing(false);
        setTransferSuccessMsg(`Transfer request submitted! Completed internal transfer request of ${formatCurrency(amount)} pending admin approval.`);
        setTransferAmount('');
        triggerStateRefresh();
      }, 1200);

    } else {
      // External Transfer
      if (!recipientName.trim() || !recipientAccount.trim()) {
        alert('Please complete all recipient information details.');
        return;
      }

      const sourceAcc = allUsers[userIdx].accounts.find(a => a.id === transferFrom);
      if (!sourceAcc) return;
      if (sourceAcc.balance < amount) {
        alert(`Insufficient funds in ${sourceAcc.name}! Available balance is ${formatCurrency(sourceAcc.balance)}`);
        return;
      }

      setTransferProcessing(true);

      setTimeout(() => {
        // Do NOT adjust balances yet since it requires admin confirmation!
        // sourceAcc.balance -= amount;

        const newTx: Transaction = {
          id: `tx-trsf-ext-${Date.now()}`,
          description: `Wire Payment to ${recipientName}`,
          amount: -amount,
          date: formatTransactionDate(Date.now()),
          timestamp: Date.now(),
          category: transferCategory,
          status: 'pending',
          targetAccountId: sourceAcc.id
        };
        allUsers[userIdx].transactions = [newTx, ...allUsers[userIdx].transactions];

        saveUsersData(allUsers);
        addAuditLog(currentUser.username, currentUser.id, 'TRANSFER_EXTERNAL', `Requested wire of ${formatCurrency(amount)} from ${sourceAcc.name} to ${recipientName} (${recipientAccount}). Pending admin approval.`);

        // Dispatch Transaction Notification
        notificationService.sendTransactionAlert(
          allUsers[userIdx],
          amount,
          `External Wire to ${recipientName} (Pending Clearance)`,
          'debit'
        ).catch(err => console.error("Error sending tx alert:", err));

        setTransferProcessing(false);
        setTransferSuccessMsg(`Wire transfer request submitted successfully! Payment of ${formatCurrency(amount)} to ${recipientName} is queued for admin approval.`);
        setTransferAmount('');
        setRecipientName('');
        setRecipientAccount('');
        setRecipientRouting('');
        triggerStateRefresh();
      }, 1500);
    }
  };

  // --- NEW INTEGRATED FINANCIAL HANDLERS ---

  const handleExecuteP2PTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid transfer amount.');
      return;
    }
    if (!p2pTarget.trim()) {
      alert('Please enter a recipient username or email.');
      return;
    }

    const allUsers = loadUsersData();
    const senderIdx = allUsers.findIndex(u => u.id === currentUser.id);
    if (senderIdx === -1) return;

    const sourceAcc = allUsers[senderIdx].accounts.find(a => a.id === transferFrom);
    if (!sourceAcc) return;
    if (sourceAcc.balance < amount) {
      alert(`Insufficient funds in ${sourceAcc.name}! Available balance is ${formatCurrency(sourceAcc.balance)}`);
      return;
    }

    const normalizedTarget = p2pTarget.trim().toLowerCase().replace('@', '');
    const recipientIdx = allUsers.findIndex(u => 
      u.username.toLowerCase() === normalizedTarget || 
      u.email.toLowerCase() === normalizedTarget ||
      u.id === normalizedTarget
    );

    setTransferProcessing(true);

    setTimeout(() => {
      if (recipientIdx !== -1) {
        if (allUsers[recipientIdx].id === currentUser.id) {
          setTransferProcessing(false);
          alert('You cannot perform a peer-to-peer transfer to yourself.');
          return;
        }

        const recipientChecking = allUsers[recipientIdx].accounts.find(a => a.type === 'checking');
        if (recipientChecking) {
          // Do NOT adjust balances yet since it requires admin confirmation!
          // sourceAcc.balance -= amount;
          // recipientChecking.balance += amount;

          const senderTx: Transaction = {
            id: `tx-p2p-send-${Date.now()}`,
            description: `P2P send to @${allUsers[recipientIdx].username}`,
            amount: -amount,
            date: formatTransactionDate(Date.now()),
            timestamp: Date.now(),
            category: 'transfer',
            status: 'pending',
            targetAccountId: sourceAcc.id
          };
          allUsers[senderIdx].transactions = [senderTx, ...allUsers[senderIdx].transactions];

          saveUsersData(allUsers);
          addAuditLog(currentUser.username, currentUser.id, 'P2P_TRANSFER_REQUEST', `Requested sending ${formatCurrency(amount)} to @${allUsers[recipientIdx].username}. Pending admin approval.`);

          // Dispatch Transaction Alerts for sender
          notificationService.sendTransactionAlert(
            allUsers[senderIdx],
            amount,
            `P2P Send to @${allUsers[recipientIdx].username} (Pending Clearance)`,
            'debit'
          ).catch(err => console.error("Error sending p2p sender tx alert:", err));

          setTransferSuccessMsg(`P2P transfer request submitted! Sending ${formatCurrency(amount)} to @${allUsers[recipientIdx].username} is pending administrative verification.`);
          setTransferAmount('');
          setP2pTarget('');
          triggerStateRefresh();
        } else {
          setTransferProcessing(false);
          alert('Recipient is registered but does not have an active Checking Account to receive transfer.');
        }
      } else {
        setTransferProcessing(false);
        alert(`Core Ledger lookup completed. No verified banking customer found matching "${p2pTarget}" in our registry. Please check details or use our Standard wire layout.`);
      }
      setTransferProcessing(false);
    }, 1200);
  };

  const handleCreateBiller = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billerName.trim() || !billerAccount.trim() || !billerAmount) {
      alert('Please fill out all biller profile details.');
      return;
    }
    const amount = parseFloat(billerAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid bill amount.');
      return;
    }

    const allUsers = loadUsersData();
    const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIdx !== -1) {
      const newBiller: Biller = {
        id: `bill-${Date.now()}`,
        name: billerName.trim(),
        accountNumber: billerAccount.trim(),
        category: billerCategory,
        schedule: billerSchedule,
        amount
      };

      if (!allUsers[userIdx].billers) {
        allUsers[userIdx].billers = [];
      }
      allUsers[userIdx].billers!.push(newBiller);
      saveUsersData(allUsers);
      addAuditLog(currentUser.username, currentUser.id, 'BILLER_CREATE', `Added biller profile for ${newBiller.name}`);
      
      setBillerName('');
      setBillerAccount('');
      setBillerAmount('');
      setTransferSuccessMsg(`Biller profile saved! ${newBiller.name} has been added for ${billerSchedule} payments.`);
      triggerStateRefresh();
    }
  };

  const handlePayBiller = (billerId: string) => {
    const allUsers = loadUsersData();
    const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIdx === -1) return;

    const bList = allUsers[userIdx].billers || [];
    const biller = bList.find(b => b.id === billerId);
    if (!biller) return;

    const sourceAcc = allUsers[userIdx].accounts.find(a => a.id === transferFrom);
    if (!sourceAcc) return;

    if (sourceAcc.balance < biller.amount) {
      alert(`Insufficient funds in ${sourceAcc.name} to clear this bill payment of ${formatCurrency(biller.amount)}.`);
      return;
    }

    promptSecurityCheck('PIN', 'Authorize Bill Payment', `Enter authorization code (1234) to release payment of ${formatCurrency(biller.amount)} to ${biller.name}.`, () => {
      const freshUsers = loadUsersData();
      const idx = freshUsers.findIndex(u => u.id === currentUser.id);
      const acc = freshUsers[idx].accounts.find(a => a.id === transferFrom);
      const bl = freshUsers[idx].billers || [];
      const parentBiller = bl.find(b => b.id === billerId);

      if (acc && parentBiller) {
        // Do NOT adjust balance yet since it requires admin confirmation!
        // acc.balance -= parentBiller.amount;

        const billTx: Transaction = {
          id: `tx-bill-${Date.now()}`,
          description: `Utility Paid: ${parentBiller.name}`,
          amount: -parentBiller.amount,
          date: formatTransactionDate(Date.now()),
          timestamp: Date.now(),
          category: 'utilities',
          status: 'pending',
          targetAccountId: acc.id
        };

        freshUsers[idx].transactions = [billTx, ...freshUsers[idx].transactions];
        saveUsersData(freshUsers);
        addAuditLog(currentUser.username, currentUser.id, 'BILL_PAY_REQUEST', `Submitted payment request of ${formatCurrency(parentBiller.amount)} to ${parentBiller.name}. Pending administrative approval.`);

        // Dispatch Biller Alert
        notificationService.sendBillerAlert(freshUsers[idx], parentBiller.name, parentBiller.amount)
          .catch(err => console.error("Error creating bill alert notification:", err));

        setTransferSuccessMsg(`Payment of ${formatCurrency(parentBiller.amount)} queued! Bill payment request has been sent to the admin for manual approval.`);
        triggerStateRefresh();
      }
    });
  };

  const handleDeleteBiller = (billerId: string) => {
    const allUsers = loadUsersData();
    const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIdx !== -1 && allUsers[userIdx].billers) {
      allUsers[userIdx].billers = allUsers[userIdx].billers!.filter(b => b.id !== billerId);
      saveUsersData(allUsers);
      addAuditLog(currentUser.username, currentUser.id, 'BILLER_REMOVE', 'Disconnected biller profile');
      alert('Biller profile has been disconnected.');
      triggerStateRefresh();
    }
  };

  const handleIssueNewCard = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(newCardLimit);
    if (isNaN(limit) || limit <= 0) {
      alert('Please enter a valid credit limit.');
      return;
    }

    const allUsers = loadUsersData();
    const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIdx !== -1) {
      const prefix = newCardNetwork === 'visa' ? '4532' : '5412';
      const center = Array.from({length: 8}, () => Math.floor(Math.random() * 10)).join('');
      const lastFour = Array.from({length: 4}, () => Math.floor(Math.random() * 10)).join('');
      const fullNumber = `•••• •••• •••• ${lastFour}`;
      const actualNumber = `${prefix} ${center.slice(0,4)} ${center.slice(4,8)} ${lastFour}`;
      
      const newCard: CreditCard = {
        id: `card-${Date.now()}`,
        cardholderName: newCardHolder.trim().toUpperCase() || 'JAMES COOPER',
        cardNumber: fullNumber,
        expiryDate: '10/31',
        cvv: String(Math.floor(Math.random() * 900) + 100),
        isFrozen: false,
        limit,
        balanceOutline: 0
      };

      // Store unmasked number on card object prototype or property hacks for reveal
      (newCard as any)._rawCardNo = actualNumber;

      allUsers[userIdx].cards.push(newCard);
      saveUsersData(allUsers);
      addAuditLog(currentUser.username, currentUser.id, 'CARD_ISSUED', `Issued new virtual ${newCardNetwork.toUpperCase()} card ending ${lastFour}`);
      
      setShowIssueCardModal(false);
      alert(`Success! Your new ${newCardType} ${newCardNetwork.toUpperCase()} card has been successfully securely deployed!`);
      triggerStateRefresh();
    }
  };

  const handleCreateSavingsGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVaultTitle.trim() || !newVaultTarget) {
      alert('Please fill out savings goal and target amount details.');
      return;
    }
    const target = parseFloat(newVaultTarget);
    if (isNaN(target) || target <= 0) {
      alert('Please enter a valid target amount.');
      return;
    }

    const allUsers = loadUsersData();
    const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIdx !== -1) {
      const newGoal: SavingsGoal = {
        id: `goal-${Date.now()}`,
        name: newVaultTitle.trim(),
        targetAmount: target,
        currentAmount: 0,
        category: `${newVaultCategory} Year Plan`,
        targetDate: `${newVaultCategory} Years Plan`
      };

      if (!allUsers[userIdx].savingsGoals) {
        allUsers[userIdx].savingsGoals = [];
      }
      allUsers[userIdx].savingsGoals!.push(newGoal);
      saveUsersData(allUsers);
      addAuditLog(currentUser.username, currentUser.id, 'SAVINGS_GOAL_CREATE', `Created savings vault: ${newGoal.name}`);
      
      setNewVaultTitle('');
      setNewVaultTarget('');
      setShowCreateVaultModal(false);
      alert(`Savings goal created! Your new dedicated vault "${newGoal.name}" is now active.`);
      triggerStateRefresh();
    }
  };

  const handleFundSavingsGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVaultId) {
      alert('Select a vault first.');
      return;
    }
    if (!fundVaultSourceId) {
      alert('Please select a source account to fund the vault from.');
      return;
    }
    const amount = parseFloat(fundVaultAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid allocation amount.');
      return;
    }

    const allUsers = loadUsersData();
    const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIdx === -1) return;

    const goalList = allUsers[userIdx].savingsGoals || [];
    const goalIndex = goalList.findIndex(g => g.id === selectedVaultId);
    if (goalIndex === -1) {
      alert('Target vault not found.');
      return;
    }

    const sourceAcc = allUsers[userIdx].accounts.find(a => a.id === fundVaultSourceId);
    if (!sourceAcc) {
      alert('Selected source account not found.');
      return;
    }

    if (sourceAcc.balance < amount) {
      alert('Insufficient funds in the selected account.');
      return;
    }

    // Do NOT adjust balances yet since it requires admin confirmation!
    // sourceAcc.balance -= amount;
    // goalList[goalIndex].currentAmount += amount;

    const tx: Transaction = {
      id: `tx-vault-${Date.now()}`,
      description: `Funded Vault: ${goalList[goalIndex].name}`,
      amount: -amount,
      date: formatTransactionDate(Date.now()),
      timestamp: Date.now(),
      category: 'transfer',
      status: 'pending',
      targetAccountId: sourceAcc.id
    };

    allUsers[userIdx].transactions = [tx, ...allUsers[userIdx].transactions];
    saveUsersData(allUsers);
    addAuditLog(currentUser.username, currentUser.id, 'SAVINGS_GOAL_FUND', `Requested allocation of ${formatCurrency(amount)} from ${sourceAcc.name} to vault ${goalList[goalIndex].name}. Pending admin approval.`);
    
    setSelectedVaultId(null);
    setFundVaultSourceId('');
    setFundVaultAmount('');
    setShowFundVaultModal(false);
    alert(`Transfer request submitted! Allocation of ${formatCurrency(amount)} to your Savings Vault is now pending administrative approval.`);
    triggerStateRefresh();
  };

  const handleSendBotMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportInput.trim() || chatLoading) return;

    const userText = supportInput;
    setSupportInput('');
    setSupportMessages(prev => [...prev, { sender: 'user', text: userText, timestamp: 'Just Now' }]);
    setChatLoading(true);

    try {
      const response = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          userProfile: currentUser,
          chatHistory: supportMessages.slice(-10)
        })
      });

      const data = await response.json();
      if (data && data.text) {
        setSupportMessages(prev => [...prev, { sender: 'bot', text: data.text, timestamp: 'Just Now' }]);
      } else {
        throw new Error('API reply was malformed');
      }
    } catch (err) {
      console.warn('Gemini representative server route unavailable or unkeyed, active fallbacks...', err);
      let botText = "Thank you for contacting Representative support. ";
      
      const query = userText.toLowerCase();
      if (query.includes('balance') || query.includes('money')) {
        const checkingVal = currentUser.accounts.find(a => a.type === 'checking')?.balance || 0;
        botText += `I looked up your available ledger: Checking Account stands at ${formatCurrency(checkingVal)}.`;
      } else if (query.includes('limit') || query.includes('card')) {
        botText += "Your credit card limit and toggle settings can be dynamically altered within the custom Cards dashboard.";
      } else if (query.includes('dispute') || query.includes('revers') || query.includes('post')) {
        botText += "In case of unrecognized post, select any list element inside the support dispute tab and click 'Dispute Charge' for quick provisional reversal credit.";
      } else if (query.includes('vault') || query.includes('interest') || query.includes('comp')) {
        botText += "Check out our custom Savings Vaults interface to build custom targeted goals, transfer funds, and forecast over a 20-year timeline.";
      } else {
        botText += "Sandbox support channel is standing ready. Ask me how to calculate compound projections, establish savings vaults, generate cards or submit provisional charge disputes!";
      }

      setTimeout(() => {
        setSupportMessages(prev => [...prev, { sender: 'bot', text: botText, timestamp: 'Just Now' }]);
      }, 700);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCreateDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxForDispute) {
      alert('Please select a transaction to dispute.');
      return;
    }

    const allUsers = loadUsersData();
    const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIdx !== -1) {
      const newTicket: SupportTicket = {
        id: `tkt-${Date.now()}`,
        transactionId: selectedTxForDispute.id,
        transactionDescription: selectedTxForDispute.description,
        transactionAmount: selectedTxForDispute.amount,
        reason: disputeReason,
        description: disputeDescription.trim() || 'No detailed message provided.',
        urgency: disputeUrgency,
        status: 'OPEN',
        dateCreated: new Date().toISOString().substring(0, 10)
      };

      if (!allUsers[userIdx].supportTickets) {
        allUsers[userIdx].supportTickets = [];
      }
      allUsers[userIdx].supportTickets!.push(newTicket);
      saveUsersData(allUsers);
      addAuditLog(currentUser.username, currentUser.id, 'DISPUTE_SUBMIT', `Filed dispute ticket for transaction: ${selectedTxForDispute.description}`);

      // Dispatch Support Log Notification
      notificationService.sendSupportTicketAlert(
        allUsers[userIdx],
        newTicket.id,
        `Charge Dispute: ${newTicket.transactionDescription}`,
        `DISPUTE SUBMITTED (Urgency: ${newTicket.urgency})`
      ).catch(err => console.error("Error sending support ticket notification:", err));
      
      setSelectedTxForDispute(null);
      setDisputeDescription('');
      alert(`Dispute Filed! Support ticket ${newTicket.id} has been logged under investigation.`);
      triggerStateRefresh();
    }
  };

  const handleResolveDispute = (ticketId: string) => {
    const allUsers = loadUsersData();
    const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIdx === -1) return;

    const tList = allUsers[userIdx].supportTickets || [];
    const ticketIdx = tList.findIndex(t => t.id === ticketId);
    if (ticketIdx === -1) return;

    const refundAmount = Math.abs(tList[ticketIdx].transactionAmount);

    promptSecurityCheck('PIN', 'Approve Provisional Refund', `Enter authorization code (1234) to approve immediate provisional reversal credit of ${formatCurrency(refundAmount)} to checking.`, () => {
      const freshUsers = loadUsersData();
      const idx = freshUsers.findIndex(u => u.id === currentUser.id);
      const tktList = freshUsers[idx].supportTickets || [];
      const matchTkt = tktList.find(t => t.id === ticketId);
      const checking = freshUsers[idx].accounts.find(a => a.type === 'checking');
      
      if (matchTkt && checking) {
        checking.balance += refundAmount;
        matchTkt.status = 'PROVISIONALLY RESOLVED';

        const creditTx: Transaction = {
          id: `tx-revers-${Date.now()}`,
          description: `DISPUTE REVERSAL: ${matchTkt.transactionDescription.toUpperCase()}`,
          amount: refundAmount,
          date: formatTransactionDate(Date.now()),
          timestamp: Date.now(),
          category: 'other',
          status: 'successful'
        };

        freshUsers[idx].transactions = [creditTx, ...freshUsers[idx].transactions];
        saveUsersData(freshUsers);
        addAuditLog(currentUser.username, currentUser.id, 'DISPUTE_REVERSED', `Refunded ${formatCurrency(refundAmount)} for ticket ${ticketId}`);

        // Dispatch Refund and Resolved Ticket Notifications
        notificationService.sendTransactionAlert(freshUsers[idx], refundAmount, `DISPUTE REVERSAL CONFIRMED: ${matchTkt.transactionDescription.toUpperCase()}`, 'credit')
          .catch(err => console.error("Error sending refund transaction alert:", err));
        notificationService.sendSupportTicketAlert(freshUsers[idx], ticketId, `Charge Dispute: ${matchTkt.transactionDescription}`, 'PROVISIONAL DISPUTE GRANTED & FUNDS CREDITED')
          .catch(err => console.error("Error sending resolved ticket alert:", err));

        alert(`Dispute provisional credit approved! ${formatCurrency(refundAmount)} has been added back to your Checking ledger.`);
        triggerStateRefresh();
      }
    });
  };

  // Card Controls
  const toggleCardFreeze = (cardId: string) => {
    const allUsers = loadUsersData();
    const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIdx !== -1) {
      const card = allUsers[userIdx].cards.find(c => c.id === cardId);
      if (card) {
        card.isFrozen = !card.isFrozen;
        saveUsersData(allUsers);
        addAuditLog(currentUser.username, currentUser.id, 'CARD_FREEZE_TOGGLE', `Card ending in ${card.cardNumber.slice(-4)} ${card.isFrozen ? 'FROZEN' : 'UNFROZEN'}`);

        // Dispatch Card Freeze Notification
        const stateStr = card.isFrozen ? 'FROZEN' : 'UNFROZEN';
        notificationService.triggerActivityAlert(
          allUsers[userIdx],
          'security',
          `💳 Card Status Altered: ${stateStr}`,
          `Secure lock has been altered on card ending in *${card.cardNumber.slice(-4)} to state: ${stateStr.toLowerCase()}.`,
          {
            paragraphs: [
              `Card gateway node successfully received your instructions.`,
              `💳 <strong>Hardware Status:</strong> Blocked/Frozen set to ${card.isFrozen ? "TRUE" : "FALSE"}`,
              `⏰ <strong>Event Timestamp:</strong> ${new Date().toLocaleString()}`,
              card.isFrozen 
                ? "All active routing attempts linked to this visual token are suspended until you unfreeze." 
                : "Standard validation clearance is restored on this card token."
            ]
          }
        ).catch(err => console.error("Card freeze notification dispatch error:", err));

        triggerStateRefresh();
      }
    }
  };

  const adjustCardLimit = (cardId: string, newLimit: number) => {
    const allUsers = loadUsersData();
    const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIdx !== -1) {
      const card = allUsers[userIdx].cards.find(c => c.id === cardId);
      if (card) {
        card.limit = newLimit;
        saveUsersData(allUsers);
        triggerStateRefresh();
      }
    }
  };

  // Icon mapping helpers for transactions list (emulating Screen 2)
  const renderCategoryIcon = (category: string) => {
    switch (category) {
      case 'coffee':
        return (
          <div className="w-10 h-10 rounded-full bg-emerald-950/40 border border-emerald-900/40 flex items-center justify-center text-emerald-400">
            <span>☕</span>
          </div>
        );
      case 'shopping':
        return (
          <div className="w-10 h-10 rounded-full bg-orange-950/40 border border-orange-900/40 flex items-center justify-center text-orange-400">
            <span>🛍️</span>
          </div>
        );
      case 'salary':
        return (
          <div className="w-10 h-10 rounded-full bg-cyan-950/40 border border-cyan-900/40 flex items-center justify-center text-cyan-400">
            <span>💵</span>
          </div>
        );
      case 'transport':
        return (
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <span>🚗</span>
          </div>
        );
      case 'utilities':
        return (
          <div className="w-10 h-10 rounded-full bg-amber-950/40 border border-amber-900/40 flex items-center justify-center text-amber-400">
            <span>💡</span>
          </div>
        );
      case 'entertainment':
        return (
          <div className="w-10 h-10 rounded-full bg-pink-950/40 border border-pink-900/40 flex items-center justify-center text-pink-400">
            <span>🎬</span>
          </div>
        );
      case 'travel':
        return (
          <div className="w-10 h-10 rounded-full bg-indigo-950/40 border border-indigo-900/40 flex items-center justify-center text-indigo-400">
            <span>✈️</span>
          </div>
        );
      case 'food':
        return (
          <div className="w-10 h-10 rounded-full bg-lime-950/40 border border-lime-900/40 flex items-center justify-center text-lime-400">
            <span>🥑</span>
          </div>
        );
      case 'transfer':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-950/40 border border-blue-900/40 flex items-center justify-center text-blue-400">
            <Send className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-purple-950/40 border border-purple-900/40 flex items-center justify-center text-purple-400">
            <span>🏦</span>
          </div>
        );
    }
  };

  const renderTransactionStatusBadge = (status?: 'successful' | 'pending' | 'declined') => {
    const currentStatus = status || 'successful';
    switch (currentStatus) {
      case 'successful':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold font-sans">
            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
            Successful
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-extrabold font-sans">
            <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
            Pending
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-750 border border-rose-250 text-[9px] font-extrabold font-sans text-rose-600 border-rose-200">
            <span className="w-1 h-1 rounded-full bg-rose-500"></span>
            Declined
          </span>
        );
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return <Landmark className="w-4.5 h-4.5 text-blue-400" />;
      case 'savings':
        return <PiggyBank className="w-4.5 h-4.5 text-emerald-400" />;
      case 'credit':
        return <CardIcon className="w-4.5 h-4.5 text-rose-400" />;
      case 'investment':
        return <InvestIcon className="w-4.5 h-4.5 text-amber-400" />;
      default:
        return <Landmark className="w-4.5 h-4.5 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#070b19] text-white flex flex-col md:flex-row relative pb-20 md:pb-0 overflow-y-auto">
      
      {/* Background Soft Gradients */}
      <div className="absolute top-0 right-1/4 w-[280px] h-[280px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[200px] h-[200px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* DESKTOP PERMANENT NAVIGATION SIDEBAR - Visible ONLY on md: and above */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0d1224] border-r border-slate-800 p-6 h-screen sticky top-0 justify-between shrink-0 z-30 font-sans">
        <div className="space-y-8">
          {/* Brand Logo Header */}
          <div className="flex items-center gap-3">
            <svg className="w-8 h-10" viewBox="0 0 100 120" fill="none">
              <path 
                d="M25 20 V65 C25 80 35 90 50 90 C65 90 75 80 75 65 V20" 
                stroke="url(#uGradSidebar)" 
                strokeWidth="16" 
                strokeLinecap="round" 
              />
              <defs>
                <linearGradient id="uGradSidebar" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1e40af" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div>
              <h2 className="text-xs font-extrabold tracking-[0.2em] text-white uppercase leading-none">UNITYCORE</h2>
              <span className="text-[10px] font-bold tracking-[0.14em] text-blue-400">BANK</span>
            </div>
          </div>

          {/* Navigation Links List */}
          <div className="space-y-1.5 pt-4">
            <button
              onClick={() => { setActiveTab('dashboard'); setSelectedAccount(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>📊</span> Dashboard
            </button>

            <button
              onClick={() => { setActiveTab('accounts'); setSelectedAccount(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'accounts'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>🏦</span> My Accounts
            </button>

            <button
              onClick={() => { setActiveTab('transfers'); setTransferSuccessMsg(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'transfers'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>🔁</span> Wire & Transfer
            </button>

            <button
              onClick={() => { setActiveTab('investment'); setInvestSuccessMsg(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'investment'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>📈</span> Investment Hub
            </button>

            <button
              onClick={() => { setActiveTab('crypto'); setCryptoSwapSuccess(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'crypto'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>💱</span> Crypto Swap
            </button>

            <button
              onClick={() => { setActiveTab('grant'); setGrantStep(0); setGrantErr(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'grant'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>🎁</span> Capital Grants
            </button>

            <button
              onClick={() => { setActiveTab('vaults'); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'vaults'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>🐷</span> Savings Vaults
            </button>

            <button
              onClick={() => { setActiveTab('cards'); setTransferSuccessMsg(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>💳</span> Custom Cards
            </button>

            <button
              onClick={() => { setActiveTab('more'); setTransferSuccessMsg(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'more'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>⚙️</span> Control Panel
            </button>
          </div>
        </div>

        {/* Profile Card and Switch controls */}
        <div className="border-t border-slate-800 pt-5 space-y-4">
          <div className="flex items-center gap-3 px-1">
            <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-9 h-9 rounded-full object-cover border border-slate-700" />
            <div className="text-left overflow-hidden">
              <p className="text-xs font-extrabold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 font-mono">@{currentUser.username}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {currentUser.role === 'admin' ? (
              <>
                <button 
                  onClick={() => onRoleSwitch('admin')}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono font-bold text-blue-400 py-2 rounded-lg text-center transition cursor-pointer"
                >
                  Admin Node
                </button>
                <button 
                  onClick={onLogout}
                  className="bg-slate-900 hover:bg-rose-950 hover:text-rose-400 border border-slate-800 hover:border-rose-900/40 text-slate-400 p-2.5 rounded-lg transition cursor-pointer"
                  title="Close Session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-rose-950 hover:text-rose-400 border border-slate-800 hover:border-rose-900/40 text-rose-400 font-semibold py-2 px-3 rounded-lg text-[10px] tracking-wide transition cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Container Wrapper - Takes full width minus sidebar on desktop */}
      <div className="flex-grow flex flex-col min-h-screen relative max-w-full">

        {/* Dynamic Main Header widget mapping */}
        <header className="px-5 pt-6 pb-2 flex justify-between items-center relative z-20">
        
        {/* Burger Handle and Notifications Box */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowBankingMenu(true)}
            className="w-10 h-10 rounded-xl bg-white border border-slate-205 border-slate-200 flex flex-col justify-center items-center gap-1 hover:bg-slate-50 transition cursor-pointer shadow-xs"
            id="btn-sidebar-drawer"
          >
            <span className="w-4.5 h-0.5 bg-slate-500 rounded" />
            <span className="w-4.5 h-0.5 bg-slate-500 rounded" />
            <span className="w-4.5 h-0.5 bg-slate-500 rounded" />
          </button>
          
          <div className="hidden sm:block">
            <span className="text-[10px] text-indigo-655 text-indigo-600 font-bold uppercase tracking-widest font-mono font-sans">Unitycore Live Node</span>
            <div className="text-xs text-slate-900 font-extrabold font-sans">User Dashboard</div>
          </div>
        </div>

        {/* Action controls (Bell, Message, Profile Avatar) */}
        <div className="flex items-center gap-3 animate-fade-in">
          
          {/* Real-time Clock & Timezone Selector */}
          <div className="relative font-sans shrink-0">
            <button
              onClick={() => setShowTzDropdown(!showTzDropdown)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 py-1.5 px-3 rounded-xl flex items-center gap-2 transition cursor-pointer text-left focus:outline-none hover:bg-slate-800/60 shadow-xs"
              title="Select Ledger Timezone"
              id="timezone-clock-btn"
            >
              <div className="flex flex-col">
                <span className="text-[9px] font-bold font-mono tracking-wider text-indigo-400 uppercase flex items-center gap-1 leading-none">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  {selectedTimezone === 'auto' ? 'LOCAL TIME' : TIMEZONES.find(t => t.id === selectedTimezone)?.offset.split(' (')[0]}
                </span>
                <span className="text-xs font-black font-mono text-white mt-1 leading-none">
                  {currentHeaderTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: selectedTimezone === 'auto' ? undefined : selectedTimezone,
                  })}
                </span>
              </div>
              <span className="text-sm shrink-0">
                {selectedTimezone === 'auto' ? '🌐' : TIMEZONES.find(t => t.id === selectedTimezone)?.flag}
              </span>
            </button>

            {showTzDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => setShowTzDropdown(false)} 
                />
                <div className="absolute right-0 mt-2 w-64 bg-[#090e24]/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-2.5 z-50 animate-fade-in text-left">
                  <div className="px-2 pb-1.5 mb-1.5 border-b border-indigo-950/40">
                    <span className="text-[9px] font-bold font-mono text-indigo-400 uppercase tracking-widest block">Ledger Sync Location</span>
                    <span className="text-[10px] text-slate-500 block">All clocks & transaction dates align with region</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1 font-sans">
                    {TIMEZONES.map((tz) => (
                      <button
                        key={tz.id}
                        type="button"
                        onClick={() => {
                          localStorage.setItem('user_timezone', tz.id);
                          setSelectedTimezone(tz.id);
                          setShowTzDropdown(false);
                          
                          // Auto update profile residing country on change
                          if (tz.id === 'Africa/Lagos') {
                            setProfileCountry('Nigeria');
                          } else if (tz.id === 'America/New_York') {
                            setProfileCountry('United States');
                          } else if (tz.id === 'Europe/London') {
                            setProfileCountry('United Kingdom');
                          } else if (tz.id === 'Europe/Paris') {
                            setProfileCountry('France');
                          } else if (tz.id === 'Asia/Dubai') {
                            setProfileCountry('UAE');
                          } else if (tz.id === 'Asia/Singapore') {
                            setProfileCountry('Singapore');
                          }
                          
                          // Force updates
                          window.dispatchEvent(new Event('timezone-changed'));
                        }}
                        className={`w-full text-left px-2 border-none py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer text-xs ${
                          selectedTimezone === tz.id 
                            ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold' 
                            : 'text-slate-300 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex flex-col pr-1">
                          <span className="font-semibold text-[11px] leading-tight">{tz.label}</span>
                          <span className="text-[9px] text-slate-500 font-mono mt-0.5">{tz.offset}</span>
                        </div>
                        <span className="text-sm shrink-0">{tz.id === 'auto' ? '🌐' : tz.flag}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Notifications Trigger */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                // Clear the unread count on opening the container
                if (!showNotifications && currentUser.unreadNotifications > 0) {
                  const allUsers = loadUsersData();
                  const idx = allUsers.findIndex(u => u.id === currentUser.id);
                  if (idx !== -1) {
                    allUsers[idx].unreadNotifications = 0;
                    saveUsersData(allUsers);
                    triggerStateRefresh();
                  }
                }
              }}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition relative text-slate-500 hover:text-indigo-600 cursor-pointer shadow-xs"
              id="btn-bell-badge"
            >
              <Bell className="w-4.5 h-4.5" />
              {currentUser.unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full border border-white flex items-center justify-center text-[10px] font-bold text-white animate-pulse shadow-sm">
                  {currentUser.unreadNotifications}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="fixed inset-x-4 top-20 md:absolute md:top-auto md:inset-x-auto md:right-0 md:mt-3 w-auto md:w-[400px] max-w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl z-[100] text-slate-800 animate-slide-down text-left">
                {/* Header title block */}
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Secure Alert Gateway</h4>
                    <span className="text-[9px] text-slate-500 font-mono">Unitycore Cryptographic Node</span>
                  </div>
                  <button 
                    onClick={() => {
                      const allUsers = loadUsersData();
                      const idx = allUsers.findIndex(u => u.id === currentUser.id);
                      if (idx !== -1) {
                        allUsers[idx].notifications = [];
                        allUsers[idx].unreadNotifications = 0;
                        saveUsersData(allUsers);
                        triggerStateRefresh();
                      }
                    }}
                    className="text-[10px] font-bold text-red-500 hover:text-red-600 hover:underline cursor-pointer"
                  >
                    Clear Logs
                  </button>
                </div>

                {/* Tabs selection layout */}
                <div className="flex gap-1.5 bg-slate-55 bg-slate-100 p-1 rounded-lg mt-2.5">
                  <button 
                    onClick={() => setNotificationInboxFilter('all')}
                    className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-md text-center transition cursor-pointer ${
                      notificationInboxFilter === 'all' 
                        ? 'bg-white text-indigo-600 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All Accounts
                  </button>
                  <button 
                    onClick={() => setNotificationInboxFilter('push')}
                    className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-md text-center transition cursor-pointer ${
                      notificationInboxFilter === 'push' 
                        ? 'bg-white text-indigo-600 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    📱 Push Alerts
                  </button>
                  <button 
                    onClick={() => setNotificationInboxFilter('email')}
                    className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-md text-center transition cursor-pointer ${
                      notificationInboxFilter === 'email' 
                        ? 'bg-white text-indigo-600 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    📨 Mails
                  </button>
                </div>

                {/* Notifications Scrollable Content Area */}
                <div className="max-h-[260px] overflow-y-auto mt-3 pr-0.5 space-y-2.5">
                  {(() => {
                    const items = currentUser.notifications || [];
                    const filtered = items.filter(n => {
                      if (notificationInboxFilter === 'all') return true;
                      return n.type === notificationInboxFilter;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="py-8 text-center space-y-1">
                          <p className="text-[11px] text-slate-400 font-medium">📬 Secure inbox idle.</p>
                          <p className="text-[9px] text-slate-400">Trigger custom simulated actions below to test notifications instantly!</p>
                        </div>
                      );
                    }

                    return filtered.map((notif) => {
                      if (notif.type === 'push') {
                        // Render Mobile Device push log
                        return (
                          <div 
                            key={notif.id} 
                            className="bg-slate-50/70 border border-slate-100 rounded-xl p-2.5 hover:bg-slate-50 transition relative text-left"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[8px] font-mono uppercase bg-indigo-50 border border-indigo-100 text-indigo-600 px-1 py-0.5 rounded">
                                {notif.category} alert
                              </span>
                              <span className="text-[8px] font-mono text-slate-400">
                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: selectedTimezone === 'auto' ? undefined : selectedTimezone })}
                              </span>
                            </div>
                            <h5 className="text-[11px] font-extrabold text-slate-800 mt-1">{notif.title}</h5>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">{notif.body}</p>
                          </div>
                        );
                      } else {
                        // Render Secure Decryptable Webmail list item
                        return (
                          <div 
                            key={notif.id}
                            onClick={() => setSelectedEmailForViewer(notif)}
                            className="border border-slate-100 hover:border-blue-400/30 rounded-xl p-2.5 hover:bg-slate-50/40 transition cursor-pointer relative text-left bg-gradient-to-r from-blue-50/10 to-transparent"
                          >
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-[8px] font-mono uppercase bg-blue-50 text-blue-600 border border-blue-100 px-1 py-0.5 rounded font-bold">
                                🔐 crypt-mail read
                              </span>
                              <span className="text-[8px] font-mono text-slate-400">
                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: selectedTimezone === 'auto' ? undefined : selectedTimezone })}
                              </span>
                            </div>
                            <h5 className="text-[11px] font-extrabold text-indigo-900 mt-1 leading-normal truncate">{notif.title}</h5>
                            <p className="text-[9px] text-indigo-600 font-semibold mt-0.5">🔓 Click to view decrypted visual e-mail HTML →</p>
                          </div>
                        );
                      }
                    });
                  })()}
                </div>

                {/* Secure action simulators playground list (Interactive control panel element) */}
                <div className="border-t border-slate-100 pt-3.5 mt-3">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5 text-center">Simulate Test Activities</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button 
                      onClick={() => {
                        notificationService.sendLoginAlert(currentUser).catch(err => console.error(err));
                      }}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] font-semibold text-slate-200 py-1 rounded cursor-pointer transition text-center shadow-xs"
                    >
                      🌐 Login Alert
                    </button>
                    <button 
                      onClick={() => {
                        notificationService.sendTransactionAlert(currentUser, 15.99, "Starbucks London UK Coffee", "debit").catch(err => console.error(err));
                      }}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] font-semibold text-slate-200 py-1 rounded cursor-pointer transition text-center shadow-xs"
                    >
                      💸 Spent Alert
                    </button>
                    <button 
                      onClick={() => {
                        notificationService.sendOtpAuthenticationCode(currentUser, "Direct Wire Transfer Clearance", "5039").catch(err => console.error(err));
                      }}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] font-semibold text-slate-200 py-1 rounded cursor-pointer transition text-center shadow-xs"
                    >
                      🔒 OTP Alert
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Chat dialog redirects to AI Support Desk page */}
          <button 
            onClick={() => { setActiveTab('support'); setShowBankingMenu(false); }}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition text-slate-500 hover:text-indigo-600 cursor-pointer shadow-xs"
          >
            <MessageSquare className="w-4.5 h-4.5" />
          </button>

          {/* User profile picture */}
          <div 
            onClick={() => setShowBankingMenu(true)}
            className="w-10 h-10 rounded-full border border-indigo-100 overflow-hidden cursor-pointer hover:scale-105 transition shadow-sm"
          >
            <img 
              src={currentUser.avatarUrl} 
              alt={currentUser.name} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </header>

      {/* Primary Routing Section Content */}
      <main className="px-5 py-3 flex-grow relative z-10">

        {/* TAB 1: DASHBOARD VIEW (Screenshot 4 layout) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Salutation text */}
            <div>
              <span className="text-xs text-indigo-600 uppercase tracking-wider font-mono font-bold">Unitycore Vault Access</span>
              <h1 className="text-2xl font-semibold text-slate-700 tracking-tight mt-0.5">
                Good morning,{' '}
                <span className="text-slate-900 font-extrabold">{currentUser.name}</span>{' '}
                <span className="inline-block animate-bounce">👋</span>
              </h1>
            </div>

            {/* Total balance micro metric box and charts */}
            <div className="relative">
              <FinancialChart totalBalance={computedTotal} registrationTimestamp={currentUser.registrationTimestamp} />
            </div>

            {/* My Accounts Row (Matches Screen 4 bottom header) */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">My Accounts</h3>
                <button 
                  onClick={() => {
                    setSelectedAccount(null);
                    setActiveTab('accounts');
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center cursor-pointer"
                >
                  View all <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Accounts cards list */}
              <div className="space-y-3">
                {currentUser.accounts.map((acc) => {
                  const isNegative = acc.balance < 0;
                  return (
                    <div 
                      key={acc.id}
                      onClick={() => {
                        setSelectedAccount(acc);
                        setActiveTab('accounts');
                      }}
                      className="bg-white border border-slate-200 p-4 rounded-xl flex justify-between items-center cursor-pointer hover:border-indigo-300 shadow-sm transition-all duration-150 relative overflow-hidden"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                          {getAccountIcon(acc.type)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{acc.name}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">•••• {acc.lastFour}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-extrabold ${isNegative ? 'text-rose-600' : 'text-slate-900'}`}>
                          {formatCurrency(acc.balance)}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Available</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Transactions Section with Logs & Icons */}
            <div className="pt-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Recent Transactions</h3>
                <button 
                  onClick={() => {
                    setSelectedAccount(null);
                    setActiveTab('accounts');
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center cursor-pointer transition"
                >
                  View statements <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                {currentUser.transactions.slice(0, 6).map((tx) => {
                  const isCredit = tx.amount > 0;
                  return (
                    <div key={tx.id} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center gap-3.5">
                        {renderCategoryIcon(tx.category)}
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-snug">
                            {tx.description}
                          </p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span>{formatTransactionDate(tx.timestamp || tx.date)}</span>
                            <span className="inline-block px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200/60 font-sans font-bold uppercase text-[9px] tracking-wider text-slate-500">
                              {tx.category}
                            </span>
                            {renderTransactionStatusBadge(tx.status)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-sm font-extrabold font-mono ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isCredit ? '+' : ''}{formatCurrency(tx.amount)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {currentUser.transactions.length === 0 && (
                  <p className="text-xs text-center text-slate-550 text-slate-500 py-6">No transaction statements available.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACCOUNTS AND TRANSACTIONS VIEW (Screenshot 3 & Screenshot 2 drill-down) */}
        {activeTab === 'accounts' && (
          <div className="animate-fade-in">
            {selectedAccount === null ? (
              // SUB-VIEW A: ALL ACCOUNTS SUMMARY LIST (Screenshot 3 mapping)
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-indigo-600 font-mono font-bold">Multi-asset Nodes</span>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">My Accounts</h2>
                  </div>
                  <button 
                    onClick={() => setShowDepositModal(true)}
                    className="flex items-center gap-1.5 bg-indigo-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition cursor-pointer text-white shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Rapid Deposit
                  </button>
                </div>

                <div className="space-y-4">
                  {currentUser.accounts.map((acc) => {
                    const isNegative = acc.balance < 0;
                    return (
                      <div 
                        key={acc.id}
                        onClick={() => setSelectedAccount(acc)}
                        className="bg-white border border-slate-200 p-5 rounded-2xl cursor-pointer hover:border-indigo-300 shadow-sm transition-all duration-200"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                              {getAccountIcon(acc.type)}
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-slate-800">{acc.name}</h4>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">•••• {acc.lastFour}</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <h4 className={`text-base font-mono font-bold ${isNegative ? 'text-rose-600' : 'text-slate-900'}`}>
                              {formatCurrency(acc.balance)}
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">Available Balance</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              // SUB-VIEW B: SPECIFIC ACCOUNT TRANSACTION STATEMENTS DRILL-DOWN (Screenshot 2 mapping)
              <div className="space-y-5">
                
                {/* Back to accounts list header */}
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setSelectedAccount(null)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500" /> My Accounts
                  </button>
                  <span className="text-xs font-mono text-zinc-500">Statement Online</span>
                </div>

                {/* Account Details Header Info */}
                <div className="text-center py-2">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">{selectedAccount.name}</h2>
                  <p className="text-xs font-mono text-slate-450 mt-0.5">•••• {selectedAccount.lastFour}</p>
                </div>

                {/* Gradient balance card exactly matching Screenshot 2 Available Balance bar */}
                <div className="bg-gradient-to-tr from-[#3122c4] to-[#604df2] rounded-3xl p-6 shadow-md relative overflow-hidden">
                  <div className="absolute right-[-40px] top-[-40px] w-48 h-48 bg-white/10 rounded-full blur-2xl opacity-40 pointer-events-none" />
                  <span className="text-xs text-slate-200/80 font-medium font-sans block mb-1">Available Balance</span>
                  <p className="text-4xl font-extrabold text-white tracking-tight font-sans">
                    {formatCurrency(selectedAccount.balance)}
                  </p>
                </div>

                {/* Actions Grid mimicking the "Transfer", "Deposit", "More" in Screenshot 2 */}
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => {
                      setTransferFrom(selectedAccount.id);
                      setActiveTab('transfers');
                    }}
                    className="bg-white border border-slate-200 hover:border-indigo-300 p-4 rounded-xl flex flex-col items-center justify-center transition cursor-pointer shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Transfer</span>
                  </button>

                  <button 
                    onClick={() => {
                      setDepositTarget(selectedAccount.id);
                      setShowDepositModal(true);
                    }}
                    className="bg-white border border-slate-200 hover:border-indigo-300 p-4 rounded-xl flex flex-col items-center justify-center transition cursor-pointer shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
                      <ArrowDownLeft className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Deposit</span>
                  </button>

                  <button 
                    onClick={() => {
                      setSelectedAccount(null);
                      setActiveTab('cards');
                    }}
                    className="bg-white border border-slate-200 hover:border-indigo-300 p-4 rounded-xl flex flex-col items-center justify-center transition cursor-pointer shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 mb-2">
                      <CardIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Manage Card</span>
                  </button>
                </div>

                {/* Recent Transactions List Header of Screenshot 2 */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-slate-900">Recent Transactions</h3>
                    
                    {/* Tiny Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-white border border-slate-200 text-[10px] pl-7 pr-2 py-1 rounded-lg w-28 outline-none focus:border-indigo-500 transition text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Statements Log list matching Airbnb/Starbucks rows */}
                  <div className="space-y-4">
                    {currentUser.transactions
                      .filter(tx => {
                        // For demonstration ease, show transactions or filter by query
                        if (searchQuery) {
                          return tx.description.toLowerCase().includes(searchQuery.toLowerCase());
                        }
                        return true;
                      })
                      .map((tx) => {
                        const isCredit = tx.amount > 0;
                        return (
                          <div key={tx.id} className="flex justify-between items-center py-1 border-b border-slate-105 border-b border-slate-100 pb-2.5 last:border-0">
                            <div className="flex items-center gap-3">
                              {renderCategoryIcon(tx.category)}
                              <div>
                                <p className="text-xs sm:text-sm font-bold text-slate-800 leading-normal">
                                  {tx.description}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                                  <span>{formatTransactionDate(tx.timestamp || tx.date)}</span>
                                  <span className="inline-block px-1 py-0.2 rounded-md bg-slate-50 border border-slate-200/60 font-sans font-bold uppercase text-[8px] tracking-wider text-slate-500">
                                    {tx.category}
                                  </span>
                                  {renderTransactionStatusBadge(tx.status)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className={`text-xs sm:text-sm font-bold font-mono ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isCredit ? '+' : ''}{formatCurrency(tx.amount)}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                    {currentUser.transactions.length === 0 && (
                      <p className="text-xs text-center text-slate-550 text-slate-500 py-6">No transaction statements available.</p>
                    )}
                  </div>
                </div>

                {/* Back to main statements bottom button */}
                <button 
                  onClick={() => setSelectedAccount(null)}
                  className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold py-3 text-indigo-600 rounded-xl transition text-center mt-3 cursor-pointer shadow-xs"
                  id="btn-statement-view-all"
                >
                  Back to Balance Overview
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TRANSFERS FLOW (`pages/user/transfers.html` mapping) */}
        {activeTab === 'transfers' && (
          <div className="space-y-6 animate-fade-in max-w-sm mx-auto">
            <div>
              <span className="text-xs text-indigo-400 font-mono font-bold uppercase tracking-wider">Vault Payments Node</span>
              <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">Wire & Transfer Hub</h2>
              <p className="text-xs text-slate-400">Perform wire transfers, P2P instant payments, or manage bills.</p>
            </div>

            {/* Success notification banner */}
            {transferSuccessMsg && (
              <div className="p-3.5 bg-emerald-950/80 border border-emerald-900 text-emerald-400 rounded-xl text-xs flex items-center gap-2 font-semibold animate-fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>{transferSuccessMsg}</span>
              </div>
            )}

            {/* Hub Modes switcher */}
            <div className="bg-[#0d1224] border border-slate-800 rounded-xl p-1 flex shadow-md">
              <button
                type="button"
                onClick={() => {
                  setTransferMode('standard');
                  setTransferSuccessMsg('');
                }}
                className={`flex-1 py-2 text-xs text-center font-bold rounded-lg transition cursor-pointer ${
                  transferMode === 'standard' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Wire Transfer
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransferMode('p2p');
                  setTransferSuccessMsg('');
                }}
                className={`flex-1 py-2 text-xs text-center font-bold rounded-lg transition cursor-pointer ${
                  transferMode === 'p2p' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                P2P Pay
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransferMode('billpay');
                  setTransferSuccessMsg('');
                }}
                className={`flex-1 py-2 text-xs text-center font-bold rounded-lg transition cursor-pointer ${
                  transferMode === 'billpay' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bill Payment
              </button>
            </div>

            {/* Mode 1: Standard Account Transfer and External Wire */}
            {transferMode === 'standard' && (
              <form onSubmit={handleExecuteTransfer} className="space-y-4">
                {/* Transfer Mode Selector Inside Wire */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-1 flex shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setTransferType('internal');
                      setTransferSuccessMsg('');
                    }}
                    className={`flex-1 py-1 text-[10px] text-center font-bold rounded-md transition cursor-pointer ${
                      transferType === 'internal' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Between My Accounts
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTransferType('external');
                      setTransferSuccessMsg('');
                    }}
                    className={`flex-1 py-1 text-[10px] text-center font-bold rounded-md transition cursor-pointer ${
                      transferType === 'external' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    External Wire
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">Debit Source Account</label>
                  <select
                    value={transferFrom}
                    onChange={(e) => {
                      setTransferFrom(e.target.value);
                      setTransferSuccessMsg('');
                    }}
                    className="w-full bg-[#0d1224] border border-slate-800 rounded-xl py-3 px-3 text-xs outline-none text-white focus:border-blue-500 transition cursor-pointer"
                  >
                    {currentUser.accounts.map(a => (
                      <option key={a.id} value={a.id} disabled={a.balance < 0} className="bg-[#0d1224] text-white">
                        {a.name} ({formatCurrency(a.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                {transferType === 'internal' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">Credit Target Account</label>
                    <select
                      value={transferTo}
                      onChange={(e) => {
                        setTransferTo(e.target.value);
                        setTransferSuccessMsg('');
                      }}
                      className="w-full bg-[#0d1224] border border-slate-800 rounded-xl py-3 px-3 text-xs outline-none text-white focus:border-blue-500 transition cursor-pointer"
                    >
                      {currentUser.accounts.map(a => (
                        <option key={a.id} value={a.id} className="bg-[#0d1224] text-white">
                          {a.name} ({formatCurrency(a.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3 border border-slate-800 p-3.5 rounded-xl bg-[#090d1a]">
                    <div className="space-y-1">
                      <label className="text-[9px] text-indigo-400 font-mono font-bold uppercase block">Recipient Full Name</label>
                      <input
                        type="text"
                        required
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="e.g. Alice Watson"
                        className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-indigo-400 font-mono font-bold uppercase block">Routing Number</label>
                        <input
                          type="text"
                          maxLength={9}
                          value={recipientRouting}
                          onChange={(e) => setRecipientRouting(e.target.value)}
                          placeholder="9 digits"
                          className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-500 outline-none font-mono focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-indigo-400 font-mono font-bold uppercase block">Account Number</label>
                        <input
                          type="text"
                          required
                          value={recipientAccount}
                          onChange={(e) => setRecipientAccount(e.target.value)}
                          placeholder="8-12 digits"
                          className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-500 outline-none font-mono focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">Transaction Category</label>
                  <select
                    value={transferCategory}
                    onChange={(e) => {
                      setTransferCategory(e.target.value as Transaction['category']);
                      setTransferSuccessMsg('');
                    }}
                    className="w-full bg-[#0d1224] border border-slate-800 rounded-xl py-3 px-3 text-xs outline-none text-white focus:border-blue-500 transition cursor-pointer capitalize font-sans"
                  >
                    <option value="transfer">🔀 General Transfer</option>
                    <option value="utilities">💡 Utilities / Bills</option>
                    <option value="entertainment">🎬 Entertainment / Fun</option>
                    <option value="travel">✈️ Travel / Flight / Hotel</option>
                    <option value="shopping">🛍️ Shopping</option>
                    <option value="food">🥑 Food / Grocery</option>
                    <option value="coffee">☕ Coffee & Cafe</option>
                    <option value="transport">🚗 Transportation</option>
                    <option value="salary">💵 Salary & Earnings</option>
                    <option value="other">🏦 Other Purpose</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">Debit Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-extrabold font-mono">$</span>
                    <input
                      type="number"
                      required
                      value={transferAmount}
                      onChange={(e) => {
                        setTransferAmount(e.target.value);
                        setTransferSuccessMsg('');
                      }}
                      placeholder="0.00"
                      className="w-full bg-[#0d1224] border border-slate-800 rounded-xl py-3 pl-7 pr-3 text-xs font-mono font-bold outline-none text-white focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={transferProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-550 text-white font-bold py-3 px-4 rounded-xl transition shadow-md text-xs font-sans flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  {transferProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Processing ledger encryption...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Execute Wire Transfer</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Mode 2: Peer-to-Peer Transfer */}
            {transferMode === 'p2p' && (
              <form onSubmit={handleExecuteP2PTransfer} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">Debit Source Account</label>
                  <select
                    value={transferFrom}
                    onChange={(e) => {
                      setTransferFrom(e.target.value);
                      setTransferSuccessMsg('');
                    }}
                    className="w-full bg-[#0d1224] border border-slate-800 rounded-xl py-3 px-3 text-xs outline-none text-white focus:border-blue-500 transition cursor-pointer"
                  >
                    {currentUser.accounts.map(a => (
                      <option key={a.id} value={a.id} disabled={a.balance < 0} className="bg-[#0d1224] text-white">
                        {a.name} ({formatCurrency(a.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">Recipient Identifier (Email or username)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">@</span>
                    <input
                      type="text"
                      required
                      value={p2pTarget}
                      onChange={(e) => {
                        setP2pTarget(e.target.value);
                        setTransferSuccessMsg('');
                      }}
                      placeholder="james or james@unitycore.com"
                      className="w-full bg-[#0d1224] border border-slate-800 rounded-xl py-3 pl-7 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <p className="text-[8px] text-slate-400 mt-0.5">Note: Sandbox registry supports transfers to other active registry accounts (e.g., james, admin, credence).</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">Transfer Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-extrabold font-mono">$</span>
                    <input
                      type="number"
                      required
                      value={transferAmount}
                      onChange={(e) => {
                        setTransferAmount(e.target.value);
                        setTransferSuccessMsg('');
                      }}
                      placeholder="0.00"
                      className="w-full bg-[#0d1224] border border-slate-800 rounded-xl py-3 pl-7 pr-3 text-xs font-mono font-bold outline-none text-white focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={transferProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-550 text-white font-bold py-3 px-4 rounded-xl transition shadow-md text-xs font-sans flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  {transferProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Encrypting Peer Tunnel...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Verify & Send Instantly</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Mode 3: Bill Payment Hub */}
            {transferMode === 'billpay' && (
              <div className="space-y-5 animate-fade-in text-left">
                {/* Active Connected Billers List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-white font-mono uppercase tracking-wider flex items-center gap-1">
                    <span>📋</span> Connected Biller Accounts
                  </h3>
                  
                  {(!currentUser.billers || currentUser.billers.length === 0) ? (
                    <div className="border border-dashed border-slate-800 rounded-xl p-5 text-center bg-[#070b19]">
                      <p className="text-xs text-slate-500 font-sans">No biller profiles connected yet. Use the registration form below to add utility accounts.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-56 overflow-y-auto">
                      {currentUser.billers.map((b) => (
                        <div key={b.id} className="bg-[#0d1224] border border-slate-800 rounded-xl p-3 flex flex-col justify-between hover:border-slate-705 transition">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-extrabold text-white">{b.name}</span>
                                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-950 border border-blue-900 font-mono text-blue-400 uppercase">
                                  {b.category}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 block mt-0.5">Acct: {b.accountNumber}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold font-mono text-indigo-400 block">{formatCurrency(b.amount)}</span>
                              <span className="text-[8px] text-slate-500 font-mono italic capitalize block mt-0.5">{b.schedule} cycle</span>
                            </div>
                          </div>

                          <div className="flex gap-2.5 mt-3 pt-2.5 border-t border-slate-800/60 justify-end">
                            <button
                              onClick={() => handleDeleteBiller(b.id)}
                              className="text-[10px] font-bold text-rose-500 hover:text-rose-400 border border-rose-950 px-2 py-1 rounded-md bg-rose-955 bg-rose-950/20 cursor-pointer"
                            >
                              Disconnect
                            </button>
                            <button
                              onClick={() => handlePayBiller(b.id)}
                              className="text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-md font-sans shadow-xs cursor-pointer"
                            >
                              Send {formatCurrency(b.amount)}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Biller Form */}
                <form onSubmit={handleCreateBiller} className="bg-[#0d1224] border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-extrabold text-white font-mono uppercase tracking-wider flex items-center gap-1 border-b border-slate-800 pb-2">
                    <span>➕</span> Add Adaptive Custody Biller
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-mono font-bold uppercase block">Biller Name</label>
                      <input
                        type="text"
                        required
                        value={billerName}
                        onChange={(e) => setBillerName(e.target.value)}
                        placeholder="e.g. PG&E Power"
                        className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-slate-600 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-mono font-bold uppercase block">Biller Invoice ID</label>
                      <input
                        type="text"
                        required
                        value={billerAccount}
                        onChange={(e) => setBillerAccount(e.target.value)}
                        placeholder="8 digits"
                        className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-slate-600 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-mono font-bold uppercase block">Payment Schedule</label>
                      <select
                        value={billerSchedule}
                        onChange={(e) => setBillerSchedule(e.target.value as any)}
                        className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-white cursor-pointer"
                      >
                        <option value="one-time">One-time</option>
                        <option value="weekly">Weekly Autopay</option>
                        <option value="monthly">Monthly Autopay</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-mono font-bold uppercase block">Category</label>
                      <select
                        value={billerCategory}
                        onChange={(e) => setBillerCategory(e.target.value as any)}
                        className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-white cursor-pointer"
                      >
                        <option value="utilities">Electricity / Water</option>
                        <option value="internet">Network / Internet</option>
                        <option value="entertainment">Streaming / Media</option>
                        <option value="other">Institutional Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-mono font-bold uppercase block">Default Cycle Invoice Bill ($)</label>
                    <input
                      type="number"
                      required
                      value={billerAmount}
                      onChange={(e) => setBillerAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-slate-600 outline-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-xl transition duration-150 text-[10px] font-mono flex items-center justify-center gap-1.5 mt-2 cursor-pointer border border-slate-700"
                  >
                    <span>🔐</span> Establish Biller Profile
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CARDS VIEW */}
        {activeTab === 'cards' && (
          <div className="space-y-6 animate-fade-in max-w-sm mx-auto">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs text-indigo-400 font-mono font-bold uppercase tracking-wider">Secured Credit Nodes</span>
                <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">My Credit & Debit Cards</h2>
              </div>
              <button
                onClick={() => {
                  setNewCardHolder(currentUser.name.toUpperCase());
                  setShowIssueCardModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg font-mono tracking-wide shadow-md transition cursor-pointer"
              >
                + Issue Card
              </button>
            </div>

            {/* Simulated Cards Loop */}
            <div className="space-y-5">
              {currentUser.cards.map((card) => {
                const isRevealed = revealedCards[card.id];
                const secLeft = cardTimers[card.id] || 0;
                
                // Get the card number to show
                let visibleCardNo = card.cardNumber;
                if (isRevealed) {
                  visibleCardNo = (card as any)._rawCardNo || card.cardNumber.replace(/•/g, '5');
                }

                // Determine dynamic themed gradients
                const cardTheme = (card as any).theme || 'purple';
                let themeClasses = 'bg-gradient-to-tr from-[#160c38] via-[#2f1b72] to-[#c026d3]';
                if (cardTheme === 'cyberpunk') {
                  themeClasses = 'bg-gradient-to-tr from-[#020202] via-[#101014] to-[#f59e0b] border border-yellow-500/20';
                } else if (cardTheme === 'gold') {
                  themeClasses = 'bg-gradient-to-tr from-[#78350f] via-[#b45309] to-[#fbbf24]';
                } else if (cardTheme === 'emerald') {
                  themeClasses = 'bg-gradient-to-tr from-[#064e3b] via-[#047857] to-[#06b6d4]';
                }

                return (
                  <div 
                    key={card.id}
                    className="space-y-4 border border-slate-800 p-5 rounded-2xl bg-[#0d1224] relative overflow-hidden shadow-sm"
                  >
                    
                    {/* Floating physical layout simulation card with exact colors */}
                    <div className={`aspect-[1.586/1] w-full rounded-2xl p-5 relative overflow-hidden transition duration-300 ${
                      card.isFrozen 
                        ? 'bg-gradient-to-tr from-slate-900 via-neutral-800 to-zinc-950 opacity-65 grayscale' 
                        : themeClasses
                    } shadow-md flex flex-col justify-between`}>
                      
                      {/* Grid background on physical card */}
                      <div className="absolute inset-0 bg-[#ffffff03] bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
                      
                      {/* Top Physical Card Row */}
                      <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold tracking-[0.14em] text-white">UNITYCORE</span>
                          <span className="text-[10px] text-pink-400 font-light font-mono leading-none">black</span>
                        </div>
                        <span className="text-xs font-serif italic font-extrabold text-white uppercase tracking-wider">
                          {(card as any)._network || 'visa'}
                        </span>
                      </div>

                      {/* SIM / chip symbol decoration */}
                      <div className="my-1 relative z-10 flex justify-between items-center">
                        <div className="w-7 h-5.5 rounded-md bg-[#fbbf24] opacity-85" />
                        
                        {/* Frozen stamp on visual layout if toggled! */}
                        {card.isFrozen ? (
                          <span className="text-[9px] font-mono font-bold tracking-widest text-rose-400 bg-rose-950 border border-rose-900 px-2 py-0.5 rounded-md">
                            FROZEN
                          </span>
                        ) : isRevealed ? (
                          <span className="text-[8px] font-mono font-extrabold tracking-wider text-amber-400 bg-black/85 border border-amber-500/30 px-2 py-0.5 rounded animate-pulse">
                            SESSION LIVE: {secLeft}s
                          </span>
                        ) : null}
                      </div>

                      {/* Numbers & Details Row */}
                      <div className="relative z-10 space-y-1.5 pt-1">
                        <p className="text-sm font-semibold font-mono tracking-widest text-slate-100 font-mono">
                          {visibleCardNo}
                        </p>
                        
                        <div className="flex justify-between items-baseline pt-1 font-mono">
                          <div>
                            <span className="text-[7px] text-slate-400 block uppercase">Card Holder</span>
                            <span className="text-[9px] font-mono font-bold text-white tracking-widest uppercase truncate max-w-[150px] inline-block">
                              {card.cardholderName}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[7px] text-slate-400 block uppercase">Expiry</span>
                            <span className="text-[9px] font-bold text-white col-span-1">
                              {card.expiryDate}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[7px] text-slate-400 block uppercase">CVV</span>
                            {isRevealed ? (
                              <span className="text-[9px] font-bold text-amber-400 animate-pulse">
                                {card.cvv}
                              </span>
                            ) : (
                              <span className="text-[9px] font-extrabold text-[#f472b6]">
                                •••
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Operational controls panel */}
                    <div className="space-y-3 pt-1 text-left">
                      
                      {/* Freeze toggler switch */}
                      <div className="flex justify-between items-center bg-[#070b19] border border-slate-800 p-3 rounded-xl shadow-xs">
                        <div>
                          <p className="text-xs font-bold text-white">Freeze Credit Node</p>
                          <p className="text-[10px] text-slate-500">Locks outbound token requests instantly</p>
                        </div>
                        <button
                          onClick={() => toggleCardFreeze(card.id)}
                          className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer outline-none border-none ${
                            card.isFrozen ? 'bg-rose-500' : 'bg-slate-800'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-all ${
                            card.isFrozen ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {/* Display CVV / detail helper details with Security Verification and Timers */}
                      <div className="flex justify-between items-center bg-[#070b19] border border-slate-800 p-3 rounded-xl shadow-xs">
                        <div>
                          <p className="text-xs font-bold text-white">Reveal Private Code</p>
                          <p className="text-[10px] text-slate-500">15-sec dynamic decryption visualizer</p>
                        </div>
                        {isRevealed ? (
                          <div className="text-[10px] bg-amber-950/25 border border-amber-900/60 text-amber-400 font-mono font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 animate-pulse">
                            <span>🔐</span> {secLeft}s Active
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => {
                              promptSecurityCheck('PIN', 'Decrypt CVV Key', 'Authorize safe decrypted view session on this virtual node.', () => {
                                setRevealedCards(prev => ({ ...prev, [card.id]: true }));
                                setCardTimers(prev => ({ ...prev, [card.id]: 15 }));
                              });
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-[10px] text-indigo-400 font-mono font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
                          >
                            Reveal Timed PIN/CVV
                          </button>
                        )}
                      </div>

                      {/* Credit card limit adjustment slider */}
                      <div className="bg-[#070b19] border border-slate-800 p-3 rounded-xl space-y-1.5 shadow-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-400">Card Limit Authorization</span>
                          <span className="text-xs font-mono font-bold text-blue-400">{formatCurrency(card.limit)}</span>
                        </div>
                        <input
                          type="range"
                          min={5000}
                          max={30000}
                          step={1000}
                          value={card.limit}
                          onChange={(e) => adjustCardLimit(card.id, parseInt(e.target.value))}
                          className="w-full accent-blue-500 h-1 rounded-lg bg-slate-800 cursor-pointer"
                        />
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Custom Interactive Virtual Card Request Modal Form */}
            {showIssueCardModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
                <div className="bg-[#0d1224] border border-slate-800 w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-white font-mono uppercase tracking-widest flex items-center gap-1.5">
                      <span>💳</span> Issue Secured Card Node
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1">Deploy card configurations instantly to active sandbox core.</p>
                  </div>

                  <form onSubmit={handleIssueNewCard} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-mono font-bold uppercase">Cardholder Name (Embedded)</label>
                      <input
                        type="text"
                        required
                        value={newCardHolder}
                        onChange={(e) => setNewCardHolder(e.target.value)}
                        placeholder="NAME OF HOLDER"
                        className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-605 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-mono font-bold uppercase block">Deployment Type</label>
                        <select
                          value={newCardType}
                          onChange={(e) => setNewCardType(e.target.value as any)}
                          className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-white cursor-pointer"
                        >
                          <option value="virtual">Virtual Node</option>
                          <option value="physical">Physical Card</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-mono font-bold uppercase block">Payment Network</label>
                        <select
                          value={newCardNetwork}
                          onChange={(e) => setNewCardNetwork(e.target.value as any)}
                          className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-white cursor-pointer"
                        >
                          <option value="visa">Visa Network</option>
                          <option value="mastercard">Mastercard</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-mono font-bold uppercase">Aesthetic Card Theme</label>
                      <select
                        value={newCardTheme}
                        onChange={(e) => setNewCardTheme(e.target.value as any)}
                        className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white cursor-pointer"
                      >
                        <option value="purple">Royal Purple Neon</option>
                        <option value="cyberpunk">Cyberpunk Amber & Black</option>
                        <option value="gold">Sovereign Auric Gold</option>
                        <option value="emerald">Deep Jade Emerald</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-mono font-bold uppercase block">Authorize Initial Credit Limit ($)</label>
                      <input
                        type="number"
                        required
                        value={newCardLimit}
                        onChange={(e) => setNewCardLimit(e.target.value)}
                        placeholder="15000"
                        className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white font-mono"
                      />
                    </div>

                    <div className="flex gap-2.5 pt-3 justify-end text-[10px]">
                      <button
                        type="button"
                        onClick={() => setShowIssueCardModal(false)}
                        className="px-3 py-2 border border-slate-800 font-mono rounded-lg text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded-lg shadow-md cursor-pointer"
                      >
                        Issue Now
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4.5: SAVINGS VAULTS & APY COMPOUND TRACKER */}
        {activeTab === 'vaults' && (
          <div className="space-y-6 animate-fade-in max-w-sm mx-auto text-left">
            <div>
              <span className="text-xs text-yellow-500 font-mono font-bold uppercase tracking-wider">Compound Capital Hub</span>
              <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">High-Yield Savings Vaults</h2>
            </div>

            {/* APY Showcase Banner */}
            <div className="bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-slate-900 border border-amber-500/20 p-4 rounded-2xl space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] bg-amber-500/10 text-amber-400 font-mono font-bold px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest">
                  Asset Yield Class A
                </span>
                <span className="text-xs font-mono font-extrabold text-amber-400">5.25% APY</span>
              </div>
              <p className="text-xs font-extrabold text-white">Quantum High-Yield Accumulator</p>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Compound quarterly with risk-free institutional custody. Create custom target vaults to bucket your capital.
              </p>
            </div>

            {/* Savings Goals List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">My Target Vaults</h3>
                <button
                  onClick={() => setShowCreateVaultModal(true)}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-400 font-mono font-bold px-2 py-1 rounded-md border border-slate-700 transition"
                >
                  + New Vault
                </button>
              </div>

              {/* Goals Loop */}
              {(() => {
                const goals = currentUser.savingsGoals && currentUser.savingsGoals.length > 0 
                  ? currentUser.savingsGoals 
                  : [
                      { id: 'v-emergency', name: 'Emergency Cash Fund', currentAmount: 4500, targetAmount: 10000, category: 'life Plan', targetDate: '2 Years Plan' },
                      { id: 'v-car', name: 'Secured Tesla Roadster', currentAmount: 12000, targetAmount: 60000, category: 'vehicle Plan', targetDate: '5 Years Plan' }
                    ];

                return (
                  <div className="space-y-3.5">
                    {goals.map((g) => {
                      const currentAmt = g.currentAmount !== undefined ? g.currentAmount : ((g as any).current || 0);
                      const targetAmt = g.targetAmount !== undefined ? g.targetAmount : ((g as any).target || 1);
                      const progress = Math.min(100, Math.round((currentAmt / targetAmt) * 100));
                      return (
                        <div key={g.id} className="bg-[#0d1224] border border-slate-800 p-4 rounded-2xl space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>🎯</span> {g.name || (g as any).title}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-1 font-mono">
                                Vault ID: {g.id} • Target Class: {g.targetDate || 'No deadline'}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono font-extrabold text-yellow-400 bg-yellow-950/20 px-2 py-0.5 rounded border border-yellow-500/20">
                              {progress}% Sent
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1">
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] font-mono text-slate-400">
                              <span>Deposited: {formatCurrency(currentAmt)}</span>
                              <span>Goal: {formatCurrency(targetAmt)}</span>
                            </div>
                          </div>

                          {/* Funding actions */}
                          <div className="flex gap-2 pt-1 justify-end text-[10px]">
                            <button
                              onClick={() => {
                                setSelectedVaultId(g.id);
                                setShowFundVaultModal(true);
                              }}
                              className="bg-yellow-600 hover:bg-yellow-500 text-white font-mono font-bold px-3 py-1.5 rounded-lg shadow-md transition cursor-pointer"
                            >
                              Fund Safe Vault
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* APY Interest Projection Tracker */}
            <div className="bg-[#0d1224] border border-slate-800 p-4 rounded-2xl space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <span>📈</span> Compound Interest Estimator
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Model dynamic quarterly compound rate projections based on variable settings.</p>
              </div>

              {/* Sliders for modeling */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Principal Deposit ($)</span>
                    <span className="font-bold text-white">{formatCurrency(projectPrincipal)}</span>
                  </div>
                  <input
                    type="range"
                    min={1000}
                    max={50000}
                    step={1000}
                    value={projectPrincipal}
                    onChange={(e) => setProjectPrincipal(parseInt(e.target.value))}
                    className="w-full accent-yellow-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Monthly Contribution ($)</span>
                    <span className="font-bold text-white">{formatCurrency(projectMonthly)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2000}
                    step={50}
                    value={projectMonthly}
                    onChange={(e) => setProjectMonthly(parseInt(e.target.value))}
                    className="w-full accent-yellow-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-mono font-bold uppercase block">Compound Interval (Quarterly modeled)</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[5, 10, 20].map((years) => (
                      <button
                        key={years}
                        onClick={() => setProjectYears(years)}
                        className={`py-1 rounded text-xs font-mono font-bold border transition ${
                          projectYears === years 
                            ? 'bg-yellow-950/20 border-yellow-500 text-yellow-400' 
                            : 'bg-[#070b19] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {years} Years
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Projection Result */}
              {(() => {
                const P = projectPrincipal;
                const r = 0.0525; // 5.25% APY
                const n = 4; // quarterly
                const t = projectYears;
                const monthlyPMT = projectMonthly;

                // Future value of principal: A_p = P * (1 + r/n)^(n*t)
                const fvPrincipal = P * Math.pow(1 + r/n, n*t);

                // Future value of monthly contributions: A_c = PMT * (((1 + r/12)^(12*t) - 1) / (r/12))
                // compounding monthly for accurate contributions model
                const monthlyRate = r / 12;
                const totalMonths = 12 * t;
                const fvContributions = monthlyPMT > 0 
                  ? monthlyPMT * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate)
                  : 0;

                const totalValueValue = fvPrincipal + fvContributions;
                const principalInvested = P + (monthlyPMT * totalMonths);
                const interestEarned = Math.max(0, totalValueValue - principalInvested);

                return (
                  <div className="bg-[#070b19] border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                      <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Estimated Maturity Value</span>
                      <span className="text-sm font-mono font-extrabold text-yellow-400 animate-pulse">
                        {formatCurrency(totalValueValue)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono leading-none">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">My Principal Base</span>
                        <span className="text-white font-bold">{formatCurrency(P)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Periodic Savings</span>
                        <span className="text-white font-bold">{formatCurrency(monthlyPMT * totalMonths)}</span>
                      </div>
                      <div className="col-span-2 pt-1">
                        <span className="text-slate-500 block text-[9px] uppercase">Accumulated Compound Interest (APY)</span>
                        <span className="text-green-400 font-extrabold flex items-center gap-1">
                          🟢 + {formatCurrency(interestEarned)} (+{Math.round((interestEarned/principalInvested)*100)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal: Create Saving Goal */}
            {showCreateVaultModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-[#0d1224] border border-slate-800 w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-white font-mono uppercase tracking-widest flex items-center gap-1.5">
                      <span>🏦</span> Establish High-Yield Saving Vault
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1">Open a customized targets bin to accumulate interest automatically.</p>
                  </div>

                  <form onSubmit={handleCreateSavingsGoal} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-mono font-bold uppercase">Vault Title / Goal Purpose</label>
                      <input
                        type="text"
                        required
                        value={newVaultTitle}
                        onChange={(e) => setNewVaultTitle(e.target.value)}
                        placeholder="e.g. Dream House Downpayment"
                        className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-mono font-bold uppercase">Target Sum ($)</label>
                        <input
                          type="number"
                          required
                          value={newVaultTarget}
                          onChange={(e) => setNewVaultTarget(e.target.value)}
                          placeholder="25000"
                          className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white font-mono outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-mono font-bold uppercase">Target Years</label>
                        <select
                          value={newVaultCategory}
                          onChange={(e) => setNewVaultCategory(e.target.value)}
                          className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-white cursor-pointer"
                        >
                          <option value="1">1 Year Plan</option>
                          <option value="3">3 Years Plan</option>
                          <option value="5">5 Years Plan</option>
                          <option value="10">10 Years Plan</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-3 justify-end text-[10px]">
                      <button
                        type="button"
                        onClick={() => setShowCreateVaultModal(false)}
                        className="px-3 py-2 border border-slate-800 font-mono rounded-lg text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 font-bold text-white rounded-lg shadow-md cursor-pointer"
                      >
                        Deploy Vault
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Fund Goal Vault from Checking */}
            {showFundVaultModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-[#0d1224] border border-slate-800 w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-white font-mono uppercase tracking-widest flex items-center gap-1.5">
                      <span>⚡</span> Fund High-Yield Vault
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1">Directly allocate capital from checks or ledger balances into compound lock.</p>
                  </div>

                  <form onSubmit={handleFundSavingsGoal} className="space-y-3">
                    <div className="space-y-1 text-left">
                      <label className="text-[9px] text-slate-400 font-mono font-bold uppercase block">Source Account Balance ($)</label>
                      <select
                        required
                        value={fundVaultSourceId}
                        onChange={(e) => setFundVaultSourceId(e.target.value)}
                        className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white cursor-pointer font-mono"
                      >
                        <option value="">-- Choose funding source account --</option>
                        {currentUser.accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.id.substring(0,6)}) - {formatCurrency(acc.balance)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-mono font-bold uppercase block">Allocation Sum ($)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={fundVaultAmount}
                        onChange={(e) => setFundVaultAmount(e.target.value)}
                        placeholder="500.00"
                        className="w-full bg-[#070b19] border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white font-mono outline-none"
                      />
                    </div>

                    <div className="flex gap-2.5 pt-3 justify-end text-[10px]">
                      <button
                        type="button"
                        onClick={() => setShowFundVaultModal(false)}
                        className="px-3 py-2 border border-slate-800 font-mono rounded-lg text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 font-bold text-white rounded-lg shadow-md cursor-pointer"
                      >
                        Execute Deployment
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: MORE / PROFILE SETTINGS (`pages/user/profile.html` mapping) */}
        {activeTab === 'more' && (
          <div className="space-y-6 animate-fade-in max-w-xl mx-auto text-left pb-12">
            
            {/* User profile Summary info card */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-5 shadow-xs">
              <div 
                className="w-20 h-20 rounded-full border-2 border-indigo-600 overflow-hidden relative group shrink-0 cursor-pointer"
                onClick={() => setShowAvatarModal(true)}
                title="Click to change profile picture"
              >
                <img 
                  src={currentUser.avatarUrl} 
                  alt={currentUser.name} 
                  className="w-full h-full object-cover group-hover:opacity-30 transition-opacity duration-200" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-indigo-950/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white select-none">
                  <span className="text-sm">📸</span>
                  <span className="text-[9px] font-bold tracking-widest uppercase font-sans mt-0.5">Edit</span>
                </div>
              </div>

              <div className="text-center md:text-left flex-1">
                <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
                  {currentUser.legalFirstName || currentUser.name} {currentUser.middleName || ''} {currentUser.legalLastName || ''}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-1">Username: @{currentUser.username || 'n/a'} • Email: {currentUser.email}</p>
                
                <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full text-indigo-700">
                    Tier-1 Verification
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full text-emerald-700">
                    Secure Ledger Active
                  </span>
                </div>
              </div>

              {!isEditingProfile && (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition cursor-pointer shrink-0"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {/* Profile update feedback alerts */}
            {profileUpdateSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3.5 rounded-xl text-center">
                ✅ {profileUpdateSuccess}
              </div>
            )}
            {profileUpdateError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold p-3.5 rounded-xl text-center">
                ❌ {profileUpdateError}
              </div>
            )}

            {isEditingProfile ? (
              /* Profile Editing Form View */
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Modify Core Registry</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileUpdateError('');
                      setProfileUpdateSuccess('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-4">
                  {/* Grid group 1: Names */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider font-mono">1. Verified Full Name (Must Fill)</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Legal First Name</label>
                        <input
                          type="text"
                          value={profileFirstName}
                          onChange={(e) => setProfileFirstName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none rounded-xl py-2 px-3 text-xs text-slate-800 transition font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Middle Name</label>
                        <input
                          type="text"
                          value={profileMiddleName}
                          onChange={(e) => setProfileMiddleName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none rounded-xl py-2 px-3 text-xs text-slate-800 transition font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Legal Last Name</label>
                        <input
                          type="text"
                          value={profileLastName}
                          onChange={(e) => setProfileLastName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none rounded-xl py-2 px-3 text-xs text-slate-800 transition font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grid group 2: Contact Registries */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider font-mono">2. Node Identifiers & Contact</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Preferred Username</label>
                        <input
                          type="text"
                          value={profileUsername}
                          onChange={(e) => setProfileUsername(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none rounded-xl py-2 px-3 text-xs text-slate-800 transition font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Email Address (Registry Primary)</label>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none rounded-xl py-2 px-3 text-xs text-slate-800 transition font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Phone (with Country Code)</label>
                        <input
                          type="text"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          placeholder="e.g. +1 415 555 0199"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none rounded-xl py-2 px-3 text-xs text-slate-800 transition font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Residing Country</label>
                        <input
                          type="text"
                          value={profileCountry}
                          onChange={(e) => setProfileCountry(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none rounded-xl py-2 px-3 text-xs text-slate-800 transition font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grid group 3: Account details */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider font-mono">3. Ledger Settings & Security credentials</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Type of Account</label>
                        <select
                          value={profileAccountType}
                          onChange={(e) => setProfileAccountType(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none rounded-xl py-2 px-3 text-xs text-slate-800 transition font-medium"
                        >
                          <option value="checking">Chamber Checking Account</option>
                          <option value="savings">High-Yield Vault Savings</option>
                          <option value="credit">Pro-Limit Credit Ledger</option>
                          <option value="investment">Wealth & Arbitrage Lock</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Base Currency</label>
                        <select
                          value={profileCurrency}
                          onChange={(e) => setProfileCurrency(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none rounded-xl py-2 px-3 text-xs text-slate-800 transition font-medium"
                        >
                          <option value="USD">USD ($) - US Dollar</option>
                          <option value="EUR">EUR (€) - Euro Zone</option>
                          <option value="GBP">GBP (£) - British Pound</option>
                          <option value="CAD">CAD (C$) - Canadian Dollar</option>
                          <option value="AUD">AUD (A$) - Australian Dollar</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">4-Digit Transaction PIN</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={profilePin}
                          onChange={(e) => setProfilePin(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 1234"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none rounded-xl py-2 px-3 text-xs text-center font-mono font-bold tracking-widest text-slate-800 transition"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Auth Password</label>
                        <input
                          type="text"
                          value={profilePassword}
                          onChange={(e) => setProfilePassword(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none rounded-xl py-2 px-3 text-xs text-slate-800 transition font-medium font-mono"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-slate-400 font-mono tracking-wide uppercase">Unique Bank IBAN (Read-Only Compliance)</label>
                        <input
                          type="text"
                          readOnly
                          value={currentUser.iban || "GB89 UCBU 3141 5926 5358 97"}
                          className="w-full bg-slate-100 border border-slate-200 outline-none rounded-xl py-2 px-3 text-xs text-slate-500 font-bold font-mono transition cursor-not-allowed tracking-wider"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer text-center"
                    >
                      Save Profile Updates
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setProfileUpdateError('');
                        setProfileUpdateSuccess('');
                      }}
                      className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Discard
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Profile Details Read View containing all 11 fields grouped */
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Verified Ledger Registry</h4>
                  <span className="text-[10px] bg-indigo-600 text-white font-extrabold px-2 py-0.5 rounded-md font-mono">STATUS: SECURE</span>
                </div>

                <div className="p-5 divide-y divide-slate-100 text-xs">
                  {/* Row 1: Legal Names */}
                  <div className="py-2.5 grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Legal First Name</span>
                      <span className="text-slate-800 font-bold">{currentUser.legalFirstName || currentUser.name.split(' ')[0]}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Middle Name</span>
                      <span className="text-slate-800 font-bold">{currentUser.middleName || 'n/a'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Legal Last Name</span>
                      <span className="text-slate-800 font-bold">{currentUser.legalLastName || currentUser.name.split(' ').slice(1).join(' ') || 'n/a'}</span>
                    </div>
                  </div>

                  {/* Row 2: User Identifiers & Email */}
                  <div className="py-2.5 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Preferred Username</span>
                      <span className="text-slate-800 font-mono font-bold">@{currentUser.username || 'n/a'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Email Address</span>
                      <span className="text-slate-800 font-semibold">{currentUser.email}</span>
                    </div>
                  </div>

                  {/* Row 3: Phone & Country */}
                  <div className="py-2.5 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Phone Number</span>
                      <span className="text-slate-800 font-bold">{currentUser.phoneNumber || 'n/a'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Resident Country</span>
                      <span className="text-slate-800 font-semibold">{currentUser.country || 'n/a'}</span>
                    </div>
                  </div>

                  {/* Row 3.5: Unique Account Number (IBAN) */}
                  <div className="py-3 px-3.5 bg-slate-50 border border-slate-200/60 rounded-xl my-2">
                    <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block font-mono">Unique Account Number (IBAN)</span>
                    <div className="flex items-center justify-between mt-1 gap-2">
                      <span className="text-xs sm:text-sm font-black font-mono text-slate-800 tracking-wider">
                        {currentUser.iban || "GB89 UCBU 3141 5926 5358 97"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const ibanToCopy = currentUser.iban || "GB89 UCBU 3141 5926 5358 97";
                          navigator.clipboard.writeText(ibanToCopy);
                          setCopiedIban(true);
                          setTimeout(() => setCopiedIban(false), 2000);
                        }}
                        className="px-2.5 py-1 text-[10px] font-mono bg-white hover:bg-slate-50 text-indigo-700 font-extrabold rounded-lg border border-slate-200 shadow-xs transition duration-200 cursor-pointer shrink-0"
                      >
                        {copiedIban ? "Copied! ✓" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Row 4: Account Configuration */}
                  <div className="py-2.5 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Default Account</span>
                      <span className="text-slate-800 font-bold capitalize">
                        {currentUser.typeOfAccount === 'checking' && 'Chamber Checking'}
                        {currentUser.typeOfAccount === 'savings' && 'High-Yield savings'}
                        {currentUser.typeOfAccount === 'credit' && 'Pro-limit credit ledger'}
                        {currentUser.typeOfAccount === 'investment' && 'Wealth & Arbitrage lock'}
                        {!currentUser.typeOfAccount && 'Standard Checking'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Base Currency</span>
                      <span className="text-slate-800 font-bold font-mono text-indigo-700">{currentUser.currency || 'USD'}</span>
                    </div>
                  </div>

                  {/* Row 5: Secrets */}
                  <div className="py-2.5 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">4-Digit PIN</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-800 font-bold font-mono">
                          {showProfilePin ? (currentUser.transactionPin || 'n/a') : '••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowProfilePin(!showProfilePin)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                        >
                          {showProfilePin ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-405 text-slate-400 font-bold uppercase tracking-wider block">Auth Password</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-800 font-semibold font-mono">
                          {showProfilePassword ? (currentUser.password || 'n/a') : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowProfilePassword(!showProfilePassword)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                        >
                          {showProfilePassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY & BIOMETRIC SIMULATIONS */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs text-left space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Fingerprint className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Security & Biometrics</h4>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-slate-900 block">Biometric Authentication Simulation</span>
                    <span className="text-xs text-slate-500 block leading-normal">
                      Toggle simulated biometric confirmation for transfers, investments, and secure actions.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleBiometric}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                      biometricEnabled ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        biometricEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {biometricEnabled ? (
                  <div className="pt-3 border-t border-slate-100 space-y-3.5 animate-fade-in">
                    <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider font-mono">Simulated Biometric Method</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setBiometricType('face-id');
                          localStorage.setItem('biometric_auth_type', 'face-id');
                          addAuditLog(currentUser.username, currentUser.id, "SECURITY_CHANGE", "Configured Simulated Biometrics: FaceID.");
                        }}
                        className={`p-3 border rounded-xl flex flex-col items-center gap-2 transition duration-205 cursor-pointer text-center ${
                          biometricType === 'face-id'
                            ? 'border-indigo-600 bg-indigo-50/50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <ScanFace className={`w-5 h-5 ${biometricType === 'face-id' ? 'text-indigo-600 pointer-events-none' : 'text-slate-400 pointer-events-none'}`} />
                        <span className={`text-[11px] font-extrabold ${biometricType === 'face-id' ? 'text-indigo-700' : 'text-slate-600'}`}>FaceID Driver</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBiometricType('touch-id');
                          localStorage.setItem('biometric_auth_type', 'touch-id');
                          addAuditLog(currentUser.username, currentUser.id, "SECURITY_CHANGE", "Configured Simulated Biometrics: TouchID.");
                        }}
                        className={`p-3 border rounded-xl flex flex-col items-center gap-2 transition duration-205 cursor-pointer text-center ${
                          biometricType === 'touch-id'
                            ? 'border-indigo-600 bg-indigo-50/50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Fingerprint className={`w-5 h-5 ${biometricType === 'touch-id' ? 'text-indigo-600 pointer-events-none' : 'text-slate-400 pointer-events-none'}`} />
                        <span className={`text-[11px] font-extrabold ${biometricType === 'touch-id' ? 'text-indigo-700' : 'text-slate-600'}`}>TouchID Driver</span>
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </div>
                        <span className="text-xs font-bold text-slate-700">
                          {biometricType === 'face-id' ? 'FaceID Recognition Enabled' : 'TouchID Fingerprint Scan Enabled'}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-emerald-50 border border-emerald-150 text-emerald-800 px-2.5 py-0.5 rounded-md">
                        ONLINE & ARMED
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-extrabold text-amber-800 block">Biometric Simulation Deactivated</span>
                      <span className="text-[11px] text-amber-600 block mt-0.5 leading-normal">
                        All transactions, payouts, and transfers will require your 4-digit security PIN (1234) for authorization.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Action items and Admin redirects */}
            <div className="space-y-3.5">
              
              {/* Reset Database Button settings */}
              <button 
                onClick={() => {
                  if (confirm('Reconciliation Request: This will reset all accounts, credit histories, and transactions in your Sandbox browser registry to factory standard. Perform?')) {
                    localStorage.removeItem('unitycore_users');
                    localStorage.removeItem('unitycore_audit_logs');
                    window.location.reload();
                  }
                }}
                className="w-full bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold py-3.5 px-4 rounded-xl border border-slate-200 transition flex items-center justify-between cursor-pointer shadow-xs"
              >
                <span>Reset Local Sandbox Registry</span>
                <RefreshCw className="w-4 h-4 text-indigo-600" />
              </button>

              {/* Admin Panel redirection option */}
              {currentUser.role === 'admin' && (
                <button 
                  onClick={() => onRoleSwitch('admin')}
                  className="w-full bg-white hover:bg-slate-50 text-xs text-slate-800 font-bold py-3.5 px-4 rounded-xl border border-slate-200 transition flex items-center justify-between cursor-pointer shadow-xs"
                  id="btn-switch-admin-panel"
                >
                  <span>Switch to Admin Control Panel</span>
                  <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-mono px-2 py-0.5 rounded-md">CMD_</span>
                </button>
              )}

              {/* Logout button */}
              <button 
                onClick={onLogout}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold py-3.5 px-4 rounded-xl border border-rose-100 transition flex items-center justify-between cursor-pointer shadow-xs"
                id="btn-profile-logout"
              >
                <span>Lock Vault Session (Sign Out)</span>
                <LogOut className="w-4 h-4 text-rose-600" />
              </button>
            </div>


          </div>
        )}

        {/* TAB 6: UNIFIED SYSTEM ACTIVITY LEDGER */}
        {activeTab === 'activity' && (
          <div className="space-y-6 animate-fade-in max-w-lg mx-auto pb-8 text-left">
            <div>
              <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">Historical Audit</span>
              <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">Account Activity Ledger</h2>
              <p className="text-xs text-slate-400">Total ledger query across all active sandbox cache registries.</p>
            </div>

            {/* Quick cash flow chart status */}
            <div className="bg-[#0d1224] border border-slate-800 p-4 rounded-2xl flex justify-between items-center whitespace-nowrap overflow-x-auto">
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase">Inflow Cash</span>
                <p className="text-sm font-extrabold text-[#34d399]">+ $38,250.00</p>
              </div>
              <div className="h-8 w-[1px] bg-slate-850 bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Outflow Cash</span>
                <p className="text-sm font-extrabold text-[#f87171]">- $12,490.15</p>
              </div>
              <div className="h-8 w-[1px] bg-slate-850 bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase">Activity Volume</span>
                <p className="text-sm font-extrabold text-blue-400">{currentUser.transactions.length} items</p>
              </div>
            </div>

            {/* Filter Search controls */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search description, account type or amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#080c18] border border-slate-800 rounded-xl text-xs placeholder:text-slate-550 outline-none focus:border-blue-500 transition-all font-sans"
              />
            </div>

            {/* Transactions container */}
            <div className="bg-[#0d1224] border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-md">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-850 border-slate-800">
                <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono">Timestamp Ledger</span>
                <button 
                  onClick={() => alert('Download Complete: Simulating Unitycore PDF / CSV Statement generation.')}
                  className="text-[10px] font-bold text-blue-450 text-blue-400 hover:underline"
                >
                  Export Statement (PDF)
                </button>
              </div>

              {/* Loop transactions */}
              <div className="space-y-3 divide-y divide-slate-850 divide-slate-800">
                {currentUser.transactions
                  .filter(t => t.description.toLowerCase().includes(searchQuery.toLowerCase()) || formatCurrency(t.amount).includes(searchQuery))
                  .map((tx, idx) => {
                    const isDebit = tx.amount < 0 || tx.description.toLowerCase().includes('wire') || tx.description.toLowerCase().includes('payment') || tx.description.toLowerCase().includes('transfer to');
                    const absoluteAmount = Math.abs(tx.amount);
                    return (
                      <div key={tx.id || idx} className="flex justify-between items-center pt-3 first:pt-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDebit ? 'bg-rose-500/15 text-rose-450' : 'bg-emerald-500/15 text-emerald-400'}`}>
                            {isDebit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white leading-normal">{tx.description}</p>
                             <p className="text-[10px] text-slate-500 font-mono mt-0.5">{formatTransactionDate(tx.timestamp || tx.date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-mono font-bold ${isDebit ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isDebit ? '-' : '+'}{formatCurrency(absoluteAmount)}
                          </p>
                          <span className="text-[9px] text-[#34d399] bg-[#064e3b] px-1.5 py-0.5 rounded-full font-sans font-bold uppercase">Settled</span>
                        </div>
                      </div>
                    );
                  })}
                {currentUser.transactions.length === 0 && (
                  <p className="text-center text-xs text-slate-500 py-6">No historical transaction activity found.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: INTERNATIONAL SWIFT TRANSFER */}
        {activeTab === 'intl-wire' && (
          <div className="space-y-6 animate-fade-in max-w-sm mx-auto text-left pb-8">
            <div>
              <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">SWIFT RTGS Node</span>
              <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">International Wire Transfer</h2>
              <p className="text-xs text-slate-400">Perform wire transfers globally utilizing cross-border sandbox conversion.</p>
            </div>

            {wireSuccessMsg && (
              <div className="bg-[#064e3b] border border-[#10b981] text-[#34d399] text-xs p-4 rounded-xl flex items-start gap-2.5 shadow-lg">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <div>
                  <h4 className="font-bold">Wire Transfer Authorized</h4>
                  <p className="text-[11px] text-[#a7f3d0] mt-1">{wireSuccessMsg}</p>
                </div>
              </div>
            )}

            <div className="bg-[#0d1224] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <form onSubmit={(e) => {
                e.preventDefault();
                const amount = parseFloat(wireAmount);
                if (isNaN(amount) || amount <= 0) {
                  alert('Please enter a valid wire amount');
                  return;
                }
                const debitAccount = currentUser.accounts.find(a => a.id === wireTargetAccount);
                if (!debitAccount || debitAccount.balance < amount + 15) {
                  alert('Insufficient funds to cover this international wire amount and transaction SWIFT fee ($15.00)');
                  return;
                }

                setWireProcessing(true);
                setTimeout(() => {
                  const allUsers = loadUsersData();
                  const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
                  if (userIdx !== -1) {
                    const matchAcc = allUsers[userIdx].accounts.find(a => a.id === wireTargetAccount);
                    if (matchAcc) {
                      // Do NOT adjust balance yet since it requires admin confirmation!
                      // matchAcc.balance -= (amount + 15);
                      
                      const newTx: Transaction = {
                        id: `tx-swift-${Date.now()}`,
                        description: `SWIFT WIRE / TO: ${wireBeneficiary} [${wireCountry.toUpperCase()}]`,
                        amount: -amount,
                        date: formatTransactionDate(Date.now()),
                        timestamp: Date.now(),
                        category: 'transfer',
                        status: 'pending',
                        targetAccountId: matchAcc.id
                      };
                      
                      const feeTx: Transaction = {
                        id: `tx-swift-fee-${Date.now()}`,
                        description: `SWIFT CROSS-BORDER COMMISSION FEE`,
                        amount: -15,
                        date: formatTransactionDate(Date.now()),
                        timestamp: Date.now(),
                        category: 'other',
                        status: 'pending',
                        targetAccountId: matchAcc.id
                      };

                      allUsers[userIdx].transactions = [newTx, feeTx, ...allUsers[userIdx].transactions];
                      saveUsersData(allUsers);
                      addAuditLog(currentUser.username, currentUser.id, 'WIRE_TRANSFER', `Requested international wire of ${formatCurrency(amount)} to ${wireBeneficiary}. Pending admin approval.`);
                      
                      triggerStateRefresh();
                      setWireSuccessMsg(`SWIFT transfer request submitted successfully! Wire of ${formatCurrency(amount)} to ${wireBeneficiary} and cross-border fee ($15.00) are pending manual administrative clearance.`);
                      setWireAmount('');
                      setWireSwift('');
                      setWireBeneficiary('');
                      setWireBankName('');
                      setWireRemarks('');
                    }
                  }
                  setWireProcessing(false);
                }, 1500);
              }} className="space-y-3.5">
                
                <div className="space-y-1">
                  <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">Funding Node</span>
                  <select 
                    value={wireTargetAccount}
                    onChange={(e) => setWireTargetAccount(e.target.value)}
                    className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs focus:border-blue-500 text-white"
                  >
                    {currentUser.accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)} available)</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">Dest Country</span>
                    <select 
                      value={wireCountry}
                      onChange={(e) => setWireCountry(e.target.value)}
                      className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3 text-xs focus:border-blue-500 text-white"
                    >
                      <option value="united-kingdom">United Kingdom (UK)</option>
                      <option value="germany">Germany (DE)</option>
                      <option value="japan">Japan (JP)</option>
                      <option value="china">China (CN)</option>
                      <option value="canada">Canada (CA)</option>
                      <option value="france">France (FR)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">Settle Currency</span>
                    <select 
                      value={wireCurrency}
                      onChange={(e) => setWireCurrency(e.target.value)}
                      className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3 text-xs focus:border-blue-500 text-white"
                    >
                      <option value="EUR">Euro (€)</option>
                      <option value="GBP">Pound Sterling (£)</option>
                      <option value="JPY">Japanese Yen (¥)</option>
                      <option value="CNY">Yuan Renminbi (¥)</option>
                      <option value="CAD">Canadian Dollar ($)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">SWIFT / BIC Code</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BARCGB22XXXX"
                    value={wireSwift}
                    onChange={(e) => setWireSwift(e.target.value.toUpperCase())}
                    className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white uppercase font-mono placeholder:text-slate-600 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">Beneficiary Full Name</span>
                  <input
                    type="text"
                    required
                    placeholder="Wook Shing / Corp Name"
                    value={wireBeneficiary}
                    onChange={(e) => setWireBeneficiary(e.target.value)}
                    className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">Beneficiary Bank Name</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Barclays Bank PLC"
                    value={wireBankName}
                    onChange={(e) => setWireBankName(e.target.value)}
                    className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">Amount (USD)</span>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 12500"
                      value={wireAmount}
                      onChange={(e) => setWireAmount(e.target.value)}
                      className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white font-mono placeholder:text-slate-600 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-sans font-medium uppercase">Wire Fee</span>
                    <div className="bg-[#080c18] border border-slate-850 border-slate-800 rounded-xl py-2.5 px-3 text-xs text-[#f87171] font-bold font-mono text-center">
                      $15.00 Base
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-[#34d399] uppercase font-bold font-sans">Live Conversion Rate Estimate</span>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {wireAmount ? (
                      `$${parseFloat(wireAmount).toLocaleString()} USD ≈ ${(parseFloat(wireAmount) * (wireCurrency === 'EUR' ? 0.92 : wireCurrency === 'GBP' ? 0.79 : wireCurrency === 'JPY' ? 155.8 : wireCurrency === 'CNY' ? 7.23 : 1.36)).toLocaleString(undefined, {maximumFractionDigits: 2})} ${wireCurrency}`
                    ) : (
                      `$1.00 USD ≈ 0.92 EUR / 0.79 GBP / 155.8 JPY`
                    )}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={wireProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-700 font-sans text-xs font-bold py-3.5 px-4 rounded-xl text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-900/40"
                >
                  {wireProcessing ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Authorizing SWIFT Cross-Border Node...
                    </span>
                  ) : (
                    <>
                      <span>Submit International SWIFT Settlement</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 8: HIGH-FIDELITY DEPOSIT & WITHDRAWAL SETTLEMENT CENTER */}
        {activeTab === 'deposit' && (
          <div className="space-y-6 animate-fade-in max-w-md mx-auto text-left pb-8">
              <div>
                <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">Settlement Node</span>
                <h2 className="text-xl font-bold text-white tracking-tight mt-0.5 animate-pulse-slow">Deposit & Withdrawal Hub</h2>
                <p className="text-xs text-slate-400 font-sans">Request account deposits or initiate secure withdrawals across bank wires, checks, and crypto networks.</p>
              </div>

              {depositReportMsg && (
                <div className="bg-[#064e3b] border border-[#10b981] text-[#34d399] text-xs p-4 rounded-xl flex items-start gap-2.5 shadow-lg font-sans">
                  <CheckCircle className="w-5 h-5 shrink-0 animate-bounce" />
                  <div>
                    <h4 className="font-bold">Sandbox Action Recorded</h4>
                    <p className="text-[11px] text-[#a7f3d0] mt-1">{depositReportMsg}</p>
                  </div>
                </div>
              )}

              {/* Action and Network Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-[#090d1e] p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setDepositOrWithdraw('deposit');
                    setDepositReportMsg('');
                  }}
                  className={`py-2 text-center text-xs font-bold rounded-lg transition border-none cursor-pointer ${
                    isDeposit 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white bg-transparent'
                  }`}
                >
                  🏦 Deposit Option
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDepositOrWithdraw('withdraw');
                    setDepositReportMsg('');
                  }}
                  className={`py-2 text-center text-xs font-bold rounded-lg transition border-none cursor-pointer ${
                    !isDeposit 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white bg-transparent'
                  }`}
                >
                  📤 Withdrawal Option
                </button>
              </div>

              {/* Selector Tabs for network channels */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#090d1e] rounded-xl border border-slate-800 select-none">
                {([
                  { id: 'bank', name: '🏦 Bank Wire' },
                  { id: 'check', name: '📝 Check Scan' },
                  { id: 'crypto', name: '🪙 USD-Crypto' }
                ] as const).map((method) => {
                  const cfgObj = dwConfigs.find(c => c.id === method.id);
                  const isChEnabled = cfgObj ? (isDeposit ? cfgObj.depositEnabled : cfgObj.withdrawEnabled) : true;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => {
                        setSelectedMethodId(method.id);
                        setDepositReportMsg('');
                      }}
                      className={`py-2.5 px-0.5 text-[10px] font-extrabold rounded-lg transition text-center cursor-pointer border-none flex items-center justify-center gap-1.5 relative ${
                        selectedMethodId === method.id
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white bg-transparent'
                      }`}
                    >
                      <span>{method.name}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${isChEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`} title={isChEnabled ? "Channel enabled" : "Channel paused"} />
                    </button>
                  );
                })}
              </div>

              {/* Main content pane */}
              <div className="bg-[#0c1022] border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-white">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold tracking-wider text-indigo-400 uppercase">
                    Channel: {activeCfg ? activeCfg.name : selectedMethodId}
                  </span>
                  <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border uppercase shrink-0 ${
                    isEnabled 
                      ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60' 
                      : 'text-rose-400 bg-rose-950/40 border-rose-800/60'
                  }`}>
                    {isEnabled ? 'System Config Active' : 'Administrative Suspension'}
                  </span>
                </div>

                {/* Administrator instructions */}
                <div className="bg-[#050814] p-3.5 rounded-xl border border-slate-800/80 space-y-2.5 leading-relaxed">
                  <span className="text-[9px] text-slate-500 block uppercase font-mono font-bold">Admin Clearance Instructions</span>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {activeCfg ? (isDeposit ? activeCfg.depositInstructions : activeCfg.withdrawInstructions) : 'No instructions provided.'}
                  </p>

                  {/* Specification details copy layout */}
                  {isDeposit && isEnabled && activeCfg && Object.keys(activeCfg.depositFields).length > 0 && (
                    <div className="pt-2 border-t border-slate-800 text-left space-y-1.5">
                      <span className="text-[9px] text-[#f87171] uppercase font-bold tracking-wide block">Dynamic Deposit Details (Click to copy):</span>
                      <div className="space-y-1.5">
                        {Object.entries(activeCfg.depositFields).map(([fKey, fVal]) => {
                          const parsedVal = (fVal as string).replace('{username}', currentUser.username);
                          return (
                            <div 
                              key={fKey}
                              onClick={() => handleCopy(parsedVal, fKey)}
                              className="bg-[#080c1b] hover:bg-[#0f152d] hover:border-slate-650 p-2 rounded-lg border border-slate-800 cursor-pointer text-xs flex justify-between items-center transition"
                            >
                              <div className="truncate pr-2 text-left">
                                <span className="text-[8px] text-slate-500 uppercase block font-bold">{fKey}</span>
                                <span className="font-mono text-slate-200 select-all font-bold">{parsedVal}</span>
                              </div>
                              <span className="text-[9px] font-mono font-semibold text-indigo-400 bg-indigo-950/50 border border-indigo-900/60 px-1.5 py-0.5 rounded shrink-0">
                                {copiedField === fKey ? 'Copied ✅' : 'Copy'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {!isEnabled ? (
                  <div className="bg-rose-950/30 border border-rose-800/60 rounded-xl p-4 text-center text-rose-305 text-xs text-rose-300 font-sans leading-relaxed">
                    ⚠️ This payment channel is suspended by administrative security policies. Please contact physical system desk services to arrange manual ledger clearance.
                  </div>
                ) : (
                  <form onSubmit={handleCheckDeposit} className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-indigo-block text-indigo-400 font-mono font-bold uppercase block">
                        {isDeposit ? 'Destination Savings Ledger' : 'Source Dispersal Ledger'}
                      </span>
                      <select 
                        value={depositTarget}
                        onChange={(e) => setDepositTarget(e.target.value)}
                        className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3 text-xs focus:border-indigo-500 text-white outline-none font-bold"
                      >
                        {currentUser.accounts.map(a => (
                          <option key={a.id} value={a.id} className="bg-slate-950 text-white">{a.name} ({formatCurrency(a.balance)} available)</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase block">Transfer Funds Amount ($ USD)</span>
                      <input
                        type="number"
                        min={1}
                        step="any"
                        placeholder="e.g. 1000.00"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white font-mono placeholder:text-slate-600 outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>

                    {/* Integrated check-scans interface ONLY if method id is check & user is depositing */}
                    {selectedMethodId === 'check' && isDeposit && (
                      <div className="space-y-3 pt-2">
                        <span className="text-[10px] text-indigo-400 font-bold uppercase font-sans block">Check Scan Dual Capture System</span>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div 
                            onClick={() => {
                              if (!depositAmount) {
                                alert('Please fill in the check amount first to validate OCR scanning parameters.');
                                return;
                              }
                              setDepositFrontCaptured(true);
                            }}
                            className={`border border-dashed h-22 rounded-xl flex flex-col items-center justify-center p-2 cursor-pointer transition text-center ${
                              depositFrontCaptured 
                                ? 'bg-emerald-500/10 border-emerald-450 text-[#34d399]' 
                                : 'bg-[#080c18] border-slate-800 hover:border-slate-650 text-slate-400'
                            }`}
                          >
                            {depositFrontCaptured ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-[#34d399] mb-1 animate-pulse" />
                                <span className="text-[9px] font-bold text-emerald-400">FRONT CAPTURED</span>
                                <span className="text-[8px] text-slate-400">OCR verified</span>
                              </>
                            ) : (
                              <>
                                <Smartphone className="w-4 h-4 mb-1 text-slate-500" />
                                <span className="text-[9px] font-bold">Scan Front Check</span>
                                <span className="text-[8px] text-slate-500 font-sans">Endorsement capture</span>
                              </>
                            )}
                          </div>

                          <div 
                            onClick={() => {
                              if (!depositFrontCaptured) {
                                alert('Please scan the front of the check first.');
                                return;
                              }
                              setDepositBackCaptured(true);
                            }}
                            className={`border border-dashed h-22 rounded-xl flex flex-col items-center justify-center p-2 cursor-pointer transition text-center ${
                              depositBackCaptured 
                                ? 'bg-emerald-500/10 border-emerald-450 text-[#34d399]' 
                                : 'bg-[#080c18] border-slate-800 hover:border-slate-650 text-slate-400'
                            }`}
                          >
                            {depositBackCaptured ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-[#34d399] mb-1 animate-pulse" />
                                <span className="text-[9px] font-bold text-emerald-400">BACK CAPTURED</span>
                                <span className="text-[8px] text-slate-400">Signature matched</span>
                              </>
                            ) : (
                              <>
                                <Smartphone className="w-4 h-4 mb-1 text-slate-500" />
                                <span className="text-[9px] font-bold">Scan Back Check</span>
                                <span className="text-[8px] text-slate-500 font-sans">Endorsement signature</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase block">
                        {selectedMethodId === 'bank' 
                          ? (isDeposit ? 'Your Depositing Bank / Wire Reference' : 'Recipient Bank Account IBAN / BIC Code') 
                          : selectedMethodId === 'check'
                            ? 'Check Serial Identifier'
                            : (isDeposit ? 'Your Transfer Wallet Hash / TXID Index' : 'External Recipient USDT/Crypto Wallet Address')}
                      </span>
                      <input
                        type="text"
                        placeholder={
                          selectedMethodId === 'bank' 
                            ? (isDeposit ? 'e.g. Wire index #9305-Chase' : 'IBAN DE89 3704 0044...')
                            : selectedMethodId === 'check'
                              ? 'e.g. Check #2948194'
                              : (isDeposit ? 'e.g. TXID: e04cf92b8d...' : 'USDT TRC20 Wallet address...')
                        }
                        value={dwReference}
                        onChange={(e) => setDwReference(e.target.value)}
                        className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white font-mono placeholder:text-slate-600 outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={selectedMethodId === 'check' && isDeposit && (!depositFrontCaptured || !depositBackCaptured)}
                      className={`w-full font-sans text-xs font-bold py-3.5 px-4 rounded-xl text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                        selectedMethodId === 'check' && isDeposit && (!depositFrontCaptured || !depositBackCaptured)
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed border-none'
                          : 'bg-indigo-600 hover:bg-indigo-705 hover:bg-indigo-750 border-none bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      <span>Submit {isDeposit ? 'Deposit' : 'Withdrawal'} Clearance</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

        {/* TAB 9: LOAN DESK APPLICATION HUB */}
        {activeTab === 'loan' && (
          <div className="space-y-6 animate-fade-in max-w-sm mx-auto text-left pb-8">
            <div>
              <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">Credit Desks</span>
              <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">Autonomous Loan Desk</h2>
              <p className="text-xs text-slate-400">Instantly pre-approve & deposit capital loans utilizing your verified sandbox credit scoring.</p>
            </div>

            {loanSuccessMsg && (
              <div className="bg-[#064e3b] border border-[#10b981] text-[#34d399] text-xs p-4 rounded-xl flex items-start gap-2.5 shadow-lg">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <div>
                  <h4 className="font-bold">Loan Approved & Disbursed!</h4>
                  <p className="text-[11px] text-[#a7f3d0] mt-1">{loanSuccessMsg}</p>
                </div>
              </div>
            )}

            {/* Application Desk UI */}
            <div className="bg-[#0d1224] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <form onSubmit={(e) => {
                e.preventDefault();
                const principal = parseFloat(loanAmount);
                if (isNaN(principal) || principal <= 0) {
                  alert('Please select a valid loan amount');
                  return;
                }

                setLoanProcessing(true);
                setTimeout(() => {
                  const allUsers = loadUsersData();
                  const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
                  if (userIdx !== -1) {
                    let matchAcc = allUsers[userIdx].accounts.find(a => a.id === 'acc-checking');
                    if (!matchAcc && allUsers[userIdx].accounts.length > 0) {
                      matchAcc = allUsers[userIdx].accounts.find(a => a.type === 'checking') || allUsers[userIdx].accounts[0];
                    }
                    if (matchAcc) {
                      // Do NOT adjust balance yet since it requires admin confirmation!
                      // matchAcc.balance += principal;
                      
                      const newTx: Transaction = {
                        id: `tx-loan-${Date.now()}`,
                        description: `UNITYCORE CREDIT UNION: LOAN DISBURSEMENT - PRE-APPROVED`,
                        amount: principal,
                        date: formatTransactionDate(Date.now()),
                        timestamp: Date.now(),
                        category: 'other',
                        status: 'pending',
                        targetAccountId: matchAcc.id
                      };

                      allUsers[userIdx].transactions = [newTx, ...allUsers[userIdx].transactions];
                      saveUsersData(allUsers);
                      addAuditLog(currentUser.username, currentUser.id, 'LOAN_ISSUED', `Requested loan of ${formatCurrency(principal)} to checking. Pending admin approval.`);

                      const rate = loanCategory === 'personal' ? 7.5 : loanCategory === 'vehicle' ? 5.5 : loanCategory === 'business' ? 6.2 : 4.8;
                      const termInt = parseInt(loanTerm);
                      const monthlyPaymentVal = (principal * (1 + (rate / 100))) / termInt;

                      setLoansList([
                        {
                          id: `loan-${Math.floor(1000 + Math.random() * 9000)}`,
                          category: `${loanCategory.charAt(0).toUpperCase() + loanCategory.slice(1)} Vault Credit Line`,
                          principal: principal,
                          rate: rate,
                          term: termInt,
                          monthlyPayment: Math.round(monthlyPaymentVal * 100) / 100,
                          status: 'Pending'
                        },
                        ...loansList
                      ]);

                      triggerStateRefresh();
                      setLoanSuccessMsg(`Instant screening complete! Algorithmic pre-acceptance issued. Loan request of ${formatCurrency(principal)} is now pending manual administrative approval.`);
                      setLoanAmount('15000');
                    }
                  }
                  setLoanProcessing(false);
                }, 1500);
              }} className="space-y-4">
                
                <div className="space-y-1">
                  <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">Loan Category Choice</span>
                  <select 
                    value={loanCategory}
                    onChange={(e) => setLoanCategory(e.target.value as any)}
                    className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white"
                  >
                    <option value="personal">Personal Bridge Loan (7.5% APR)</option>
                    <option value="vehicle">Automotive / Vehicle Financing (5.5% APR)</option>
                    <option value="business">Commercial Business Extension (6.2% APR)</option>
                    <option value="real-estate">Mortgage & Real Estate Equity (4.8% APR)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">Principal Amount ($)</span>
                    <span className="font-mono text-white font-bold">{formatCurrency(parseFloat(loanAmount) || 0)}</span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="150000"
                    step="5000"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full accent-[#5c4fff] h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>$5k Min</span>
                    <span>$150k Max Limit</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">Repayment Duration</span>
                    <span className="font-mono text-white font-bold">{loanTerm} Months</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="120"
                    step="12"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(e.target.value)}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>1 Year (12m)</span>
                    <span>10 Years (120m)</span>
                  </div>
                </div>

                {/* Simulated dynamic monthly payment breakdown */}
                <div className="bg-[#080c18] border border-slate-850 border-slate-800 p-3 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono uppercase block">Estimated Payment</span>
                    <span className="text-lg font-mono font-extrabold text-[#34d399]">
                      {formatCurrency(((parseFloat(loanAmount) || 0) * (1 + ((loanCategory === 'personal' ? 7.5 : loanCategory === 'vehicle' ? 5.5 : loanCategory === 'business' ? 6.2 : 4.8) / 100))) / parseInt(loanTerm))}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono inline ml-1">/ month</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 font-mono uppercase block">APR Lock</span>
                    <span className="text-xs font-mono font-bold text-blue-400">
                      {loanCategory === 'personal' ? '7.5%' : loanCategory === 'vehicle' ? '5.5%' : loanCategory === 'business' ? '6.2%' : '4.8%'} Guaranteed
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loanProcessing}
                  className="w-full bg-[#34d399] hover:bg-emerald-500 text-[#0d1224] font-semibold text-xs py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                >
                  {loanProcessing ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#0d1224]" /> Securing Underwriting approval...
                    </span>
                  ) : (
                    <>
                      <span>Submit Sandbox Credit Disbursals</span>
                      <Sparkles className="w-4 h-4 text-[#0d1224]" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Active Loan history list requested from screens */}
            <div className="space-y-3.5">
              <h3 className="text-sm font-bold tracking-tight text-white uppercase font-mono">My Credit Accounts</h3>
              <div className="space-y-3">
                {loansList.map((ln) => (
                  <div key={ln.id} className="bg-[#0d1224] border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs font-semibold text-white leading-normal">{ln.category}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Amount: <span className="text-slate-350">{formatCurrency(ln.principal)}</span> • Rate: <span className="text-slate-350">{ln.rate}% APR</span> • Duration: <span className="text-slate-350">{ln.term} months</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-extrabold text-blue-400">{formatCurrency(ln.monthlyPayment)} /mo</p>
                      <span className="text-[9px] text-emerald-400 bg-[#064e3b] px-2 py-0.5 rounded-full font-sans font-bold uppercase tracking-wider inline-block mt-1">
                        {ln.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: IRS TAX REFUND TRACKER */}
        {activeTab === 'irs-refund' && (
          <div className="space-y-6 animate-fade-in max-w-sm mx-auto text-left pb-8">
            <div>
              <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">Treasury RTN Node</span>
              <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">Federal Tax Refund Tracker</h2>
              <p className="text-xs text-slate-400">Scan federal treasury channels to authorize and deposit your IRS 2024 / 2025 refund.</p>
            </div>

            {irsError && (
              <div className="bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-xl">
                {irsError}
              </div>
            )}

            <div className="bg-[#0d1224] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">SSN or Tax ITIN</span>
                  <input
                    type="password"
                    placeholder="e.g. •••-••-5920"
                    value={irsSsn}
                    onChange={(e) => setIrsSsn(e.target.value)}
                    className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-slate-650 font-mono outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">Estimated Filing Credit Amount ($)</span>
                  <input
                    type="number"
                    value={irsExpectedAmount}
                    onChange={(e) => setIrsExpectedAmount(e.target.value)}
                    className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-slate-650 font-mono outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!irsSsn) {
                      setIrsError('Please enter a valid SSN or masked filing key to query.');
                      return;
                    }
                    setIrsError('');
                    setIrsProcessing(true);
                    setIrsStatusStep(1);

                    // Step 1: verifying
                    setTimeout(() => {
                      setIrsStatusStep(2);
                      // Step 2: Found matching return
                      setTimeout(() => {
                        setIrsStatusStep(3);
                        // Step 3: Auth deposit
                        setTimeout(() => {
                          setIrsStatusStep(4);
                          setIrsProcessing(false);
                          
                          // Execute dynamic balance credit!
                          const allUsers = loadUsersData();
                          const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
                          if (userIdx !== -1) {
                            let matchAcc = allUsers[userIdx].accounts.find(a => a.id === 'acc-checking');
                            if (!matchAcc && allUsers[userIdx].accounts.length > 0) {
                              matchAcc = allUsers[userIdx].accounts.find(a => a.type === 'checking') || allUsers[userIdx].accounts[0];
                            }
                            if (matchAcc) {
                              const refundVal = parseFloat(irsExpectedAmount) || 3050;
                              // Do NOT adjust balance yet since it requires admin confirmation!
                              // matchAcc.balance += refundVal;
                              
                              const newTx: Transaction = {
                                id: `tx-irs-${Date.now()}`,
                                description: `US TREASURY DIRECT DEP: TAX RECV FILE PIN-SEC0${Math.floor(10 + Math.random() * 90)}`,
                                amount: refundVal,
                                date: formatTransactionDate(Date.now()),
                                timestamp: Date.now(),
                                category: 'other',
                                status: 'pending',
                                targetAccountId: matchAcc.id
                              };

                              allUsers[userIdx].transactions = [newTx, ...allUsers[userIdx].transactions];
                              saveUsersData(allUsers);
                              addAuditLog(currentUser.username, currentUser.id, 'DEPOSIT', `Requested tax refund direct deposit of ${formatCurrency(refundVal)}. Pending admin verification.`);
                              triggerStateRefresh();
                            }
                          }
                        }, 1200);
                      }, 1200);
                    }, 1200);
                  }}
                  disabled={irsProcessing}
                  className="w-full bg-[#5c4fff] hover:bg-[#4d3df2] font-sans text-xs font-bold py-3.5 px-4 rounded-xl text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {irsProcessing ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Querying Federal Reservist Records...
                    </span>
                  ) : 'Query Federal Ledger System'}
                </button>
              </div>
            </div>

            {/* Stepper tracker reflecting the checklist status */}
            {irsStatusStep > 0 && (
              <div className="bg-[#0d1224] border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4 font-sans">
                <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-mono">Treasury Node Transit Status</h4>
                <div className="space-y-4 relative">
                  
                  {/* Step 1: Filing received */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${irsStatusStep >= 1 ? 'bg-[#34d399] text-[#0d1224]' : 'bg-slate-850 text-slate-500'}`}>
                        {irsStatusStep >= 1 ? '✓' : '1'}
                      </div>
                      <div className={`w-0.5 h-6 ${irsStatusStep >= 2 ? 'bg-[#34d399]' : 'bg-slate-800'}`} />
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${irsStatusStep >= 1 ? 'text-white' : 'text-slate-500'}`}>Tax Return Received</p>
                      <p className="text-[10px] text-slate-500">Form 1040 electronic metadata synchronized.</p>
                    </div>
                  </div>

                  {/* Step 2: Under Formal Review */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${irsStatusStep >= 2 ? 'bg-[#34d399] text-[#0d1224]' : 'bg-slate-850 text-slate-500'}`}>
                        {irsStatusStep >= 2 ? '✓' : '2'}
                      </div>
                      <div className={`w-0.5 h-6 ${irsStatusStep >= 3 ? 'bg-[#34d399]' : 'bg-slate-800'}`} />
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${irsStatusStep >= 2 ? 'text-white' : 'text-slate-500'}`}>IRS Refund Approved</p>
                      <p className="text-[10px] text-slate-500">Filer SSN eligibility certified. Audit bypass operational.</p>
                    </div>
                  </div>

                  {/* Step 3: Approved */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${irsStatusStep >= 3 ? 'bg-[#34d399] text-[#0d1224]' : 'bg-slate-850 text-slate-500'}`}>
                        {irsStatusStep >= 3 ? '✓' : '3'}
                      </div>
                      <div className={`w-0.5 h-6 ${irsStatusStep >= 4 ? 'bg-[#34d399]' : 'bg-slate-800'}`} />
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${irsStatusStep >= 3 ? 'text-white' : 'text-slate-500'}`}>Direct Deposit Dispatched</p>
                      <p className="text-[10px] text-slate-500">ACH routing cleared via Unitycore RTN network.</p>
                    </div>
                  </div>

                  {/* Step 4: Dispatched payout */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${irsStatusStep >= 4 ? 'bg-blue-600 text-white' : 'bg-slate-850 text-slate-500'}`}>
                        {irsStatusStep >= 4 ? '✓' : '4'}
                      </div>
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${irsStatusStep >= 4 ? 'text-blue-400 font-extrabold' : 'text-slate-500'}`}>Settled In checking Account</p>
                      <p className="text-[10px] text-slate-550">Cleared and credit added successfully to Checking: +{formatCurrency(parseFloat(irsExpectedAmount) || 3050)}</p>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 11: LIVE SMART CLIENT SUPPORT */}
        {activeTab === 'support' && (
          <div className="space-y-6 animate-fade-in max-w-sm mx-auto text-left pb-8">
            <div>
              <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">Help Desk Live</span>
              <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">Secure AI Support Desk</h2>
              <p className="text-xs text-slate-400">Sandbox support with automated action shortcuts.</p>
            </div>

            {/* Chat Area container */}
            <div className="bg-[#0d1224] border border-slate-800 rounded-2xl shadow-lg flex flex-col h-96 overflow-hidden">
              <div className="bg-[#0b0e1a] border-b border-slate-850 border-slate-800 p-3.5 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-[#34d399] rounded-full animate-ping" />
                  <span className="font-extrabold font-mono text-white">Live Node Daemon</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">TLS Encrypted</span>
              </div>

              {/* Message scroll list */}
              <div className="p-4 flex-grow overflow-y-auto space-y-3 font-sans text-xs flex flex-col">
                {supportMessages.map((msg, index) => {
                  const isBot = msg.sender === 'bot';
                  return (
                    <div 
                      key={index}
                      className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                        isBot 
                          ? 'bg-slate-800 text-white self-start rounded-tl-none' 
                          : 'bg-blue-600 text-white self-end rounded-tr-none'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <span className="text-[8px] opacity-60 block mt-1 text-right font-mono">{msg.timestamp}</span>
                    </div>
                  );
                })}
              </div>

              {/* Support shortcuts */}
              <div className="px-3 py-2 border-t border-slate-850 border-slate-800 bg-[#080c18] flex gap-1.5 overflow-x-auto whitespace-nowrap">
                <button
                  onClick={() => {
                    const userMsg = "Increase my Credit Card limit to $30,000";
                    const botReply = "Authorized: We have pre-approved and dynamically set your Credit Limit to $30,000 in your database registry. Head over to Custom Cards to slide it further!";
                    
                    // Update database limits first!
                    const allUsers = loadUsersData();
                    const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
                    if (userIdx !== -1 && allUsers[userIdx].cards && allUsers[userIdx].cards.length > 0) {
                      allUsers[userIdx].cards[0].limit = 30000;
                      saveUsersData(allUsers);
                      triggerStateRefresh();
                    }

                    setSupportMessages([
                      ...supportMessages,
                      { sender: 'user', text: userMsg, timestamp: 'Just Now' },
                      { sender: 'bot', text: botReply, timestamp: 'Just Now' }
                    ]);
                  }}
                  className="bg-slate-850 bg-slate-800 text-slate-300 text-[10px] px-2.5 py-1 rounded-full hover:bg-slate-705 border border-slate-700 transition cursor-pointer"
                >
                  Limit Increase
                </button>

                <button
                  onClick={() => {
                    const userMsg = "Check Wire block or transaction holds";
                    const botReply = "Security Protocol: All sandbox transactions are set to Auto-Clear. All lock gates verified and opened. All systems operational.";
                    setSupportMessages([
                      ...supportMessages,
                      { sender: 'user', text: userMsg, timestamp: 'Just Now' },
                      { sender: 'bot', text: botReply, timestamp: 'Just Now' }
                    ]);
                  }}
                  className="bg-slate-850 bg-slate-800 text-slate-300 text-[10px] px-2.5 py-1 rounded-full hover:bg-slate-705 border border-slate-700 transition cursor-pointer"
                >
                  Clear Wire Lock
                </button>

                <button
                  onClick={() => {
                    const userMsg = "Dispute a double-charge billing";
                    const botReply = "Sandbox Dispute Resolution: Dispute submitted. $52.50 provisional credit request has been queued and is pending admin approval.";
                    
                    const allUsers = loadUsersData();
                    const userIdx = allUsers.findIndex(u => u.id === currentUser.id);
                    if (userIdx !== -1) {
                      let matchAcc = allUsers[userIdx].accounts.find(a => a.id === 'acc-checking');
                      if (!matchAcc && allUsers[userIdx].accounts.length > 0) {
                        matchAcc = allUsers[userIdx].accounts.find(a => a.type === 'checking') || allUsers[userIdx].accounts[0];
                      }
                      if (matchAcc) {
                        // Do NOT adjust balance yet since it requires admin confirmation!
                        // matchAcc.balance += 52.50;
                        const newTx: Transaction = {
                          id: `tx-disp-${Date.now()}`,
                          description: 'ATM DISPUTE CREDIT: PROVISIONAL REVERSAL',
                          amount: 52.50,
                          date: formatTransactionDate(Date.now()),
                          timestamp: Date.now(),
                          category: 'other',
                          status: 'pending',
                          targetAccountId: matchAcc.id
                        };
                        allUsers[userIdx].transactions = [newTx, ...allUsers[userIdx].transactions];
                        saveUsersData(allUsers);
                        triggerStateRefresh();
                      }
                    }

                    setSupportMessages([
                      ...supportMessages,
                      { sender: 'user', text: userMsg, timestamp: 'Just Now' },
                      { sender: 'bot', text: botReply, timestamp: 'Just Now' }
                    ]);
                  }}
                  className="bg-slate-850 bg-slate-800 text-slate-300 text-[10px] px-2.5 py-1 rounded-full hover:bg-slate-705 border border-slate-700 transition cursor-pointer"
                >
                  Dispute Charge
                </button>
              </div>

              {/* Input section */}
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!supportInput.trim()) return;
                const text = supportInput;
                setSupportInput('');
                const userMsg = { sender: 'user' as const, text, timestamp: 'Just Now' };
                
                // Fast smart answers bot logic
                let botText = "Thank you for contacting Unitycore Bank. Your query has been logged inside our sandbox hub. Direct chat response is active. How else can I assist you today?";
                if (text.toLowerCase().includes('balance') || text.toLowerCase().includes('money')) {
                  botText = `Your current primary checking available ledger is ${formatCurrency(currentUser.accounts[0]?.balance || 0)}. Let me know if you would like to initiate an instant deposit!`;
                } else if (text.toLowerCase().includes('hello') || text.toLowerCase().includes('hi ')) {
                  botText = `Hello ${currentUser.name}! Direct developer support tunnel active. Ask about credit limits, transactions, loans or wire bypasses!`;
                }

                setSupportMessages(prev => [...prev, userMsg]);
                setTimeout(() => {
                  setSupportMessages(prev => [...prev, { sender: 'bot', text: botText, timestamp: 'Just Now' }]);
                }, 800);
              }} className="p-3.5 border-t border-slate-850 border-slate-800 bg-[#0b0e1a] flex gap-2">
                <input
                  type="text"
                  placeholder="Type a support request..."
                  value={supportInput}
                  onChange={(e) => setSupportInput(e.target.value)}
                  className="flex-grow bg-[#080c18] border border-slate-800 rounded-xl px-3 text-xs outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono px-3.5 rounded-xl transition cursor-pointer"
                >
                  Send
                </button>
              </form>
            </div>

            {/* Direct WhatsApp Call banner exactly representing the green WhatsApp floating button style */}
            <div className="bg-[#1ebe5d]/10 border border-[#1ebe5d]/40 p-4 rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5 text-xs text-[#25d366]">
                <div className="bg-[#25d366] text-white p-2 rounded-full font-mono text-center flex items-center justify-center font-bold">
                  💬
                </div>
                <div>
                  <h4 className="font-extrabold text-[#25d366]">Unitycore WhatsApp Support</h4>
                  <p className="text-[10px] text-slate-400">Interact instantly 24/7 on WhatsApp</p>
                </div>
              </div>
              <button 
                onClick={() => alert('Simulating WhatsApp protocol redirect: Opening legal support Chatbot on +1 (800) 555-UNITY')}
                className="bg-[#25d366] hover:bg-[#1ebe5d] text-[#0d1224] text-[10px] font-bold font-sans px-3.5 py-1.5 rounded-full transition cursor-pointer"
              >
                Launch Chat
              </button>
            </div>
          </div>
        )}

        {/* TAB: INVESTMENT HUB (Redesigned Credence Portal style) */}
        {activeTab === 'investment' && (
          <div className="space-y-6 animate-fade-in max-w-md mx-auto text-left pb-12 font-sans">
            <div>
              <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">Passive asset compounding</span>
              <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5">Automated Investment Hub</h2>
              <p className="text-xs text-slate-400">Lock USD checked funds into certified mutual-index plans with direct daily interest accruals.</p>
            </div>

            {investSuccessMsg && (
              <div className="bg-emerald-950/40 border border-[#34d399]/40 text-[#34d399] p-4 rounded-xl text-xs flex items-center gap-2 font-bold font-sans">
                <CheckCircle className="w-5 h-5 text-[#34d399]" />
                <span>{investSuccessMsg}</span>
              </div>
            )}

            {/* Quick Summary card */}
            <div className="bg-gradient-to-r from-blue-900/10 to-indigo-950/40 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-mono">Investment Balance</span>
                <span className="text-2xl font-mono font-extrabold text-[#3fc1fb]">
                  {formatCurrency(currentUser.accounts.find(a => a.type === 'investment')?.balance || 0)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-mono">Yield State</span>
                <span className="text-xs font-bold font-mono text-emerald-400">● Compounding Daily</span>
              </div>
            </div>

            {/* Form to Create New Investment Package */}
            <div className="bg-[#0d1224] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Activate High-Yield Growth Pack</h3>
              <form onSubmit={handleCreateInvestment} className="space-y-4">
                
                {/* Plans Grid layout */}
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setInvestPlan('starter')}
                    className={`p-3 rounded-xl border cursor-pointer text-left transition ${investPlan === 'starter' ? 'bg-blue-950/40 border-blue-500' : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'}`}
                  >
                    <p className="text-xs font-extrabold text-white">Starter Pack</p>
                    <p className="text-[10px] text-blue-400 font-bold font-mono">2.0% Daily ROI</p>
                    <p className="text-[9px] text-slate-500 mt-1">Lock: 30 Days</p>
                  </div>

                  <div 
                    onClick={() => setInvestPlan('silver')}
                    className={`p-3 rounded-xl border cursor-pointer text-left transition ${investPlan === 'silver' ? 'bg-blue-950/40 border-blue-500' : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'}`}
                  >
                    <p className="text-xs font-extrabold text-white">Silver Accumulator</p>
                    <p className="text-[10px] text-emerald-400 font-bold font-mono">5.0% Daily ROI</p>
                    <p className="text-[9px] text-slate-500 mt-1">Lock: 30 Days</p>
                  </div>

                  <div 
                    onClick={() => setInvestPlan('gold')}
                    className={`p-3 rounded-xl border cursor-pointer text-left transition ${investPlan === 'gold' ? 'bg-blue-950/40 border-blue-500' : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'}`}
                  >
                    <p className="text-xs font-extrabold text-white">Gold Vanguard</p>
                    <p className="text-[10px] text-amber-400 font-bold font-mono">10.0% Daily ROI</p>
                    <p className="text-[9px] text-slate-500 mt-1">Lock: 30 Days</p>
                  </div>

                  <div 
                    onClick={() => setInvestPlan('sapphire')}
                    className={`p-3 rounded-xl border cursor-pointer text-left transition ${investPlan === 'sapphire' ? 'bg-blue-950/40 border-blue-500' : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'}`}
                  >
                    <p className="text-xs font-extrabold text-white">Sapphire Elite</p>
                    <p className="text-[10px] text-purple-400 font-bold font-mono">20.0% Daily ROI</p>
                    <p className="text-[9px] text-slate-500 mt-1">Lock: 30 Days</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">Amount to Invest ($ USD)</span>
                  <input 
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-slate-650 font-mono outline-none focus:border-blue-500"
                  />
                  <div className="text-[10px] text-slate-500 flex justify-between px-1 font-mono">
                    <span>Source: Checking Balance</span>
                    <span>Available: {formatCurrency(currentUser.accounts.find(a => a.type === 'checking')?.balance || 0)}</span>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 font-sans text-xs font-bold py-3 px-4 rounded-xl text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                >
                  Confirm and Fund Growth Plan 🚀
                </button>
              </form>
            </div>

            {/* Active investment packages items render cards */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Live Holdings Portfolio</h3>
              {investmentsList.map((inv) => (
                <div key={inv.id} className="bg-[#0d1224] border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase">{inv.planName}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Ident: {inv.id} • Principal: {formatCurrency(inv.amount)}</p>
                    </div>
                    <span className="text-[9px] bg-blue-950 text-blue-400 border border-blue-900/40 px-2.5 py-0.5 rounded-full font-bold">ACTIVE</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Maturity Timeline</span>
                      <span className="font-mono text-white font-bold">{inv.daysRemaining} days remaining</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: '53%' }} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-[#080ca5]/10 border border-slate-800 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400">Total Accumulated Earnings:</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">+{formatCurrency(inv.currentEarnings)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: CRYPTO SWAP TRADING DESK */}
        {activeTab === 'crypto' && (
          <div className="space-y-6 animate-fade-in max-w-md mx-auto text-left pb-12 font-sans">
            <div>
              <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">SECURE FINTECH SWAP ENGINE</span>
              <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5">Crypto Exchange desk</h2>
              <p className="text-xs text-slate-400">Swap assets dynamically with sub-second sandbox execution and real-time ledger syncs.</p>
            </div>

            {cryptoSwapSuccess && (
              <div className="bg-emerald-950/40 border border-[#34d399]/40 text-[#34d399] p-4 rounded-xl text-xs flex items-center gap-2 font-bold font-sans">
                <CheckCircle className="w-5 h-5 text-[#34d399]" />
                <span>{cryptoSwapSuccess}</span>
              </div>
            )}

            {/* Wallet Balances list grid */}
            <div className="grid grid-cols-3 gap-3 font-mono">
              <div className="bg-[#0d1224] border border-slate-800 rounded-xl p-3 text-left">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest block">BTC Balance</span>
                <p className="text-xs font-extrabold text-white mt-1">{cryptoWallets.BTC.toFixed(5)} BTC</p>
                <span className="text-[8px] text-slate-400 block mt-0.5">≈ ${(cryptoWallets.BTC * 68000).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD</span>
              </div>

              <div className="bg-[#0d1224] border border-slate-800 rounded-xl p-3 text-left">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest block">ETH Balance</span>
                <p className="text-xs font-extrabold text-white mt-1">{cryptoWallets.ETH.toFixed(5)} ETH</p>
                <span className="text-[8px] text-slate-400 block mt-0.5">≈ ${(cryptoWallets.ETH * 3804).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD</span>
              </div>

              <div className="bg-[#0d1224] border border-slate-800 rounded-xl p-3 text-left">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest block">USDT Escrow</span>
                <p className="text-xs font-extrabold text-white mt-1">${cryptoWallets.USDT.toFixed(2)}</p>
                <span className="text-[8px] text-emerald-400 block mt-0.5">1.00 USD peg</span>
              </div>
            </div>

            {/* Trading Core Board */}
            <div className="bg-[#0d1224] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Swap Assets</h3>
              <form onSubmit={handleCryptoSwap} className="space-y-4">
                
                {/* From currency selectors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">From Asset</span>
                    <select 
                      value={cryptoFrom}
                      onChange={(e) => setCryptoFrom(e.target.value as any)}
                      className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2 px-3 text-xs text-white outline-none"
                    >
                      <option value="USD">USD (Checking)</option>
                      <option value="BTC">BTC Wallet</option>
                      <option value="ETH">ETH Wallet</option>
                      <option value="USDT">USDT Wallet</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">To Asset</span>
                    <select 
                      value={cryptoTo}
                      onChange={(e) => setCryptoTo(e.target.value as any)}
                      className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2 px-3 text-xs text-white outline-none"
                    >
                      <option value="BTC">BTC Wallet</option>
                      <option value="ETH">ETH Wallet</option>
                      <option value="USDT">USDT Wallet</option>
                      <option value="USD">USD (Checking)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-widest">Amount to Swap</span>
                  <input 
                    type="number"
                    step="any"
                    required
                    value={cryptoAmount}
                    onChange={(e) => setCryptoAmount(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-slate-650 font-mono outline-none focus:border-blue-500"
                  />
                  <span className="text-[9px] text-slate-500 block text-right font-mono">
                    Available: {cryptoFrom === 'USD' ? formatCurrency(currentUser.accounts.find(a => a.type === 'checking')?.balance || 0) : `${cryptoWallets[cryptoFrom as keyof typeof cryptoWallets]} ${cryptoFrom}`}
                  </span>
                </div>

                {/* Conversion display feedback */}
                {cryptoAmount && !isNaN(parseFloat(cryptoAmount)) && (
                  <div className="bg-[#080c18] border border-slate-800 p-3 rounded-xl flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400">Yield conversion estimate:</span>
                    <span className="font-extrabold text-[#3fc1fb]">
                      {(
                        (parseFloat(cryptoAmount) * (cryptoFrom === 'BTC' ? 68000 : cryptoFrom === 'ETH' ? 3804 : cryptoFrom === 'USDT' ? 1 : 1)) /
                        (cryptoTo === 'BTC' ? 68000 : cryptoTo === 'ETH' ? 3804 : cryptoTo === 'USDT' ? 1 : 1)
                      ).toFixed(6)}{' '}
                      {cryptoTo}
                    </span>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 font-sans text-xs font-bold py-3 px-4 rounded-xl text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                >
                  Verify Swap Transaction 🔁
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB: CAPITAL WELFARE GRANTS */}
        {activeTab === 'grant' && (
          <div className="space-y-6 animate-fade-in max-w-md mx-auto text-left pb-12 font-sans">
            <div>
              <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">Treasury stimulus checking</span>
              <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5">Capital Grants & Welfare Cabinet</h2>
              <p className="text-xs text-slate-400">Match active welfare and direct corporate stabilization grants issued by central agencies.</p>
            </div>

            {grantErr && (
              <div className="bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-xl font-mono">
                {grantErr}
              </div>
            )}

            {grantStep === 0 && (
              <div className="bg-[#0d1224] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Scan Stabilization Portfolios</h3>
                <form onSubmit={handleApplyGrant} className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Target Stimulus Sector</span>
                    <select 
                      value={grantType} 
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setGrantType(val);
                        setGrantAmountStr(val === 'recovery' ? '25000' : val === 'sme' ? '50000' : val === 'welfare' ? '12000' : '100000');
                      }}
                      className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2 px-3 text-xs text-white font-sans outline-none"
                    >
                      <option value="recovery">COVID-19 Corporate Stabilization ($25,000)</option>
                      <option value="sme">Small Business Association SME Grant ($50,000)</option>
                      <option value="welfare">Federal Humanitarian Basic Income ($12,000)</option>
                      <option value="imf">Sovereign Debt Consolidation Welfare ($100,000)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold block">Assigned Grant Capital amount</span>
                    <p className="text-2xl font-mono font-extrabold text-[#34d399]">${parseFloat(grantAmountStr).toLocaleString()}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Welfare Justification Narrative</span>
                    <textarea 
                      required
                      rows={3}
                      placeholder="Explain your business, payroll stabilization requirements, or community impact factor to authorize immediate payout clearance."
                      value={grantReason}
                      onChange={(e) => setGrantReason(e.target.value)}
                      className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-slate-650 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 font-sans text-xs font-bold py-3.5 px-4 rounded-xl text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    Initiate Stimulus Qualification Call 🎁
                  </button>
                </form>
              </div>
            )}

            {grantStep === 1 && (
              <div className="bg-[#0d1224] border border-slate-800 rounded-2xl p-8 shadow-xl text-center space-y-4">
                <RefreshCw className="w-10 h-10 animate-spin text-blue-400 mx-auto" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Assessing treasury clearance protocols...</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">Querying local nodes & verifying Federal stabilizing indices... Thank you for your patience.</p>
              </div>
            )}

            {grantStep === 2 && (
              <div className="bg-[#0d1224] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 text-center">
                <span className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-wider block bg-amber-500/10 py-1 rounded-full px-3">Government Authority Required</span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans text-left">
                  Treasury records found a matching stabilized allocation of <span className="text-[#34d399] font-bold font-mono">${parseFloat(grantAmountStr).toLocaleString()}</span>. 
                  To authorize clearance, please input your **SME Allocation Access Code** (Passphrase Verification Code):
                </p>

                <div className="space-y-3 font-sans">
                  <input 
                    type="password"
                    placeholder="Enter grant security code (e.g. 1234)"
                    className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-2.5 px-3.5 text-center text-xs text-white font-mono outline-none focus:border-amber-500"
                    id="grant-auth-verification-code-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleVerifyGrantCode((e.target as HTMLInputElement).value);
                      }
                    }}
                  />
                  <button 
                    onClick={() => {
                      const inputElement = document.getElementById('grant-auth-verification-code-input') as HTMLInputElement;
                      if (inputElement) handleVerifyGrantCode(inputElement.value);
                    }}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-[#0d1224] font-extrabold text-xs py-3 rounded-xl transition cursor-pointer shadow-lg"
                  >
                    Authorize Capital Clearance Key
                  </button>
                </div>
              </div>
            )}

            {grantStep === 3 && (
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-6 shadow-xl text-center space-y-4 font-sans">
                <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-[#0d1224] font-bold text-2xl mx-auto">
                  ✓
                </div>
                <h3 className="text-base font-extrabold text-white uppercase font-sans tracking-wide">Direct Treasury Stabilizing Dispatched!</h3>
                <p className="text-xs text-slate-300 leading-relaxed text-left">
                  Direct Government Relief Grant of <span className="text-emerald-400 font-mono font-extrabold">${parseFloat(grantAmountStr).toLocaleString()}</span> has been processed and credited to your primary checking ledger.
                </p>
                <div className="p-3 bg-[#080c18] border border-slate-800 rounded-xl text-[10px] text-slate-450 flex justify-between">
                  <span>Authorized By</span>
                  <span className="font-mono text-white">Central Treasury Node #1234</span>
                </div>
                <button 
                  onClick={() => setGrantStep(0)}
                  className="w-full bg-[#34d399] hover:bg-emerald-500 text-[#0d1224] font-bold text-xs py-3.5 px-4 rounded-xl transition cursor-pointer"
                >
                  Apply For Another Stimulus Package
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* FIXED BOTTOM NAVIGATION BAR exactly emulating the design specs in Screens 2, 3, 4 */}
      <nav id="bottom-navigation-bar" className="md:hidden fixed bottom-0 inset-x-0 bg-[#070b19]/95 backdrop-blur-md border-t border-slate-800/80 h-16 flex justify-around items-center z-40 max-w-lg mx-auto rounded-t-2xl shadow-xl">
        
        {/* Navigation Option 1: Dashboard (Screenshot 4 style) */}
        <button
          onClick={() => {
            setActiveTab('dashboard');
            setTransferSuccessMsg('');
          }}
          className={`flex flex-col items-center justify-center w-14 h-full gap-1 transition cursor-pointer ${
            activeTab === 'dashboard' ? 'text-indigo-400 font-extrabold' : 'text-slate-400 hover:text-indigo-400'
          }`}
          id="nav-tab-dashboard"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'dashboard' ? 2.5 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[9px] font-sans font-bold">Dashboard</span>
        </button>

        {/* Navigation Option 2: Accounts (Screenshot 3 style) */}
        <button
          onClick={() => {
            setActiveTab('accounts');
            setTransferSuccessMsg('');
          }}
          className={`flex flex-col items-center justify-center w-14 h-full gap-1 transition cursor-pointer ${
            activeTab === 'accounts' ? 'text-indigo-400 font-extrabold' : 'text-slate-400 hover:text-indigo-400'
          }`}
          id="nav-tab-accounts"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'accounts' ? 2.5 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="text-[9px] font-sans font-bold">Accounts</span>
        </button>

        {/* Navigation Option 3: Transfers */}
        <button
          onClick={() => {
            setActiveTab('transfers');
            setTransferSuccessMsg('');
          }}
          className={`flex flex-col items-center justify-center w-14 h-full gap-1 transition cursor-pointer ${
            activeTab === 'transfers' ? 'text-indigo-400 font-extrabold' : 'text-slate-400 hover:text-indigo-400'
          }`}
          id="nav-tab-transfers"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'transfers' ? 2.5 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span className="text-[9px] font-sans font-bold">Transfers</span>
        </button>

        {/* Navigation Option 4: Cards */}
        <button
          onClick={() => {
            setActiveTab('cards');
            setTransferSuccessMsg('');
          }}
          className={`flex flex-col items-center justify-center w-14 h-full gap-1 transition cursor-pointer ${
            activeTab === 'cards' ? 'text-indigo-400 font-extrabold' : 'text-slate-400 hover:text-indigo-400'
          }`}
          id="nav-tab-cards"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'cards' ? 2.5 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span className="text-[9px] font-sans font-bold">Cards</span>
        </button>

        {/* Navigation Option 5: More */}
        <button
          onClick={() => {
            setShowBankingMenu(true);
            setTransferSuccessMsg('');
          }}
          className={`flex flex-col items-center justify-center w-14 h-full gap-1 transition cursor-pointer ${
            showBankingMenu ? 'text-indigo-400 font-extrabold' : 'text-slate-400 hover:text-indigo-400'
          }`}
          id="nav-tab-more"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={showBankingMenu ? 2.5 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-[9px] font-sans font-bold">More</span>
        </button>
      </nav>

      {/* MOBILE CHECK RAPID DEPOSIT MODAL PANEL */}
      {showDepositModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl w-full max-w-sm relative text-left shadow-2xl text-slate-800 max-h-[90vh] overflow-y-auto font-sans">
              
              <button 
                type="button"
                onClick={() => {
                  setDepositAmount('');
                  setDwReference('');
                  setShowDepositModal(false);
                }}
                className="absolute top-4 right-4 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 border-none flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer font-bold text-xs"
              >
                ✕
              </button>

              <h3 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" /> {isDeposit ? 'Register Deposit' : 'Request Withdrawal'}
              </h3>
              <p className="text-[10px] text-slate-500 mb-3 leading-normal">
                {isDeposit ? 'Submit dynamic deposit references for manual verification and credit approval.' : 'Request manual holding dispersal or external settlement securely.'}
              </p>

              {/* Segmented Control Toggle - Deposit vs Withdrawal */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl mb-3 border border-slate-150">
                <button
                  type="button"
                  onClick={() => setDepositOrWithdraw('deposit')}
                  className={`flex-1 text-center py-1.5 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer border-none ${isDeposit ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                >
                  Deposit
                </button>
                <button
                  type="button"
                  onClick={() => setDepositOrWithdraw('withdraw')}
                  className={`flex-1 text-center py-1.5 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer border-none ${!isDeposit ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                >
                  Withdrawal
                </button>
              </div>

              {/* Payment Method Selector Grid */}
              <span className="text-[9px] text-indigo-650 font-black uppercase tracking-wider block mb-1">Select Transfer Network:</span>
              <div className="grid grid-cols-3 gap-1 mb-4 select-none">
                {([
                  { id: 'bank', name: '🏦 Bank Wire' },
                  { id: 'check', name: '📝 Check Pay' },
                  { id: 'crypto', name: '🪙 USD-Crypto' }
                ] as const).map((method) => {
                  const cfgObj = dwConfigs.find(c => c.id === method.id);
                  const isChEnabled = cfgObj ? (isDeposit ? cfgObj.depositEnabled : cfgObj.withdrawEnabled) : true;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethodId(method.id)}
                      className={`py-1.5 px-0.5 text-[9px] font-black rounded-lg transition text-center cursor-pointer flex flex-col items-center justify-center gap-0.5 relative border-none ${
                        selectedMethodId === method.id
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                          : 'bg-slate-50 text-slate-650 hover:bg-slate-100 hover:text-slate-850'
                      }`}
                    >
                      <span>{method.name}</span>
                      <span className={`w-1.5 h-1.5 rounded-full absolute top-[3px] right-[4px] ${isChEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`} title={isChEnabled ? "Channel enabled" : "Channel paused"} />
                    </button>
                  );
                })}
              </div>

              {/* Guidelines / Instructions defined by Admin */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-3 space-y-2 text-left leading-normal">
                <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                  <span className="text-[9px] font-black uppercase text-slate-500 block font-mono">Administrative Guidelines</span>
                  <span className={`text-[8px] font-bold font-mono px-1 py-0.5 rounded border uppercase shrink-0 ${
                    isEnabled 
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                      : 'text-rose-700 bg-rose-50 border-rose-100'
                  }`}>
                    {isEnabled ? 'ACTIVE GUIDELINES' : 'OFF-LINE'}
                  </span>
                </div>
                
                <p className="text-[10px] text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">
                  {activeCfg ? (isDeposit ? activeCfg.depositInstructions : activeCfg.withdrawInstructions) : 'No guidelines specified.'}
                </p>

                {/* If Deposit and enabled, show fields to copy */}
                {isDeposit && isEnabled && activeCfg && Object.keys(activeCfg.depositFields).length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5 text-left">
                    <span className="text-[8px] font-black text-rose-600 uppercase tracking-wide block">Direct Settlement Data (Tap to Copy):</span>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {Object.entries(activeCfg.depositFields).map(([fKey, fVal]) => {
                        const parsedVal = (fVal as string).replace('{username}', currentUser.username);
                        return (
                          <div 
                            key={fKey} 
                            onClick={() => handleCopy(parsedVal, fKey)}
                            className="bg-white hover:bg-slate-100 p-1.5 rounded border border-slate-200 cursor-pointer text-[9px] flex justify-between items-center transition"
                          >
                            <div className="truncate pr-1 text-left">
                              <span className="font-extrabold text-slate-500 uppercase text-[8px] block">{fKey}</span>
                              <span className="font-mono text-slate-805 select-all font-bold text-slate-800">{parsedVal}</span>
                            </div>
                            <span className="text-[8px] shrink-0 font-mono text-indigo-600 font-bold bg-indigo-50 px-1 py-0.5 rounded">
                              {copiedField === fKey ? 'Copied ✅' : 'Copy'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {!isEnabled ? (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 p-y-2.5 text-center text-rose-700 font-bold text-[10px] leading-normal mb-3">
                  ⚠️ This payment channel is suspended by administrators. Direct transaction requests are temporarily disabled. Please contact physical system desk services.
                </div>
              ) : (
                <form onSubmit={handleCheckDeposit} className="space-y-3">
                  <div className="space-y-1 text-left">
                    <span className="text-[9px] text-indigo-650 uppercase font-black tracking-wide block">
                      {isDeposit ? 'Destination Savings Ledger' : 'Source Dispersal Ledger'}
                    </span>
                    <select 
                      value={depositTarget} 
                      onChange={(e) => setDepositTarget(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-850"
                    >
                      {currentUser.accounts.map(a => (
                        <option key={a.id} value={a.id} className="text-slate-850">{a.name} ({formatCurrency(a.balance)})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 text-left">
                    <span className="text-[9px] text-indigo-650 uppercase font-black tracking-wide block">
                      Amount to Transfer ($ USD)
                    </span>
                    <input 
                      type="number"
                      min={1}
                      step="any"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="e.g. 1000.00"
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-850 font-mono outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <span className="text-[9px] text-indigo-650 uppercase font-black tracking-wide block">
                      {selectedMethodId === 'bank' 
                        ? (isDeposit ? 'Your Depositing Name / Reference Info' : 'Recipient Account Routing & Number') 
                        : selectedMethodId === 'check'
                          ? 'Check Serial Number'
                          : (isDeposit ? 'Your Sender Wallet Address / TXID' : 'Your Recipient USDT/Crypto Wallet Address')}
                    </span>
                    <input 
                      type="text"
                      value={dwReference}
                      onChange={(e) => setDwReference(e.target.value)}
                      placeholder={
                        selectedMethodId === 'bank' 
                          ? (isDeposit ? 'e.g. John Cooper - Chase Wire' : 'Routing, Account info...')
                          : selectedMethodId === 'check'
                            ? 'e.g. Serial #29485721'
                            : (isDeposit ? 'e.g. TXID: f589a2b6e...' : 'Your USDT Wallets (TRC20)...')
                      }
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-850 font-mono outline-none focus:border-indigo-500 font-extrabold"
                    />
                  </div>

                  <div className="flex gap-2 pt-1 font-sans">
                    <button
                      type="button"
                      onClick={() => {
                        setDepositAmount('');
                        setDwReference('');
                        setShowDepositModal(false);
                      }}
                      className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs py-2 rounded-lg transition font-bold cursor-pointer shadow-2xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2 rounded-lg transition font-extrabold cursor-pointer border-none"
                    >
                      {depositOrWithdraw === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      {/* EXQUISITE BANKING MENU OVERLAY (SCREENSHOT 1 GRAPHIC STYLE FOR MOBILE / DESKTOP PREVIEWS) */}
      {showBankingMenu && (
        <div className="fixed inset-0 bg-[#070b19]/90 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in text-slate-900">
          <div className="bg-white w-full max-w-sm h-[94vh] sm:h-auto sm:max-h-[85vh] overflow-y-auto rounded-t-[32px] sm:rounded-3xl p-6 relative flex flex-col justify-between shadow-2xl transition-all">
            
            {/* Top close anchor */}
            <button 
              onClick={() => setShowBankingMenu(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer font-bold text-sm"
              title="Close Menu"
            >
              ✕
            </button>

            {/* Profile summary header section exactly mirroring graphics */}
            <div className="flex flex-col items-center text-center mt-2.5 mb-5 select-none">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-250 mb-2 relative">
                <img 
                  src={currentUser.avatarUrl} 
                  alt={currentUser.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="text-base font-extrabold text-[#090e1f] leading-normal">{currentUser.name}</h3>
              <p className="text-[11px] text-slate-400 font-mono font-medium">Account: 09407585347</p>
              
              <div className="mt-2.5 flex items-center gap-1 bg-emerald-500/10 text-emerald-650 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                <span className="text-[10px] text-emerald-600">✓ Verified Profile</span>
              </div>
            </div>

            {/* 3x4 GRID SELECTOR exactly matching the colored layout in Screenshot */}
            <div className="grid grid-cols-3 gap-3 flex-grow py-2">
              
              {/* Tile 1: Home */}
              <div 
                onClick={() => { setActiveTab('dashboard'); setShowBankingMenu(false); }}
                className="bg-[#3fc1fb] p-3 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 active:scale-95 transition"
              >
                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-sky-500 mb-2 shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <span className="text-[11px] font-extrabold text-[#090e1f] font-sans">Home</span>
              </div>

              {/* Tile 2: Activity */}
              <div 
                onClick={() => { setActiveTab('activity'); setShowBankingMenu(false); }}
                className="bg-[#5ce1e6] p-3 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 active:scale-95 transition"
              >
                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-teal-600 mb-2 shadow-xs">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-[11px] font-extrabold text-[#090e1f] font-sans">Activity</span>
              </div>

              {/* Tile 3: Cards */}
              <div 
                onClick={() => { setActiveTab('cards'); setShowBankingMenu(false); }}
                className="bg-[#3fc1fb] p-3 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 active:scale-95 transition"
              >
                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-sky-500 mb-2 shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <span className="text-[11px] font-extrabold text-[#090e1f] font-sans">Cards</span>
              </div>

              {/* Tile 4: Transfer */}
              <div 
                onClick={() => { setActiveTab('transfers'); setShowBankingMenu(false); }}
                className="bg-[#5ce1e6] p-3 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 active:scale-95 transition"
              >
                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-teal-600 mb-2 shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <span className="text-[11px] font-extrabold text-[#090e1f] font-sans">Transfer</span>
              </div>

              {/* Tile 5: Int'l Wire */}
              <div 
                onClick={() => { setActiveTab('intl-wire'); setShowBankingMenu(false); }}
                className="bg-[#5ce1e6] p-3 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 active:scale-95 transition"
              >
                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-cyan-600 mb-2 shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <span className="text-[11px] font-extrabold text-[#090e1f] font-sans">Int'l Wire</span>
              </div>

              {/* Tile 6: Deposit Check */}
              <div 
                onClick={() => { setActiveTab('deposit'); setShowBankingMenu(false); }}
                className="bg-[#3fc1fb] p-3 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 active:scale-95 transition"
              >
                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-sky-500 mb-2 shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <span className="text-[11px] font-extrabold text-[#090e1f] font-sans">Deposit</span>
              </div>

              {/* Tile 7: Loan Desk */}
              <div 
                onClick={() => { setActiveTab('loan'); setShowBankingMenu(false); }}
                className="bg-[#5ce1e6] p-3 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 active:scale-95 transition"
              >
                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-teal-600 mb-2 shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-[11px] font-extrabold text-[#090e1f] font-sans">Loan Desk</span>
              </div>

              {/* Tile 8: IRS Refund */}
              <div 
                onClick={() => { setActiveTab('irs-refund'); setShowBankingMenu(false); }}
                className="bg-[#49bdfb] p-3 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 active:scale-95 transition"
              >
                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-sky-600 mb-2 shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-[11px] font-extrabold text-[#090e1f] font-sans">IRS Refund</span>
              </div>

              {/* Tile 8.5: Savings Vaults */}
              <div 
                onClick={() => { setActiveTab('vaults'); setShowBankingMenu(false); }}
                className="bg-[#eab308] p-3 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 active:scale-95 transition"
              >
                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-yellow-600 mb-2 shadow-xs">
                  <span className="text-lg">🐷</span>
                </div>
                <span className="text-[11px] font-extrabold text-[#090e1f] font-sans">Savings Vaults</span>
              </div>

              {/* Tile 9: Settings */}
              <div 
                onClick={() => { setActiveTab('more'); setShowBankingMenu(false); }}
                className="bg-[#3fc1fb] p-3 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 active:scale-95 transition"
              >
                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-sky-500 mb-2 shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-[11px] font-extrabold text-[#090e1f] font-sans">Settings</span>
              </div>

              {/* Tile 10: Support */}
              <div 
                onClick={() => { setActiveTab('support'); setShowBankingMenu(false); }}
                className="bg-[#5ce1e6] p-3 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 active:scale-95 transition"
              >
                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-teal-600 mb-2 shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <span className="text-[11px] font-extrabold text-[#090e1f] font-sans">Support</span>
              </div>

              {/* Tile 11: Logout */}
              <div 
                onClick={() => { setShowBankingMenu(false); onLogout(); }}
                className="bg-[#fff2f6] p-3 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-rose-100 active:scale-95 transition"
              >
                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-rose-500 mb-2 shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <span className="text-[11px] font-extrabold text-[#b91c1c] font-sans text-rose-600">Logout</span>
              </div>

            </div>

            {/* Bottom floating logo watermark or safety check for high realism with float WhatsApp logo */}
            <div className="mt-4 flex justify-between items-center bg-[#070b19]/5 border border-slate-100 p-3 rounded-2xl relative select-none">
              
              {/* Green WhatsApp Action Badge inside Overlay bottom rail */}
              <div 
                onClick={() => alert('Opening Direct WhatsApp Secure Tunnel to Customer Relations')}
                className="w-8 h-8 rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white flex items-center justify-center cursor-pointer shadow-md text-xs font-bold font-mono transition"
                title="WhatsApp Relations Desk"
              >
                💬
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm">🛡️</span>
                <div className="text-left">
                  <h4 className="text-[10px] font-extrabold text-[#090e1f]">Secure Node Crypt</h4>
                  <p className="text-[8px] text-slate-400 font-mono">ID: SECURE-KEY-VAULT</p>
                </div>
              </div>
              <span className="bg-[#5ce1e6]/20 text-teal-800 text-[8px] font-bold font-mono px-2 py-0.5 rounded-full uppercase">
                UNITY CORE
              </span>
            </div>

          </div>
        </div>
      )}

      {/* 📸 INTERACTIVE AVATAR SELECTOR / PROFILE PICTURE MANAGER MODAL */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs font-sans text-slate-800">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-2xl relative text-left animate-scale-up space-y-5">
            {/* Modal header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">Update Profile Picture</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Choose a beautiful preset, upload a local file, or paste an image link</p>
              </div>
              <button 
                onClick={() => {
                  setShowAvatarModal(false);
                  setAvatarError('');
                }}
                className="text-slate-400 hover:text-slate-700 transition w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {avatarError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 text-[11px] px-3.5 py-2 rounded-xl text-center font-semibold">
                ⚠️ {avatarError}
              </div>
            )}

            {/* Choose interactive option */}
            <div className="space-y-4">
              {/* Option A: Presets list */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider font-mono">Option A: Premium Face Presets</span>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150", 
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150", 
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150", 
                    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150", 
                    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150", 
                    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150", 
                  ].map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleUpdateAvatar(url)}
                      className="w-12 h-12 rounded-full overflow-hidden border-2 border-transparent hover:border-indigo-600 active:scale-95 transition shrink-0 cursor-pointer"
                    >
                      <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Option B: Client Base64 Drag & Drop Upload */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider font-mono">Option B: Drag & Drop File Selector</span>
                <div 
                  className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center bg-slate-50/50 group"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-50/10'); }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50/10'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50/10');
                    const files = e.dataTransfer.files;
                    if (files && files[0]) {
                      const file = files[0];
                      if (!file.type.startsWith('image/')) {
                        setAvatarError('Only image file uploads (JPEG, PNG, WEBP) are supported.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          handleUpdateAvatar(event.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  onClick={() => document.getElementById('avatar-file-input')?.click()}
                >
                  <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">📤</span>
                  <p className="text-xs font-semibold text-slate-700">Drag an image file here or <span className="text-indigo-600 underline">browse</span></p>
                  <p className="text-[9px] text-slate-400 mt-1 mt-0.5">Supports JPEG, PNG, WEBP up to 4MB</p>
                  <input 
                    type="file" 
                    id="avatar-file-input" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            handleUpdateAvatar(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Option C: Image URL input */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider font-mono">Option C: Remote Image Link</span>
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    placeholder="https://example.com/my-photo.jpg" 
                    id="avatar-link-field"
                    className="flex-1 bg-slate-50 border border-slate-200 outline-none rounded-xl py-2 px-3 text-xs text-slate-800 focus:border-indigo-500 font-medium font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('avatar-link-field') as HTMLInputElement;
                      if (input && input.value.trim() && input.value.includes('http')) {
                        handleUpdateAvatar(input.value.trim());
                      } else {
                        setAvatarError('Please enter a valid HTTP/HTTPS image URL.');
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔐 DYNAMIC SECURITY VERIFICATION MODAL CODENAME: CREDENCE CORE PIN OR CODES PROMPT */}
      {showSecurityModal && (
        <div id="security-verification-portal-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs font-sans">
          <div className="bg-[#0d1224] border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative text-left animate-scale-up">
            
            {/* Close trigger button */}
            <button 
              onClick={() => setShowSecurityModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center cursor-pointer text-xs"
            >
              ✕
            </button>

            <div className="text-center space-y-4">
              {biometricEnabled && !useBackupPin ? (
                /* Biometric Simulation Scanning View */
                <div className="space-y-5 py-2 text-center animate-fade-in">
                  <div 
                    onClick={handleBiometricScan}
                    className="relative w-24 h-24 mx-auto flex items-center justify-center bg-[#080c18] border border-slate-800 rounded-full cursor-pointer overflow-hidden group hover:border-[#4f46e5]/50 transition duration-300"
                  >
                    {/* Pulsing visual radial glow */}
                    <span className="absolute inset-0 bg-indigo-500/5 rounded-full scale-75 group-hover:scale-100 transition duration-500" />
                    
                    {/* Scanning radar line animator */}
                    {biometricScanning && (
                      <div 
                        className="absolute inset-x-0 h-0.5 shadow-[0_0_8px_rgba(79,70,229,0.8)]" 
                        style={{
                          animation: 'scan 1.5s linear infinite',
                          background: '#4f46e5',
                          position: 'absolute',
                          top: '0%'
                        }}
                      />
                    )}
                    
                    {biometricScanSuccess ? (
                      <CheckCircle className="w-10 h-10 text-emerald-400 animate-scale-up" />
                    ) : (
                      biometricType === 'face-id' ? (
                        <ScanFace className={`w-10 h-10 transition duration-300 ${biometricScanning ? 'text-indigo-400 scale-110 animate-pulse' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                      ) : (
                        <Fingerprint className={`w-10 h-10 transition duration-300 ${biometricScanning ? 'text-indigo-400 scale-110 animate-pulse' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                      )
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      {biometricScanning 
                        ? 'Authenticating...' 
                        : biometricScanSuccess 
                          ? 'Identity Match Verified ✓' 
                          : `${biometricType === 'face-id' ? 'Simulate FaceID' : 'Simulate TouchID'}`}
                    </h3>
                    <p className="text-xs text-slate-400 leading-normal max-w-xs mx-auto">
                      {biometricScanning 
                        ? `Awaiting simulated ${biometricType === 'face-id' ? 'facial frame check' : 'cryptographic sensor response'}...` 
                        : biometricScanSuccess 
                          ? 'Decrypted hardware key. Dispatching auth token.' 
                          : `Confirm with ${biometricType === 'face-id' ? 'Simulated FaceID Camera' : 'Simulated TouchID Sensor'} for ${securityModalTitle || 'authorization'}.`}
                    </p>
                  </div>

                  {securityErrorMsg && (
                    <div className="bg-rose-950/40 border border-rose-500/30 text-rose-400 text-[11px] p-2.5 rounded-xl font-mono text-center">
                      {securityErrorMsg}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      disabled={biometricScanning || biometricScanSuccess}
                      onClick={handleBiometricScan}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider font-mono text-center"
                    >
                      {biometricScanning ? 'Verifying...' : biometricScanSuccess ? 'Verified ✓' : 'Verify Biometrics'}
                    </button>
                    
                    <button
                      type="button"
                      disabled={biometricScanning || biometricScanSuccess}
                      onClick={() => setUseBackupPin(true)}
                      className="text-[11px] text-slate-500 hover:text-slate-300 transition underline font-semibold cursor-pointer py-1 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Use backup {securityModalType === 'PIN' ? 'PIN' : 'security code'} instead
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard PIN Verification form view */
                <>
                  {/* Icon Based on verification type */}
                  <div className="w-12 h-12 bg-blue-950/40 border border-blue-900/40 rounded-full flex items-center justify-center mx-auto text-blue-400">
                    <span>🔐</span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      {securityModalTitle || 'Security Verification Required'}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      {securityModalDesc || 'Please input your 4-digit security PIN or validation code to authorize this transaction.'}
                    </p>
                  </div>

                  {securityErrorMsg && (
                    <div className="bg-rose-950/40 border border-rose-500/30 text-rose-400 text-[11px] p-2.5 rounded-xl font-mono text-center">
                      {securityErrorMsg}
                    </div>
                  )}

                  {/* Verified Code Forms */}
                  <form onSubmit={handleVerifySecurityCode} className="space-y-4 text-left">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase block">Verification Code (1234)</span>
                      <input 
                        type="password"
                        maxLength={10}
                        placeholder="Enter security code or PIN"
                        required
                        value={securityCodeInput}
                        onChange={(e) => setSecurityCodeInput(e.target.value)}
                        className="w-full bg-[#080c18] border border-slate-800 rounded-xl py-3 text-center text-sm font-mono tracking-widest text-white outline-none focus:border-indigo-500"
                        autoFocus
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button 
                        type="button"
                        onClick={() => setShowSecurityModal(false)}
                        className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 font-bold text-xs py-3 rounded-xl transition cursor-pointer text-center"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer shadow-lg text-center"
                      >
                        Authorize Action
                      </button>
                    </div>
                  </form>

                  {biometricEnabled && (
                    <button
                      type="button"
                      onClick={() => setUseBackupPin(false)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 transition underline font-semibold cursor-pointer pt-3 block mx-auto"
                    >
                      Authenticate with Biometrics Instead
                    </button>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Floating Animated Lockscreen Push Toast Alerts Overlay */}
      <div className="fixed top-4 right-4 z-[9999] max-w-sm w-full space-y-3 pointer-events-none">
        {activeInAppToasts.map((toast) => (
          <div 
            key={toast.id}
            className="bg-[#090e24]/95 backdrop-blur-md border border-indigo-950/80 hover:border-indigo-800 text-white rounded-2xl p-4 shadow-2xl flex gap-3 pointer-events-auto transform translate-y-0 transition-all duration-300 animate-slide-in-right cursor-pointer hover:bg-[#0c1330] text-left"
            onClick={() => {
              if (toast.type === 'email') {
                setSelectedEmailForViewer(toast);
              } else {
                setShowNotifications(true);
              }
            }}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg">
              {toast.category === 'otp' ? '🔒' : toast.category === 'transaction' ? '💸' : toast.category === 'security' ? '🌐' : '📢'}
            </div>
            <div className="flex-grow">
              <div className="flex justify-between items-center gap-2">
                <span className="text-[9px] text-indigo-400 font-mono font-bold uppercase tracking-widest">{toast.type.toUpperCase()} NOTIFICATION</span>
                <span className="text-[8px] text-slate-500 font-mono shrink-0">Just Now</span>
              </div>
              <p className="text-xs font-extrabold text-slate-100 mt-0.5 leading-snug">{toast.title}</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal line-clamp-2">{toast.body}</p>
              {toast.type === 'email' && (
                <span className="text-[9px] text-blue-400 hover:underline inline-flex items-center gap-1 mt-1.5 font-mono font-bold">
                  🔓 DECRYPT FULL CLIENT E-MAIL →
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Cryptographic WebMail Sandbox Viewer Overlay Modal */}
      {selectedEmailForViewer && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-[#090e24] border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] text-left animate-fade-in">
            {/* Decryptor top bar */}
            <div className="bg-[#030712] border-b border-indigo-950/40 px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <p className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest leading-none">Security Decryptor Vault</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1 leading-none">Sandbox simulated TLS secure channel: compliance-notif-inbox</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEmailForViewer(null)}
                className="w-8 h-8 rounded-full border border-slate-800 bg-slate-900 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Cryptographic Mail Metadata Headers */}
            <div className="bg-[#05091a] px-6 py-4 border-b border-indigo-950/20 space-y-1 z-10 shrink-0">
              <p className="text-xs text-slate-300 font-medium">
                <strong className="text-indigo-400">Sender:</strong> Unitycore Secure System &lt;no-reply@unitycore.io&gt;
              </p>
              <p className="text-xs text-slate-300 font-medium">
                <strong className="text-indigo-400">Recipient:</strong> {selectedEmailForViewer.recipient}
              </p>
              <p className="text-xs text-slate-300 font-medium">
                <strong className="text-indigo-400">Subject:</strong> {selectedEmailForViewer.title}
              </p>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider pt-0.5">
                🔒 cryptographic token verifiable: SHA256-tx-{selectedEmailForViewer.id.substring(0, 15)}...
              </p>
            </div>

            {/* Decoded sandbox visual body */}
            <div className="flex-grow bg-[#020617] p-1.5 overflow-hidden">
              <iframe 
                srcDoc={selectedEmailForViewer.htmlBody} 
                title="Decrypted Mail Payload Sandbox" 
                className="w-full h-full border-0 rounded-2xl bg-[#020617]"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Modal actions footer */}
            <div className="bg-[#030712] border-t border-slate-900/60 px-6 py-4 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Status: OK_SECURE_FRAME_LOADED</span>
              <button 
                onClick={() => setSelectedEmailForViewer(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition shadow-lg"
              >
                Dismiss Reader
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
