import React, { useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import './Auth.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_CONFIG.auth}/auth/login`, {
        email,
        password
      });

      // Show loader for 1 second before redirecting
      setTimeout(() => {
        onLogin(response.data.token, response.data.user);
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <>
      {loading && (
        <div className="fullscreen-loader">
          <div className="loader-content">
            <div className="spinner"></div>
            <h2>Logging you in...</h2>
            <p>Please wait</p>
          </div>
        </div>
      )}
      <div className="auth-container">
        <div className="auth-card">
          <h2>Login</h2>
          {error && <div className="error">{error}</div>}
          <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
    </>
  );
}

export default Login;
