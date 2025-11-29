import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">Eventrix</Link>
        <div className="navbar-menu">
          <Link to="/" className="navbar-link">Events</Link>
          {user ? (
            <>
              <Link to="/my-bookings" className="navbar-link">My Bookings</Link>
              {user.role === 'admin' && (
                <>
                  <Link to="/admin/events" className="navbar-link">Manage Events</Link>
                  <Link to="/admin/analytics" className="navbar-link">Analytics</Link>
                </>
              )}
              <span className="navbar-user">Hi, {user.name}</span>
              <button onClick={onLogout} className="btn btn-secondary">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-login">Login</Link>
              <Link to="/register" className="btn btn-register">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;