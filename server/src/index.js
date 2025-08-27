const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Client } = require('@googlemaps/google-maps-services-js');

const app = express();
const server = http.createServer(app);

// Configure CORS for Express
app.use(cors());

// Initialize Google Maps client
const googleMapsClient = new Client({});

// Check for required environment variables
const GOOGLE_MAPS_API_KEY = "AIzaSyD94-91tak0yVy4cFjHqX1_-Jy5wANoSkw"
if (!GOOGLE_MAPS_API_KEY) {
  console.error('GOOGLE_MAPS_API_KEY is not set in environment variables');
  process.exit(1);
}

// Configure Socket.IO with CORS and better connection handling
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  connectTimeout: 45000
});

// Handle connection errors
io.engine.on("connection_error", (err) => {
  console.log('Connection error:', err);
});

app.use(express.json());

// Image proxy endpoint to help with rate limiting
app.get('/api/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url || !url.includes('googleapis.com')) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }

    // Set cache headers
    res.set({
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Content-Type': 'image/jpeg'
    });

    // Fetch image from Google
    const fetch = require('node-fetch');
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Pipe the image data to the response
    response.body.pipe(res);
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

// Helper function to generate session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2, 8);
}

// Helper function to get session info
function getSessionInfo(session) {
  return {
    id: session.id,
    users: session.users,
    isFull: session.users.length >= 10
  };
}

// Helper function to calculate results
function calculateResults(session) {
  const restaurantScores = new Map();

  // Initialize scores for all restaurants
  session.restaurants.forEach(restaurant => {
    restaurantScores.set(restaurant.id, {
      ...restaurant,
      score: 0,
      votes: {
        likes: 0,
        dislikes: 0
      }
    });
  });

  // Calculate scores from votes
  for (const [restaurantId, votes] of session.votes) {
    const restaurant = restaurantScores.get(restaurantId);
    if (restaurant) {
      restaurant.votes = votes;
      restaurant.score = votes.likes - votes.dislikes;
    }
  }

  // Convert to array and sort by score
  const results = Array.from(restaurantScores.values())
    .sort((a, b) => b.score - a.score);

  console.log('Calculated results:', results);
  return results;
}

// Store active sessions
const sessions = new Map();

// Dummy restaurant data
const dummyRestaurants = [
  {
    id: '1',
    name: 'Spice Garden',
    location: 'Bandra West',
    cuisine: 'North Indian, Chinese',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=60',
    url: 'https://example.com/spice-garden',
    rating: 4.5,
    price: '₹₹',
    phone: '+91 98765 43210',
    address: '123 Linking Road, Bandra West, Mumbai'
  },
  {
    id: '2',
    name: 'Pizza Paradise',
    location: 'Andheri East',
    cuisine: 'Italian, Fast Food',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60',
    url: 'https://example.com/pizza-paradise',
    rating: 4.2,
    price: '₹₹',
    phone: '+91 98765 43211',
    address: '456 MG Road, Andheri East, Mumbai'
  },
  {
    id: '3',
    name: 'Sushi Master',
    location: 'Powai',
    cuisine: 'Japanese, Seafood',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&auto=format&fit=crop&q=60',
    url: 'https://example.com/sushi-master',
    rating: 4.7,
    price: '₹₹₹',
    phone: '+91 98765 43212',
    address: '789 Hiranandani Gardens, Powai, Mumbai'
  },
  {
    id: '4',
    name: 'Cafe Mocha',
    location: 'Colaba',
    cuisine: 'Cafe, Continental',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500&auto=format&fit=crop&q=60',
    url: 'https://example.com/cafe-mocha',
    rating: 4.3,
    price: '₹₹',
    phone: '+91 98765 43213',
    address: '321 Colaba Causeway, Colaba, Mumbai'
  },
  {
    id: '5',
    name: 'Taco Fiesta',
    location: 'Lower Parel',
    cuisine: 'Mexican, Street Food',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&auto=format&fit=crop&q=60',
    url: 'https://example.com/taco-fiesta',
    rating: 4.4,
    price: '₹₹',
    phone: '+91 98765 43214',
    address: '567 Phoenix Market City, Lower Parel, Mumbai'
  }
];

