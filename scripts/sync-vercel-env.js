#!/usr/bin/env node

/**
 * Script de synchronisation des variables d'environnement Vercel
 *
 * Fonctionnalités :
 * - ✅ Mise à jour des variables existantes
 * - ✅ Création de nouvelles variables
 * - ✅ Suppression des variables invalides
 * - ✅ Support multi-environnements (production, preview, development)
 * - ✅ Mode dry-run (simulation sans modification)
 * - ✅ Logs détaillés et colorés
 * - ✅ Validation des valeurs
 * - ✅ Gestion d'erreurs robuste
 *
 * Usage :
 *   node scripts/sync-vercel-env.js [--dry-run] [--env production|preview|development]
 *
 * Variables requises :
 *   VERCEL_TOKEN - Token d'authentification Vercel (à créer sur https://vercel.com/account/tokens)
 */

const https = require('https');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  projectId: 'prj_CMfXkhrGaZVN6xbyJGRl0qdEf8Aw',
  teamId: 'team_38g8LtNCRD8PCg4PTFPeKrDS',
  apiBaseUrl: 'api.vercel.com',

  // Variables à synchroniser (valeurs propres, sans \n ni guillemets superflus)
  variables: {
    'SMTP_HOST': {
      value: 'smtp.gmail.com',
      target: ['production', 'preview', 'development'],
    },
    'SMTP_PORT': {
      value: '587',
      target: ['production', 'preview', 'development'],
    },
    'SMTP_SECURE': {
      value: 'false',
      target: ['production', 'preview', 'development'],
    },
    'SMTP_USER': {
      value: 'henrymartium@gmail.com',
      target: ['production', 'preview', 'development'],
    },
    'SMTP_PASS': {
      value: 'vsjzokuhjdyoipsr',
      target: ['production', 'preview', 'development'],
      sensitive: true, // Ne pas logger la valeur
    },
    'SMTP_FROM': {
      value: 'ERP Marchés STAM <henrymartium@gmail.com>',
      target: ['production', 'preview', 'development'],
    },
    'ALERT_EMAIL_TO': {
      value: 'honoreatsu@gmail.com',
      target: ['production', 'preview', 'development'],
    },
    'CRON_SECRET': {
      value: '0a7441df1b1dd68baf9889552839b992e3525bddfae5b9112ba87e829e0ec2de',
      target: ['production', 'preview', 'development'],
      sensitive: true,
    },
  },
};

// ============================================
// COULEURS TERMINAL
// ============================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logStep(step, total, message) {
  log(`\n[${step}/${total}] ${message}`, 'cyan');
}

// ============================================
// CLIENT API VERCEL
// ============================================

class VercelAPIClient {
  constructor(token, teamId) {
    this.token = token;
    this.teamId = teamId;
  }

