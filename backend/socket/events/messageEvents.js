// In your socket handling code
const Message = require('../../models/messageSchema.js');

const createMessage = async ({
    recipientId,
    senderId,
    content,
    name
}) => {
     try {
        const message = new Message({
            recipientId: recipientId,
            senderId: senderId,
            content: content,
            name: name,
        })
        await message.save();

     }catch (e) {
        console.log(e)
     }
}


module.exports = (io, socket, userSockets) => {
  // Handle sendMessage event
  socket.on('sendMessage', (message) => {
      const { senderId, recipientId, content,name } = message;

      // Log the message details
      console.log(`Message from ${senderId} to ${recipientId}: ${content}`, message);
     // console.log('user sockets', userSockets)

      // Check if the recipient is online
      const recipientSocketId = userSockets[recipientId];
      if (recipientSocketId) {
          // Emit the message to the recipient
          io.to(recipientSocketId).emit('message-received',message);

         /* createMessage({ senderId, recipientId, content,name }) */;

      } else {
          console.log(`Recipient ${recipientId} is not online.`);
      }
  });
};
