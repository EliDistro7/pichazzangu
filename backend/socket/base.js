const socketIo = require('socket.io');
const postEvents = require('./events/postEvents');
const commentEvents = require('./events/commentEvents');
const messageEvents = require('./events/messageEvents'); // Import messageEvents
const roomEvents = require('./events/roomEvents');
const searchEvents = require('./events/searchEvents');
const audio2Events = require('./events/audio2');
const questionsEvents = require('./events/questionsEvents');
const answerEvents = require('./events/answerEvents');

const room2 = require('./events/room2');
const User = require("../models/userSchema.js");
const taggingUser = require('./events/taggingUser');
const audio3 = require('./events/audio3');

const getUserDetails = async (userId) => {
  return await User.findById(userId);  // Assuming you have a generic User schema/model
};

let io;
const userSockets = {}; // Object to store userId-socketId mapping
const roomSocketsMap = {}; // Object to store roomId-socketId mapping
const liveRoomsNow = [];

const activeRoomMembers = []
const onlineUsers = []; // Array to store online registered users
const guestUsers = []; // Array to store guest user socket IDs

function initSocket(server) {
  io = socketIo(server, {
    cors: {
      origin: process.env.ORIGIN, // Adjust this to match your client-side domain
      methods: ['GET', 'POST'],
      pingInterval: 10000, // Set ping interval for detecting dead connections
      pingTimeout: 5000,   // Timeout to wait for pong response
    },
  });

  io.on('connection', (socket) => {
 

    // Handle guest users (unregistered users)
    socket.on('guestUser', () => {

      
      guestUsers.push(socket.id); // Add guest user to guestUsers array

      // Emit event to notify all clients that a guest user is online
      io.emit('guestUserConnected', { socketId: socket.id });

      // Acknowledge guest user connection
      socket.emit('guestUserAck', { status: 'ok' });
    });

    // Handle registered/logged-in users
    socket.on('loginUser', async ({ userId }) => {
     
      try {
        const userDetails = await getUserDetails(userId);

        if (userDetails) {
          // Notify the old session to log out if the user is already connected
          if (userSockets[userId]) {
            io.to(userSockets[userId]).emit('loggedOut');
            console.log(`User ${userId} logged out from socket ID: ${userSockets[userId]}`);
          }

            // Map userId to the new socket.id
  userSockets[userId] = socket.id;

  // Add the socket ID to the userDetails object
  const userWithSocket = {
    ...userDetails._doc,  // Spread user details (assuming it's a Mongoose document)
    socketId: socket.id   // Add the socket ID to the user object
  };

          onlineUsers.push(userWithSocket); // Add the user to the onlineUsers array
        

          // Emit event to all clients about the new online user
          io.emit('userConnected', { user: userWithSocket });

          // Acknowledge the login event
          socket.emit('loginUserAck', { status: 'ok', user: userDetails });
        } else {
     
          socket.emit('loginUserAck', { status: 'error', message: 'User not found' });
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
        socket.emit('loginUserAck', { status: 'error', message: 'Error retrieving user data' });
      }
    });

    socket.on('createRoom',async ({roomId})=>{
      let userId=roomId;
      console.log('is creating room with is', userId)
     
        try {
          if(roomSocketsMap[userId]) return;
          
          const userDetails = await getUserDetails(userId);
          userDetails.password = undefined;
  
              // Map userId to the new socket.id
             

    roomSocketsMap[userId] = [socket.id,{ socket:socket.id, userId:userId, ...userDetails._doc, isSpeaker:true}];
    io.to(userSockets[userId]).emit('assignedRole', { role: 'speaker' });
    
    console.log("RoomSocketsMap", roomSocketsMap);
  
    // Add the socket ID to the userDetails object
    const userWithRoomSocket = {
      ...userDetails._doc,  // Spread user details (assuming it's a Mongoose document)
      socketId: socket.id   // Add the socket ID to the user object
    };
  
            activeRoomMembers.push(userWithRoomSocket); // Add the user to the onlineUsers array
            io.to(roomSocketsMap[userId][0]).emit('assignedRole', { role: 'speaker' });

            // Emit to the room that a user has joined and update the list of users in the room
           io.to(roomSocketsMap[roomId][0]).emit('updateRoomUsers', roomSocketsMap[userId]);
            
          
        } catch (error) {
          console.error('Error fetching user details:', error);
          socket.emit('loginUserAck', { status: 'error', message: 'Error retrieving user data' });
        }
      

    })

    // Handle the event to check for online users
    socket.on('checkOnlineUsers', () => {
      // Respond with both registered and guest online users
      socket.emit('onlineUsersResponse', { registeredUsers: onlineUsers, guestUsers });
    });
    socket.on('checkLiveGroups', () => {
         // Respond with both registered and guest online users
      socket.emit('liveGroupsResponse', { liveGroupsNow: roomSocketsMap });
    });

    // Initialize message-related events
    messageEvents(io, socket, userSockets);
  //  roomEvents(io, socket, userSockets);
    // Initialize post-related events
    postEvents(io, socket, userSockets);
    searchEvents(io, socket, userSockets);
    // Initialize comment-related events
    commentEvents(io, socket, userSockets);
   // taggingUser(io, socket);
    audio3(io, socket, userSockets)
   // room2(io, socket, userSockets, roomSocketsMap);

    questionsEvents(io, socket, userSockets);
   // answerEvents(io, socket, userSockets);
    // Handle user disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);

      // Find and remove the disconnected user's socketId from the mapping
      for (const userId in userSockets) {
        if (userSockets[userId] === socket.id) {
      
          delete userSockets[userId]; // Clean up the mapping on disconnect
          // Remove user from the onlineUsers array
          onlineUsers.splice(onlineUsers.findIndex(u => u._id === userId), 1);
          break; // Exit the loop once the user is found and removed
        }
      }

      // Remove guest user from the guestUsers array
      const guestIndex = guestUsers.indexOf(socket.id);
      if (guestIndex !== -1) {
        guestUsers.splice(guestIndex, 1);
      }

      // Emit an event to notify all clients about the disconnection
      io.emit('userDisconnected', { socketId: socket.id });
    });
  });

  return io; // Return the initialized socket instance
}

// Function to get the current io instance
function getIo() {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}

module.exports = {
  initSocket,
  getIo,
};
