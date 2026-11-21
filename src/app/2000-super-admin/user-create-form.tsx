"use client";

import { useState } from "react";
import { createUserAction } from "./actions";

export function UserCreateForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#b58a35]">Temporary Feature</p>
        <h2 className="mt-1 text-lg font-bold text-[#10243a]">Create User Account</h2>
        <p className="mt-1 text-sm text-slate-500">
          Create a TourLedger login manually. Share the initial password privately with the user.
        </p>
      </div>

      <form action={createUserAction} className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">
          Full Name
          <input name="fullName" required minLength={2} maxLength={100} autoComplete="name"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" placeholder="Enter Full Name" />
        </label>

        <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">
          Email Address
          <input name="email" type="email" required maxLength={254} autoComplete="email"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" placeholder="user@example.com" />
        </label>

        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          Initial Password
          <input name="password" type="password" required minLength={8} maxLength={128}
            autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" placeholder="At least 8 characters" />
        </label>

        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          Confirm Password
          <input name="confirmPassword" type="password" required minLength={8} maxLength={128}
            autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            aria-invalid={mismatch}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" placeholder="Re-enter password" />
        </label>

        {mismatch && <p className="text-sm text-rose-600 sm:col-span-2">Passwords do not match.</p>}

        <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
          The account will be created with email confirmation completed, so the user can sign in immediately.
          The password is sent only to Supabase Auth and is not stored in the TourLedger database.
        </p>

        <div className="sm:col-span-2">
          <button type="submit" disabled={mismatch || password.length < 8 || confirmPassword.length < 8}
            className="rounded-xl bg-[#10243a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1b3856] disabled:cursor-not-allowed disabled:opacity-50">
            Create User Account
          </button>
        </div>
      </form>
    </section>
  );
}
