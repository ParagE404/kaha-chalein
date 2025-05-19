'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import styles from '../../styles/join.css';

export default function JoinPage({ params }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    location: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const socket = io('http://localhost:3001');

    socket.emit('joinSession', {
      sessionId: params.sessionId,
      userData: formData
    });

    socket.on('joinError', ({ message }) => {
      setError(message);
    });

    socket.on('userJoined', () => {
      localStorage.setItem('userData', JSON.stringify(formData));
      router.push('/cards');
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="join-container">
      <h1>Join the Session</h1>
      {error && <p className="error-message">{error}</p>}
      
      <form onSubmit={handleSubmit} className="join-form">
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter your name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="mobile">Mobile Number</label>
          <input
            type="tel"
            id="mobile"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            required
            pattern="[0-9]{10}"
            placeholder="Enter 10-digit mobile number"
          />
        </div>

        <div className="form-group">
          <label htmlFor="location">Location in Mumbai</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            placeholder="Enter your location"
          />
        </div>

        <button type="submit" className="join-btn">
          Join Session
        </button>
      </form>
    </div>
  );
} 