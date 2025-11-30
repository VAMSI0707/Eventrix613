const request = require('supertest');
const express = require('express');

jest.mock('axios', () => ({
  get: jest.fn(),
  patch: jest.fn()
}));

jest.mock('../../middleware/auth', () => ({
  verifyToken: (req, res, next) => {
    const role = req.headers['x-test-role'] || 'user';
    req.user = {
      _id: 'user1',
      name: 'Test User',
      email: 'user@example.com',
      role
    };
    next();
  }
}));

jest.mock('../../utils/email', () => ({
  sendBookingEmail: jest.fn().mockResolvedValue(),
  sendWaitlistEmail: jest.fn().mockResolvedValue()
}));

jest.mock('../../models/Booking', () => {
  const bookings = [];

  function matches(query, doc) {
    if (!query) return true;
    for (const key of Object.keys(query)) {
      const value = query[key];
      if (key === 'bookingStatus' && value && typeof value === 'object' && '$ne' in value) {
        if (doc.bookingStatus === value.$ne) return false;
      } else if (doc[key] !== value) {
        return false;
      }
    }
    return true;
  }

  const Booking = function (data) {
    Object.assign(this, data);
    this._id = this._id || `b${bookings.length + 1}`;
  };

  Booking.__reset = () => {
    bookings.length = 0;
  };

  Booking.__getAll = () => bookings;

  Booking.prototype.save = jest.fn(async function () {
    const idx = bookings.findIndex(b => b._id === this._id);
    if (idx === -1) {
      bookings.push(this);
    } else {
      bookings[idx] = this;
    }
    return this;
  });

  Booking.find = jest.fn(query => {
    const filtered = bookings.filter(b => matches(query, b));

    const wrapper = {
      sort: jest.fn().mockResolvedValue(filtered),
      then: (resolve, reject) => Promise.resolve(filtered).then(resolve, reject)
    };

    return wrapper;
  });

  Booking.findOne = jest.fn(async query => {
    const res = await Booking.find(query);
    return res[0] || null;
  });

  Booking.findById = jest.fn(async id => bookings.find(b => b._id === id) || null);

  Booking.aggregate = jest.fn(async () => [{ _id: 'event1', count: 2 }]);

  Booking.updateMany = jest.fn(async () => ({ modifiedCount: 3 }));

  return Booking;
});

const axios = require('axios');
const Booking = require('../../models/Booking');
const bookingsRouter = require('../bookings');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/bookings', bookingsRouter);
  return app;
};

const buildFutureEvent = overrides => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return {
    _id: 'event1',
    title: 'Sample Event',
    date: d.toISOString(),
    venue: 'Hall A',
    time: '10:00',
    status: 'published',
    availableSeats: 10,
    price: 20,
    ...overrides
  };
};

