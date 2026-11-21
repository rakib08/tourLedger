'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type AuthState = { error?: string; success?: string };
const emailSchema = z.string().trim().email('Enter a valid email address.');
const passwordSchema = z.string().min(8, 'Password must contain at least 8 characters.');

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

async function getOrigin() {
  const headerStore = await headers();
  return headerStore.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export async function signUpAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const next = safeNextPath(String(formData.get('next') ?? '/dashboard'));
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const parsedEmail = emailSchema.safeParse(email);
  const parsedPassword = passwordSchema.safeParse(password);

  if (fullName.length < 2 || fullName.length > 80) return { error: 'Full name must be between 2 and 80 characters.' };
  if (!parsedEmail.success) return { error: 'Enter a valid email address.' };
  if (!parsedPassword.success) return { error: parsedPassword.error.issues[0]?.message ?? 'Invalid password.' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${await getOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return { error: error.message };
  if (data.session) redirect(next);
  return { success: 'Account created. Check your email for the confirmation link before signing in.' };
}

export async function signInAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const next = safeNextPath(String(formData.get('next') ?? '/dashboard'));
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!emailSchema.safeParse(email).success || !password) return { error: 'Enter your email and password.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect(next);
}

export async function requestPasswordResetAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!emailSchema.safeParse(email).success) return { error: 'Enter a valid email address.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: error.message };
  return { success: 'If an account exists for that email, a password reset link has been sent.' };
}

export async function updatePasswordAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get('password') ?? '');
  const confirmation = String(formData.get('confirmPassword') ?? '');
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid password.' };
  if (password !== confirmation) return { error: 'The passwords do not match.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Your reset session has expired. Request a new password reset link.' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect('/dashboard?passwordUpdated=1');
}

export async function signOutAction() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
