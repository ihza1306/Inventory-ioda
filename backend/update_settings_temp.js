async function update() {
    try {
        const res = await fetch('http://localhost:5000/api/system-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                company_name: 'IODA Academy',
                company_logo: 'https://api.dicebear.com/7.x/initials/svg?seed=IODA'
            })
        });
        console.log('Status:', res.status);
    } catch (e) {
        console.error(e.message);
    }
}
update();
