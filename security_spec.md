# Security Specification & "Dirty Dozen" Payloads Audit

This specification documents the absolute boundaries of our banking security, ensuring that no malicious writes or privilege escalations can compromise accounts.

---

## 🔒 1. Core Data Invariants

1. **User Ownership Boundaries**: No user can read, list, modify, or delete another user's balance, cards, or transaction history.
2. **Strict Identity Matching**: During self-profiling or registrations, the user's document ID and nested profile parameters *must* strictly match their verified authentication UID (`request.auth.uid`). No spoofing of user details is permitted.
3. **Role Lock (No Privilege Escalation)**: A user cannot change their own model `role` field from `user` to `admin` or create profiles with self-assigned `admin` privileges. Admins are strictly maintained inside hardcoded configurations or pre-verified tables.
4. **Audit Immutability**: Audit logs once created are strictly **read-only and create-only**. No modifications, overwrites, or deletions are permitted on auditing chains. Only authenticated accounts can append logs.
5. **No System Data Tampering**: Unbounded lists (Transactions) must reside in separate, secure path-variable checked directories. No ghost fields can be appended during updates.

---

## 😈 2. The "Dirty Dozen" Malicious Payloads

The following payloads represent typical attacks that our Firestore security rules must mathematically deny.

### Payload 1: The Identity Hijack
* **Attack**: Authenticated User `alice` attempts to create a profile card for User `bob` inside `/users/bob`.
* **Payload**:
  ```json
  {
    "id": "user-bob",
    "name": "Bob Vance",
    "email": "bob@vance.com",
    "username": "bob",
    "role": "user",
    "accounts": [],
    "cards": []
  }
  ```
* **Expected Result**: `PERMISSION_DENIED` (UID mismatch check).

### Payload 2: Self-Admin Elevation
* **Attack**: User `james` attempts to update his role parameter to `admin`.
* **Payload**:
  ```json
  {
    "role": "admin"
  }
  ```
* **Expected Result**: `PERMISSION_DENIED` (affectedKeys().hasOnly() guard on updates blocks self-promotion).

### Payload 3: Spoofing the Global Audit Trails
* **Attack**: Non-admin user attempts to overwrite or delete a system audit log.
* **Payload**: Overwriting `/auditLogs/log-james-123` or hitting delete.
* **Expected Result**: `PERMISSION_DENIED` (Audit logs are create-only and can never be modified or deleted).

### Payload 4: Invalid Path Token / Key Flooding
* **Attack**: Malicious client attempts to create an account with a 2-megabyte junk string in the `username` field.
* **Payload**:
  ```json
  {
    "id": "james",
    "username": "MALICIOUS_LONG_JUNK_STRING_OF_OVER_1000000_CHARACTERS_...",
    "email": "james@unitycore.bank",
    "name": "James Cooper",
    "role": "user",
    "accounts": [],
    "cards": []
  }
  ```
* **Expected Result**: `PERMISSION_DENIED` (Validation helper enforces `.size() <= 128` on key strings).

### Payload 5: Anonymous Query Scraping
* **Attack**: An unauthenticated connection attempts to view the general log trace of other account holders.
* **Expected Query**: `collection('users')` or `collection('auditLogs')` without signing in.
* **Expected Result**: `PERMISSION_DENIED` (Authentication required on all matches).

### Payload 6: The "Ghost" Balance Creator
* **Attack**: User attempts to append an unauthorized, unvalidated balance field (e.g. `isVip: true`, `hiddenBonus: 1000000`) during a checklist sync.
* **Payload**:
  ```json
  {
    "accounts": [
      { "id": "checking", "balance": 9999999, "lastFour": "4444", "available": true }
    ],
    "superSecretBonus": 500000
  }
  ```
* **Expected Result**: `PERMISSION_DENIED` (Strict schema validation prevents shadow/unspecified fields on updates).

### Payload 7: Double Spend Transaction Injector
* **Attack**: User attempting to write a direct transaction record into another customer's collection path (`/users/bob/transactions/tx-123`).
* **Payload**:
  ```json
  {
    "id": "tx-123",
    "description": "Ghost Bonus Credit",
    "amount": 500000,
    "date": "Today",
    "timestamp": 178564020,
    "category": "salary"
  }
  ```
* **Expected Result**: `PERMISSION_DENIED` (Access path restricted to the resource owner).

### Payload 8: Transaction State Lockdown Bypass
* **Attack**: Customer attempting to change an existing, certified, settled transaction state from "successful" or "declined" to positive numbers.
* **Expected Result**: `PERMISSION_DENIED` (Transaction collection is create-only for users; no client-side user can update dynamic transactions after creation).

### Payload 9: Invalid Parameter injection on transaction
* **Attack**: Adding illegal/spoofed categories to transaction lines like `category: "illegal_arms"`.
* **Expected Result**: `PERMISSION_DENIED` (Schema helpers validate category values strictly against types).

### Payload 10: Deleting Credit History
* **Attack**: Malicious client issues a delete call against active credit accounts `/users/james/transactions/xyz` to hide card spendings.
* **Expected Result**: `PERMISSION_DENIED` (Users cannot delete transactions).

### Payload 11: Email Spoofing Attack
* **Attack**: Using unverified emails to login and claim admin access.
* **Expected Result**: `PERMISSION_DENIED` (Mandates `request.auth.token.email_verified == true`).

### Payload 12: Empty / Invalid ID Payload Injection
* **Attack**: Overwriting checking record with null ID characters or invalid regex values in id params.
* **Expected Result**: `PERMISSION_DENIED` (All IDs must match standard character regex `^[a-zA-Z0-9_\-]+$`).

---

## 🧪 3. Documenting the Test Cases (TDD Specification)

To ensure these payloads are completely bulletproof, we implement the assertions in our security rules layout. Here is the architectural layout we test against:

```typescript
// firestore.rules.test.ts - Architectural Verification Plan
describe('Firestore Security Rules', () => {
  it('prevents identity hijacking (alice writing to bob)', () => {
    // Assert write returns PERMISSION_DENIED
  });
  it('prevents self role elevation to admin', () => {
    // Assert update returns PERMISSION_DENIED
  });
  it('locks audit logs as write-once, read-multiple', () => {
    // Assert update/delete are blocked completely
  });
  it('restricts unauthenticated listing of client details', () => {
    // Assert read/list returns PERMISSION_DENIED
  });
});
```
