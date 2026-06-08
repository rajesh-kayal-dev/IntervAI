import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';
let token = '';
let sessionId = '';

async function testFlow() {
    console.log('1. Registering user...');
    const regRes = await fetch(`${BASE_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test User', email: `test${Date.now()}@example.com`, password: 'password123' })
    });
    const regData = await regRes.json();
    console.log(regData);
    if (!regData.token) throw new Error("No token returned");
    token = regData.token;

    console.log('\n2. Creating session...');
    const sessRes = await fetch(`${BASE_URL}/sessions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: 'Python Developer', level: 'Junior', interviewType: 'oral-only', count: 1 })
    });
    const sessData = await sessRes.json();
    console.log(sessData);
    if (!sessData.sessionId) throw new Error("No session id returned");
    sessionId = sessData.sessionId;

    console.log('\nWaiting for Ollama to generate questions...');
    let sessionDetails;
    while (true) {
        const getSess = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        sessionDetails = await getSess.json();
        if (sessionDetails.status !== 'pending') break;
        await new Promise(resolve => setTimeout(resolve, 5000));
        process.stdout.write('.');
    }
    console.log('\n3. Session details ready:');
    console.log(sessionDetails);

    console.log('\n4. Submitting an answer...');
    // We'll just submit text code since we don't have an audio file here.
    const submitRes = await fetch(`${BASE_URL}/sessions/${sessionId}/submit-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ questionIndex: 0, code: "print('Hello World')" })
    });
    const submitData = await submitRes.json();
    console.log(submitData);
}

testFlow().catch(console.error);
