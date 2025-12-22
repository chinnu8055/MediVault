# Unique ID Implementation - Visual Guide & Examples

## User Interface Changes - Before & After

### 1. Patient Dashboard

#### BEFORE
```
┌─────────────────────────────────┐
│  👤  Patient             🔔  🚪  │
│      ABHA ID: 14-1234-5678-9012 │
└─────────────────────────────────┘
```

#### AFTER
```
┌─────────────────────────────────┐
│  👤  Patient             🔔  🚪  │
│      Patient ID: P4A7F2          │
└─────────────────────────────────┘
```

---

### 2. Doctor Dashboard

#### BEFORE
```
┌─────────────────────────────────┐
│  🩺  Doctor              🚪      │
│      Medical Professional         │
└─────────────────────────────────┘
```

#### AFTER
```
┌─────────────────────────────────┐
│  🩺  Doctor              🚪      │
│      Doctor ID: D8K3M9            │
└─────────────────────────────────┘
```

---

### 3. Laboratory Dashboard

#### BEFORE
```
┌─────────────────────────────────┐
│  🧪  Laboratory          🚪      │
│      Diagnostic Center            │
└─────────────────────────────────┘
```

#### AFTER
```
┌─────────────────────────────────┐
│  🧪  Laboratory          🚪      │
│      Lab ID: L2N5Q1               │
└─────────────────────────────────┘
```

---

## Code Implementation Examples

### Example 1: User Registration Flow

```typescript
// In UnifiedAuth.tsx
const handleRegistration = async () => {
  // ... validation ...
  
  // Generate unique ID based on role
  const uniqueId = generateUniqueId(selectedRole);
  // Result: "P4A7F2" for patient, "D8K3M9" for doctor, "L2N5Q1" for lab
  
  // Create database record
  const { data: profile } = await supabase
    .from('user_profiles')
    .insert([{
      user_id: authUser.id,
      unique_id: uniqueId,  // ← Stored here
      name: userDetails.name,
      role: selectedRole,
      phone: `${countryCode}${mobileNumber}`,
      age: selectedRole === 'patient' ? parseInt(userDetails.age) : null,
      gender: selectedRole === 'patient' ? userDetails.gender : null,
      gov_id: selectedRole !== 'patient' ? userDetails.govId : null
    }]);
  
  // Update app context with unique_id
  setUser({
    id: uniqueId,
    name: userDetails.name,
    type: selectedRole,
    unique_id: uniqueId  // ← Passed to context
  });
  
  // Navigate to dashboard
  navigateToDashboard(selectedRole);
};
```

### Example 2: Context Type Definition

```typescript
// In App.tsx
interface User {
  id: string;           // Also the unique_id
  name: string;         // User's full name
  type: 'patient' | 'doctor' | 'lab';  // Role
  unique_id?: string;   // Explicit unique ID field
}

// Usage in component
const { user } = useApp();
console.log(user?.unique_id);  // "P4A7F2"
```

### Example 3: Dashboard Display

```typescript
// In PatientDashboard.tsx
export default function PatientDashboard() {
  const { user } = useApp();
  
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-teal-100">
        {/* Avatar */}
      </div>
      <div>
        <h1 className="text-lg text-gray-800">
          {user?.name || 'Patient'}
        </h1>
        {/* Display unique ID with role-specific label */}
        <p className="text-xs text-gray-500">
          Patient ID: {user?.unique_id || 'N/A'}
        </p>
      </div>
    </div>
  );
}
```

---

## ID Generation Algorithm

### Function Definition

```typescript
// In src/lib/supabase.ts
export function generateUniqueId(role: 'patient' | 'doctor' | 'lab'): string {
  // Determine prefix based on role
  const prefix = role === 'patient' ? 'P' 
               : role === 'doctor' ? 'D' 
               : 'L';
  
  // Generate 6 random alphanumeric characters
  const randomId = Math.random()
    .toString(36)           // Convert to base-36 (0-9, a-z)
    .substr(2, 6)           // Take 6 chars starting at index 2
    .toUpperCase();         // Convert to uppercase
  
  // Combine prefix + random ID
  return `${prefix}${randomId}`;
}
```

