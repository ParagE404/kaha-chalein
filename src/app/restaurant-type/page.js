'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../styles/restaurant-type.css';
import TopBar from '@/components/TopBar/TopBar';
import Footer from '@/components/Footer/Footer';
import Button from '@/components/Buttons/Button';

const restaurantTypes = [
  { 
    id: 'after-9-energy', 
    name: 'After 9 Energy', 
    icon: '🎵',
    apiTypes: ['night_club', 'bar', 'pub']
  },
  { 
    id: 'table-for-two', 
    name: 'Table for Two', 
    icon: '💕',
    apiTypes: ['restaurant','cafe']
  },
  { 
    id: 'sip-and-savor', 
    name: 'Sip and Savor', 
    icon: '🍷',
    apiTypes: ['bar', 'liquor_store', 'wine_bar']
  },
  { 
    id: 'fine-dine-finds', 
    name: 'Fine Dine Finds', 
    icon: '🍽️',
    apiTypes: ['restaurant']
  },
  { 
    id: 'mugs-and-mood', 
    name: 'Mugs and Mood', 
    icon: '☕',
    apiTypes: ['cafe', 'coffee_shop']
  },
  { 
    id: 'bake-me-happy', 
    name: 'Bake Me Happy', 
    icon: '🧁',
    apiTypes: ['bakery', 'dessert_shop']
  }
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
      // Get the selected restaurant type objects with their API types
      const selectedTypeObjects = restaurantTypes.filter(type => 
        selectedTypes.includes(type.id)
      );
      
      // Extract all unique API types from selected restaurant types
      const allApiTypes = selectedTypeObjects.flatMap(type => type.apiTypes);
      const uniqueApiTypes = [...new Set(allApiTypes)];
      
      // Store both display info and API types
      localStorage.setItem('selectedTypes', JSON.stringify(selectedTypes));
      localStorage.setItem('selectedTypeObjects', JSON.stringify(selectedTypeObjects));
      localStorage.setItem('apiTypes', JSON.stringify(uniqueApiTypes));
      
      router.push('/qr-code');
    }
  };

  return (
    <div className="restaurant-type-container restaurant-type container">
      <TopBar/>

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
      <Button className="continue-btn " type="primary"  onClick={handleContinue} disabled={selectedTypes.length === 0}>Continue</Button>
      <Footer/>
    </div>
  );
} 