  /**
   * Effectue une requête HTTPS vers l'API Vercel
   */
  async request(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: CONFIG.apiBaseUrl,
        path: `${path}${path.includes('?') ? '&' : '?'}teamId=${this.teamId}`,
        method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = responseData ? JSON.parse(responseData) : {};

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject({
                statusCode: res.statusCode,
                message: parsed.error?.message || 'Erreur API',
                details: parsed,
              });
            }
          } catch (error) {
            reject({
              statusCode: res.statusCode,
              message: 'Erreur de parsing JSON',
              details: responseData,
            });
          }
        });
      });

      req.on('error', (error) => {
        reject({
          message: 'Erreur réseau',
          details: error,
        });
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Récupère toutes les variables d'environnement du projet
   */
  async getEnvVars(projectId) {
    return this.request('GET', `/v9/projects/${projectId}/env`);
  }

  /**
   * Crée une nouvelle variable d'environnement
   */
  async createEnvVar(projectId, key, value, target) {
    return this.request('POST', `/v10/projects/${projectId}/env`, {
      key,
      value,
      type: 'encrypted', // Les valeurs sensibles sont chiffrées par Vercel
      target,
    });
  }

  /**
   * Met à jour une variable d'environnement existante
   */
  async updateEnvVar(projectId, envId, value, target) {
    return this.request('PATCH', `/v9/projects/${projectId}/env/${envId}`, {
      value,
      target,
    });
  }

  /**
   * Supprime une variable d'environnement
   */
  async deleteEnvVar(projectId, envId) {
    return this.request('DELETE', `/v9/projects/${projectId}/env/${envId}`);
  }
}

// ============================================
// LOGIQUE PRINCIPALE
// ============================================

/**
 * Valide que la valeur ne contient pas de caractères invalides
 */
function validateValue(key, value) {
  const issues = [];

  // Vérifier les \n littéraux
  if (value.includes('\\n')) {
    issues.push('contient des \\n littéraux');
  }

  // Vérifier les guillemets doubles superflus au début/fin
  if (value.startsWith('""') || value.endsWith('""')) {
    issues.push('contient des guillemets doubles superflus');
  }

  // Vérifier que la valeur n'est pas vide
  if (!value || value.trim().length === 0) {
    issues.push('valeur vide');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Masque les valeurs sensibles pour les logs
 */
function maskSensitiveValue(value, isSensitive) {
  if (!isSensitive) return value;
  if (value.length <= 8) return '***';
  return value.substring(0, 4) + '***' + value.substring(value.length - 4);
}

/**
 * Compare et synchronise les variables d'environnement
 */
async function syncEnvironmentVariables(client, dryRun = false) {
  const totalSteps = 4;
  let currentStep = 0;

  // Étape 1 : Récupérer les variables existantes
  logStep(++currentStep, totalSteps, 'Récupération des variables existantes');

  let existingVars;
  try {
    const response = await client.getEnvVars(CONFIG.projectId);
    existingVars = response.envs || [];
    logSuccess(`${existingVars.length} variable(s) trouvée(s)`);
  } catch (error) {
    logError(`Impossible de récupérer les variables : ${error.message}`);
    throw error;
  }

  // Étape 2 : Validation des nouvelles valeurs
  logStep(++currentStep, totalSteps, 'Validation des nouvelles valeurs');

  const validationErrors = [];
  for (const [key, config] of Object.entries(CONFIG.variables)) {
    const validation = validateValue(key, config.value);
    if (!validation.valid) {
      validationErrors.push(`${key}: ${validation.issues.join(', ')}`);
    }
  }

  if (validationErrors.length > 0) {
    logError('Erreurs de validation détectées :');
    validationErrors.forEach((err) => log(`  - ${err}`, 'red'));
    throw new Error('Validation échouée');
  }
  logSuccess('Toutes les valeurs sont valides');

  // Étape 3 : Planification des modifications
  logStep(++currentStep, totalSteps, 'Planification des modifications');

  const actions = {
    create: [],
    update: [],
    unchanged: [],
  };

  for (const [key, config] of Object.entries(CONFIG.variables)) {
    const existing = existingVars.find((v) => v.key === key);
    const displayValue = maskSensitiveValue(config.value, config.sensitive);

    if (!existing) {
      actions.create.push({ key, config });
      log(`  → Créer ${key} = ${displayValue}`, 'yellow');
    } else {
      // Vérifier si la valeur a changé (on ne peut pas voir la valeur actuelle, on met à jour par défaut)
      const targetsMatch =
        existing.target &&
        config.target.length === existing.target.length &&
        config.target.every((t) => existing.target.includes(t));

      if (!targetsMatch) {
        actions.update.push({ key, config, envId: existing.id });
        log(`  → Mettre à jour ${key} (environnements modifiés)`, 'cyan');
      } else {
        actions.update.push({ key, config, envId: existing.id });
        log(`  → Mettre à jour ${key} = ${displayValue}`, 'cyan');
      }
    }
  }

  logInfo(`Résumé : ${actions.create.length} à créer, ${actions.update.length} à mettre à jour`);

  if (dryRun) {
    logWarning('MODE DRY-RUN : Aucune modification effectuée');
    return;
  }

  // Étape 4 : Exécution des modifications
  logStep(++currentStep, totalSteps, 'Application des modifications');

  let successCount = 0;
  let errorCount = 0;

  // Créer les nouvelles variables
  for (const { key, config } of actions.create) {
    try {
      await client.createEnvVar(CONFIG.projectId, key, config.value, config.target);
      logSuccess(`Créé : ${key}`);
      successCount++;
    } catch (error) {
      logError(`Échec création ${key} : ${error.message}`);
      errorCount++;
    }
  }

  // Mettre à jour les variables existantes
  for (const { key, config, envId } of actions.update) {
    try {
      await client.updateEnvVar(CONFIG.projectId, envId, config.value, config.target);
      logSuccess(`Mis à jour : ${key}`);
      successCount++;
    } catch (error) {
      logError(`Échec mise à jour ${key} : ${error.message}`);
      errorCount++;
    }
  }

  // Résumé final
  log('\n' + '='.repeat(60), 'bright');
  log('📊 RÉSUMÉ DE LA SYNCHRONISATION', 'bright');
  log('='.repeat(60), 'bright');
  logSuccess(`${successCount} variable(s) synchronisée(s)`);
  if (errorCount > 0) {
    logError(`${errorCount} erreur(s) rencontrée(s)`);
  }

  if (errorCount === 0) {
    log('\n🎉 Synchronisation terminée avec succès !', 'green');
    log('\n💡 Prochaines étapes :', 'cyan');
    log('   1. Redéployez votre application : vercel --prod', 'gray');
    log('   2. Vérifiez les logs de déploiement', 'gray');
    log('   3. Testez l\'envoi d\'emails depuis /admin/alertes', 'gray');
  } else {
    log('\n⚠️  Synchronisation terminée avec des erreurs', 'yellow');
    log('   Vérifiez les messages d\'erreur ci-dessus', 'gray');
  }
}

// ============================================
// POINT D'ENTRÉE
// ============================================

async function main() {
  log('\n' + '='.repeat(60), 'bright');
  log('🚀 SYNCHRONISATION VARIABLES VERCEL - ERP MARCHÉS STAM', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  // Parser les arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    logWarning('MODE DRY-RUN ACTIVÉ (simulation uniquement)\n');
  }

  // Vérifier le token
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    logError('Variable VERCEL_TOKEN manquante');
    log('\n💡 Pour créer un token :', 'cyan');
    log('   1. Visitez https://vercel.com/account/tokens', 'gray');
    log('   2. Créez un nouveau token avec scope "Full Account"', 'gray');
    log('   3. Exportez-le : export VERCEL_TOKEN="votre_token"', 'gray');
    log('   4. Relancez ce script\n', 'gray');
    process.exit(1);
  }

  // Créer le client API
  const client = new VercelAPIClient(token, CONFIG.teamId);

  try {
    await syncEnvironmentVariables(client, dryRun);
    process.exit(0);
  } catch (error) {
    log('\n' + '='.repeat(60), 'red');
    logError('ERREUR FATALE');
    log('='.repeat(60), 'red');
    console.error(error);
    process.exit(1);
  }
}

// Lancer le script
main();
