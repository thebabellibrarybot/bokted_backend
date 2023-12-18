const express = require("express")
const router = express.Router()
const serviceController = require("../controllers/serviceController")
const multer = require('multer');


const storage = multer.memoryStorage(); // Use memory storage for simplicity, you can customize this based on your needs
const upload = multer({ storage: storage });

function errorHandler(err, req, res, next) {
    console.error(err, 'from err handler');
    res.status(400).json({ 'error': err.message });
  }

// guest sends a schedule to the admin: this will either be sent to postSchedule or putSchedule
router.post("/schedule/:id", serviceController.submitUserSchedule)
// guest sends a file to their schedule object, this will create a schedule object as it will always be sent before the schedule is created
router.post("/bookingformimages/:id/:type", upload.array('file'), errorHandler, serviceController.postScheduleImage)
// guest reqs a copy of their schedule event
router.get("/schedule/:id", serviceController.getScheduleById)

module.exports = router