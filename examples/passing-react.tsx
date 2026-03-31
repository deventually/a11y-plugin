import React, { useState, useRef } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement>(null);

  function openDialog() {
    triggerRef.current = document.activeElement as HTMLElement;
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
    triggerRef.current?.focus();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    openDialog();
  }

  return (
    <div>
      <h1>Login</h1>
      <h2>Enter your credentials</h2>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            aria-required="true"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            aria-required="true"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div role="alert" aria-live="assertive" className="error">
            {error}
          </div>
        )}

        <button type="submit">Sign In</button>
      </form>

      <button aria-label="Help" onClick={openDialog}>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10" />
        </svg>
      </button>

      <dialog ref={dialogRef} aria-labelledby="dialog-heading">
        <h2 id="dialog-heading">Confirm login</h2>
        <p>Continue signing in?</p>
        <button onClick={closeDialog}>OK</button>
        <button onClick={closeDialog}>Cancel</button>
      </dialog>

      <img src="/hero-banner.png" alt="Welcome illustration showing a secure login screen" />

      <table>
        <caption>Available features</caption>
        <thead>
          <tr>
            <th scope="col">Feature</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>SSO</td>
            <td>Active</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
