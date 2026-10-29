'use client';

import React, { createContext, useContext, useEffect, useState, useTransition, useCallback } from 'react';
import { SupportedCurrency, SupportedLanguage, Profile } from '@/types';
import {
  FALLBACK_RATES_BASE_EUR,
  SUPPORTED_CURRENCIES,
  convertAmount,
  formatMoney,
  ExchangeRatesPayload,
} from '@/lib/currency';
import { createClient } from '@/lib/supabase/client';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';

// Import statique des dictionnaires
import frDict from '@/locales/fr.json';
import enDict from '@/locales/en.json';
import esDict from '@/locales/es.json';
import ptDict from '@/locales/pt.json';
import deDict from '@/locales/de.json';
import arDict from '@/locales/ar.json';

const DICTIONARIES: Record<SupportedLanguage, any> = {
  fr: frDict,
  en: enDict,
  es: esDict,
  pt: ptDict,
  de: deDict,
  ar: arDict,
};

interface PreferencesContextType {
  language: SupportedLanguage;
  currency: SupportedCurrency;
  rates: Record<SupportedCurrency, number>;
  ratesLastUpdated: string;
  isRatesOffline: boolean;
  dir: 'ltr' | 'rtl';
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  setCurrency: (curr: SupportedCurrency) => Promise<void>;
  convert: (amount: number | string, fromCurrency?: SupportedCurrency) => number;
  format: (amount: number | string, customCurrency?: SupportedCurrency) => string;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
  translateCategory: (category: string) => string;
}

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('fr');
  const [currency, setCurrencyState] = useState<SupportedCurrency>('XOF');
  const [rates, setRates] = useState<Record<SupportedCurrency, number>>(FALLBACK_RATES_BASE_EUR);
  const [ratesLastUpdated, setRatesLastUpdated] = useState<string>(new Date().toISOString());
  const [isRatesOffline, setIsRatesOffline] = useState(false);
  const [isPending, startTransition] = useTransition();

  const supabase = createClient();
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  // 1. Initialisation des préférences utilisateur (local puis Supabase)
  useEffect(() => {
    // Lecture locale immédiate
    try {
      const storedLang = localStorage.getItem('cashsave_preferred_language') as SupportedLanguage;
      if (storedLang && ['fr', 'en', 'es', 'pt', 'de', 'ar'].includes(storedLang)) {
        setLanguageState(storedLang);
      }

      const storedCurr = localStorage.getItem('cashsave_preferred_currency') as SupportedCurrency;
      if (storedCurr && Object.keys(SUPPORTED_CURRENCIES).includes(storedCurr)) {
        setCurrencyState(storedCurr);
      }
    } catch (e) {}

    // Synchronisation avec profil Supabase si connecté
    async function syncFromProfile() {
      if (!isLiveSupabaseConfigured()) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('preferred_language, preferred_currency')
            .eq('id', user.id)
            .single();

          if (data) {
            if (data.preferred_language && data.preferred_language !== language) {
              setLanguageState(data.preferred_language as SupportedLanguage);
              localStorage.setItem('cashsave_preferred_language', data.preferred_language);
            }
            if (data.preferred_currency && data.preferred_currency !== currency) {
              setCurrencyState(data.preferred_currency as SupportedCurrency);
              localStorage.setItem('cashsave_preferred_currency', data.preferred_currency);
            }
          }
        }
      } catch (e) {}
    }
    syncFromProfile();
  }, []);

  // 2. Gestion de la balise HTML (lang et dir pour RTL)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = dir;
      if (language === 'ar') {
        document.documentElement.classList.add('rtl');
      } else {
        document.documentElement.classList.remove('rtl');
      }
    }
  }, [language, dir]);

  // 3. Récupération des taux de change via route interne avec cache
  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch('/api/exchange-rates');
        if (res.ok) {
          const data: ExchangeRatesPayload = await res.json();
          if (data && data.rates) {
            setRates(data.rates);
            setRatesLastUpdated(data.last_updated_at);
            setIsRatesOffline(!!data.is_fallback);
          }
        } else {
          setIsRatesOffline(true);
        }
      } catch (e) {
        setIsRatesOffline(true);
      }
    }
    fetchRates();
  }, []);

  // 4. Mutation de la langue
  const setLanguage = useCallback(async (newLang: SupportedLanguage) => {
    startTransition(() => {
      setLanguageState(newLang);
    });
    try {
      localStorage.setItem('cashsave_preferred_language', newLang);
      const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
      localStorage.setItem('cashsave_user', JSON.stringify({ ...localUser, preferred_language: newLang }));
      window.dispatchEvent(new CustomEvent('cashsave_preferences_updated', { detail: { language: newLang } }));
    } catch (e) {}

    if (isLiveSupabaseConfigured()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({ preferred_language: newLang }).eq('id', user.id);
        }
      } catch (e) {}
    }
  }, [supabase]);

  // 5. Mutation de la devise
  const setCurrency = useCallback(async (newCurr: SupportedCurrency) => {
    startTransition(() => {
      setCurrencyState(newCurr);
    });
    try {
      localStorage.setItem('cashsave_preferred_currency', newCurr);
      const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
      localStorage.setItem('cashsave_user', JSON.stringify({ ...localUser, preferred_currency: newCurr }));
      window.dispatchEvent(new CustomEvent('cashsave_preferences_updated', { detail: { currency: newCurr } }));
    } catch (e) {}

    if (isLiveSupabaseConfigured()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({ preferred_currency: newCurr }).eq('id', user.id);
        }
      } catch (e) {}
    }
  }, [supabase]);

  // 6. Conversion dynamique d'un montant sans altérer l'original
  const convert = useCallback((amount: number | string, fromCurrency?: SupportedCurrency): number => {
    const from = fromCurrency || 'XOF';
    return convertAmount(amount, from, currency, rates);
  }, [currency, rates]);

  // 7. Formatage universel respectant la locale et la devise
  const format = useCallback((amount: number | string, customCurrency?: SupportedCurrency): string => {
    const curr = customCurrency || currency;
    return formatMoney(amount, curr, language);
  }, [currency, language]);

  // 8. Fonction de traduction t(keyPath, params)
  const t = useCallback((keyPath: string, params?: Record<string, string | number>): string => {
    const dict = DICTIONARIES[language] || DICTIONARIES.fr;
    const parts = keyPath.split('.');
    let cur = dict;

    for (const part of parts) {
      if (cur && typeof cur === 'object' && part in cur) {
        cur = cur[part];
      } else {
        // Fallback en français si clé manquante
        let fb = DICTIONARIES.fr;
        for (const fPart of parts) {
          if (fb && typeof fb === 'object' && fPart in fb) {
            fb = fb[fPart];
          } else {
            return keyPath;
          }
        }
        cur = fb;
        break;
      }
    }

    if (typeof cur !== 'string') return keyPath;

    let res = cur;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        res = res.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return res;
  }, [language]);

  // 9. Traduction des catégories prédéfinies
  const translateCategory = useCallback((category: string): string => {
    const translated = t(`categories.${category}`);
    return translated === `categories.${category}` ? category : translated;
  }, [t]);

  return (
    <PreferencesContext.Provider
      value={{
        language,
        currency,
        rates,
        ratesLastUpdated,
        isRatesOffline,
        dir,
        setLanguage,
        setCurrency,
        convert,
        format,
        t,
        translateCategory,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

