-- CreateTable
CREATE TABLE "User" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "google_uid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "photo_url" TEXT,
    "theme_pref" TEXT NOT NULL DEFAULT 'system',
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "item_id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "stock_qty" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'Good',
    "location" TEXT NOT NULL,
    "image_url" TEXT,
    "last_updated_by" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "InventoryItem_last_updated_by_fkey" FOREIGN KEY ("last_updated_by") REFERENCES "User" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransactionHistory" (
    "trx_id" TEXT NOT NULL PRIMARY KEY,
    "item_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "qty_change" INTEGER NOT NULL,
    "notes" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransactionHistory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "InventoryItem" ("item_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransactionHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_google_uid_key" ON "User"("google_uid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_sku_key" ON "InventoryItem"("sku");
