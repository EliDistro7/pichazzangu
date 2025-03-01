const express = require('express');
const router = express.Router();
const {
    userRegister,
    userLogIn,

} = require('../controllers/user-controller.js');

// User Routes
router.post('/register', userRegister);                    // Register a new user
router.post('/login', userLogIn);                          // Log in a user


module.exports = router;