### Example Generations

```javascript
// Sample outputs from generateUniqueId()

// Patient registrations
generateUniqueId('patient')  → 'P4A7F2'
generateUniqueId('patient')  → 'PFKJM8'
generateUniqueId('patient')  → 'P1XZ9Q'

// Doctor registrations
generateUniqueId('doctor')   → 'D8K3M9'
generateUniqueId('doctor')   → 'DQPL7N'
generateUniqueId('doctor')   → 'D5WX2R'

// Lab registrations
generateUniqueId('lab')      → 'L2N5Q1'
generateUniqueId('lab')      → 'LJ8VC4'
generateUniqueId('lab')      → 'L9T6KP'
```

---

## Database Schema

### user_profiles Table

```
Column         │ Type         │ Constraints
───────────────┼──────────────┼──────────────────────
id             │ UUID         │ PRIMARY KEY
user_id        │ UUID         │ UNIQUE, FOREIGN KEY
unique_id      │ TEXT         │ UNIQUE NOT NULL ← Our field
name           │ TEXT         │ NOT NULL
role           │ TEXT         │ NOT NULL, CHECK
phone          │ TEXT         │ 
age            │ INTEGER      │ 
gender         │ TEXT         │ 
gov_id         │ TEXT         │ 
created_at     │ TIMESTAMPTZ  │ DEFAULT NOW()
updated_at     │ TIMESTAMPTZ  │ DEFAULT NOW()
```

### Sample Data

```
unique_id  │ name              │ role      │ created_at
───────────┼───────────────────┼───────────┼────────────────
P4A7F2     │ John Doe          │ patient   │ 2024-12-22
PFKJM8     │ Jane Smith        │ patient   │ 2024-12-22
D8K3M9     │ Dr. Sarah Johnson │ doctor    │ 2024-12-21
DQPL7N     │ Dr. Ahmed Khan    │ doctor    │ 2024-12-20
L2N5Q1     │ HealthLabs Inc    │ lab       │ 2024-12-19
LJ8VC4     │ DiagnostiCare     │ lab       │ 2024-12-18
```

---

## Component Tree & Data Flow

```
App.tsx (Context Provider)
    ↓
    User Context
    ├─ id: string
    ├─ name: string
    ├─ type: 'patient' | 'doctor' | 'lab'
    └─ unique_id?: string ← NEW FIELD
    ↓
    ├─ UnifiedAuth.tsx (Registration/Login)
    │   └─ generateUniqueId() → creates "P4A7F2"
    │       └─ setUser({ ..., unique_id: "P4A7F2" })
    │           ↓
    │
    ├─ PatientDashboard.tsx
    │   └─ Display: "Patient ID: {user?.unique_id}"
    │       └─ Output: "Patient ID: P4A7F2"
    │
    ├─ DoctorDashboard.tsx
    │   └─ Display: "Doctor ID: {user?.unique_id}"
    │       └─ Output: "Doctor ID: D8K3M9"
    │
    └─ LaboratoryDashboard.tsx
        └─ Display: "Lab ID: {user?.unique_id}"
            └─ Output: "Lab ID: L2N5Q1"
```

---

## Database Workflow

