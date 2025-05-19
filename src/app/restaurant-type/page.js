'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/restaurant-type.css';

const restaurantTypes = [
  { id: 'north-indian', name: 'North Indian', icon: '🍛' },
  { id: 'south-indian', name: 'South Indian', icon: '🍚' },
  { id: 'chinese', name: 'Chinese', icon: '🥢' },
  { id: 'italian', name: 'Italian', icon: '🍝' },
  { id: 'mexican', name: 'Mexican', icon: '🌮' },
  { id: 'fast-food', name: 'Fast Food', icon: '🍔' },
  { id: 'cafe', name: 'Café', icon: '☕' },
  { id: 'street-food', name: 'Street Food', icon: '🍢' },
  { id: 'seafood', name: 'Seafood', icon: '🦐' },
  { id: 'desserts', name: 'Desserts', icon: '🍰' },
  { id: 'beverages', name: 'Beverages', icon: '🥤' },
  { id: 'continental', name: 'Continental', icon: '🍽️' }
];

export default function RestaurantType() {
  const router = useRouter();
  const [selectedTypes, setSelectedTypes] = useState([]);

  const handleTypeClick = (typeId) => {
    setSelectedTypes(prev => {
      if (prev.includes(typeId)) {
        return prev.filter(id => id !== typeId);
      }
      return [...prev, typeId];
    });
  };

  const handleContinue = () => {
    if (selectedTypes.length > 0) {
      localStorage.setItem('selectedTypes', JSON.stringify(selectedTypes));
      router.push('/qr-code');
    }
  };

  return (
    <div className="restaurant-type-container">
      <h1>Select Restaurant Types</h1>
      <p>Choose one or more types of restaurants you're interested in</p>
      
      <div className="type-grid">
        {restaurantTypes.map(type => (
          <div
            key={type.id}
            className={`type-card ${selectedTypes.includes(type.id) ? 'selected' : ''}`}
            onClick={() => handleTypeClick(type.id)}
          >
            <span className="type-icon">{type.icon}</span>
            <span className="type-name">{type.name}</span>
          </div>
        ))}
      </div>

      <button
        className="continue-btn"
        onClick={handleContinue}
        disabled={selectedTypes.length === 0}
      >
        Continue
      </button>
    </div>
  );
} 