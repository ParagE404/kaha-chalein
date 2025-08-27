'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io } from 'socket.io-client';
import styles from '../styles/join.module.css';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import Button from '@/components/Buttons/Button';

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const [socket, setSocket] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const isJoiningRef = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      router.push('/');
      return;
    }

    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: false
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setError('');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setError('Failed to connect to server. Please try again.');
      setIsConnected(false);
      setIsJoining(false);
      isJoiningRef.current = false;
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setIsConnected(false);
      if (reason !== 'io client disconnect') {
        setError('Disconnected from server. Please refresh the page.');
        setIsJoining(false);
        isJoiningRef.current = false;
      }
    });

    newSocket.on('error', ({ message }) => {
      console.error('Socket error:', message);
      setError(message);
      setIsJoining(false);
      isJoiningRef.current = false;
    });

    newSocket.on('sessionState', ({ restaurants, votes, totalUsers, votedUsers, votedUsersList }) => {
      console.log('Received session state:', { restaurants, votes });
      
      // Store session data
      const sessionData = {
        sessionId,
        userName: name.trim(),
        totalUsers,
        votedUsers,
        votedUsersList,
        restaurants
      };
      localStorage.setItem('sessionData', JSON.stringify(sessionData));
      localStorage.setItem('socketId', newSocket.id);
      
      // Redirect to cards page
      router.push(`/cards?session=${sessionId}`);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [sessionId, router, name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (name.length > 50) {
      setError('Name must be less than 50 characters');
      return;
    }

    if (!socketRef.current?.connected) {
      setError('Not connected to server. Please refresh the page.');
      return;
    }

    try {
      setIsJoining(true);
      isJoiningRef.current = true;
      setError('');
      
      console.log('Joining session:', sessionId);
      socketRef.current.emit('joinSession', {
        sessionId,
        userData: { 
          name: name.trim(),
          location: 'Mumbai'
        }
      });

      // Set timeout for join request
      setTimeout(() => {
        if (isJoiningRef.current) {
          setError('Join request timed out. Please try again.');
          setIsJoining(false);
          isJoiningRef.current = false;
        }
      }, 10000);
    } catch (error) {
      console.error('Error joining session:', error);
      setError('Failed to join session. Please try again.');
      setIsJoining(false);
      isJoiningRef.current = false;
    }
  };

  if (!sessionId) {
    return null;
  }

  return (
    <div className={styles.container}>
      <Header/>
      <div className={styles.formContainer}>
        <h1>Join Session </h1>
        {error && <p className={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="name">Your Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className={styles.input}
              disabled={isJoining}
              maxLength={50}
              autoComplete="off"
            />
          </div>
  
          <Button 
            className={styles.submitButton} 
            type="primary" 
            onClick={handleSubmit} 
            disabled={isJoining || !isConnected}
          >
            {isJoining ? 'Joining...' : 'Join Session'}
          </Button>
        </form>
      </div>
      <Footer/>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className={styles.container}>
      <Header/>
      <div className={styles.formContainer}>
        <h1>Loading...</h1>
      </div>
      <Footer/>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <JoinPageContent />
    </Suspense>
  );
} 