-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TransactionHistory" (
    "trx_id" TEXT NOT NULL PRIMARY KEY,
    "item_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "qty_change" INTEGER NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "is_returned" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransactionHistory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "InventoryItem" ("item_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransactionHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TransactionHistory" ("is_returned", "item_id", "notes", "qty_change", "timestamp", "trx_id", "type", "user_id") SELECT "is_returned", "item_id", "notes", "qty_change", "timestamp", "trx_id", "type", "user_id" FROM "TransactionHistory";
DROP TABLE "TransactionHistory";
ALTER TABLE "new_TransactionHistory" RENAME TO "TransactionHistory";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
