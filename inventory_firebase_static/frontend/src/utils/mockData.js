// Initial data for the mock system
export const initialData = {
    users: [
        {
            user_id: 'admin-1',
            google_uid: 'admin-1',
            email: 'admin@ioda.academy',
            display_name: 'Super Admin',
            role: 'admin',
            theme_pref: 'system',
            photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
        },
        {
            user_id: 'admin-ihza',
            google_uid: 'pending',
            email: 'ihza@iodacademy.id',
            display_name: 'Ihza Admin',
            role: 'admin',
            theme_pref: 'system',
            photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ihza'
        },
        {
            user_id: 'admin-heldi',
            google_uid: 'pending',
            email: 'heldi@iodacademy.id',
            display_name: 'Heldi Admin',
            role: 'admin',
            theme_pref: 'system',
            photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=heldi'
        },
        {
            user_id: 'admin-nabila',
            google_uid: 'pending',
            email: 'nabila@iodacademy.id',
            display_name: 'Nabila Admin',
            role: 'admin',
            theme_pref: 'system',
            photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nabila'
        }
    ],
    inventory: [
        {
            item_id: 'item-1',
            name: 'MacBook Pro M3',
            sku: 'MBP-001-ELK',
            category: 'Elektronik',
            stock_qty: 15,
            unit: 'Unit',
            condition: 'Good',
            location: 'Gudang Utama',
            image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=200',
            last_updated_by: 'admin-1',
            updated_at: new Date().toISOString()
        }
    ],
    categories: [
        { category_id: 'cat-1', name: 'Elektronik' },
        { category_id: 'cat-2', name: 'Furniture' },
        { category_id: 'cat-3', name: 'Alat Tulis' }
    ],
    transactions: [],
    reservations: [],
    systemSettings: {
        id: 'system_config',
        company_name: 'IODA Academy (Offline)',
        pt_name: 'PT. Ioda Academy Indonesia',
        company_address: 'Jakarta, Indonesia',
        company_logo: 'https://api.dicebear.com/7.x/initials/svg?seed=IA',
        report_number_format: 'IODA/INV/2026',
        pic_email: 'admin@ioda.academy',
        company_phone: '628123456789',
        platform_icons: '{}',
        login_bg_video_url: null,
        login_logo: null
    }
};
