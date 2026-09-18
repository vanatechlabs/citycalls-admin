'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { loginSchema, LoginFormValues } from '@/lib/validation/auth';
import { useLogin } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Loader2, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(
      { ...values, rememberMe },
      { onSuccess: () => router.push('/dashboard') }
    );
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 lg:justify-start lg:p-16">
      {/* Hero photo — desktop/tablet only, phone gets the plain gradient above so nothing crops awkwardly */}
      <div
        className="absolute inset-0 hidden bg-cover bg-[position:70%_center] sm:block"
        style={{ backgroundImage: "url('/cityCallsLogin.png')" }}
      />
      <div className="absolute inset-0 hidden bg-gradient-to-r from-slate-950/85 via-slate-950/30 to-transparent sm:block" />

      {/* Decorative depth behind the card — subtle, brand-tinted glow */}
      <div className="pointer-events-none absolute left-[10%] top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-lime-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute left-[25%] top-[15%] h-64 w-64 rounded-full bg-indigo-500/10 blur-[90px]" />

      {/* Wordmark — mix-blend-lighten drops the logo's black backing plate so
          only the green/white text shows against whatever's behind it. */}
      <Image
        src="/citycallslogo.jpeg"
        alt="CityCalls"
        width={1055}
        height={1491}
        priority
        className="absolute left-6 top-6 h-16 w-40 mix-blend-lighten object-cover object-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] lg:left-12 lg:top-10"
      />

      <div className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-3 rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl duration-500">
        <div className="mb-8 space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight text-white">Welcome back</h2>
          <p className="text-sm text-slate-400">Sign in to your admin console to continue.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="identifier" className={errors.identifier ? 'text-destructive' : 'text-slate-200'}>
              Email or Mobile
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="identifier"
                autoFocus
                placeholder="e.g. admin@citycalls.local"
                className={`h-11 border-white/15 bg-white/5 pl-10 text-white placeholder:text-slate-500 focus-visible:border-lime-400/60 focus-visible:ring-lime-400/20 ${errors.identifier ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                {...register('identifier')}
              />
            </div>
            {errors.identifier && <p className="text-[0.8rem] font-medium text-red-400">{errors.identifier.message}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className={errors.password ? 'text-destructive' : 'text-slate-200'}>
                Password
              </Label>
              <Link href="/forgot-password" className="text-sm font-medium text-lime-400 hover:underline underline-offset-4">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className={`h-11 border-white/15 bg-white/5 pl-10 pr-10 text-white placeholder:text-slate-500 focus-visible:border-lime-400/60 focus-visible:ring-lime-400/20 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-[0.8rem] font-medium text-red-400">{errors.password.message}</p>}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded accent-lime-500"
            />
            Remember me
          </label>

          {login.isError && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {login.error.response?.data?.message ?? 'Login failed. Please try again.'}
            </div>
          )}

          <Button
            type="submit"
            className="h-11 w-full gap-1.5 bg-lime-500 text-base font-semibold text-slate-950 hover:bg-lime-400"
            disabled={login.isPending}
          >
            {login.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
              </>
            ) : (
              <>
                Sign in <ArrowRight className="h-4 w-4 transition-transform group-hover/button:translate-x-0.5" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 flex items-start gap-2.5 border-t border-white/10 pt-6 text-slate-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime-500" />
          <p className="text-xs leading-relaxed">
            Secure, role-based access to your dashboard. Every action is logged in the audit trail.
          </p>
        </div>
      </div>
    </main>
  );
}