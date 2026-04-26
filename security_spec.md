# Security Specification - Pet Contábil

## 1. Data Invariants
- A transaction must always belong to the authenticated user who created it (`userId` match).
- A transaction must have a `type` (income/expense), a valid `amount` (number), and a `date`.
- Users can only read and write their own data.
- User profiles can only be managed by the owner of the UID.

## 2. The Dirty Dozen (Test Matrix)

| ID | Payload Description | Expected Result | Pillar Violated |
|----|---------------------|-----------------|-----------------|
| 1 | Create transaction for another user's `userId` | PERMISSION_DENIED | 2 (Identity Integrity) |
| 2 | Read all transactions without filtering by `userId` | PERMISSION_DENIED | 8 (Secure List Queries) |
| 3 | Update `userId` of an existing transaction | PERMISSION_DENIED | 2 (Static Validation) |
| 4 | Create transaction with `amount` as string | PERMISSION_DENIED | 2 (Type Safety) |
| 5 | Create transaction with ghost field `isVerified: true` | PERMISSION_DENIED | 4 (Action-Based Update) |
| 6 | Delete another user's transaction | PERMISSION_DENIED | 1 (Master Gate) |
| 7 | Update `createdAt` of an existing transaction | PERMISSION_DENIED | 9 (Immortal Field) |
| 8 | Inject 1MB string into `description` (if size limited) | PERMISSION_DENIED | 3 (Boundary Limits) |
| 9 | Create user profile with someone else's UID | PERMISSION_DENIED | 2 (Identity Integrity) |
| 10 | Update `email` in user profile | PERMISSION_DENIED | 4 (Action-Based Update) |
| 11 | List transactions without being signed in | PERMISSION_DENIED | 1 (Auth Check) |
| 12 | Create transaction with invalid `type` (e.g. "gift") | PERMISSION_DENIED | 2 (Validation Blueprints) |

## 3. Test Runner (Conceptual)
All "Dirty Dozen" cases are handled by `firestore.rules` constraints:
- `data.userId == request.auth.uid`
- `isValidTransaction()` checking types and keys.
- `affectedKeys().hasOnly()` on updates.
- `match /transactions/{transactionId}` restricted by `resource.data.userId`.
