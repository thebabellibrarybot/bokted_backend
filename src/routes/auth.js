const express = require("express")
const router = express.Router()
const authController = require("../controllers/authController")
const authSchedController = require("../controllers/authSchedController")
const middlewares = require("../middlewares")

//#region Basic user login and register

router.post("/login", authController.login)
router.post("/register", authController.register)

//#region OAuth 2.0

const passport = require("passport")

const envValidator = require("../config/config")
const isGoogleCondigured = envValidator.isGoogleOAuth2ServiceConfigured()

router.get("/login/google/status", (request, response) => {
    let body = {
        serviceName: "Google OAuth 2.0",
        isActive: isGoogleCondigured !== undefined
    }
    console.log(body, 'body from auth via login/google/status')
    response.json(body)
})

// Google
// this is where i should be able to get and set access / refresh tokens in my session
if (isGoogleCondigured) {
    const googleProvider = require("../services/auth/oauth2Google")
    passport.use(googleProvider)
    router.get("/login/google", passport.authenticate("google", { 
        scope: [
            "profile",
            "email",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/gmail.send"
        ],
        accessType: 'offline', // Request a refresh token
        prompt: 'consent'
    }))
    router.get("/oauth/google/callback",
        passport.authenticate("google"),
        authController.oauthGoogleLogin
    )
}

if (isGoogleCondigured) {
    console.log('fired oauth/google')
    passport.serializeUser(function(user, done) {
        done(null, user)
    })
    passport.deserializeUser(function(user, done) {
        done(null, user)
    })
    console.log('fired oauth/user')

    router.get("/oauth/user", middlewares.isUserAuthenticated, authController.getUserSession)

    router.post("/old-schedule/:id", middlewares.isUserAuthenticated, authSchedController.postBookingByUserID)

    router.put("/bookedevent/accept/:userentry/:bookingforminfo", middlewares.isUserAuthenticated, authSchedController.putBookingByUserId)
    
    router.put("/bookedevent/decline/:userentry/:bookingforminfo", middlewares.isUserAuthenticated, authSchedController.putBookingByUserId)

}

//#endregion

module.exports = router