/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getAuth,
  signOut,
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import LandingView from "./views/LandingView";
import LoginView from "./views/LoginView";
import RegisterView from "./views/RegisterView";
import UserDashboardView from "./views/user/UserDashboardView";
import AdminDashboardView from "./views/admin/AdminDashboardView";
import VerificationPendingView from "./components/VerificationPendingView";
import { getActiveMode } from "./dbService";

import { dbService } from "./dbService";
import { notificationService } from "./notificationService";

import { BankUser, Account, CreditCard, Transaction } from "./types";
import {
  loadUsersData,
  saveUsersData,
  addAuditLog,
  INITIAL_USER,
  INITIAL_ADMIN,
  INITIAL_CREDENCE_USER,
  formatTransactionDate,
} from "./mockData";
import {
  auth,
  db,
  signInWithGoogle,
  handleFirestoreError,
  OperationType,
  activeConfig,
} from "./firebase";

export function generateUniqueIBAN(): string {
  const countryCode = "GB";
  const checkDigits = "89";
  const bankCode = "UCBU";
  const sortCode = String(Math.floor(100000 + Math.random() * 900000));
  const accountNo = String(Math.floor(10000000 + Math.random() * 90000000));
  const unformatted = `${countryCode}${checkDigits}${bankCode}${sortCode}${accountNo}`;
  const chunks = unformatted.match(/.{1,4}/g);
  return chunks ? chunks.join(" ") : unformatted;
}

