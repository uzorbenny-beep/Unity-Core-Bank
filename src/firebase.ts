/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfigDefault from '../firebase-applet-config.json';

export const activeConfig = firebaseConfigDefault;

// Initialize active Core Firebase App
const app = initializeApp(activeConfig);

// CRITICAL: Connect to configured DB ID. Supports custom instances or default databases.
export const db = getFirestore(app, activeConfig.firestoreDatabaseId || undefined);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Standard Popup Google sign-in helper
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

// Security & Audit operations as required by CRM/Firebase skills
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Global Firestore error hook. Formats the error into highly descriptive CRM JSON
 * so that authorization issues can be analyzed systematically by our client handlers.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Detailed CRM Firestore Error:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

// Mandated Test Connection on Boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test-connection-latency', 'ping'));
  } catch (error) {
    if (error instanceof Error && (error.message.includes('offline') || error.message.includes('reach') || error.message.includes('Backend didn\'t respond'))) {
      console.warn('Core Firestore is offline. Operating in graceful hybrid local fallback mode.');
    }
  }
}

// Fire test connection
testConnection();
