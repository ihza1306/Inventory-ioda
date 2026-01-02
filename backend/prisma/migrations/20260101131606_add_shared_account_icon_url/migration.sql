-- AlterTable
ALTER TABLE "SharedAccount" ADD COLUMN "icon_url" TEXT;
ALTER TABLE "SharedAccount" ADD COLUMN "url" TEXT;

-- CreateTable
CREATE TABLE "Category" (
    "category_id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'system_config',
    "company_name" TEXT NOT NULL DEFAULT 'IODA Academy',
    "pt_name" TEXT NOT NULL DEFAULT 'PT. Ioda Academy Indonesia',
    "company_address" TEXT NOT NULL DEFAULT 'Jakarta, Indonesia',
    "company_logo" TEXT NOT NULL DEFAULT 'https://api.dicebear.com/7.x/initials/svg?seed=IA',
    "report_number_format" TEXT NOT NULL DEFAULT 'IODA/INV/2026',
    "pic_email" TEXT NOT NULL DEFAULT 'admin@ioda.academy',
    "company_phone" TEXT NOT NULL DEFAULT '628123456789',
    "wa_confirm_borrow" TEXT NOT NULL DEFAULT 'Halo {name}, anda telah meminjam {item} sejumlah {qty}. Harap jaga barang dengan baik.',
    "wa_confirm_return" TEXT NOT NULL DEFAULT 'Halo {name}, barang {item} telah berhasil dikembalikan. Terima kasih.',
    "wa_notify_damage" TEXT NOT NULL DEFAULT 'Halo {name}, ditemukan kerusakan pada barang {item} yang anda pinjam. Mohon segera hubungi admin.',
    "wa_notify_loss" TEXT NOT NULL DEFAULT 'Halo {name}, terdapat kekurangan/kehilangan pada peminjaman {item} anda. Mohon segera diklarifikasi.',
    "wa_notify_overdue" TEXT NOT NULL DEFAULT 'Halo {name}, peminjaman {item} anda telah melewati batas waktu. Mohon segera lakukan pengembalian atau perpanjangan.',
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
