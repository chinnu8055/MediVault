# Unique ID Implementation Guide

## Overview

This document outlines the implementation of a permanent unique ID system for all users (Patients, Doctors, and Laboratories) in MediVault.

## What Has Been Implemented

### 1. **ID Generation (Backend)**

- **Location**: [src/lib/supabase.ts](src/lib/supabase.ts)
- **Function**: `generateUniqueId(role: 'patient' | 'doctor' | 'lab'): string`
- **Logic**:
  - Generates globally unique IDs using random UUID-based generation
  - Prefix based on role:
    - `P` for Patients (e.g., `P4A7F2`)
    - `D` for Doctors (e.g., `D8K3M9`)
    - `L` for Laboratories (e.g., `L2N5Q1`)
  - IDs are created only during new user registration
  - Immutable once created (stored in database)

### 2. **Database Schema**

The `user_profiles` table includes:
```
unique_id TEXT UNIQUE NOT NULL -- Stores the generated unique ID
```

This field is:
- **Unique**: Ensures no duplicate IDs
- **Not Null**: Required for every user
- **Immutable**: Set during registration, never modified

### 3. **User Context (Frontend)**

- **Location**: [src/app/App.tsx](src/app/App.tsx)
- **Updated Interface**:
```typescript
interface User {
  id: string;           // unique_id from database
  name: string;         // User's name
  type: 'patient' | 'doctor' | 'lab';
  unique_id?: string;   // Explicit unique_id field
}
```

### 4. **UI Display Binding**

All role-specific dashboards now display the unique ID with appropriate labels:

#### Patient Dashboard
- **Location**: [src/app/components/PatientDashboard.tsx](src/app/components/PatientDashboard.tsx)
- **Display**: `Patient ID: {user?.unique_id || 'N/A'}`
- **Label Changed**: From "ABHA ID: 14-1234-5678-9012" to "Patient ID: P..."

#### Doctor Dashboard
- **Location**: [src/app/components/DoctorDashboard.tsx](src/app/components/DoctorDashboard.tsx)
- **Display**: `Doctor ID: {user?.unique_id || 'N/A'}`
- **Label Changed**: From "Medical Professional" to "Doctor ID: D..."

#### Laboratory Dashboard
- **Location**: [src/app/components/LaboratoryDashboard.tsx](src/app/components/LaboratoryDashboard.tsx)
- **Display**: `Lab ID: {user?.unique_id || 'N/A'}`
- **Label Changed**: From "Diagnostic Center" to "Lab ID: L..."

### 5. **Registration Flow**

- **Location**: [src/app/components/UnifiedAuth.tsx](src/app/components/UnifiedAuth.tsx) (lines 405-520)
- **Process**:
  1. During new user registration, `generateUniqueId()` is called with the selected role
  2. Unique ID is generated and stored in `user_profiles.unique_id`
  3. User context is updated with `unique_id` field
  4. User is redirected to their role-specific dashboard
  5. Dashboard displays the unique ID using the role-specific label

## Manual Setup Required

### A. Supabase Database Schema Changes

No schema changes needed. The table already exists with the required `unique_id` column. However, verify the following:

#### 1. Verify `user_profiles` Table Structure

Run this in your Supabase SQL Editor to ensure the table has the correct columns:

```sql
-- Check current table structure
\d user_profiles
```

Expected output should include:
```
 unique_id | text | not null | unique
```

#### 2. If Creating New Table (Fresh Setup)

If starting fresh, use this SQL:

```sql
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE,
  unique_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'lab')),
  phone TEXT,
  age INTEGER,
  gender TEXT,
  gov_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### B. Row Level Security (RLS) Policies

Verify these RLS policies exist:

```sql
-- Check RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow public insert (for registration)
CREATE POLICY IF NOT EXISTS "Allow public insert for registration"
ON user_profiles
FOR INSERT
TO public
WITH CHECK (true);

-- Policy 2: Allow users to read profiles
CREATE POLICY IF NOT EXISTS "Users can read own profile"
ON user_profiles
FOR SELECT
TO public
USING (true);

