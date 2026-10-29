// ============================================
// Cash Save — Moteur Monétaire & Devises (Haute Précision)
// ============================================
import Decimal from 'decimal.js';
import { SupportedCurrency, SupportedLanguage } from '@/types';

export interface CurrencyMetadata {
  code: SupportedCurrency;
  symbol: string;
  name: Record<SupportedLanguage, string>;
  decimals: number;
  flag: string;
  isFixedPegToEur?: boolean;
}

/**
 * Catalogue des 14 devises ISO 4217 supportées par Cash Save
 */
export const SUPPORTED_CURRENCIES: Record<SupportedCurrency, CurrencyMetadata> = {
  XOF: {
    code: 'XOF',
    symbol: 'FCFA',
    name: {
      fr: 'Franc CFA (Afrique de l\'Ouest)',
      en: 'West African CFA Franc',
      es: 'Franco CFA de África Occidental',
      pt: 'Franco CFA da África Ocidental',
      de: 'Westafrikanischer CFA-Franc',
      ar: 'فرنك سيفا غرب أفريقيا',
    },
    decimals: 0,
    flag: '🌍',
    isFixedPegToEur: true,
  },
  XAF: {
    code: 'XAF',
    symbol: 'FCFA',
    name: {
      fr: 'Franc CFA (Afrique Centrale)',
      en: 'Central African CFA Franc',
      es: 'Franco CFA de África Central',
      pt: 'Franco CFA da África Central',
      de: 'Zentralafrikanischer CFA-Franc',
      ar: 'فرنك سيفا وسط أفريقيا',
    },
    decimals: 0,
    flag: '🌍',
    isFixedPegToEur: true,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: {
      fr: 'Euro',
      en: 'Euro',
      es: 'Euro',
      pt: 'Euro',
      de: 'Euro',
      ar: 'يورو',
    },
    decimals: 2,
    flag: '🇪🇺',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: {
      fr: 'Dollar américain',
      en: 'US Dollar',
      es: 'Dólar estadounidense',
      pt: 'Dólar americano',
      de: 'US-Dollar',
      ar: 'دولار أمريكي',
    },
    decimals: 2,
    flag: '🇺🇸',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: {
      fr: 'Livre sterling',
      en: 'British Pound',
      es: 'Libra esterlina',
      pt: 'Libra esterlina',
      de: 'Britisches Pfund',
      ar: 'جنيه إسترليني',
    },
    decimals: 2,
    flag: '🇬🇧',
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: {
      fr: 'Dollar canadien',
      en: 'Canadian Dollar',
      es: 'Dólar canadiense',
      pt: 'Dólar canadense',
      de: 'Kanadischer Dollar',
      ar: 'دولار كندي',
    },
    decimals: 2,
    flag: '🇨🇦',
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    name: {
      fr: 'Franc suisse',
      en: 'Swiss Franc',
      es: 'Franco suizo',
      pt: 'Franco suíço',
      de: 'Schweizer Franken',
      ar: 'فرنك سويسري',
    },
    decimals: 2,
    flag: '🇨🇭',
  },
  MAD: {
    code: 'MAD',
    symbol: 'MAD',
    name: {
      fr: 'Dirham marocain',
      en: 'Moroccan Dirham',
      es: 'Dírham marroquí',
      pt: 'Dirham marroquino',
      de: 'Marokkanischer Dirham',
      ar: 'درهم مغربي',
    },
    decimals: 2,
    flag: '🇲🇦',
  },
  NGN: {
    code: 'NGN',
    symbol: '₦',
    name: {
      fr: 'Naira nigérian',
      en: 'Nigerian Naira',
      es: 'Naira nigeriana',
      pt: 'Naira nigeriana',
      de: 'Nigerianischer Naira',
      ar: 'نايرا نيجيرية',
    },
    decimals: 2,
    flag: '🇳🇬',
  },
  GHS: {
    code: 'GHS',
    symbol: 'GH₵',
    name: {
      fr: 'Cedi ghanéen',
      en: 'Ghanaian Cedi',
      es: 'Cedi ghanés',
      pt: 'Cedi ganês',
      de: 'Ghanaischer Cedi',
      ar: 'سيدي غاني',
    },
    decimals: 2,
    flag: '🇬🇭',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: {
      fr: 'Yen japonais',
      en: 'Japanese Yen',
      es: 'Yen japonés',
      pt: 'Iene japonês',
      de: 'Japanischer Yen',
      ar: 'ين ياباني',
    },
    decimals: 0,
    flag: '🇯🇵',
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: {
      fr: 'Yuan chinois',
      en: 'Chinese Yuan',
      es: 'Yuan chino',
      pt: 'Yuan chinês',
      de: 'Chinesischer Yuan',
      ar: 'يوان صيني',
    },
    decimals: 2,
    flag: '🇨🇳',
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: {
      fr: 'Roupie indienne',
      en: 'Indian Rupee',
      es: 'Rupia india',
      pt: 'Rupia indiana',
      de: 'Indische Rupie',
      ar: 'روبية هندية',
    },
    decimals: 2,
    flag: '🇮🇳',
  },
  ZAR: {
    code: 'ZAR',
    symbol: 'R',
    name: {
      fr: 'Rand sud-africain',
      en: 'South African Rand',
      es: 'Rand sudafricano',
      pt: 'Rand sul-africano',
      de: 'Südafrikanischer Rand',
      ar: 'راند جنوب أفريقي',
    },
    decimals: 2,
    flag: '🇿🇦',
  },
};

