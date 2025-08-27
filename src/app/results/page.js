'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from '../styles/results.module.css';
import Image from 'next/image';
import background from '@/assets/results/background.svg';

function ResultsPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Try to get results from localStorage first
    const storedResults = localStorage.getItem('votingResults');
    if (storedResults) {
      try {
        const parsedResults = JSON.parse(storedResults);
        setResults(parsedResults);
        setIsLoading(false);
      } catch (err) {
        console.error('Error parsing stored results:', err);
        // If parsing fails, fetch from server
        fetchResults();
      }
    } else {
      // If no stored results, fetch from server
      fetchResults();
    }
  }, [sessionId]);

  const fetchResults = () => {
    if (!sessionId) {
      setError('No session ID provided');
      setIsLoading(false);
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/results?session=${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          throw new Error(data.error);
        }
        setResults(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching results:', err);
        setError(err.message || 'Failed to load results');
        setIsLoading(false);
      });
  };

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

  if (!results || results.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>No results available</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.locationText}>Results</div>
      <div className={styles.resultsContainer}>
        <div className={styles.resultsList}>
          {results.map((restaurant, index) => (
            <div key={restaurant.id} className={styles.resultCard}>
              <div className={styles.rank}>#{index + 1}</div>
              <div 
                className={styles.restaurantImage}
                style={{ 
                  backgroundImage: restaurant.image ? `url(${restaurant.image})` : 'none'
                }}
                onError={(e) => {
                  e.target.style.backgroundImage = 'none';
                }}
              >
                {!restaurant.image && (
                  <div style={{ fontSize: '24px' }}>🍽️</div>
                )}
              </div>
              <div className={styles.restaurantInfo}>
                <h2>{restaurant.name}</h2>
                <p className={styles.cuisine}>{restaurant.cuisine}</p>
                <p className={styles.location}>{restaurant.location}</p>
                <div className={styles.details}>
                  <span className={styles.rating}>⭐ {restaurant.rating}</span>
                  <span className={styles.price}>{restaurant.price}</span>
                </div>
                <p className={styles.address}>{restaurant.address}</p>
              </div>
              <div className={styles.voteInfo}>
                <div className={styles.voteCount}>
                  <span className={styles.likes}>👍 {restaurant.votes?.likes || 0}</span>
                  <span className={styles.dislikes}>👎 {restaurant.votes?.dislikes || 0}</span>
                </div>
                <div className={styles.score}>Score: {restaurant.score || 0}</div>
                <a 
                  href={restaurant.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.viewButton}
                >
                  View Details
                </a>
              </div>
            </div>
          ))}
        </div>
        <button 
          className={styles.newSessionButton}
          onClick={() => window.location.href = '/'}
          aria-label="Start a new voting session"
        >
          Start New Session
        </button>
      </div>
      <Image className={styles.resultsImage} src={background} alt="Results" width={100} height={100} />
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className={styles.container}>
      <div className={styles.loading}>Loading...</div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResultsPageContent />
    </Suspense>
  );
} 