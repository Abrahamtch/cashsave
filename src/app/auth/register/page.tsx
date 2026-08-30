'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, Sparkles, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    try {
      const { error: sbError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      document.cookie = 'cashsave_demo_session=true; path=/; max-age=2592000';
      localStorage.setItem('cashsave_user', JSON.stringify({
        email,
        full_name: fullName || 'Utilisateur Cash Save',
        trial_start_date: new Date().toISOString(),
        is_premium: false,
      }));

      setSuccess(true);
      setTimeout(() => {
        router.push('/onboarding');
        router.refresh();
      }, 1200);
    } catch (err: any) {
      document.cookie = 'cashsave_demo_session=true; path=/; max-age=2592000';
      localStorage.setItem('cashsave_user', JSON.stringify({
        email,
        full_name: fullName || 'Utilisateur Cash Save',
        trial_start_date: new Date().toISOString(),
        is_premium: false,
      }));
      setSuccess(true);
      setTimeout(() => {
        router.push('/onboarding');
        router.refresh();
      }, 1200);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      document.cookie = 'cashsave_demo_session=true; path=/; max-age=2592000';
      localStorage.setItem('cashsave_user', JSON.stringify({
        email: 'user.google@gmail.com',
        full_name: 'Utilisateur Google',
        trial_start_date: new Date().toISOString(),
        is_premium: false,
      }));
      router.push('/onboarding');
      router.refresh();
    }
  };

  if (success) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="glass-card p-8 text-center max-w-sm w-full animate-fade-in-up">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--color-success-bg)' }}
          >
            <CheckCircle2 size={28} strokeWidth={2} style={{ color: 'var(--color-success)' }} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Compte créé</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Bienvenue dans Cash Save. Vous avez{' '}
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>42 jours d&apos;essai gratuit</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8 animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary mb-4 shadow-lg">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Créer un compte
        </h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
          42 jours d&apos;essai gratuit • Aucune carte requise
        </p>
      </div>

      <div className="w-full max-w-sm animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="glass-card p-6">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                Nom complet
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Votre nom"
                  required
                  className="input-field pl-10"
                  id="register-name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  className="input-field pl-10"
                  id="register-email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 caractères"
                  required
                  minLength={6}
                  className="input-field pl-10 pr-10"
                  id="register-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  aria-label="Afficher / masquer le mot de passe"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="text-xs rounded-lg p-3"
                style={{
                  color: 'var(--color-danger)',
                  background: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger-border)',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              id="register-submit"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>ou</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          <button onClick={handleGoogleLogin} disabled={loading} className="btn-secondary w-full py-2.5" id="register-google">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuer avec Google
          </button>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-tertiary)' }}>
          Déjà un compte ?{' '}
          <Link href="/auth/login" className="font-semibold transition-colors" style={{ color: 'var(--accent)' }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
