# Inventory Lending System - Backend

This is the backend for the Inventory Lending System, built with Node.js, Express, and Prisma.

## Tech Stack
- **Node.js**: Runtime environment.
- **Express**: Web framework.
- **Prisma**: ORM for database management.
- **SQLite**: Database (easily swappable to PostgreSQL/MySQL).

## API Endpoints

### 1. Users
- `GET /api/users`: Get all users.
- `POST /api/users`: Upsert a user (Google Auth integration point).

### 2. Inventory Items
- `GET /api/inventory`: Get all inventory items.
- `POST /api/inventory`: Create a new inventory item.

### 3. Transactions (Lending/Returning)
- `GET /api/transactions`: Get transaction history.
- `POST /api/transactions`: Create a new transaction (automatically updates stock).
  - Payload example:
    ```json
    {
      "item_id": "uuid",
      "user_id": "uuid",
      "type": "OUT",
      "qty_change": -1,
      "notes": "Project X"
    }
    ```

## Setup Instructions
1. Navigate to `backend/`
2. Install dependencies: `npm install`
3. Ensure `.env` is configured (currently using SQLite).
4. Run migrations: `npx prisma migrate dev`
5. Seed data: `node prisma/seed.js`
6. Start the server: `npm run dev`

## Database Schema
The schema follows your requirements:
- **Users**: google_uid, email, role, theme_pref.
- **InventoryItems**: SKU, category, stock_qty, condition, location.
- **TransactionHistory**: tracks all movements (IN/OUT/ADJUST).
