// this set of middleware functions will be used to create statistics for the admin dashboard
// and monitor user activity

const { count } = require("../models/bookingFormInfo")


// this function will be used to identify the type of request being made
const conditionalRoute = async(req, res, next) => {
    const route = req.path
    console.log(route, 'route')
    if (route === '/api/v1/user') {
        countNewUser(req, res, next)
        next()
    }
    else if (route === '/api/v1/bookingFormInfo') {
        countNewBookingFormInfo(req, res, next)
        next()
    }
    else if (route === '/api/v1/schedule') {
        countNewSchedule(req, res, next)
        const reaccuringGuest = checkForReaccuringGuest(req, res, next)
        if (reaccuringGuest) {
            countReaccuringGuest(req, res, next)
        } else {
            countNewGuest(req, res, next)
        }
        next()
    }
    else {
        next()
    }
}

// count new user
const countNewUser = async(req, res, next) => {
    const newUser = req.body
    // handle info about new user
    // add user to user count
    next()
}
// count new bookingFormInfo
const countNewBookingFormInfo = async(req, res, next) => {
    const newBookingFormInfo = req.body
    // handle info about new bookingFormInfo
    // add bookingFormInfo to bookingFormInfo count
    next()
}

// count new schedule
const countNewSchedule = async(req, res, next) => {
    const newSchedule = req.body
    // handle info about new schedule
    // add schedule to schedule count
    next()
}

// check for reaccuring guest
const checkForReaccuringGuest = async(req, res, next) => {
    const guest = req.body
    // handle info about guest
    // check if guest has booked before
    // if guest has booked before, add to reaccuring guest count
    return true
}

// count new guest
const countNewGuest = async(req, res, next) => {
    const guest = req.body
    // handle info about guest
    // add guest to guest count
    next()
}

// count / append reaccuring guest
const countReaccuringGuest = async(req, res, next) => {
    const guest = req.body
    // handle info about guest
    // add guest to reaccuring guest count
    next()
}

module.exports = {
    conditionalRoute
}