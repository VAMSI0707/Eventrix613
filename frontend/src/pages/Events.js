import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_CONFIG from '../config/api';
import './Events.css';

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchEvents();
  }, [debouncedSearch, category]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let url = `${API_CONFIG.event}/events`;
      const params = [];
      if (debouncedSearch) params.push(`search=${encodeURIComponent(debouncedSearch)}`);
      if (category) params.push(`category=${category}`);
      if (params.length) url += `?${params.join('&')}`;

      const response = await axios.get(url);
      setEvents(response.data.events || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading events...</div>;

  return (
    <div className="events-page">
      <div className="events-header">
        <h1>Discover Events</h1>
        <p className="subtitle">Find and book tickets for amazing events</p>
      </div>
      
      <div className="filters">
        <div className="search-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search events by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button 
              className="clear-search" 
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          <option value="conference">Conference</option>
          <option value="workshop">Workshop</option>
          <option value="seminar">Seminar</option>
          <option value="concert">Concert</option>
          <option value="sports">Sports</option>
          <option value="festival">Festival</option>
          <option value="other">Other</option>
        </select>
      </div>

      {loading && <div className="search-loading">Searching events...</div>}

      {events.length === 0 ? (
        <div className="no-events">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <h2>No events found</h2>
          <p>Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="events-grid">
          {events.map(event => (
            <Link to={`/events/${event._id}`} key={event._id} className="event-card">
              <div className="event-image">
                <img 
                  src={event.imageUrl} 
                  alt={event.title}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop';
                  }}
                />
                <span className="event-category">{event.category}</span>
              </div>
              <div className="event-content">
                <h3>{event.title}</h3>
                <div className="event-details">
                  <div className="detail-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  {event.time && (
                    <div className="detail-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span>{event.time}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>{event.venue}</span>
                  </div>
                </div>
                <div className="event-footer">
                  <div className="price-section">
                    <span className="price">${event.price}</span>
                    <span className="price-label">per ticket</span>
                  </div>
                  <div className="seats-available">
                    <span className="seats-count">{event.availableSeats}</span>
                    <span className="seats-label">seats left</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Events;
