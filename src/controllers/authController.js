require('dotenv').config()
const axios = require('axios')
const { OAuth2Client } = require('google-auth-library');

function AuthController(database, logger) {

    this.database = database
    this.logger = logger

    const CONST = require("../utils/constants")
    const bcrypt = require("bcrypt")
    const DuplicatedEmailError = require("../utils/customErrors")
    const jwtUtil = require("../utils/jwt")
    
    this.getUserSession = (request, response) => {
        const jwtToken = request.cookies.jwt
        let authData = jwtUtil.decodeJWT(jwtToken)
        response.json({ sid : authData })
    }

    this.login = async (request, response) => {
        const { email, password } = request.body
        try {
            const user = await this.database.getUserByEmail(email)
            if (!user) {
                const message = "Email not found"
                this.logger.info(`Login rejected [${email}]. ${message}`)
                return response.status(CONST.httpStatus.NOT_FOUND).json({ error: message })
            }
            const isValidPassword = await bcrypt.compare(password, user.password)
            if (!isValidPassword) {
                const message = "Wrong password"
                this.logger.info(`Login rejected [${email}]. ${message}`)
                return response.status(CONST.httpStatus.UNAUTHORIZED).json({ error: message })
            }
 
            const token = jwtUtil.generateJWT(user.id, user.email)
            response.cookie("jwt", token, { httpOnly: true, maxAge: CONST.maxAgeCookieExpired })
            this.logger.info(`Session started for user [${user.email}]`)
            
            let authData = {
                id: user.id
            }
            response.json({ sid: authData })
        } catch(error) {
            const message = `Imposible to login user: ${error}`
            this.logger.error(message)
            response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: message })
        }
    }

    this.register = async (request, response) => {


        const user = request.body

        try {
            const createdUser = await this.database.createUser(user)
            const token = jwtUtil.generateJWT(user.id, user.email)
            response.cookie("jwt", token, { httpOnly: true, maxAge: CONST.maxAgeCookieExpired })
            let authData = {
                id: createdUser.id, 
                providerId: null
            }
            response.status(CONST.httpStatus.CREATED).json({ sid : authData })
        } catch(error) {

            // Handled errors
            const validationErrors = handleRegisterValidationErrors(error)
            if (validationErrors) {
                return response.status(CONST.httpStatus.BAD_REQUEST).json({ error: validationErrors })
            }

            this.logger.error(error)
            const message = "Imposible to register user"
            response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: message})
        }
    }

    // this sends open and nonharmful user info from google provider to frontend and saves accessToken in user's session on server-side
    this.oauthGoogleLogin = async (request, response) => {

        // might want to eventually save this as a cookie and add it to a users database // add a function to update the tokens
        const userProfile = {
            id: request.user.id,
            name: request.user.displayName,
            email: request.user.email,
            picture: request.user.picture || null,
            provider: request.user.provider,
            accessToken: request.session.passport.user.accessToken,
            refreshToken: request.session.passport.user.refreshToken
        }

        // set userProfile to session info should actually save this as a cookie in the session with jwt....
        request.session.userProfile = userProfile;

        let user = undefined

        try {
            console.log(userProfile, "userProfile from oauthGoogleLogin")
            user = await findOrCreateUserOAuth2(userProfile)
        } catch(error)  {
            this.logger.error(error)
            console.log(error, "error from oauthGoogleLogin")
            return response.redirect(process.env.FAILED_LOGIN_REDIRECT)
        }
        const token = jwtUtil.generateJWT(user.id, user.email, userProfile.id)
        response.cookie("jwt", token, { httpOnly: true, maxAge: CONST.maxAgeCookieExpired })
        this.logger.info(`Session started for user [${user.email}]`)
        this.logger.info(process.env.SUCCESSFUL_LOGIN_REDIRECT)
        response.redirect(process.env.SUCCESSFUL_LOGIN_REDIRECT)
    }

    //#region Auxiliar methods
    const MONGOOSE_DUPLICATED_EMAIL_ERROR_CODE = 11000

    const handleRegisterValidationErrors = (err) => {
        let errors = {
            email: "",
            password: "",
            fullname: ""
        }
    
        if (err instanceof DuplicatedEmailError || err.code === MONGOOSE_DUPLICATED_EMAIL_ERROR_CODE) {
            errors.email = "That email is already registered"
            return errors
        }
    
        // Validations error
        if (err.message.includes("User validation failed")) {
            Object.values(err.errors).forEach(({properties}) => {
                errors[properties.path] = properties.message
            })
        }
    
        return errors
    }

    const findOrCreateUserOAuth2 = async (userProfile) => {

        if (!userProfile.email) {
            this.logger.error(userProfile)
            throw "required \"email\" field is missing"
        }

        let user = await this.database.getUserByProviderId(userProfile.id)
        if (!user) {
            let registeredUser = await this.database.getUserByEmail(userProfile.email)
            if (!registeredUser) {
                console.log(userProfile, "userProfile from findOrCreateUserOAuth2")
                let newUser = {
                    fullname: userProfile.name,
                    email: userProfile.email,
                }  
                this.logger.info(`Creating new user... ${newUser.email, newUser.email, userProfile.email}`)
                registeredUser = await this.database.createUser(newUser)
            }

            let { providers = [] } = registeredUser
            let oauth2ProviderInformation = providers.find(provider => provider.providerUserId == registeredUser.id && provider.providerName == userProfile.provider)
            const token = jwtUtil.generateJWT(userProfile.refreshToken)
            if (!oauth2ProviderInformation) {
                let oauth2UserInformation = {
                    userId: registeredUser.id,
                    loginName: userProfile.login || "",
                    providerUserId: userProfile.id,
                    providerName: userProfile.provider,
                    picture: userProfile.picture || "",
                    refreshToken: token
                }
                this.logger.info(`Register user with id "${registeredUser.id}" from ${userProfile.provider} OAuth 2.0`)
                oauth2ProviderInformation = await this.database.addProviderUser(oauth2UserInformation)
            }
            user = oauth2ProviderInformation
        }

        return user
    }

    //#endregion
}

const logger = require("../services/log")
const database = require("../services/database")
const authController = new AuthController(database, logger)

module.exports = authController