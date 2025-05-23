'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/user-input.css';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import Button from '@/components/Buttons/Button';

export default function UserInput() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    location: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Store user data in localStorage
    localStorage.setItem('userData', JSON.stringify(formData));
    router.push('/restaurant-type');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="user-input-container user-info container">
      <Header/>
      <div className="text-1">No more &quot;I&apos;m fine with anything&quot; lies..</div>

      <form onSubmit={handleSubmit} className="user-form">
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


        <Button className="continue-btn" type="tertiary"  onClick={() => handleSubmit}>Continue</Button>

      </form>

      <Footer/>
    </div>
  );
} 