'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io } from 'socket.io-client';
import styles from '../styles/cards.module.css';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import RestaurantImage from '@/components/RestaurantImage/RestaurantImage';
import Image from 'next/image';
import background from '@/assets/cards/background.svg';

function CardsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const [socket, setSocket] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [voteStatus, setVoteStatus] = useState({});
  const [hasVoted, setHasVoted] = useState(false);
  const [remainingVotes, setRemainingVotes] = useState(0);
  const [votingProgress, setVotingProgress] = useState({ totalUsers: 0, votedUsers: 0, votedUsersList: [] });
  const [waitingTimeout, setWaitingTimeout] = useState(null);
  
  const cardRef = useRef(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      router.push('/');
      return;
    }

    let socket;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connectSocket = () => {
      socket = io(process.env.NEXT_PUBLIC_BACKEND_URL, {
        withCredentials: false,
        transports: ['websocket', 'polling'],
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        timeout: 20000,
        forceNew: true
      });

      socket.on('connect', () => {
        reconnectAttempts = 0;
        
        // Get user data from localStorage
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        
        if (sessionId) {
          // Join existing session
          socket.emit('joinSession', {
            sessionId,
            userData: {
              name: userData.name || 'Anonymous'
            }
          });
        } else {
          // Create new session
          socket.emit('createSession', {
            userData: {
              name: userData.name || 'Anonymous'
            }
          });
        }
      });

      socket.on('connect_error', (error) => {
        reconnectAttempts++;
        
        if (reconnectAttempts >= maxReconnectAttempts) {
          setError('Failed to connect to server after multiple attempts. Please refresh the page.');
        } else {
          setError('Connecting to server...');
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          socket.connect();
        }
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Reconnection attempt:', attemptNumber);
      });

      socket.on('reconnect_failed', () => {
        console.error('Failed to reconnect to server');
        setError('Failed to reconnect to server. Please refresh the page.');
      });

      // Socket event handlers
      socket.on('sessionCreated', ({ sessionId: newSessionId }) => {
        console.log('Session created:', newSessionId);
        // Update URL with new session ID
        router.push(`/cards?session=${newSessionId}`);
      });

      socket.on('userJoined', ({ user, totalUsers, votedUsers, votedUsersList }) => {
        console.log('User joined:', user, 'Total users:', totalUsers);
        setVotingProgress({
          totalUsers,
          votedUsers,
          votedUsersList
        });
      });

      socket.on('userLeft', ({ userId, totalUsers, votedUsers, votedUsersList }) => {
        console.log('User left:', userId, 'Total users:', totalUsers);
        setVotingProgress({
          totalUsers,
          votedUsers,
          votedUsersList
        });
      });

      socket.on('voteUpdate', ({ restaurantId, votes }) => {
        console.log('Vote update received:', { restaurantId, votes });
        setVoteStatus(prev => ({
          ...prev,
          [restaurantId]: votes
        }));
      });

      socket.on('votingProgress', ({ totalUsers, votedUsers, votedUsersList }) => {
        console.log('Voting progress:', { totalUsers, votedUsers, votedUsersList });
        setVotingProgress({ totalUsers, votedUsers, votedUsersList });
        setRemainingVotes(totalUsers - votedUsers);
      });

      socket.on('resultsReady', (results) => {
        console.log('Results ready:', results);
        if (waitingTimeout) {
          clearTimeout(waitingTimeout);
        }
        // Store results in localStorage for the results page
        localStorage.setItem('votingResults', JSON.stringify(results));
        router.push(`/results?session=${sessionId}`);
      });

      socket.on('error', ({ message }) => {
        console.error('Socket error:', message);
        setError(message);
        // If session not found, redirect to home
        if (message === 'Session not found') {
          router.push('/');
        }
      });

      // Add session state handler
      socket.on('sessionState', ({ restaurants: sessionRestaurants, votes }) => {
        console.log('Received session state:', { sessionRestaurants, votes });
        if (sessionRestaurants && sessionRestaurants.length > 0) {
          setRestaurants(sessionRestaurants);
          setIsLoading(false);
        }
      });

      // Add restaurants updated handler
      socket.on('restaurantsUpdated', ({ restaurants: newRestaurants }) => {
        console.log('Restaurants updated:', newRestaurants);
        setRestaurants(newRestaurants);
        setCurrentIndex(0);
        setHasVoted(false);
        setIsLoading(false);
      });

      setSocket(socket);
    };

    connectSocket();

    // Fetch restaurants only if we don't have them in the session
    if (!restaurants.length) {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const selectedTypes = JSON.parse(localStorage.getItem('selectedTypes') || '[]');
      
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/restaurants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          types: selectedTypes,
          location: userData.location || 'Mumbai'
        })
      })
      .then(res => res.json())
      .then(data => {
        if (!data || data.error) {
          throw new Error(data.error || 'Failed to fetch restaurants');
        }
        // Set restaurants in the session
        return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/session/restaurants`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            restaurants: data
          })
        })
        .then(() => {
          setRestaurants(data);
          setIsLoading(false);
        });
      })
      .catch(err => {
        console.error('Error:', err);
        setError(err.message || 'Failed to load restaurants');
        setIsLoading(false);
      });
    }

    return () => {
      if (waitingTimeout) {
        clearTimeout(waitingTimeout);
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, [sessionId, router]);

  // Set timeout when user finishes voting
  useEffect(() => {
    if (hasVoted) {
      const timeout = setTimeout(() => {
        setError('Waiting too long for other users. Redirecting to results...');
        // Fetch results directly if timeout occurs
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/results?session=${sessionId}`)
          .then(res => res.json())
          .then(results => {
            if (results && !results.error) {
              localStorage.setItem('votingResults', JSON.stringify(results));
              router.push(`/results?session=${sessionId}`);
            } else {
              throw new Error(results.error || 'Failed to get results');
            }
          })
          .catch(err => {
            console.error('Error fetching results:', err);
            setError('Failed to get results. Please try again.');
          });
      }, 30000); // 30 second timeout
      setWaitingTimeout(timeout);
    }
  }, [hasVoted, sessionId, router]);

  const handleVote = (vote) => {
    if (!socket || currentIndex >= restaurants.length) return;

    const restaurant = restaurants[currentIndex];
    
    socket.emit('vote', {
      sessionId,
      restaurantId: restaurant.id,
      vote
    });

    // Move to next card
    setCurrentIndex(prev => prev + 1);

    // If this was the last card, mark as voted
    if (currentIndex === restaurants.length - 1) {
      setHasVoted(true);
    }
  };

  // Touch and mouse event handlers
  const handleStart = (clientX) => {
    isDragging.current = true;
    startX.current = clientX;
    currentX.current = clientX;
    if (cardRef.current) {
      cardRef.current.style.transition = 'none';
    }
  };

  const handleMove = (clientX) => {
    if (!isDragging.current) return;
    
    currentX.current = clientX;
    const deltaX = currentX.current - startX.current;
    
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.1}deg)`;
      
      // Show swipe indicators
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          cardRef.current.setAttribute('data-swipe', 'right');
        } else {
          cardRef.current.setAttribute('data-swipe', 'left');
        }
      } else {
        cardRef.current.removeAttribute('data-swipe');
      }
    }
  };

  const handleEnd = () => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    const deltaX = currentX.current - startX.current;
    
    if (cardRef.current) {
      cardRef.current.removeAttribute('data-swipe');
      cardRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      cardRef.current.style.transform = '';
    }

    // Determine if swipe was significant enough
    if (Math.abs(deltaX) > 100) {
      handleVote(deltaX > 0);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
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

  if (currentIndex >= restaurants.length){
    const progressPercentage = votingProgress.totalUsers > 0 
      ? (votingProgress.votedUsers / votingProgress.totalUsers) * 100 
      : 0;

    return (
      <div className={styles.container}>
        {/* <div className={styles.noMoreCards}>
          <h2 className={styles.noMoreCardsTitle}>No more restaurants to vote on!</h2>
          {hasVoted ? (
            <>
              <p>Waiting for {remainingVotes} more {remainingVotes === 1 ? 'person' : 'people'} to finish voting...</p>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progress} 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className={styles.votingProgress}>
                <p className={styles.progressText}>
                  {votingProgress.votedUsers} of {votingProgress.totalUsers} users have voted
                </p>
                {votingProgress.votedUsersList.length > 0 && (
                  <div className={styles.votedUsers}>
                    <p>Users who have voted:</p>
                    <ul>
                      {votingProgress.votedUsersList.map((user, index) => (
                        <li key={index}>{user}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p>Please vote on all restaurants to continue.</p>
          )}
        </div> */}
        <div className={styles.loadingText}>Loading</div>
        <Image className={styles.resultsImage} src={background} alt="Results" width={100} height={100} />
      </div>
    );
  }

  const currentRestaurant = restaurants[currentIndex];

  return (
    <div className={styles.container}>
      {/* Progress indicator */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${((currentIndex + 1) / restaurants.length) * 100}%` }}
          />
        </div>
        <span className={styles.progressText}>
          {currentIndex + 1} of {restaurants.length}
        </span>
      </div>

      <div className={styles.cardContainer}>
        <div
          ref={cardRef}
          className={styles.card}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX)}
          onTouchEnd={handleEnd}
          onMouseDown={(e) => handleStart(e.clientX)}
          onMouseMove={(e) => handleMove(e.clientX)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          role="button"
          tabIndex={0}
          aria-label={`Restaurant card for ${currentRestaurant.name}. Swipe left to pass, swipe right to like.`}
        >
          <div className={styles.cardImage}>
            <RestaurantImage 
              src={currentRestaurant.image} 
              alt={currentRestaurant.name}
              restaurantName={currentRestaurant.name}
            />
          </div>
          <div className={styles.cardContent}>
            <h2>{currentRestaurant.name}</h2>
            <p className={styles.cuisine}>{currentRestaurant.cuisine}</p>
            <p className={styles.location}>{currentRestaurant.location}</p>
            <div className={styles.details}>
              <span className={styles.rating}>⭐ {currentRestaurant.rating}</span>
              <span className={styles.price}>{currentRestaurant.price}</span>
            </div>
            <p className={styles.address}>{currentRestaurant.address}</p>
          </div>
        </div>
      </div>
      
      {/* Swipe instructions */}
      <div className={styles.instructions}>
        <div className={styles.instructionItem}>
          <span className={styles.swipeIcon}>👈</span>
          <span>Swipe left to pass</span>
        </div>
        <div className={styles.instructionItem}>
          <span className={styles.swipeIcon}>👉</span>
          <span>Swipe right to like</span>
        </div>
      </div>

      <Footer/>
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

export default function CardsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CardsPageContent/>
    </Suspense>
  );
} 