import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_CONFIG from '../config/api';
import './EventDetail.css';

function EventDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState(1);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [feedback, setFeedback] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState({ averageRating: 0, total: 0, breakdown: {} });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [hasActiveBooking, setHasActiveBooking] = useState(false);
  const [checkingBooking, setCheckingBooking] = useState(true);

  useEffect(() => {
    fetchEvent();
    fetchFeedback();
    if (user) {
      checkUserBooking();
    } else {
      setCheckingBooking(false);
    }
  }, [id, user]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`${API_CONFIG.event}/events/${id}`);
      setEvent(response.data);
    } catch (err) {
      console.error('Error fetching event:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async () => {
    try {
      const response = await axios.get(`${API_CONFIG.event}/events/${id}/feedback`);
      setFeedback(response.data.feedback);
      setFeedbackStats(response.data.stats);
    } catch (err) {
      console.error('Error fetching feedback:', err);
    }
  };

  const checkUserBooking = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_CONFIG.booking}/bookings/event/${id}/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHasActiveBooking(response.data.hasBooking && response.data.bookingStatus !== 'cancelled');
    } catch (err) {
      console.error('Error checking booking:', err);
      setHasActiveBooking(false);
    } finally {
      setCheckingBooking(false);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      toast.info('Please login to book tickets');
      navigate('/login');
      return;
    }

    if (tickets < 1 || tickets > 10) {
      toast.error('Please select between 1 and 10 tickets');
      return;
    }

    setBooking(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_CONFIG.booking}/bookings`,
        {
          eventId: event._id,
          numberOfTickets: tickets,
          paymentMethod: 'credit_card',
          joinWaitlist: event.availableSeats < tickets
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.booking?.bookingStatus === 'waitlisted') {
        toast.warning('Event is full. You have been added to the waitlist.');
        setTimeout(() => navigate('/my-bookings'), 2000);
      } else {
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          navigate('/my-bookings');
          window.scrollTo(0, 0);
        }, 2500);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackMessage('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_CONFIG.event}/events/${id}/feedback`,
        { rating: Number(rating), comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFeedbackMessage('Thank you for sharing your feedback!');
      setComment('');
      setRating(5);
      fetchFeedback();
    } catch (err) {
      setFeedbackMessage(err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleEditFeedback = (feedbackItem) => {
    setEditingFeedbackId(feedbackItem._id);
    setEditRating(feedbackItem.rating);
    setEditComment(feedbackItem.comment);
  };

  const handleCancelEdit = () => {
    setEditingFeedbackId(null);
    setEditRating(5);
    setEditComment('');
  };

  const handleUpdateFeedback = async (feedbackId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_CONFIG.event}/events/${id}/feedback/${feedbackId}`,
        { rating: Number(editRating), comment: editComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Review updated successfully');
      setEditingFeedbackId(null);
      fetchFeedback();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update review');
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_CONFIG.event}/events/${id}/feedback/${feedbackId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Review deleted successfully');
      setShowDeleteConfirm(null);
      fetchFeedback();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete review');
    }
  };

  const renderBookingSection = () => {
    if (event.availableSeats > 0) {
      return (
        <div className="booking-section">
          <label>Number of tickets:</label>
          <input
            type="number"
            min="1"
            max={Math.min(event.availableSeats, 10)}
            value={tickets}
            onChange={(e) => setTickets(parseInt(e.target.value) || 1)}
          />
          <p className="total">Total: ${event.price * tickets}</p>
          <button
            onClick={handleBooking}
            className="btn btn-primary"
            disabled={booking}
          >
            {booking ? 'Booking...' : 'Book Now'}
          </button>
        </div>
      );
    }

    return (
      <div className="booking-section waitlist-section">
        <p className="sold-out">This event is currently full.</p>
        <div className="waitlist-form">
          <label>Number of tickets:</label>
          <input
            type="number"
            min="1"
            max={10}
            value={tickets}
            onChange={(e) => setTickets(parseInt(e.target.value) || 1)}
          />
          <button
            onClick={handleBooking}
            className="btn btn-secondary"
            disabled={booking}
          >
            {booking ? 'Submitting...' : 'Join Waitlist'}
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading">Loading event...</div>;
  if (!event) return <div>Event not found</div>;

  return (
    <div className="event-detail">
      <img src={event.imageUrl} alt={event.title} className="event-detail-image" />
      <div className="event-detail-content">
        <h1>{event.title}</h1>
        <span className="event-category">{event.category}</span>
        <p className="event-description">{event.description}</p>

        <div className="event-details">
          <div className="detail-item">
            <strong>Date:</strong> {new Date(event.date).toLocaleDateString()}
          </div>
          <div className="detail-item">
            <strong>Time:</strong> {event.time}
          </div>
          <div className="detail-item">
            <strong>Venue:</strong> {event.venue}
          </div>
          <div className="detail-item">
            <strong>Organizer:</strong> {event.organizer}
          </div>
          <div className="detail-item">
            <strong>Price:</strong> ${event.price} per ticket
          </div>
          <div className="detail-item">
            <strong>Available Seats:</strong> {event.availableSeats} / {event.capacity}
          </div>
          <div className="detail-item">
            <strong>Average Rating:</strong> {feedbackStats.averageRating.toFixed(2)} ({feedbackStats.total} reviews)
          </div>
        </div>

        {renderBookingSection()}

        {message && (
          <div className={message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') ? 'error' : 'success'}>
            {message}
          </div>
        )}

        <div className="feedback-section">
          <h2 className="feedback-title">Reviews & Ratings</h2>
          
          <div className="feedback-summary-card">
            <div className="rating-overview">
              <div className="rating-score">
                <span className="score-number">{feedbackStats.averageRating.toFixed(1)}</span>
                <div className="stars-display">
                  {[1,2,3,4,5].map(star => (
                    <span key={star} className={star <= Math.round(feedbackStats.averageRating) ? 'star filled' : 'star'}>★</span>
                  ))}
                </div>
                <span className="total-reviews">{feedbackStats.total} {feedbackStats.total === 1 ? 'review' : 'reviews'}</span>
              </div>
              
              <div className="rating-breakdown">
                {[5,4,3,2,1].map(score => {
                  const count = feedbackStats.breakdown[score] || 0;
                  const percentage = feedbackStats.total > 0 ? (count / feedbackStats.total) * 100 : 0;
                  return (
                    <div key={score} className="breakdown-row">
                      <span className="star-label">{score}★</span>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width: `${percentage}%`}}></div>
                      </div>
                      <span className="count-label">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {user && hasActiveBooking && (
            <form className="feedback-form-modern" onSubmit={handleFeedbackSubmit}>
              <h3 className="form-title">Share Your Experience</h3>
              
              <div className="rating-input-group">
                <label className="input-label">Your Rating</label>
                <div className="star-rating-input">
                  {[1,2,3,4,5].map(star => (
                    <button
                      key={star}
                      type="button"
                      className={star <= rating ? 'star-btn active' : 'star-btn'}
                      onClick={() => setRating(star)}
                    >
                      ★
                    </button>
                  ))}
                  <span className="rating-text">
                    {rating === 5 ? 'Excellent' : rating === 4 ? 'Very Good' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
                  </span>
                </div>
              </div>
              
              <div className="comment-input-group">
                <label className="input-label">Your Review</label>
                <textarea
                  className="comment-textarea"
                  value={comment}
                  placeholder="Tell us about your experience with this event..."
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  rows={4}
                />
                <span className="char-count">{comment.length}/1000</span>
              </div>
              
              <button type="submit" className="submit-feedback-btn" disabled={feedbackSubmitting}>
                {feedbackSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    Submit Review
                  </>
                )}
              </button>
              
              {feedbackMessage && (
                <div className={feedbackMessage.includes('Thank you') ? 'feedback-alert success' : 'feedback-alert error'}>
                  {feedbackMessage}
                </div>
              )}
            </form>
          )}

          {user && !checkingBooking && !hasActiveBooking && (
            <div className="no-booking-notice">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6c757d" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <h4>Book This Event to Leave a Review</h4>
              <p>Only attendees with active bookings can share their feedback.</p>
            </div>
          )}

          {!user && (
            <div className="no-booking-notice">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6c757d" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <h4>Sign In to Leave a Review</h4>
              <p>Please log in and book this event to share your feedback.</p>
            </div>
          )}

          <div className="feedback-list-modern">
            <h3 className="reviews-heading">User Reviews ({feedback.length})</h3>
            {feedback.length === 0 ? (
              <div className="no-reviews">
                <span className="empty-icon">💬</span>
                <p>No reviews yet. Be the first to share your experience!</p>
              </div>
            ) : (
              feedback.map(item => (
                <div key={item._id} className="review-card">
                  {editingFeedbackId === item._id ? (
                    // Edit Mode
                    <div className="review-edit-mode">
                      <div className="edit-header">
                        <div className="reviewer-info">
                          <div className="avatar">{item.userName.charAt(0).toUpperCase()}</div>
                          <div className="reviewer-details">
                            <strong className="reviewer-name">{item.userName}</strong>
                            <span className="review-date">Editing...</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="edit-rating">
                        <label>Rating:</label>
                        <div className="star-rating-input">
                          {[1,2,3,4,5].map(star => (
                            <button
                              key={star}
                              type="button"
                              className={star <= editRating ? 'star-btn active' : 'star-btn'}
                              onClick={() => setEditRating(star)}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <textarea
                        className="edit-comment-textarea"
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        maxLength={1000}
                        rows={4}
                        placeholder="Your review..."
                      />
                      <span className="char-count">{editComment.length}/1000</span>
                      
                      <div className="edit-actions">
                        <button 
                          className="save-edit-btn" 
                          onClick={() => handleUpdateFeedback(item._id)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Save
                        </button>
                        <button 
                          className="cancel-edit-btn" 
                          onClick={handleCancelEdit}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="review-header">
                        <div className="reviewer-info">
                          <div className="avatar">{item.userName.charAt(0).toUpperCase()}</div>
                          <div className="reviewer-details">
                            <strong className="reviewer-name">{item.userName}</strong>
                            <span className="review-date">
                              {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              {item.isEdited && <span className="edited-badge"> (edited)</span>}
                            </span>
                          </div>
                        </div>
                        <div className="review-actions">
                          <div className="review-rating">
                            {[1,2,3,4,5].map(star => (
                              <span key={star} className={star <= item.rating ? 'star filled' : 'star'}>★</span>
                            ))}
                          </div>
                          {user && user.id === item.userId && (
                            <div className="action-buttons">
                              <button 
                                className="edit-btn" 
                                onClick={() => handleEditFeedback(item)}
                                title="Edit review"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button 
                                className="delete-btn" 
                                onClick={() => setShowDeleteConfirm(item._id)}
                                title="Delete review"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {item.comment && <p className="review-comment">{item.comment}</p>}
                      
                      {showDeleteConfirm === item._id && (
                        <div className="delete-confirm">
                          <p>Are you sure you want to delete this review?</p>
                          <div className="confirm-actions">
                            <button 
                              className="confirm-delete-btn" 
                              onClick={() => handleDeleteFeedback(item._id)}
                            >
                              Yes, Delete
                            </button>
                            <button 
                              className="cancel-delete-btn" 
                              onClick={() => setShowDeleteConfirm(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="success-modal">
            <div className="success-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2>Booking Confirmed!</h2>
            <p>Your tickets have been booked successfully.</p>
            <div className="loading-spinner"></div>
            <p className="redirect-text">Redirecting to your bookings...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventDetail;
