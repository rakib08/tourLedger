'use client';

import type { FormEvent } from 'react';
import { deleteGroupAction } from './actions';

export function DeleteGroupButton({ groupId }: { groupId: string }) {
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const codeInput = form.elements.namedItem('confirmationCode') as HTMLInputElement | null;
    if (!codeInput || codeInput.value.length !== 32) {
      event.preventDefault();
      window.alert('Enter the exact 32-character deletion confirmation code.');
      codeInput?.focus();
      return;
    }
    if (!window.confirm('Permanently delete this group and all of its database records? This action cannot be undone.')) {
      event.preventDefault();
    }
  }

  return <form action={deleteGroupAction} onSubmit={confirmDelete} className="flex flex-wrap items-end gap-2">
    <input type="hidden" name="groupId" value={groupId}/>
    <label className="grid gap-1 text-xs font-semibold text-slate-600">
      32-Character Deletion Code
      <input
        type="password"
        name="confirmationCode"
        required
        minLength={32}
        maxLength={32}
        pattern="[A-Za-z0-9]{32}"
        autoComplete="off"
        spellCheck={false}
        aria-label="32-character deletion confirmation code"
        placeholder="Enter Your 32-Character Code"
        className="w-64 max-w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal"
      />
    </label>
    <button type="submit" className="rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700">Delete Permanently</button>
  </form>;
}
