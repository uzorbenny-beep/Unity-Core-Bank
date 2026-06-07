/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  Layers, 
  BarChart, 
  HeartPulse, 
  ShieldAlert, 
  Search, 
  Plus, 
  TrendingUp, 
  DollarSign, 
  RefreshCw, 
  ArrowLeft, 
  CheckCircle, 
  Slash,
  Eye,
  Settings as SettingsIcon,
  HardDrive,
  Trash2
} from 'lucide-react';
import { BankUser, AuditLog, Transaction } from '../../types';
import { saveUsersData, loadUsersData, loadAuditLogs, addAuditLog, loadDepositWithdrawConfigs, saveDepositWithdrawConfigs, DepositWithdrawMethodConfig } from '../../mockData';
import { notificationService } from '../../notificationService';

interface AdminDashboardViewProps {
  currentAdmin: BankUser;
  onLogout: () => void;
  onRoleSwitch: (role: 'user') => void;
  onRefreshData: () => void;
  onRegisterUser?: (email: string, password: string, username: string, fullName: string) => Promise<void>;
}

export default function AdminDashboardView({ currentAdmin, onLogout, onRoleSwitch, onRefreshData, onRegisterUser }: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'analytics' | 'reports' | 'deposits_control'>('users');
  
  // Deposit & Withdrawal configs state
  const [depositWithdrawConfigs, setDepositWithdrawConfigs] = useState<DepositWithdrawMethodConfig[]>(() => loadDepositWithdrawConfigs());
  const [editingConfigId, setEditingConfigId] = useState<'bank' | 'check' | 'crypto'>('bank');

  // State from LocalStorage
  const [users, setUsers] = useState<BankUser[]>(() => loadUsersData());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadAuditLogs());
  
  // Custom user editing state
  const [selectedEditUser, setSelectedEditUser] = useState<BankUser | null>(null);
  const [checkingInputBalance, setCheckingInputBalance] = useState('');
  const [savingsInputBalance, setSavingsInputBalance] = useState('');
  const [editSuccessMsg, setEditSuccessMsg] = useState('');

  // User registration state (Admin side)
  const [showRegModal, setShowRegModal] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regError, setRegError] = useState('');
  const [regIsSubmitting, setRegIsSubmitting] = useState(false);

  // Custom confirmation modal state (bypasses iframe blocker)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Search parameters
  const [userQuery, setUserQuery] = useState('');
  const [txQuery, setTxQuery] = useState('');

  // Refresh details from database
  const refreshLocalState = () => {
    setUsers(loadUsersData());
    setAuditLogs(loadAuditLogs());
    onRefreshData();
  };

  // Modify Balance Executions
  const handleModifyBalances = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditUser) return;

    const checkingVal = parseFloat(checkingInputBalance);
    const savingsVal = parseFloat(savingsInputBalance);

    if (isNaN(checkingVal) || isNaN(savingsVal)) {
      alert('Please enter valid numerical values for balances.');
      return;
    }

    const allUsers = loadUsersData();
    const targetIdx = allUsers.findIndex(u => u.id === selectedEditUser.id);
    if (targetIdx !== -1) {
      const checkingAcc = allUsers[targetIdx].accounts.find(a => a.type === 'checking');
      const savingsAcc = allUsers[targetIdx].accounts.find(a => a.type === 'savings');

      if (checkingAcc) checkingAcc.balance = checkingVal;
      if (savingsAcc) savingsAcc.balance = savingsVal;

      saveUsersData(allUsers);
      addAuditLog(
        currentAdmin.username, 
        currentAdmin.id, 
        'USER_BALANCE_ADMIN_MOD', 
        `Overrode checking for user ${selectedEditUser.username} to $${checkingVal} and savings to $${savingsVal}`
      );

      setEditSuccessMsg(`Successfully overrode balances for user "${selectedEditUser.name}"!`);
      setSelectedEditUser(null);
      refreshLocalState();

      setTimeout(() => setEditSuccessMsg(''), 4000);
    }
  };

  const handleDeleteUser = (userId: string) => {
    const allUsers = loadUsersData();
    const userToDelete = allUsers.find(u => u.id === userId);
    if (!userToDelete) return;

    setConfirmModal({
      isOpen: true,
      title: 'Delete User Profile?',
      description: `Are you absolutely sure you want to permanently delete the profile for "${userToDelete.name}" (@${userToDelete.username})? All associated transaction ledgers, cards, and localized configurations will be purged.`,
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        const updatedUsers = allUsers.filter(u => u.id !== userId);
        saveUsersData(updatedUsers);

        addAuditLog(
          currentAdmin.username,
          currentAdmin.id,
          'USER_ACCOUNT_DELETED',
          `Permanently deleted account folder of user ${userToDelete.username} (${userToDelete.email})`
        );

        try {
          const { getActiveMode } = await import('../../dbService');
          const { db } = await import('../../firebase');
          const { doc, deleteDoc } = await import('firebase/firestore');

          if (getActiveMode() === 'firebase' && db) {
            console.log('[Firebase Admin Action] Deleting user doc from Firestore:', userId);
            const userRef = doc(db, 'users', userId);
            await deleteDoc(userRef);
          }
        } catch (err) {
          console.warn('[Firebase Cleanup Warning] Failed to delete Firestore profile doc or offline:', err);
        }

        refreshLocalState();
        setEditSuccessMsg(`User profile for "${userToDelete.name}" was successfully deleted.`);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setTimeout(() => setEditSuccessMsg(''), 4000);
      }
    });
  };

  const handleDeleteAllUsers = () => {
    setConfirmModal({
      isOpen: true,
      title: '🚨 CRITICAL SYSTEM PURGE',
      description: 'You are about to permanently purge ALL non-admin users from the system directories! This deletes all transaction history, custom logs, and ledger profiles. It is irreversibly final.',
      confirmText: 'Wipe System Registers',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        const allUsers = loadUsersData();
        const nonAdmins = allUsers.filter(u => u.role !== 'admin');

        try {
          localStorage.removeItem('unitycore_users');
        } catch (localErr) {
          console.warn('Wiping storage warning:', localErr);
        }

        try {
          const { getActiveMode } = await import('../../dbService');
          const { db } = await import('../../firebase');
          const { doc, deleteDoc } = await import('firebase/firestore');

          if (getActiveMode() === 'firebase' && db) {
            console.log('[Firebase Maintenance] Dispatched Firestore user cleanups...');
            for (const user of nonAdmins) {
              if (user.id !== 'user-james' && user.id !== 'user-credence') {
                await deleteDoc(doc(db, 'users', user.id));
              }
            }
          }
        } catch (err) {
          console.error('[Firebase Maintenance Error] Error during bulk deletions:', err);
        }

        addAuditLog(
          currentAdmin.username,
          currentAdmin.id,
          'BULK_USERS_PURGE',
          `Wiped all custom-registered client ledgers from the core database directory.`
        );

        refreshLocalState();
        setEditSuccessMsg('Successfully purged all custom user directory folders. Default templates restored.');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setTimeout(() => setEditSuccessMsg(''), 4000);
      }
    });
  };

  const handleAdminRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRegisterUser) return;
    setRegIsSubmitting(true);
    setRegError('');
    try {
      await onRegisterUser(regEmail, regPassword, regUsername, regFullName);
      
      // Success triggers reset of state
      setRegEmail('');
      setRegPassword('');
      setRegUsername('');
      setRegFullName('');
      setShowRegModal(false);
      setEditSuccessMsg(`Successfully registered new user profile: "${regFullName}" with zero ledger balance.`);
      refreshLocalState();
      setTimeout(() => setEditSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error(err);
      setRegError(err.message || 'Error occurred while creating user database entry.');
    } finally {
      setRegIsSubmitting(false);
    }
  };

  const handleChangeTxStatus = (userId: string, txId: string, newStatus: 'successful' | 'pending' | 'declined') => {
    const allUsers = loadUsersData();
    const userIdx = allUsers.findIndex(u => u.id === userId);
    if (userIdx !== -1) {
      const txIdx = allUsers[userIdx].transactions.findIndex(t => t.id === txId);
      if (txIdx !== -1) {
        const transaction = allUsers[userIdx].transactions[txIdx];
        const oldStatus = transaction.status || 'successful';
        
        if (oldStatus !== newStatus) {
          // Determine balance impact adjustment using our state machine
          let adjustment = 0;
          
          if (oldStatus === 'pending' && newStatus === 'successful') {
            adjustment = transaction.amount;
          } else if (oldStatus === 'successful' && (newStatus === 'declined' || newStatus === 'pending')) {
            adjustment = -transaction.amount;
          } else if (oldStatus === 'declined' && newStatus === 'successful') {
            adjustment = transaction.amount;
          }
          
          if (adjustment !== 0) {
            let targetAcc = allUsers[userIdx].accounts.find(a => a.id === transaction.targetAccountId);
            if (!targetAcc) {
              // Fallback to checking
              targetAcc = allUsers[userIdx].accounts.find(a => a.type === 'checking');
            }
            if (targetAcc) {
              targetAcc.balance += adjustment;
            }
          }
          
          transaction.status = newStatus;
          saveUsersData(allUsers);

          // If the status is approved and becomes successful, send confirmation alert email
          if (newStatus === 'successful') {
            const flowDirection = transaction.amount >= 0 ? 'credit' : 'debit';
            notificationService.sendTransactionAlert(
              allUsers[userIdx],
              transaction.amount,
              `${transaction.description} (Approved by Security Command)`,
              flowDirection
            ).catch(err => console.error("Error sending admin approval alert email:", err));
          } else if (newStatus === 'declined') {
            notificationService.sendTransactionAlert(
              allUsers[userIdx],
              transaction.amount,
              `DECLINED: ${transaction.description}`,
              transaction.amount >= 0 ? 'credit' : 'debit'
            ).catch(err => console.error("Error sending admin declining action notification:", err));
          }
          
          addAuditLog(
            currentAdmin.username,
            currentAdmin.id,
            'TX_STATUS_CHANGE',
            `Changed status of tx "${transaction.description}" (${txId}) for ${allUsers[userIdx].name} to ${newStatus.toUpperCase()}. Applied adjustment of $${adjustment.toFixed(2)} to ${allUsers[userIdx].accounts.find(a => a.id === transaction.targetAccountId)?.name || 'Checking Account'}`
          );
          
          refreshLocalState();
        }
      }
    }
  };

  // Compute stats for analytics
  const totalSystemDeposits = users.reduce((acc, u) => {
    const userDeposits = u.accounts.reduce((sum, a) => sum + (a.balance > 0 ? a.balance : 0), 0);
    return acc + userDeposits;
  }, 0);

  const activeAccountsCount = users.reduce((acc, u) => acc + u.accounts.length, 0);

  // Compile all system transactions across all user databases
  const allSystemTransactions: { userId: string; username: string; tx: Transaction }[] = [];
  users.forEach(u => {
    u.transactions.forEach(t => {
      allSystemTransactions.push({ userId: u.id, username: u.name, tx: t });
    });
  });

  // Sort by date/timestamp
  allSystemTransactions.sort((a, b) => b.tx.timestamp - a.tx.timestamp);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-[#070b19] text-white flex flex-col md:flex-row relative overflow-y-auto">
      
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
                stroke="url(#uGradAdminSidebar)" 
                strokeWidth="16" 
                strokeLinecap="round" 
              />
              <defs>
                <linearGradient id="uGradAdminSidebar" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1e40af" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div>
              <h2 className="text-xs font-extrabold tracking-[0.2em] text-white uppercase leading-none">UNITYCORE</h2>
              <span className="text-[10px] font-bold tracking-[0.14em] text-blue-400">ADMIN</span>
            </div>
          </div>

          {/* Navigation Links List */}
          <div className="space-y-1.5 pt-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>👥</span> Manage Users
            </button>

            <button
              onClick={() => setActiveTab('transactions')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>📊</span> System Ledger
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>📈</span> System Health
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>📜</span> Audit Reports
            </button>

            <button
              onClick={() => setActiveTab('deposits_control')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'deposits_control'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>⚙️</span> Deposits & Withdrawals
            </button>
          </div>
        </div>

        {/* Profile Card and Switch controls */}
        <div className="border-t border-slate-800 pt-5 space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 font-extrabold text-xs text-blue-400">
              AC
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-xs font-extrabold text-white truncate">{currentAdmin.name}</p>
              <p className="text-[10px] text-slate-500 font-mono">@{currentAdmin.username}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => onRoleSwitch('user')}
              className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono font-bold text-blue-400 py-2 rounded-lg text-center transition cursor-pointer"
            >
              Client Node
            </button>
            <button 
              onClick={onLogout}
              className="bg-slate-900 hover:bg-rose-950 hover:text-rose-400 border border-slate-800 hover:border-rose-900/40 text-slate-400 p-2.5 rounded-lg transition cursor-pointer"
              title="Close Session"
            >
              🔒
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container Wrapper - Takes full width minus sidebar on desktop */}
      <div className="flex-grow flex flex-col min-h-screen relative max-w-full">

        {/* Top Admin Header Bar */}
        <header className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0d1224]/95 backdrop-blur-md sticky top-0 z-30 shadow-sm md:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 items-center justify-center flex bg-slate-900 border border-slate-800 text-blue-400 rounded-xl">
              <HardDrive className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-[0.14em] text-white uppercase leading-none">UNITYCORE BANK</h1>
              <span className="text-[10px] text-blue-400 font-mono font-bold">System Controller</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
          {/* Quick role toggler */}
          <button
            onClick={() => onRoleSwitch('user')}
            className="text-xs font-semibold text-slate-705 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm rounded-full py-1.5 px-3.5 transition flex items-center gap-1.5 cursor-pointer text-slate-700"
            id="btn-switch-client"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-indigo-600" /> Client View
          </button>

          <button
            onClick={onLogout}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 py-1.5 px-2.5 rounded hover:bg-rose-50 transition"
            id="btn-admin-logout"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Inner grid navigation */}
      <div className="bg-white border-b border-slate-200 flex py-1 shadow-sm">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
            activeTab === 'users' ? 'text-indigo-600 border-indigo-500 bg-indigo-50/20 font-bold' : 'text-slate-400 border-transparent hover:text-slate-600'
          }`}
          id="admin-tab-users"
        >
          <Users className="w-4 h-4" /> Users
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
            activeTab === 'transactions' ? 'text-indigo-600 border-indigo-500 bg-indigo-50/20 font-bold' : 'text-slate-400 border-transparent hover:text-slate-600'
          }`}
          id="admin-tab-transactions"
        >
          <Layers className="w-4 h-4" /> Transactions
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
            activeTab === 'analytics' ? 'text-indigo-600 border-indigo-500 bg-indigo-50/20 font-bold' : 'text-slate-400 border-transparent hover:text-slate-600'
          }`}
          id="admin-tab-analytics"
        >
          <BarChart className="w-4 h-4" /> Analytics
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
            activeTab === 'reports' ? 'text-indigo-600 border-indigo-500 bg-indigo-50/20 font-bold' : 'text-slate-400 border-transparent hover:text-slate-605 hover:text-slate-600'
          }`}
          id="admin-tab-reports"
        >
          <ShieldAlert className="w-4 h-4" /> Audit Trails
        </button>

        <button
          onClick={() => setActiveTab('deposits_control')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
            activeTab === 'deposits_control' ? 'text-indigo-600 border-indigo-500 bg-indigo-50/20 font-bold' : 'text-slate-400 border-transparent hover:text-slate-600'
          }`}
          id="admin-tab-deposits"
        >
          <SettingsIcon className="w-4 h-4" /> Configs
        </button>
      </div>

      <main className="flex-grow p-5 max-w-lg w-full mx-auto pb-10">

        {/* Global balance edit success alert */}
        {editSuccessMsg && (
          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-600" />
            <span>{editSuccessMsg}</span>
          </div>
        )}

        {/* TAB 1: USERS LIST & BALANCE ADJUSTER (`pages/admin/users.html` mapping) */}
        {activeTab === 'users' && !selectedEditUser && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-1">
              <div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">Registered Ledgers</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Control client reserves instantly</p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setRegError('');
                    setShowRegModal(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Register User
                </button>
                <button
                  onClick={handleDeleteAllUsers}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs"
                  title="Purge all registered user directory accounts"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Wipe Custom Users
                </button>
                <button
                  onClick={refreshLocalState}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition text-slate-500 shadow-sm cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* User searching field */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search usernames or email addresses..."
                className="w-full bg-white border border-slate-200 py-2.5 pl-10 pr-4 text-xs text-slate-900 rounded-xl placeholder-slate-400 outline-none focus:border-indigo-600 transition"
                id="admin-user-search"
              />
            </div>

            {/* List entries for users */}
            <div className="space-y-3 pt-1">
              {users
                .filter(u => u.role !== 'admin')
                .filter(u => {
                  if (userQuery) {
                    return (
                      u.name.toLowerCase().includes(userQuery.toLowerCase()) ||
                      u.username.toLowerCase().includes(userQuery.toLowerCase())
                    );
                  }
                  return true;
                })
                .map((u) => {
                  const checking = u.accounts.find(a => a.type === 'checking')?.balance || 0;
                  const savings = u.accounts.find(a => a.type === 'savings')?.balance || 0;
                  return (
                    <div 
                      key={u.id}
                      className="bg-white border border-slate-200 p-4 rounded-xl flex justify-between items-center hover:border-indigo-300 shadow-sm transition"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={u.avatarUrl} 
                          alt={u.name} 
                          className="w-10 h-10 rounded-full object-cover border border-slate-200" 
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-800">{u.name}</p>
                          <p className="text-xs text-slate-500 font-mono">@{u.username}</p>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1">
                        <div className="text-xs font-mono font-semibold text-slate-700">
                          <span className="text-slate-400">Checking:</span>{' '}
                          <span className="text-indigo-600">{formatCurrency(checking)}</span>
                        </div>
                        <div className="text-xs font-mono font-semibold text-slate-700">
                          <span className="text-slate-400">Savings:</span>{' '}
                          <span className="text-indigo-600">{formatCurrency(savings)}</span>
                        </div>
                        
                        {/* Adjust balances override button & Selective Delete */}
                        <div className="flex gap-1.5 mt-1">
                          <button
                            onClick={() => {
                              setSelectedEditUser(u);
                              setCheckingInputBalance(checking.toString());
                              setSavingsInputBalance(savings.toString());
                            }}
                            className="text-[10px] bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition font-mono font-bold px-2 py-1 rounded-lg text-indigo-700 cursor-pointer shadow-xs"
                          >
                            Modify Balance
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="bg-rose-50 border border-rose-200 hover:bg-rose-150 transition text-rose-600 p-1.5 rounded-lg flex items-center justify-center cursor-pointer shadow-xs text-xs font-bold"
                            title="Purge user permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 1 EXTENSION: ACTIVE ADJUSTMENT PANEL OVERLAY */}
        {activeTab === 'users' && selectedEditUser && (
          <form onSubmit={handleModifyBalances} className="space-y-5 border border-slate-200 p-5 rounded-2xl bg-white shadow-lg animate-fade-in text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase flex items-center gap-1.5">
                Adjust Ledger: {selectedEditUser.name}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedEditUser(null)}
                className="text-xs text-slate-550 hover:text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-mono font-bold uppercase tracking-wider">Override Checking Balance ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={checkingInputBalance}
                  onChange={(e) => setCheckingInputBalance(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 py-3 px-4 text-xs font-bold font-mono text-indigo-700 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-mono font-bold uppercase tracking-wider">Override Savings Balance ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={savingsInputBalance}
                  onChange={(e) => setSavingsInputBalance(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 py-3 px-4 text-xs font-bold font-mono text-indigo-700 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl text-xs transition duration-150 shadow-sm cursor-pointer"
            >
              Confirm State Override
            </button>
          </form>
        )}

        {/* TAB 2: TRANSACTION LOGS TABLE ACROSS ALL USERS (`pages/admin/transactions.html` mapping) */}
        {activeTab === 'transactions' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">System-wide Journals</h3>
                 <p className="text-[10px] text-slate-500 mt-0.5">Real-time ledger audit logs</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600">SOC2 Node</span>
            </div>

            {/* Real-time Pending Approvals Queue */}
            {allSystemTransactions.filter(item => (item.tx.status || 'successful') === 'pending').length > 0 && (
              <div className="bg-amber-50/70 border border-amber-200/80 p-5 rounded-2xl space-y-3 shadow-xs">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-extrabold text-[#78350f] flex items-center gap-1.5 uppercase tracking-wider font-sans">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Pending Approvals Queue ({allSystemTransactions.filter(item => (item.tx.status || 'successful') === 'pending').length})
                  </h4>
                  <span className="text-[9px] text-[#b45309] font-bold uppercase font-mono tracking-widest">Manual Processing</span>
                </div>
                <p className="text-[10px] text-[#78350f]/80 leading-normal font-sans">
                  The following user deposits and withdrawal requests require manual administration authorization. Review and approve or decline them one after the other to reconcile ledger holdings.
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {allSystemTransactions
                    .filter(item => (item.tx.status || 'successful') === 'pending')
                    .map((item, idx) => {
                      const isCredit = item.tx.amount > 0;
                      const currentTxId = item.tx.id || `tx-gen-p-${idx}`;
                      return (
                        <div key={currentTxId} className="bg-white border border-slate-205 p-3.5 rounded-xl flex flex-wrap justify-between items-center gap-3 shadow-xs text-slate-800">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900">{item.tx.description}</span>
                              <span className="bg-indigo-50 border border-indigo-100 text-[8px] font-mono font-bold text-indigo-700 px-1.5 py-0.5 rounded cursor-normal uppercase">
                                {item.username}
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{item.tx.date} • {item.tx.category.toUpperCase()}</p>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <span className={`text-xs font-mono font-black ${isCredit ? 'text-emerald-600' : 'text-slate-800'}`}>
                              {isCredit ? '+' : ''}{formatCurrency(item.tx.amount)}
                            </span>
                            <div className="flex gap-1.5">
                              <button 
                                onClick={() => handleChangeTxStatus(item.userId, currentTxId, 'successful')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-[9px] rounded-lg shadow-xs transition cursor-pointer"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleChangeTxStatus(item.userId, currentTxId, 'declined')}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-750 text-white font-bold text-[9px] rounded-lg shadow-xs transition cursor-pointer"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Transaction item search input details */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={txQuery}
                onChange={(e) => setTxQuery(e.target.value)}
                placeholder="Search transactional descriptors..."
                className="w-full bg-white border border-slate-200 py-2.5 pl-10 pr-4 text-xs text-slate-900 rounded-xl placeholder-slate-400 outline-none"
                id="admin-ledger-search"
              />
            </div>

            <div className="space-y-3 pt-1">
              {allSystemTransactions
                .filter(item => {
                  if (txQuery) {
                    return item.tx.description.toLowerCase().includes(txQuery.toLowerCase());
                  }
                  return true;
                })
                .map((item, idx) => {
                  const isCredit = item.tx.amount > 0;
                  const currentTxId = item.tx.id || `tx-gen-${idx}`;
                  const currentStatus = item.tx.status || 'successful';
                  return (
                    <div 
                      key={currentTxId}
                      className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col gap-3 shadow-sm text-slate-850"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-slate-800 font-bold">{item.tx.description}</span>
                            <span className="bg-indigo-50 border border-indigo-100 text-[8px] font-mono text-indigo-700 px-1.5 py-0.5 rounded-md uppercase font-semibold">
                              {item.username}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <p className="text-[10px] text-slate-550 text-slate-400 font-mono">{item.tx.date}</p>
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/60 font-sans font-bold uppercase text-[8px] tracking-wider text-slate-500">
                              {item.tx.category}
                            </span>
                            {/* Color-accurate state badging */}
                            {currentStatus === 'successful' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-extrabold uppercase">
                                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>Successful
                              </span>
                            )}
                            {currentStatus === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-750 border border-amber-250 text-[8px] font-extrabold text-amber-600 border-amber-200 uppercase">
                                <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse"></span>Pending
                              </span>
                            )}
                            {currentStatus === 'declined' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-750 border border-rose-250 text-[8px] font-extrabold text-rose-600 border-rose-200 uppercase">
                                <span className="w-1 h-1 rounded-full bg-rose-500"></span>Declined
                              </span>
                            )}
                          </div>
                        </div>

                        <span className={`text-xs font-mono font-bold ${isCredit ? 'text-emerald-600' : 'text-slate-800'}`}>
                          {isCredit ? '+' : ''}{formatCurrency(item.tx.amount)}
                        </span>
                      </div>

                      {/* Admin actionable override controls */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[9px] text-slate-400 font-mono font-bold tracking-wider uppercase">Ledger Action Override</span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleChangeTxStatus(item.userId, currentTxId, 'successful')}
                            className={`px-2 py-1 rounded text-[9px] font-bold transition cursor-pointer ${
                              currentStatus === 'successful'
                                ? 'bg-emerald-600 text-white shadow-xs' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            Mark Successful
                          </button>
                          <button 
                            onClick={() => handleChangeTxStatus(item.userId, currentTxId, 'pending')}
                            className={`px-2 py-1 rounded text-[9px] font-bold transition cursor-pointer ${
                              currentStatus === 'pending'
                                ? 'bg-amber-500 text-white shadow-xs' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            Mark Pending
                          </button>
                          <button 
                            onClick={() => handleChangeTxStatus(item.userId, currentTxId, 'declined')}
                            className={`px-2 py-1 rounded text-[9px] font-bold transition cursor-pointer ${
                              currentStatus === 'declined'
                                ? 'bg-rose-600 text-white shadow-xs' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            Mark Declined
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM DIAGNOSTICS ANALYTICS METRICS (`pages/admin/analytics.html` mapping) */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">Health and Diagnostics</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Live database cluster summaries</p>
            </div>

            {/* Stats Bento style metrics cards */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-2 shadow-sm">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest block">Total Deposits Assets</span>
                <p className="text-lg font-bold text-slate-950 font-mono text-slate-900">{formatCurrency(totalSystemDeposits)}</p>
                <div className="text-[10px] text-emerald-600 flex items-center gap-0.5 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> +12.4% /m
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-2 shadow-sm">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest block">System Ledger Registers</span>
                <p className="text-lg font-bold text-slate-950 font-mono text-slate-900">{activeAccountsCount}</p>
                <p className="text-[10px] text-indigo-600 font-bold">100% cloud replicated</p>
              </div>
            </div>

            {/* Custom SVG Diagnostic line graph representations */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-4 shadow-sm">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-indigo-600 font-bold">Ledger Execution Rate Index</span>
                <span className="text-[10px] text-slate-400 font-mono">1.0s resolution</span>
              </div>
              
              {/* Fake animated sparklines/peaks simulation */}
              <div className="h-16 flex items-end justify-between gap-1 mt-2">
                <div className="w-full bg-indigo-600 h-10 rounded-sm opacity-75 hover:opacity-100 transition duration-150" />
                <div className="w-full bg-indigo-600 h-14 rounded-sm opacity-75 hover:opacity-100 transition duration-150" />
                <div className="w-full bg-indigo-600 h-6 rounded-sm opacity-75 hover:opacity-100 transition duration-150" />
                <div className="w-full bg-indigo-600 h-11 rounded-sm opacity-75 hover:opacity-100 transition duration-150" />
                <div className="w-full bg-indigo-600 h-16 rounded-sm opacity-75 hover:opacity-100 transition duration-150" />
                <div className="w-full bg-indigo-600 h-8 rounded-sm opacity-75 hover:opacity-100 transition duration-150" />
                <div className="w-full bg-indigo-600 h-10 rounded-sm opacity-75 hover:opacity-100 transition duration-150" />
              </div>

              <div className="flex justify-between text-[8px] font-mono text-slate-400">
                <span>{new Date(Date.now() - 40 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* FDIC / SEC regulation compliance tags */}
            <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-2 max-w-sm mx-auto shadow-sm">
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase">
                <HeartPulse className="w-4 h-4 text-emerald-600" /> System Healthy
              </div>
              <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                All cloud clusters are functioning within appropriate operational bound margins. Real-time FDIC/BSA ledger validation nodes are green.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS / HISTORICAL REPORTS (`pages/admin/reports.html` mapping) */}
        {activeTab === 'reports' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">Audit Trail (Log-Check)</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Persistent security state records</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: 'Flush Audit Trail Logs?',
                    description: 'This will completely empty the local security audit trail logs. This action is irreversibly final.',
                    confirmText: 'Flush Now',
                    cancelText: 'Cancel',
                    isDanger: true,
                    onConfirm: () => {
                      localStorage.removeItem('unitycore_audit_logs');
                      refreshLocalState();
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }
                  });
                }}
                className="text-[10px] font-mono font-bold hover:underline text-rose-600 cursor-pointer"
              >
                Flush Logs
              </button>
            </div>

            <div className="space-y-3">
              {auditLogs.map((log) => {
                return (
                  <div 
                    key={log.id} 
                    className="bg-white border border-slate-200 p-4 rounded-xl space-y-2 text-xs shadow-sm text-slate-800"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <span className="font-mono text-[10px] text-slate-400">{log.timestamp}</span>
                      <span className={`text-[9px] font-mono font-bold uppercase border px-1.5 py-0.5 rounded ${
                        log.status === 'success' 
                           ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                           : 'text-rose-700 bg-rose-50 border-rose-100'
                      }`}>
                        {log.action}
                      </span>
                    </div>

                    <p className="text-slate-600 font-medium antialiased">{log.details}</p>
                    <p className="text-[10px] text-slate-400 font-mono font-bold">Operator: <span className="text-indigo-600">@{log.username}</span></p>
                  </div>
                );
              })}

              {auditLogs.length === 0 && (
                <p className="text-xs text-center text-slate-500 py-10 font-mono">Audit log buffer empty.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: DEPOSITS & WITHDRAWALS CONFIGURATION DESK */}
        {activeTab === 'deposits_control' && (
          <div className="space-y-5 animate-fade-in text-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider text-left">Deposits & Withdrawals Setup Desk</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 text-left font-sans">Control payment methods, guidelines, and addresses seen by clients</p>
            </div>

            {/* Config Mode Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl font-sans">
              {(['bank', 'check', 'crypto'] as const).map((id) => {
                const label = id === 'bank' ? '🏦 Bank Pay' : id === 'check' ? '📝 Mobile Check' : '🪙 USDT / Crypto';
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setEditingConfigId(id)}
                    className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg transition cursor-pointer border-none ${
                      editingConfigId === id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-850'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Currently Selected Config Content */}
            {(() => {
              const currentCfg = depositWithdrawConfigs.find((c) => c.id === editingConfigId);
              if (!currentCfg) return null;

              return (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-xs text-left">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-150">
                    <span className="text-xs font-extrabold text-blue-700 tracking-wide uppercase">
                      Editing: {currentCfg.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${currentCfg.depositEnabled || currentCfg.withdrawEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                        {(currentCfg.depositEnabled || currentCfg.withdrawEnabled) ? 'LIVE NODE' : 'OFFLINE'}
                      </span>
                    </span>
                  </div>

                  {/* Enable toggles */}
                  <div className="grid grid-cols-2 gap-4 font-sans">
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-extrabold text-slate-800">Allow Deposits</span>
                        <span className="text-[9px] text-slate-400">Enable method to deposit funds</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={currentCfg.depositEnabled}
                        onChange={(e) => {
                          const updated = depositWithdrawConfigs.map((c) =>
                            c.id === editingConfigId ? { ...c, depositEnabled: e.target.checked } : c
                          );
                          setDepositWithdrawConfigs(updated);
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-extrabold text-slate-800">Allow Withdrawals</span>
                        <span className="text-[9px] text-slate-400">Enable method to withdraw funds</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={currentCfg.withdrawEnabled}
                        onChange={(e) => {
                          const updated = depositWithdrawConfigs.map((c) =>
                            c.id === editingConfigId ? { ...c, withdrawEnabled: e.target.checked } : c
                          );
                          setDepositWithdrawConfigs(updated);
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Instructions Fields */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-indigo-600 font-black uppercase tracking-wider block text-left">Deposit Guidelines / Instructions</label>
                      <textarea
                        rows={3}
                        value={currentCfg.depositInstructions}
                        onChange={(e) => {
                          const updated = depositWithdrawConfigs.map((c) =>
                            c.id === editingConfigId ? { ...c, depositInstructions: e.target.value } : c
                          );
                          setDepositWithdrawConfigs(updated);
                        }}
                        className="w-full bg-slate-50 border border-slate-205 rounded-xl py-1.5 px-3 text-xs text-slate-805 outline-none focus:border-indigo-500 font-sans leading-relaxed resize-y focus:bg-white focus:text-slate-900 border-slate-200"
                        placeholder="Provide detailed deposit steps..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-indigo-600 font-black uppercase tracking-wider block text-left">Withdrawal Guidelines / Instructions</label>
                      <textarea
                        rows={3}
                        value={currentCfg.withdrawInstructions}
                        onChange={(e) => {
                          const updated = depositWithdrawConfigs.map((c) =>
                            c.id === editingConfigId ? { ...c, withdrawInstructions: e.target.value } : c
                          );
                          setDepositWithdrawConfigs(updated);
                        }}
                        className="w-full bg-slate-50 border border-slate-205 rounded-xl py-1.5 px-3 text-xs text-slate-805 outline-none focus:border-indigo-500 font-sans leading-relaxed resize-y focus:bg-white focus:text-slate-900 border-slate-200"
                        placeholder="Provide details on withdrawal steps, fees, timelines..."
                      />
                    </div>
                  </div>

                  {/* Custom fields configuration (Bank account details or wallet addresses) */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-indigo-600 font-black uppercase tracking-wider block text-left">Method Specifications / Wallet Data</label>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = depositWithdrawConfigs.map((c) => {
                            if (c.id === editingConfigId) {
                              const uniqueKey = `Custom Field ${Object.keys(c.depositFields).length + 1}`;
                              return {
                                ...c,
                                depositFields: {
                                  ...c.depositFields,
                                  [uniqueKey]: 'Custom specification value'
                                }
                              };
                            }
                            return c;
                          });
                          setDepositWithdrawConfigs(updated);
                        }}
                        className="text-[9px] font-bold text-indigo-605 bg-indigo-50 hover:bg-indigo-100 border-none px-2.5 py-1 rounded-sm transition cursor-pointer font-sans"
                      >
                        + Add Custom Field
                      </button>
                    </div>

                    <div className="space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50 max-h-60 overflow-y-auto font-sans">
                      {Object.entries(currentCfg.depositFields).map(([vKey, vVal]) => {
                        return (
                          <div key={vKey} className="flex gap-1.5 items-center bg-white p-1.5 rounded-lg border border-slate-200 shadow-3xs">
                            <input
                              type="text"
                              value={vKey}
                              onChange={(e) => {
                                const newKey = e.target.value;
                                if (!newKey) return;
                                const updatedFields = { ...currentCfg.depositFields };
                                const entries = Object.entries(updatedFields);
                                const newEntries = entries.map(([k, v]) => k === vKey ? [newKey, v] : [k, v]);
                                const updated = depositWithdrawConfigs.map((c) =>
                                  c.id === editingConfigId ? { ...c, depositFields: Object.fromEntries(newEntries) } : c
                                );
                                setDepositWithdrawConfigs(updated);
                              }}
                              className="w-1/3 text-[10px] font-bold uppercase tracking-wide bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-600 focus:bg-white outline-none"
                              placeholder="Label"
                            />
                            <input
                              type="text"
                              value={vVal}
                              onChange={(e) => {
                                const newVal = e.target.value;
                                const updatedFields = { ...currentCfg.depositFields, [vKey]: newVal };
                                const updated = depositWithdrawConfigs.map((c) =>
                                  c.id === editingConfigId ? { ...c, depositFields: updatedFields } : c
                                );
                                setDepositWithdrawConfigs(updated);
                              }}
                              className="flex-1 text-[10px] font-mono text-slate-800 bg-stone-50 border border-slate-200 rounded px-1.5 py-1 focus:bg-white outline-none font-bold"
                              placeholder="Value or detail"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updatedFields = { ...currentCfg.depositFields };
                                delete updatedFields[vKey];
                                const updated = depositWithdrawConfigs.map((c) =>
                                  c.id === editingConfigId ? { ...c, depositFields: updatedFields } : c
                                );
                                setDepositWithdrawConfigs(updated);
                              }}
                              className="text-rose-600 hover:bg-rose-50 p-1 rounded-sm border-none transition shrink-0 cursor-pointer flex items-center justify-center bg-transparent"
                              title="Delete Field"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}

                      {Object.keys(currentCfg.depositFields).length === 0 && (
                        <p className="text-[10px] text-center text-slate-400 py-3 font-mono">No custom specification fields defined.</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-150 flex justify-end font-sans">
                    <button
                      type="button"
                      onClick={() => {
                        saveDepositWithdrawConfigs(depositWithdrawConfigs);
                        addAuditLog(
                          currentAdmin.username,
                          currentAdmin.id,
                          'LEDGER_CONFIG_UPDATE',
                          `Updated systemic rules, instructions & node addresses for ${currentCfg.name} (${currentCfg.id})`
                        );
                        setEditSuccessMsg(`Successfully saved and synced system configuration for ${currentCfg.name}!`);
                        setTimeout(() => setEditSuccessMsg(''), 4000);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md border-none cursor-pointer transition flex items-center gap-1.5"
                    >
                      <span>💾</span> Save Config Node
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Admin Register User Modal Overlay */}
        {showRegModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
            <div className="bg-white border border-slate-205 p-6 rounded-2xl w-full max-w-sm relative text-left shadow-2xl">
              <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-1.5 uppercase">
                Register New User
              </h3>
              <p className="text-[11px] text-slate-500 mb-4 font-sans leading-normal">
                Register a new secure client profile in the system. The profile will default to initial bank accounts with zero balance.
              </p>

              {regError && (
                <div className="mb-3.5 p-2 bg-rose-50 border border-rose-150 text-rose-700 rounded-lg text-[11px] font-semibold leading-normal">
                  {regError}
                </div>
              )}

              <form onSubmit={handleAdminRegisterSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] text-indigo-600 uppercase font-black tracking-wider">Full Name</label>
                  <input 
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Rachel Adams"
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-850 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-indigo-600 uppercase font-black tracking-wider">Username</label>
                  <input 
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. rachel"
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-850 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-indigo-600 uppercase font-black tracking-wider">Email Address</label>
                  <input 
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. rachel@example.com"
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-850 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-indigo-600 uppercase font-black tracking-wider">Password (min 6 chars)</label>
                  <input 
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-850 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowRegModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-705 text-xs py-2 rounded-lg transition font-bold cursor-pointer text-slate-700"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={regIsSubmitting}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs py-2 rounded-lg transition font-bold cursor-pointer"
                  >
                    {regIsSubmitting ? 'Registering...' : 'Confirm Register'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Custom Confirmation Modal */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-md w-full shadow-2xl animate-fade-in animate-duration-200">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-full shrink-0 ${confirmModal.isDanger ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-100'}`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    {confirmModal.title}
                  </h3>
                  <p className="text-slate-500 mt-2 text-xs leading-relaxed font-sans font-medium">
                    {confirmModal.description}
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 mt-5">
                <button 
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded-lg transition font-bold cursor-pointer font-sans"
                >
                  {confirmModal.cancelText || 'Cancel'}
                </button>
                <button 
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 text-white text-xs py-2 rounded-lg transition font-bold cursor-pointer font-sans ${
                    confirmModal.isDanger 
                      ? 'bg-rose-600 hover:bg-rose-700' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {confirmModal.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
      </div>
    </div>
  );
}