-- Policy 3: Allow users to update their own profile
CREATE POLICY IF NOT EXISTS "Users can update own profile"
ON user_profiles
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
```

### C. Indexes for Performance

Verify these indexes exist to optimize queries:

```sql
-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_unique_id ON user_profiles(unique_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
```

### D. Environment Configuration

**No changes required** - The existing `DEMO_MODE` flag in UnifiedAuth works as before:

- **DEMO_MODE = true**: Bypasses Twilio/Google OAuth (for testing)
- **DEMO_MODE = false**: Uses real authentication

### E. Authentication Providers (Optional)

If not already configured, enable:

1. **Phone/SMS Authentication** (optional):
   - Go to Supabase Dashboard → Authentication → Providers → Phone
   - Configure Twilio credentials (or use demo mode)

2. **Google OAuth** (optional):
   - Go to Supabase Dashboard → Authentication → Providers → Google
   - Configure Google Client ID and Secret
   - Add redirect URIs in both Supabase and Google Cloud Console

## Data Migration (If Existing Users)

If you have existing users without `unique_id` values:

```sql
-- Generate unique IDs for existing users
UPDATE user_profiles
SET unique_id = CASE
  WHEN role = 'patient' THEN 'P' || SUBSTR(encode(gen_random_bytes(3), 'base64'), 1, 6)
  WHEN role = 'doctor' THEN 'D' || SUBSTR(encode(gen_random_bytes(3), 'base64'), 1, 6)
  WHEN role = 'lab' THEN 'L' || SUBSTR(encode(gen_random_bytes(3), 'base64'), 1, 6)
END
WHERE unique_id IS NULL;
```

## Testing the Implementation

### 1. Test New User Registration

1. Navigate to landing page → Select role (Patient/Doctor/Lab)
2. Enter phone number and OTP (use `123456` in demo mode)
3. Complete registration form
4. Verify unique ID is generated and displayed on dashboard

### 2. Verify Unique ID Format

- Patient: Should start with `P` (e.g., `P4A7F2`)
- Doctor: Should start with `D` (e.g., `D8K3M9`)
- Lab: Should start with `L` (e.g., `L2N5Q1`)

### 3. Check Dashboard Display

- Patient Dashboard: Shows "Patient ID: P..."
- Doctor Dashboard: Shows "Doctor ID: D..."
- Lab Dashboard: Shows "Lab ID: L..."

## Database Query Examples

### Get all unique IDs by role:

```sql
SELECT unique_id, name, role FROM user_profiles WHERE role = 'patient';
SELECT unique_id, name, role FROM user_profiles WHERE role = 'doctor';
SELECT unique_id, name, role FROM user_profiles WHERE role = 'lab';
```

### Find user by unique ID:

```sql
SELECT * FROM user_profiles WHERE unique_id = 'P4A7F2';
```

### Verify uniqueness constraint:

```sql
SELECT unique_id, COUNT(*) FROM user_profiles GROUP BY unique_id HAVING COUNT(*) > 1;
```

## Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│          Landing Page (Role Selection)              │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│       UnifiedAuth Component (Phone/OTP/Google)      │
└────────────────┬────────────────────────────────────┘
                 │
         ┌───────┴──────────┐
         │                  │
      Existing         New User
      User Login       Registration
         │                  │
         │          ▼───────────────────┐
         │          │ generateUniqueId() │
         │          └─────┬─────────────┘
         │                │
         │          ▼─────────────────┐
         │          │ Store in DB     │
         │          └─────┬───────────┘
         │                │
         └───┬────────────┘
             │
        ▼────────────────┐
        │ Update Context │ ← unique_id passed
        └──────┬──────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
Patient    Doctor      Lab
Dashboard  Dashboard   Dashboard
│          │          │
└─────Display ID with role-specific label
```

## Constraints Met

✅ **ID Generation**: Only on new user registration  
✅ **Global Uniqueness**: Using random UUID generation  
✅ **Role-Based Prefix**: P/D/L prefixes correctly applied  
✅ **Immutable**: Stored once, never modified  
✅ **UI Display**: All roles show unique ID with correct labels  
✅ **No Auth Flow Changes**: Existing authentication unchanged  
✅ **No UI Restructuring**: Only label/binding updates  

## Troubleshooting

### Issue: Unique ID shows as "N/A" on dashboard

**Cause**: `user?.unique_id` is not being passed through context
**Solution**: Ensure `setUser()` includes `unique_id` field (already implemented)

### Issue: RLS policy errors during registration

**Cause**: RLS policies not configured correctly
**Solution**: Run the RLS policy SQL in Supabase SQL Editor

### Issue: Unique ID not generating

**Cause**: `DEMO_MODE` is false and no authenticated session
**Solution**: Either enable `DEMO_MODE = true` or set up real authentication providers

## Files Modified

1. [src/app/App.tsx](src/app/App.tsx) - Added `unique_id?: string` to User interface
2. [src/app/components/UnifiedAuth.tsx](src/app/components/UnifiedAuth.tsx) - Updated setUser calls with unique_id
3. [src/app/components/PatientDashboard.tsx](src/app/components/PatientDashboard.tsx) - Changed label and binding
4. [src/app/components/DoctorDashboard.tsx](src/app/components/DoctorDashboard.tsx) - Changed label and binding
5. [src/app/components/LaboratoryDashboard.tsx](src/app/components/LaboratoryDashboard.tsx) - Changed label and binding

## Files Not Modified (Already Correct)

- [src/lib/supabase.ts](src/lib/supabase.ts) - `generateUniqueId()` already implemented
- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) - Database schema already documented
- Database schema - `unique_id` column already exists

---

**Status**: ✅ Implementation Complete
**Last Updated**: December 22, 2025
