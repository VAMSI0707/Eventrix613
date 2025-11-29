import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import { toast } from 'react-toastify';
import API_CONFIG from '../config/api';
import './MyBookings.css';

// Utility function to convert 24-hour to 12-hour format
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  if (/AM|PM/i.test(timeStr)) return timeStr;
  
  const [hours, minutes] = timeStr.split(':');
  let hour = parseInt(hours);
  const period = hour >= 12 ? 'PM' : 'AM';
  
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  
  return `${hour}:${minutes} ${period}`;
};

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '', type: '' });
  const [cancelBookingId, setCancelBookingId] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_CONFIG.booking}/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(response.data.bookings);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (title, message, type) => {
    setModalContent({ title, message, type });
    setShowModal(true);
  };

  const showQRCode = async (booking) => {
    try {
      const qrPayload = {
        bookingReference: booking.bookingReference,
        eventId: booking.eventId,
        eventTitle: booking.eventTitle,
        eventDate: booking.eventDate,
        userEmail: booking.userEmail
      };
      const qrUrl = await QRCode.toDataURL(JSON.stringify(qrPayload));
      setQrCodeUrl(qrUrl);
      setSelectedBooking(booking);
      setShowQRModal(true);
    } catch (err) {
      toast.error('Failed to generate QR code');
    }
  };

  const showCancelConfirmation = (bookingId) => {
    setCancelBookingId(bookingId);
    setModalContent({
      title: 'Cancel Booking',
      message: 'Are you sure you want to cancel this booking? This action cannot be undone.',
      type: 'confirm'
    });
    setShowModal(true);
  };

  const handleCancel = async () => {
    if (!cancelBookingId) return;

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_CONFIG.booking}/bookings/${cancelBookingId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowModal(false);
      setCancelBookingId(null);
      fetchBookings();
      toast.success('Booking cancelled successfully!');
    } catch (err) {
      setShowModal(false);
      toast.error(err.response?.data?.error || 'Failed to cancel booking');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setCancelBookingId(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#28a745';
      case 'waitlisted': return '#ffc107';
      case 'cancelled': return '#dc3545';
      case 'pending': return '#6c757d';
      default: return '#6c757d';
    }
  };

  if (loading) return <div className="loading">Loading bookings...</div>;

  return (
    <div className="my-bookings">
      <div className="bookings-header">
        <h1>My Bookings</h1>
        <p className="subtitle">Manage your event reservations</p>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
          <h2>No bookings yet</h2>
          <p>Start exploring events and make your first booking!</p>
        </div>
      ) : (
        <div className="bookings-grid">
          {bookings.map(booking => (
            <div key={booking._id} className="booking-card-modern">
              <div className="booking-card-header" style={{ borderLeftColor: getStatusColor(booking.bookingStatus) }}>
                <div className="event-info">
                  <h3>{booking.eventTitle}</h3>
                  <span className={`status-badge ${booking.bookingStatus}`}>
                    {booking.bookingStatus.toUpperCase()}
                  </span>
                </div>
                <div className="booking-ref">
                  <span className="ref-label">REF</span>
                  <span className="ref-number">{booking.bookingReference}</span>
                </div>
              </div>

              <div className="booking-card-body">
                <div className="info-row">
                  <div className="info-item">
                    <div className="icon-circle">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </div>
                    <div>
                      <span className="label">Date</span>
                      <span className="value">{new Date(booking.eventDate).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}</span>
                    </div>
                  </div>
                  {booking.eventTime && (
                    <div className="info-item">
                      <div className="icon-circle">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                      </div>
                      <div>
                        <span className="label">Time</span>
                        <span className="value">{formatTime(booking.eventTime)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="info-row">
                  <div className="info-item full-width">
                    <div className="icon-circle">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                    </div>
                    <div>
                      <span className="label">Venue</span>
                      <span className="value">{booking.eventVenue}</span>
                    </div>
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-item">
                    <div className="icon-circle">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                        <polyline points="10 17 15 12 10 7"></polyline>
                        <line x1="15" y1="12" x2="3" y2="12"></line>
                      </svg>
                    </div>
                    <div>
                      <span className="label">Tickets</span>
                      <span className="value">{booking.numberOfTickets}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="icon-circle">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                    </div>
                    <div>
                      <span className="label">Total</span>
                      <span className="value amount">${booking.totalAmount}</span>
                    </div>
                  </div>
                </div>

                <div className="payment-status">
                  <span className={`payment-badge ${booking.paymentStatus}`}>
                    {booking.paymentStatus === 'completed' ? '✓ Paid' : 
                     booking.paymentStatus === 'refunded' ? '↺ Refunded' : 
                     booking.paymentStatus}
                  </span>
                </div>

                {booking.bookingStatus === 'waitlisted' && (
                  <div className="waitlist-alert">
                    <svg className="alert-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <p>You're on the waitlist. We'll email you automatically if seats become available.</p>
                  </div>
                )}

                {booking.bookingStatus === 'confirmed' && (
                  <div className="booking-actions">
                    <button
                      onClick={() => showQRCode(booking)}
                      className="btn-qr"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                      </svg>
                      Show QR Code
                    </button>
                    <button
                      onClick={() => showCancelConfirmation(booking._id)}
                      className="btn-cancel"
                    >
                      Cancel Booking
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            {modalContent.type === 'confirm' ? (
              <>
                <div className="modal-icon">⚠️</div>
                <h2>{modalContent.title}</h2>
                <p>{modalContent.message}</p>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={closeModal}>No, Keep It</button>
                  <button className="btn btn-danger" onClick={handleCancel}>Yes, Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-icon">{modalContent.type === 'success' ? '✓' : '✕'}</div>
                <h2>{modalContent.title}</h2>
                <p>{modalContent.message}</p>
                <div className="modal-actions">
                  <button className="btn btn-primary" onClick={closeModal}>OK</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedBooking && (
        <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qr-modal-header">
              <h2>Your Ticket QR Code</h2>
              <button className="qr-modal-close" onClick={() => setShowQRModal(false)}>&times;</button>
            </div>
            <div className="qr-modal-body">
              <div className="qr-info">
                <h3>{selectedBooking.eventTitle}</h3>
                <p className="qr-ref">Ref: {selectedBooking.bookingReference}</p>
              </div>
              <div className="qr-code-container">
                <img src={qrCodeUrl} alt="QR Code" />
              </div>
              <p className="qr-instruction">Show this QR code at the entrance for check-in</p>
            </div>
            <div className="qr-modal-footer">
              <button className="btn btn-primary" onClick={() => setShowQRModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyBookings;
