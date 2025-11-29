import React, { useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import './Auth.css';

function Register({ onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate UMD email
    if (!email.endsWith('@umd.edu')) {
      setError('Only @umd.edu email addresses are allowed');
      return;
    }

    // Validate password
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_CONFIG.auth}/auth/register`, {
        name,
        email,
        password
      });

      // Show loader for 1 second before redirecting
      setTimeout(() => {
        onLogin(response.data.token, response.data.user);
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <>
      {loading && (
        <div className="fullscreen-loader">
          <div className="loader-content">
            <div className="spinner"></div>
            <h2>Creating your account...</h2>
            <p>Please wait</p>
          </div>
        </div>
      )}
      <div className="auth-container">
        <div className="auth-card">
          <h2>Register</h2>
          {error && <div className="error">{error}</div>}
          <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="UMD Email (@umd.edu)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="6"
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
    </>
  );
}

export default Register;
