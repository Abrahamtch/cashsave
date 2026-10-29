import { NextResponse } from 'next/server';
import {
  FALLBACK_RATES_BASE_EUR,
  OFFICIAL_CFA_EUR_RATE,
  SUPPORTED_CURRENCIES,
  ExchangeRatesPayload,
} from '@/lib/currency';
import { SupportedCurrency } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 43200; // 12 heures

// Cache mémoire serveur avec TTL 12 heures
let cachedRates: ExchangeRatesPayload | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 heures

export async function GET() {
  const now = Date.now();

  // Si cache valide en mémoire, le retourner directement
  if (cachedRates && now - lastFetchTime < CACHE_TTL_MS) {
    return NextResponse.json(cachedRates, {
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400',
      },
    });
  }

  try {
    // Interroger l'API publique de change (base EUR)
    // open.er-api.com est gratuit, sans clé secrète, très haute disponibilité
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout max

    const response = await fetch('https://open.er-api.com/v6/latest/EUR', {
      signal: controller.signal,
      next: { revalidate: 43200 }, // 12h pour le cache Next.js
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`External API responded with status ${response.status}`);
    }

    const data = await response.json();
    const rawRates = data?.rates || {};

    const computedRates: Record<SupportedCurrency, number> = { ...FALLBACK_RATES_BASE_EUR };

    // Extraire les taux pour nos 14 devises
    (Object.keys(SUPPORTED_CURRENCIES) as SupportedCurrency[]).forEach((currency) => {
      if (currency === 'EUR') {
        computedRates.EUR = 1;
      } else if (currency === 'XOF' || currency === 'XAF') {
        // Parité fixe officielle UEMOA / CEMAC garantie par traité
        computedRates[currency] = OFFICIAL_CFA_EUR_RATE;
      } else if (rawRates[currency] && typeof rawRates[currency] === 'number') {
        computedRates[currency] = rawRates[currency];
      }
    });

    const payload: ExchangeRatesPayload = {
      base: 'EUR',
      rates: computedRates,
      last_updated_at: new Date().toISOString(),
      source: 'Open Exchange Rates (live)',
      is_fallback: false,
    };

    cachedRates = payload;
    lastFetchTime = now;

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.warn('Exchange rates external API unavailable, using certified fallback rates:', error);

    // Si on a un vieux cache, on le sert avec fallback flag
    if (cachedRates) {
      return NextResponse.json({ ...cachedRates, is_fallback: true }, {
        headers: { 'Cache-Control': 'public, max-age=300' },
      });
    }

    // Sinon matrice de secours certifiée
    const fallbackPayload: ExchangeRatesPayload = {
      base: 'EUR',
      rates: FALLBACK_RATES_BASE_EUR,
      last_updated_at: new Date().toISOString(),
      source: 'Cash Save Certified Fallback Rates',
      is_fallback: true,
    };

    return NextResponse.json(fallbackPayload, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  }
}

