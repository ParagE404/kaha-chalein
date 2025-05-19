'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io } from 'socket.io-client';
import styles from '../styles/results.module.css';

export default function ResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const [socket, setSocket] = useState(null);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      router.push('/');
      return;
    }

    const socket = io('http://localhost:3001', {
      withCredentials: false,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('Failed to connect to server. Please try again.');
    });

    // Socket event handlers
    socket.on('results', (data) => {
      console.log('Results received:', data);
      setResults(data);
      setIsLoading(false);
    });

    socket.on('error', ({ message }) => {
      console.error('Socket error:', message);
      setError(message);
    });

    setSocket(socket);

    // Fetch results
    fetch(`http://localhost:3001/api/results?session=${sessionId}`)
      .then(res => res.json())
      .then(data => {
        setResults(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching results:', err);
        setError('Failed to load results');
        setIsLoading(false);
      });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, router]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>No results available</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.resultsContainer}>
        <h1>Voting Results</h1>
        <div className={styles.resultsList}>
          {results.map((result, index) => (
            <div key={result.id} className={styles.resultCard}>
              <div className={styles.rank}>{index + 1}</div>
              <div className={styles.restaurantInfo}>
                <h2>{result.name}</h2>
                <p className={styles.cuisine}>{result.cuisine}</p>
                <div className={styles.details}>
                  <span className={styles.rating}>⭐ {result.rating}</span>
                  <span className={styles.price}>{result.price}</span>
                </div>
                <p className={styles.address}>{result.address}</p>
              </div>
              <div className={styles.voteInfo}>
                <div className={styles.voteCount}>
                  <span className={styles.likes}>👍 {result.votes.likes}</span>
                  <span className={styles.dislikes}>👎 {result.votes.dislikes}</span>
                </div>
                <div className={styles.score}>
                  Score: {result.score}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button 
          className={styles.newSessionButton}
          onClick={() => router.push('/')}
        >
          Start New Session
        </button>
      </div>
    </div>
  );
} 