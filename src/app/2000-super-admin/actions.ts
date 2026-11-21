"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error || data !== true) redirect("/dashboard");
  return supabase;
}

export async function approveGroupAction(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const supabase = await requireSuperAdmin();
  const { error } = await supabase.rpc("super_admin_approve_group", {
    p_group_id: groupId,
  });
  if (error)
    redirect(`/2000-super-admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  revalidatePath("/2000-super-admin");
  redirect("/2000-super-admin?notice=Group+approved");
}

export async function rejectGroupAction(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const supabase = await requireSuperAdmin();
  const { error } = await supabase.rpc("super_admin_reject_group", {
    p_group_id: groupId,
  });
  if (error)
    redirect(`/2000-super-admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  revalidatePath("/2000-super-admin");
  redirect("/2000-super-admin?notice=Group+request+rejected");
}

export async function deleteGroupAction(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const confirmationCode = String(formData.get("confirmationCode") ?? "");
  const supabase = await requireSuperAdmin();

  // The secret stays server-side in the deployment environment and is never sent to the browser.
  const configuredCode = process.env.SUPER_ADMIN_DELETE_CODE ?? "";
  if (
    !/^[A-Za-z0-9]{32}$/.test(configuredCode) ||
    !/^[A-Za-z0-9]{32}$/.test(confirmationCode)
  ) {
    redirect(
      "/2000-super-admin?error=Deletion+code+is+not+configured+correctly",
    );
  }
  const expectedHash = createHash("sha256")
    .update(configuredCode, "utf8")
    .digest();
  const suppliedHash = createHash("sha256")
    .update(confirmationCode, "utf8")
    .digest();
  if (!timingSafeEqual(expectedHash, suppliedHash)) {
    redirect("/2000-super-admin?error=Invalid+deletion+confirmation+code");
  }

  const { error } = await supabase.rpc("super_admin_delete_group", {
    p_group_id: groupId,
  });
  if (error)
    redirect(`/2000-super-admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  revalidatePath("/2000-super-admin");
  redirect("/2000-super-admin?notice=Group+permanently+deleted");
}

export async function createUserAction(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  // Verify the caller before invoking the privileged Auth Admin API.
  await requireSuperAdmin();

  if (fullName.length < 2 || fullName.length > 100) {
    redirect(
      "/2000-super-admin?error=Full+name+must+be+between+2+and+100+characters",
    );
  }
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254) {
    redirect("/2000-super-admin?error=Enter+a+valid+email+address");
  }
  if (password.length < 8 || password.length > 128) {
    redirect(
      "/2000-super-admin?error=Password+must+be+between+8+and+128+characters",
    );
  }
  if (password !== confirmPassword) {
    redirect("/2000-super-admin?error=Passwords+do+not+match");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    const message = /already|registered|exists/i.test(error.message)
      ? "An+account+with+this+email+already+exists"
      : encodeURIComponent(error.message);
    redirect(`/2000-super-admin?error=${message}`);
  }
  if (!data.user) {
    redirect(
      "/2000-super-admin?error=Supabase+did+not+return+the+created+user",
    );
  }

  // Migration 0001's on_auth_user_created trigger creates the profiles row.
  revalidatePath("/2000-super-admin");
  redirect("/2000-super-admin?notice=User+account+created+successfully");
}
