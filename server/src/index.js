require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { migrate } = require('./migrate');

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach io to app so routes can emit events
app.set('io', io);

io.on('connection', (socket) => {
  // Client joins a room for a specific ticket
  socket.on('join_ticket', (ticketId) => {
    socket.join(`ticket:${ticketId}`);
  });

  socket.on('leave_ticket', (ticketId) => {
    socket.leave(`ticket:${ticketId}`);
  });

  // Broadcast typing indicator to others in the same ticket room
  socket.on('typing', ({ ticketId, role }) => {
    socket.to(`ticket:${ticketId}`).emit('typing', { role });
  });
});

migrate()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Migration failed, server not started:', err.message);
    process.exit(1);
  });
