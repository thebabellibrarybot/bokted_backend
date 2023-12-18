
const envValidator = require("../../config/config")
if (!envValidator.isGoogleOAuth2ServiceConfigured()) {
    return
}

const googleCallbackURL = `http://${process.env.BACK_HOST}:${process.env.BACK_PORT}/api/v1${process.env.CLIENT_GOOGLE_CALLBACK_URL}`

const GoogleStrategy = require("passport-google-oauth20").Strategy

const googleProvider = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_AUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET,
    callbackURL: googleCallbackURL,
    accessType: "offline",
    prompt: "consent",
    refreshToken: true,
  },
  (accessToken, refreshToken, profile, done) => {
    // Store the accessToken and refreshToken in your user profile data
    const userProfile = {
      id: profile.id,
      name: profile.displayName,
      email: profile._json.email,
      picture: profile._json.picture || null,
      provider: "google",
      accessToken: accessToken,
      refreshToken: refreshToken
    };
    
    return done(null, userProfile);
  }
);

module.exports = googleProvider;
