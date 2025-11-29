const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Feedback = require('../models/Feedback');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:4003';

// GET /api/events - Get all events (public)
router.get('/', async (req, res) => {
  try {
    const { category, search, status, sort } = req.query;
    
    let query = {};
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Sort options
    let sortOption = { date: 1 }; // default: upcoming first
    if (sort === 'price-asc') sortOption = { price: 1 };
    if (sort === 'price-desc') sortOption = { price: -1 };
    if (sort === 'date-desc') sortOption = { date: -1 };
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(query)
    ]);
    
    res.json({
      events,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Failed to fetch events', details: err.message });
  }
});

// GET /api/events/:id - Get single event (public)
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(event);
  } catch (err) {
    console.error('Get event error:', err);
    res.status(500).json({ error: 'Failed to fetch event', details: err.message });
  }
});

// POST /api/events - Create event (admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      createdBy: req.user._id
    };
    
    const event = new Event(eventData);
    await event.save();
    
    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event', details: err.message });
  }
});

// PUT /api/events/:id - Update event (admin only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({
      message: 'Event updated successfully',
      event
    });
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ error: 'Failed to update event', details: err.message });
  }
});

// DELETE /api/events/:id - Delete event (admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Cancel all bookings for this event
    try {
      await axios.patch(`${BOOKING_SERVICE_URL}/api/bookings/event/${req.params.id}/cancel-all`);
    } catch (bookingErr) {
      console.error('Failed to cancel bookings:', bookingErr.message);
      // Continue even if booking cancellation fails
    }
    
    res.json({
      message: 'Event deleted successfully',
      event
    });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'Failed to delete event', details: err.message });
  }
});

// PATCH /api/events/:id/seats - Update available seats (internal use)
router.patch('/:id/seats', async (req, res) => {
  try {
    const { seatsToBook } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (seatsToBook > 0 && event.availableSeats < seatsToBook) {
      return res.status(400).json({ error: 'Not enough seats available' });
    }

    const updatedAvailability = event.availableSeats - seatsToBook;
    event.availableSeats = Math.min(event.capacity, Math.max(0, updatedAvailability));
    await event.save();

    res.json({
      message: 'Seats updated successfully',
      availableSeats: event.availableSeats
    });
  } catch (err) {
    console.error('Update seats error:', err);
    res.status(500).json({ error: 'Failed to update seats', details: err.message });
  }
});

// POST /api/events/:id/feedback - Add feedback for an event
router.post('/:id/feedback', verifyToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    try {
      const bookingResponse = await axios.get(`${BOOKING_SERVICE_URL}/api/bookings/event/${req.params.id}/me`, {
        headers: { Authorization: req.headers.authorization }
      });
      if (!bookingResponse.data.hasBooking || bookingResponse.data.bookingStatus === 'cancelled') {
        return res.status(403).json({ error: 'Feedback is limited to attendees with active bookings' });
      }
    } catch (err) {
      return res.status(400).json({ error: 'Unable to verify booking eligibility for feedback' });
    }

    try {
      const feedback = await Feedback.create({
        eventId: event._id,
        userId: req.user._id,
        userName: req.user.name,
        rating,
        comment: comment || ''
      });

      res.status(201).json({
        message: 'Feedback submitted successfully',
        feedback
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ error: 'You have already submitted feedback for this event' });
      }
      throw err;
    }
  } catch (err) {
    console.error('Create feedback error:', err);
    res.status(500).json({ error: 'Failed to submit feedback', details: err.message });
  }
});

// GET /api/events/:id/feedback - List feedback for an event
router.get('/:id/feedback', async (req, res) => {
  try {
    const feedback = await Feedback.find({ eventId: req.params.id }).sort({ createdAt: -1 });

    const stats = await Feedback.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id: '$eventId',
          averageRating: { $avg: '$rating' },
          total: { $sum: 1 },
          ratingBreakdown: {
            $push: '$rating'
          }
        }
      }
    ]);

    const summary = stats[0] || { averageRating: 0, total: 0, ratingBreakdown: [] };
    const breakdown = [1, 2, 3, 4, 5].reduce((acc, rating) => {
      acc[rating] = summary.ratingBreakdown.filter(r => r === rating).length;
      return acc;
    }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

    res.json({
      feedback,
      stats: {
        averageRating: Number(summary.averageRating?.toFixed(2)) || 0,
        total: summary.total || 0,
        breakdown
      }
    });
  } catch (err) {
    console.error('Get feedback error:', err);
    res.status(500).json({ error: 'Failed to fetch feedback', details: err.message });
  }
});

// PUT /api/events/:id/feedback/:feedbackId - Edit feedback
router.put('/:id/feedback/:feedbackId', verifyToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const feedback = await Feedback.findById(req.params.feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    if (feedback.userId !== req.user._id) {
      return res.status(403).json({ error: 'You can only edit your own feedback' });
    }

    feedback.rating = rating;
    feedback.comment = comment || '';
    feedback.updatedAt = new Date();
    feedback.isEdited = true;
    await feedback.save();

    res.json({
      message: 'Feedback updated successfully',
      feedback
    });
  } catch (err) {
    console.error('Update feedback error:', err);
    res.status(500).json({ error: 'Failed to update feedback', details: err.message });
  }
});

// DELETE /api/events/:id/feedback/:feedbackId - Delete feedback
router.delete('/:id/feedback/:feedbackId', verifyToken, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    if (feedback.userId !== req.user._id) {
      return res.status(403).json({ error: 'You can only delete your own feedback' });
    }

    await Feedback.findByIdAndDelete(req.params.feedbackId);

    res.json({ message: 'Feedback deleted successfully' });
  } catch (err) {
    console.error('Delete feedback error:', err);
    res.status(500).json({ error: 'Failed to delete feedback', details: err.message });
  }
});

// GET /api/events/analytics - Aggregate stats for admins
router.get('/analytics/summary', verifyToken, isAdmin, async (req, res) => {
  try {
    const [totalEvents, upcoming, ongoing, completed, cancelled] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ status: 'upcoming' }),
      Event.countDocuments({ status: 'ongoing' }),
      Event.countDocuments({ status: 'completed' }),
      Event.countDocuments({ status: 'cancelled' })
    ]);

    const feedbackSummary = await Feedback.aggregate([
      {
        $group: {
          _id: '$eventId',
          averageRating: { $avg: '$rating' },
          totalFeedback: { $sum: 1 }
        }
      },
      { $sort: { averageRating: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $project: {
          eventId: '$event._id',
          title: '$event.title',
          averageRating: 1,
          totalFeedback: 1
        }
      }
    ]);

    const overallFeedback = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalFeedback: { $sum: 1 }
        }
      }
    ]);

    res.json({
      events: { totalEvents, upcoming, ongoing, completed, cancelled },
      feedback: {
        topRated: feedbackSummary,
        averageRating: Number(overallFeedback[0]?.averageRating?.toFixed(2)) || 0,
        totalFeedback: overallFeedback[0]?.totalFeedback || 0
      }
    });
  } catch (err) {
    console.error('Get event analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics', details: err.message });
  }
});

module.exports = router;