import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import './Analytics.css';

function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [bookingStats, setBookingStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const [eventResponse, bookingResponse] = await Promise.all([
        axios.get(`${API_CONFIG.event}/events/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_CONFIG.booking}/bookings/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setAnalytics(eventResponse.data);
      setBookingStats(bookingResponse.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading analytics...</div>;
  if (!analytics || !bookingStats) return <div>No data available</div>;

  const { events, feedback } = analytics;
  const eventStatusData = [
    { label: 'Upcoming', value: events.upcoming, color: '#4CAF50' },
    { label: 'Ongoing', value: events.ongoing, color: '#2196F3' },
    { label: 'Completed', value: events.completed, color: '#9E9E9E' },
    { label: 'Cancelled', value: events.cancelled, color: '#F44336' }
  ];

  const bookingStatusData = [
    { label: 'Confirmed', value: bookingStats.confirmedBookings, color: '#4CAF50' },
    { label: 'Waitlisted', value: bookingStats.waitlistedBookings, color: '#FF9800' },
    { label: 'Cancelled', value: bookingStats.cancelledBookings, color: '#F44336' }
  ];

  const maxEventValue = Math.max(...eventStatusData.map(d => d.value));
  const maxBookingValue = Math.max(...bookingStatusData.map(d => d.value));

  return (
    <div className="analytics-container">
      <h1 className="analytics-title">📊 Analytics Dashboard</h1>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className="metric-content">
            <h3>{events.totalEvents}</h3>
            <p>Total Events</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div className="metric-content">
            <h3>{bookingStats.totalBookings}</h3>
            <p>Total Bookings</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className="metric-content">
            <h3>${bookingStats.totalRevenue.toFixed(2)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <div className="metric-content">
            <h3>{feedback.averageRating.toFixed(1)}</h3>
            <p>Avg Rating</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Event Status Chart */}
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

        {/* Booking Status Chart */}
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
      </div>

      {/* Pie Chart Section */}
      <div className="charts-grid">
        {/* Event Status Pie */}
        <div className="chart-card">
          <h2 className="chart-title">Events Overview</h2>
          <div className="pie-chart-container">
            <svg viewBox="0 0 200 200" className="pie-chart">
              {(() => {
                let currentAngle = 0;
                const total = eventStatusData.reduce((sum, item) => sum + item.value, 0);
                
                return eventStatusData.map((item, index) => {
                  if (item.value === 0) return null;
                  
                  const percentage = (item.value / total) * 100;
                  const angle = (percentage / 100) * 360;
                  const startAngle = currentAngle;
                  const endAngle = currentAngle + angle;
                  
                  const x1 = 100 + 80 * Math.cos((Math.PI * startAngle) / 180);
                  const y1 = 100 + 80 * Math.sin((Math.PI * startAngle) / 180);
                  const x2 = 100 + 80 * Math.cos((Math.PI * endAngle) / 180);
                  const y2 = 100 + 80 * Math.sin((Math.PI * endAngle) / 180);
                  
                  const largeArc = angle > 180 ? 1 : 0;
                  const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
                  
                  currentAngle += angle;
                  
                  return (
                    <path
                      key={index}
                      d={path}
                      fill={item.color}
                      stroke="white"
                      strokeWidth="2"
                    />
                  );
                });
              })()}
            </svg>
            <div className="pie-legend">
              {eventStatusData.map((item, index) => (
                <div key={index} className="legend-item">
                  <span className="legend-color" style={{background: item.color}}></span>
                  <span className="legend-label">{item.label}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Rated Events */}
        <div className="chart-card">
          <h2 className="chart-title">Top Rated Events</h2>
          <div className="top-events-list">
            {feedback.topRated && feedback.topRated.length > 0 ? (
              feedback.topRated.slice(0, 5).map((event, index) => (
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
      </div>

      {/* Additional Stats */}
      <div className="stats-row">
        <div className="stat-box">
          <h3>{bookingStats.totalTicketsSold}</h3>
          <p>Tickets Sold</p>
        </div>
        <div className="stat-box">
          <h3>{feedback.totalFeedback}</h3>
          <p>Total Reviews</p>
        </div>
        <div className="stat-box">
          <h3>{events.upcoming}</h3>
          <p>Upcoming Events</p>
        </div>
        <div className="stat-box">
          <h3>{bookingStats.confirmedBookings}</h3>
          <p>Confirmed Bookings</p>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
