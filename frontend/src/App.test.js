import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { toast } from 'react-toastify';

import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import MyBookings from './pages/MyBookings';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminEvents from './pages/AdminEvents';
import Analytics from './pages/Analytics';

jest.mock('axios');

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
  ToastContainer: () => <div data-testid="toast-container" />,
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

const qrcode = require('qrcode');

window.scrollTo = jest.fn();
window.alert = jest.fn();

const originalWarn = console.warn;
const originalError = console.error;
beforeAll(() => {
  console.warn = (...args) => {
    if (args[0] && args[0].includes('React Router')) return;
    originalWarn(...args);
  };
  console.error = (...args) => {
    if (args[0] && (
      args[0].includes('wrapped in act') || 
      args[0].includes('NaN') || 
      args[0].includes('attribute')
    )) return;
    originalError(...args);
  };
});
afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

const mockUser = {
  id: 'user123',
  name: 'Test User',
  email: 'test@umd.edu',
  role: 'user',
};

const mockAdmin = {
  id: 'admin123',
  name: 'Admin User',
  role: 'admin',
};

const mockEvent = {
  _id: 'evt1',
  title: 'Test Event 1',
  description: 'A great description for a test event.',
  category: 'workshop',
  date: '2025-12-25T10:00:00.000Z',
  time: '14:00',
  venue: 'Test Venue',
  price: 10,
  availableSeats: 50,
  capacity: 100,
  organizer: 'Test Org',
  imageUrl: 'http://test.com/image.jpg',
};

const mockBooking = {
  _id: 'bk1',
  eventTitle: 'Test Event 1',
  bookingStatus: 'confirmed',
  bookingReference: 'REF123',
  eventDate: '2025-12-25',
  numberOfTickets: 2,
  totalAmount: 20,
  paymentStatus: 'completed',
  eventId: 'evt1',
  userEmail: 'test@umd.edu',
  eventVenue: 'Test Venue',
  eventTime: '14:00'
};

const mockFeedback = {
  _id: 'fb1',
  userId: 'user123',
  userName: 'Test User',
  rating: 5,
  comment: 'Great!',
  createdAt: '2025-01-01T12:00:00.000Z',
  isEdited: false
};

const renderWithRouter = (ui, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="*" element={ui} />
        <Route path="/events/:id" element={ui} /> 
      </Routes>
    </MemoryRouter>
  );
};

