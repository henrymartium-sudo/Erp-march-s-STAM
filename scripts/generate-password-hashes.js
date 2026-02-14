/**
 * Générer les hash bcrypt pour les mots de passe de test
 * Exécuter avec: node scripts/generate-password-hashes.js
 */

const bcrypt = require('bcryptjs');

async function generateHashes() {
  console.log('🔐 Génération des hash bcrypt...\n');

  const passwords = [
    { role: 'ADMIN', password: 'Admin123!' },
    { role: 'AVANCE', password: 'Avance123!' },
    { role: 'EXPLOITATION', password: 'Exploitation123!' },
    { role: 'VISITEUR', password: 'Visiteur123!' },
  ];

  for (const { role, password } of passwords) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`${role}:`);
    console.log(`  Password: ${password}`);
    console.log(`  Hash:     ${hash}`);
    console.log('');
  }

  console.log('✅ Hash générés avec succès!');
  console.log('\n💡 Utilisez ces hash dans le script SQL ou Prisma Studio');
}

generateHashes().catch(console.error);
