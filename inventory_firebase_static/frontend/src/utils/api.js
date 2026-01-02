import { initialData } from './mockData';

// Helper to get/set data from localStorage
const getData = () => {
    const data = localStorage.getItem('inventory_app_data');
    if (!data) {
        localStorage.setItem('inventory_app_data', JSON.stringify(initialData));
        return initialData;
    }
    return JSON.parse(data);
};

const setData = (data) => {
    localStorage.setItem('inventory_app_data', JSON.stringify(data));
};

// Mock Axios implementation
const api = {
    get: async (url) => {
        console.log('Mock GET:', url);
        const data = getData();

        if (url === '/api/dashboard/stats') {
            return {
                data: {
                    totalItems: data.inventory.length,
                    totalStock: data.inventory.reduce((sum, item) => sum + item.stock_qty, 0),
                    activeBorrowers: new Set(data.transactions.filter(t => t.type === 'OUT' && !t.is_returned).map(t => t.user_id)).size,
                    pendingRequests: data.transactions.filter(t => t.status === 'PENDING').length
                }
            };
        }

        if (url === '/api/inventory') return { data: data.inventory };
        if (url === '/api/categories') return { data: data.categories };
        if (url === '/api/transactions') return { data: data.transactions };
        if (url === '/api/reservations') return { data: data.reservations };
        if (url === '/api/users') return { data: data.users };
        if (url === '/api/system-settings') return { data: data.systemSettings };

        if (url.startsWith('/api/inventory/')) {
            const id = url.split('/').pop();
            return { data: data.inventory.find(i => i.item_id === id) };
        }

        return { data: null };
    },

    post: async (url, payload) => {
        console.log('Mock POST:', url, payload);
        const data = getData();

        if (url === '/api/users') {
            const adminEmails = ['ihza@iodacademy.id', 'heldi@iodacademy.id', 'nabila@iodacademy.id', 'admin@ioda.academy'];
            const existing = data.users.find(u => u.email === payload.email || (payload.google_uid && u.google_uid === payload.google_uid));

            if (existing) {
                // Update google_uid if it was 'pending' or missing
                if (payload.google_uid && existing.google_uid !== payload.google_uid) {
                    existing.google_uid = payload.google_uid;
                    setData(data);
                }
                return { data: existing };
            }

            const role = adminEmails.includes(payload.email.toLowerCase()) ? 'admin' : 'user';
            const newUser = { ...payload, user_id: 'user-' + Date.now(), role: role };
            data.users.push(newUser);
            setData(data);
            return { data: newUser };
        }

        if (url === '/api/inventory') {
            const newItem = { ...payload, item_id: 'item-' + Date.now(), updated_at: new Date().toISOString() };
            data.inventory.push(newItem);
            setData(data);
            return { data: newItem };
        }

        if (url === '/api/transactions') {
            const newTrx = { ...payload, trx_id: 'trx-' + Date.now(), timestamp: new Date().toISOString() };
            data.transactions.push(newTrx);
            // Update stock
            const item = data.inventory.find(i => i.item_id === payload.item_id);
            if (item) item.stock_qty += payload.qty_change;
            setData(data);
            return { data: newTrx };
        }

        if (url === '/api/categories') {
            const newCat = { ...payload, category_id: 'cat-' + Date.now() };
            data.categories.push(newCat);
            setData(data);
            return { data: newCat };
        }

        return { data: payload };
    },

    put: async (url, payload) => {
        console.log('Mock PUT:', url, payload);
        const data = getData();

        if (url === '/api/system-settings') {
            data.systemSettings = { ...data.systemSettings, ...payload };
            setData(data);
            return { data: data.systemSettings };
        }

        if (url.startsWith('/api/inventory/')) {
            const id = url.split('/').pop();
            const idx = data.inventory.findIndex(i => i.item_id === id);
            if (idx !== -1) {
                data.inventory[idx] = { ...data.inventory[idx], ...payload, updated_at: new Date().toISOString() };
                setData(data);
                return { data: data.inventory[idx] };
            }
        }

        if (url.startsWith('/api/transactions/')) {
            const id = url.split('/').pop();
            const idx = data.transactions.findIndex(t => t.trx_id === id);
            if (idx !== -1) {
                data.transactions[idx] = { ...data.transactions[idx], ...payload };
                setData(data);
                return { data: data.transactions[idx] };
            }
        }

        return { data: payload };
    },

    delete: async (url) => {
        console.log('Mock DELETE:', url);
        const data = getData();

        if (url.startsWith('/api/inventory/')) {
            const id = url.split('/').pop();
            data.inventory = data.inventory.filter(i => i.item_id !== id);
            setData(data);
        }

        if (url.startsWith('/api/categories/')) {
            const id = url.split('/').pop();
            data.categories = data.categories.filter(c => c.category_id !== id);
            setData(data);
        }

        return { data: { success: true } };
    }
};

export default api;
