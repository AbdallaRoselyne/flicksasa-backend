require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const kycRoutes = require('./routes/kycRoutes');
const movieRoutes = require('./routes/movieRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Import the admin routes

const PORT = process.env.PORT || 5000;

// Initialize express app
const app = express();

// Create an HTTP server and pass the Express app
const server = http.createServer(app);

// Attach socket.io to the server
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow your client origin
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

global.io = io;
// Use bodyParser to parse application/json content-type
app.use(bodyParser.json());

app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
    console.log('MongoDB Connected');
  })
  .catch(err => console.log(err));

// Define your routes
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/movies', movieRoutes); // Add the movie routes
app.use('/api/admin', adminRoutes);  // Add the admin routes
app.get('/', (req, res) => res.send('Hello World with MERN!'));

// Handling Socket.IO connections
io.on('connection', (socket) => {
  console.log('Client connected');

  // Handling disconnection
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected due to ${reason}`);
  });

  // Handle any Socket.IO errors
  socket.on('error', (error) => {
    console.error('Socket.IO Error', error);
  });
});

// Listen on a port with the HTTP server, not the Express app
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
