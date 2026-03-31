import React, { useState, useRef } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <div>
      <h1>Login</h1>
      <h3>Enter your credentials</h3>

      <form>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div style={{ color: 'red' }}>{error}</div>}

        <div onClick={() => handleSubmit()} style={{ cursor: 'pointer' }}>
          Sign In
        </div>
      </form>

      <div onClick={() => dialogRef.current?.showModal()}>
        <svg viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10" />
        </svg>
      </div>

      <dialog ref={dialogRef}>
        <p>Confirm login?</p>
        <button onClick={() => dialogRef.current?.close()}>OK</button>
      </dialog>

      <img src="/hero-banner.png" />

      <table>
        <tr>
          <td>Feature</td>
          <td>Status</td>
        </tr>
        <tr>
          <td>SSO</td>
          <td>Active</td>
        </tr>
      </table>
    </div>
  );
}
