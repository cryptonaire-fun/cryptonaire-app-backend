const http = require('http');

async function login() {
  const res = await fetch('http://localhost:4000/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: "testwallet999", signature: "dummy", nonce: "dummy" })
  });
  const data = await res.json();
  const token = data.data.token;
  
  const gameRes = await fetch('http://localhost:4000/game/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ level: 1, previousQuestions: [] })
  });
  const gameData = await gameRes.json();
  console.log(JSON.stringify(gameData, null, 2));
}

login().catch(console.error);