describe('Eventrix Application Unit Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    qrcode.toDataURL.mockResolvedValue('data:image/png;base64,mockQRCode');
  });

  describe('Navbar Component', () => {
    test('renders guest links when no user is logged in', () => {
      renderWithRouter(<Navbar user={null} onLogout={jest.fn()} />);
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Register')).toBeInTheDocument();
    });

    test('renders user links when user is logged in', () => {
      renderWithRouter(<Navbar user={mockUser} onLogout={jest.fn()} />);
      expect(screen.getByText(`Hi, ${mockUser.name}`)).toBeInTheDocument();
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
    });

    test('renders admin links when admin is logged in', () => {
      renderWithRouter(<Navbar user={mockAdmin} onLogout={jest.fn()} />);
      expect(screen.getByText('Manage Events')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });

    test('calls onLogout when logout button is clicked', () => {
      const logoutMock = jest.fn();
      renderWithRouter(<Navbar user={mockUser} onLogout={logoutMock} />);
      fireEvent.click(screen.getByText('Logout'));
      expect(logoutMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Authentication', () => {
    test('Login handles success', async () => {
      jest.useFakeTimers();
      const onLoginMock = jest.fn();
      axios.post.mockResolvedValueOnce({ data: { token: 't', user: mockUser } });

      renderWithRouter(<Login onLogin={onLoginMock} />);
      fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@test.com' } });
      fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'pass123' } });
      
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Login/i }));
      });

      act(() => { jest.advanceTimersByTime(1000); });
      await waitFor(() => expect(onLoginMock).toHaveBeenCalled());
      jest.useRealTimers();
    });

    test('Login handles error', async () => {
      axios.post.mockRejectedValueOnce({ response: { data: { error: 'Bad creds' } } });
      renderWithRouter(<Login onLogin={jest.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: /Login/i }));
      await waitFor(() => expect(screen.getByText('Bad creds')).toBeInTheDocument());
    });

    test('Register validates UMD email', async () => {
      renderWithRouter(<Register onLogin={jest.fn()} />);
      fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'bad@gmail.com' } });
      fireEvent.click(screen.getByRole('button', { name: /Register/i }));
      expect(await screen.findByText('Only @umd.edu email addresses are allowed')).toBeInTheDocument();
    });

    test('Register validates password length', async () => {
      renderWithRouter(<Register onLogin={jest.fn()} />);
      fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'test@umd.edu' } });
      fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: '123' } });
      fireEvent.click(screen.getByRole('button', { name: /Register/i }));
      expect(await screen.findByText('Password must be at least 6 characters long')).toBeInTheDocument();
    });

    test('Register handles success', async () => {
      jest.useFakeTimers();
      const onLoginMock = jest.fn();
      axios.post.mockResolvedValueOnce({ data: { token: 't', user: mockUser } });
      renderWithRouter(<Register onLogin={onLoginMock} />);
      
      fireEvent.change(screen.getByPlaceholderText(/Full Name/i), { target: { value: 'User' } });
      fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'test@umd.edu' } });
      fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: '123456' } });
      
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Register/i }));
      });
      
      act(() => { jest.advanceTimersByTime(1000); });
      await waitFor(() => expect(onLoginMock).toHaveBeenCalled());
      jest.useRealTimers();
    });
  });

  describe('Events Page', () => {
    test('fetches and displays events', async () => {
      axios.get.mockResolvedValueOnce({ data: { events: [mockEvent] } });
      renderWithRouter(<Events />);
      await waitFor(() => expect(screen.queryByText(/Loading events/i)).not.toBeInTheDocument());
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      expect(screen.getByText(/2:00 PM/i)).toBeInTheDocument();
    });

    test('filters events by category', async () => {
      axios.get.mockResolvedValue({ data: { events: [mockEvent] } });
      renderWithRouter(<Events />);
      
      await waitFor(() => expect(screen.queryByText(/Loading events/i)).not.toBeInTheDocument());
      
      const select = screen.getByRole('combobox'); 
      fireEvent.change(select, { target: { value: 'workshop' } });
      expect(select.value).toBe('workshop');
      
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('category=workshop'));
      });
    });

    test('clears search', async () => {
      axios.get.mockResolvedValue({ data: { events: [] } });
      renderWithRouter(<Events />);
      await waitFor(() => expect(screen.queryByText(/Loading/)).not.toBeInTheDocument());
      
      const input = screen.getByPlaceholderText(/Search/i);
      fireEvent.change(input, { target: { value: 'test' } });
      expect(input.value).toBe('test');
      
      const clearBtn = screen.getByLabelText('Clear search');
      fireEvent.click(clearBtn);
      expect(input.value).toBe('');
    });
  });

  describe('Event Detail Page', () => {
    test('renders details and allows booking', async () => {
      axios.get.mockImplementation((url) => {
        if(url.includes('feedback')) return Promise.resolve({ data: { feedback: [], stats: { averageRating: 0, total: 0, breakdown: {} } } });
        if(url.includes('bookings')) return Promise.resolve({ data: { hasBooking: false } });
        return Promise.resolve({ data: mockEvent });
      });
      axios.post.mockResolvedValueOnce({ data: { booking: { bookingStatus: 'confirmed' } } });

      renderWithRouter(<EventDetail user={mockUser} />, { route: `/events/${mockEvent._id}` });
      await waitFor(() => screen.getByText('Test Event 1'));

      fireEvent.click(screen.getByText('Book Now'));
      await waitFor(() => expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument());
    });

    test('redirects to login if booking without user', async () => {
        axios.get.mockImplementation((url) => {
            if(url.includes('feedback')) return Promise.resolve({ data: { feedback: [], stats: { averageRating: 0, total: 0, breakdown: {} } } });
            if(url.includes('bookings')) return Promise.resolve({ data: { hasBooking: false } });
            return Promise.resolve({ data: mockEvent });
        });
        
        renderWithRouter(<EventDetail user={null} />, { route: `/events/${mockEvent._id}` });
        
        await waitFor(() => screen.getByText('Book Now'));
        fireEvent.click(screen.getByText('Book Now'));
        
        expect(toast.info).toHaveBeenCalledWith('Please login to book tickets');
    });

    test('validates ticket quantity', async () => {
        axios.get.mockImplementation((url) => {
            if(url.includes('feedback')) return Promise.resolve({ data: { feedback: [], stats: { averageRating: 0, total: 0, breakdown: {} } } });
            if(url.includes('bookings')) return Promise.resolve({ data: { hasBooking: false } });
            return Promise.resolve({ data: mockEvent });
        });

        renderWithRouter(<EventDetail user={mockUser} />, { route: `/events/${mockEvent._id}` });
        await waitFor(() => screen.getByText('Book Now'));

        const input = screen.getByRole('spinbutton');
        fireEvent.change(input, { target: { value: '11' } });
        fireEvent.click(screen.getByText('Book Now'));
        
        expect(toast.error).toHaveBeenCalledWith('Please select between 1 and 10 tickets');
    });

    test('handles waitlist booking', async () => {
        const soldOutEvent = { ...mockEvent, availableSeats: 0 };
        axios.get.mockImplementation((url) => {
            if(url.includes('feedback')) return Promise.resolve({ data: { feedback: [], stats: { averageRating: 0, total: 0, breakdown: {} } } });
            if(url.includes('bookings')) return Promise.resolve({ data: { hasBooking: false } });
            return Promise.resolve({ data: soldOutEvent });
        });
        axios.post.mockResolvedValueOnce({ data: { booking: { bookingStatus: 'waitlisted' } } });

        renderWithRouter(<EventDetail user={mockUser} />, { route: `/events/${soldOutEvent._id}` });
        await waitFor(() => screen.getByText('Join Waitlist'));
        
        fireEvent.click(screen.getByText('Join Waitlist'));
        await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('added to the waitlist')));
    });

    test('feedback full lifecycle (Create, Edit, Cancel Edit, Delete)', async () => {
        axios.get.mockImplementation((url) => {
            if(url.includes('feedback')) return Promise.resolve({ data: { feedback: [mockFeedback], stats: { averageRating: 5, total: 1, breakdown: {} } } });
            if(url.includes('bookings')) return Promise.resolve({ data: { hasBooking: true, bookingStatus: 'confirmed' } });
            return Promise.resolve({ data: mockEvent });
        });
        axios.put.mockResolvedValue({ data: {} });
        axios.delete.mockResolvedValue({ data: {} });

        renderWithRouter(<EventDetail user={mockUser} />, { route: `/events/${mockEvent._id}` });
        
        await waitFor(() => screen.getByTitle('Edit review'));
        
        fireEvent.click(screen.getByTitle('Edit review'));
        expect(screen.getByText('Save')).toBeInTheDocument();
        
        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.queryByText('Save')).not.toBeInTheDocument();
        
        fireEvent.click(screen.getByTitle('Edit review'));
        fireEvent.click(screen.getByText('Save'));
        await waitFor(() => expect(axios.put).toHaveBeenCalled());
        
        await waitFor(() => expect(screen.queryByText('Save')).not.toBeInTheDocument());

        fireEvent.click(screen.getByTitle('Delete review'));
        expect(screen.getByText('Are you sure you want to delete this review?')).toBeInTheDocument();
        
        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.queryByText('Are you sure you want to delete this review?')).not.toBeInTheDocument();
        
        fireEvent.click(screen.getByTitle('Delete review'));
        fireEvent.click(screen.getByText('Yes, Delete'));
        await waitFor(() => expect(axios.delete).toHaveBeenCalled());
    });
    
    test('submits feedback successfully', async () => {
        axios.get.mockImplementation((url) => {
            if(url.includes('feedback')) return Promise.resolve({ data: { feedback: [], stats: { averageRating: 0, total: 0, breakdown: {} } } });
            if(url.includes('bookings')) return Promise.resolve({ data: { hasBooking: true, bookingStatus: 'confirmed' } });
            return Promise.resolve({ data: mockEvent });
        });
        axios.post.mockResolvedValue({ data: {} });
        
        renderWithRouter(<EventDetail user={mockUser} />, { route: `/events/${mockEvent._id}` });
        await waitFor(() => screen.getByText('Share Your Experience'));
        
        fireEvent.change(screen.getByPlaceholderText(/Tell us about/i), { target: { value: 'Cool' } });
        fireEvent.click(screen.getByText('Submit Review'));
        
        await waitFor(() => expect(screen.getByText('Thank you for sharing your feedback!')).toBeInTheDocument());
    });
  });

  describe('My Bookings Page', () => {
    test('renders bookings with various statuses and handles time format', async () => {
        const bookings = [
            { ...mockBooking, _id: '1', bookingStatus: 'confirmed', paymentStatus: 'refunded', eventTime: '13:00' },
            { ...mockBooking, _id: '2', bookingStatus: 'waitlisted', paymentStatus: 'pending', eventTime: '00:00' },
            { ...mockBooking, _id: '3', bookingStatus: 'cancelled' }
        ];
        axios.get.mockResolvedValueOnce({ data: { bookings } });
        
        renderWithRouter(<MyBookings user={mockUser} />);
        
        await waitFor(() => {
            expect(screen.getByText(/Refunded/)).toBeInTheDocument();
            expect(screen.getByText('pending')).toBeInTheDocument();
        });
    });

    test('opens cancel modal and confirms', async () => {
      axios.get.mockResolvedValueOnce({ data: { bookings: [mockBooking] } });
      axios.patch.mockResolvedValueOnce({ data: {} });

      renderWithRouter(<MyBookings user={mockUser} />);
      await waitFor(() => screen.getByText('Cancel Booking'));
      
      fireEvent.click(screen.getByText('Cancel Booking'));
      expect(await screen.findByText(/Are you sure you want to cancel/i)).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Yes, Cancel'));
      await waitFor(() => expect(axios.patch).toHaveBeenCalled());
    });

    test('handles QR code generation error', async () => {
        axios.get.mockResolvedValueOnce({ data: { bookings: [mockBooking] } });
        qrcode.toDataURL.mockRejectedValue(new Error('QR Fail'));

        renderWithRouter(<MyBookings user={mockUser} />);
        await waitFor(() => screen.getByText('Show QR Code'));
        
        fireEvent.click(screen.getByText('Show QR Code'));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to generate QR code'));
    });
  });

  describe('Admin Analytics', () => {
    test('renders stats and handles no data', async () => {
        axios.get.mockImplementation((url) => {
            if(url.includes('events')) return Promise.resolve({ data: { events: { totalEvents: 0, upcoming: 0, ongoing: 0, completed: 0 }, feedback: { averageRating: 0, topRated: [] } } });
            return Promise.resolve({ data: { stats: { totalRevenue: 0, totalBookings: 0 }, waitlistByEvent: [] } });
        });
        renderWithRouter(<AdminAnalytics />);
        await waitFor(() => expect(screen.getByText('No event data available')).toBeInTheDocument());
    });
  });

  describe('Admin Events Page', () => {
    test('renders event list', async () => {
        axios.get.mockResolvedValueOnce({ data: { events: [mockEvent] } });
        renderWithRouter(<AdminEvents />);
        await waitFor(() => expect(screen.getByText('Test Event 1')).toBeInTheDocument());
    });

    test('validates form fields exhaustively', async () => {
        axios.get.mockResolvedValue({ data: { events: [] } });
        renderWithRouter(<AdminEvents />);
        
        await waitFor(() => screen.getByText('+ Create Event'));
        fireEvent.click(screen.getByText('+ Create Event'));
        
        const submitBtn = screen.getByText('Create Event', { selector: 'button' });
        
        fireEvent.click(submitBtn);
        expect(toast.error).toHaveBeenCalledWith('Event title must be at least 3 characters');
        
        fireEvent.change(screen.getByPlaceholderText('Enter event title'), { target: { value: 'Valid Title' } });
        fireEvent.change(screen.getByPlaceholderText('Enter event description'), { target: { value: 'Short' } });
        fireEvent.click(submitBtn);
        expect(toast.error).toHaveBeenCalledWith('Description must be at least 10 characters');
        
        fireEvent.change(screen.getByPlaceholderText('Enter event description'), { target: { value: 'Long enough description text' } });
        fireEvent.change(screen.getByPlaceholderText('Enter venue location'), { target: { value: 'V' } });
        fireEvent.click(submitBtn);
        expect(toast.error).toHaveBeenCalledWith('Venue must be at least 3 characters');
        
        fireEvent.change(screen.getByPlaceholderText('Enter venue location'), { target: { value: 'Venue' } });
        fireEvent.click(submitBtn);
        expect(toast.error).toHaveBeenCalledWith('Please select an event date');

        const dateInput = document.querySelector('input[type="date"]');
        fireEvent.change(dateInput, { target: { value: '2020-01-01' } }); 
        fireEvent.click(submitBtn);
        expect(toast.error).toHaveBeenCalledWith('Event date must be in the future');
        
        fireEvent.change(dateInput, { target: { value: '2026-01-01' } }); 
        fireEvent.click(submitBtn);
        expect(toast.error).toHaveBeenCalledWith('Please select an event time');
        
        const timeInput = document.querySelector('input[type="time"]');
        fireEvent.change(timeInput, { target: { value: '12:00' } });
        fireEvent.click(submitBtn);
        expect(toast.error).toHaveBeenCalledWith('Capacity must be at least 1');
        
        const numberInputs = document.querySelectorAll('input[type="number"]');
        fireEvent.change(numberInputs[0], { target: { value: '10' } }); 
        fireEvent.change(numberInputs[1], { target: { value: '-1' } }); 
        fireEvent.click(submitBtn);
        expect(toast.error).toHaveBeenCalledWith('Price cannot be negative');
        
        fireEvent.change(numberInputs[1], { target: { value: '10' } });
        fireEvent.click(submitBtn);
        expect(toast.error).toHaveBeenCalledWith('Organizer name must be at least 3 characters');
    });

    test('edits an event, handles cancel edit', async () => {
        axios.get.mockResolvedValue({ data: { events: [mockEvent] } });
        axios.put.mockResolvedValue({ data: {} });
        
        renderWithRouter(<AdminEvents />);
        await waitFor(() => screen.getByTitle('Edit event'));
        
        fireEvent.click(screen.getByTitle('Edit event'));
        await waitFor(() => expect(screen.getByDisplayValue('Test Event 1')).toBeInTheDocument());
        
        const closeBtn = document.querySelector('.close-modal');
        fireEvent.click(closeBtn);
        expect(screen.queryByText('Edit Event')).not.toBeInTheDocument();
        
        fireEvent.click(screen.getByTitle('Edit event'));
        fireEvent.click(screen.getByText('Update Event'));
        await waitFor(() => expect(axios.put).toHaveBeenCalled());
    });

    test('deletes an event successfully', async () => {
        axios.get.mockResolvedValue({ data: { events: [mockEvent] } });
        axios.delete.mockResolvedValue({ data: {} });

        renderWithRouter(<AdminEvents />);
        await waitFor(() => screen.getByTitle('Delete event'));
        
        fireEvent.click(screen.getByTitle('Delete event'));
        expect(await screen.findByText(/Are you sure you want to delete this event/i)).toBeInTheDocument();
        
        fireEvent.click(screen.getByText('Delete Event'));
        await waitFor(() => expect(axios.delete).toHaveBeenCalled());
    });
  });

  describe('Analytics Page (User View)', () => {
    test('fetches and displays user analytics', async () => {
        const mockAnalyticsData = {
            events: { upcoming: 5, ongoing: 2, completed: 3, cancelled: 1, totalEvents: 11 },
            feedback: { averageRating: 4.2, topRated: [], totalFeedback: 50 }
        };
        const mockBookingStatsData = {
            confirmedBookings: 20, waitlistedBookings: 5, cancelledBookings: 2,
            totalBookings: 27, totalRevenue: 1500.00, totalTicketsSold: 45,
            stats: { confirmedBookings: 20, waitlistedBookings: 5, cancelledBookings: 2, totalRevenue: 1500 }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes('events/analytics')) return Promise.resolve({ data: mockAnalyticsData });
            if (url.includes('bookings/analytics')) return Promise.resolve({ data: mockBookingStatsData });
            return Promise.reject(new Error('Unknown URL'));
        });

        renderWithRouter(<Analytics />);
        
        await waitFor(() => expect(screen.getByText('Total Events')).toBeInTheDocument());
        expect(screen.getByText('11')).toBeInTheDocument();
        expect(screen.getByText('$1500.00')).toBeInTheDocument();
    });

    test('handles fetch error/no data', async () => {
        axios.get.mockRejectedValue(new Error('API Error'));
        renderWithRouter(<Analytics />);
        await waitFor(() => expect(screen.getByText('No data available')).toBeInTheDocument());
    });
  });
});