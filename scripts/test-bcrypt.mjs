/**
 * Script pour tester les hashs bcrypt des utilisateurs de test
 * Usage: node scripts/test-bcrypt.mjs
 */

import bcrypt from 'bcryptjs';

// Hash stocké en base de données pour l'admin
const adminHash = '$2b$10$a94IdTcUzFVldVDRk9EZw..64x0mYHb4oylnpRshAMY0o6tSrBiKO';
const adminPassword = 'Admin123!';

console.log('🔐 Test du hash bcrypt pour l\'utilisateur ADMIN\n');
console.log('Hash en base:', adminHash);
console.log('Mot de passe à tester:', adminPassword);
console.log('\n--- Test de comparaison ---\n');

try {
  const isValid = await bcrypt.compare(adminPassword, adminHash);

  if (isValid) {
    console.log('✅ SUCCESS: Le mot de passe correspond au hash !');
    console.log('   Le problème ne vient PAS du hash bcrypt.');
  } else {
    console.log('❌ ERREUR: Le mot de passe ne correspond PAS au hash !');
    console.log('   Le hash en base de données est incorrect.');
    console.log('\n--- Génération d\'un nouveau hash ---\n');

    const newHash = await bcrypt.hash(adminPassword, 10);
    console.log('Nouveau hash à utiliser:');
    console.log(newHash);
  }
} catch (error) {
  console.error('❌ Erreur lors du test:', error.message);
}

// Tester tous les utilisateurs
console.log('\n\n🔐 Test de TOUS les utilisateurs de test\n');

const users = [
  { role: 'ADMIN', email: 'admin@erp-marches.local', password: 'Admin123!', hash: '$2b$10$a94IdTcUzFVldVDRk9EZw..64x0mYHb4oylnpRshAMY0o6tSrBiKO' },
  { role: 'AVANCE', email: 'avance@erp-marches.local', password: 'Avance123!', hash: '$2b$10$pBhUB23NiURJu02vw3v/k./g5N1Yw150NaomlBFCcDUniyAEypuxi' },
  { role: 'EXPLOITATION', email: 'exploitation@erp-marches.local', password: 'Exploitation123!', hash: '$2b$10$35VWYMAKTYqyrXATM.zDWO7o6IvYOcBmTjqL81PF3Y8CafHfASi7K' },
  { role: 'VISITEUR', email: 'visiteur@erp-marches.local', password: 'Visiteur123!', hash: '$2b$10$jaltKl8slW/n3orsaDfMN.yalul1k0RqIM907evXPfyFshwNedaAK' },
];

for (const user of users) {
  const isValid = await bcrypt.compare(user.password, user.hash);
  const status = isValid ? '✅' : '❌';
  console.log(`${status} ${user.role.padEnd(12)} - ${user.email}`);
}

console.log('\n✅ Test terminé\n');
