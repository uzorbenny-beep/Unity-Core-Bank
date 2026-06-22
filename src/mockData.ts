/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BankUser, AuditLog } from './types';

export function getRelativeDateString(hoursOrDaysAgo: number, isDays: boolean = false): string {
  const msAgo = isDays ? hoursOrDaysAgo * 24 * 60 * 60 * 1000 : hoursOrDaysAgo * 60 * 60 * 1000;
  const date = new Date(Date.now() - msAgo);
  const tz = (typeof localStorage !== 'undefined' ? localStorage.getItem('user_timezone') : null) || undefined;
  
  if (msAgo < 24 * 60 * 60 * 1000) {
    // Check if it is the same calendar day relative to current timezone
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', { timeZone: tz === 'auto' ? undefined : tz, year: 'numeric', month: 'numeric', day: 'numeric' });
    const dateStr = date.toLocaleDateString('en-US', { timeZone: tz === 'auto' ? undefined : tz, year: 'numeric', month: 'numeric', day: 'numeric' });
    
    if (todayStr === dateStr) {
      return 'Today, ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: tz === 'auto' ? undefined : tz });
    } else {
      return 'Yesterday, ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: tz === 'auto' ? undefined : tz });
    }
  } else if (msAgo < 48 * 60 * 60 * 1000) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', timeZone: tz === 'auto' ? undefined : tz });
  }
}

export function formatLocalTimestamp(date: Date): string {
  const tz = (typeof localStorage !== 'undefined' ? localStorage.getItem('user_timezone') : null) || undefined;
  
  try {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: tz === 'auto' ? undefined : tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return formatter.format(date).replace('T', ' ');
  } catch (e) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  }
}

export function formatTransactionDate(timestampOrDate: number | Date | string | undefined): string {
  const tz = (typeof localStorage !== 'undefined' ? localStorage.getItem('user_timezone') : null) || undefined;
  
  if (!timestampOrDate) {
    const now = new Date();
    return 'Today, ' + now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: tz === 'auto' ? undefined : tz });
  }
  const date = (typeof timestampOrDate === 'number' || typeof timestampOrDate === 'string') 
    ? new Date(timestampOrDate) 
    : timestampOrDate;
  
  if (isNaN(date.getTime())) {
    const now = new Date();
    return 'Today, ' + now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: tz === 'auto' ? undefined : tz });
  }

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-US', { timeZone: tz === 'auto' ? undefined : tz, year: 'numeric', month: 'numeric', day: 'numeric' });
  const dateStrOnly = date.toLocaleDateString('en-US', { timeZone: tz === 'auto' ? undefined : tz, year: 'numeric', month: 'numeric', day: 'numeric' });
  
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-US', { timeZone: tz === 'auto' ? undefined : tz, year: 'numeric', month: 'numeric', day: 'numeric' });

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: tz === 'auto' ? undefined : tz });
  if (dateStrOnly === todayStr) {
    return 'Today, ' + timeStr;
  } else if (dateStrOnly === yesterdayStr) {
    return 'Yesterday, ' + timeStr;
  } else {
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', timeZone: tz === 'auto' ? undefined : tz });
    return `${dateStr}, ${timeStr}`;
  }
}

