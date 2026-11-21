import Link from 'next/link';
import { AuthFormShell } from '@/components/auth/auth-form-shell';
import { SignInForm } from '@/components/auth/auth-forms';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ authError?: string; checkEmail?: string; next?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith('/') && !params.next.startsWith('//') ? params.next : '/dashboard';
  return (
    <AuthFormShell
      title="Welcome back"
      subtitle="Sign in to manage your tour groups and keep every shared expense transparent."
      footer={<>New to TourLedger? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-[#10243a] hover:underline">Create an account</Link></>}
    >
      {params.authError === 'confirmation' && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">The confirmation link could not be verified. It may have expired; please request a new one.</p>}
      {params.checkEmail === '1' && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">Check your email to confirm your account.</p>}
      <SignInForm next={next}/>
    </AuthFormShell>
  );
}
