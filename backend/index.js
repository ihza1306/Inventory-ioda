const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const path = require('path');
const multer = require('multer');

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Basic sanity check route
app.get('/', (req, res) => {
    res.json({ message: 'Inventory Lending System API is running' });
});

app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const totalItemsCount = await prisma.inventoryItem.count();
        const lowStockCount = await prisma.inventoryItem.count({
            where: { stock_qty: { lte: 5 } }
        });

        const outSum = await prisma.transactionHistory.aggregate({
            _sum: { qty_change: true },
            where: {
                type: 'OUT',
                is_returned: false,
                status: 'COMPLETED'
            }
        });

        const itemsOut = Math.abs(outSum._sum.qty_change || 0);

        // Overdue = OUT, not returned, older than 3 days
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const overdueCount = await prisma.transactionHistory.count({
            where: {
                type: 'OUT',
                is_returned: false,
                status: 'COMPLETED',
                timestamp: { lt: threeDaysAgo }
            }
        });

        // This week's borrowing
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const thisWeekBorrowed = await prisma.transactionHistory.count({
            where: {
                type: 'OUT',
                timestamp: { gte: startOfWeek }
            }
        });

        // Chart Data: Last 7 days in/out
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const startOfDay = new Date(date.setHours(0, 0, 0, 0));
            const endOfDay = new Date(date.setHours(23, 59, 59, 999));

            const dayIn = await prisma.transactionHistory.count({
                where: { type: 'IN', timestamp: { gte: startOfDay, lte: endOfDay } }
            });
            const dayOut = await prisma.transactionHistory.count({
                where: { type: 'OUT', timestamp: { gte: startOfDay, lte: endOfDay } }
            });

            chartData.push({
                day: date.toLocaleDateString('id-ID', { weekday: 'short' }),
                in: dayIn,
                out: dayOut
            });
        }

        // Overdue Items List
        const overdueItems = await prisma.transactionHistory.findMany({
            where: {
                type: 'OUT',
                is_returned: false,
                status: 'COMPLETED',
                timestamp: { lt: threeDaysAgo }
            },
            include: { item: true, user: true },
            take: 3
        });

        res.json({
            totalItems: totalItemsCount,
            lowStockCount: lowStockCount,
            itemsOut: Math.max(0, itemsOut),
            overdueCount: overdueCount,
            thisWeekBorrowed: thisWeekBorrowed,
            totalTransactions: await prisma.transactionHistory.count(),
            chartData,
            overdueItems: overdueItems.map(trx => ({
                name: trx.item.name,
                borrower: trx.user.display_name,
                time: `-${Math.floor((new Date() - new Date(trx.timestamp)) / (1000 * 60 * 60 * 24))} Hari`,
                img: trx.item.image_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${trx.item.sku}`
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- USER ROUTES ---
app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { user_id: id }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/:id/profile', async (req, res) => {
    try {
        const { id } = req.params;
        const { display_name, photo_url, phone } = req.body;
        const updatedUser = await prisma.user.update({
            where: { user_id: id },
            data: { display_name, photo_url, phone }
        });
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/upload-profile', upload.single('image'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const filePath = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.json({ url: filePath });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports/category-stats', async (req, res) => {
    try {
        const stats = await prisma.inventoryItem.groupBy({
            by: ['category'],
            _count: {
                item_id: true
            }
        });
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports/stock-trend', async (req, res) => {
    try {
        // Simple aggregate of transactions over the last 7 days
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        const transactions = await prisma.transactionHistory.findMany({
            where: {
                timestamp: { gte: last7Days },
                status: 'COMPLETED'
            },
            select: {
                timestamp: true,
                type: true,
                qty_change: true
            }
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { google_uid, email, display_name, photo_url, phone, role } = req.body;

        let user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            // Update existing
            const updateData = {};
            if (display_name) updateData.display_name = display_name;
            if (photo_url) updateData.photo_url = photo_url;
            if (phone) updateData.phone = phone;
            if (role) updateData.role = role;

            // Update google_uid if logging in and current is invite placeholder
            if (google_uid && (!user.google_uid || user.google_uid.startsWith('invite_'))) {
                updateData.google_uid = google_uid;
            }

            user = await prisma.user.update({
                where: { email },
                data: updateData
            });
        } else {
            // Create new
            const isAdminEmail = ['ihza@iodacademy.id', 'heldi@iodacademy.id', 'nabila@iodacademy.id', 'admin@inventory.com'].includes(email.toLowerCase());
            user = await prisma.user.create({
                data: {
                    google_uid: google_uid || `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    email,
                    display_name: display_name || email.split('@')[0],
                    photo_url,
                    phone,
                    role: role || (isAdminEmail ? 'admin' : 'viewer')
                }
            });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const user = await prisma.user.update({
            where: { user_id: id },
            data: { role }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const transactionCount = await prisma.transactionHistory.count({ where: { user_id: id } });
        if (transactionCount > 0) {
            return res.status(400).json({ error: 'User ini memiliki riwayat transaksi dan tidak bisa dihapus. Silakan blokir aksesnya saja.' });
        }
        await prisma.user.delete({ where: { user_id: id } });
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- INVENTORY ROUTES ---
app.get('/api/inventory', async (req, res) => {
    try {
        const items = await prisma.inventoryItem.findMany({
            include: { user: true }
        });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/inventory', async (req, res) => {
    try {
        const { name, sku, category, stock_qty, unit, condition, location, last_updated_by, image_url } = req.body;
        const item = await prisma.inventoryItem.create({
            data: { name, sku, category, stock_qty, unit, condition, location, last_updated_by, image_url }
        });
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sku, category, stock_qty, unit, condition, location, last_updated_by, image_url } = req.body;
        const item = await prisma.inventoryItem.update({
            where: { item_id: id },
            data: { name, sku, category, stock_qty, unit, condition, location, last_updated_by, image_url }
        });
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // First delete transactions associated with this item to avoid constraint errors
        await prisma.transactionHistory.deleteMany({
            where: { item_id: id }
        });
        const item = await prisma.inventoryItem.delete({
            where: { item_id: id }
        });
        res.json({ message: 'Item deleted', item });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- TRANSACTION ROUTES ---
app.post('/api/transactions', async (req, res) => {
    try {
        try {
            const { item_id, user_id, type, qty_change, notes, original_trx_id, status = 'COMPLETED' } = req.body;

            // Use a transaction to ensure atomic update
            const result = await prisma.$transaction(async (tx) => {
                // 1. Check current stock if borrowing (even for requests, check availability)
                if (qty_change < 0) {
                    const item = await tx.inventoryItem.findUnique({ where: { item_id } });
                    if (!item || item.stock_qty + qty_change < 0) {
                        throw new Error('Stok tidak mencukupi untuk transaksi ini.');
                    }
                }

                // 2. If it's a return, update the original record
                if (original_trx_id && type === 'IN') {
                    await tx.transactionHistory.update({
                        where: { trx_id: original_trx_id },
                        data: { is_returned: true }
                    });
                }

                // 3. Create history record
                const trx = await tx.transactionHistory.create({
                    data: { item_id, user_id, type, qty_change, notes, status, is_returned: type === 'IN' }
                });

                let updatedItem = null;

                // 4. Update stock level ONLY if status is COMPLETED (Immediate)
                if (status === 'COMPLETED') {
                    updatedItem = await tx.inventoryItem.update({
                        where: { item_id },
                        data: {
                            stock_qty: { increment: qty_change },
                            last_updated_by: user_id
                        }
                    });
                }

                return { trx, updatedItem };
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/transactions/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // APPROVED or REJECTED

        const result = await prisma.$transaction(async (tx) => {
            const trx = await tx.transactionHistory.findUnique({ where: { trx_id: id } });
            if (!trx) throw new Error('Transaksi tidak ditemukan');

            let updatedTrx;

            if (status === 'APPROVED' && trx.status === 'PENDING') {
                // If approving a Borrow request, deduct stock
                if (trx.qty_change < 0) {
                    const item = await tx.inventoryItem.findUnique({ where: { item_id: trx.item_id } });
                    if (item.stock_qty + trx.qty_change < 0) throw new Error('Stok habis saat persetujuan.');

                    await tx.inventoryItem.update({
                        where: { item_id: trx.item_id },
                        data: { stock_qty: { increment: trx.qty_change } }
                    });
                }

                updatedTrx = await tx.transactionHistory.update({
                    where: { trx_id: id },
                    data: { status: 'COMPLETED' }
                });
            } else {
                updatedTrx = await tx.transactionHistory.update({
                    where: { trx_id: id },
                    data: { status }
                });
            }

            return updatedTrx;
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/transactions', async (req, res) => {
    try {
        const trxs = await prisma.transactionHistory.findMany({
            include: { item: true, user: true },
            orderBy: { timestamp: 'desc' }
        });
        res.json(trxs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- SHARED ACCOUNT ROUTES ---
app.get('/api/shared-accounts', async (req, res) => {
    try {
        const accounts = await prisma.sharedAccount.findMany({
            orderBy: { created_at: 'desc' }
        });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/shared-accounts', async (req, res) => {
    try {
        const { platform, username, email, password, notes, authorized_emails, url, icon_url, login_method } = req.body;
        const account = await prisma.sharedAccount.create({
            data: { platform, username, email, password, notes, authorized_emails, url, icon_url, login_method }
        });
        res.json(account);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/shared-accounts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { platform, username, email, password, notes, is_active, authorized_emails, url, icon_url, login_method } = req.body;
        const account = await prisma.sharedAccount.update({
            where: { account_id: id },
            data: { platform, username, email, password, notes, is_active, authorized_emails, url, icon_url, login_method }
        });
        res.json(account);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/shared-accounts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.sharedAccount.delete({
            where: { account_id: id }
        });
        res.json({ message: 'Account deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- CATEGORY ROUTES ---
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { name } = req.body;
        const category = await prisma.category.create({
            data: { name }
        });
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.category.delete({
            where: { category_id: id }
        });
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- RESERVATION ROUTES ---
app.get('/api/reservations', async (req, res) => {
    try {
        const reservations = await prisma.reservation.findMany({
            include: { item: true, user: true },
            orderBy: { start_date: 'desc' }
        });
        res.json(reservations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/reservations', async (req, res) => {
    try {
        const { item_id, user_id, start_date, end_date, notes } = req.body;
        const reservation = await prisma.reservation.create({
            data: {
                item_id,
                user_id,
                start_date: new Date(start_date),
                end_date: new Date(end_date),
                notes
            }
        });
        res.json(reservation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/reservations/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;

        const reservation = await prisma.reservation.update({
            where: { res_id: id },
            data: {
                status,
                rejection_reason: status === 'REJECTED' ? rejection_reason : null
            },
            include: { user: true, item: true }
        });

        // Send WA Notification Logic (Handled by Frontend opening window, backend just prepares or confirms state)
        // Here we just ensure data is correct. 
        // We will pass the responsibility of construction back to frontend OR 
        // since the user wants it integrated here, we can't really do "window.open" from backend.
        // The previous implementation had frontend logic `sendResWANotif`. 
        // We will keep `sendResWANotif` in frontend but updated to use `systemSettings`.
        // This backend route just updates the DB.

        res.json(reservation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/reservations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { item_id, start_date, end_date, notes, status, rejection_reason } = req.body;

        const updateData = {
            item_id,
            start_date: new Date(start_date),
            end_date: new Date(end_date),
            notes
        };

        if (status) updateData.status = status;
        if (status === 'REJECTED') updateData.rejection_reason = rejection_reason;

        const reservation = await prisma.reservation.update({
            where: { res_id: id },
            data: updateData,
            include: { user: true, item: true }
        });
        res.json(reservation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/reservations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.reservation.delete({ where: { res_id: id } });
        res.json({ message: 'Reservation deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/upload-video', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No video file uploaded' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// --- SHARED ACCOUNTS ROUTES ---
app.get('/api/shared-accounts', async (req, res) => {
    try {
        const accounts = await prisma.sharedAccount.findMany({
            orderBy: { platform: 'asc' }
        });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/shared-accounts', async (req, res) => {
    try {
        const account = await prisma.sharedAccount.create({
            data: req.body
        });
        res.json(account);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/shared-accounts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const account = await prisma.sharedAccount.update({
            where: { account_id: id },
            data: req.body
        });
        res.json(account);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/shared-accounts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.sharedAccount.delete({
            where: { account_id: id }
        });
        res.json({ message: 'Account deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- SYSTEM SETTINGS ROUTES ---
app.get('/api/system-settings', async (req, res) => {
    try {
        const settings = await prisma.systemSetting.upsert({
            where: { id: 'system_config' },
            update: {},
            create: { id: 'system_config' }
        });
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/system-settings', async (req, res) => {
    try {
        const settings = await prisma.systemSetting.update({
            where: { id: 'system_config' },
            data: req.body
        });
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- UPLOAD ROUTE ---
app.post('/api/upload', upload.single('logo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit();
});
