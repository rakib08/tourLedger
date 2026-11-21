import Link from 'next/link';
import { AuthFormShell } from '@/components/auth/auth-form-shell';
import { UpdatePasswordForm } from '@/components/auth/auth-forms';

export default function ResetPasswordPage() {
  return (
    <AuthFormShell
      title="Choose a new password"
      subtitle="Use at least 8 characters. This form is available after opening a valid password reset link."
      footer={<Link href="/login" className="font-semibold text-[#10243a] hover:underline">Back to sign in</Link>}
    >
      <UpdatePasswordForm />
    </AuthFormShell>
  );
}
