# 🚀 Nearza Backend - API Testing Status

Last Updated: 2026-02-28

Legend:
✅ = Working Properly  
❌ = Tested but Error  
⏳ = Not Tested Yet  

---

## 🧑‍💼 User Module

### 🔓 Public Routes
- Send OTP → ✅
- Verify OTP & Authenticate → ✅

### 🔐 User Protected Routes
- Get User Profile → ✅
- Update User Profile → ✅
- Logout → ✅
- Delete Account (Soft Delete) → ✅

### 👑 Admin Routes
- Get All Users (Pagination + Search + Filters) → ✅
- Update Account Status → ✅
- Get Single User By ID → ✅

---

## 🏪 Seller Module

### 🔐 User Protected Routes
- Apply for seller account → ⏳
- My Application → ⏳
- Resubmit Seller Application → ⏳

### 🔐 Seller Protected Routes
- Seller Profile → ⏳
- Update Seller Profile → ⏳
- Soft Delete Seller Profile → ⏳
- Restore Seller Profile → ⏳

### 👑 Admin Routes
- All Seller Applications → ⏳
- Get Seller Details By ID → ⏳
- Update Seller Status → ⏳


---

## 📂 Category Module

### 🔓 Public Routes
- All Categories → ✅
- Single Category → ✅

### 👑 Admin Routes
- Create Category → ❌ <!-- Validation error -->
- Delete Category → ✅
- Soft Delete Category → ✅
- Update Category → ❌ <!-- Validation error -->
- Toggle Category Status → ✅
- All Categories For Admin → ✅

<!-- Fix image for deletion -->