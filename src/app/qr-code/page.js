'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { io } from 'socket.io-client';
import styles from '../styles/qr-code.module.css';

export default function QRCodePage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');
  const [socket, setSocket] = useState(null);
  const [joinLink, setJoinLink] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: false
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('sessionCreated', ({ sessionId }) => {
      console.log('Session created:', sessionId);
      setSessionId(sessionId);
      setJoinLink(`http://localhost:3000/join?session=${sessionId}`);
      
      // Store session data
      const sessionData = {
        sessionId,
        userName: 'Host',
        location: 'Mumbai'
      };
      localStorage.setItem('sessionData', JSON.stringify(sessionData));
      localStorage.setItem('socketId', newSocket.id);
    });

    newSocket.on('error', ({ message }) => {
      console.error('Socket error:', message);
      setError(message);
      setIsLoading(false);
    });

    newSocket.on('sessionState', ({ restaurants }) => {
      console.log('Received session state with restaurants:', restaurants?.length);
      if (restaurants?.length > 0) {
        router.push(`/cards?session=${sessionId}`);
      }
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  const handleCreateSession = () => {
    if (socket) {
      console.log('Creating new session');
      socket.emit('createSession', {
        userData: {
          name: 'Host',
          location: 'Mumbai'
        }
      });
    }
  };

  const handleStartVoting = async () => {
    if (!socket || !sessionId) return;

    try {
      setIsLoading(true);
      setError('');

      // Get selected types from localStorage
      const selectedTypes = JSON.parse(localStorage.getItem('selectedTypes') || '[]');
      
      // First, try to get restaurants from the server
      console.log('Fetching restaurants...');
      const res = await fetch('http://localhost:3001/api/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          types: selectedTypes,
          location: 'Mumbai'
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch restaurants');
      }

      const data = await res.json();
      if (!data || data.error) {
        throw new Error(data.error || 'Failed to fetch restaurants');
      }

      console.log('Restaurants fetched:', data.length);
      
      // Then, set restaurants in the session
      console.log('Setting restaurants in session...');
      const setRes = await fetch('http://localhost:3001/api/session/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          restaurants: data
        })
      });

      if (!setRes.ok) {
        throw new Error('Failed to set restaurants in session');
      }

      console.log('Restaurants set in session, waiting for session state...');
      
      // Store restaurants in session data
      const sessionData = JSON.parse(localStorage.getItem('sessionData') || '{}');
      sessionData.restaurants = data;
      localStorage.setItem('sessionData', JSON.stringify(sessionData));

      // Redirect to cards page
      console.log('Redirecting to cards page...');
      router.push(`/cards?session=${sessionId}`);

    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to start voting');
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(joinLink);
    alert('Link copied to clipboard!');
  };

  return (
    <div className={styles.container}>
      <h1>Share QR Code</h1>
      {error && <p className={styles.error}>{error}</p>}
      {!sessionId ? (
        <button onClick={handleCreateSession} className={styles.createButton}>
          Create Session
        </button>
      ) : (
        <div className={styles.qrContainer}>
          <QRCodeCanvas
            value={joinLink}
            size={256}
            level="H"
            includeMargin={true}
          />
          <p>Scan this QR code to join the session</p>
          <div className={styles.linkContainer}>
            <p className={styles.linkLabel}>Or share this link:</p>
            <div className={styles.linkWrapper}>
              <input
                type="text"
                value={joinLink}
                readOnly
                className={styles.linkInput}
              />
              <button onClick={copyToClipboard} className={styles.copyButton}>
                Copy
              </button>
            </div>
          </div>
          <button
            onClick={handleStartVoting}
            className={styles.startButton}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Start Voting'}
          </button>
        </div>
      )}
    </div>
  );
} 