```
User Clicks "Complete Registration"
    ↓
UnifiedAuth.tsx: handleRegistration()
    ├─ Validate form fields
    ├─ Get authenticated user
    ├─ Call generateUniqueId(role)
    │   └─ Returns: "P4A7F2"
    ├─ Create user_profiles record:
    │   {
    │     user_id: "550e8400-e29b...",
    │     unique_id: "P4A7F2",  ← INSERTED HERE
    │     name: "John Doe",
    │     role: "patient",
    │     phone: "+919876543210",
    │     age: 30,
    │     gender: "Male"
    │   }
    ├─ Database CHECK: unique_id must be UNIQUE
    │   └─ OK: "P4A7F2" never seen before
    │
    ├─ Update App Context:
    │   setUser({
    │     id: "P4A7F2",
    │     name: "John Doe",
    │     type: "patient",
    │     unique_id: "P4A7F2"
    │   })
    │
    └─ Navigate to PatientDashboard
        └─ Component renders:
            "Patient ID: {user?.unique_id}"
            └─ Display: "Patient ID: P4A7F2"
```

---

## Testing Scenarios

### Scenario 1: New Patient Registration

**Input:**
```
Role: Patient
Phone: +91 9876543210
Name: John Doe
Age: 30
Gender: Male
```

**Expected Output:**
```
Database Entry:
  unique_id: P4A7F2 (random)
  role: patient
  name: John Doe

Dashboard Display:
  "Patient ID: P4A7F2"
```

### Scenario 2: New Doctor Registration

**Input:**
```
Role: Doctor
Phone: +91 9876543211
Name: Dr. Sarah Johnson
Medical License: MED123456
```

**Expected Output:**
```
Database Entry:
  unique_id: D8K3M9 (random)
  role: doctor
  name: Dr. Sarah Johnson
  gov_id: MED123456

Dashboard Display:
  "Doctor ID: D8K3M9"
```

### Scenario 3: New Lab Registration

**Input:**
```
Role: Laboratory
Phone: +91 9876543212
Name: HealthLabs Inc
License: LAB789012
```

**Expected Output:**
```
Database Entry:
  unique_id: L2N5Q1 (random)
  role: lab
  name: HealthLabs Inc
  gov_id: LAB789012

Dashboard Display:
  "Lab ID: L2N5Q1"
```

---

## API/Database Queries

### Insert User with Unique ID

```sql
INSERT INTO user_profiles (user_id, unique_id, name, role, phone, age, gender)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',  -- auth user ID
  'P4A7F2',                                 -- generated unique ID
  'John Doe',
  'patient',
  '+919876543210',
  30,
  'Male'
)
RETURNING *;
```

### Query User by Unique ID

```sql
SELECT * FROM user_profiles 
WHERE unique_id = 'P4A7F2';

-- Output:
-- id | user_id | unique_id | name | role | phone | age | gender | created_at
-- ---|---------|-----------|------|------|-------|-----|--------|----------
-- 1  | 550e... | P4A7F2    | Jo.. | pat..| +91.. | 30  | Male   | 2024-12-22
```

### Find Duplicate IDs (Should be empty)

```sql
SELECT unique_id, COUNT(*) as count
FROM user_profiles
GROUP BY unique_id
HAVING COUNT(*) > 1;

-- Expected Output (empty - no duplicates):
-- unique_id | count
-- -----------+-------
-- (0 rows)
```

---

## Summary of Features

| Feature | Implementation |
|---------|-----------------|
| **ID Format** | Prefix (P/D/L) + 6 random alphanumeric |
| **Generation Time** | During new user registration only |
| **Storage** | `user_profiles.unique_id` (TEXT, UNIQUE) |
| **Immutability** | Never updated after creation |
| **Display Labels** | "Patient ID", "Doctor ID", "Lab ID" |
| **UI Location** | Dashboard header under username |
| **Database Constraint** | UNIQUE - prevents duplicates |
| **Fallback Display** | "N/A" if unique_id is missing |

---

## Validation Rules

| Rule | Implementation |
|------|-----------------|
| Must start with correct role prefix | `generateUniqueId()` handles this |
| Must be globally unique | Database UNIQUE constraint enforces |
| Must be immutable | No UPDATE operations on unique_id |
| Must always exist for new users | NOT NULL constraint in database |
| Must display with role label | Component handles label text |

---

**Last Updated:** December 22, 2025  
**Status:** ✅ Implementation Complete
