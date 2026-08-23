# PCET CPMS — Admin Portal (Placement Management Platform)

A standalone administrative frontend built for the **Central Placement Management System (CPMS)** powering multi-institution placement drives, hierarchical role governance, and batch candidate onboarding.

---

## 🚀 Tech Stack

- **Framework**: React 19 + JavaScript + Vite
- **Styling**: Vanilla CSS (High-contrast 10-tone design scale with Glassmorphism)
- **Icons**: Lucide React
- **Spreadsheet Parsing**: SheetJS (`xlsx`)
- **Authentication**: Asymmetric RS256 JWT with refresh token rotation

---

## 📁 Key Features

- **Administrative Login**: Secure RS256 JWT authentication (`POST /api/auth/login`).
- **Hierarchical Access Control**: Dynamic child role provisioning enforcing `RoleHierarchyPolicy` (`POST /api/auth/roles/users`).
- **Account Activation**: Token-based password configuration (`POST /api/auth/roles/accept-invite`).
- **Excel Student Import Studio**: Drag-and-drop `.xlsx`/`.csv` parsing, row-level validation, live data preview, and batch API transmission (`POST /api/admin/bulk-student`).
- **Institutional Management**: 3-tier CRUD management for Educational Trusts, Affiliated Colleges, and Academic Departments.

---

## 🛠 Local Setup & Running

### Prerequisites
- Node.js (v18+)
- Backend microservices running on:
  - `auth-service`: `http://localhost:8081`
  - `admin-service`: `http://localhost:8082`
  - `user-service`: `http://localhost:8083`

### Installation & Launch

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev

# 3. Build for production
npm run build
```

The application runs on `http://localhost:3000/`.
