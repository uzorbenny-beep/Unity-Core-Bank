/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  description: string;
  amount: number; // Positive for deposits (+), negative for withdrawals (-)
  date: string; // e.g., "May 28, 2026" or "Today, 8:56 AM"
  timestamp: number; // for sorting
  category: 'coffee' | 'shopping' | 'salary' | 'transport' | 'food' | 'transfer' | 'other' | 'utilities' | 'entertainment' | 'travel';
  logo?: string; // Icon or path
  status?: 'successful' | 'pending' | 'declined';
  targetAccountId?: string;
  approvedByAdminId?: string;
  approvedByAdminName?: string;
  approvalTimestamp?: number;
}

export interface Account {
  id: string;
  name: string; // e.g. "Checking Account", "Savings Account"
  type: 'checking' | 'savings' | 'credit' | 'investment';
  balance: number;
  lastFour: string;
  available: boolean;
}

export interface CreditCard {
  id: string;
  cardholderName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  isFrozen: boolean;
  limit: number;
  balanceOutline: number;
}

export interface TransferTemplate {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  avatarUrl?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  status: 'success' | 'failed' | 'warning';
  targetTxId?: string;
  approvedByAdminId?: string;
  approvedByAdminName?: string;
  approvalTimestamp?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
  targetDate: string;
}

export interface Biller {
  id: string;
  name: string;
  accountNumber: string;
  category: 'utilities' | 'internet' | 'entertainment' | 'other';
  schedule: 'one-time' | 'weekly' | 'monthly' | 'quarterly';
  amount: number;
}

export interface SupportTicket {
  id: string;
  transactionId: string;
  transactionDescription: string;
  transactionAmount: number;
  reason: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'OPEN' | 'PROVISIONALLY RESOLVED' | 'PENDING REVIEW';
  dateCreated: string;
}

export interface BankUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  accounts: Account[];
  cards: CreditCard[];
  transactions: Transaction[];
  avatarUrl: string;
  unreadNotifications: number;
  savingsGoals?: SavingsGoal[];
  billers?: Biller[];
  supportTickets?: SupportTicket[];
  legalFirstName?: string;
  middleName?: string;
  legalLastName?: string;
  phoneNumber?: string;
  country?: string;
  typeOfAccount?: string;
  currency?: string;
  transactionPin?: string;
  password?: string;
  iban?: string;
  notifications?: BankNotification[];
  registrationTimestamp?: number;
}

export interface BankNotification {
  id: string;
  type: 'email' | 'push';
  category: 'otp' | 'transaction' | 'security' | 'registration' | 'support' | 'biller' | 'other';
  title: string;
  body: string;
  htmlBody?: string;
  timestamp: number;
  isRead: boolean;
  recipient: string;
}

