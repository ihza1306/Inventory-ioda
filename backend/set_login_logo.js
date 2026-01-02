async function updateLoginLogo() {
    try {
        const res = await fetch('http://localhost:5000/api/system-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                login_logo: 'https://api.dicebear.com/7.x/initials/svg?seed=IODA'
            })
        });
        const data = await res.json();
        console.log('Updated:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e.message);
    }
}
updateLoginLogo();
