function BookingFormInfo(database) {

    this.database = database

    const CONST = require("../utils/constants")
    const jwtUtil = require("../utils/jwt")
    const { uploadToS3 } = require("../utils/secretAWS")
    const AWS = require('aws-sdk');

    // function to get the bookingform for public viewing
    this.getBookingByUserID = async(request, response) => {
        const id = request.params.id

        try {
            const token = await this.database.getUserById(id)
            if (!token) {
                const message = "UserBookingForm not found"
                return response.status(CONST.httpStatus.NOT_FOUND).json({ error: message })
            } else {
                this.database.getBookingByUserID(id)
                    .then(user => {
                        const tokenObject = jwtUtil.generateJWT(token)
                        response.cookie("adminSched", tokenObject, { httpOnly: true, maxAge: CONST.maxAgeCookieExpired })
                        response.json(user)
                    })
                    .catch(err => {
                        response.status(CONST.httpStatus.NOT_FOUND).json({ error: err })
                    })
            }
        } catch(error) {
            const message = `Imposible to get user booking form: ${error}`
            console.log(message)
            response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: message })
        }
    }
    // function for a user to create their first public booking form
    this.postBookingByUserID = async(request, response) => {

        const id = request.params.id
        const booking = request.body
        console.log(id, "id from postBookingByUserID")
        this.database.getBookingByUserID(id)
            .then(user => {
                if (!user) {
                    const message = "UserBookingForm not found"
                    this.logger.info(`Bookingform not found for [${id}, ${user}]. ${message}`)
                    this.logger.info(`Bookingform created for user [${booking.adminInfo.displayName}]`)
                    this.database.postBookingByUserID(id, booking)
                } else {
                    const message = "UserBookingForm already exists"
                    this.logger.info(`Booking form found for [${id}, ${user}]. ${message}`)
                    this.logger.info(`Booking form updated for user [${booking.adminInfo.displayName}]`)
                    this.database.putBookingByUserID(id, booking)
                }
                }
            )
            .catch(err => {
                response.status(CONST.httpStatus.NOT_FOUND).json({ error: err })
            }
        )
    }
    // backuphandler for admin to create their first public booking form but a form already exsists (this is a measure to handle the default form)
    this.putBookingByUserId = async(request, response) => {

        const id = request.params.id
        const booking = request.body

        this.database.getBookingByUserID(id)
            .then(user => {
                if (!user) {
                    const message = "UserBookingForm not found"
                    this.logger.info(`Bookingform not found for [${id}, ${user}]. ${message}`)
                    this.logger.info(`Bookingform created for user [${booking.adminInfo.displayName}]`)
                    this.database.postBookingByUserID(id, booking)
                } else {
                    const message = "UserBookingForm already exists"
                    this.logger.info(`Booking form found for [${id}, ${user}]. ${message}`)
                    this.logger.info(`Booking form updated for user [${booking.adminInfo.displayName}]`)
                    this.database.putBookingByUserID(id, booking)
                }
                }
            )
            .catch(err => {
                response.status(CONST.httpStatus.NOT_FOUND).json({ error: err })
            }
        )
    }

    // functions for admin to edit, and upload images to their public booking form
    // this is where some weird logic is for editng the json that defines the bookingFormInfoObject from the artists forms
    this.putBookingFormInfoById = async(request, response) => {
        try {
            console.log('starting putBookingFormInfoById')
            console.log(request.body.calendarInfo, "request.body.calendarInfo.availableTimes")
            const oldBookingFormInfo = await this.database.getBookingByUserID(request.body.adminId)
            const id = request.body.id 
            const adminId = request.body.adminId
            if (oldBookingFormInfo) {
                const newBookingFormInfo = {
                    tattooInfo: {
                        customOptions: request.body.tattooInfo.customOptions?request.body.tattooInfo.customOptions:oldBookingFormInfo.tattooInfo.customOptions,
                        flashImages: request.body.tattooInfo.flashImages?request.body.tattooInfo.flashImages:oldBookingFormInfo.tattooInfo.flashImages,
                        hourlyPrice: request.body.tattooInfo.hourlyPrice?request.body.tattooInfo.hourlyPrice:oldBookingFormInfo.tattooInfo.hourlyPrice,
                        availableColors: request.body.tattooInfo.availableColors?request.body.tattooInfo.availableColors:oldBookingFormInfo.tattooInfo.availableColors,
                        small: request.body.tattooInfo.small?request.body.tattooInfo.small:oldBookingFormInfo.tattooInfo.small,
                        medium: request.body.tattooInfo.medium?request.body.tattooInfo.medium:oldBookingFormInfo.tattooInfo.medium,
                        large: request.body.tattooInfo.large?request.body.tattooInfo.large:oldBookingFormInfo.tattooInfo.large,
                        venmo: request.body.tattooInfo.venmo?request.body.tattooInfo.venmo:oldBookingFormInfo.tattooInfo.venmo,
                        depositeMessage: request.body.tattooInfo.depositeMessage?request.body.tattooInfo.depositeMessage:oldBookingFormInfo.tattooInfo.depositeMessage,
                        deposits: request.body.tattooInfo.deposits?request.body.tattooInfo.deposits:oldBookingFormInfo.tattooInfo.deposits,
                        depositAmount: request.body.tattooInfo.depositAmount?request.body.tattooInfo.depositAmount:oldBookingFormInfo.tattooInfo.depositAmount,
                        paypal: request.body.tattooInfo.paypal?request.body.tattooInfo.paypal:oldBookingFormInfo.tattooInfo.paypal,
                        cashapp: request.body.tattooInfo.cashapp?request.body.tattooInfo.cashapp:oldBookingFormInfo.tattooInfo.cashapp,
                        paymentType: request.body.tattooInfo.paymentType?request.body.tattooInfo.paymentType:oldBookingFormInfo.tattooInfo.paymentType,

                    },
                    adminInfo: {
                        displayName: request.body.adminInfo.displayName?request.body.adminInfo.displayName:oldBookingFormInfo.adminInfo.displayName,
                        bio: request.body.adminInfo.bio?request.body.adminInfo.bio:oldBookingFormInfo.adminInfo.bio,
                        profileImage: request.body.adminInfo.profileImage?request.body.adminInfo.profileImage:oldBookingFormInfo.adminInfo.profileImage, /// this shoudl just be a url post multermidlleware
                        backgroundImage: request.body.adminInfo.backgroundImage?request.body.adminInfo.backgroundImage:oldBookingFormInfo.adminInfo.backgroundImage,
                        nameImage: request.body.adminInfo.nameImage?request.body.adminInfo.nameImage:oldBookingFormInfo.adminInfo.nameImage,
                        location: request.body.adminInfo.location?request.body.adminInfo.location:oldBookingFormInfo.adminInfo.location,
                        email: request.body.adminInfo.email?request.body.adminInfo.email:oldBookingFormInfo.adminInfo.email,
                    },
                    themesInfo: {
                        themes: request.body.themesInfo.themes?request.body.themesInfo.themes:oldBookingFormInfo.themesInfo.themes,
                    },
                    calendarInfo: {
                        blockedWeekDates: request.body.calendarInfo.blockedWeekDates?request.body.calendarInfo.blockedWeekDates:oldBookingFormInfo.calendarInfo.blockedWeekDates,
                        availableTimes: request.body.calendarInfo.availableTimes?request.body.calendarInfo.availableTimes:oldBookingFormInfo.calendarInfo.availableTimes,
                        currentlyBooked: request.body.calendarInfo.currentlyBooked?request.body.calendarInfo.currentlyBooked:oldBookingFormInfo.calendarInfo.currentlyBooked,
                        blockTime: request.body.calendarInfo.blockTime?request.body.calendarInfo.blockTime:oldBookingFormInfo.calendarInfo.blockTime,
                        bookedMin: request.body.calendarInfo.bookedMin?request.body.calendarInfo.bookedMin:oldBookingFormInfo.calendarInfo.bookedMin,
                    }
                }
                const data = await this.database.putBookingFormInfoById(id, newBookingFormInfo)
                if (data) {
                    response.json(data)
                } else {
                    response.status(CONST.httpStatus.NOT_FOUND).json({ error: "User not found" })
                }
            }
        else {
            console.log('starting postBookingFormInfoById')
            const defaultBookingFormInfo = {
                adminId: request.body.adminId,
                tattooInfo: request.body.tattooInfo,
                adminInfo: request.body.adminInfo,
                themesInfo: request.body.themesInfo,
                calendarInfo: request.body.calendarInfo,
            }
            const data = await this.database.postBookingByUserID(request.body.adminId, defaultBookingFormInfo)
            if (data) {
                response.json(data)
            } else {
                response.status(CONST.httpStatus.NOT_FOUND).json({ error: "User not found" })
            }
        }
        } catch (error) {
            console.log(error, "error in putBookingFormInfoById")
            const message = `Imposible to get user booking form: ${error}`
            console.log(message)
            response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: message })
        }
    }
    this.putBookingFormInfoImagesById = async(request, response) => {
        // i should add a clean up s3 function here to delete old images
        console.log('starting putBookingFormInfoImagesById')
        try {
            const id = request.params.id
            const type = request.params.type
            const data = await uploadToS3(request.files, type, id)
            if (data) {
                // now update the users db with this.putBookingFormInfoById(id, newBookingFormInfo)
                const updatePromises = data.map(async (image) => {
                    const updateObject = {
                        $set: {
                            [`adminInfo.${type}`]: image.key
                        }
                    };
                    // Note: Assuming that putBookingFormInfoById returns a promise
                    return await this.database.putBookingFormInfoById(id, updateObject);
                });
    
                // Wait for all updates to complete before sending the response
                await Promise.all(updatePromises);
                response.json(data)
            } else {
                response.status(CONST.httpStatus.NOT_FOUND).json({ error: "User not found" })
            }
        } catch (error) {
            const message = `Imposible to get user booking form: ${error}`
            response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: message })
        }
    }
    // this is pretty much just an image array handler instead of an image object key handler
    this.putBookingFormFlashImagesById = async(request, response) => {
        console.log(`Starting putBookingFormFlashImagesById`)
        try {
            const id = request.params.id
            const type = request.params.type
            const oldBookingInfo = await this.database.getBookingByUserID(id)
            const oldImageNames = oldBookingInfo.tattooInfo.flashImages.map((image) => image.originalname);
            const newImageNames = request.files.map((image) => image.originalname);

            const filteredNewImageArray = request.files.filter((newImage) => {
            return !oldImageNames.includes(newImage.originalname);
            });
            const data = await uploadToS3(filteredNewImageArray, type, id)
            if (data) {
                const combinedImageArray = oldBookingInfo.tattooInfo.flashImages.concat(data);
                const updatePromises = {
                    $set: {
                        [`tattooInfo.${type}`]: combinedImageArray
                    }
                };
                // Note: Assuming that putBookingFormInfoById returns a promise
                await this.database.putBookingFormInfoById(id, updatePromises);
                response.json(data)
                }
            else {
                response.json(oldBookingInfo.tattooInfo.flashImages)
            }
        } catch (error) {
            const message = `Imposible to get user booking form: ${error}`
            response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: message })
        }
    }
    // public image handler
    this.getS3Image = async(request, response) => {
        console.log('starting getS3Image')
        try {
            const id = request.params.id
            const type = request.params.type
            const file = request.params.file
            const key = `${id}/${type}/${file}`
            const s3 = new AWS.S3(
                {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    region: 'us-east-1'
                }
            );

            // Set the parameters for the pre-signed URL
            const params = {
            Bucket: 'bookedthebookingapp',
            Key: key,
            Expires: 6000, // The URL will expire in 60 seconds (adjust as needed)
            };

            // Generate the pre-signed URL
            const url = s3.getSignedUrl('getObject', params);
            response.json(url)

        } catch (error) {
            console.log(error, "error in getS3Image")
            const message = `Imposible to get user booking form: ${error}`
            console.log(message)
            response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: message })
        }
    }
}

const database = require("../services/database")
const bookingFormInfoController = new BookingFormInfo(database)

module.exports = bookingFormInfoController