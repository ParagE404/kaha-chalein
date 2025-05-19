'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io } from 'socket.io-client';
import styles from '../styles/join.module.css';

export default function JoinPage() {
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
  const sessionIdRef = useRef(sessionId);

  // Update sessionIdRef when sessionId changes
  useEffect(() => {
    sessionIdRef.current = sessionId;
    console.log('Session ID updated:', sessionId);
  }, [sessionId]);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    const currentSessionId = sessionIdRef.current;
    console.log('Initializing socket with session ID:', currentSessionId);
    
    if (!currentSessionId) {
      console.log('No session ID available for socket initialization');
      return null;
    }

    // If we already have a socket, don't create a new one
    if (socketRef.current?.connected) {
      console.log('Reusing existing socket connection');
      return socketRef.current;
    }

    console.log('Creating new socket connection');
    const newSocket = io('http://localhost:3001', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      transports: ['websocket'],
      forceNew: true,
      autoConnect: true,
      reconnection: true
    });

    // Handle connection events
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setError('');
      
      // If we were in the process of joining, retry the join
      if (isJoiningRef.current && currentSessionId) {
        console.log('Retrying join after reconnection');
        newSocket.emit('joinSession', {
          sessionId: currentSessionId,
          userData: { name: name.trim() }
        });
      }
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
      
      // Only show error if not intentionally disconnected and not during Fast Refresh
      if (reason !== 'io client disconnect' && !reason.includes('transport')) {
        setError('Disconnected from server. Please refresh the page.');
        setIsJoining(false);
        isJoiningRef.current = false;
      }
    });

    // Handle session events
    newSocket.on('joinError', ({ message }) => {
      console.error('Join error:', message);
      setError(message);
      setIsJoining(false);
      isJoiningRef.current = false;
    });

    newSocket.on('userJoined', ({ users, newUser }) => {
      console.log('User joined:', newUser);
      console.log('Current users:', users);
      
      // Store session data in localStorage before redirecting
      const sessionData = {
        sessionId: currentSessionId,
        userName: name,
        users
      };
      console.log('Storing session data:', sessionData);
      localStorage.setItem('sessionData', JSON.stringify(sessionData));
      
      // Redirect to cards page after successful join
      console.log('Redirecting to cards page with session:', currentSessionId);
      router.push(`/cards?session=${currentSessionId}`);
    });

    newSocket.on('sessionEnded', ({ message }) => {
      console.log('Session ended:', message);
      setError('This session has ended. Please create a new session.');
      setIsJoining(false);
      isJoiningRef.current = false;
      // Clear session data
      localStorage.removeItem('sessionData');
    });

    newSocket.on('error', ({ message }) => {
      console.error('Socket error:', message);
      setError(message);
      setIsJoining(false);
      isJoiningRef.current = false;
    });

    socketRef.current = newSocket;
    return newSocket;
  }, [name, router]);

  useEffect(() => {
    console.log('Join page mounted with session ID:', sessionId);
    if (!sessionId) {
      console.log('No session ID found, redirecting to home');
      router.push('/');
      return;
    }

    const newSocket = initializeSocket();
    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        // Only disconnect if we're actually leaving the page
        if (document.visibilityState === 'hidden') {
          console.log('Disconnecting socket on page leave');
          socketRef.current.disconnect();
        }
      }
    };
  }, [sessionId, router, initializeSocket]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const currentSessionId = sessionIdRef.current;
    console.log('Handling join submission for session:', currentSessionId);
    
    // Validate input
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (name.length > 50) {
      setError('Name must be less than 50 characters');
      return;
    }

    if (!socket || !isConnected) {
      setError('Not connected to server. Please refresh the page.');
      return;
    }

    if (!currentSessionId) {
      setError('Invalid session. Please try joining again.');
      return;
    }

    try {
      setIsJoining(true);
      isJoiningRef.current = true;
      setError('');
      
      console.log('Emitting joinSession event:', {
        sessionId: currentSessionId,
        userData: { name: name.trim() }
      });
      
      // Emit join event
      socket.emit('joinSession', {
        sessionId: currentSessionId,
        userData: { name: name.trim() }
      });

      // Set a timeout for join request
      const joinTimeout = setTimeout(() => {
        if (isJoiningRef.current) {
          console.log('Join request timed out');
          setError('Join request timed out. Please try again.');
          setIsJoining(false);
          isJoiningRef.current = false;
        }
      }, 10000);

      // Cleanup timeout
      return () => clearTimeout(joinTimeout);
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
      <div className={styles.formContainer}>
        <h1>Join Session</h1>
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
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isJoining || !isConnected}
          >
            {isJoining ? 'Joining...' : 'Join Session'}
          </button>
        </form>
      </div>
    </div>
  );
} 