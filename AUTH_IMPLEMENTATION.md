# Authentication Implementation Guide

This document explains how the Supabase authentication is integrated into the healthcare application.

## Overview

The application uses Supabase for authentication with the following methods:
- **Phone OTP**: Primary authentication method
- **Google OAuth**: Alternative authentication method

## Architecture

### Files Structure

```
/src/lib/
  ├── supabase.ts           # Supabase client configuration
  └── AuthProvider.tsx      # Authentication context provider

/src/app/components/
  └── UnifiedAuth.tsx       # Main authentication component

/utils/supabase/
  └── info.tsx              # Auto-generated Supabase credentials
```

### Key Components

#### 1. Supabase Client (`/src/lib/supabase.ts`)

Configures the Supabase client and exports utility functions:

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export function generateUniqueId(role: 'patient' | 'doctor' | 'lab'): string;
```

#### 2. Authentication Provider (`/src/lib/AuthProvider.tsx`)

Provides global authentication state:

```typescript
const { session, user, profile, loading, signOut, refreshProfile } = useAuth();
```

#### 3. UnifiedAuth Component (`/src/app/components/UnifiedAuth.tsx`)

Handles the entire authentication flow with multiple steps:
- Role selection
- Phone/Google login
- OTP verification
- New user registration

## Authentication Flows

### Phone OTP Flow

```
1. User selects role (Patient/Doctor/Lab)
   └─> handleRoleSelection()

2. User enters phone number
   └─> handleMobileSubmit()
       ├─> supabase.auth.signInWithOtp()
       └─> Check if user exists in user_profiles

3. User enters OTP
   └─> handleOTPVerification()
       ├─> supabase.auth.verifyOtp()
       ├─> If existing user: Login
       └─> If new user: Show registration form

4a. Existing User
    └─> Navigate to dashboard

4b. New User
    └─> handleRegistration()
        ├─> Generate unique ID (P/D/L prefix)
        ├─> Create user_profiles record
        └─> Navigate to dashboard
```

### Google OAuth Flow

```
1. User selects role
   └─> handleRoleSelection()

2. User clicks "Login with Google"
   └─> handleGoogleLogin()
       └─> supabase.auth.signInWithOAuth()

3. Redirect to Google
   └─> User authenticates with Google

4. Redirect back to app
   └─> checkSession()
       ├─> If profile exists: Login
       └─> If no profile: Show registration form

5. Same as Phone Flow (steps 4a/4b)
```

## User Profile Structure

### Database Schema

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  unique_id TEXT UNIQUE,      -- P123456, D123456, L123456
  name TEXT NOT NULL,
  role TEXT NOT NULL,          -- 'patient', 'doctor', 'lab'
  phone TEXT NOT NULL,
  age INTEGER,                 -- Patient only
  gender TEXT,                 -- Patient only
  gov_id TEXT,                 -- Doctor/Lab only
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### TypeScript Interface

```typescript
interface UserProfile {
  id: string;
  user_id: string;
  unique_id: string;
  name: string;
  role: 'patient' | 'doctor' | 'lab';
  phone: string;
  age?: number;
  gender?: string;
  gov_id?: string;
  created_at: string;
  updated_at: string;
}
```

## Unique ID Generation

Each user gets a unique ID with a role-based prefix:
- **Patient**: `P` + 6 random characters (e.g., `P4A7F2`)
- **Doctor**: `D` + 6 random characters (e.g., `D8K3M9`)
- **Laboratory**: `L` + 6 random characters (e.g., `L2N5Q1`)

```typescript
function generateUniqueId(role: 'patient' | 'doctor' | 'lab'): string {
  const prefix = role === 'patient' ? 'P' : role === 'doctor' ? 'D' : 'L';
  const randomId = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefix}${randomId}`;
}
```

## Security Features

### 1. Row Level Security (RLS)

All database tables use RLS policies to ensure users can only access their own data:

```sql
-- Users can only view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);
```

### 2. Phone Verification

Phone numbers must be verified via OTP before account creation.

### 3. OAuth Security

Google OAuth uses secure redirects and state parameters to prevent CSRF attacks.

## Error Handling

The application uses toast notifications (via `sonner`) to show user-friendly error messages:

```typescript
try {
  // Auth operation
} catch (error: any) {
  console.error('Error:', error);
  toast.error(error.message || 'Operation failed');
}
```

## Loading States

Loading states are managed to provide feedback during async operations:

```typescript
const [loading, setLoading] = useState(false);

const handleOperation = async () => {
  setLoading(true);
  try {
    // Operation
  } finally {
    setLoading(false);
  }
};
```

## Usage Examples

### Check if User is Authenticated

```typescript
import { useAuth } from '@/lib/AuthProvider';

function MyComponent() {
  const { user, profile, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please login</div>;

  return <div>Hello, {profile?.name}!</div>;
}
```

### Sign Out

```typescript
import { useAuth } from '@/lib/AuthProvider';

function SignOutButton() {
  const { signOut } = useAuth();

  return (
    <button onClick={signOut}>
      Sign Out
    </button>
  );
}
```

### Protected Routes

```typescript
import { useAuth } from '@/lib/AuthProvider';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" />;

  return children;
}
```

## Testing

### Test Phone OTP (Development)

1. Go to Supabase Dashboard > Authentication > Settings
2. Enable "Phone OTP Test Mode"
3. Use test phone numbers (no real SMS sent)
4. OTP will be visible in Supabase logs

### Test Google OAuth (Development)

1. Configure Google OAuth in Supabase Dashboard
2. Add `http://localhost:5173/auth` to authorized redirect URLs
3. Test login flow locally

## Next Steps

### Recommended Enhancements

1. **Email Authentication**: Add email/password login as another option
2. **Multi-Factor Authentication**: Add 2FA for enhanced security
3. **Password Recovery**: Implement password reset flow
4. **Session Management**: Add session timeout and refresh token handling
5. **Account Linking**: Allow users to link multiple auth methods
6. **Audit Logs**: Track authentication events for security monitoring

## Troubleshooting

### Common Issues

**Issue**: OTP not being sent
- **Solution**: Check Twilio configuration in Supabase dashboard
- **Solution**: Verify phone number format (+countrycode + number)

**Issue**: Google OAuth redirect fails
- **Solution**: Verify redirect URLs match exactly
- **Solution**: Check Google OAuth credentials are correct

**Issue**: User profile not created
- **Solution**: Check RLS policies allow insert
- **Solution**: Verify user is authenticated before insert

**Issue**: "No authenticated user found" error
- **Solution**: Ensure OTP verification completed successfully
- **Solution**: Check if session is valid

## Support

For additional help:
- Supabase Documentation: https://supabase.com/docs/guides/auth
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: Create an issue in your repository
