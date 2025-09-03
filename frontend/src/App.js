import React, { useState, useEffect, createContext, useContext } from 'react';
import './App.css';

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// API Base URL
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// API Helper
const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...options,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'API request failed');
    }
    
    return response.json();
  },

  get: (endpoint) => api.request(endpoint),
  post: (endpoint, data) => api.request(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  put: (endpoint, data) => api.request(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (endpoint) => api.request(endpoint, { method: 'DELETE' }),
};

// PayPal Integration Component
const PayPalButton = ({ amount, orderId, onSuccess, onError }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      // Simulate PayPal payment
      const paypalOrderId = `PAYPAL_${Date.now()}`;
      await api.post(`/api/payments/${orderId}/complete?paypal_order_id=${paypalOrderId}`);
      onSuccess();
    } catch (error) {
      onError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={isLoading}
      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {isLoading ? 'Processing...' : `Pay $${amount} with PayPal`}
    </button>
  );
};

// Auth Components
const LoginForm = ({ onSuccess, switchToRegister }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/login', formData);
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      onSuccess(response.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Login to Supreme Fitness</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <button
          onClick={switchToRegister}
          className="text-indigo-600 hover:text-indigo-500 text-sm"
        >
          Don't have an account? Register here
        </button>
      </div>
    </div>
  );
};

const RegisterForm = ({ onSuccess, switchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'member',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/api/register', formData);
      alert('Registration successful! Please login to continue.');
      switchToLogin();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Join Supreme Fitness</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            type="text"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
          >
            <option value="member">Member</option>
            <option value="trainer">Trainer</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone (Optional)</label>
          <input
            type="tel"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <button
          onClick={switchToLogin}
          className="text-indigo-600 hover:text-indigo-500 text-sm"
        >
          Already have an account? Login here
        </button>
      </div>
    </div>
  );
};

