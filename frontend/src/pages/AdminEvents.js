import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_CONFIG from '../config/api';
import './AdminEvents.css';

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

function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEventId, setDeleteEventId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'conference',
    venue: '',
    date: '',
    time: '',
    capacity: '',
    price: '',
    organizer: '',
    imageUrl: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API_CONFIG.event}/events`);
      setEvents(response.data.events);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title || formData.title.length < 3) {
      toast.error('Event title must be at least 3 characters');
      return;
    }

    if (!formData.description || formData.description.length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }

    if (!formData.venue || formData.venue.length < 3) {
      toast.error('Venue must be at least 3 characters');
      return;
    }

    if (!formData.date) {
      toast.error('Please select an event date');
      return;
    }

    const selectedDate = new Date(formData.date);
    if (selectedDate <= new Date()) {
      toast.error('Event date must be in the future');
      return;
    }

    if (!formData.time) {
      toast.error('Please select an event time');
      return;
    }

    if (!formData.capacity || formData.capacity < 1) {
      toast.error('Capacity must be at least 1');
      return;
    }

    if (!formData.price || formData.price < 0) {
      toast.error('Price cannot be negative');
      return;
    }

    if (!formData.organizer || formData.organizer.length < 3) {
      toast.error('Organizer name must be at least 3 characters');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Category-specific placeholder images
      const categoryImages = {
        conference: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
        workshop: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
        seminar: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=600&fit=crop',
        concert: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop',
        sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop',
        festival: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop',
        other: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop'
      };
      
      // Add default image based on category if none provided
      const eventData = {
        ...formData,
        imageUrl: formData.imageUrl || categoryImages[formData.category] || categoryImages.other
      };
      
      if (editingEventId) {
        // Update existing event
        await axios.put(
          `${API_CONFIG.event}/events/${editingEventId}`,
          eventData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Event updated successfully!');
      } else {
        // Create new event
        await axios.post(
          `${API_CONFIG.event}/events`,
          eventData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Event created successfully!');
      }
      
      setShowForm(false);
      setEditingEventId(null);
      fetchEvents();
      setFormData({
        title: '',
        description: '',
        category: 'conference',
        venue: '',
        date: '',
        time: '',
        capacity: '',
        price: '',
        organizer: '',
        imageUrl: ''
      });
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${editingEventId ? 'update' : 'create'} event`);
    }
  };

  const convertTo24Hour = (timeStr) => {
    // If already in 24-hour format (HH:MM), return as is
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }
    
    // Convert 12-hour format to 24-hour format
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let [, hours, minutes, period] = match;
      hours = parseInt(hours);
      
      if (period.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    
    return timeStr;
  };

  const handleEdit = (event) => {
    setEditingEventId(event._id);
    setFormData({
      title: event.title,
      description: event.description,
      category: event.category,
      venue: event.venue,
      date: event.date.split('T')[0], // Format date for input
      time: convertTo24Hour(event.time), // Convert time to 24-hour format
      capacity: event.capacity,
      price: event.price,
      organizer: event.organizer,
      imageUrl: event.imageUrl
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setShowForm(false);
    setFormData({
      title: '',
      description: '',
      category: 'conference',
      venue: '',
      date: '',
      time: '',
      capacity: '',
      price: '',
      organizer: '',
      imageUrl: ''
    });
  };

  const showDeleteConfirmation = (id) => {
    setDeleteEventId(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteEventId) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_CONFIG.event}/events/${deleteEventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Event deleted successfully!');
      setShowDeleteModal(false);
      setDeleteEventId(null);
      fetchEvents();
    } catch (err) {
      toast.error('Failed to delete event');
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="admin-events">
      <div className="admin-header">
        <h1>Manage Events</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-create-event">
          + Create Event
        </button>
      </div>

      {/* Sliding Modal */}
      {showForm && (
        <>
          <div className="modal-backdrop" onClick={handleCancelEdit}></div>
          <div className="slide-modal">
            <div className="slide-modal-header">
              <h2>{editingEventId ? 'Edit Event' : 'Create New Event'}</h2>
              <button className="close-modal" onClick={handleCancelEdit}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="event-form">
              <div className="form-group">
                <label className="required">Event Title</label>
                <input
                  type="text"
                  placeholder="Enter event title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="required">Description</label>
                <textarea
                  placeholder="Enter event description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="required">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  required
                >
                  <option value="conference">Conference</option>
                  <option value="workshop">Workshop</option>
                  <option value="seminar">Seminar</option>
                  <option value="concert">Concert</option>
                  <option value="sports">Sports</option>
                  <option value="festival">Festival</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="required">Venue</label>
                <input
                  type="text"
                  placeholder="Enter venue location"
                  value={formData.venue}
                  onChange={(e) => setFormData({...formData, venue: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="required">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Capacity</label>
                  <input
                    type="number"
                    placeholder="Number of seats"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                    required
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label className="required">Price ($)</label>
                  <input
                    type="number"
                    placeholder="Ticket price"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="required">Organizer</label>
                <input
                  type="text"
                  placeholder="Organizer name"
                  value={formData.organizer}
                  onChange={(e) => setFormData({...formData, organizer: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                />
                <small>Leave empty to use category default image</small>
              </div>

              <button type="submit" className="btn btn-submit-event">
                {editingEventId ? 'Update Event' : 'Create Event'}
              </button>
            </form>
          </div>
        </>
      )}

      <div className="events-table">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Time</th>
              <th>Venue</th>
              <th>Capacity</th>
              <th>Available</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => (
              <tr key={event._id}>
                <td>{event.title}</td>
                <td>{new Date(event.date).toLocaleDateString()}</td>
                <td>{formatTime(event.time)}</td>
                <td>{event.venue}</td>
                <td>{event.capacity}</td>
                <td>{event.availableSeats}</td>
                <td>${event.price}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      onClick={() => handleEdit(event)}
                      className="btn btn-secondary btn-sm"
                      title="Edit event"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button 
                      onClick={() => showDeleteConfirmation(event._id)}
                      className="btn btn-danger btn-sm"
                      title="Delete event"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">⚠️</div>
            <h2>Delete Event?</h2>
            <p>Are you sure you want to delete this event? This action cannot be undone and will cancel all bookings for this event.</p>
            <div className="delete-modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminEvents;
