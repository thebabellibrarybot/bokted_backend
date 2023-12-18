const express = require("express")
const router = express.Router()

const authApi = require("./auth")
const usersApi = require("./users")
const bookingFormInfoApi = require("./bookingFormInfo")
const servicesApi = require("./service")


router.use(authApi)
router.use(usersApi)
router.use(bookingFormInfoApi)
router.use(servicesApi)


module.exports = router
