'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { forgotPasswordSchema, ForgotPasswordFormValues } from '@/lib/validation/auth';
import { useForgotPassword } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AppFormField } from '@/components/ui/AppFormField';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = (values: ForgotPasswordFormValues) => {
    forgotPassword.mutate(values, {
      onSuccess: () => setSuccess(true),
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4">
      <Card className="w-full max-w-sm shadow-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email or mobile number and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        
        {success ? (
          <CardContent className="space-y-4">
            <div className="rounded-md bg-success/15 p-3 text-sm text-success-foreground font-medium border border-success/20 text-center">
              A password reset link has been sent to your email/mobile.
            </div>
            <Link href="/login" className="block text-center text-sm font-medium text-primary hover:underline underline-offset-4">
              Return to login
            </Link>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <AppFormField
                label="Email or Mobile"
                placeholder="e.g. admin@citycalls.local"
                error={errors.identifier?.message}
                {...register('identifier')}
              />

              {forgotPassword.isError && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive font-medium border border-destructive/20">
                  {forgotPassword.error.message || 'Something went wrong. Please try again.'}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={forgotPassword.isPending}
              >
                {forgotPassword.isPending ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <div className="text-center">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Back to login
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </main>
  );
}
