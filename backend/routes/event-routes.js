const express = require("express");
const router = express.Router();
const eventController = require("../controllers/event-controller");

// CRUD Routes
router.post("/events/create", eventController.createEvent);
router.get("/get-events", eventController.getAllEvents);
router.post("/event/:eventId", eventController.getEventById);
router.put("/:eventId", eventController.updateEvent);
router.delete("/:eventId", eventController.deleteEvent);

// New route for retrieving event media
// e.g., GET /event-media?eventId=123&mediaType=photo
router.get("/event-media", eventController.getEventMedia);

// Follow/Unfollow Routes
router.post("/:eventId/follow", eventController.followEvent);
router.post("/:eventId/unfollow", eventController.unfollowEvent);

router.post("/events/:eventId/authenticate", eventController.authenticateEvent);

router.get("/events/user/:userId", eventController.getAllEventsByUser);

router.patch("/:eventId/update-password", eventController.updateEventPassword);

router.patch('/events/updateMedia', eventController.updateEventMedia);

router.patch('/events/updateCoverPhoto', eventController.updateEventCoverPhoto);





module.exports = router;
