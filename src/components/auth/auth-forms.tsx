'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
  type AuthState,
} from '@/app/auth/actions';

const initialState: AuthState = {};

function Feedback({ state }: { state: AuthState }) {
  if (state.error) return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{state.error}</p>;
  if (state.success) return <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">{state.success}</p>;
  return null;
}

function Field({ label, name, type = 'text', placeholder, autoComplete, required = true }: {
  label: string; name: string; type?: string; placeholder?: string; autoComplete?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#10243a] focus:ring-2 focus:ring-[#10243a]/10"
      />
    </label>
  );
}

function SubmitButton({ children }: { children: string }) {
  return <button type="submit" className="w-full rounded-xl bg-[#10243a] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#193956] focus:outline-none focus:ring-2 focus:ring-[#d6a84b] focus:ring-offset-2">{children}</button>;
}

export function SignInForm({ next = '/dashboard' }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, initialState);
  return <form action={action} className="space-y-5">
    <input type="hidden" name="next" value={next}/>
    <Field label="Email address" name="email" type="email" placeholder="you@example.com" autoComplete="email"/>
    <Field label="Password" name="password" type="password" placeholder="Your password" autoComplete="current-password"/>
    <div className="flex justify-end"><Link href="/forgot-password" className="text-sm font-medium text-[#10243a] hover:underline">Forgot password?</Link></div>
    <Feedback state={state}/>
    <SubmitButton>{pending ? 'Signing in…' : 'Sign in'}</SubmitButton>
  </form>;
}

export function SignUpForm({ next = '/dashboard' }: { next?: string }) {
  const [state, action, pending] = useActionState(signUpAction, initialState);
  return <form action={action} className="space-y-5">
    <input type="hidden" name="next" value={next}/>
    <Field label="Full name" name="fullName" placeholder="Your full name" autoComplete="name"/>
    <Field label="Email address" name="email" type="email" placeholder="you@example.com" autoComplete="email"/>
    <Field label="Password" name="password" type="password" placeholder="At least 8 characters" autoComplete="new-password"/>
    <Feedback state={state}/>
    <SubmitButton>{pending ? 'Creating account…' : 'Create account'}</SubmitButton>
  </form>;
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialState);
  return <form action={action} className="space-y-5">
    <Field label="Email address" name="email" type="email" placeholder="you@example.com" autoComplete="email"/>
    <Feedback state={state}/>
    <SubmitButton>{pending ? 'Sending link…' : 'Send reset link'}</SubmitButton>
  </form>;
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initialState);
  return <form action={action} className="space-y-5">
    <Field label="New password" name="password" type="password" placeholder="At least 8 characters" autoComplete="new-password"/>
    <Field label="Confirm new password" name="confirmPassword" type="password" placeholder="Enter it again" autoComplete="new-password"/>
    <Feedback state={state}/>
    <SubmitButton>{pending ? 'Updating password…' : 'Update password'}</SubmitButton>
  </form>;
}
