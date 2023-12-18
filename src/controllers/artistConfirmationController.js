require('dotenv').config()
const axios = require('axios')
const { OAuth2Client } = require('google-auth-library');

// this controller will update the artist database with information about their booking history and will clear out old bookings from their currently booked array
// so that the currently book array will only contain bookings that are in the future

function ArtistConfirmationController(database, logger) {

    this.database = database
    this.logger = logger

    //#region Auxiliar methods


    //#endregion
}

const logger = require("../services/log")
const database = require("../services/database")
const artistConfirmationController = new ArtistConfirmationController(database, logger)

module.exports = artistConfirmationController