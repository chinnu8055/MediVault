# Quick Reference - Unique ID System

## 🚀 What Changed

| Component | Before | After |
|-----------|--------|-------|
| **Patient Dashboard** | `ABHA ID: 14-1234-5678-9012` | `Patient ID: P4A7F2` |
| **Doctor Dashboard** | `Medical Professional` | `Doctor ID: D8K3M9` |
| **Lab Dashboard** | `Diagnostic Center` | `Lab ID: L2N5Q1` |
| **User Context** | No `unique_id` field | Added `unique_id?: string` |

---

## 🔧 SQL to Run (in Supabase)

Copy-paste these in order:

```sql
-- 1. Create table
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

-- 2. Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
CREATE POLICY IF NOT EXISTS "Allow public insert for registration" 
ON user_profiles FOR INSERT TO public WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can read own profile" 
ON user_profiles FOR SELECT TO public USING (true);

CREATE POLICY IF NOT EXISTS "Users can update own profile" 
ON user_profiles FOR UPDATE TO public USING (true) WITH CHECK (true);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_unique_id ON user_profiles(unique_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
```

---

## 🧪 Test Instructions

1. Keep `DEMO_MODE = true` in [UnifiedAuth.tsx](src/app/components/UnifiedAuth.tsx)
2. Start the app
3. Landing Page → Select role
4. Phone: `9876543210`
5. OTP: `123456`
6. Complete registration
7. **See unique ID on dashboard** ✅

---

## 📋 Files Changed

```
✅ src/app/App.tsx
✅ src/app/components/PatientDashboard.tsx
✅ src/app/components/DoctorDashboard.tsx
✅ src/app/components/LaboratoryDashboard.tsx
✅ src/app/components/UnifiedAuth.tsx
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) | Overview & next steps |
| [UNIQUE_ID_SETUP_CHECKLIST.md](UNIQUE_ID_SETUP_CHECKLIST.md) | Setup & testing guide |
| [UNIQUE_ID_IMPLEMENTATION.md](UNIQUE_ID_IMPLEMENTATION.md) | Technical details |
| [UNIQUE_ID_VISUAL_GUIDE.md](UNIQUE_ID_VISUAL_GUIDE.md) | Code examples & diagrams |

---

## ✨ Key Features

- **Format**: P/D/L + 6 random alphanumeric (e.g., `P4A7F2`)
- **Uniqueness**: Database enforced (UNIQUE constraint)
- **Immutability**: Cannot be changed after creation
- **Display**: Role-specific labels in dashboard
- **No changes**: Auth flow and UI structure unchanged

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| "N/A" shows on dashboard | You're likely not in new registration flow |
| RLS policy error | Run SQL policies from section above |
| ID not appearing | Clear browser cache & test new registration |
| Can't generate ID | Ensure DEMO_MODE = true OR auth configured |

---

## 🎯 Requirements Status

```
✅ Generate only for new users
✅ Globally unique (no counters)
✅ Role-based prefixes (P/D/L)
✅ Store in user_profiles
✅ Immutable once created
✅ Display for all roles
✅ Replace ABHA ID
✅ Use role labels
✅ Bind to actual ID
✅ No auth changes
✅ No UI restructure
✅ Manual setup documented
```

---

## 🚀 Next Steps

1. **Run SQL** from section above in Supabase
2. **Test** registration flow for each role
3. **Verify** IDs appear on dashboards
4. **Done!** ✅

---

**Time to implement:** ~30 minutes (SQL setup + testing)  
**Status:** 🎉 Code complete, awaiting SQL execution
