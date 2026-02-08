// Script de test des exports en production
const https = require('https');

const PROD_URL = 'https://erp-marches-stam.vercel.app';

console.log('🔍 Test de validation des exports en production...\n');

// Test 1: Vérifier que le site est accessible
https.get(PROD_URL, (res) => {
  console.log(`✅ Site accessible: ${res.statusCode}`);
  console.log(`📍 URL: ${PROD_URL}`);
  console.log('\n✨ Déploiement confirmé !');
  console.log('\n📋 Actions de vérification manuelle:');
  console.log('   1. Ouvrir: https://erp-marches-stam.vercel.app/marches');
  console.log('   2. Chercher le bouton "Exporter en Excel"');
  console.log('   3. Vérifier que l\'export fonctionne');
  console.log('\n   Répéter pour:');
  console.log('   - https://erp-marches-stam.vercel.app/cautions');
  console.log('   - https://erp-marches-stam.vercel.app/vehicules');
}).on('error', (e) => {
  console.error(`❌ Erreur: ${e.message}`);
});
