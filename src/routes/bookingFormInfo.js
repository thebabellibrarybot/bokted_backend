const express = require("express")
const router = express.Router()
const bookingFormInfoController = require("../controllers/bookingFormInfoController")
const multer = require('multer');


const storage = multer.memoryStorage(); // Use memory storage for simplicity, you can customize this based on your needs
const upload = multer({ storage: storage });

function errorHandler(err, req, res, next) {
    console.error(err, 'from err handler');
    res.status(400).json({ 'error': err.message });
  }

// public routes to view bookingforms, to send forms as schedulers, and submit images to a bookingform
router.get("/bookingforminfo/:id", bookingFormInfoController.getBookingByUserID)
router.post("/bookingforminfo/:id", bookingFormInfoController.postBookingByUserID)

// admin routes to edit the admins bookingform
router.put("/admininfo", bookingFormInfoController.putBookingFormInfoById)
router.put("/admininfoimages/:id/:type", upload.array('file'), errorHandler, bookingFormInfoController.putBookingFormInfoImagesById)
router.put("/adminflashimages/:id/:type", upload.array('file'), errorHandler, bookingFormInfoController.putBookingFormFlashImagesById)

// public route to view images, thsi should maybe get moved to another controller environment...
router.get("/s3image/:id/:type/:file", bookingFormInfoController.getS3Image)

module.exports = router