const Event = require("../models/eventSchema"); // Import the Event model
const bcrypt = require("bcrypt");

// ✅ Create a New Event
exports.createEvent = async (req, res) => {
  try {
    const { title, description, coverPhoto, imageUrls, videoUrls, author, private: isPrivate, password } = req.body;
    console.log('received body:', req.body);

    // Validate password if event is private
    let hashedPassword = null;
    if (isPrivate) {
      if (!password) {
        return res.status(400).json({ error: "Password is required for private events" });
      }
      let password1 = password.trim();
      hashedPassword = await bcrypt.hash(password1, 10);
    }

    const newEvent = new Event({
      title,
      description,
      coverPhoto, // Set cover photo URL
      imageUrls: imageUrls || [],
      videoUrls: videoUrls || [],
      author,
      private: isPrivate || false, // Default to public if not provided
      password: hashedPassword, // Set only if private
    });

    await newEvent.save();
    res.status(201).json({ message: "Event created successfully", event: newEvent });
  } catch (error) {
    console.log("Error creating event:", error);
    res.status(500).json({ error: "Server error while creating event" });
  }
};

exports.getAllEventsByUser= async(req, res) => {
 

  try {
    const { userId } = req.query;
    const events = await Event.find({ "author.userId": userId });
    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events." });
  }
}

// ✅ Update Event Media (Add New Images and Videos)// Controller for updating event media (add new images and videos)
exports.updateEventMedia = async (req, res) => {
  try {
    const { eventId, newImages, newVideos, userId } = req.body;
    console.log("Received update media request:", req.body);

    // Find the event by ID
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Compare provided userId with the event's author userId
    if (event.author.userId.toString() !== userId) {
      return res.status(403).json({ error: "Not authorized to update this event." });
    }

    // Append new images if provided
    if (newImages && newImages.length > 0) {
      console.log("Adding new images:", newImages);
      event.imageUrls.push(...newImages);
    }

    // Append new videos if provided
    if (newVideos && newVideos.length > 0) {
      console.log("Adding new videos:", newVideos);
      event.videoUrls.push(...newVideos);
    }

    await event.save();
    console.log("Updated event media successfully:", event);
    res.status(200).json({ message: "Event media updated successfully", event });
  } catch (error) {
    console.error("Error updating event media:", error);
    res.status(500).json({ error: "Server error while updating event media" });
  }
};

exports.getEventMedia = async (req, res) => {
  try {
    // Expecting eventId and mediaType as query parameters:
    // e.g., /api/event-media?eventId=123&mediaType=photo
    const { eventId, mediaType } = req.query;
    
    if (!eventId || !mediaType) {
      return res.status(400).json({ error: "Missing required parameters: eventId and mediaType" });
    }
    
    // Find the event by its ID
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    // Determine which media array to return based on mediaType.
    let mediaArray;
    if (mediaType.toLowerCase() === "video") {
      mediaArray = event.videoUrls;
    } else if (
      mediaType.toLowerCase() === "photo" ||
      mediaType.toLowerCase() === "image"
    ) {
      mediaArray = event.imageUrls;
    } else {
      return res.status(400).json({
        error: "Invalid mediaType provided. Use 'photo' (or 'image') or 'video'.",
      });
    }
    
    // Return the media array
    return res.status(200).json({ media: mediaArray });
  } catch (error) {
    console.error("Error retrieving event media:", error);
    return res.status(500).json({ error: "Server error while retrieving event media" });
  }
};
// Controller for updating event cover photo
exports.updateEventCoverPhoto = async (req, res) => {
  try {
    const { eventId, newCoverPhoto, userId } = req.body;
    console.log("Received cover photo update request:", req.body);

    // Find the event by ID
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Compare provided userId with the event's author userId
    if (event.author.userId.toString() !== userId) {
      return res.status(403).json({ error: "Not authorized to update this event." });
    }

    // Update the cover photo URL
    event.coverPhoto = newCoverPhoto;
    await event.save();
    console.log("Cover photo updated successfully:", event);
    res.status(200).json({ message: "Cover photo updated successfully", event });
  } catch (error) {
    console.error("Error updating cover photo:", error);
    res.status(500).json({ error: "Server error while updating cover photo" });
  }
};


// ✅ Get All Events
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

// ✅ Get a Single Event by ID
exports.getEventById = async (req, res) => {
  try {
    console.log('it reaches here, skipping')
    const { eventId } = req.params;
    const event = await Event.findById(eventId);

    if (!event) return res.status(404).json({ error: "Event not found" });

    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch event" });
  }
};

// ✅ Update an Event (Add New Images/Videos)
exports.updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { imageUrls, videoUrls, title, description } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Append new images and videos to existing arrays
    if (imageUrls) event.imageUrls.push(...imageUrls);
    if (videoUrls) event.videoUrls.push(...videoUrls);
    if (title) event.title = title;
    if (description) event.description = description;

    await event.save();
    res.status(200).json({ message: "Event updated successfully", event });
  } catch (error) {
    res.status(500).json({ error: "Failed to update event" });
  }
};

// ✅ Delete an Event
exports.deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const deletedEvent = await Event.findByIdAndDelete(eventId);

    if (!deletedEvent) return res.status(404).json({ error: "Event not found" });

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete event" });
  }
};

// ✅ Follow an Event
exports.followEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.body; // User ID of the follower

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Check if user is already following
    if (event.followers.includes(userId))
      return res.status(400).json({ error: "User already following this event" });

    event.followers.push(userId);
    await event.save();

    res.status(200).json({ message: "User followed the event", event });
  } catch (error) {
    res.status(500).json({ error: "Failed to follow event" });
  }
};

// ✅ Unfollow an Event
exports.unfollowEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.body; // User ID of the follower

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Remove the user from followers
    event.followers = event.followers.filter((id) => id !== userId);
    await event.save();

    res.status(200).json({ message: "User unfollowed the event", event });
  } catch (error) {
    res.status(500).json({ error: "Failed to unfollow event" });
  }
};

// ✅ Authenticate and Retrieve an Event by Password
exports.authenticateEvent = async (req, res) => {
    try {
      const { eventId } = req.params;
      let { password } = req.body; // User-provided password

      console.log('event id is', eventId)
      console.log('password is', password);

      password = password.trim();
  
      const event = await Event.findById(eventId);
      if (!event){ 
        console.log('Event not found');
        return res.status(404).json({ error: "Event not found" });
      }
  
      // Check if the provided password matches the stored hashed password
      console.log('Checking password', event.password)
      const isMatch = await new Promise((resolve, reject) => {
        bcrypt.compare(password, event.password, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });
      
      
      if (!isMatch) {
        console.log('Password did not match');
        return res.status(401).json({ error: "Incorrect password" });
      }

      console.log('It was successful')
  
      res.status(200).json(event);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to authenticate event" });
    }
  };


  // ✅ Update Event Password (Only Event Creator Can Do This)
exports.updateEventPassword = async (req, res) => {
    try {
      const { eventId } = req.params;
      const { newPassword, author } = req.body; // User-provided new password and author
  
      const event = await Event.findById(eventId);
      if (!event) return res.status(404).json({ error: "Event not found" });
  
      // Check if the requester is the event creator
      if (event.author !== author) {
        return res.status(403).json({ error: "Unauthorized: Only the creator can update the password" });
      }
  
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      event.password = hashedPassword;
      await event.save();
  
      res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update event password" });
    }
  };
  
