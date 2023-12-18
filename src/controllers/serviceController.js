require("dotenv").config();
const { createCalendarEvent, sendEmail, composeEvent, composeGmail, composeConfirmationEmail } = require("../services/auth/googleAPI");
const { getOAuth2ServiceClient } = require("../services/auth/serviceAuth");
const { v4: uuid } = require("uuid");

function ServiceController(database, logger) {

    this.database = database
    this.logger = logger

    const CONST = require("../utils/constants")

    // create a new auth object with the service account keys
    // create a email and calendar object
    // send the calendar and email object to the client
    // update the db with the client's calendar and email object

    // schedule sender via google provider

    // this will create a schedule object attached to the user's image
    this.postScheduleImage = async (request, response) => {
        console.log('postScheduleImage')
        try {
            const id = request.params.id
            const type = request.params.type
            const data = await uploadToS3(request.files, type, id)
            if (data) {
                const schedule = {
                    customFlash: data,
                }
                const updatedSchedule = await this.database.addBookingSched(schedule);
                response.status(200).json(updatedSchedule);
            }
        } catch (error) {
            this.logger.error(`Error during postScheduleImage: ${error}`);
            response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: 'Failed to process the request.' });
        }
    }
    // this will create a schedule object without an image
    const postSchedule = async (request, response) => {
        this.logger.info(`Received request to postSchedule by: ${request.body.userEntry.name}`);
        try {
            const oauth2Client = await getOAuth2ServiceClient();
            const bookingFormInfo = request.body.bookingFormInfo;
            const userEntry = request.body.userEntry;
            const booking = {
                userOrgin: bookingFormInfo.adminId,
                scheduleId: userEntry.scheduleId,
                name: userEntry.name,
                email: userEntry.email,
                phone: userEntry.phone,
                date: userEntry.date,
                time: userEntry.time,
                message: userEntry.message,
                image: userEntry.image,
                size: userEntry.size,
                waiver: userEntry.waiver,
                timeZone: userEntry.timeZone,
                status: 'pending'
            }
            const newScheduleObject = await this.database.addBookingSched(booking);
            const eventId = newScheduleObject._id;
            if (newScheduleObject) {
                const event = composeEvent(userEntry, bookingFormInfo);
                const base64EncodedEmail = composeGmail(userEntry, bookingFormInfo, eventId);
                const base64EncodedConfirmationEmail = composeConfirmationEmail(userEntry, bookingFormInfo, eventId);
                const sentGmail = await sendEmail(oauth2Client, base64EncodedEmail);
                const calendarEventLink = await createCalendarEvent(oauth2Client, event);
                const sentConfirmationEmail = await sendEmail(oauth2Client, base64EncodedConfirmationEmail);

                const sentGmailAuth = sentGmail.headers.Authorization;
                const sentGmailResUrl = sentGmail.request.reqponseURL;

                if (calendarEventLink && sentGmail && sentConfirmationEmail) {

                    this.logger.info(`Event created: %s ${calendarEventLink}`);
                    this.logger.info(`Email sent: %s ${sentGmail}`);
        
                    const addToBookingSchedule = {
                    eventLink: calendarEventLink,
                    sentGmailResUrl: sentGmailResUrl,
                    }
                    const updatedBookingSchedule = await this.database.putBookingScheduleById(eventId, addToBookingSchedule);
                    this.logger.info(`updatedBookingSchedule added to db:${bookingFormInfo.adminInfo.displayName} by guest ${userEntry.name}`);
                    const newBookingFormInfoObject = {
                        ...bookingFormInfo,
                        calendarInfo: {
                            ...bookingFormInfo.calendarInfo,
                            currentlyBooked: [...bookingFormInfo.calendarInfo.currentlyBooked, updatedBookingSchedule]
                        }
                    }
                    // this will add the schedule object to the artist's array of currently booked
                    const updatedCurrentlyBooked = await this.database.putBookingByUserID(bookingFormInfo.adminId, newBookingFormInfoObject);
                    console.log(updatedCurrentlyBooked, 'updatedCurrentlyBooked')
                    response.status(200).json({
                    message: 'successfully added new schedule entry',
                    updatedBookingSchedule,
                    eventLink: calendarEventLink,
                    });

                } else {
                    this.logger.error('Failed to create event or send email');
                    response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: 'Failed to process the request.' });
                }
            } else {
                this.logger.error('Failed to update db with schedule');
                response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: 'Failed to process the request.' });
            }
            } catch (error) {
                this.logger.error(`Error during postSched: ${error}`);
                response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: 'Failed to process the request.' });
            }
    }
    // if an image has been uploaded a schedule object has been created and this will update the schedule object with the rest of the info
    const putScheduleByID = async (request, response) => {
        this.logger.info(`Received request to putScheduleByID: ${request.body.name}`);
        try {
            const oauth2Client = await getOAuth2ServiceClient();
            const bookingFormInfo = request.body.bookingFormInfo;
            const userEntry = request.body.userEntry;
            const booking = {
                userOrgin: bookingFormInfo.adminId,
                scheduleId: userEntry.scheduleId,
                name: userEntry.name,
                email: userEntry.email,
                phone: userEntry.phone,
                date: userEntry.date,
                time: userEntry.time,
                message: userEntry.message,
                image: userEntry.image,
                customFlash: userEntry.customFlash,
                size: userEntry.size,
                waiver: userEntry.waiver,
                timeZone: userEntry.timeZone,
                status: 'pending'
            }
            // need to update putBookingScheduleById to take in the scheduleId
            const updateScheduleObject = await this.database.putBookingScheduleById(userEntry.scheduleId, booking);
            const eventId = updateScheduleObject._id;
            if (updateScheduleObject) {
                const event = composeEvent(userEntry, bookingFormInfo);
                const base64EncodedEmail = composeGmail(userEntry, bookingFormInfo, eventId);
                const base64EncodedConfirmationEmail = composeConfirmationEmail(userEntry, bookingFormInfo, eventId);
                const sentGmail = await sendEmail(oauth2Client, base64EncodedEmail);
                const calendarEventLink = await createCalendarEvent(oauth2Client, event);
                const sentConfirmationEmail = await sendEmail(oauth2Client, base64EncodedConfirmationEmail);

                const sentGmailAuth = sentGmail.headers.Authorization;
                const sentGmailResUrl = sentGmail.request.reqponseURL;

                if (calendarEventLink && sentGmail && sentConfirmationEmail) {

                    this.logger.info(`Event created: %s ${calendarEventLink}`);
                    this.logger.info(`Email sent: %s ${sentGmailResUrl}`);
        
                    const addToBookingSchedule = {
                    eventLink: calendarEventLink,
                    sentGmailResUrl: sentGmailResUrl,
                    }
                    const updatedBookingSchedule = await this.database.putBookingScheduleById(eventId, addToBookingSchedule);
                    this.logger.info(`updatedBookingSchedule added to db:${bookingFormInfo.adminInfo.displayName} by guest ${userEntry.name}`);
                    const newBookingFormInfoObject = {
                        ...bookingFormInfo,
                        calendarInfo: {
                            ...bookingFormInfo.calendarInfo,
                            currentlyBooked: [...bookingFormInfo.calendarInfo.currentlyBooked, updatedBookingSchedule]
                        }
                    }
                    // this will add the schedule object to the artist's array of currently booked
                    const updatedCurrentlyBooked = await this.database.putBookingByUserID(bookingFormInfo.adminId, newBookingFormInfoObject);
                    this.logger.info(`updatedCurrentlyBooked added to db:${bookingFormInfo.adminInfo.displayName} by guest ${userEntry.name}`)
                    response.status(200).json({
                    message: 'successfully added new schedule entry',
                    updatedBookingSchedule,
                    eventLink: calendarEventLink,
                    });

                } else {
                    this.logger.error('Failed to create event or send email');
                    response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: 'Failed to process the request.' });
                }
            } else {
                this.logger.error('Failed to add schedule to admins db');
                response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: 'Failed to process the request.' });
            }
        } catch (error) {
            console.log(error, 'error')
            this.logger.error(`Error during putSched: ${error}`);
            response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: 'Failed to process the request.' });
        }
    }
    // this will handle whether a schedule object needs to be put or post
    this.submitUserSchedule = async (request, response) => {
        this.logger.info(`Received request to submitUserSchedule:`);
        try {
            const scheduleID = request.body.userEntry.scheduleId;
            console.log(scheduleID, 'scheduleID')
            if (!scheduleID) {
                postSchedule(request, response);
            } else {
                putScheduleByID(request, response);
            }
        } catch (error) {
            this.logger.error(`Error during submitUserSchedule: ${error}`);
            response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: 'Failed to process the request.' });
        }
    }




    // view a schedule by id
    this.getScheduleById = async (request, response) => {
        this.logger.info(`Received request to getScheduleById: ${request.params.id}`);
        try {
            const schedule = await this.database.getBookingSchedById(request.params.id);
            response.status(200).json(schedule);
        } catch (error) {
            this.logger.error(`Error during getScheduleById: ${error}`);
            response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: 'Failed to process the request.' });
        }
    }

    // accept a schedule and send confirmation email
    this.postScheduleAccept = async (request, response) => {
        this.logger.info(`Received request to postScheduleAccept: ${request.body}`);
    }

    // decline a schedule and send confirmation email
    this.postScheduleDecline = async (request, response) => {
        this.logger.info(`Received request to postScheduleDecline: ${request.body}`);
    }

    // get all schedules by user id and month
    this.getSchedulseByUserIdAndMonth = async (request, response) => {
        this.logger.info(`Received request to getScheduleByUserIdAndMonth: ${request.params.id}`);
    }    
}

const logger = require("../services/log")
const database = require("../services/database");
const { uploadToS3 } = require("../utils/secretAWS");
const serviceController = new ServiceController(database, logger)

module.exports = serviceController