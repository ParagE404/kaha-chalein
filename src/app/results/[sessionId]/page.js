'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import styles from '../../styles/results.css';

export default function ResultsPage({ params }) {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL);
    setSocket(newSocket);

    newSocket.emit('getResults', { sessionId: params.sessionId });

    newSocket.on('results', (data) => {
      setResult(data);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [params.sessionId]);

  const handleNewSession = () => {
    localStorage.clear();
    router.push('/');
  };

  if (!result) {
    return (
      <div className="loading-container">
        <p>Loading results...</p>
      </div>
    );
  }

  return (
    <div className="results-container">
      <h1>We found your perfect match!</h1>
      
      <div className="result-card">
        <img 
          src={result.image} 
          alt={result.name}
          className="result-image"
        />
        <div className="result-info">
          <h2>{result.name}</h2>
          <p className="location">{result.location}</p>
          <p className="cuisine">{result.cuisine}</p>
          <div className="match-stats">
            <p>{result.matchPercentage}% match</p>
            <p>{result.votes} people liked this</p>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button 
          className="view-details-btn"
          onClick={() => window.open(result.url, '_blank')}
        >
          View Details
        </button>
        <button 
          className="new-session-btn"
          onClick={handleNewSession}
        >
          Start New Session
        </button>
      </div>
    </div>
  );
} 