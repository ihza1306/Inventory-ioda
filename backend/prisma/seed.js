const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Clear existing data
    await prisma.transactionHistory.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.user.deleteMany();

    // 1. Create Users
    const admin = await prisma.user.create({
        data: {
            google_uid: 'google-12345',
            email: 'admin@inventory.com',
            display_name: 'Administrator',
            photo_url: 'https://ui-avatars.com/api/?name=Admin',
            role: 'admin',
            theme_pref: 'dark'
        }
    });

    const staff = await prisma.user.create({
        data: {
            google_uid: 'google-67890',
            email: 'staff@inventory.com',
            display_name: 'Staff Member',
            photo_url: 'https://ui-avatars.com/api/?name=Staff',
            role: 'staff',
            theme_pref: 'light'
        }
    });

    console.log('Users created');

    // 2. Create Inventory Items
    const items = [
        {
            name: 'Hammer Bosch',
            sku: 'HM-001',
            category: 'Tools',
            stock_qty: 10,
            unit: 'Pcs',
            condition: 'Good',
            location: 'Warehouse A - Shelf 1',
            last_updated_by: admin.user_id,
            image_url: 'https://images.unsplash.com/photo-1586864387917-f53bc2644342?q=80&w=200'
        },
        {
            name: 'Electric Drill Makita',
            sku: 'ED-002',
            category: 'Power Tools',
            stock_qty: 5,
            unit: 'Pcs',
            condition: 'Good',
            location: 'Warehouse A - Shelf 2',
            last_updated_by: admin.user_id,
            image_url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=200'
        },
        {
            name: 'Screwdriver Set',
            sku: 'SS-003',
            category: 'Tools',
            stock_qty: 20,
            unit: 'Set',
            condition: 'Good',
            location: 'Warehouse B - Room 1',
            last_updated_by: staff.user_id,
            image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=200'
        }
    ];

    for (const item of items) {
        await prisma.inventoryItem.create({ data: item });
    }

    console.log('Inventory items created');

    // 3. Create initial transactions
    const hammer = await prisma.inventoryItem.findUnique({ where: { sku: 'HM-001' } });

    await prisma.transactionHistory.create({
        data: {
            item_id: hammer.item_id,
            user_id: staff.user_id,
            type: 'OUT',
            qty_change: -2,
            notes: 'Borrowed for renovation project'
        }
    });

    // Update stock
    await prisma.inventoryItem.update({
        where: { item_id: hammer.item_id },
        data: { stock_qty: 8 }
    });

    console.log('Initial transactions created');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
