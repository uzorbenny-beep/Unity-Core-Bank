/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BankUser, AuditLog } from './types';

// Standard James user representing Screen 1, 2, 3, 4
export const INITIAL_USER: BankUser = {
  id: 'user-james',
  username: 'james',
  email: 'james@unitycore.com',
  name: 'James',
  role: 'user',
  unreadNotifications: 2,
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop', // James portrait from Screen 4
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
      date: 'Today, 8:56 AM',
      timestamp: Date.now() - 3600000 * 2, // 2 hours ago
      category: 'coffee',
      status: 'successful'
    },
    {
      id: 'tx-2',
      description: 'Amazon.com',
      amount: -89.99,
      date: 'May 28, 2026',
      timestamp: Date.parse('2026-05-28T14:30:00Z'),
      category: 'shopping',
      status: 'pending'
    },
    {
      id: 'tx-3',
      description: 'Salary Deposit',
      amount: 38250.00,
      date: 'May 28, 2026',
      timestamp: Date.parse('2026-05-28T08:00:00Z'),
      category: 'salary',
      status: 'successful'
    },
    {
      id: 'tx-4',
      description: 'Uber Ride',
      amount: -18.45,
      date: 'May 27, 2026',
      timestamp: Date.parse('2026-05-27T18:15:00Z'),
      category: 'transport'
    },
    {
      id: 'tx-5',
      description: 'Whole Foods',
      amount: -760.23,
      date: 'May 26, 2026',
      timestamp: Date.parse('2026-05-26T12:00:00Z'),
      category: 'food'
    },
    {
      id: 'tx-6',
      description: 'Apple Subscription',
      amount: -14.99,
      date: 'May 24, 2026',
      timestamp: Date.parse('2026-05-24T09:00:00Z'),
      category: 'shopping'
    },
    {
      id: 'tx-7',
      description: 'Netflix Premium',
      amount: -22.99,
      date: 'May 20, 2026',
      timestamp: Date.parse('2026-05-20T11:00:00Z'),
      category: 'shopping'
    },
    {
      id: 'tx-8',
      description: 'Gym Membership',
      amount: -75.00,
      date: 'May 15, 2026',
      timestamp: Date.parse('2026-05-15T07:00:00Z'),
      category: 'other'
    },
    {
      id: 'tx-u1',
      description: 'Electric Bill Payment',
      amount: -145.20,
      date: 'May 24, 2026',
      timestamp: Date.parse('2026-05-24T15:30:00Z'),
      category: 'utilities',
      status: 'declined'
    },
    {
      id: 'tx-u2',
      description: 'Cinema City Tickets',
      amount: -34.50,
      date: 'May 23, 2026',
      timestamp: Date.parse('2026-05-23T20:15:00Z'),
      category: 'entertainment',
      status: 'successful'
    },
    {
      id: 'tx-u3',
      description: 'Delta Air Lines Flight',
      amount: -450.00,
      date: 'May 18, 2026',
      timestamp: Date.parse('2026-05-18T10:00:00Z'),
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
      date: 'Today, 10:14 AM',
      timestamp: Date.now() - 1200000,
      category: 'salary'
    },
    {
      id: 'tx-cre-2',
      description: 'Cryptocurrency Wallet Funded',
      amount: -12000.00,
      date: 'Yesterday',
      timestamp: Date.now() - 86400000,
      category: 'transfer'
    },
    {
      id: 'tx-cre-3',
      description: 'Capital Grant Stimulus Credit',
      amount: 45000.00,
      date: 'May 26, 2026',
      timestamp: Date.parse('2026-05-26T14:20:00Z'),
      category: 'salary'
    },
    {
      id: 'tx-cre-4',
      description: 'Amazon AWS Cloud Server',
      amount: -188.45,
      date: 'May 25, 2026',
      timestamp: Date.parse('2026-05-25T11:45:00Z'),
      category: 'shopping'
    },
    {
      id: 'tx-cre-5',
      description: 'Metropolitan Water District',
      amount: -85.30,
      date: 'May 24, 2026',
      timestamp: Date.parse('2026-05-24T09:12:00Z'),
      category: 'utilities'
    },
    {
      id: 'tx-cre-6',
      description: 'Broadway Theatre NYC',
      amount: -250.00,
      date: 'May 22, 2026',
      timestamp: Date.parse('2026-05-22T19:30:00Z'),
      category: 'entertainment'
    },
    {
      id: 'tx-cre-7',
      description: 'Hilton Resorts Booking',
      amount: -1250.00,
      date: 'May 19, 2026',
      timestamp: Date.parse('2026-05-19T14:00:00Z'),
      category: 'travel'
    }
  ]
};

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-05-27 21:40:15',
    userId: 'user-james',
    username: 'james',
    action: 'LOGIN_SUCCESS',
    details: 'User logged in successfully via Web Console',
    status: 'success'
  },
  {
    id: 'log-2',
    timestamp: '2026-05-27 18:30:12',
    userId: 'user-james',
    username: 'james',
    action: 'TRANSFER_EXEC',
    details: 'Transferred $5,000.00 from Savings Account direct to Checking Account',
    status: 'success'
  },
  {
    id: 'log-3',
    timestamp: '2026-05-26 14:15:22',
    userId: 'admin-core',
    username: 'admin',
    action: 'SYSTEM_BACKUP',
    details: 'Daily balance reconciliation complete. Transaction logs matching Spanner DB.',
    status: 'success'
  },
  {
    id: 'log-4',
    timestamp: '2026-05-25 11:05:01',
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

export function saveUsersData(users: BankUser[]) {
  localStorage.setItem('unitycore_users', JSON.stringify(users));

  // Async sync back to Firestore for persistence
  import('./firebase').then(({ db, auth, handleFirestoreError, OperationType }) => {
    import('firebase/firestore').then(({ doc, setDoc }) => {
      const currentUid = auth.currentUser?.uid;
      const currentUserInList = users.find(usr => usr.id === currentUid);
      const isCurrentUserAdmin = currentUserInList?.role === 'admin';

      users.forEach((u) => {
        // Only sync the signed-in user's profile to avoid Firestore permission blocks, or sync any if admin
        if (!currentUid || currentUid === u.id || isCurrentUserAdmin) {
          const collectionName = u.role === 'admin' ? 'admins' : 'users';
          const uDoc = doc(db, collectionName, u.id);
          setDoc(uDoc, {
            id: u.id,
            username: u.username,
            email: u.email,
            name: u.name,
            role: u.role,
            avatarUrl: u.avatarUrl,
            unreadNotifications: u.unreadNotifications,
            accounts: u.accounts,
            cards: u.cards,
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
            iban: u.iban || ""
          }).then(() => {
            // Synchronize transaction collection
            if (u.transactions) {
              u.transactions.forEach((tx) => {
                const txDoc = doc(db, collectionName, u.id, 'transactions', tx.id);
                setDoc(txDoc, tx).catch(err => {
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

export function addAuditLog(username: string, userId: string, action: string, details: string, status: 'success' | 'failed' | 'warning' = 'success') {
  const logs = loadAuditLogs();
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    userId,
    username,
    action,
    details,
    status
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
