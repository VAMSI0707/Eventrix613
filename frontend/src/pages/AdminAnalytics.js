import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import './AdminAnalytics.css';

function AdminAnalytics() {
  const [eventAnalytics, setEventAnalytics] = useState(null);
  const [bookingAnalytics, setBookingAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [eventResponse, bookingResponse] = await Promise.all([
        axios.get(`${API_CONFIG.event}/events/analytics/summary`, { headers }),
        axios.get(`${API_CONFIG.booking}/bookings/analytics`, { headers })
      ]);

      setEventAnalytics(eventResponse.data);
      setBookingAnalytics(bookingResponse.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  if (error) {
    return (
      <div className="analytics-error">
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchAnalytics}>Retry</button>
      </div>
    );
  }

  const eventStatusData = [
    { label: 'Upcoming', value: eventAnalytics.events.upcoming, color: '#28a745' },
    { label: 'Ongoing', value: eventAnalytics.events.ongoing, color: '#E03A3E' },
    { label: 'Completed', value: eventAnalytics.events.completed, color: '#6c757d' }
  ];

  const bookingStatusData = [
    { label: 'Confirmed', value: bookingAnalytics.stats.confirmedBookings, color: '#28a745' },
    { label: 'Waitlisted', value: bookingAnalytics.stats.waitlistedBookings, color: '#ffc107' },
    { label: 'Cancelled', value: bookingAnalytics.stats.cancelledBookings, color: '#dc3545' }
  ];

  const maxEventValue = Math.max(...eventStatusData.map(d => d.value), 1);
  const maxBookingValue = Math.max(...bookingStatusData.map(d => d.value), 1);

  return (
    <div className="admin-analytics">
      <div className="analytics-header">
        <h1>Platform Analytics</h1>
        <button className="btn btn-secondary" onClick={fetchAnalytics}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '8px'}}>
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Refresh
        </button>
      </div>

      {/* Key Metrics Cards */}
      <section className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{background: 'linear-gradient(135deg, #E03A3E 0%, #c02a2e 100%)'}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className="metric-content">
            <h3>{eventAnalytics.events.totalEvents}</h3>
            <p>Total Events</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)'}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div className="metric-content">
            <h3>{bookingAnalytics.stats.totalBookings}</h3>
            <p>Total Bookings</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{background: 'linear-gradient(135deg, #28a745 0%, #218838 100%)'}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className="metric-content">
            <h3>${bookingAnalytics.stats.totalRevenue.toFixed(2)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{background: 'linear-gradient(135deg, #FFD520 0%, #FFC107 100%)'}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <div className="metric-content">
            <h3>{eventAnalytics.feedback.averageRating.toFixed(1)}</h3>
            <p>Avg Rating</p>
          </div>
        </div>
      </section>

      {/* Bar Charts */}
      <section className="charts-grid">
        <div className="chart-card">
          <h2 className="chart-title">Event Status Distribution</h2>
          <div className="bar-chart">
            {eventStatusData.map((item, index) => (
              <div key={index} className="bar-item">
                <div className="bar-label">{item.label}</div>
                <div className="bar-container">
                  <div 
                    className="bar-fill" 
                    style={{
                      width: `${(item.value / maxEventValue) * 100}%`,
                      background: item.color
                    }}
                  >
                    <span className="bar-value">{item.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h2 className="chart-title">Booking Status Distribution</h2>
          <div className="bar-chart">
            {bookingStatusData.map((item, index) => (
              <div key={index} className="bar-item">
                <div className="bar-label">{item.label}</div>
                <div className="bar-container">
                  <div 
                    className="bar-fill" 
                    style={{
                      width: `${(item.value / maxBookingValue) * 100}%`,
                      background: item.color
                    }}
                  >
                    <span className="bar-value">{item.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pie Chart and Top Events */}
      <section className="charts-grid">
        <div className="chart-card">
          <h2 className="chart-title">Events Overview</h2>
          <div className="donut-chart-container">
            {(() => {
              const total = eventStatusData.reduce((sum, item) => sum + item.value, 0);
              
              if (total === 0) {
                return (
                  <div className="no-data-chart">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#dee2e6" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p>No event data available</p>
                  </div>
                );
              }
              
              return (
                <>
                  <div className="donut-chart">
                    <svg viewBox="0 0 200 200">
                      {/* Background circle */}
                      <circle cx="100" cy="100" r="80" fill="#f8f9fa" />
                      
                      {/* Donut segments */}
                      {(() => {
                        let currentAngle = -90; // Start from top
                        
                        return eventStatusData.map((item, index) => {
                          if (item.value === 0) return null;
                          
                          const percentage = (item.value / total) * 100;
                          const angle = (percentage / 100) * 360;
                          
                          // Calculate stroke-dasharray for donut segment
                          const radius = 70;
                          const circumference = 2 * Math.PI * radius;
                          const strokeLength = (angle / 360) * circumference;
                          const strokeOffset = -(currentAngle / 360) * circumference;
                          
                          currentAngle += angle;
                          
                          return (
                            <circle
                              key={index}
                              cx="100"
                              cy="100"
                              r={radius}
                              fill="none"
                              stroke={item.color}
                              strokeWidth="20"
                              strokeDasharray={`${strokeLength} ${circumference}`}
                              strokeDashoffset={strokeOffset}
                              transform="rotate(-90 100 100)"
                            />
                          );
                        });
                      })()}
                      
                      {/* Center white circle for donut effect */}
                      <circle cx="100" cy="100" r="50" fill="white" />
                      
                      {/* Center text */}
                      <text x="100" y="95" textAnchor="middle" fontSize="32" fontWeight="bold" fill="#1a1a1a">
                        {total}
                      </text>
                      <text x="100" y="115" textAnchor="middle" fontSize="14" fill="#6c757d">
                        Events
                      </text>
                    </svg>
                  </div>
                  <div className="pie-legend">
                    {eventStatusData.map((item, index) => (
                      <div key={index} className="legend-item">
                        <span className="legend-color" style={{background: item.color}}></span>
                        <span className="legend-label">{item.label}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        <div className="chart-card">
          <h2 className="chart-title">Top Rated Events</h2>
          <div className="top-events-list">
            {eventAnalytics.feedback.topRated && eventAnalytics.feedback.topRated.length > 0 ? (
              eventAnalytics.feedback.topRated.slice(0, 5).map((event, index) => (
                <div key={index} className="top-event-item">
                  <div className="event-rank">#{index + 1}</div>
                  <div className="event-info">
                    <div className="event-name">{event.title}</div>
                    <div className="event-rating">
                      <span className="rating-stars">
                        {'★'.repeat(Math.round(event.averageRating))}
                        {'☆'.repeat(5 - Math.round(event.averageRating))}
                      </span>
                      <span className="rating-value">{event.averageRating.toFixed(1)}</span>
                      <span className="rating-count">({event.totalFeedback} reviews)</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No ratings yet</p>
            )}
          </div>
        </div>
      </section>

      {/* Additional Stats */}
      <section className="stats-row">
        <div className="stat-box">
          <h3>{bookingAnalytics.stats.totalTicketsSold}</h3>
          <p>Tickets Sold</p>
        </div>
        <div className="stat-box">
          <h3>{eventAnalytics.feedback.totalFeedback}</h3>
          <p>Total Reviews</p>
        </div>
        <div className="stat-box">
          <h3>{eventAnalytics.events.upcoming}</h3>
          <p>Upcoming Events</p>
        </div>
        <div className="stat-box">
          <h3>{bookingAnalytics.stats.confirmedBookings}</h3>
          <p>Confirmed Bookings</p>
        </div>
      </section>

      {/* Waitlist Table */}
      {bookingAnalytics.waitlistByEvent.length > 0 && (
        <section className="table-section">
          <h2>Active Waitlists</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>People Waiting</th>
                </tr>
              </thead>
              <tbody>
                {bookingAnalytics.waitlistByEvent.map((entry) => (
                  <tr key={entry._id}>
                    <td>{entry.title}</td>
                    <td><span className="badge">{entry.count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default AdminAnalytics;
