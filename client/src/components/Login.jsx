import React from 'react';
import './Login.css';

const Login = ({ error, onSignIn, isSigningIn }) => (
  <div className="login-screen">
    <div className="login-card">
      <p className="login-eyebrow">Collaborative Editor</p>
      <h1>Sign in to open your workspace</h1>
      <p className="login-copy">
        Use Google Sign-In to access your documents, share them with collaborators, and keep editing permissions secure.
      </p>
      <button className="login-button" onClick={onSignIn} disabled={isSigningIn}>
        {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
      </button>
      {error ? <p className="login-error">{error}</p> : null}
    </div>
  </div>
);

export default Login;
