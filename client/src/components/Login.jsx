import React from 'react';
import DoksifyLogo from './DoksifyLogo';
import './Login.css';

const GoogleIcon = () => (
  <svg aria-hidden="true" className="login-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M21.805 12.233c0-.746-.067-1.463-.192-2.152H12v4.073h5.498a4.704 4.704 0 0 1-2.04 3.086v2.563h3.301c1.934-1.781 3.046-4.406 3.046-7.57Z"
      fill="#4285F4"
    />
    <path
      d="M12 22c2.754 0 5.063-.913 6.75-2.472l-3.301-2.563c-.913.612-2.078.972-3.449.972-2.654 0-4.903-1.793-5.708-4.203H2.88v2.646A9.998 9.998 0 0 0 12 22Z"
      fill="#34A853"
    />
    <path
      d="M6.292 13.734A6.013 6.013 0 0 1 5.973 12c0-.602.108-1.187.319-1.734V7.62H2.88A10 10 0 0 0 2 12c0 1.611.386 3.138 1.069 4.38l3.223-2.646Z"
      fill="#FBBC04"
    />
    <path
      d="M12 6.063c1.498 0 2.844.515 3.904 1.526l2.927-2.927C17.058 3.013 14.749 2 12 2A9.998 9.998 0 0 0 2.88 7.62l3.412 2.646C7.097 7.856 9.346 6.063 12 6.063Z"
      fill="#EA4335"
    />
  </svg>
);

const Login = ({ error, helperText, onSignIn, isSigningIn }) => (
  <div className="login-screen">
    <div className="login-background-pattern" aria-hidden="true" />
    <div className="login-card">
      <div className="login-brand">
        <DoksifyLogo />
        <div>
          <p className="login-eyebrow">Real-time document workspace</p>
          <h1>Welcome to Doksify</h1>
        </div>
      </div>
      <p className="login-tagline">Write, collaborate, and create in real-time.</p>
      <p className="login-copy">
        Continue with Google to access your workspace, sync documents securely, and jump back into live collaboration.
      </p>
      {helperText ? <p className="login-helper">{helperText}</p> : null}
      <button className="login-button" type="button" onClick={onSignIn} disabled={isSigningIn}>
        <GoogleIcon />
        <span>{isSigningIn ? 'Signing in...' : 'Continue with Google'}</span>
      </button>
      <p className="login-footnote">Secure sign-in powered by your existing Google authentication flow.</p>
      {error ? <p className="login-error">{error}</p> : null}
    </div>
  </div>
);

export default Login;