// Member Dashboard Components
const MemberDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('classes');
  const [classes, setClasses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [progress, setProgress] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [classesData, bookingsData, progressData, notificationsData] = await Promise.all([
        api.get('/api/classes'),
        api.get('/api/bookings/member'),
        api.get('/api/progress/member'),
        api.get('/api/notifications')
      ]);
      
      setClasses(classesData);
      setBookings(bookingsData);
      setProgress(progressData);
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookClass = async (classId) => {
    try {
      await api.post('/api/bookings', { class_id: classId });
      loadData();
      alert('Class booked successfully!');
    } catch (error) {
      alert('Error booking class: ' + error.message);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await api.put(`/api/bookings/${bookingId}/cancel`);
      loadData();
      alert('Booking cancelled successfully!');
    } catch (error) {
      alert('Error cancelling booking: ' + error.message);
    }
  };

  const handlePayment = async (bookingId) => {
    try {
      const paymentData = await api.post(`/api/payments/create-order?booking_id=${bookingId}`);
      // In a real app, you'd integrate with PayPal SDK here
      await api.post(`/api/payments/${paymentData.order_id}/complete?paypal_order_id=DEMO_${Date.now()}`);
      loadData();
      alert('Payment successful!');
    } catch (error) {
      alert('Payment failed: ' + error.message);
    }
  };

  const renderClasses = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">Available Classes</h3>
      {classes.map(cls => (
        <div key={cls.id} className="bg-white p-6 rounded-lg shadow border">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">{cls.name}</h4>
              <p className="text-gray-600">{cls.description}</p>
              <p className="text-sm text-gray-500">Trainer: {cls.trainer_name}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">${cls.price}</p>
              <p className="text-sm text-gray-500">{cls.enrolled_count}/{cls.capacity} enrolled</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                {new Date(cls.start_time).toLocaleString()} - {new Date(cls.end_time).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Duration: {cls.duration} minutes</p>
            </div>
            
            <button
              onClick={() => handleBookClass(cls.id)}
              disabled={cls.enrolled_count >= cls.capacity}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cls.enrolled_count >= cls.capacity ? 'Full' : 'Book Class'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">My Bookings</h3>
      {bookings.map(booking => (
        <div key={booking.id} className="bg-white p-6 rounded-lg shadow border">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">{booking.class_name}</h4>
              <p className="text-gray-600">
                {new Date(booking.class_start_time).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">
                Booked: {new Date(booking.booking_time).toLocaleString()}
              </p>
              <div className="flex space-x-2 mt-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  booking.status === 'booked' ? 'bg-green-100 text-green-800' :
                  booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {booking.status}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${
                  booking.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                  booking.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  Payment: {booking.payment_status}
                </span>
              </div>
            </div>
            
            <div className="space-x-2">
              {booking.payment_status === 'pending' && booking.status === 'booked' && (
                <button
                  onClick={() => handlePayment(booking.id)}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Pay Now
                </button>
              )}
              {booking.status === 'booked' && (
                <button
                  onClick={() => handleCancelBooking(booking.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderProgress = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">Fitness Progress</h3>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="text-lg font-semibold mb-4">Add New Progress Entry</h4>
        <ProgressForm onSuccess={loadData} />
      </div>
      
      {progress.map(entry => (
        <div key={entry.id} className="bg-white p-6 rounded-lg shadow border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-semibold">{new Date(entry.recorded_date).toLocaleDateString()}</p>
            </div>
            {entry.weight && (
              <div>
                <p className="text-sm text-gray-500">Weight</p>
                <p className="font-semibold">{entry.weight} kg</p>
              </div>
            )}
            {entry.height && (
              <div>
                <p className="text-sm text-gray-500">Height</p>
                <p className="font-semibold">{entry.height} cm</p>
              </div>
            )}
            {entry.bmi && (
              <div>
                <p className="text-sm text-gray-500">BMI</p>
                <p className="font-semibold">{entry.bmi}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Classes Attended</p>
              <p className="font-semibold">{entry.attendance_count}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const tabs = [
    { id: 'classes', label: 'Browse Classes', icon: '🏋️' },
    { id: 'bookings', label: 'My Bookings', icon: '📅' },
    { id: 'progress', label: 'Progress', icon: '📊' },
    { id: 'notifications', label: `Notifications (${notifications.filter(n => !n.is_read).length})`, icon: '🔔' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, {user.full_name}
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Member Dashboard</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-1 mb-8 bg-white p-1 rounded-lg shadow">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <div>
            {activeTab === 'classes' && renderClasses()}
            {activeTab === 'bookings' && renderBookings()}
            {activeTab === 'progress' && renderProgress()}
            {activeTab === 'notifications' && (
              <NotificationsList notifications={notifications} onUpdate={loadData} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Progress Form Component
const ProgressForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({ weight: '', height: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {};
      if (formData.weight) data.weight = parseFloat(formData.weight);
      if (formData.height) data.height = parseFloat(formData.height);

      await api.post('/api/progress', data);
      setFormData({ weight: '', height: '' });
      onSuccess();
      alert('Progress entry added successfully!');
    } catch (error) {
      alert('Error adding progress: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
      <div>
        <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
        <input
          type="number"
          step="0.1"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          value={formData.weight}
          onChange={(e) => setFormData({...formData, weight: e.target.value})}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Height (cm)</label>
        <input
          type="number"
          step="0.1"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          value={formData.height}
          onChange={(e) => setFormData({...formData, height: e.target.value})}
        />
      </div>
      
      <button
        type="submit"
        disabled={loading || (!formData.weight && !formData.height)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add Entry'}
      </button>
    </form>
  );
};

// Trainer Dashboard Component
const TrainerDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('classes');
  const [classes, setClasses] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [classesData, feedbackData] = await Promise.all([
        api.get(`/api/classes/trainer/${user.id}`),
        api.get(`/api/feedback/trainer/${user.id}`)
      ]);
      
      setClasses(classesData);
      setFeedback(feedbackData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'classes', label: 'My Classes', icon: '🏋️' },
    { id: 'create', label: 'Create Class', icon: '➕' },
    { id: 'feedback', label: 'Feedback', icon: '⭐' }
  ];

  const renderClasses = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">My Classes</h3>
      {classes.map(cls => (
        <div key={cls.id} className="bg-white p-6 rounded-lg shadow border">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">{cls.name}</h4>
              <p className="text-gray-600">{cls.description}</p>
              <p className="text-sm text-gray-500">
                {new Date(cls.start_time).toLocaleString()} - {new Date(cls.end_time).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Duration: {cls.duration} minutes</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">${cls.price}</p>
              <p className="text-sm text-gray-500">{cls.enrolled_count}/{cls.capacity} enrolled</p>
              <span className={`px-2 py-1 rounded text-xs ${
                cls.status === 'active' ? 'bg-green-100 text-green-800' :
                cls.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {cls.status}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCreateClass = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-xl font-semibold mb-4">Create New Class</h3>
      <ClassForm trainerId={user.id} onSuccess={loadData} />
    </div>
  );

  const renderFeedback = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">Student Feedback</h3>
      {feedback.map(fb => (
        <div key={fb.id} className="bg-white p-6 rounded-lg shadow border">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-semibold">{fb.member_name}</p>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={`text-lg ${i < fb.rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                    ⭐
                  </span>
                ))}
                <span className="ml-2 text-sm text-gray-600">({fb.rating}/5)</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">{new Date(fb.created_at).toLocaleDateString()}</p>
          </div>
          <p className="text-gray-700">{fb.comment}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Trainer Dashboard - {user.full_name}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-1 mb-8 bg-white p-1 rounded-lg shadow">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <div>
            {activeTab === 'classes' && renderClasses()}
            {activeTab === 'create' && renderCreateClass()}
            {activeTab === 'feedback' && renderFeedback()}
          </div>
        )}
      </div>
    </div>
  );
};

// Class Form Component
const ClassForm = ({ trainerId, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_time: '',
    end_time: '',
    capacity: '',
    price: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        trainer_id: trainerId,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        capacity: parseInt(formData.capacity),
        price: parseFloat(formData.price)
      };

      await api.post('/api/classes', data);
      setFormData({
        name: '',
        description: '',
        start_time: '',
        end_time: '',
        capacity: '',
        price: ''
      });
      onSuccess();
      alert('Class created successfully!');
    } catch (error) {
      alert('Error creating class: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Class Name</label>
          <input
            type="text"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Capacity</label>
          <input
            type="number"
            required
            min="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.capacity}
            onChange={(e) => setFormData({...formData, capacity: e.target.value})}
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          required
          rows="3"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Time</label>
          <input
            type="datetime-local"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.start_time}
            onChange={(e) => setFormData({...formData, start_time: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">End Time</label>
          <input
            type="datetime-local"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={formData.end_time}
            onChange={(e) => setFormData({...formData, end_time: e.target.value})}
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Price ($)</label>
        <input
          type="number"
          required
          min="0"
          step="0.01"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          value={formData.price}
          onChange={(e) => setFormData({...formData, price: e.target.value})}
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Class'}
      </button>
    </form>
  );
};

// Admin Dashboard Component
const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, analyticsData] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/analytics/dashboard')
      ]);
      
      setUsers(usersData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      await api.put(`/api/users/${userId}/approve`);
      loadData();
      alert('User approved successfully!');
    } catch (error) {
      alert('Error approving user: ' + error.message);
    }
  };

  const handleDeactivateUser = async (userId) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      try {
        await api.put(`/api/users/${userId}/deactivate`);
        loadData();
        alert('User deactivated successfully!');
      } catch (error) {
        alert('Error deactivating user: ' + error.message);
      }
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'approvals', label: `Approvals (${users.filter(u => !u.is_approved).length})`, icon: '✅' }
  ];

  const renderDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg">
            <span className="text-2xl">👥</span>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Members</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.total_members}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <span className="text-2xl">🏋️</span>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Trainers</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.total_trainers}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-purple-100 rounded-lg">
            <span className="text-2xl">📅</span>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Active Classes</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.total_classes}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <span className="text-2xl">🎫</span>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Bookings</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.total_bookings}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <span className="text-2xl">💰</span>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">${analytics.total_revenue}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-red-100 rounded-lg">
            <span className="text-2xl">⏳</span>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.pending_approvals}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">All Users</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'trainer' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-1">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.date_joined).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  {!user.is_approved && (
                    <button
                      onClick={() => handleApproveUser(user.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Approve
                    </button>
                  )}
                  {user.is_active && user.role !== 'admin' && (
                    <button
                      onClick={() => handleDeactivateUser(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderApprovals = () => {
    const pendingUsers = users.filter(u => !u.is_approved);
    
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-4">Pending Approvals</h3>
        {pendingUsers.map(user => (
          <div key={user.id} className="bg-white p-6 rounded-lg shadow border">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{user.full_name}</h4>
                <p className="text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-500">Phone: {user.phone || 'Not provided'}</p>
                <span className={`mt-2 px-2 py-1 rounded text-xs ${
                  user.role === 'trainer' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {user.role}
                </span>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => handleApproveUser(user.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleDeactivateUser(user.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
        {pendingUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No pending approvals
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard - Supreme Fitness
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-1 mb-8 bg-white p-1 rounded-lg shadow">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <div>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'approvals' && renderApprovals()}
          </div>
        )}
      </div>
    </div>
  );
};

// Notifications Component
const NotificationsList = ({ notifications, onUpdate }) => {
  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      onUpdate();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">Notifications</h3>
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg border ${
            notification.is_read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{notification.title}</h4>
              <p className="text-gray-600 mt-1">{notification.message}</p>
              <p className="text-sm text-gray-500 mt-2">
                {new Date(notification.created_at).toLocaleString()}
              </p>
            </div>
            {!notification.is_read && (
              <button
                onClick={() => handleMarkAsRead(notification.id)}
                className="ml-4 text-blue-600 hover:text-blue-800 text-sm"
              >
                Mark as read
              </button>
            )}
          </div>
        </div>
      ))}
      {notifications.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No notifications yet
        </div>
      )}
    </div>
  );
};

// Main App Component
const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-white">
        <div className="w-full max-w-md">
          {showLogin ? (
            <LoginForm
              onSuccess={handleLogin}
              switchToRegister={() => setShowLogin(false)}
            />
          ) : (
            <RegisterForm
              onSuccess={handleLogin}
              switchToLogin={() => setShowLogin(true)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, logout: handleLogout }}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-indigo-600">Supreme Fitness</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Welcome, {user.full_name} ({user.role})
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>
          {user.role === 'member' && <MemberDashboard />}
          {user.role === 'trainer' && <TrainerDashboard />}
          {user.role === 'admin' && <AdminDashboard />}
        </main>
      </div>
    </AuthContext.Provider>
  );
};

export default App;