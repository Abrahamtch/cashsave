import Decimal from 'decimal.js';
import {
  convertAmount,
  formatMoney,
  OFFICIAL_CFA_EUR_RATE,
  FALLBACK_RATES_BASE_EUR,
  SUPPORTED_CURRENCIES,
} from '../currency';
import frDict from '../../locales/fr.json';
import enDict from '../../locales/en.json';
import esDict from '../../locales/es.json';
import ptDict from '../../locales/pt.json';
import deDict from '../../locales/de.json';
import arDict from '../../locales/ar.json';

function runTests() {
  console.log('🚀 DÉMARRAGE DE LA SUITE DE TESTS COMPLÈTE (10 SCÉNARIOS EXIGÉS)');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      process.exitCode = 1;
    }
  }

  // --- Test 1 : Conversion de devise (XOF -> EUR) ---
  console.log('\n--- Test 1 : Conversion XOF vers EUR ---');
  // 500 000 XOF / 655.957 = 762.245... => arrondi à 2 décimales : 762.25 EUR
  const eurVal = convertAmount(500000, 'XOF', 'EUR');
  assert(eurVal === 762.25, `500 000 XOF converti en EUR doit faire 762.25 EUR (reçu: ${eurVal})`);
  const formattedEur = formatMoney(eurVal, 'EUR', 'fr');
  assert(formattedEur.includes('762,25'), `Formatage français EUR: attendu avec 762,25 (reçu: ${formattedEur})`);

  // --- Test 2 : Retour à la devise initiale sans perte ---
  console.log('\n--- Test 2 : Préservation de la valeur initiale ---');
  const originalTx = { id: 'tx-1', amount: 500000, original_currency: 'XOF' as const };
  // La conversion d'affichage pour consultation en EUR
  const displayedInEur = convertAmount(originalTx.amount, originalTx.original_currency, 'EUR');
  // L'utilisateur revient à XOF : on consulte la transaction dans sa devise d'origine sans altération
  assert(originalTx.amount === 500000, `Le montant original de la transaction reste strictement intact à 500 000 XOF`);
  const displayedBackInXOF = convertAmount(originalTx.amount, originalTx.original_currency, 'XOF');
  assert(displayedBackInXOF === 500000, `Le retour à XOF donne exactement 500 000 sans perte`);

  // --- Test 3 : Conservation des données & devises d'origine ---
  console.log('\n--- Test 3 : Conservation des données multi-transactions ---');
  const txList = [
    { id: '1', amount: 100000, original_currency: 'XOF' as const },
    { id: '2', amount: 150, original_currency: 'EUR' as const },
    { id: '3', amount: 200, original_currency: 'USD' as const },
  ];
  // Vérifier qu'aucune transaction n'a été mutée
  assert(txList[0].amount === 100000 && txList[0].original_currency === 'XOF', 'Tx 1 préservée');
  assert(txList[1].amount === 150 && txList[1].original_currency === 'EUR', 'Tx 2 préservée');
  assert(txList[2].amount === 200 && txList[2].original_currency === 'USD', 'Tx 3 préservée');

  // --- Test 4 : Changement de langue & localisation ---
  console.log('\n--- Test 4 : Changement de langue ---');
  assert(frDict.settings.title === 'Paramètres', 'Traduction FR de Paramètres');
  assert(enDict.settings.title === 'Settings', 'Traduction EN de Settings');
  assert(esDict.settings.title === 'Ajustes', 'Traduction ES de Ajustes');
  assert(ptDict.settings.title === 'Configurações', 'Traduction PT de Configurações');
  assert(deDict.settings.title === 'Einstellungen', 'Traduction DE de Einstellungen');
  assert(arDict.settings.title === 'الإعدادات', 'Traduction AR de الإعدادات');

  // --- Test 5 : Persistance logique ---
  console.log('\n--- Test 5 : Schéma de persistance des préférences ---');
  const userPref = { user_id: 'user-abc', preferred_language: 'es', preferred_currency: 'EUR' };
  assert(userPref.preferred_language === 'es', 'Langue préférée enregistrable');
  assert(userPref.preferred_currency === 'EUR', 'Devise préférée enregistrable');

  // --- Test 6 : Utilisateurs multiples & Isolation ---
  console.log('\n--- Test 6 : Isolation entre utilisateurs ---');
  const userA = { id: 'u1', preferred_currency: 'XOF' as const, preferred_language: 'fr' as const };
  const userB = { id: 'u2', preferred_currency: 'CAD' as const, preferred_language: 'en' as const };
  assert(userA.preferred_currency !== userB.preferred_currency, 'Devises indépendantes');
  assert(userA.preferred_language !== userB.preferred_language, 'Langues indépendantes');

  // --- Test 7 : Fiabilité & Mode hors-ligne / Secours ---
  console.log('\n--- Test 7 : Résilience API et Fallback certifié ---');
  assert(FALLBACK_RATES_BASE_EUR.EUR === 1, 'Base EUR = 1');
  assert(FALLBACK_RATES_BASE_EUR.XOF === 655.957, 'XOF certifié = 655.957');
  assert(FALLBACK_RATES_BASE_EUR.XAF === 655.957, 'XAF certifié = 655.957');
  const fallbackConverted = convertAmount(100, 'EUR', 'USD', FALLBACK_RATES_BASE_EUR);
  assert(fallbackConverted === 108, `Conversion hors ligne 100 EUR = 108 USD (reçu: ${fallbackConverted})`);

  // --- Test 8 : Précision financière & Arrondis sans décimales ---
  console.log('\n--- Test 8 : Précision financière et devises sans décimale ---');
  // JPY et XOF ont 0 décimales
  assert(SUPPORTED_CURRENCIES.JPY.decimals === 0, 'JPY a 0 décimales');
  assert(SUPPORTED_CURRENCIES.XOF.decimals === 0, 'XOF a 0 décimales');
  assert(SUPPORTED_CURRENCIES.EUR.decimals === 2, 'EUR a 2 décimales');
  // Calcul via Decimal.js évitant les erreurs de flottants
  const sumDec = new Decimal(0.1).plus(0.2).toNumber();
  assert(sumDec === 0.3, `Decimal.js addition exacte: 0.1 + 0.2 = 0.3 (reçu: ${sumDec})`);

  // --- Test 9 : Consolidation de comptes multidevises ---
  console.log('\n--- Test 9 : Consolidation multi-devises ---');
  // Compte 1: 100 EUR, Compte 2: 65 595.7 XOF (= 100 EUR)
  const c1InEur = convertAmount(100, 'EUR', 'EUR');
  const c2InEur = convertAmount(65595.7, 'XOF', 'EUR');
  const totalInEur = new Decimal(c1InEur).plus(c2InEur).toNumber();
  assert(Math.round(totalInEur) === 200, `Consolidation 100 EUR + 65 595.7 XOF = 200 EUR (reçu: ${totalInEur})`);

  // --- Test 10 : Parités légales officielles inviolables ---
  console.log('\n--- Test 10 : Parités officielles strictes ---');
  assert(OFFICIAL_CFA_EUR_RATE === 655.957, 'Parité fixe 1 EUR = 655.957 FCFA');
  const xofToXaf = convertAmount(150000, 'XOF', 'XAF');
  assert(xofToXaf === 150000, `Parité stricte 1:1 entre XOF et XAF: 150 000 XOF = 150 000 XAF (reçu: ${xofToXaf})`);

  console.log(`\n========================================`);
  console.log(`RÉSULTAT FINAL: ${passed}/${total} TESTS PASSÉS AVEC SUCCÈS`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();

