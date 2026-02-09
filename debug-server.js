#!/usr/bin/env node

/**
 * Script de debug pour capturer les erreurs serveur Next.js
 * Usage: node debug-server.js
 */

const http = require('http');

console.log('🔍 Test de la page /login...\n');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/login',
  method: 'GET',
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📄 Response Body:');
    console.log(data.substring(0, 500)); // Premiers 500 caractères
  });
});

req.on('error', (error) => {
  console.error('❌ Erreur de requête:', error);
});

req.end();

console.log('\n💡 Maintenant, regardez les logs du terminal où tourne "npm run dev"');
console.log('   Vous devriez voir l\'erreur exacte qui cause le problème.\n');