// Restaurant search endpoint
app.post('/api/restaurants', async (req, res) => {
  try {
    const { types, location } = req.body;
    
    // Default to Mumbai if no location provided
    const searchLocation = location || 'Mumbai';
    
    // Convert cuisine types to Google Places types
    const placeTypes = types.map(type => {
      const typeMap = {
        'north-indian': 'restaurant',
        'south-indian': 'restaurant',
        'chinese': 'restaurant',
        'italian': 'restaurant',
        'mexican': 'restaurant',
        'fast-food': 'restaurant',
        'cafe': 'cafe',
        'street-food': 'restaurant',
        'seafood': 'restaurant',
        'desserts': 'bakery',
        'beverages': 'bar',
        'continental': 'restaurant'
      };
      return typeMap[type] || 'restaurant';
    });

    // First, get coordinates for the location
    const geocodeResponse = await googleMapsClient.geocode({
      params: {
        address: searchLocation,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (!geocodeResponse.data.results.length) {
      throw new Error('Location not found');
    }

    const { lat, lng } = geocodeResponse.data.results[0].geometry.location;

    // Make request to Google Places API
    const response = await googleMapsClient.textSearch({
      params: {
        query: `${searchLocation} restaurants ${types.join(' ')}`,
        key: GOOGLE_MAPS_API_KEY,
        type: 'restaurant',
        location: `${lat},${lng}`,
        radius: 5000 // 5km radius
      }
    });

    // Get detailed information for each place
    const restaurants = await Promise.all(
      response.data.results.slice(0, 10).map(async (place) => {
        const details = await googleMapsClient.placeDetails({
          params: {
            place_id: place.place_id,
            key: GOOGLE_MAPS_API_KEY,
            fields: ['name', 'formatted_address', 'formatted_phone_number', 'rating', 'price_level', 'photos', 'types', 'website']
          }
        });

        const placeDetails = details.data.result;
        
        // Filter types to match selected cuisine types
        const matchingTypes = place.types.filter(type => 
          placeTypes.some(placeType => type.includes(placeType))
        );

        // Only include restaurants that match at least one selected type
        if (matchingTypes.length === 0) {
          return null;
        }
        
        // Generate image URL - client will handle failures gracefully
        let imageUrl = null;
        if (place.photos && place.photos[0]) {
          imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`;
        }

        return {
          id: place.place_id,
          name: place.name,
          location: place.vicinity,
          cuisine: matchingTypes.join(', '),
          image: imageUrl,
          url: placeDetails.website || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
          rating: place.rating || 0,
          price: '₹'.repeat(placeDetails.price_level || 1),
          phone: placeDetails.formatted_phone_number || '',
          address: placeDetails.formatted_address || place.vicinity
        };
      })
    );

    // Filter out null results and limit to 10 restaurants
    const filteredRestaurants = restaurants.filter(r => r !== null).slice(0, 10);

    res.json(filteredRestaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    if (error.response?.status === 403) {
      res.status(500).json({ error: 'Google Maps API key is invalid or missing. Please check your configuration.' });
    } else if (error.message === 'Location not found') {
      res.status(400).json({ error: 'Location not found. Please try a different location.' });
    } else {
      res.status(500).json({ error: 'Failed to fetch restaurants. Please try again later.' });
    }
  }
});

// Results endpoint
app.get('/api/results', (req, res) => {
  const { session } = req.query;
  const sessionData = sessions.get(session);
  
  if (!sessionData) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (!sessionData.results) {
    return res.status(404).json({ error: 'Results not ready yet' });
  }

  res.json(sessionData.results);
});

// Helper function to cleanup session
function cleanupSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    io.to(sessionId).emit('sessionEnded', { message: 'Session has ended' });
    sessions.delete(sessionId);
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createSession', ({ userData }) => {
    const sessionId = generateSessionId();
    const session = {
      id: sessionId,
      users: [{
        id: socket.id,
        name: userData?.name || 'Anonymous',
        hasVoted: false,
        socketId: socket.id
      }],
      restaurants: [],
      votes: new Map(),
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    sessions.set(sessionId, session);
    socket.join(sessionId);
    console.log(`Session created: ${sessionId} by user ${userData?.name || 'Anonymous'}`);
    
    // Emit initial session state
    socket.emit('sessionCreated', { 
      sessionId,
      totalUsers: 1,
      votedUsers: 0,
      votedUsersList: []
    });
  });

  socket.on('joinSession', ({ sessionId, userData }) => {
    console.log(`Attempting to join session ${sessionId} with user data:`, userData);
    
    const session = sessions.get(sessionId);
    if (!session) {
      console.log(`Session ${sessionId} not found`);
      socket.emit('error', { message: 'Session not found' });
      return;
    }

    if (session.users.length >= 10) {
      console.log(`Session ${sessionId} is full`);
      socket.emit('error', { message: 'Session is full' });
      return;
    }

    // Check if user is already in the session
    const existingUser = session.users.find(u => u.socketId === socket.id);
    if (existingUser) {
      console.log(`User ${userData.name} already in session ${sessionId}`);
      return;
    }

    const user = {
      id: socket.id,
      name: userData.name || 'Anonymous',
      hasVoted: false,
      socketId: socket.id,
      votedRestaurants: new Set() // Track which restaurants this user has voted on
    };
    session.users.push(user);
    socket.join(sessionId);
    console.log(`User ${user.name} joined session ${sessionId}`);
    
    // Send current session state to the new user
    socket.emit('sessionState', {
      restaurants: session.restaurants,
      votes: Array.from(session.votes.entries()),
      totalUsers: session.users.length,
      votedUsers: session.users.filter(u => u.hasVoted).length,
      votedUsersList: session.users.filter(u => u.hasVoted).map(u => u.name)
    });
    
    // Calculate current voting progress
    const votedUsers = session.users.filter(u => u.hasVoted);
    const votedUsersList = votedUsers.map(u => u.name);

    // Notify all users in the session about the new user and current state
    io.to(sessionId).emit('userJoined', { 
      user,
      totalUsers: session.users.length,
      votedUsers: votedUsers.length,
      votedUsersList
    });

    // Also emit voting progress update
    io.to(sessionId).emit('votingProgress', {
      totalUsers: session.users.length,
      votedUsers: votedUsers.length,
      votedUsersList
    });
  });

  socket.on('vote', ({ sessionId, restaurantId, vote }) => {
    console.log(`Received vote from socket ${socket.id} in session ${sessionId}`);
    
    const session = sessions.get(sessionId);
    if (!session) {
      console.log(`Session ${sessionId} not found for vote`);
      socket.emit('error', { message: 'Session not found' });
      return;
    }

    // Update vote count
    const currentVotes = session.votes.get(restaurantId) || { likes: 0, dislikes: 0 };
    if (vote) {
      currentVotes.likes++;
    } else {
      currentVotes.dislikes++;
    }
    session.votes.set(restaurantId, currentVotes);

    // Mark user as voted for this restaurant
    const user = session.users.find(u => u.socketId === socket.id);
    if (user) {
      user.votedRestaurants.add(restaurantId);
      // Check if user has voted on all restaurants
      user.hasVoted = user.votedRestaurants.size === session.restaurants.length;
      console.log(`User ${user.name} voted on restaurant ${restaurantId}`);
    }

    // Calculate voting progress
    const votedUsers = session.users.filter(u => u.hasVoted);
    const votedUsersList = votedUsers.map(u => u.name);

    // Emit vote update to all users in the session
    io.to(sessionId).emit('voteUpdate', { 
      restaurantId, 
      votes: currentVotes 
    });

    // Emit voting progress
    io.to(sessionId).emit('votingProgress', {
      totalUsers: session.users.length,
      votedUsers: votedUsers.length,
      votedUsersList
    });

    // Check if all users have voted on all restaurants
    if (votedUsers.length === session.users.length) {
      console.log('All users have voted, calculating results...');
      const results = calculateResults(session);
      console.log('Emitting results:', results);
      io.to(sessionId).emit('resultsReady', results);
      
      // Store results in session for later retrieval
      session.results = results;
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Remove user from all sessions they were in
    sessions.forEach((session, sessionId) => {
      const userIndex = session.users.findIndex(u => u.socketId === socket.id);
      if (userIndex !== -1) {
        const user = session.users[userIndex];
        console.log(`User ${user.name} left session ${sessionId}`);
        session.users.splice(userIndex, 1);
        
        // Update last activity time
        session.lastActivity = Date.now();
        
        // Only remove session if it's empty AND it's been inactive for more than 5 minutes
        if (session.users.length === 0 && (Date.now() - session.lastActivity > 5 * 60 * 1000)) {
          console.log(`Removing inactive session ${sessionId}`);
          sessions.delete(sessionId);
        } else if (session.users.length > 0) {
          // Calculate current voting progress
          const votedUsers = session.users.filter(u => u.hasVoted);
          const votedUsersList = votedUsers.map(u => u.name);

          // Notify remaining users about the user leaving and current state
          io.to(sessionId).emit('userLeft', { 
            userId: user.id,
            totalUsers: session.users.length,
            votedUsers: votedUsers.length,
            votedUsersList
          });

          // Also emit voting progress update
          io.to(sessionId).emit('votingProgress', {
            totalUsers: session.users.length,
            votedUsers: votedUsers.length,
            votedUsersList
          });
        }
      }
    });
  });

  // Add periodic session cleanup
  setInterval(() => {
    const now = Date.now();
    sessions.forEach((session, sessionId) => {
      // Remove sessions that have been inactive for more than 5 minutes
      if (now - session.lastActivity > 5 * 60 * 1000) {
        console.log(`Cleaning up inactive session ${sessionId}`);
        io.to(sessionId).emit('sessionEnded', { message: 'Session has ended due to inactivity' });
        sessions.delete(sessionId);
      }
    });
  }, 60 * 1000); // Check every minute

  // Add endpoint to set restaurants for a session
  app.post('/api/session/restaurants', (req, res) => {
    const { sessionId, restaurants } = req.body;
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.restaurants = restaurants;
    session.votes = new Map(); // Reset votes when new restaurants are set
    session.users.forEach(user => {
      user.hasVoted = false;
      user.votedRestaurants = new Set();
    });

    // Notify all users in the session about the new restaurants
    io.to(sessionId).emit('restaurantsUpdated', { restaurants });
    
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 