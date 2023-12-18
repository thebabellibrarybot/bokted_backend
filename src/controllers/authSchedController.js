require('dotenv').config();
const { getOAuth2Client, createCalendarEvent, sendEmail, composeEvent, composeGmail } = require('../services/auth/googleAPI');

function AuthController(database, logger) {

    this.database = database
    this.logger = logger

    const CONST = require("../utils/constants")

    /*const event = {
        'summary': 'Meeting with Clients',
        'description': 'Discussing project updates',
        'start': {
          'dateTime': '2023-12-10T09:00:00-07:00',
          'timeZone': 'America/Los_Angeles',
        },
        'end': {
          'dateTime': '2023-12-10T10:00:00-08:00',
          'timeZone': 'America/Los_Angeles',
        },
        'attendees': [
          {
            'email': 'client1@example.com',
            'responseStatus': 'needsAction',
            'displayName': 'Client 1',
            'organizer': true,  // Set to true for the event organizer
          },
          {
            'email': 'client2@example.com',
            'responseStatus': 'needsAction',
            'displayName': 'Client 2',
          },
        ],
        'guestsCanModify': true,  // Guests can modify the event
        'reminders': {
          'useDefault': false,
          'overrides': [
            { 'method': 'email', 'minutes': 30 },
            { 'method': 'popup', 'minutes': 10 },
          ],
        },
      };

    const toEmail = 'jtucker0110@gmail.com';
    const emailSubject = 'Hello World';
    const emailBody = 'This is a test email sent from my chatbot!';
    const emailContent = `To: ${toEmail}\r\nSubject: ${emailSubject}\r\n\r\n${emailBody}`;
    const base64EncodedEmail = Buffer.from(emailContent).toString('base64');
      */
    
    // function for user to submit booking with oauth login
    this.postBookingByUserID = async (request, response) => {
      try {
        console.log('postBookingByUserID')
        console.log(request.body, 'request.body from postBookingByUserID')
        const oauth2Client = getOAuth2Client(request);
        const bookingFormInfo = request.body.bookingFormInfo;
        const userEntry = request.body.userEntry;

        const booking = {
          ... userEntry,
          userOrgin: bookingFormInfo.adminId,
        }
        const newScheduleObject = await this.database.addBookingSchedById(booking);
        const eventId = newScheduleObject._id;

        if (newScheduleObject) {
        
          const event = composeEvent(userEntry, bookingFormInfo);
          const base64EncodedEmail = composeGmail(userEntry, bookingFormInfo, eventId);
      
          const calendarEventLink = await createCalendarEvent(oauth2Client, event);
          const sentGmail = await sendEmail(oauth2Client, base64EncodedEmail);

          const sentGmailAuth = sentGmail.headers.Authorization;
          const sentGmailResUrl = sentGmail.request.reqponseURL;

          if (calendarEventLink && sentGmail) {

            this.logger.info(`Event created: %s ${calendarEventLink}`);
            this.logger.info(`Email sent: %s ${sentGmail}`);
  
            const addToBookingSchedule = {
              eventLink: calendarEventLink,
              sentGmailResUrl: sentGmailResUrl,
            }
            const updatedBookingSchedule = await this.database.updatedBookingSchedule(eventId, addToBookingSchedule);
            this.logger.info(`updatedBookingSchedule added to db: ${updatedBookingSchedule}`);
  
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
          this.logger.error('Failed to create event or send email');
          response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: 'Failed to process the request.' });
        }
      } catch (error) {
        this.logger.error(`Error during authSched postBookingByUserID: ${error}`);
        response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: 'Failed to process the request.' });
      }
    };

    this.putBookingByUserId = async (request, response) => {

      // get userEntry from db
      // get bookingFormInfo from db
      console.log('putBookingByUserId');
      const { userEntry, bookingFormInfo } = req.params;
      const link = request.body.link;

      this.logger.info(`userEntry: ${userEntry}, bookingFormInfo: ${bookingFormInfo}`);
      this.logger.info(`link: ${link}`);

      // if link includes accept: send confirmation email, accept calendar event, update db
      // if link includes decline: send alt time email, decline calendar event, update db
      // if link includes cancel: send confirmation email, cancel calendar event, update db

      try {
        return request.status(200).json({message: 'success'});
      } catch (error) {
        this.logger.error(`Error during putBookingByUserId: ${error}`);
        response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: 'Failed to process the request.' });
      }
    }
    
}



const logger = require("../services/log")
const database = require("../services/database")
const authController = new AuthController(database, logger)

module.exports = authController