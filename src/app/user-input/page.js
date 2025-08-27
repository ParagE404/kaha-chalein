'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../styles/user-input.css';
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
  const [isGettingLocation, setIsGettingLocation] = useState(false);

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

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Use reverse geocoding to get very detailed address
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          
          if (response.ok) {
            const data = await response.json();
            
            // Build a very detailed location string
            const locationParts = [];
            
            // Add house number and street name if available
            if (data.localityInfo && data.localityInfo.LikelyLand) {
              locationParts.push(data.localityInfo.LikelyLand);
            }
            
            // Add road/street name
            if (data.locality && data.locality.includes('Road') || data.locality.includes('Street') || data.locality.includes('Lane')) {
              locationParts.push(data.locality);
            } else if (data.localityInfo && data.localityInfo.administrative) {
              const admin = data.localityInfo.administrative;
              // Look for road names in administrative levels
              for (let i = 8; i >= 6; i--) {
                if (admin[i] && admin[i].name && 
                    (admin[i].name.includes('Road') || admin[i].name.includes('Street') || 
                     admin[i].name.includes('Lane') || admin[i].name.includes('Marg'))) {
                  locationParts.push(admin[i].name);
                  break;
                }
              }
            }
            
            // Add area/locality name
            if (data.locality && !locationParts.includes(data.locality)) {
              locationParts.push(data.locality);
            }
            
            // Add neighborhood/sector
            if (data.localityInfo && data.localityInfo.administrative) {
              const admin = data.localityInfo.administrative;
              
              // Add specific area/sector names
              if (admin[7] && admin[7].name && !locationParts.includes(admin[7].name)) {
                locationParts.push(admin[7].name);
              }
              if (admin[6] && admin[6].name && !locationParts.includes(admin[6].name)) {
                locationParts.push(admin[6].name);
              }
            }
            
            // Add postal code if available
            if (data.postcode) {
              locationParts.push(`PIN: ${data.postcode}`);
            }
            
            // Add city/district
            if (data.city && !locationParts.some(part => part.includes(data.city))) {
              locationParts.push(data.city);
            }
            
            // Create detailed location string (limit to 4-5 most relevant parts)
            let locationString = locationParts.slice(0, 4).join(', ');
            
            // Enhanced fallback strategy
            if (!locationString || locationString.length < 10) {
              const fallbackParts = [];
              
              // Try to get road/street from different fields
              if (data.plusCode && data.plusCode.compound) {
                fallbackParts.push(data.plusCode.compound);
              }
              
              if (data.locality) fallbackParts.push(data.locality);
              if (data.city) fallbackParts.push(data.city);
              if (data.postcode) fallbackParts.push(`PIN: ${data.postcode}`);
              
              locationString = fallbackParts.join(', ');
            }
            
            // Final detailed fallback with coordinates
            if (!locationString || locationString.length < 5) {
              locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Precise GPS Location)`;
            }
            
            setFormData(prev => ({
              ...prev,
              location: locationString
            }));
          } else {
            // Try alternative geocoding service for better road-level data
            try {
              const nominatimResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
              );
              
              if (nominatimResponse.ok) {
                const nominatimData = await nominatimResponse.json();
    
                
                const address = nominatimData.address || {};
                const addressParts = [];
                
                // Build detailed address from Nominatim
                if (address.house_number) addressParts.push(address.house_number);
                if (address.road) addressParts.push(address.road);
                if (address.neighbourhood) addressParts.push(address.neighbourhood);
                if (address.suburb) addressParts.push(address.suburb);
                if (address.postcode) addressParts.push(`PIN: ${address.postcode}`);
                if (address.city || address.town || address.village) {
                  addressParts.push(address.city || address.town || address.village);
                }
                
                const detailedLocation = addressParts.slice(0, 4).join(', ');
                
                setFormData(prev => ({
                  ...prev,
                  location: detailedLocation || `${latitude.toFixed(6)}, ${longitude.toFixed(6)} (GPS)`
                }));
              } else {
                throw new Error('Nominatim failed');
              }
            } catch (nominatimError) {
              // Final fallback to precise coordinates
              setFormData(prev => ({
                ...prev,
                location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Precise Location)`
              }));
            }
          }
        } catch (error) {
          console.error('Error getting location details:', error);
          // Fallback to precise coordinates
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({
            ...prev,
            location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)} (GPS Coordinates)`
          }));
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = 'Unable to get your location. ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            break;
        }
        
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 60000 // 1 minute for most current location
      }
    );
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
          <label htmlFor="location">Location</label>
          <div className="location-input-group">
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              placeholder="Enter your location"
            />
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="location-btn"
              aria-label="Use current location"
            >
              {isGettingLocation ? '📍...' : '📍'}
            </button>
          </div>
        </div>

        <Button className="continue-btn" type="primary" onClick={handleSubmit}>Continue</Button>

      </form>

      <Footer/>
    </div>
  );
} 