// Standard James user representing Screen 1, 2, 3, 4
export const INITIAL_USER: BankUser = {
  id: 'user-james',
  username: 'james',
  email: 'james@unitycore.com',
  name: 'James',
  role: 'user',
  unreadNotifications: 2,
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop', // James portrait from Screen 4
  registrationTimestamp: new Date('2026-05-24T12:00:00-07:00').getTime(),
  accounts: [
    {
      id: 'acc-checking',
      name: 'Checking Account',
      type: 'checking',
      balance: 88732.45,
      lastFour: '4567',
      available: true
    },
    {
      id: 'acc-savings',
      name: 'Savings Account',
      type: 'savings',
      balance: 120450.75,
      lastFour: '8923',
      available: true
    },
    {
      id: 'acc-credit',
      name: 'Credit Card',
      type: 'credit',
      balance: -1325.50, // outstanding balance
      lastFour: '2345',
      available: true
    },
    {
      id: 'acc-investment',
      name: 'Investment Account',
      type: 'investment',
      balance: 18489.05,
      lastFour: '7412',
      available: true
    }
  ],
  cards: [
    {
      id: 'card-1',
      cardholderName: 'JAMES COOPER',
      cardNumber: '•••• •••• •••• 2345',
      expiryDate: '09/29',
      cvv: '372',
      isFrozen: false,
      limit: 15000,
      balanceOutline: 1325.50
    },
    {
      id: 'card-2',
      cardholderName: 'JAMES COOPER',
      cardNumber: '•••• •••• •••• 4567',
      expiryDate: '12/28',
      cvv: '109',
      isFrozen: true,
      limit: 10000,
      balanceOutline: 0
    }
  ],
  transactions: [
    {
      id: 'tx-1',
      description: 'Starbucks Coffee',
      amount: -4.75,
      date: getRelativeDateString(2),
      timestamp: Date.now() - 3600000 * 2, // 2 hours ago
      category: 'coffee',
      status: 'successful'
    },
    {
      id: 'tx-2',
      description: 'Amazon.com',
      amount: -89.99,
      date: getRelativeDateString(4),
      timestamp: Date.now() - 3600000 * 4,
      category: 'shopping',
      status: 'pending'
    },
    {
      id: 'tx-3',
      description: 'Salary Deposit',
      amount: 38250.00,
      date: getRelativeDateString(8),
      timestamp: Date.now() - 3600000 * 8,
      category: 'salary',
      status: 'successful'
    },
    {
      id: 'tx-4',
      description: 'Uber Ride',
      amount: -18.45,
      date: getRelativeDateString(1, true),
      timestamp: Date.now() - 24 * 3600000,
      category: 'transport'
    },
    {
      id: 'tx-5',
      description: 'Whole Foods',
      amount: -760.23,
      date: getRelativeDateString(2, true),
      timestamp: Date.now() - 2 * 24 * 3600000,
      category: 'food'
    },
    {
      id: 'tx-6',
      description: 'Apple Subscription',
      amount: -14.99,
      date: getRelativeDateString(4, true),
      timestamp: Date.now() - 4 * 24 * 3600000,
      category: 'shopping'
    },
    {
      id: 'tx-7',
      description: 'Netflix Premium',
      amount: -22.99,
      date: getRelativeDateString(8, true),
      timestamp: Date.now() - 8 * 24 * 3600000,
      category: 'shopping'
    },
    {
      id: 'tx-8',
      description: 'Gym Membership',
      amount: -75.00,
      date: getRelativeDateString(15, true),
      timestamp: Date.now() - 15 * 24 * 3600000,
      category: 'other'
    },
    {
      id: 'tx-u1',
      description: 'Electric Bill Payment',
      amount: -145.20,
      date: getRelativeDateString(4, true),
      timestamp: Date.now() - 4 * 24 * 3600000,
      category: 'utilities',
      status: 'declined'
    },
    {
      id: 'tx-u2',
      description: 'Cinema City Tickets',
      amount: -34.50,
      date: getRelativeDateString(5, true),
      timestamp: Date.now() - 5 * 24 * 3600000,
      category: 'entertainment',
      status: 'successful'
    },
    {
      id: 'tx-u3',
      description: 'Delta Air Lines Flight',
      amount: -450.00,
      date: getRelativeDateString(10, true),
      timestamp: Date.now() - 10 * 24 * 3600000,
      category: 'travel',
      status: 'successful'
    }
  ]
};

export const INITIAL_ADMIN: BankUser = {
  id: 'admin-core',
  username: 'admin',
  email: 'admin@unitycore.bank',
  name: 'Admin Controller',
  role: 'admin',
  unreadNotifications: 5,
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop',
  accounts: [],
  cards: [],
  transactions: []
};

