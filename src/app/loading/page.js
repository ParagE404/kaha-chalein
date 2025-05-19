'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import styles from '../styles/loading.css';

export default function LoadingPage() {
  const router = useRouter();

  useEffect(() => {
    const socket = io('http://localhost:3001');
    const sessionId = window.location.pathname.split('/').pop();

    socket.on('resultsReady', () => {
      router.push(`/results/${sessionId}`);
    });

    // Set a timeout to redirect to results after 5 seconds
    const timeout = setTimeout(() => {
      router.push(`/results/${sessionId}`);
    }, 5000);

    return () => {
      clearTimeout(timeout);
      socket.disconnect();
    };
  }, [router]);

  return (
    <div className="loading-container">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <h1>Finding the perfect match...</h1>
        <p>We're calculating the best restaurant based on everyone's preferences</p>
      </div>
    </div>
  );
} 