# 👤 User Authentication API Documentation

> **System:** Passwordless OTP-based Login/Signup System

---

## 📖 Table of Contents

1. [System Overview](#-system-overview)
2. [Authentication Flow](#-authentication-flow)
3. [API Endpoints](#-api-endpoints)
4. [Error Responses](#-error-responses)
5. [Database Schema](#-database-schema)

---

## 🎯 System Overview

Ye system **OTP (One-Time Password)** use karke users ko login/signup karne deta hai:

- ✅ **No Password Required** - Sirf email ya phone chahiye
- ✅ **Auto Signup** - Naye user automatically create ho jate hain
- ✅ **Secure** - JWT tokens aur HttpOnly cookies
- ✅ **5-Minute OTP Validity** - Security ke liye
- ✅ **Dual Database** - MongoDB (OTP) + SQL (Users)
- ✅ **Soft Delete Support** - Account restore window (24h to 30 days)

---

## 🔄 Authentication Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                              │
└──────────────────────────────────────────────────────────────────┘

Step 1: Send OTP Request
┌─────────────────────────────────────────────────────────┐
│  User enters:                                           │
│  • Email (example@gmail.com) OR                         │
│  • Phone (9876543210)                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Backend Process:                                       │
│  1. Validate input (Joi validation)                     │
│  2. Generate 6-digit OTP (123456)                       │
│  3. Store in MongoDB:                                   │
│     - email/phone                                       │
│     - otp value                                         │
│     - expiresAt (current time + 5 minutes)              │
│  4. Return success response                             │
│     ⚠️ Production: Send OTP via Email/SMS               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  User receives OTP                                      │
│  (Development: In response | Production: Email/SMS)     │
└─────────────────────────────────────────────────────────┘


Step 2: Verify OTP
┌─────────────────────────────────────────────────────────┐
│  User enters:                                           │
│  • Email/Phone (same as before)                         │
│  • OTP (6 digits)                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Backend Verification:                                  │
│  1. Find latest OTP in MongoDB (match + expiry check)   │
│  2. Check user in SQL database (paranoid: false)        │
│     → includes soft-deleted users                       │
└────────────────────┬────────────────────────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
            ▼                 ▼
    ┌──────────────┐   ┌──────────────┐
    │ User Found   │   │ New User     │
    │ (Existing)   │   │ (First Time) │
    └──────┬───────┘   └──────┬───────┘
           │                  │
           │                  ▼
           │          ┌──────────────────┐
           │          │ Create User:     │
           │          │ - email/phone    │
           │          │   (other fields  │
           │          │   use DB defaults│
           │          │   )              │
           │          │ - isNewUser=true │
           │          └──────┬───────────┘
           │                 │
           └─────────┬───────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Soft-Delete Check (if user.deletedAt exists):          │
│                                                         │
│  < 24 hours since deletion  → ❌ BLOCK (wait 24h)       │
│  24h to 30 days             → ✅ AUTO RESTORE account   │
│  > 30 days                  → ❌ BLOCK (permanently     │
│                                  deleted)               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Status Check:                                          │
│  BLOCKED    → ❌ 403 Error                              │
│  DISABLED   → ❌ 403 Error                              │
│  SUSPENDED  → ❌ 403 Error                              │
│  ACTIVE     → ✅ Continue                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Token Generation & Cleanup:                            │
│  1. Generate JWT token (id, email/phone, roles)         │
│  2. Delete ALL OTPs for that email/phone from MongoDB   │
│  3. Set token in HttpOnly cookie (maxAge: 24h)          │
│  4. Return response with:                               │
│     - token                                             │
│     - user data                                         │
│     - isNewUser flag                                    │
└────────────────────┬────────────────────────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
            ▼                 ▼
    ┌──────────────┐   ┌──────────────┐
    │ isNewUser:   │   │ isNewUser:   │
    │ true         │   │ false        │
    └──────┬───────┘   └──────┬───────┘
           │                  │
           ▼                  ▼
    Profile Page         Dashboard
```

---

## 🚀 API Endpoints

### 1️⃣ Send OTP

**📍 Endpoint:** `POST /api/users/send-otp`

**📝 Purpose:** User ko OTP bhejne ke liye

**📥 Input:**

```json
// Option 1: Email
{
  "email": "user@gmail.com"
}

// Option 2: Phone
{
  "phone": "9876543210"
}
```

**✅ Success Response:**

```json
{
    "success": true,
    "message": "A one-time verification code has been sent successfully.",
    "data": {
        "email": "example@example.com",
        "otp": "123456"
    }
}

```

### 2️⃣ Verify OTP & Authenticate

**📍 Endpoint:** `POST /api/users/verify-otp`

**📝 Purpose:** OTP verify karke user ko login/signup karna

**📥 Input:**

```json
// With Email
{
  "email": "user@gmail.com",
  "otp": "123456"
}

// With Phone
{
  "phone": "9876543210",
  "otp": "123456"
}
```

**✅ Input Validation:**

| Field   | Required                               | Rules                                 | Valid Examples                                         |
| ------- | -------------------------------------- | ------------------------------------- | ------------------------------------------------------ |
| `email` | Optional (but email OR phone required) | • Valid email<br>• Domain: .com/.in   | ✅ user@gmail.com                                      |
| `phone` | Optional (but email OR phone required) | • Exactly 10 digits<br>• Numbers only | ✅ 9876543210                                          |
| `otp`   | **Required**                           | • Exactly 6 digits<br>• Numbers only  | ✅ 123456<br>❌ 12345 (5 digits)<br>❌ 12345a (letter) |

**✅ Success Response (New User):**

```json
{
    "success": true,
    "message": "You have been authenticated successfully.",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyIiwiZW1haWwiOiJiaWxhbHNoZWlraDQ4QGV4YW1wbGUuY29tIiwicm9sZXMiOlsiQ1VTVE9NRVIiXSwiaWF0IjoxNzcyMjY5NDM0LCJleHAiOjE3NzM1NjU0MzR9.jBWyBsl0D6lia7iLXIJ-rkU3oFJoFyAkGx9P61ByCKA",
        "user": {
            "roles": [
                "CUSTOMER"
            ],
            "status": "ACTIVE",
            "id": 12,
            "email": "bilalsheikh48@example.com",
            "phone": null,
            "updatedAt": "2026-02-28T09:03:54.506Z",
            "createdAt": "2026-02-28T09:03:54.506Z"
        },
        "isNewUser": true
    }
}
```

**✅ Success Response (Existing User):**

```json
{
    "success": true,
    "message": "You have been authenticated successfully.",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIiLCJlbWFpbCI6ImF5ZXNoYWtoYW45MkBleGFtcGxlLmNvbSIsInBob25lIjoiOTEyMzQ1Njc4MCIsInJvbGVzIjpbIkNVU1RPTUVSIl0sImlhdCI6MTc3MjI2OTUwMywiZXhwIjoxNzczNTY1NTAzfQ.dXhxzBcKc9uOPg6aPJX135xC7fr5-Vf4Ayn44nPn9_M",
        "user": {
            "id": 2,
            "fullName": "Ayesha Khan",
            "email": "ayeshakhan92@example.com",
            "phone": "9123456780",
            "roles": [
                "CUSTOMER"
            ],
            "status": "ACTIVE",
            "profileImage": "https://res.cloudinary.com/al-aftab/image/upload/v1772260416/nearza/bdvubw25plwd824owfiu.jpg",
            "refreshToken": null,
            "createdAt": "2026-02-28T04:44:03.000Z",
            "updatedAt": "2026-02-28T06:35:14.000Z",
            "deletedAt": null
        },
        "isNewUser": false
    }
}

```

**🎯 Frontend Logic:**

- **isNewUser === true** → User ko profile completion page par bhejo
- **isNewUser === false** → User ko dashboard/home par bhejo
---

### 3️⃣ Get User Profile

**📍 Endpoint:** `GET /api/users/user-profile`

**📝 Purpose:** Logged-in user ka profile data fetch karna

**🔒 Authentication:** Required (JWT Token in Cookie or Header)

**📥 Input:** None (token se user identify hota hai)

**✅ Success Response:**

```json
{
    "success": true,
    "message": "Your profile has been retrieved successfully.",
    "data": {
        "id": 2,
        "fullName": "Ayesha Khan",
        "email": "ayeshakhan92@example.com",
        "phone": "9123456780",
        "roles": [
            "CUSTOMER"
        ],
        "status": "ACTIVE",
        "profileImage": "https://res.cloudinary.com/al-aftab/image/upload/v1772260416/nearza/bdvubw25plwd824owfiu.jpg",
        "refreshToken": null,
        "createdAt": "2026-02-28T04:44:03.000Z",
        "updatedAt": "2026-02-28T06:35:14.000Z",
        "deletedAt": null
    }
}

```
---

### 4️⃣ Update User Profile

**📍 Endpoint:** `PUT /api/users/update-profile`

**📝 Purpose:** User apna profile complete/update kare (name, email, phone, image)

**🔒 Authentication:** Required (JWT Token)

**📥 Input:** `multipart/form-data`

```
fullName  (optional) - string
email     (optional) - string
phone     (optional) - string
file      (optional) - image file (profileImage)
```

**✅ Success Response:**

```json
{
    "success": true,
    "message": "Your profile has been updated successfully.",
    "data": {
        "id": 2,
        "fullName": "Ayesha Khan",
        "email": "ayeshakhan92@example.com",
        "phone": "9121116780",
        "roles": [
            "CUSTOMER"
        ],
        "status": "ACTIVE",
        "profileImage": "https://res.cloudinary.com/al-aftab/image/upload/v1772260416/nearza/bdvubw25plwd824owfiu.jpg",
        "refreshToken": null,
        "createdAt": "2026-02-28T04:44:03.000Z",
        "updatedAt": "2026-02-28T09:11:22.738Z",
        "deletedAt": null
    }
}
```

---

### 5️⃣ Logout

**📍 Endpoint:** `POST /api/users/logout`

**📝 Purpose:** User ko logout karna

**🔒 Authentication:** Required (JWT Token)

**📥 Input:** None

**✅ Success Response:**

```json
{
  "success": true,
  "data": "You have been logged out successfully.",
  "message": "You have been logged out successfully."
}
```

**🎯 Frontend Logic:**

- Local storage clear karo
- User ko login page par redirect karo

---

### 6️⃣ Delete Account

**📍 Endpoint:** `DELETE /api/users/delete-account`

**📝 Purpose:** User apna account delete kare (soft delete)

**🔒 Authentication:** Required (JWT Token)

**📥 Input:** None

**✅ Success Response:**

```json
{
  "success": true,
  "data": "Your account has been deleted successfully.",
  "message": "Your account has been deleted successfully."
}
```

**⚠️ Restore Window:**

```
Deleted at T=0
├── T < 24h       → Login blocked (wait 24 hours)
├── 24h < T < 30d → Auto-restored on next successful login
└── T > 30d       → Permanently blocked (cannot restore)
```

---

## 🛡️ Admin Endpoints

### 7️⃣ Get All Users (Admin Only)

**📍 Endpoint:** `GET /api/users/all-users`

**📝 Purpose:** Paginated list of all users with search/filter

**🔒 Authentication:** Admin role required

**📥 Query Params:**

| Param    | Type   | Default | Max | Description                       |
| -------- | ------ | ------- | --- | --------------------------------- |
| `page`   | number | 1       | —   | Page number (min: 1)              |
| `limit`  | number | 20      | 100 | Results per page                  |
| `search` | string | —       | —   | Search by fullName, email, phone  |
| `role`   | string | —       | —   | Filter by role (e.g. `CUSTOMER`)  |
| `status` | string | —       | —   | Filter by status (e.g. `ACTIVE`)  |

**✅ Success Response:**

```json
{
  "statusCode": 200,
  "data": {
    "users": [...],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "totalPages": 8
    }
  },
  "message": "User list retrieved successfully."
}
```

---

### 8️⃣ Update User Status (Admin Only)

**📍 Endpoint:** `PUT /api/users/account-status/:userId`

**📝 Purpose:** Admin kisi bhi user ka status change kare

**🔒 Authentication:** Admin role required

**📥 Input:**

```json
{
  "status": "BLOCKED"
}
```

**✅ Success Response:**

```json
{
  "success": true,
  "data": { /* updated user object */ },
  "message": "The user's account status has been updated successfully."
}
```

---

### 9️⃣ Get Single User (Admin View)

**📍 Endpoint:** `GET /api/users/single-user/:userId`

**📝 Purpose:** Single user ka complete data fetch karna

**🔒 Authentication:** Admin role required

**✅ Success Response:**

```json
{
  "success": true,
  "data": { /* full user object */ },
  "message": "User details retrieved successfully."
}
```

---

## ⚠️ Error Responses

### Common Error Format:

```json
{
  "statusCode": 400,
  "success":false,
  "message": "Error description here"
}
```
---

## 📊 Database Schema

### 🍃 MongoDB - OTP Collection

**Purpose:** Temporary OTP storage (configurable validity)

```
{
  _id: ObjectId,
  email: String or null,
  phone: String or null,
  otp: String,                    // "123456"
  expiresAt: Date,                // Current time + OTP_EXPIRY_MINUTES (default: 5)
  createdAt: Date                 // Auto-generated timestamp
}
```

**Example:**

```json
{
  "_id": "65b9c8f7a1b2c3d4e5f6a7b8",
  "email": "user@gmail.com",
  "phone": null,
  "otp": "123456",
  "expiresAt": "2024-01-30T10:05:00.000Z",
  "createdAt": "2024-01-30T10:00:00.000Z"
}
```

**Indexes:**

- `email` (for fast lookup)
- `phone` (for fast lookup)
- `expiresAt` (TTL index for automatic deletion)

---

### 🗄️ SQL Database - Users Table

**Purpose:** Permanent user data storage

```
Column Name     | Type          | Description
----------------|---------------|----------------------------------
id              | INTEGER       | Primary key (auto-increment)
fullName        | VARCHAR(255)  | User's full name (nullable, filled via profile completion)
email           | VARCHAR(255)  | Unique email (nullable if phone signup)
phone           | VARCHAR(10)   | 10-digit phone number (nullable if email signup)
roles           | JSON          | Array: ["CUSTOMER"] or ["SELLER", "CUSTOMER"]
status          | ENUM          | ACTIVE, DISABLED, BLOCKED, SUSPENDED
profileImage    | TEXT          | Cloudinary secure_url
cart            | JSON          | Array of cart items
wishlist        | JSON          | Array of product IDs
addresses       | JSON          | Array of address objects
refreshToken    | TEXT          | For future token refresh feature (excluded from API responses)
deletedAt       | TIMESTAMP     | Soft delete timestamp (Sequelize paranoid mode)
createdAt       | TIMESTAMP     | Account creation time
updatedAt       | TIMESTAMP     | Last update time
```

**Example:**

```json
{
  "id": 1,
  "fullName": "John Doe",
  "email": "john@gmail.com",
  "phone": "9876543210",
  "roles": ["CUSTOMER"],
  "status": "ACTIVE",
  "profileImage": "https://res.cloudinary.com/example/john.jpg",
  "cart": [{ "productId": 101, "quantity": 2 }],
  "wishlist": [201, 202],
  "addresses": [
    {
      "type": "home",
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    }
  ],
  "refreshToken": null,
  "deletedAt": null,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-30T10:00:00.000Z"
}
```

**Indexes:**

- `email` (unique)
- `phone`
- `deletedAt` (for paranoid queries)

---

## 🔒 Security Features

### 1️⃣ OTP Security

```
Feature               | Implementation
----------------------|----------------------------------
Expiry Time           | OTP_EXPIRY_MINUTES env var (default: 5 min)
One-Time Use          | deleteMany (ALL OTPs for email/phone) after verification
Latest OTP Priority   | .sort({ createdAt: -1 }) — latest OTP wins
Length                | 6 digits (000000 to 999999)
Type                  | Numeric only
Storage               | MongoDB (temporary)
```

### 2️⃣ Token Security

```
Feature               | Implementation
----------------------|----------------------------------
Type                  | JWT (JSON Web Token)
Expiry                | 1 day (24 hours) via cookie maxAge
Storage               | HttpOnly Cookie (XSS protection)
Secure Flag           | true in production (HTTPS only)
SameSite              | strict (CSRF protection)
Payload               | user id, email/phone (whichever present), roles
```

### 3️⃣ Cookie Configuration

```
Property         | Value                      | Purpose
-----------------|----------------------------|---------------------------
httpOnly         | true                       | JavaScript se access nahi
secure           | true (production only)     | HTTPS-only transmission
sameSite         | strict                     | CSRF attack prevention
maxAge           | 86400000 ms (24 hours)     | Auto-expire after 1 day
```

### 4️⃣ Account Deletion Policy (Soft Delete)

```
Time Since Deletion  | Login Attempt Result
---------------------|------------------------------------------
< 24 hours           | ❌ Blocked — "restore after 24 hours"
24h – 30 days        | ✅ Auto-restored on successful OTP verify
> 30 days            | ❌ Blocked — "permanently deleted"
```

---

## 📝 Important Notes

### 🚨 Development vs Production

**Development:**

- ✅ OTP response me visible hai (testing ke liye)
- ✅ Console logs enabled
- ✅ Detailed error messages
- ⚠️ `secure` cookie flag: `false` (HTTP allowed)

**Production:**

- ❌ OTP response me nahi bhejana
- ✅ Email/SMS service integrate karo (TODO in code)
- ✅ Rate limiting add karo (OTP spam prevention)
- ✅ Proper logging setup
- ✅ HTTPS mandatory (`secure: true` auto-enabled via `NODE_ENV=production`)
- ✅ Generic error messages (security)

### ⏱️ Timing Diagram

```
T = 0:00        User requests OTP
                ↓
T = 0:01        OTP generated & stored (expires at T = 5:01)
                ↓
T = 0:30        User enters OTP → ✅ Valid
                ↓
T = 5:00        Same OTP entered → ✅ Still valid
                ↓
T = 5:02        Same OTP entered → ❌ Expired
                ↓
                User must request new OTP
```

### 🔄 OTP Reuse Prevention

```
Scenario 1: Normal Flow
Request OTP → OTP stored → User verifies → ALL OTPs for email/phone deleted ✅

Scenario 2: Multiple OTPs
Request OTP #1 (123456)
Request OTP #2 (789012) ← Latest
Verify with 789012 → ✅ Success (latest OTP via .sort createdAt: -1)
Verify with 123456 → ❌ Fails (older OTP, sort picks 789012 first)

Scenario 3: Already Used
Request OTP → Verify → ALL OTPs deleted via deleteMany
Try to verify again → ❌ "The verification code you entered is invalid."
```

---

## 🎯 Response Data Meaning

### isNewUser Flag

```
isNewUser = true
└─ Matlab: User pehli baar login kar raha hai
   └─ Frontend Action: Profile completion page par bhejo
      └─ User ko fullName, phone/email wagera fill karne do

isNewUser = false
└─ Matlab: User pehle se registered hai
   └─ Frontend Action: Seedha dashboard par bhejo
      └─ User ready to use app
```

### User Status Values

```
ACTIVE      → Normal user, full access
DISABLED    → Account temporarily disabled
BLOCKED     → Admin ne block kiya (policy violation)
SUSPENDED   → Temporary suspension (under review)
```

### User Roles

```
CUSTOMER    → Normal buyer
SELLER      → Can sell products (extra sellerProfile table)
ADMIN       → Full system access

Note: Ek user ke multiple roles ho sakte hain
Example: ["CUSTOMER", "SELLER"] - Buyer bhi, seller bhi
```

---

**🎉 Documentation Complete!**