export const INITIAL_CREDENCE_USER: BankUser = {
  id: 'user-credence',
  username: 'user',
  email: 'user@mail.com',
  name: 'Frank Credence',
  role: 'user',
  unreadNotifications: 3,
  avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop',
  accounts: [
    {
      id: 'acc-checking-credence',
      name: 'Primary Checking Wallet',
      type: 'checking',
      balance: 148560.25,
      lastFour: '8834',
      available: true
    },
    {
      id: 'acc-savings-credence',
      name: 'High Yield Savings Escrow',
      type: 'savings',
      balance: 320950.80,
      lastFour: '1244',
      available: true
    },
    {
      id: 'acc-credit-credence',
      name: 'Infinite Titanium Credit',
      type: 'credit',
      balance: -450.00,
      lastFour: '9088',
      available: true
    },
    {
      id: 'acc-investment-credence',
      name: 'Dynamic Investment Vault',
      type: 'investment',
      balance: 64800.00,
      lastFour: '3310',
      available: true
    }
  ],
  cards: [
    {
      id: 'card-credence-1',
      cardholderName: 'FRANK CREDENCE',
      cardNumber: '•••• •••• •••• 9088',
      expiryDate: '11/30',
      cvv: '124',
      isFrozen: false,
      limit: 50000,
      balanceOutline: 450.00
    },
    {
      id: 'card-credence-2',
      cardholderName: 'FRANK CREDENCE',
      cardNumber: '•••• •••• •••• 1234',
      expiryDate: '05/31',
      cvv: '372',
      isFrozen: false,
      limit: 30000,
      balanceOutline: 0
    }
  ],
  transactions: [
    {
      id: 'tx-cre-1',
      description: 'Investment Yield Dispatched',
      amount: 4500.00,
      date: getRelativeDateString(0.33), // 20 mins ago
      timestamp: Date.now() - 1200000,
      category: 'salary'
    },
    {
      id: 'tx-cre-2',
      description: 'Cryptocurrency Wallet Funded',
      amount: -12000.00,
      date: getRelativeDateString(24),
      timestamp: Date.now() - 86400000,
      category: 'transfer'
    },
    {
      id: 'tx-cre-3',
      description: 'Capital Grant Stimulus Credit',
      amount: 45000.00,
      date: getRelativeDateString(2, true),
      timestamp: Date.now() - 2 * 24 * 3600000,
      category: 'salary'
    },
    {
      id: 'tx-cre-4',
      description: 'Amazon AWS Cloud Server',
      amount: -188.45,
      date: getRelativeDateString(3, true),
      timestamp: Date.now() - 3 * 24 * 3600000,
      category: 'shopping'
    },
    {
      id: 'tx-cre-5',
      description: 'Metropolitan Water District',
      amount: -85.30,
      date: getRelativeDateString(4, true),
      timestamp: Date.now() - 4 * 24 * 3600000,
      category: 'utilities'
    },
    {
      id: 'tx-cre-6',
      description: 'Broadway Theatre NYC',
      amount: -250.00,
      date: getRelativeDateString(6, true),
      timestamp: Date.now() - 6 * 24 * 3600000,
      category: 'entertainment'
    },
    {
      id: 'tx-cre-7',
      description: 'Hilton Resorts Booking',
      amount: -1250.00,
      date: getRelativeDateString(9, true),
      timestamp: Date.now() - 9 * 24 * 3600000,
      category: 'travel'
    }
  ]
};

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: formatLocalTimestamp(new Date(Date.now() - 30 * 60000)),
    userId: 'user-james',
    username: 'james',
    action: 'LOGIN_SUCCESS',
    details: 'User logged in successfully via Web Console',
    status: 'success'
  },
  {
    id: 'log-2',
    timestamp: formatLocalTimestamp(new Date(Date.now() - 3 * 3600000)),
    userId: 'user-james',
    username: 'james',
    action: 'TRANSFER_EXEC',
    details: 'Transferred $5,000.00 from Savings Account direct to Checking Account',
    status: 'success'
  },
  {
    id: 'log-3',
    timestamp: formatLocalTimestamp(new Date(Date.now() - 1 * 24 * 3600000)),
    userId: 'admin-core',
    username: 'admin',
    action: 'SYSTEM_BACKUP',
    details: 'Daily balance reconciliation complete. Transaction logs matching Spanner DB.',
    status: 'success'
  },
  {
    id: 'log-4',
    timestamp: formatLocalTimestamp(new Date(Date.now() - 2 * 24 * 3600000)),
    userId: 'user-james',
    username: 'james',
    action: 'CARD_FREEZE_TOGGLE',
    details: 'Card ending in 4567 set to FROZEN',
    status: 'warning'
  }
];

// Helper to interact with LocalStorage
export function loadUsersData(): BankUser[] {
  const data = localStorage.getItem('unitycore_users');
  if (!data) {
    const list = [INITIAL_USER, INITIAL_ADMIN, INITIAL_CREDENCE_USER];
    localStorage.setItem('unitycore_users', JSON.stringify(list));
    return list;
  }
  return JSON.parse(data);
}

