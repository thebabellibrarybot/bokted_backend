const { google } = require('googleapis');
require('dotenv').config();

function getOAuth2Client(request) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_AUTH_CLIENT_ID,
    process.env.GOOGLE_AUTH_CLIENT_SECRET
  );
  
  oauth2Client.setCredentials({
    access_token: request.session.passport.user.accessToken,
    refresh_token: request.session.passport.user.refreshToken,
  });

  return oauth2Client;
}

async function createCalendarEvent(oauth2Client, event) {
  return new Promise((resolve, reject) => {
    const calendar = google.calendar({
      version: 'v3',
      auth: oauth2Client,
    })

    calendar.events.insert(
      {
        calendarId: 'primary',
        resource: event,
      },
      (err, res) => {
        if (err) {
          console.log(err, 'err from createCalendarEvent');
          reject(`The calendar API returned an error: ${err}`);
        } else {
          resolve(res.data.htmlLink);
        }
      }
    )
  })
}

async function sendEmail(oauth2Client, base64EncodedEmail) {
    return new Promise((resolve, reject) => {
      if (!oauth2Client || !oauth2Client.credentials) {
        reject("OAuth2 client not properly authenticated.");
        return;
      }
      const gmail = google.gmail({
        version: 'v1',
        auth: oauth2Client,
      });
  
      gmail.users.messages.send(
        {
          userId: 'me',
          resource: {
            raw: base64EncodedEmail,
          },
        },
        (err, res) => {
          if (err) {
            reject(`The Gmail API returned an error: ${err}`);
          } else {
            resolve(res);
          }
        }
      );
    });
}

