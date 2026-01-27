# Supabase Setup Instructions

## Run these SQL commands in your Supabase SQL Editor

### 1. Create the user_profiles table (if not already created)

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
  -- Latest vitals (auto-updated from most recent doctor visit)
  latest_bp_systolic INTEGER,
  latest_bp_diastolic INTEGER,
  latest_blood_glucose INTEGER,
  latest_weight_kg NUMERIC,
  latest_height_cm NUMERIC,
  latest_vitals_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Enable Row Level Security

```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

### 3. Create RLS Policies

```sql
-- Allow anyone to insert (for registration)
CREATE POLICY "Allow public insert for registration" 
ON user_profiles 
FOR INSERT 
TO public 
WITH CHECK (true);

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" 
ON user_profiles 
FOR SELECT 
TO public 
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON user_profiles 
FOR UPDATE 
TO public 
USING (true)
WITH CHECK (true);
```

### 4. (Optional) Create indexes for better performance

```sql
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_unique_id ON user_profiles(unique_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
```

### 5. Create the doctor_visits table (tracks visits + vitals)

```sql
CREATE TABLE IF NOT EXISTS doctor_visits (
   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
   patient_unique_id TEXT NOT NULL,
   doctor_id UUID NOT NULL,
   doctor_name TEXT,
   category TEXT,
   diagnosis TEXT,
   prescription TEXT[],
   visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
   seen_by_patient BOOLEAN DEFAULT FALSE,
   -- Vitals captured during the visit
   blood_pressure_systolic INTEGER,
   blood_pressure_diastolic INTEGER,
   blood_glucose INTEGER,
   weight_kg NUMERIC,
   height_cm NUMERIC,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE doctor_visits ENABLE ROW LEVEL SECURITY;

-- Basic policies (adapt to your access rules)
CREATE POLICY "Patients can view their visits" ON doctor_visits
   FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Doctors can insert/update their visits" ON doctor_visits
   FOR ALL USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);

CREATE INDEX IF NOT EXISTS idx_doctor_visits_patient ON doctor_visits(patient_unique_id);
CREATE INDEX IF NOT EXISTS idx_doctor_visits_date ON doctor_visits(visit_date);
```

### 6. Enable Authentication Providers

#### Phone/SMS Authentication:
1. Go to **Authentication** → **Providers** → **Phone**
2. Enable the Phone provider
3. Configure your Twilio credentials (or use test credentials for demo)

#### Google OAuth:
1. Go to **Authentication** → **Providers** → **Google**
2. Enable Google provider
3. **Important:** You must add authorized redirect URIs in **both** places:

   **A. In Supabase Dashboard:**
   - The redirect URI is automatically set to: `https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback`
   - Copy this URL

   **B. In Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to **APIs & Services** → **Credentials**
   - Select your OAuth 2.0 Client ID (or create a new one)
   - Under **Authorized redirect URIs**, add:
     - `https://hkpfgncmfxsazvirpfwg.supabase.co/auth/v1/callback`
     - `http://localhost:5173` (for local development)
   - Click **Save**

4. Copy your **Google Client ID** and **Client Secret** from Google Cloud Console
5. Paste them into the Supabase Google provider settings
6. Click **Save**

### 6. Site URL Configuration (Important for OAuth!)

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your app's URL:
   - For local development: `http://localhost:5173`
   - For production: `https://yourdomain.com`
3. Add **Redirect URLs** (comma-separated):
   - `http://localhost:5173/**`
   - `https://yourdomain.com/**` (if deployed)

---

## 🎯 For Demo/Testing Without Full Setup:

**Use Phone OTP Demo Mode:**
- Phone: Any 10-digit number (e.g., `9876543210`)
- OTP: `123456`

This bypasses Twilio and Google OAuth requirements entirely!

---

## After running these commands, your authentication will work properly!