export function saveUsersData(users: BankUser[], onlySyncUserId?: string, skipFirestoreSync = false) {
  localStorage.setItem('unitycore_users', JSON.stringify(users));

  // Dispatch custom state changed event to instantly notify admin / other active views in same window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('unitycore_state_changed'));
  }

  if (skipFirestoreSync) return;

  // Async sync back to Firestore for persistence
  import('./firebase').then(({ db, auth, handleFirestoreError, OperationType }) => {
    import('firebase/firestore').then(({ doc, setDoc }) => {
      const currentUid = auth.currentUser?.uid;
      if (!currentUid || !db) return;

      const currentUserInList = users.find(usr => usr.id === currentUid);
      const isCurrentUserAdmin = currentUserInList?.role === 'admin';

      users.forEach((u) => {
        // If onlySyncUserId is provided, we ONLY sync that specific user.
        // Otherwise, only sync the logged-in user (admin maps to their own doc if they aren't purposely editing a target).
        const shouldSync = onlySyncUserId 
          ? u.id === onlySyncUserId && (currentUid === u.id || isCurrentUserAdmin)
          : (currentUid === u.id || (isCurrentUserAdmin && u.id === currentUid));

        if (shouldSync) {
          const collectionName = u.role === 'admin' ? 'admins' : 'users';
          const uDoc = doc(db, collectionName, u.id);
          
          const cleanUser = {
            id: u.id,
            username: u.username,
            email: u.email,
            name: u.name,
            role: u.role,
            avatarUrl: u.avatarUrl || "",
            unreadNotifications: u.unreadNotifications || 0,
            accounts: u.accounts || [],
            cards: u.cards || [],
            savingsGoals: u.savingsGoals || [],
            billers: u.billers || [],
            supportTickets: u.supportTickets || [],
            legalFirstName: u.legalFirstName || "",
            middleName: u.middleName || "",
            legalLastName: u.legalLastName || "",
            phoneNumber: u.phoneNumber || "",
            country: u.country || "",
            typeOfAccount: u.typeOfAccount || "checking",
            currency: u.currency || "USD",
            transactionPin: u.transactionPin || "",
            password: u.password || "",
            iban: u.iban || "",
            transactions: (u.transactions || []).slice(0, 200).map(tx => ({
              id: tx.id || "",
              description: tx.description || "",
              amount: Number(tx.amount) || 0,
              date: tx.date || "",
              timestamp: Number(tx.timestamp) || Date.now(),
              category: tx.category || "",
              status: tx.status || "successful",
              targetAccountId: tx.targetAccountId || "",
              approvedByAdminId: tx.approvedByAdminId || "",
              approvedByAdminName: tx.approvedByAdminName || "",
              approvalTimestamp: tx.approvalTimestamp || 0
            }))
          };

          setDoc(uDoc, cleanUser, { merge: true }).then(() => {
            // Synchronize transaction collection
            if (u.transactions) {
              u.transactions.forEach((tx) => {
                const txDoc = doc(db, collectionName, u.id, 'transactions', tx.id);
                setDoc(txDoc, tx, { merge: true }).catch(err => {
                  handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${u.id}/transactions/${tx.id}`);
                });
              });
            }
          }).catch((err) => {
            handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${u.id}`);
          });
        }
      });
    }).catch(console.error);
  }).catch(console.error);
}

export function loadAuditLogs(): AuditLog[] {
  const data = localStorage.getItem('unitycore_audit_logs');
  if (!data) {
    localStorage.setItem('unitycore_audit_logs', JSON.stringify(INITIAL_AUDIT_LOGS));
    return INITIAL_AUDIT_LOGS;
  }
  return JSON.parse(data);
}

export function saveAuditLogs(logs: AuditLog[]) {
  localStorage.setItem('unitycore_audit_logs', JSON.stringify(logs));
}

export function addAuditLog(
  username: string,
  userId: string,
  action: string,
  details: string,
  status: 'success' | 'failed' | 'warning' = 'success',
  extraFields?: {
    targetTxId?: string;
    approvedByAdminId?: string;
    approvedByAdminName?: string;
    approvalTimestamp?: string;
  }
) {
  const logs = loadAuditLogs();
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    userId,
    username,
    action,
    details,
    status,
    ...extraFields
  };
  saveAuditLogs([newLog, ...logs]);

  // Async sync of audit logs to Firestore
  import('./firebase').then(({ db, handleFirestoreError, OperationType }) => {
    import('firebase/firestore').then(({ doc, setDoc }) => {
      const logDoc = doc(db, 'auditLogs', newLog.id);
      setDoc(logDoc, newLog).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `auditLogs/${newLog.id}`);
      });
    }).catch(console.error);
  }).catch(console.error);
}

