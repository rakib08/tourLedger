import Link from 'next/link';
import { AuthFormShell } from '@/components/auth/auth-form-shell';
import { ForgotPasswordForm } from '@/components/auth/auth-forms';

export default function ForgotPasswordPage() {
  return (
    <AuthFormShell
      title="Reset your password"
      subtitle="Enter the email address associated with your account. We'll send a password reset link if the account exists."
      footer={<Link href="/login" className="font-semibold text-[#10243a] hover:underline">Back to sign in</Link>}
    >
      <ForgotPasswordForm />
    </AuthFormShell>
  );
}
