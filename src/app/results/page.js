'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from '../styles/results.module.css';

export default function ResultsPage() {
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

    fetch(`http://localhost:3001/api/results?session=${sessionId}`)
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

  return (
    <div className={styles.container}>
      <h1>Voting Results</h1>
      <div className={styles.resultsList}>
        {results.map((restaurant, index) => (
          <div key={restaurant.id} className={styles.resultCard}>
            <div className={styles.rank}>#{index + 1}</div>
            <div 
              className={styles.restaurantImage}
              style={{ backgroundImage: `url(${restaurant.image})` }}
            />
            <div className={styles.restaurantInfo}>
              <h2>{restaurant.name}</h2>
              <p className={styles.cuisine}>{restaurant.cuisine}</p>
              <p className={styles.location}>{restaurant.location}</p>
              <div className={styles.details}>
                <span className={styles.rating}>⭐ {restaurant.rating}</span>
                <span className={styles.price}>{restaurant.price}</span>
              </div>
              <div className={styles.votes}>
                <span className={styles.likes}>👍 {restaurant.votes.likes}</span>
                <span className={styles.dislikes}>👎 {restaurant.votes.dislikes}</span>
                <span className={styles.score}>Score: {restaurant.score}</span>
              </div>
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
    </div>
  );
} 