function composeEvent(userEntry, bookingFormInfo) {

    try {
      const description = `Tattoo appointment req for ${userEntry.name}`
   
      const event = {
          'summary': `New Booking Request from ${userEntry.name}`,
          'description': `${description}`,
          'start': {
            'dateTime': `${userEntry.startTime}`,
            'timeZone': `${userEntry.timeZone}`,
          },
          'end': {
            'dateTime': `${userEntry.endTime}`,
            'timeZone': `${userEntry.timeZone}`,
          },
          'attendees': [
            {
              'email': `${bookingFormInfo.adminInfo.email}`,
              'responseStatus': 'needsAction',
              'displayName': `${bookingFormInfo.adminInfo.displayName}`,
              'organizer': true,  // Set to true for the event organizer
            },
            {
              'email': `${userEntry.email}`,
              'responseStatus': 'needsAction',
              'displayName': `${userEntry.name}`,
              'organizer': false,  // Set to true for the event organizer
            }
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
      console.log(event, 'event from composeEvent')
      return event;
    } catch (err) {
      console.log(err.message);
    }
}

function composeGmail(userEntry, bookingFormInfo, eventId) {

    try {
      const senderEmail = "info@bokted.com";
      const toEmail = bookingFormInfo.adminInfo.email;
      const emailSubject = `New Booking Request from ${userEntry.name}`;
      // const styles = bookingFormInfo.themesInfo.styles;
    
      // Construct HTML-formatted email body with styles
      const emailBody = `
        <html> 
          <head>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                background-color: #f4f4f4;
                color: #333;
              }
              p {
                margin: 10px 0;
              }
              ul {
                list-style-type: none;
                padding: 0;
              }
              li {
                margin-bottom: 5px;
              }
              a {
                color: #007BFF;
                text-decoration: none;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <p>Hello ${bookingFormInfo.adminInfo.displayName},</p>
            <p>You have a new booking request from ${userEntry.name}:</p>
            
            <ul>
              <li><strong>Name:</strong> ${userEntry.name}</li>
              <li><strong>Email:</strong> ${userEntry.email}</li>
              <li><strong>Phone:</strong> ${userEntry.phone}</li>
              <!-- Add more details as needed -->
              <p>Booking Details: ${userEntry.message}</p>
              <p>Booking Requested for: ${userEntry.date} at ${userEntry.time}</p>
              <p>Booking Date: ${userEntry.date}</p>
              <p>Booking Time: ${userEntry.time}</p>
              <p>Booking Time Zone: ${userEntry.timeZone}</p>
              <p>Booking Image: ${userEntry.image}</p>
              <p>Booking Size: ${userEntry.size}</p>
              <p>Booking Waiver: ${userEntry.waiver}</p>            
            </ul>
            <p>To approve this appointment, please follow the <a href="http://localhost:3000/bookedevent/accept/${bookingFormInfo.adminId}/${eventId}">link here</a>.</p>
            <p>To decline this appointment, please follow the <a href="http://localhost:3000/bookedevent/decline/${bookingFormInfo.adminId}/${eventId}">link here</a>.</p>

            <p>Alternatively, you can also copy and paste the following link into your browser:</p>
            <p>link-to-your-booking-page</p>
            <p>Thank you!</p>
            
            <p>Best regards,</p>
            <p>Your Booking System</p>
          </body>
        </html>
      `;
    
      // Convert to base64-encoded email content
      const emailContent = `From: ${senderEmail}\r\nTo: ${toEmail}\r\nSubject: ${emailSubject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${emailBody}`;
      const base64EncodedEmail = Buffer.from(emailContent).toString('base64');
      
      /*
      const mimeHeaders = [
        'MIME-Version: 1.0',
        `From: ${senderEmail}`,
        `To: ${toEmail}`,
        `Subject: ${emailSubject}`,
        'Content-Type: text/html; charset=utf-8',
        '', // Add an empty line to separate headers from the body
      ].join('\r\n');
      const rawEmailContent = `${mimeHeaders}\r\n${emailBody}`;
      const base64EncodedEmail = Buffer.from(rawEmailContent).toString('base64');
      */

      return base64EncodedEmail;
    } catch (err) {
      throw new Error('Failed to compose email.'); // or customize the error message
    }
}
  
function composeConfirmationEmail(userEntry, bookingFormInfo, eventId) {

  const senderEmail = "info@bokted.com";
  const toEmail = userEntry.email;
  const emailSubject = `Booking Request Confirmation from ${bookingFormInfo.adminInfo.displayName}`;

  const emailBody = `
    <html>
      <head>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            background-color: #f4f4f4;
            color: #333;
          }
          p {
            margin: 10px 0;
          }
          ul {
            list-style-type: none;
            padding: 0;
          }
          li {
            margin-bottom: 5px;
          }
          a {
            color: #007BFF;
            text-decoration: none;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <p>Hello ${userEntry.name},</p>
        <p>Thank you for your booking request with ${bookingFormInfo.adminInfo.displayName}. We will review your request and get back to you shortly.</p>
        <p>Booking Details: ${userEntry.message}</p>
        <p>Booking Requested for: ${userEntry.date} at ${userEntry.time}</p>
        <p>Booking Date: ${userEntry.date}</p>
        <p>view your booking reciept here: <a href="http://localhost:3000/bookingform/${bookingFormInfo.adminId}/${eventId}/success">link here</a>.</p>
        <p>Best regards,</p>
        <p>Please make sure to pay your deposit valued at: $100 at the following venmo link to secure your booking</p>
        <p>venmo: ${bookingFormInfo.tattooInfo.venmo}</p>
        <a href="https://venmo.com/${bookingFormInfo.tattooInfo.venmo}">link here</a>
        <p>Your Booking System</p>
      </body>
    </html>
  `;

  // Convert to base64-encoded email content
  const emailContent = `From: ${senderEmail}\r\nTo: ${toEmail}\r\nSubject: ${emailSubject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${emailBody}`;
  const base64EncodedEmail = Buffer.from(emailContent).toString('base64');


  return base64EncodedEmail;
}


module.exports = {
    getOAuth2Client,
    createCalendarEvent,
    sendEmail,
    composeEvent,
    composeGmail,
    composeConfirmationEmail
};