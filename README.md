# Inventory Management System

A modern inventory management system with real-time tracking, user management, and transaction history.

## Features

- 📦 **Inventory Management**: Track assets, categories, and stock levels
- 👥 **User Management**: Role-based access control (Owner, Admin, User)
- 💳 **Shared Accounts**: Manage platform credentials
- 📊 **Dashboard**: Real-time analytics and insights
- 🔔 **Notifications**: Stay updated with system events
- 🔐 **Authentication**: Secure login with Google Sign-In support

## Tech Stack

### Frontend
- React 18 with Vite
- TailwindCSS for styling
- Framer Motion for animations
- React Router for navigation
- Firebase Authentication
- Axios for API calls

### Backend
- Node.js with Express
- Prisma ORM
- SQLite database
- JWT authentication

## Getting Started

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Inventory
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Set up environment variables:
   - Create `.env` file in the backend directory
   - Add necessary configuration (database URL, JWT secret, etc.)

### Running Locally

1. Start the backend server:
```bash
cd backend
npm start
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Deployment

### Firebase Hosting

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Deploy to Firebase:
```bash
firebase deploy --only hosting
```

## Project Structure

```
Inventory/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── utils/
│   │   └── main.jsx
│   └── package.json
├── backend/           # Node.js backend API
│   ├── prisma/
│   ├── index.js
│   └── package.json
└── firebase.json      # Firebase configuration
```

## License

This project is private and proprietary.