/**
 * Parité fixe légale de la zone Franc (UEMOA / CEMAC) envers l'Euro
 * 1 EUR = 655.957 FCFA (XOF et XAF)
 */
export const OFFICIAL_CFA_EUR_RATE = 655.957;

/**
 * Taux de change de référence de secours (Base: 1 EUR)
 * Utilisé si l'API externe devient injoignable, garantissant le fonctionnement hors ligne
 */
export const FALLBACK_RATES_BASE_EUR: Record<SupportedCurrency, number> = {
  EUR: 1,
  XOF: 655.957,
  XAF: 655.957,
  USD: 1.08,
  GBP: 0.85,
  CAD: 1.48,
  CHF: 0.96,
  MAD: 10.85,
  NGN: 1650.0,
  GHS: 16.5,
  JPY: 168.0,
  CNY: 7.82,
  INR: 91.0,
  ZAR: 20.15,
};

export interface ExchangeRatesPayload {
  base: 'EUR';
  rates: Record<SupportedCurrency, number>;
  last_updated_at: string;
  source: string;
  is_fallback?: boolean;
}

/**
 * Convertit un montant monétaire d'une devise source vers une devise cible
 * Utilise Decimal.js pour éliminer toute imprécision liée aux flottants JS.
 * Respecte rigoureusement la parité officielle fixe XOF/XAF/EUR.
 * 
 * @param amount - Montant original (number ou string)
 * @param from - Devise source
 * @param to - Devise cible
 * @param rates - Dictionnaire des taux par rapport à l'EUR (1 EUR = rates[currency])
 */
export function convertAmount(
  amount: number | string | Decimal,
  from: SupportedCurrency,
  to: SupportedCurrency,
  rates: Record<SupportedCurrency, number> = FALLBACK_RATES_BASE_EUR
): number {
  if (from === to) {
    return new Decimal(amount || 0).toNumber();
  }

  // Cas spécial parité 1:1 officielle entre XOF et XAF
  if ((from === 'XOF' && to === 'XAF') || (from === 'XAF' && to === 'XOF')) {
    return new Decimal(amount || 0).toNumber();
  }

  const decAmount = new Decimal(amount || 0);
  if (decAmount.isZero()) return 0;

  // Récupération des taux par rapport à l'EUR (base pivot)
  // Assurer que XOF et XAF respectent toujours la parité légale 655.957
  const fromRate = from === 'XOF' || from === 'XAF' ? OFFICIAL_CFA_EUR_RATE : (rates[from] || FALLBACK_RATES_BASE_EUR[from] || 1);
  const toRate = to === 'XOF' || to === 'XAF' ? OFFICIAL_CFA_EUR_RATE : (rates[to] || FALLBACK_RATES_BASE_EUR[to] || 1);

  const decFromRate = new Decimal(fromRate);
  const decToRate = new Decimal(toRate);

  // Conversion: (amount / fromRate) * toRate
  // 1. Passage en EUR pivot
  const amountInEur = decAmount.dividedBy(decFromRate);
  // 2. Passage en devise cible
  const converted = amountInEur.times(decToRate);

  // Application des règles d'arrondi de la devise cible
  const targetMeta = SUPPORTED_CURRENCIES[to] || SUPPORTED_CURRENCIES.XOF;
  const rounded = converted.toDecimalPlaces(targetMeta.decimals, Decimal.ROUND_HALF_UP);

  return rounded.toNumber();
}

/**
 * Formate un montant dans la devise et la locale spécifiées
 * Exemples :
 * - formatMoney(500000, 'XOF', 'fr') => "500 000 FCFA"
 * - formatMoney(762.245, 'EUR', 'fr') => "762,25 €"
 * - formatMoney(1250.5, 'USD', 'en') => "$1,250.50"
 */
export function formatMoney(
  amount: number | string | Decimal,
  currency: SupportedCurrency = 'XOF',
  language: SupportedLanguage = 'fr'
): string {
  const meta = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.XOF;
  const numVal = new Decimal(amount || 0).toNumber();

  // Mapper la langue vers une locale BCP 47
  const localeMap: Record<SupportedLanguage, string> = {
    fr: 'fr-FR',
    en: 'en-US',
    es: 'es-ES',
    pt: 'pt-PT',
    de: 'de-DE',
    ar: 'ar-SA',
  };

  const locale = localeMap[language] || 'fr-FR';

  try {
    const formattedNum = new Intl.NumberFormat(locale, {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    }).format(numVal);

    // Formatage spécifique pour FCFA
    if (currency === 'XOF' || currency === 'XAF') {
      return `${formattedNum} ${meta.symbol}`;
    }

    // Formatage avec symbole avant/après selon conventions
    if (currency === 'EUR') {
      return language === 'en' ? `€${formattedNum}` : `${formattedNum} €`;
    }
    if (currency === 'USD' || currency === 'CAD') {
      return `${meta.symbol}${formattedNum}`;
    }
    if (currency === 'GBP') {
      return `£${formattedNum}`;
    }

    return `${formattedNum} ${meta.symbol}`;
  } catch (e) {
    return `${numVal.toFixed(meta.decimals)} ${meta.symbol}`;
  }
}

