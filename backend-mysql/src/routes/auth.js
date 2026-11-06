const express = require('express');
const router = express.Router();
const { login, googleLogin, linkGoogle, unlinkGoogle, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/login', login);
router.post('/google', googleLogin);
router.post('/google/link', requireAuth, linkGoogle);
router.post('/google/unlink', requireAuth, unlinkGoogle);
router.get('/me', requireAuth, me);

module.exports = router;
