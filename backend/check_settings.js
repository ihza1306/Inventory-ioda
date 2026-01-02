async function checkSettings() {
    try {
        const res = await fetch('http://localhost:5000/api/system-settings');
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e.message);
    }
}
checkSettings();
