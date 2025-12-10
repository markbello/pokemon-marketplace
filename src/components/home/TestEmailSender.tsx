'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function TestEmailSender() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({
    type: 'idle',
  });

  async function handleSend() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setStatus({ type: 'error', message: 'Enter an email address' });
      return;
    }

    setStatus({ type: 'loading', message: 'Sending test email...' });

    try {
      const res = await fetch('/api/test/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (res.ok && data.success) {
        setStatus({ type: 'success', message: 'Test email sent. Check your inbox.' });
      } else {
        setStatus({
          type: 'error',
          message: data.error || 'Failed to send test email',
        });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unexpected error',
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-foreground text-sm font-medium">Email</label>
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          type="email"
        />
      </div>
      <Button className="w-full" disabled={status.type === 'loading'} onClick={handleSend}>
        {status.type === 'loading' ? 'Sending...' : 'Send test email'}
      </Button>
      {status.message ? (
        <p
          className={`text-sm ${
            status.type === 'error'
              ? 'text-destructive'
              : status.type === 'success'
                ? 'text-green-600'
                : 'text-muted-foreground'
          }`}
        >
          {status.message}
        </p>
      ) : null}
      <p className="text-muted-foreground text-xs">
        Dev-only endpoint. Sends a sample confirmation email to the address provided.
      </p>
    </div>
  );
}
