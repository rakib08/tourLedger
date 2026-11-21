import Link from 'next/link';
import { AuthFormShell } from '@/components/auth/auth-form-shell';
import { SignUpForm } from '@/components/auth/auth-forms';

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith('/') && !params.next.startsWith('//') ? params.next : '/dashboard';
  return (
    <AuthFormShell
      title="Create your account"
      subtitle="One account gives you access to every tour group you create or join."
      footer={<>Already registered? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-[#10243a] hover:underline">Sign in</Link></>}
    >
      <SignUpForm next={next}/>
      <p className="mt-5 text-xs leading-5 text-slate-400">By creating an account, you agree to use TourLedger responsibly and keep group financial records accurate.</p>
    </AuthFormShell>
  );
}