describe('Booking routes', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    Booking.__reset();
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (console.error.mockRestore) {
      console.error.mockRestore();
    }
  });

  test('creates confirmed booking when seats available and payment succeeds', async () => {
    const realRandom = Math.random;
    Math.random = () => 0.9;

    axios.get.mockResolvedValueOnce({ data: buildFutureEvent({ availableSeats: 10 }) });
    axios.patch.mockResolvedValueOnce({ data: { availableSeats: 8 } });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer token')
      .send({ eventId: 'event1', numberOfTickets: 2, paymentMethod: 'credit_card' });

    expect(res.status).toBe(201);
    expect(res.body.booking.bookingStatus).toBe('confirmed');
    expect(axios.patch).toHaveBeenCalled();

    Math.random = realRandom;
  });

  test('adds booking to waitlist when event is full and joinWaitlist is true', async () => {
    const futureEvent = buildFutureEvent({ availableSeats: 1 });
    axios.get.mockResolvedValueOnce({ data: futureEvent });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer token')
      .send({ eventId: 'event1', numberOfTickets: 2, joinWaitlist: true });

    expect(res.status).toBe(202);
    expect(res.body.booking.bookingStatus).toBe('waitlisted');
  });

  test('rejects booking when event is full and user does not join waitlist', async () => {
    const futureEvent = buildFutureEvent({ availableSeats: 1 });
    axios.get.mockResolvedValueOnce({ data: futureEvent });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer token')
      .send({ eventId: 'event1', numberOfTickets: 2, joinWaitlist: false });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Not enough seats available');
  });

  test('rejects booking for cancelled event', async () => {
    const cancelledEvent = buildFutureEvent({ status: 'cancelled' });
    axios.get.mockResolvedValueOnce({ data: cancelledEvent });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer token')
      .send({ eventId: 'event1', numberOfTickets: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Event has been cancelled');
  });

  test('rejects booking for past event', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const pastEvent = buildFutureEvent({ date: pastDate.toISOString() });
    axios.get.mockResolvedValueOnce({ data: pastEvent });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer token')
      .send({ eventId: 'event1', numberOfTickets: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cannot book tickets for past events');
  });

  test('returns 404 when event service reports event not found', async () => {
    const error = new Error('Not found');
    error.response = { status: 404 };
    axios.get.mockRejectedValueOnce(error);

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer token')
      .send({ eventId: 'missing', numberOfTickets: 1 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Event not found');
  });

  test('lists bookings for current user', async () => {
    const booking = new Booking({
      userId: 'user1',
      userName: 'Test User',
      userEmail: 'user@example.com',
      eventId: 'event1',
      eventTitle: 'Event',
      eventDate: new Date(),
      eventVenue: 'Hall A',
      numberOfTickets: 2,
      pricePerTicket: 10,
      bookingStatus: 'confirmed',
      paymentStatus: 'completed'
    });
    await booking.save();

    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  test('checks if user has booking for event', async () => {
    const booking = new Booking({
      userId: 'user1',
      userName: 'Test User',
      userEmail: 'user@example.com',
      eventId: 'event1',
      eventTitle: 'Event',
      eventDate: new Date(),
      eventVenue: 'Hall A',
      numberOfTickets: 1,
      pricePerTicket: 10,
      bookingStatus: 'confirmed',
      paymentStatus: 'completed'
    });
    await booking.save();

    const res = await request(app)
      .get('/api/bookings/event/event1/me')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.hasBooking).toBe(true);
  });

  test('returns false when user has no booking for event', async () => {
    const res = await request(app)
      .get('/api/bookings/event/event1/me')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.hasBooking).toBe(false);
  });

  test('denies analytics for non-admin user', async () => {
    const res = await request(app)
      .get('/api/bookings/analytics')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(403);
  });

  test('returns analytics for admin user', async () => {
    const booking = new Booking({
      userId: 'user1',
      userName: 'Test User',
      userEmail: 'user@example.com',
      eventId: 'event1',
      eventTitle: 'Event',
      eventDate: new Date(),
      eventVenue: 'Hall A',
      numberOfTickets: 2,
      pricePerTicket: 10,
      bookingStatus: 'confirmed',
      paymentStatus: 'completed'
    });
    await booking.save();

    axios.get.mockResolvedValueOnce({ data: { title: 'Sample Event' } });

    const res = await request(app)
      .get('/api/bookings/analytics')
      .set('Authorization', 'Bearer token')
      .set('x-test-role', 'admin');

    expect(res.status).toBe(200);
    expect(res.body.stats.totalBookings).toBe(1);
  });

  test('cancels a confirmed future booking and triggers seat restore call', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const booking = new Booking({
      userId: 'user1',
      userName: 'Test User',
      userEmail: 'user@example.com',
      eventId: 'event1',
      eventTitle: 'Event',
      eventDate: futureDate,
      eventVenue: 'Hall A',
      numberOfTickets: 2,
      pricePerTicket: 10,
      bookingStatus: 'confirmed',
      paymentStatus: 'completed'
    });
    await booking.save();

    axios.patch.mockResolvedValueOnce({ data: { availableSeats: 10 } });

    const res = await request(app)
      .patch(`/api/bookings/${booking._id}/cancel`)
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.booking.bookingStatus).toBe('cancelled');
    expect(axios.patch).toHaveBeenCalled();
  });

  test('returns bookings and stats for event for admin', async () => {
    const booking = new Booking({
      userId: 'user1',
      userName: 'Test User',
      userEmail: 'user@example.com',
      eventId: 'event1',
      eventTitle: 'Event',
      eventDate: new Date(),
      eventVenue: 'Hall A',
      numberOfTickets: 2,
      pricePerTicket: 10,
      bookingStatus: 'confirmed',
      paymentStatus: 'completed'
    });
    await booking.save();

    const res = await request(app)
      .get('/api/bookings/event/event1')
      .set('Authorization', 'Bearer token')
      .set('x-test-role', 'admin');

    expect(res.status).toBe(200);
    expect(res.body.stats.totalBookings).toBe(1);
  });

  test('cancel-all endpoint cancels bookings for an event', async () => {
    const booking = new Booking({
      userId: 'user1',
      userName: 'Test User',
      userEmail: 'user@example.com',
      eventId: 'event1',
      eventTitle: 'Event',
      eventDate: new Date(),
      eventVenue: 'Hall A',
      numberOfTickets: 1,
      pricePerTicket: 10,
      bookingStatus: 'confirmed',
      paymentStatus: 'completed'
    });
    await booking.save();

    const res = await request(app)
      .patch('/api/bookings/event/event1/cancel-all')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  test('sync endpoint updates bookings metadata', async () => {
    const booking = new Booking({
      userId: 'user1',
      userName: 'Test User',
      userEmail: 'user@example.com',
      eventId: 'event1',
      eventTitle: 'Old Title',
      eventDate: new Date(),
      eventVenue: 'Old Venue',
      eventTime: '09:00',
      numberOfTickets: 1,
      pricePerTicket: 10,
      bookingStatus: 'confirmed',
      paymentStatus: 'completed'
    });
    await booking.save();

    const res = await request(app)
      .patch('/api/bookings/event/event1/sync')
      .set('Authorization', 'Bearer token')
      .send({
        eventTitle: 'New Title',
        eventDate: new Date(),
        eventVenue: 'New Venue',
        eventTime: '11:00'
      });

    expect(res.status).toBe(200);
    expect(res.body.modifiedCount).toBe(3);
  });

  test('returns 400 when eventId or numberOfTickets is missing', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer token')
      .send({ numberOfTickets: 2 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Event ID and number of tickets are required');
  });

  test('handles payment failure and stores pending booking', async () => {
    const realRandom = Math.random;
    Math.random = () => 0.01;

    axios.get.mockResolvedValueOnce({ data: buildFutureEvent({ availableSeats: 10 }) });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer token')
      .send({ eventId: 'event1', numberOfTickets: 2, paymentMethod: 'credit_card' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Payment failed. Please try again.');

    Math.random = realRandom;
  });

  test('returns 500 when updating event seats fails', async () => {
    const realRandom = Math.random;
    Math.random = () => 0.9;

    axios.get.mockResolvedValueOnce({ data: buildFutureEvent({ availableSeats: 10 }) });
    const error = new Error('Seat update failed');
    error.response = { data: { message: 'Seat update failed' } };
    axios.patch.mockRejectedValueOnce(error);

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer token')
      .send({ eventId: 'event1', numberOfTickets: 1 });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to update event seats');

    Math.random = realRandom;
  });

  test('returns 404 when booking by id is not found', async () => {
    const res = await request(app)
      .get('/api/bookings/nonexistent-id')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Booking not found');
  });

  test('returns 404 when booking by reference is not found', async () => {
    const res = await request(app)
      .get('/api/bookings/reference/UNKNOWN')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Booking not found');
  });

  test('returns 403 when booking by reference belongs to another user', async () => {
  const booking = new Booking({
    userId: 'other-user',
    userName: 'Other User',
    userEmail: 'other@example.com',
    eventId: 'event1',
    eventTitle: 'Event',
    eventDate: new Date(),
    eventVenue: 'Hall A',
    numberOfTickets: 1,
    pricePerTicket: 10,
    bookingStatus: 'confirmed',
    paymentStatus: 'completed',
    bookingReference: 'REF-123'
  });
  await booking.save();

  const res = await request(app)
    .get('/api/bookings/reference/REF-123')
    .set('Authorization', 'Bearer token');

  expect(res.status).toBe(403);
  expect(res.body.error).toBe('Access denied');
});


  test('rejects cancel request for already cancelled booking', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const booking = new Booking({
      userId: 'user1',
      userName: 'Test User',
      userEmail: 'user@example.com',
      eventId: 'event1',
      eventTitle: 'Event',
      eventDate: futureDate,
      eventVenue: 'Hall A',
      numberOfTickets: 1,
      pricePerTicket: 10,
      bookingStatus: 'cancelled',
      paymentStatus: 'refunded'
    });
    await booking.save();

    const res = await request(app)
      .patch(`/api/bookings/${booking._id}/cancel`)
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Booking is already cancelled');
  });

  test('rejects cancel request for past event', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const booking = new Booking({
      userId: 'user1',
      userName: 'Test User',
      userEmail: 'user@example.com',
      eventId: 'event1',
      eventTitle: 'Event',
      eventDate: pastDate,
      eventVenue: 'Hall A',
      numberOfTickets: 1,
      pricePerTicket: 10,
      bookingStatus: 'confirmed',
      paymentStatus: 'completed'
    });
    await booking.save();

    const res = await request(app)
      .patch(`/api/bookings/${booking._id}/cancel`)
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cannot cancel booking for past events');
  });
});
