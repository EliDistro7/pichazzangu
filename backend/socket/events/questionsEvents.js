




const Question = require('../../models/questionSchema.js');
const Answer = require('../../models/post/answerSchema.js');
const Reply = require('../../models/post/replySchema.js');
const Notification = require('../../models/notificationSchema.js');
const User = require('../../models/userSchema.js');


// Helper function to get the username based on userId
const getUsernameById = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (user) {
      return user.username;
    } else {
      throw new Error('User not found');
    }
  } catch (err) {
    console.error('Error fetching username:', err);
    return null; // or some default value like 'Unknown User'
  }
};

const notifyQuestionOwner = async (questionOwnerId, event, eventData) => {
  const targetSocketId = userSockets[questionOwnerId];
  if (targetSocketId) {
    io.to(targetSocketId).emit(event, eventData);
  }
};
module.exports = function questionEvents(io, socket, userSockets) {
  // Helper function to notify question owners if they're connected
  const notifyQuestionOwner = async (questionOwnerId, event, eventData) => {
    const targetSocketId = userSockets[questionOwnerId];
    if (targetSocketId) {
      io.to(targetSocketId).emit(event, eventData);
    }
  };


  // Create a notification
  const createNotification = async ({
    recipientId,
    type,
    message,
    questionId = null,
    answerId = null,
    senderId = null,
  }) => {
    try {
      console.log('questionId', questionId);
      const notification = new Notification({
        recipient: recipientId,
        sender: senderId,
        type,
        message,
        questionId,
        answerId,
      });
      await notification.save();
    } catch (err) {
      console.error('Error saving notification:', err);
    }
  };

  // Upvote an answer
  socket.on('upvoteAnswer', async ({ answerId, userId, questionOwnerId,questionId }) => {
    try {
      const answer = await Answer.findById(answerId);
      if (!answer.upVotes.includes(userId)) {
        answer.upVotes.push(userId);
        answer.downvotes = answer.downvotes.filter(id => id.toString() !== userId); // Remove downvote if present
        await answer.save();

        // Emit acknowledgment to the user who upvote
        socket.emit('upvoteAnswerAck', { status: 'ok', data: {...answer.toObject()} });

        // Notify the question owner
        notifyQuestionOwner(questionOwnerId, 'answerUpvoted', { answerId, userId });

        let name = await getUsernameById(userId);
  console.log('we are about to create a notification, questionOwnerId is', questionOwnerId);
        // Create notification for the question owner
        createNotification({
          recipientId: questionOwnerId,
          type: 'upvote_answer',
          message: `${name} upvoted your answer.`,
          questionId,
          answerId,
          senderId: userId,
        });
      }
    } catch (err) {
      socket.emit('upvoteAnswerAck', { status: 'error', message: 'Failed to upvote answer.' });
    }
  });

  // Downvote an answer
  socket.on('downvoteAnswer', async ({ answerId, userId, questionId,questionOwnerId }) => {
    try {
      const answer = await Answer.findById(answerId);
      if (!answer.downvotes.includes(userId)) {
        answer.downvotes.push(userId);
        answer.upVotes = answer.upVotes.filter(id => id.toString() !== userId); // Remove upvote if present
        await answer.save();

        // Emit acknowledgment to the user who downvoted
        socket.emit('downvoteAnswerAck', { status: 'ok', data: answer });

        // Notify the question owner
        notifyQuestionOwner(questionOwnerId, 'answerDownvoted', { answerId, userId });

        let name = await getUsernameById(userId);
   console.log('answer upvoted, questionid', questionId)
        // Create notification for the question owner
        createNotification({
          recipientId: questionOwnerId,
          type: 'downvote_answer',
          questionId,
          message: `${name} downvoted your answer.`,
          answerId,
          senderId: userId,
        });
      }
    } catch (err) {
      socket.emit('downvoteAnswerAck', { status: 'error', message: 'Failed to downvote answer.' });
    }
  });

  // Mark an answer as accepted
  socket.on('acceptAnswer', async ({ answerId, questionOwnerId }) => {
    try {
      const answer = await Answer.findById(answerId);
      if (answer) {
        answer.isAccepted = true;
        await answer.save();

        // Emit acknowledgment to the user who accepted the answer
        socket.emit('acceptAnswerAck', { status: 'ok', data: answer });

        // Notify the question owner
        notifyQuestionOwner(questionOwnerId, 'answerAccepted', { answerId });

        // Create notification for the question owner
        createNotification({
          recipientId: questionOwnerId,
          type: 'answer_accepted',
          message: `Your answer has been accepted.`,
          answerId,
        });
      }
    } catch (err) {
      socket.emit('acceptAnswerAck', { status: 'error', message: 'Failed to accept answer.' });
    }
  });

  // Delete an answer (soft delete)
  socket.on('deleteAnswer', async ({ answerId, questionOwnerId }) => {
    try {
      const answer = await Answer.findById(answerId);
      if (answer) {
        answer.status = 'deleted';
        await answer.save();

        // Emit acknowledgment to the user who deleted the answer
        socket.emit('deleteAnswerAck', { status: 'ok', data: answer });

        // Notify the question owner
        notifyQuestionOwner(questionOwnerId, 'answerDeleted', { answerId });

        // Create notification for the question owner
        createNotification({
          recipientId: questionOwnerId,
          type: 'answer_deleted',
          message: `An answer has been deleted.`,
          answerId,
        });
      }
    } catch (err) {
      socket.emit('deleteAnswerAck', { status: 'error', message: 'Failed to delete answer.' });
    }
  });

  // Upvote a question
  socket.on('upvoteQuestion', async ({ questionId, userId, questionOwnerId }) => {
    try {
      console.log('Upvote a question');
      const question = await Question.findById(questionId);
      if (!question.upvotes.includes(userId)) {
        question.upvotes.push(userId);
        question.downvotes = question.downvotes.filter(id => id.toString() !== userId);
        await question.save();

        socket.emit('upvoteQuestionAck', { status: 'ok', data: question });

        notifyQuestionOwner(questionOwnerId, 'questionUpvoted', { questionId, userId });

        let name = await getUsernameById(userId)

        // Create notification for the question owner
        createNotification({
          recipientId: questionOwnerId,
          type: 'upvote_question',
          message: `${name} upvoted your question.`,
          questionId,
          senderId: userId,
        });
      }
      console.log('succesfully added upvote')
    } catch (err) {
      socket.emit('upvoteQuestionAck', { status: 'error', message: 'Failed to upvote question.' });
    }
  });

  // Downvote a question
  socket.on('downvoteQuestion', async ({ questionId, userId, questionOwnerId }) => {
    try {
      const question = await Question.findById(questionId);
      if (!question.downvotes.includes(userId)) {
        question.downvotes.push(userId);
        question.upvotes = question.upvotes.filter(id => id.toString() !== userId);
        await question.save();

        socket.emit('downvoteQuestionAck', { status: 'ok', data: question });

        notifyQuestionOwner(questionOwnerId, 'questionDownvoted', { questionId, userId });

        let name = await getUsernameById(userId);

        // Create notification for the question owner
        createNotification({
          recipientId: questionOwnerId,
          type: 'downvote_question',
          message: `${name} downvoted your question.`,
          questionId,
          senderId: userId,
        });
      }
    } catch (err) {
      socket.emit('downvoteQuestionAck', { status: 'error', message: 'Failed to downvote question.' });
    }
  });


  socket.on('answerQuestion', async ({ questionId, userId, content, media, questionOwnerId }) => {
    try {
      // Step 1: Create a new answer document;

      let name = await getUsernameById(userId);

      const newAnswer = new Answer({
        author: userId, // Assuming userId is the author
        questionId: questionId, // Link the answer to the question
        content: content, // Answer content
        media: media || '', // Optional media field
        upVotes: [], // Initially, no upvotes
        downvotes: [], // Initially, no downvotes
        username: name,
        isAccepted: false, // By default, not accepted
        status: 'active', // Default status
      });
  
      // Save the new answer to the database
      const savedAnswer = await newAnswer.save();
  
      // Step 2: Add the answerId to the corresponding question document
      const question = await Question.findById(questionId);
      if (!question.answers.includes(savedAnswer._id)) {
        question.answers.push(savedAnswer._id);
        await question.save();

       
  
        // Step 3: Emit acknowledgment event back to the client
        socket.emit('answerQuestionAck', { status: 'ok', data: {...savedAnswer.toObject(),username:name} });
  
        // Step 4: Notify the question owner
        notifyQuestionOwner(questionOwnerId, 'questionAnswered', { questionId, answerId: savedAnswer._id, userId });
             let username = await getUsernameById(userId);
        // Create a notification for the question owner
        createNotification({
          recipientId: questionOwnerId,
          type: 'answer',
          message: `${username} answered your question.`,
          questionId,
          answerId: savedAnswer._id,
          senderId: userId,
        });
      } else {
        // Emit acknowledgment if the answer is already linked
        socket.emit('answerQuestionAck', { status: 'already_exists', message: 'Answer already exists for this question.' });
      }
    } catch (err) {
      console.error(err);
      socket.emit('answerQuestionAck', { status: 'error', message: 'Failed to answer the question.' });
    }
  });
  

  // Boost a question
  socket.on('boostQuestion', async ({ questionId, userId, questionOwnerId }) => {
    try {
      const question = await Question.findById(questionId);
      if (!question.boosted) {
        question.boosted = true;
        question.boostCount += 1;
        await question.save();

        socket.emit('boostQuestionAck', { status: 'ok', questionId, userId });

        notifyQuestionOwner(questionOwnerId, 'questionBoosted', { questionId, userId });

        // Create notification for the question owner
        createNotification({
          recipientId: questionOwnerId,
          type: 'question_boosted',
          message: `${userId} boosted your question.`,
          questionId,
          senderId: userId,
        });
      }
    } catch (err) {
      socket.emit('boostQuestionAck', { status: 'error', message: 'Failed to boost question.' });
    }
  });

  // View a question
// View a question
socket.on('viewQuestion', async ({ questionId, userId }) => {
  try {
    // Logic for handling question view (e.g., updating view count)
    const question = await Question.findById(questionId);
    //console.log('we got question', question);

    // Check if the user has already viewed the question
    if (!question.views.includes(userId)) {
      //question.views += 1; // Increment view count
      question.views.push(userId); // Add userId to the list of viewers
      await question.save();

      socket.emit('viewQuestionAck', { status: 'ok', questionId });

      // Notify the question owner (optional)
      notifyQuestionOwner(question.author, 'questionViewed', { questionId, userId });

      let viewerName = await getUsernameById(userId);
      // Create notification for the question owner
      createNotification({
        recipientId: question.author, // Assuming question has an 'owner' field
        type: 'view_question',
        message: `${viewerName} viewed your update.`,
        questionId,
        senderId: userId,
      });
      console.log('view added succesfully')
    } else {
      // User already viewed the question, no need to increment view count again
      socket.emit('viewQuestionAck', { status: 'already_viewed', message: 'Question already viewed.' });
    }
  } catch (err) {
    console.log('error', err)
    socket.emit('viewQuestionAck', { status: 'error', message: 'Failed to view question.' });
  }
});


  socket.on('addReply', async ({ content, answerId, userId, questionId, media,questionOwnerId  }) => {
    try {
      const author = await User.findById(userId);
      console.log('content for add reply', {content, answerId, userId, media, questionId, media, questionOwnerId})
      if (!author) throw new Error('User not found');
       
      
      console.log('author found');
      console.log('user Id', answerId)
      // Get answer object
      // Create new reply document
      const newReply = new Reply({
        author: userId,
        username: author.username,
        questionId: questionId,
        answerId: answerId, // Link the reply to the answer
        content: content,
        upvotes:[],
        downvotes: [], // Initially, no downvotes
        media: media || null, // Optional media field
      });
      console.log('new reply created', newReply);

      await newReply.save();

      console.log('reply saved');

      // Emit acknowledgment to the user who added the reply
      socket.emit('addReplyAck', { status: 'ok', data: {...newReply.toObject()} });

      // Notify the question or answer owner
     
      if (questionOwnerId) {
        console.log('question owner found');
        notifyQuestionOwner(questionOwnerId, 'newReply', {
          replyId: newReply._id,
          userId: author._id,
        });

        let replierName = await getUsernameById(userId);

        // Create notification for the question owner
        createNotification({
          recipientId: questionOwnerId,
          type: 'reply',
          questionId:questionId,
          message: `${replierName} replied to your answer.`,
          answerId: answerId,
          senderId: userId,
        });
      }
      console.log('reply added successfully')
    } catch (err) {
      socket.emit('addReplyAck', { status: 'error', message: 'Failed to add reply.' });
    }
  });
};

