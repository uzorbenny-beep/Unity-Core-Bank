/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'analytics' | 'reports' | 'deposits_control' | 'firebase_engine'>('users');
  
  // Firebase Live SQL & Alerts states
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users;');
  const [sqlResult, setSqlResult] = useState<any[] | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [alertTargetUser, setAlertTargetUser] = useState<string>('all');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertBody, setAlertBody] = useState('');
  const [alertCategory, setAlertCategory] = useState<'security' | 'otp' | 'transaction' | 'biller' | 'registration'>('security');
  const [alertDispatchMsg, setAlertDispatchMsg] = useState('');

  // SQL Runner transpiler execution
  const runSqlQuery = () => {
    setSqlError(null);
    setSqlResult(null);
    try {
      const q = sqlQuery.trim().replace(/\s+/g, ' ');
      const upperQ = q.toUpperCase();
      
      if (!upperQ.startsWith('SELECT')) {
        throw new Error('Unsupported SQL command. Firebase Command Console currently restricts Runner access to SELECT queries to ensure zero-trust read-only safety.');
      }
      
      const selectMatch = q.match(/select\s+(.+?)\s+from\s+(\w+)(?:\s+where\s+(.+))?/i);
      if (!selectMatch) {
         throw new Error('Invalid SQL Syntax. Expected format: SELECT * FROM <users | transactions | audit_logs | system_configs> [WHERE <condition>]');
      }
      
      const [, fieldsStr, tableName, whereClause] = selectMatch;
      const tName = tableName.toLowerCase();
      
      let dataset: any[] = [];
      if (tName === 'users') {
         const raw = loadUsersData();
         dataset = raw.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            name: u.name,
            role: u.role,
            checking_balance: u.accounts.find(a => a.type === 'checking')?.balance ?? 0,
            savings_balance: u.accounts.find(a => a.type === 'savings')?.balance ?? 0,
            unread_notifs: u.unreadNotifications ?? 0
         }));
      } else if (tName === 'transactions') {
         const rawUsers = loadUsersData();
         const allTx: any[] = [];
         rawUsers.forEach(usr => {
            if (usr.transactions) {
               usr.transactions.forEach(tx => {
                  allTx.push({
                     id: tx.id,
                     username: usr.username,
                     description: tx.description,
                     amount: tx.amount,
                     date: tx.date,
                     timestamp: tx.timestamp,
                     category: tx.category,
                     status: tx.status
                  });
               });
            }
         });
         dataset = allTx;
      } else if (tName === 'auditlogs' || tName === 'audit_logs') {
         dataset = loadAuditLogs();
      } else if (tName === 'system_configs' || tName === 'system_configs') {
         dataset = loadDepositWithdrawConfigs();
      } else {
         throw new Error(`Table "${tableName}" not found. Supported Firebase relational schemas: users, transactions, audit_logs, system_configs.`);
      }
      
      if (whereClause) {
         const cleanWhere = whereClause.trim();
         const opMatch = cleanWhere.match(/(\w+)\s*(=|>|<|like)\s*['"]?([^'"]+)['"]?/i);
         if (opMatch) {
            const [, colName, op, val] = opMatch;
            const col = colName.toLowerCase();
            const operator = op.toLowerCase();
            const filterVal = val.toLowerCase();
            
            dataset = dataset.filter(item => {
               const actualKey = Object.keys(item).find(k => k.toLowerCase() === col);
               if (!actualKey) return false;
               const actualVal = item[actualKey];
               
               if (actualVal === undefined || actualVal === null) return false;
               
               if (operator === '=') {
                  return String(actualVal).toLowerCase() === filterVal;
               } else if (operator === '>') {
                  return parseFloat(actualVal) > parseFloat(filterVal);
               } else if (operator === '<') {
                  return parseFloat(actualVal) < parseFloat(filterVal);
               } else if (operator === 'like') {
                  const cleanedTerm = filterVal.replace(/%/g, '');
                  return String(actualVal).toLowerCase().includes(cleanedTerm);
               }
               return true;
            });
         }
      }
      
      if (fieldsStr.trim() !== '*') {
         const fields = fieldsStr.split(',').map(f => f.trim().toLowerCase());
         dataset = dataset.map(item => {
            const mappedItem: any = {};
            fields.forEach(f => {
               const actualKey = Object.keys(item).find(k => k.toLowerCase() === f);
               if (actualKey) {
                  mappedItem[actualKey] = item[actualKey];
               }
            });
            return mappedItem;
         });
      }
      
      setSqlResult(dataset);
      addAuditLog(
         currentAdmin.username,
         currentAdmin.id,
         'FIREBASE_SQL_QUERY',
         `Executed relational SQL analysis: "${q}"`
      );
    } catch (err: any) {
      setSqlError(err.message || 'Syntax error inside SQL statement.');
    }
  };

  // Broadcast system notifications to users in Firestore
  const handleDispatchAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertBody.trim()) {
      setAlertDispatchMsg('Please specify both secure message title and contents.');
      return;
    }
    setAlertDispatchMsg('Broadcasting secure ledger alerts in Firebase...');
    try {
      const allUsers = loadUsersData();
      if (alertTargetUser === 'all') {
        for (const u of allUsers) {
          await notificationService.triggerActivityAlert(u, alertCategory, alertTitle, alertBody);
        }
        setAlertDispatchMsg(`Live Firebase alerts and HTML emails successfully broadcasted to all ${allUsers.length} system ledger domains!`);
      } else {
        const target = allUsers.find(u => u.id === alertTargetUser);
        if (!target) throw new Error('Target profile omitted or missing.');
        await notificationService.triggerActivityAlert(target, alertCategory, alertTitle, alertBody);
        setAlertDispatchMsg(`Security alert successfully transmitted to @${target.username}.`);
      }
      setAlertTitle('');
      setAlertBody('');
    } catch (err: any) {
      setAlertDispatchMsg(`Action abort: ${err.message || err}`);
    }
  };

  // Deposit & Withdrawal configs state
  const [depositWithdrawConfigs, setDepositWithdrawConfigs] = useState<DepositWithdrawMethodConfig[]>(() => loadDepositWithdrawConfigs());
  const [editingConfigId, setEditingConfigId] = useState<'bank' | 'check' | 'crypto'>('bank');

  // State from LocalStorage
  const [users, setUsers] = useState<BankUser[]>(() => loadUsersData());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadAuditLogs());

  // 📡 Live Firebase Cloud Sync states & processor
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const syncUsersFromFirestore = async () => {
    try {
      const { getActiveMode } = await import('../../dbService');
      if (getActiveMode() !== 'firebase') return;

      setIsSyncing(true);
      setSyncStatus('Synchronizing cloud user databases...');
      console.log('[Firebase Synchronizer] Syncing accounts from Firestore...');

      const { db } = await import('../../firebase');
      const { collection, getDocs } = await import('firebase/firestore');

      if (!db) {
        setIsSyncing(false);
        return;
      }

      // 1. Fetch user docs from Firestore 'users' collection
      const usersSnap = await getDocs(collection(db, 'users'));
      const fetchedUsers: BankUser[] = [];

      for (const docObj of usersSnap.docs) {
        const uData = docObj.data() as BankUser;
        const mergedTx: Transaction[] = uData.transactions || [];
        // Fetch each user's transactions subcollection
        try {
          const txSnap = await getDocs(collection(db, 'users', docObj.id, 'transactions'));
          txSnap.forEach((txDoc) => {
            const txData = txDoc.data() as Transaction;
            if (!mergedTx.some((t) => t.id === txData.id)) {
              mergedTx.push(txData);
            }
          });
          mergedTx.sort((a, b) => b.timestamp - a.timestamp);
          uData.transactions = mergedTx;
        } catch (txErr) {
          console.warn(`[Firebase Synchronizer] Transactions fetch failed for ${docObj.id}:`, txErr);
          uData.transactions = mergedTx;
        }
        fetchedUsers.push(uData);
      }

      // 2. Fetch admin profiles from 'admins' collection
      try {
        const adminsSnap = await getDocs(collection(db, 'admins'));
        for (const docObj of adminsSnap.docs) {
          const aData = docObj.data() as BankUser;
          if (!fetchedUsers.some((u) => u.id === aData.id)) {
            const mergedTx: Transaction[] = aData.transactions || [];
            // Also fetch transactions for admin as safe measure
            try {
              const txSnap = await getDocs(collection(db, 'admins', docObj.id, 'transactions'));
              txSnap.forEach((txDoc) => {
                const txData = txDoc.data() as Transaction;
                if (!mergedTx.some((t) => t.id === txData.id)) {
                  mergedTx.push(txData);
                }
              });
              mergedTx.sort((a, b) => b.timestamp - a.timestamp);
              aData.transactions = mergedTx;
            } catch (txErr) {
              console.warn(`[Firebase Synchronizer] Transactions fetch failed for admin ${docObj.id}:`, txErr);
              aData.transactions = mergedTx;
            }
            fetchedUsers.push(aData);
          }
        }
      } catch (admErr) {
        console.warn('[Firebase Synchronizer] Admins snapshot collection bypass:', admErr);
      }

      if (fetchedUsers.length > 0) {
        // Save and render central Firestore data as 1:1 absolute state
        saveUsersData(fetchedUsers, undefined, true);
        setUsers(fetchedUsers);
        setSyncStatus('Live cloud database in sync!');
      } else {
        setSyncStatus('Sync complete: No cloud users found.');
      }
    } catch (err: any) {
      console.error('[Firebase Synchronizer] Sync failed:', err);
      setSyncStatus(`Sync error: ${err.message || 'Check firestore.rules'}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(''), 3500);
    }
  };

  useEffect(() => {
    let unsubscribeUsers: (() => void) | undefined;

    const setupLiveListeners = async () => {
      try {
        const { getActiveMode } = await import('../../dbService');
        if (getActiveMode() !== 'firebase') {
          // If not in firebase mode, just fall back to standard initial sync
          syncUsersFromFirestore();
          return;
        }

        const { db } = await import('../../firebase');
        const { collection, onSnapshot, getDocs } = await import('firebase/firestore');

        if (!db) return;

        setIsSyncing(true);
        setSyncStatus('Establishing real-time cloud sync channel...');
        console.log('[Firebase Synchronizer] Subscribing to real-time users collection updates...');

        unsubscribeUsers = onSnapshot(collection(db, 'users'), async (snapshot) => {
          const fetchedUsers: BankUser[] = [];
          
          for (const docObj of snapshot.docs) {
            const uData = docObj.data() as BankUser;
            const mergedTx: Transaction[] = uData.transactions || [];
            try {
              // Fetch nested transaction registries for full ledger details
              const txSnap = await getDocs(collection(db, 'users', docObj.id, 'transactions'));
              txSnap.forEach((txDoc) => {
                const txData = txDoc.data() as Transaction;
                if (!mergedTx.some((t) => t.id === txData.id)) {
                  mergedTx.push(txData);
                }
              });
              mergedTx.sort((a, b) => b.timestamp - a.timestamp);
              uData.transactions = mergedTx;
            } catch (txErr) {
              console.warn(`[Firebase Synchronizer] Transactions fetch failed for live user: ${docObj.id}`, txErr);
              uData.transactions = mergedTx;
            }
            fetchedUsers.push(uData);
          }

          // Fetch admin roles from admins collection to make sure we show them too
          try {
            const adminsSnap = await getDocs(collection(db, 'admins'));
            for (const docObj of adminsSnap.docs) {
              const aData = docObj.data() as BankUser;
              if (!fetchedUsers.some((u) => u.id === aData.id)) {
                const mergedTx: Transaction[] = aData.transactions || [];
                try {
                  const txSnap = await getDocs(collection(db, 'admins', docObj.id, 'transactions'));
                  txSnap.forEach((txDoc) => {
                    const txData = txDoc.data() as Transaction;
                    if (!mergedTx.some((t) => t.id === txData.id)) {
                      mergedTx.push(txData);
                    }
                  });
                  mergedTx.sort((a, b) => b.timestamp - a.timestamp);
                  aData.transactions = mergedTx;
                } catch (txErr) {
                  console.warn(`[Firebase Synchronizer] Transactions fetch failed for live admin: ${docObj.id}`, txErr);
                  aData.transactions = mergedTx;
                }
                fetchedUsers.push(aData);
              }
            }
          } catch (admErr) {
            console.warn('[Firebase Synchronizer] Bypass live admin query:', admErr);
          }

          if (fetchedUsers.length > 0) {
            // Firestore is the absolute central source of truth. Save and render exact active cloud collection state.
            saveUsersData(fetchedUsers, undefined, true);
            setUsers(fetchedUsers);
            setSyncStatus('Live cloud database in sync!');
          }
        }, (err) => {
          console.error('[Firebase Synchronizer] Subscriber failed:', err);
          setSyncStatus(`Sync issue: ${err.message}`);
        });

      } catch (err: any) {
        console.error('[Firebase Synchronizer] Setup failed:', err);
        syncUsersFromFirestore(); // Fallback to classic sync
      } finally {
        setIsSyncing(false);
        setTimeout(() => setSyncStatus(''), 3500);
      }
    };

    setupLiveListeners();

    return () => {
      if (unsubscribeUsers) {
        console.log('[Firebase Synchronizer] Unsubscribing real-time listeners.');
        unsubscribeUsers();
      }
    };
  }, []);
  
  // Custom user editing state
  const [selectedEditUser, setSelectedEditUser] = useState<BankUser | null>(null);
  const [checkingInputBalance, setCheckingInputBalance] = useState('');
  const [savingsInputBalance, setSavingsInputBalance] = useState('');
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  
  // Additional custom user editing states (Admin side)
  const [editUserFirstName, setEditUserFirstName] = useState('');
  const [editUserMiddleName, setEditUserMiddleName] = useState('');
  const [editUserLastName, setEditUserLastName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserCountry, setEditUserCountry] = useState('');
  const [editUserRole, setEditUserRole] = useState<'user' | 'admin'>('user');
  const [editUserPin, setEditUserPin] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [creditInputBalance, setCreditInputBalance] = useState('');
  const [investInputBalance, setInvestInputBalance] = useState('');
  const [editUserIban, setEditUserIban] = useState('');

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
    import('../../dbService').then(({ getActiveMode }) => {
      if (getActiveMode() !== 'firebase') {
        syncUsersFromFirestore();
      }
    }).catch(() => {
      syncUsersFromFirestore();
    });
  };

  // Listen to immediate state modification changes (deposit/withdrawals) within the same window or external store events
  useEffect(() => {
    const handleImmediateRefresh = () => {
      console.log('[AdminDashboardView] State triggered immediately. Re-syncing and refreshing local ledger states.');
      refreshLocalState();
    };

    window.addEventListener('unitycore_state_changed', handleImmediateRefresh);
    window.addEventListener('storage', handleImmediateRefresh);

    return () => {
      window.removeEventListener('unitycore_state_changed', handleImmediateRefresh);
      window.removeEventListener('storage', handleImmediateRefresh);
    };
  }, []);

  // Modify Balance & Account Parameters Executions
  const handleModifyBalances = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditUser) return;

    const checkingVal = parseFloat(checkingInputBalance) || 0;
    const savingsVal = parseFloat(savingsInputBalance) || 0;
    const creditVal = parseFloat(creditInputBalance) || 0;
    const investVal = parseFloat(investInputBalance) || 0;

    const allUsers = loadUsersData();
    const targetIdx = allUsers.findIndex(u => u.id === selectedEditUser.id);
    if (targetIdx !== -1) {
      // Modify accounts or create if they don't exist yet!
      let checkingAcc = allUsers[targetIdx].accounts.find(a => a.type === 'checking');
      if (checkingAcc) {
        checkingAcc.balance = checkingVal;
      } else {
        allUsers[targetIdx].accounts.push({
          id: 'acc-checking',
          name: 'Primary Checking Account',
          type: 'checking',
          balance: checkingVal,
          lastFour: '8821',
          available: true
        });
      }

      let savingsAcc = allUsers[targetIdx].accounts.find(a => a.type === 'savings');
      if (savingsAcc) {
        savingsAcc.balance = savingsVal;
      } else {
        allUsers[targetIdx].accounts.push({
          id: 'acc-savings',
          name: 'High-Yield Savings Lock',
          type: 'savings',
          balance: savingsVal,
          lastFour: '5012',
          available: true
        });
      }

      let creditAcc = allUsers[targetIdx].accounts.find(a => a.type === 'credit');
      if (creditAcc) {
        creditAcc.balance = creditVal;
      } else {
        allUsers[targetIdx].accounts.push({
          id: 'acc-credit',
          name: 'Pro-Limit Credit Ledger',
          type: 'credit',
          balance: creditVal,
          lastFour: '3024',
          available: true
        });
      }

      let investAcc = allUsers[targetIdx].accounts.find(a => a.type === 'investment');
      if (investAcc) {
        investAcc.balance = investVal;
      } else {
        allUsers[targetIdx].accounts.push({
          id: 'acc-investment',
          name: 'Wealth Arbitrage Lock',
          type: 'investment',
          balance: investVal,
          lastFour: '1337',
          available: true
        });
      }

      // Update personal details
      allUsers[targetIdx].legalFirstName = editUserFirstName.trim();
      allUsers[targetIdx].middleName = editUserMiddleName.trim();
      allUsers[targetIdx].legalLastName = editUserLastName.trim();
      allUsers[targetIdx].name = `${editUserFirstName.trim()} ${editUserMiddleName.trim() ? editUserMiddleName.trim() + ' ' : ''}${editUserLastName.trim()}`.trim() || allUsers[targetIdx].name;
      allUsers[targetIdx].email = editUserEmail.trim();
      allUsers[targetIdx].phoneNumber = editUserPhone.trim();
      allUsers[targetIdx].country = editUserCountry.trim();
      allUsers[targetIdx].role = editUserRole;
      allUsers[targetIdx].iban = editUserIban.trim();
      if (editUserPin.trim()) {
        allUsers[targetIdx].transactionPin = editUserPin.trim();
      }
      if (editUserPassword.trim()) {
        allUsers[targetIdx].password = editUserPassword.trim();
      }

      saveUsersData(allUsers, selectedEditUser.id);

      // Sync update back to Firestore if in Firebase mode
      try {
        const { getActiveMode } = await import('../../dbService');
        const { db } = await import('../../firebase');
        const { doc, setDoc } = await import('firebase/firestore');

        if (getActiveMode() === 'firebase' && db) {
          console.log('[Firebase Admin Action] Updating user doc in Firestore:', selectedEditUser.id);
          const userRef = doc(db, 'users', selectedEditUser.id);
          const cleanUser = JSON.parse(JSON.stringify(allUsers[targetIdx]));
          await setDoc(userRef, cleanUser, { merge: true });
          console.log('[Firebase Admin Action] Sync successful.');
        }
      } catch (err) {
        console.warn('[Firebase Sync Warning] Failed to update Firestore profile: ', err);
      }

      addAuditLog(
        currentAdmin.username, 
        currentAdmin.id, 
        'USER_ACCOUNT_ADMIN_MOD', 
        `Overrode balances and profile configs for registered user: ${selectedEditUser.username}`
      );

      setEditSuccessMsg(`Successfully updated balances and profile settings for user "${selectedEditUser.name}"!`);
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
        saveUsersData(updatedUsers, undefined, true);

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

            // Specialized balance adjustments for custom transaction flows requested:
            // 1. Investment funding
            if (transaction.id.startsWith('tx-inv-') || transaction.description.includes('Funded ')) {
              const investmentAcc = allUsers[userIdx].accounts.find(a => a.type === 'investment');
              if (investmentAcc) {
                // If checking gets deducted by `adjustment` (which is negative), investment gets positive `adjustment`
                investmentAcc.balance += -adjustment;
              }
            }

            // 2. Internal Transfer destination credit rule
            if (transaction.id.startsWith('tx-trsf-') && transaction.description.startsWith('Transfer to ')) {
              const destName = transaction.description.replace('Transfer to ', '').trim();
              const destAcc = allUsers[userIdx].accounts.find(a => a.name === destName);
              if (destAcc) {
                if (newStatus === 'successful') {
                  destAcc.balance += Math.abs(transaction.amount);
                } else if (newStatus === 'declined' || newStatus === 'pending') {
                  destAcc.balance -= Math.abs(transaction.amount);
                }
              }
            }

            // 3. P2P send recipient credit rule
            if (transaction.id.startsWith('tx-p2p-send-') && transaction.description.includes('@')) {
              const recipientPart = transaction.description.split('@')[1]?.trim();
              if (recipientPart) {
                const receiverIdx = allUsers.findIndex(u => u.username.toLowerCase() === recipientPart.toLowerCase());
                if (receiverIdx !== -1) {
                  const receiverAcc = allUsers[receiverIdx].accounts.find(a => a.type === 'checking');
                  if (receiverAcc) {
                    if (newStatus === 'successful') {
                      receiverAcc.balance += Math.abs(transaction.amount);
                      // Add a transaction record for receiver too
                      const recvTx: Transaction = {
                        id: `tx-p2p-recv-${Date.now()}`,
                        description: `P2P recv from @${allUsers[userIdx].username}`,
                        amount: Math.abs(transaction.amount),
                        date: transaction.date,
                        timestamp: Date.now(),
                        category: 'transfer',
                        status: 'successful'
                      };
                      allUsers[receiverIdx].transactions = [recvTx, ...allUsers[receiverIdx].transactions];
                    } else if (newStatus === 'declined' || newStatus === 'pending') {
                      receiverAcc.balance -= Math.abs(transaction.amount);
                    }
                  }
                }
              }
            }

            // 4. Savings Vault goals funding rule
            if (transaction.id.startsWith('tx-vault-') && transaction.description.includes('Funded Vault:')) {
              const vaultName = transaction.description.replace('Funded Vault:', '').trim();
              if (allUsers[userIdx].savingsGoals) {
                const goal = allUsers[userIdx].savingsGoals.find(g => g.name === vaultName);
                if (goal) {
                  if (newStatus === 'successful') {
                    goal.currentAmount += Math.abs(transaction.amount);
                  } else if (newStatus === 'declined' || newStatus === 'pending') {
                    goal.currentAmount -= Math.abs(transaction.amount);
                  }
                }
              }
            }
          }
          
          transaction.status = newStatus;
          transaction.approvedByAdminId = currentAdmin.id;
          transaction.approvedByAdminName = currentAdmin.name || currentAdmin.username;
          transaction.approvalTimestamp = Date.now();
          saveUsersData(allUsers, userId);

          // If the status is approved and becomes successful, send confirmation alert email
          if (newStatus === 'successful') {
            const flowDirection = transaction.amount >= 0 ? 'credit' : 'debit';
            notificationService.sendTransactionAlert(
              allUsers[userIdx],
              transaction.amount,
              `${transaction.description} (Approved by Security Command)`,
              flowDirection
            ).catch(err => console.error("Error sending admin approval alert email:", err));

            // Run automated approval clearance notification
            notificationService.sendApprovalDecisionAlert(
              allUsers[userIdx],
              transaction,
              'approved',
              currentAdmin.name || currentAdmin.username
            ).catch(err => console.error("Error sending admin approval notification:", err));
          } else if (newStatus === 'declined') {
            notificationService.sendTransactionAlert(
              allUsers[userIdx],
              transaction.amount,
              `DECLINED: ${transaction.description}`,
              transaction.amount >= 0 ? 'credit' : 'debit'
            ).catch(err => console.error("Error sending admin declining action notification:", err));

            // Run automated rejection clearance notification
            notificationService.sendApprovalDecisionAlert(
              allUsers[userIdx],
              transaction,
              'rejected',
              currentAdmin.name || currentAdmin.username
            ).catch(err => console.error("Error sending admin rejection notification:", err));
          }
          
          addAuditLog(
            currentAdmin.username,
            currentAdmin.id,
            'TX_STATUS_CHANGE',
            `Changed status of tx "${transaction.description}" (${txId}) for ${allUsers[userIdx].name} to ${newStatus.toUpperCase()}. Applied adjustment of $${adjustment.toFixed(2)} to ${allUsers[userIdx].accounts.find(a => a.id === transaction.targetAccountId)?.name || 'Checking Account'}`,
            'success',
            {
              targetTxId: txId,
              approvedByAdminId: currentAdmin.id,
              approvedByAdminName: currentAdmin.name || currentAdmin.username,
              approvalTimestamp: new Date().toISOString()
            }
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

            <button
              onClick={() => setActiveTab('firebase_engine')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'firebase_engine'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>📡</span> Firebase Command
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
      <div className="bg-white border-b border-slate-200 grid grid-cols-3 sm:flex py-1 shadow-sm">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 text-xs font-bold text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
            activeTab === 'users' ? 'text-indigo-600 border-indigo-500 bg-indigo-50/20 font-bold' : 'text-slate-400 border-transparent hover:text-slate-600'
          }`}
          id="admin-tab-users"
        >
          <Users className="w-4 h-4" /> Users
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`py-3 text-xs font-bold text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
            activeTab === 'transactions' ? 'text-indigo-600 border-indigo-500 bg-indigo-50/20 font-bold' : 'text-slate-400 border-transparent hover:text-slate-600'
          }`}
          id="admin-tab-transactions"
        >
          <Layers className="w-4 h-4" /> Transactions
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-3 text-xs font-bold text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
            activeTab === 'analytics' ? 'text-indigo-600 border-indigo-500 bg-indigo-50/20 font-bold' : 'text-slate-400 border-transparent hover:text-slate-600'
          }`}
          id="admin-tab-analytics"
        >
          <BarChart className="w-4 h-4" /> Analytics
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3 text-xs font-bold text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
            activeTab === 'reports' ? 'text-indigo-600 border-indigo-500 bg-indigo-50/20 font-bold' : 'text-slate-400 border-transparent hover:text-slate-655 hover:text-slate-600'
          }`}
          id="admin-tab-reports"
        >
          <ShieldAlert className="w-4 h-4" /> Trails
        </button>

        <button
          onClick={() => setActiveTab('deposits_control')}
          className={`py-3 text-xs font-bold text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
            activeTab === 'deposits_control' ? 'text-indigo-600 border-indigo-500 bg-indigo-50/20 font-bold' : 'text-slate-400 border-transparent hover:text-slate-600'
          }`}
          id="admin-tab-deposits"
        >
          <SettingsIcon className="w-4 h-4" /> Configs
        </button>

        <button
          onClick={() => setActiveTab('firebase_engine')}
          className={`py-3 text-xs font-bold text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
            activeTab === 'firebase_engine' ? 'text-indigo-600 border-indigo-500 bg-indigo-50/20 font-bold' : 'text-slate-400 border-transparent hover:text-slate-600'
          }`}
          id="admin-tab-firebase"
        >
          📡 Firebase
        </button>
      </div>

      <main className="flex-grow p-5 max-w-lg w-full mx-auto pb-10">

        {/* 📡 Live Firebase Cloud Sync status */}
        {syncStatus && (
          <div className="mb-4 p-3 bg-indigo-50/90 border border-indigo-200 text-indigo-800 rounded-xl text-xs flex items-center justify-between shadow-xs animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-base text-indigo-600">📡</span>
              <span className="font-semibold font-mono">{syncStatus}</span>
            </div>
            {isSyncing && (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            )}
          </div>
        )}

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
                              setCheckingInputBalance((u.accounts.find(a => a.type === 'checking')?.balance || 0).toString());
                              setSavingsInputBalance((u.accounts.find(a => a.type === 'savings')?.balance || 0).toString());
                              setCreditInputBalance((u.accounts.find(a => a.type === 'credit')?.balance || 0).toString());
                              setInvestInputBalance((u.accounts.find(a => a.type === 'investment')?.balance || 0).toString());
                              
                              const names = u.name.split(' ');
                              setEditUserFirstName(u.legalFirstName || names[0] || '');
                              setEditUserMiddleName(u.middleName || '');
                              setEditUserLastName(u.legalLastName || names.slice(1).join(' ') || '');
                              setEditUserEmail(u.email || '');
                              setEditUserPhone(u.phoneNumber || '');
                              setEditUserCountry(u.country || '');
                              setEditUserRole(u.role || 'user');
                              setEditUserPin(u.transactionPin || '');
                              setEditUserPassword(u.password || '');
                              setEditUserIban(u.iban || '');
                            }}
                            className="text-[10px] bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition font-mono font-bold px-2.5 py-1 rounded-lg text-indigo-700 cursor-pointer shadow-xs"
                          >
                            Manage Profile & Accounts
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
          <form onSubmit={handleModifyBalances} className="space-y-6 border border-slate-200 p-6 rounded-2xl bg-white shadow-xl animate-fade-in text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedEditUser.avatarUrl} 
                  alt={selectedEditUser.name} 
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Manage Registry Workspace: {selectedEditUser.name}
                  </h3>
                  <p className="text-[10px] text-indigo-600 font-mono font-medium">@{selectedEditUser.username || 'n/a'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEditUser(null)}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer"
              >
                Cancel / Return
              </button>
            </div>

            {/* General Layout Split: Left columns details, right column accounts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Personal Registry Details & Account Settings */}
              <div className="space-y-4">
                <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-150 space-y-3">
                  <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider font-mono">1. User Registry Information</span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Legal First Name</label>
                      <input
                        type="text"
                        required
                        value={editUserFirstName}
                        onChange={(e) => setEditUserFirstName(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-2 px-2.5 text-xs font-semibold rounded-lg text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Middle Name</label>
                      <input
                        type="text"
                        value={editUserMiddleName}
                        onChange={(e) => setEditUserMiddleName(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-2 px-2.5 text-xs font-semibold rounded-lg text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Legal Last Name</label>
                      <input
                        type="text"
                        required
                        value={editUserLastName}
                        onChange={(e) => setEditUserLastName(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-2 px-2.5 text-xs font-semibold rounded-lg text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Registry Email</label>
                      <input
                        type="email"
                        required
                        value={editUserEmail}
                        onChange={(e) => setEditUserEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-2 px-2.5 text-xs font-semibold rounded-lg text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Phone Identifier</label>
                      <input
                        type="text"
                        value={editUserPhone}
                        onChange={(e) => setEditUserPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-2 px-2.5 text-xs font-semibold rounded-lg text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Residing Country</label>
                      <input
                        type="text"
                        value={editUserCountry}
                        onChange={(e) => setEditUserCountry(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-2 px-2.5 text-xs font-semibold rounded-lg text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">IBAN Ledger ID</label>
                      <input
                        type="text"
                        value={editUserIban}
                        onChange={(e) => setEditUserIban(e.target.value)}
                        placeholder="e.g. DE89 3704 ..."
                        className="w-full bg-white border border-slate-200 py-2 px-2.5 text-xs font-semibold rounded-lg text-slate-800 outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-150 space-y-3">
                  <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider font-mono font-sans flex items-center justify-between">2. Access Credentials & Permissions</span>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Role Status</label>
                      <select
                        value={editUserRole}
                        onChange={(e) => setEditUserRole(e.target.value as 'user' | 'admin')}
                        className="w-full bg-white border border-slate-200 py-2 px-2 text-xs font-semibold rounded-lg text-slate-800 outline-none shadow-2xs"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Transaction PIN</label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="e.g. 1928"
                        value={editUserPin}
                        onChange={(e) => setEditUserPin(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-2 px-2.5 text-xs font-bold rounded-lg text-indigo-700 outline-none font-mono tracking-widest text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Reset Password</label>
                      <input
                        type="text"
                        placeholder="New Password"
                        value={editUserPassword}
                        onChange={(e) => setEditUserPassword(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-2 px-2.5 text-xs font-semibold rounded-lg text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Multi-Account Ledger Balances Control */}
              <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-150 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider font-mono">3. Banking Reserves Control Panel</span>
                  <p className="text-[9px] text-slate-500 mt-0.5 mb-3 leading-normal font-sans">Directly override specific accounts' balances in this user's bank ledger portfolio.</p>

                  <div className="grid grid-cols-2 gap-3 pb-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-520 font-mono">Primary Checking Reserve ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={checkingInputBalance}
                        onChange={(e) => setCheckingInputBalance(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs font-extrabold font-mono text-slate-850 rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-520 font-mono">Vault Savings Reserve ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={savingsInputBalance}
                        onChange={(e) => setSavingsInputBalance(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs font-extrabold font-mono text-slate-850 rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-520 font-mono">Pro-Limit Credit Balance ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={creditInputBalance}
                        onChange={(e) => setCreditInputBalance(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs font-extrabold font-mono text-slate-850 rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-520 font-mono">Wealth Arbitrage Reserve ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={investInputBalance}
                        onChange={(e) => setInvestInputBalance(e.target.value)}
                        className="w-full bg-white border border-slate-200 py-2.5 px-3 text-xs font-extrabold font-mono text-slate-850 rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/60 flex gap-2 font-sans">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition duration-150 shadow-xs cursor-pointer text-center"
                  >
                    Apply All Administrative Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedEditUser.cards && selectedEditUser.cards.length > 0) {
                        const allUsers = loadUsersData();
                        const idx = allUsers.findIndex(u => u.id === selectedEditUser.id);
                        if (idx !== -1 && allUsers[idx].cards && allUsers[idx].cards[0]) {
                          const wasFrozen = allUsers[idx].cards[0].isFrozen;
                          allUsers[idx].cards[0].isFrozen = !wasFrozen;
                          saveUsersData(allUsers, selectedEditUser.id);
                          refreshLocalState();
                          alert(`Credit Card status for ${selectedEditUser.name} set to: ${!wasFrozen ? 'FROZEN' : 'ACTIVE'}`);
                        }
                      } else {
                        alert("No active credit card found for this user.");
                      }
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-3.5 rounded-xl text-xs transition cursor-pointer border border-slate-200/60"
                    title="Toggle freeze/unfreeze first credit card"
                  >
                    Toggle Card Lock
                  </button>
                </div>
              </div>
            </div>
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

        {/* TAB 6: FIREBASE ZERO-TRUST CLOUD PLATFORM CONTROLLER */}
        {activeTab === 'firebase_engine' && (
          <div className="space-y-6 animate-fade-in text-slate-800 text-left">
            <div>
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider text-left">📡 Firebase Cloud Console</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 text-left font-sans">
                Admin cluster orchestration. Run SQL-to-NoSQL queries, dispatch security alerts & monitor rule integrity.
              </p>
            </div>

            {/* Sub-Card 1: Relational SQL Compiler for NoSQL Firestore */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  📁 Relational SQL runner
                </span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-mono font-bold rounded-sm border border-emerald-200 animate-pulse">
                  SECURE COMPILER ONLINE
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider block">Write SQL SELECT Statement</label>
                <div className="font-mono text-xs text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-2">
                  <div className="text-[10px] text-indigo-400"># Available relational views: users, transactions, audit_logs, system_configs</div>
                  <textarea
                    rows={2}
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    className="w-full bg-transparent border-none text-blue-400 outline-none resize-none font-mono py-1 placeholder-blue-900 leading-relaxed max-w-full"
                    placeholder="SELECT * FROM users WHERE checking_balance > 100;"
                  />
                  <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-900">
                    <button
                      type="button"
                      onClick={() => setSqlQuery('SELECT * FROM users;')}
                      className="px-2 py-1 hover:bg-slate-900 text-[10px] text-slate-400 rounded transition cursor-pointer border-none font-mono"
                    >
                      Query Users
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlQuery('SELECT * FROM transactions WHERE amount > 500;')}
                      className="px-2 py-1 hover:bg-slate-900 text-[10px] text-slate-400 rounded transition cursor-pointer border-none font-mono"
                    >
                      Query High Tx
                    </button>
                    <button
                      type="button"
                      onClick={runSqlQuery}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg cursor-pointer transition border-none font-mono"
                    >
                      EXECUTE SQL
                    </button>
                  </div>
                </div>
              </div>

              {/* SQL Result Area */}
              {sqlError && (
                <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-rose-700 text-[10px] font-mono leading-relaxed">
                  ⚠️ <strong>SQL Exec Compiling Error:</strong> {sqlError}
                </div>
              )}

              {sqlResult && (
                <div className="space-y-2 font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase text-left font-mono">
                      Query Results ({sqlResult.length} rows fetched)
                    </span>
                    <button
                      type="button"
                      onClick={() => setSqlResult(null)}
                      className="text-slate-400 hover:text-slate-600 text-[9px] border-none font-sans font-bold cursor-pointer bg-none"
                    >
                      Clear
                    </button>
                  </div>

                  {sqlResult.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-[10px] font-sans">
                      SQL execution completed successfully. Zero matching records returned.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-4xs font-mono max-h-60">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold">
                            {Object.keys(sqlResult[0]).slice(0, 5).map((col) => (
                              <th key={col} className="p-2 py-1.5">{col}</th>
                            ))}
                            {Object.keys(sqlResult[0]).length > 5 && <th className="p-2 py-1.5">More...</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-705">
                          {sqlResult.slice(0, 15).map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50/50">
                              {Object.entries(row).slice(0, 5).map(([key, val], cIdx) => (
                                <td key={cIdx} className="p-2 py-1.5 truncate max-w-[120px] font-mono text-slate-755">
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </td>
                              ))}
                              {Object.keys(row).length > 5 && (
                                <td className="p-2 py-1.5 text-[9px] text-slate-400 italic">
                                  + {Object.keys(row).length - 5} cols
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sub-Card 2: Database Alerts & Notifications Dispatcher */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  🔔 DB Alerts & Notifications Dispatcher
                </span>
                <span className="text-[10px] font-mono text-indigo-500 font-bold">SMTP / IN-APP</span>
              </div>

              {alertDispatchMsg && (
                <div className="p-3 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-xl text-[11px] leading-relaxed font-sans font-semibold">
                  {alertDispatchMsg}
                </div>
              )}

              <form onSubmit={handleDispatchAlert} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider block">Target Ledger User</label>
                  <select
                    value={alertTargetUser}
                    onChange={(e) => setAlertTargetUser(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 outline-none focus:border-indigo-500 font-sans"
                  >
                    <option value="all">🌐 Broadcast to All Active Users (Broadband Channel)</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>👤 @{u.username} ({u.name})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 text-left">
                    <label className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider block">Alert Severity Class</label>
                    <select
                      value={alertCategory}
                      onChange={(e: any) => setAlertCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 outline-none focus:border-indigo-500 font-sans"
                    >
                      <option value="security">🔒 SECURITY RISK NOTICE</option>
                      <option value="otp">🔑 TWO-FACTOR MANDATE (OTP)</option>
                      <option value="transaction">💸 LEDGER CAPITAL CLEARANCE</option>
                      <option value="biller">📅 SCHEDULED SYSTEM EVENT</option>
                      <option value="registration">🚀 GENERAL BROADCAST</option>
                    </select>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider block">Action Channel</label>
                    <div className="w-full bg-slate-100 border border-slate-202 rounded-xl py-2 px-3 text-[11px] text-slate-600 font-mono font-bold leading-normal">
                      Email + In-App Push
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-indigo-605 font-extrabold uppercase tracking-wider block justify-start">Subject / Alert Header</label>
                  <input
                    type="text"
                    required
                    value={alertTitle}
                    onChange={(e) => setAlertTitle(e.target.value)}
                    placeholder="e.g. Critical Account Policy Alert"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 outline-none focus:border-indigo-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-indigo-605 font-extrabold uppercase tracking-wider block">Security Alert message (JSON & HTML compatible)</label>
                  <textarea
                    rows={3}
                    required
                    value={alertBody}
                    onChange={(e) => setAlertBody(e.target.value)}
                    placeholder="Supply complete guidelines layout instructions..."
                    className="w-full bg-slate-50 border border-slate-205 rounded-xl py-2 px-3 text-xs text-slate-805 outline-none focus:border-indigo-500 font-sans leading-relaxed resize-y border-slate-200"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md border-none cursor-pointer transition"
                  >
                    🚀 Broadcast Firebase Alert
                  </button>
                </div>
              </form>
            </div>

            {/* Sub-Card 3: Security & Rule Status Auditor */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  🛡️ Security Rules Compliance Index
                </span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">
                  8-PILLAR ARCHITECTURE
                </span>
              </div>

              <p className="text-[11px] text-slate-500 font-sans leading-normal">
                An active auditing checklist showing how the database complies with zero-trust Firestore Security rules.
              </p>

              <div className="grid grid-cols-1 gap-2.5 font-sans">
                {[
                  { name: 'Pillar 1: Relational Sync (The Master Gate)', desc: 'Blocks isolated writes by evaluating parent members arrays.', state: 'Active' },
                  { name: 'Pillar 2: Schema Integrity (Anti-Update-Gap)', desc: 'Prevents Ghost Fields by rejecting mismatched payload lengths.', state: 'Active' },
                  { name: 'Pillar 3: Path ID Poisoning protection', desc: 'Validates document ID strings using alphanumeric regex filters.', state: 'Active' },
                  { name: 'Pillar 4: Tiered Identity Privileges', desc: 'Isolates and restricts critical admin properties from user updates.', state: 'Active' },
                  { name: 'Pillar 5: Unbounded List Array constraints', desc: 'Strict size limitations on all secondary array indices.', state: 'Active' },
                  { name: 'Pillar 6: Personal Identifiable Information (PII) Isolation', desc: 'Enforces owner-only scope bounds for phone and addresses.', state: 'Active' },
                  { name: 'Pillar 7: The Atomicity Sync Safeguard', desc: 'Enforces multi-document batches using existsAfter guards.', state: 'Active' },
                  { name: 'Pillar 8: Query Enforcer Secure Lists', desc: 'Blocks collection scraping by evaluating rules on resource.data.', state: 'Active' },
                ].map((p, idx) => (
                  <div key={idx} className="flex gap-2 p-2 px-3 bg-slate-50 border border-slate-100 rounded-xl items-start">
                    <span className="text-emerald-500 font-black">✓</span>
                    <div className="flex-grow">
                      <p className="text-xs font-black text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{p.desc}</p>
                    </div>
                    <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded uppercase border border-emerald-150">
                      Enforced
                    </span>
                  </div>
                ))}
              </div>

              {/* Real-time Firewall Audit log */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wide block font-mono">
                  🔥 Active Firewall Activity Telemetry
                </span>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-[9px] text-yellow-500 leading-normal space-y-1 bg-stone-900 max-h-40 overflow-y-auto">
                  <p className="text-slate-500 font-bold"># System Audit Firewalls syncing stream live...</p>
                  <p><span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> <span className="text-emerald-400">[PASSED]</span> Temporal validation checks completed successfully on transactions</p>
                  <p><span className="text-slate-500">[{new Date(Date.now() - 3600000).toLocaleTimeString()}]</span> <span className="text-rose-500">[BLOCKED]</span> Attempt (Shadow Update) rejected with incorrect key size on users/private</p>
                  <p><span className="text-slate-500">[{new Date(Date.now() - 7200000).toLocaleTimeString()}]</span> <span className="text-emerald-400">[SECURED]</span> List criteria validation passed on auditLogs for Admin profile</p>
                  <p><span className="text-slate-500">[{new Date(Date.now() - 10800000).toLocaleTimeString()}]</span> <span className="text-rose-500">[BLOCKED]</span> Anonymous reader query attempt blocked by default global safety net</p>
                </div>
              </div>
            </div>
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
