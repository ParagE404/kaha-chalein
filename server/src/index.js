const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for Express
app.use(cors());

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

  for (const [restaurantId, votes] of session.votes) {
    const score = votes.likes - votes.dislikes;
    const restaurant = dummyRestaurants.find(r => r.id === restaurantId);
    if (restaurant) {
      restaurantScores.set(restaurantId, {
        ...restaurant,
        score,
        votes
      });
    }
  }

  // Sort restaurants by score
  return Array.from(restaurantScores.values())
    .sort((a, b) => b.score - a.score);
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
    
    // Filter restaurants based on cuisine types if provided
    let filteredRestaurants = dummyRestaurants;
    if (types && types.length > 0) {
      filteredRestaurants = dummyRestaurants.filter(restaurant => 
        types.some(type => 
          restaurant.cuisine.toLowerCase().includes(type.toLowerCase())
        )
      );
    }

    // If no restaurants match the filters, return all restaurants
    if (filteredRestaurants.length === 0) {
      filteredRestaurants = dummyRestaurants;
    }

    res.json(filteredRestaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

// Results endpoint
app.get('/api/results', (req, res) => {
  const { session } = req.query;
  const sessionData = sessions.get(session);
  
  if (!sessionData) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const results = calculateResults(sessionData);
  res.json(results);
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

  socket.on('createSession', ({ userId, userName }) => {
    const sessionId = generateSessionId();
    const session = {
      id: sessionId,
      users: [{
        id: userId,
        name: userName,
        hasVoted: false,
        socketId: socket.id
      }],
      restaurants: [],
      votes: new Map()
    };
    sessions.set(sessionId, session);
    socket.join(sessionId);
    console.log(`Session created: ${sessionId} by user ${userName}`);
    
    // Emit initial session state
    socket.emit('sessionCreated', { 
      sessionId,
      totalUsers: 1,
      votedUsers: 0,
      votedUsersList: []
    });
  });

  socket.on('joinSession', ({ sessionId, userId, userName }) => {
    const session = sessions.get(sessionId);
    if (!session) {
      socket.emit('error', { message: 'Session not found' });
      return;
    }

    if (session.users.length >= 10) {
      socket.emit('error', { message: 'Session is full' });
      return;
    }

    const user = {
      id: userId,
      name: userName,
      hasVoted: false,
      socketId: socket.id
    };
    session.users.push(user);
    socket.join(sessionId);
    console.log(`User ${userName} joined session ${sessionId}`);
    
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

  socket.on('vote', ({ sessionId, restaurantId, vote, userId }) => {
    const session = sessions.get(sessionId);
    if (!session) {
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

    // Mark user as voted
    const user = session.users.find(u => u.id === userId);
    if (user) {
      user.hasVoted = true;
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

    // Check if all users have voted
    if (votedUsers.length === session.users.length) {
      console.log('All users have voted, calculating results...');
      const results = calculateResults(session);
      io.to(sessionId).emit('resultsReady', results);
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
        
        // If session is empty, remove it
        if (session.users.length === 0) {
          sessions.delete(sessionId);
        } else {
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
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 