export default function App() {
  const [currentView, setCurrentView] = useState<
    "landing" | "login" | "register" | "user-dashboard" | "admin-dashboard" | "verification-pending"
  >(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path === "/admin" || path.endsWith("/admin")) {
        return "login";
      }
    }
    return "landing";
  });
  const [activeUser, setActiveUser] = useState<BankUser | null>(null);

  // Mandated Config Cleanup
  useEffect(() => {
    // Clear any custom config from browser memory to prevent stale database state
    try {
      localStorage.removeItem("CUSTOM_FIREBASE_CONFIG");
    } catch (e) {
      // Ignored
    }
  }, []);

  // 📡 Single Page Router: Synchronize browser address bar with App state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;

    if (currentView === "admin-dashboard") {
      if (path !== "/admin") {
        window.history.pushState(null, "", "/admin");
      }
    } else if (currentView === "user-dashboard") {
      if (path !== "/dashboard") {
        window.history.pushState(null, "", "/dashboard");
      }
    } else if (currentView === "login") {
      if (path !== "/admin" && !path.endsWith("/admin") && path !== "/login") {
        window.history.pushState(null, "", "/login");
      }
    } else if (currentView === "register") {
      if (path !== "/register") {
        window.history.pushState(null, "", "/register");
      }
    } else if (currentView === "landing") {
      if (path !== "/") {
        window.history.pushState(null, "", "/");
      }
    }
  }, [currentView]);

  // 📡 Single Page Router: Handle physical browser Back/Forward navigation triggers
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === "/admin" || path.endsWith("/admin")) {
        if (activeUser && activeUser.role === "admin") {
          setCurrentView("admin-dashboard");
        } else {
          setCurrentView("login");
        }
      } else if (path === "/dashboard" || path === "/user" || path === "/user-dashboard") {
        if (activeUser) {
          setCurrentView("user-dashboard");
        } else {
          setCurrentView("login");
        }
      } else if (path === "/register") {
        setCurrentView("register");
      } else if (path === "/login") {
        setCurrentView("login");
      } else {
        setCurrentView("landing");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [activeUser]);

  // Listen to Firebase Authenticators to sync state
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribeTransactions: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const uid = firebaseUser.uid;
        const adminRef = doc(db, "admins", uid);
        const userRef = doc(db, "users", uid);

        if (unsubscribeUser) unsubscribeUser();
        if (unsubscribeTransactions) unsubscribeTransactions();

        try {
          // Pre-seed matching initial user on-demand when logging in
          const list = [INITIAL_USER, INITIAL_ADMIN, INITIAL_CREDENCE_USER];
          const matchedInitial = list.find((u) => u.id === uid);
          if (matchedInitial) {
            const collectionName =
              matchedInitial.role === "admin" ? "admins" : "users";
            const targetRef = doc(db, collectionName, uid);
            const checkSnap = await getDoc(targetRef);
            if (!checkSnap.exists()) {
              await setDoc(targetRef, {
                id: matchedInitial.id,
                username: matchedInitial.username,
                email: matchedInitial.email,
                name: matchedInitial.name,
                role: matchedInitial.role,
                avatarUrl: matchedInitial.avatarUrl,
                unreadNotifications: matchedInitial.unreadNotifications,
                accounts: matchedInitial.accounts,
                cards: matchedInitial.cards,
                savingsGoals: matchedInitial.savingsGoals || [],
                billers: matchedInitial.billers || [],
                supportTickets: matchedInitial.supportTickets || [],
              });
              if (matchedInitial.transactions) {
                for (const tx of matchedInitial.transactions) {
                  await setDoc(
                    doc(db, collectionName, uid, "transactions", tx.id),
                    tx,
                  );
                }
              }
            }
          }

          // Check if document exists first as admin
          let isAdminDetected = false;
          let adminCheck = null;
          try {
            adminCheck = await getDoc(adminRef);
            if (adminCheck && adminCheck.exists()) {
              isAdminDetected = true;
            }
          } catch (adminError) {
            console.warn(
              "Admin check skipped or insufficient permissions:",
              adminError,
            );
          }

          if (isAdminDetected && adminCheck) {
            // Subscribe to real-time updates for admin profile doc
            unsubscribeUser = onSnapshot(
              adminRef,
              (adminSnap) => {
                if (adminSnap.exists()) {
                  const data = adminSnap.data();

                  // Subscribe to real-time updates for nested transactions collection
                  const txCollection = collection(
                    db,
                    "admins",
                    uid,
                    "transactions",
                  );
                  unsubscribeTransactions = onSnapshot(
                    txCollection,
                    (txSnap) => {
                      const transactions: any[] = [];
                      txSnap.forEach((docSnap) =>
                        transactions.push(docSnap.data()),
                      );

                      const resolvedUser: BankUser = {
                        id: uid,
                        username:
                          data.username ||
                          firebaseUser.email?.split("@")[0] ||
                          "admin",
                        email: data.email || firebaseUser.email || "",
                        name:
                          data.name ||
                          firebaseUser.displayName ||
                          "Administrator",
                        role: "admin",
                        accounts: data.accounts || [],
                        cards: data.cards || [],
                        savingsGoals: data.savingsGoals || [],
                        billers: data.billers || [],
                        supportTickets: data.supportTickets || [],
                        avatarUrl:
                          data.avatarUrl ||
                          firebaseUser.photoURL ||
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
                        unreadNotifications: data.unreadNotifications || 0,
                        transactions: transactions.sort(
                          (a, b) => b.timestamp - a.timestamp,
                        ),
                      };

                      setActiveUser(resolvedUser);
                      // Sync local storage fallback
                      const currentList = loadUsersData();
                      const filteredList = currentList.filter(
                        (u) => u.id !== uid,
                      );
                      saveUsersData([...filteredList, resolvedUser], undefined, true);
                      setCurrentView("admin-dashboard");
                    },
                    (error) => {
                      handleFirestoreError(
                        error,
                        OperationType.GET,
                        `admins/${uid}/transactions`,
                      );
                    },
                  );
                }
              },
              (error) => {
                handleFirestoreError(error, OperationType.GET, `admins/${uid}`);
              },
            );
            return;
          }

          // Otherwise, check if user exists
          const userCheck = await getDoc(userRef);
          if (userCheck.exists()) {
            // Subscribe to real-time updates for user profile doc
            unsubscribeUser = onSnapshot(
              userRef,
              (userSnap) => {
                if (userSnap.exists()) {
                  const data = userSnap.data();

                  // Subscribe to real-time updates for nested transactions collection
                  const txCollection = collection(
                    db,
                    "users",
                    uid,
                    "transactions",
                  );
                  unsubscribeTransactions = onSnapshot(
                    txCollection,
                    (txSnap) => {
                      const transactions: any[] = [];
                      txSnap.forEach((docSnap) =>
                        transactions.push(docSnap.data()),
                      );

                      const resolvedUser: BankUser = {
                        id: uid,
                        username:
                          data.username ||
                          firebaseUser.email?.split("@")[0] ||
                          "google_user",
                        email: data.email || firebaseUser.email || "",
                        name:
                          data.name ||
                          firebaseUser.displayName ||
                          "Google Member",
                        role: "user",
                        accounts: data.accounts || [],
                        cards: data.cards || [],
                        savingsGoals: data.savingsGoals || [],
                        billers: data.billers || [],
                        supportTickets: data.supportTickets || [],
                        avatarUrl:
                          data.avatarUrl ||
                          firebaseUser.photoURL ||
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
                        unreadNotifications: data.unreadNotifications || 0,
                        transactions: transactions.sort(
                          (a, b) => b.timestamp - a.timestamp,
                        ),
                        legalFirstName: data.legalFirstName || "",
                        middleName: data.middleName || "",
                        legalLastName: data.legalLastName || "",
                        phoneNumber: data.phoneNumber || "",
                        country: data.country || "",
                        typeOfAccount: data.typeOfAccount || "checking",
                        currency: data.currency || "USD",
                        transactionPin: data.transactionPin || "",
                        password: data.password || "",
                        iban: data.iban || (() => {
                          const liveIban = generateUniqueIBAN();
                          setDoc(userRef, { iban: liveIban }, { merge: true }).catch(() => {});
                          return liveIban;
                        })(),
                      };

                      setActiveUser(resolvedUser);
                      // Sync local storage fallback
                      const currentList = loadUsersData();
                      const filteredList = currentList.filter(
                        (u) => u.id !== uid,
                      );
                      saveUsersData([...filteredList, resolvedUser], undefined, true);
                      if (getActiveMode() === "firebase" && !firebaseUser.emailVerified && resolvedUser.role === "user") {
                        setCurrentView("verification-pending");
                      } else {
                        setCurrentView("user-dashboard");
                      }
                    },
                    (error) => {
                      handleFirestoreError(
                        error,
                        OperationType.GET,
                        `users/${uid}/transactions`,
                      );
                    },
                  );
                }
              },
              (error) => {
                handleFirestoreError(error, OperationType.GET, `users/${uid}`);
              },
            );
          } else {
            // New register onboarding with rich initial templates under users collection
            let cleanEmailName = (firebaseUser.email || "google").split("@")[0];
            let nameToUse =
              firebaseUser.displayName || firebaseUser.email || "Customer";
            let initialBalance = 0;
            let pendingAdditions: any = null;
            let pswdVal = "";

            const pendingStr = localStorage.getItem("pending_signup_details");
            if (pendingStr) {
              try {
                const pending = JSON.parse(pendingStr);
                if (pending.username) cleanEmailName = pending.username;
                if (pending.name) nameToUse = pending.name;
                if (pending.initialDeposit !== undefined)
                  initialBalance = Number(pending.initialDeposit) || 0;
                if (pending.additionalFields) pendingAdditions = pending.additionalFields;
                if (pending.password) pswdVal = pending.password;
                localStorage.removeItem("pending_signup_details");
              } catch (err) {
                console.error("Error parsing pending signup details:", err);
              }
            }

            // Ensure username satisfies Firestore rules (>= 2 characters)
            if (cleanEmailName.trim().length < 2) {
              cleanEmailName = cleanEmailName.trim() + "user";
            }

            const checkPrefChecking = Math.floor(
              1000 + Math.random() * 9000,
            ).toString();
            const checkPrefSavings = Math.floor(
              1000 + Math.random() * 9000,
            ).toString();

            const initialTxs: Transaction[] = [
              {
                id: `tx-init-${Date.now()}`,
                description: "Unitycore Secure Ledger Activation",
                amount: 0,
                date: formatTransactionDate(Date.now()),
                timestamp: Date.now(),
                category: "other",
                status: "successful",
              },
            ];
            if (initialBalance > 0) {
              initialTxs.unshift({
                id: `tx-init-dep-${Date.now()}`,
                description: "Activation First Ledger Deposit",
                amount: initialBalance,
                date: formatTransactionDate(Date.now() - 1000),
                timestamp: Date.now() - 1000,
                category: "salary",
                status: "pending",
                targetAccountId: `acc-checking-${uid}`,
              });
            }

            const randomIban = generateUniqueIBAN();

            const newGoogleUser: BankUser = {
              id: uid,
              username: cleanEmailName,
              email: firebaseUser.email || "",
              name: nameToUse,
              role: "user",
              unreadNotifications: 1,
              avatarUrl:
                firebaseUser.photoURL ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
              accounts: [
                {
                  id: `acc-checking-${uid}`,
                  name: "Checking Account",
                  type: "checking",
                  balance: 0,
                  lastFour: checkPrefChecking,
                  available: true,
                },
                {
                  id: `acc-savings-${uid}`,
                  name: "Savings Account",
                  type: "savings",
                  balance: 0,
                  lastFour: checkPrefSavings,
                  available: true,
                },
                {
                  id: `acc-credit-${uid}`,
                  name: "Credit Card",
                  type: "credit",
                  balance: 0,
                  lastFour: "2468",
                  available: true,
                },
              ],
              cards: [
                {
                  id: `card-${uid}`,
                  cardholderName: nameToUse.toUpperCase(),
                  cardNumber: "•••• •••• •••• 2468",
                  expiryDate: "12/30",
                  cvv: "812",
                  isFrozen: false,
                  limit: 5000,
                  balanceOutline: 0,
                },
              ],
            transactions: initialTxs,
            savingsGoals: [],
            billers: [],
            supportTickets: [],
            legalFirstName: pendingAdditions?.legalFirstName || "",
            middleName: pendingAdditions?.middleName || "",
            legalLastName: pendingAdditions?.legalLastName || "",
            phoneNumber: pendingAdditions?.phoneNumber || "",
            country: pendingAdditions?.country || "",
            typeOfAccount: pendingAdditions?.typeOfAccount || "checking",
            currency: pendingAdditions?.currency || "USD",
            transactionPin: pendingAdditions?.transactionPin || "",
            password: pswdVal,
            iban: randomIban,
          };

          // Set doc in Firestore
          await setDoc(userRef, {
            id: newGoogleUser.id,
            username: newGoogleUser.username,
            email: newGoogleUser.email,
            name: newGoogleUser.name,
            role: newGoogleUser.role,
            avatarUrl: newGoogleUser.avatarUrl,
            unreadNotifications: newGoogleUser.unreadNotifications,
            accounts: newGoogleUser.accounts,
            cards: newGoogleUser.cards,
            savingsGoals: [],
            billers: [],
            supportTickets: [],
            legalFirstName: newGoogleUser.legalFirstName,
            middleName: newGoogleUser.middleName,
            legalLastName: newGoogleUser.legalLastName,
            phoneNumber: newGoogleUser.phoneNumber,
            country: newGoogleUser.country,
            typeOfAccount: newGoogleUser.typeOfAccount,
            currency: newGoogleUser.currency,
            transactionPin: newGoogleUser.transactionPin,
            password: newGoogleUser.password,
            iban: newGoogleUser.iban,
          });
            // Write first transactions subcollection
            for (const tx of newGoogleUser.transactions) {
              await setDoc(doc(db, "users", uid, "transactions", tx.id), tx);
            }

            setActiveUser(newGoogleUser);
            // Save to LocalStorage fallback
            const currentList = loadUsersData();
            saveUsersData([...currentList, newGoogleUser]);

            // Fire welcome registration email and notifications
            notificationService.sendRegistrationNotification(newGoogleUser, initialBalance).catch(err => console.error("Error creating Google register welcome:", err));

            addAuditLog(
              newGoogleUser.username,
              newGoogleUser.id,
              "ONBOARDING_COMPLETED",
              "Created new secure ledger from verified credentials.",
            );
            if (getActiveMode() === "firebase" && !firebaseUser.emailVerified) {
              setCurrentView("verification-pending");
            } else {
              setCurrentView("user-dashboard");
            }
          }
        } catch (error) {
          console.warn(
            "Graceful fallback to local storage user due to Firestore unreachable/offline:",
            error,
          );
          const currentList = loadUsersData();
          const localUser =
            currentList.find((u) => u.id === uid) ||
            [INITIAL_USER, INITIAL_ADMIN, INITIAL_CREDENCE_USER].find(
              (u) => u.id === uid,
            );
          if (localUser) {
            setActiveUser(localUser);
            setCurrentView(
              localUser.role === "admin" ? "admin-dashboard" : "user-dashboard",
            );
          } else {
            handleFirestoreError(error, OperationType.GET, `users/${uid}`);
          }
        }
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) (unsubscribeUser as () => void)();
      if (unsubscribeTransactions) (unsubscribeTransactions as () => void)();
    };
  }, []);

  // Google popup flow
  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      alert("Google connection declined or bypassed.");
    }
  };

  // Sync state if localStorage changes
  const handleReloadUserData = (username: string) => {
    const list = loadUsersData();
    const found = list.find(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase() ||
        u.id === username,
    );
    if (found) {
      setActiveUser(found);
    }
  };

  // Quick direct bypass logic for Sandbox reviewers
  const handleQuickLogin = async (type: "user" | "admin") => {
    const email = type === "user" ? "james@unitycore.com" : "admin@unitycore.bank";
    try {
      const user = await dbService.signIn(email, "password123");
      setActiveUser(user);
      if (getActiveMode() === "firebase" && auth.currentUser && !auth.currentUser.emailVerified && user.role === "user") {
        setCurrentView("verification-pending");
      } else {
        setCurrentView(user.role === "admin" ? "admin-dashboard" : "user-dashboard");
      }
    } catch (err: any) {
      console.error("Quick login error:", err);
      alert("Failed quick login: " + err.message);
    }
  };

  // User input submit matching (checks login database)
  const handleLoginSubmit = async (
    emailOrUsername: string,
    password: string,
  ) => {
    try {
      const user = await dbService.signIn(emailOrUsername.trim(), password);
      setActiveUser(user);
      if (user.role !== "admin") {
        notificationService.sendLoginAlert(user).catch(err => console.error("Error creating login alert:", err));
      }
      if (getActiveMode() === "firebase" && auth.currentUser && !auth.currentUser.emailVerified && user.role === "user") {
        setCurrentView("verification-pending");
      } else {
        setCurrentView(user.role === "admin" ? "admin-dashboard" : "user-dashboard");
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      throw error;
    }
  };

  // Setup account creation flow
  const handleRegisterInputSuccess = async (
    email: string,
    password: string,
    username: string,
    fullName: string,
    initialDepositAmount: number,
    additionalFields?: {
      legalFirstName: string;
      middleName: string;
      legalLastName: string;
      phoneNumber: string;
      country: string;
      typeOfAccount: string;
      currency: string;
      transactionPin: string;
    },
  ) => {
    try {
      const newUser = await dbService.signUp(
        email,
        password,
        username,
        fullName,
        initialDepositAmount,
        additionalFields
      );
      setActiveUser(newUser);
      notificationService.sendRegistrationNotification(newUser, initialDepositAmount).catch(err => console.error("Error creating register welcome:", err));
      if (getActiveMode() === "firebase" && auth.currentUser && !auth.currentUser.emailVerified) {
        setCurrentView("verification-pending");
      } else {
        setCurrentView("user-dashboard");
      }
    } catch (error: any) {

      console.error("Registration error:", error);
      throw error;
    }
  };

  const handleAdminRegisterUser = async (
    email: string,
    password: string,
    username: string,
    fullName: string,
  ) => {
    try {
      // 1. Check if username already exists in Firestore/Mock
      const usersCol = collection(db, "users");
      const q = query(
        usersCol,
        where("username", "==", username.toLowerCase().trim()),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error(`The username "@${username}" is already in use.`);
      }

      const adminsCol = collection(db, "admins");
      const qAdmin = query(
        adminsCol,
        where("username", "==", username.toLowerCase().trim()),
      );
      const snapAdmin = await getDocs(qAdmin);
      if (!snapAdmin.empty) {
        throw new Error(`The username "@${username}" is already in use.`);
      }

      const list = loadUsersData();
      const existUser = list.find(
        (u) => u.username.toLowerCase() === username.toLowerCase().trim(),
      );
      if (existUser) {
        throw new Error(`The username "@${username}" is already in use.`);
      }

      // 2. Create secondary Firebase App to register the user in Auth without logging the admin out
      let tempApp;
      const appName = `adminReg_${Date.now()}`;
      try {
        tempApp = initializeApp(activeConfig, appName);
      } catch (e) {
        console.error(e);
        throw new Error(
          "Unable to initialize secure auth registration channel.",
        );
      }

      const tempAuth = getAuth(tempApp);
      let userCredential;
      let uid = "";
      try {
        userCredential = await createUserWithEmailAndPassword(
          tempAuth,
          email.trim(),
          password,
        );
        await signOut(tempAuth);
        uid = userCredential.user.uid;
      } catch (error: any) {
        console.error("Registration error on temp auth:", error);
        if (error.code === "auth/operation-not-allowed") {
          console.warn(
            "Firebase Email/Password provider is disabled. Falling back to local offline user record creation for admin ledger.",
          );
          uid = `local-uid-${Math.floor(100000 + Math.random() * 900000)}`;
        } else {
          let errMsg =
            error.message ||
            "Failed to register the user authentication profile.";
          if (error.code === "auth/email-already-in-use") {
            errMsg = "The email address is already in use.";
          } else if (error.code === "auth/weak-password") {
            errMsg = "The password is too weak (min 6 characters).";
          } else if (error.code === "auth/invalid-email") {
            errMsg = "The email address is invalid.";
          }
          throw new Error(errMsg);
        }
      }

      const checkPrefChecking = Math.floor(
        1000 + Math.random() * 9000,
      ).toString();
      const checkPrefSavings = Math.floor(
        1000 + Math.random() * 9000,
      ).toString();

      const newUser: BankUser = {
        id: uid,
        username: username.toLowerCase().trim(),
        email: email.trim(),
        name: fullName,
        role: "user",
        unreadNotifications: 1,
        avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop`,
        accounts: [
          {
            id: `acc-checking-${uid}`,
            name: "Checking Account",
            type: "checking",
            balance: 0,
            lastFour: checkPrefChecking,
            available: true,
          },
          {
            id: `acc-savings-${uid}`,
            name: "Savings Account",
            type: "savings",
            balance: 0,
            lastFour: checkPrefSavings,
            available: true,
          },
          {
            id: `acc-credit-${uid}`,
            name: "Credit Card",
            type: "credit",
            balance: 0,
            lastFour: "2468",
            available: true,
          },
        ],
        cards: [
          {
            id: `card-${uid}`,
            cardholderName: fullName.toUpperCase(),
            cardNumber: "•••• •••• •••• 2468",
            expiryDate: "12/30",
            cvv: "812",
            isFrozen: false,
            limit: 5000,
            balanceOutline: 0,
          },
        ],
        transactions: [
          {
            id: `tx-init-${Date.now()}`,
            description: "Unitycore Secure Ledger Activation",
            amount: 0,
            date: formatTransactionDate(Date.now()),
            timestamp: Date.now(),
            category: "other",
            status: "successful",
          },
        ],
        savingsGoals: [],
        billers: [],
        supportTickets: [],
      };

      // Set doc in Main Firestore (using the main db app instance)
      try {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          avatarUrl: newUser.avatarUrl,
          unreadNotifications: newUser.unreadNotifications,
          accounts: newUser.accounts,
          cards: newUser.cards,
          savingsGoals: [],
          billers: [],
          supportTickets: [],
        });
        // Write transactions to Firestore
        for (const tx of newUser.transactions) {
          await setDoc(
            doc(db, "users", uid, "transactions", tx.id),
            tx,
          );
        }
      } catch (firestoreError) {
        console.warn(
          "Could not sync admin registered user to remote Firestore users collection:",
          firestoreError,
        );
      }

      // Save to LocalStorage fallback
      const currentList = loadUsersData();
      saveUsersData([...currentList, newUser]);

      // Fire welcome registration email and notifications
      notificationService.sendRegistrationNotification(newUser, 0).catch(err => console.error("Error creating register welcome from admin signup:", err));

      addAuditLog(
        activeUser ? activeUser.username : "admin",
        activeUser ? activeUser.id : "admin",
        "ADMIN_CREATE_USER",
        `Admin registered new user: ${fullName} (@${username})`,
      );
    } catch (error: any) {
      console.error("Admin user creation system error:", error);
      throw error;
    }
  };

  const handleLogout = () => {
    if (activeUser) {
      addAuditLog(
        activeUser.username,
        activeUser.id,
        "LOGOUT_SUCCESS",
        "Session closed gracefully",
      );
    }
    setActiveUser(null);
    auth.signOut();
    setCurrentView("landing");
  };

  const handleRoleToggle = (targetRole: "user" | "admin") => {
    const allUsers = loadUsersData();
    if (targetRole === "admin") {
      const admin = allUsers.find((u) => u.username === "admin");
      if (admin) {
        setActiveUser(admin);
        setCurrentView("admin-dashboard");
      }
    } else {
      const james = allUsers.find((u) => u.username === "james");
      if (james) {
        setActiveUser(james);
        setCurrentView("user-dashboard");
      }
    }
  };

  return (
    <div className="bg-[#070b19] text-slate-200 min-h-screen flex flex-col justify-between font-sans">
      {/* Outer structural bounds wrapper */}
      <div
        className={`w-full mx-auto min-h-screen relative flex flex-col justify-between transition-all duration-300 ${
          currentView.endsWith("dashboard")
            ? "max-w-full md:max-w-7xl bg-[#070b19]"
            : "max-w-lg shadow-2xl border-x border-slate-900/40 bg-[#0d1224]"
        }`}
      >
        {currentView === "landing" && (
          <LandingView
            onNavigate={(view) => setCurrentView(view)}
            onQuickLogin={handleQuickLogin}
            onGoogleLogin={handleGoogleLogin}
          />
        )}

        {currentView === "login" && (
          <LoginView
            onBack={() => setCurrentView("landing")}
            onNavigate={(view) => setCurrentView(view)}
            onLoginSuccess={handleLoginSubmit}
            onGoogleLogin={handleGoogleLogin}
          />
        )}

        {currentView === "register" && (
          <RegisterView
            onBack={() => setCurrentView("landing")}
            onRegisterSuccess={handleRegisterInputSuccess}
            onGoogleLogin={handleGoogleLogin}
          />
        )}

        {currentView === "verification-pending" && (
          <VerificationPendingView
            currentUser={activeUser}
            onBack={handleLogout}
            onVerifiedAndProceed={() => {
              setCurrentView("user-dashboard");
            }}
          />
        )}

        {currentView === "user-dashboard" && activeUser && (
          <UserDashboardView
            currentUser={activeUser}
            onLogout={handleLogout}
            onRoleSwitch={(role) => handleRoleToggle("admin")}
            onRefreshUser={handleReloadUserData}
          />
        )}

        {currentView === "admin-dashboard" && activeUser && (
          <AdminDashboardView
            currentAdmin={activeUser}
            onLogout={handleLogout}
            onRoleSwitch={() => handleRoleToggle("user")}
            onRefreshData={() => {
              if (activeUser) handleReloadUserData(activeUser.id);
            }}
            onRegisterUser={handleAdminRegisterUser}
          />
        )}
      </div>
    </div>
  );
}