// Deposit and withdrawal configuration structures

export interface DepositWithdrawMethodConfig {
  id: 'bank' | 'check' | 'crypto';
  name: string;
  depositEnabled: boolean;
  withdrawEnabled: boolean;
  depositInstructions: string;
  withdrawInstructions: string;
  depositFields: Record<string, string>;
}

export const DEFAULT_DEPOSIT_WITHDRAW_CONFIGS: DepositWithdrawMethodConfig[] = [
  {
    id: 'bank',
    name: 'Bank Payment (Wire Transfer)',
    depositEnabled: true,
    withdrawEnabled: true,
    depositInstructions: 'Transfer funds securely to our corporate bank account. Use your unique registration ID/email as the reference memo.',
    withdrawInstructions: 'Submit details of your personal bank account. Bank wire clearings take up to 48 hours to fully clear and settle locally.',
    depositFields: {
      'Bank Name': 'Central Autonomous Settlement Bank',
      'Account Name': 'Unitycore Sovereign Holdings LLC',
      'Routing/ABA Number': '021000021',
      'Account/IBAN': 'US93UCAS0210000219485721',
      'SWIFT/BIC Code': 'UCASHU33XXX',
      'Reference Memo (Required)': 'Please include your username: {username}'
    }
  },
  {
    id: 'check',
    name: 'Check Payment Desk',
    depositEnabled: true,
    withdrawEnabled: true,
    depositInstructions: 'Provide check details and front/back photos of the check. Check validation scanner will process credentials automatically.',
    withdrawInstructions: 'Specify your registered postal address, pay-to recipient name, and state code. Physical checks are dispatched via priority mail.',
    depositFields: {
      'Check Deposit Limit': '$50,000.00 USD per 24 hours',
      'Instructional Note': 'Back of the check MUST contain the handwritten signature and endorsement state code: "FOR MOBILE DEPOSIT ONLY".',
      'Mail-to Box Address': 'Unitycore Trust Dept, 33 Pine St, New York, NY 10005'
    }
  },
  {
    id: 'crypto',
    name: 'USDT & Crypto Node',
    depositEnabled: true,
    withdrawEnabled: true,
    depositInstructions: 'Send Tether (USDT) or stablecoin liquidity directly onto our secure administrative cryptographic wallets below.',
    withdrawInstructions: 'Supply your destination wallet address and corresponding blockchain network target. Errors in network selection lead to permanent wallet loss.',
    depositFields: {
      'USDT (TRC-20) Address': 'TX9jP2RzX6n8Yg1p2D4v7T8w9q3k2m5B1h',
      'USDT (ERC-20) Address': '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      'Bitcoin (BTC) Wallet': 'bc1qxy2kg3zhyp67rl5f56g3ek70z366kcf6vzv',
      'Ethereum (ETH) Wallet': '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
    }
  }
];

export function loadDepositWithdrawConfigs(): DepositWithdrawMethodConfig[] {
  const data = localStorage.getItem('unitycore_deposit_withdraw_configs');
  if (!data) {
    localStorage.setItem('unitycore_deposit_withdraw_configs', JSON.stringify(DEFAULT_DEPOSIT_WITHDRAW_CONFIGS));
    return DEFAULT_DEPOSIT_WITHDRAW_CONFIGS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_DEPOSIT_WITHDRAW_CONFIGS;
  }
}

export function saveDepositWithdrawConfigs(configs: DepositWithdrawMethodConfig[]) {
  localStorage.setItem('unitycore_deposit_withdraw_configs', JSON.stringify(configs));
  
  // Async sync of configurations to Firestore
  import('./firebase').then(({ db, handleFirestoreError, OperationType }) => {
    import('firebase/firestore').then(({ doc, setDoc }) => {
      // Save elements as individual or aggregated documents
      configs.forEach((cfg) => {
        const configDoc = doc(db, 'system_configs', cfg.id);
        setDoc(configDoc, cfg).catch(err => {
          console.error("Error saving config to firestore", err);
        });
      });
    }).catch(console.error);
  }).catch(console.error);
}

