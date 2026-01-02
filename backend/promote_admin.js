const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    await prisma.user.updateMany({
        where: { email: 'admin@inventory.com' },
        data: { role: 'admin' }
    });
    console.log('User admin@inventory.com promoted to admin.');
}
main();
