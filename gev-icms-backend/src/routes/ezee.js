const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/ezeeController');

router.post('/booking',  ctrl.handleBooking);
router.post('/checkout', ctrl.handleCheckout);

module.exports = router;
