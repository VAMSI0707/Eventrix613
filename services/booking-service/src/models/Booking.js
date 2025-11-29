const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'User ID is required']
  },
  userName: {
    type: String,
    required: [true, 'User name is required']
  },
  userEmail: {
    type: String,
    required: [true, 'User email is required']
  },
  eventId: {
    type: String,
    required: [true, 'Event ID is required']
  },
  eventTitle: {
    type: String,
    required: [true, 'Event title is required']
  },
  eventDate: {
    type: Date,
    required: [true, 'Event date is required']
  },
  eventVenue: {
    type: String,
    required: [true, 'Event venue is required']
  },
  eventTime: {
    type: String,
    required: false
  },
  numberOfTickets: {
    type: Number,
    required: [true, 'Number of tickets is required'],
    min: [1, 'Must book at least 1 ticket'],
    max: [10, 'Cannot book more than 10 tickets at once']
  },
  pricePerTicket: {
    type: Number,
    required: [true, 'Price per ticket is required'],
    min: [0, 'Price cannot be negative']
  },
  totalAmount: {
    type: Number,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet'],
    default: 'credit_card'
  },
  transactionId: {
    type: String,
    default: null
  },
  bookingStatus: {
    type: String,
    enum: ['confirmed', 'pending', 'cancelled', 'waitlisted'],
    default: 'pending'
  },
  bookingReference: {
    type: String,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate booking reference before saving
bookingSchema.pre('save', function(next) {
  if (this.isNew) {
    this.bookingReference = `BKG${Date.now()}${Math.floor(Math.random() * 1000)}`;
    this.totalAmount = this.numberOfTickets * this.pricePerTicket;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);