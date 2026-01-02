process.env.DATABASE_URL = "file:g:/Inventory/backend/prisma/dev.db";
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!user) {
        console.log('No admin found. Please login as admin first.');
        return;
    }

    const cats = ['Kamera', 'Lensa', 'Elektronik', 'Peralatan', 'Furniture'];
    for (const name of cats) {
        await prisma.category.upsert({
            where: { name },
            update: {},
            create: { name }
        });
    }
    console.log('Default categories ensured.');

    const assets = [
        { name: 'a6400 BO', sku: 'CAM-A6400-001', category: 'Kamera', stock_qty: 1, unit: 'Unit', condition: 'Good', location: 'Gudang Utama', last_updated_by: user.user_id },
        { name: 'a6300 BO', sku: 'CAM-A6300-001', category: 'Kamera', stock_qty: 1, unit: 'Unit', condition: 'Good', location: 'Gudang Utama', last_updated_by: user.user_id },
        { name: '7Artisan', sku: 'LENS-7ART-001', category: 'Lensa', stock_qty: 1, unit: 'Unit', condition: 'Good', location: 'Gudang Utama', last_updated_by: user.user_id },
        { name: 'Sigma 30mm f 1.4', sku: 'LENS-SIG30-001', category: 'Lensa', stock_qty: 1, unit: 'Unit', condition: 'Good', location: 'Gudang Utama', last_updated_by: user.user_id }
    ];

    for (const asset of assets) {
        await prisma.inventoryItem.upsert({
            where: { sku: asset.sku },
            update: asset,
            create: asset
        });
        console.log('Added/Updated:', asset.name);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
