

# EduBank Digital Banking Portal
*A secure online banking prototype inspired by JPMorgan Chase — built with React + Supabase*

---

## Design & Visual Identity
- **Corporate banking aesthetic**: Navy blue, white, and subtle grays
- Professional typography, clean data tables, structured layouts
- Responsive design for desktop and mobile
- Chase-inspired navigation with a top header bar and sidebar for account navigation

---

## Phase 1: Authentication & User Onboarding
- **Email + password signup/login** via Supabase Auth
- Profile creation on signup (full name, phone, address)
- Role-based access: regular users vs admins (admin role seeded directly in database via a `user_roles` table)
- Protected routes — only authenticated users access the portal, only admins access `/admin`

## Phase 2: Account Management
- Users can have **multiple accounts** (savings and/or current)
- Each account has a unique account number, type, balance, and status (active/frozen)
- Dashboard displays all accounts with balances and statuses
- Account details page with recent transactions

## Phase 3: Core Banking Transactions
- **Transfer funds** between accounts (internal transfers)
- **Deposit** and **withdrawal** support
- All money movement handled via a **Supabase RPC stored procedure** (`transfer_funds`) using database transactions — atomic debit/credit with rollback on failure
- No direct balance updates from the frontend — all balances come from the database
- Insufficient funds check enforced server-side
- Frozen accounts blocked from transactions

## Phase 4: OTP Verification
- **Real email OTP** sent via a Supabase Edge Function before completing transfers
- OTP codes stored in an `otp_codes` table with expiry
- User enters OTP to confirm transaction — verified server-side

## Phase 5: User Dashboard
- Overview of all accounts with balances
- Recent transactions list with reference codes, amounts, dates, and statuses
- Quick transfer widget
- Account freeze status indicators

## Phase 6: Admin Panel (`/admin`)
- **View all customers** and their profiles
- **View all accounts** with balances and statuses
- **Credit/debit** an account manually (e.g., fees, adjustments)
- **Freeze/unfreeze** any account
- **View all transactions** across the system
- **Reverse a transaction** — creates a reversal record and restores balances atomically

---

## Database Architecture (Supabase PostgreSQL)
- `profiles` — user details linked to Supabase Auth
- `user_roles` — separate role table (admin/user) with security definer function
- `accounts` — bank accounts with balance, type, status
- `transactions` — full transaction ledger with reference codes and statuses (pending/completed/reversed)
- `otp_codes` — time-limited verification codes
- Row Level Security on all tables
- Stored procedure for atomic fund transfers

## Demo Flow (for presentation)
1. Register User A and User B
2. User A transfers money to User B → OTP verification → balances update
3. Admin freezes User A's account → transfer attempt is blocked
4. Admin reverses a transaction → balances restored
5. Full audit trail visible in admin panel

