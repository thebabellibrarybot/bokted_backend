const { Schema, model } = require("mongoose")

const ScheduleSchema = new Schema({
    userOrgin: { type: Object, required: false },
    name: { type: String, required: false },
    email: { type: String, required: false },
    phone: {type: String, required: false },
    date: { type: String, required: false },
    time: { type: String, required: false },
    message: { type: String, required: false },
    image: { type: Array, required: false },
    customFlash: { type: Array, required: false},
    size: { type: String, required: false },
    waiver: { type: Boolean, required: false },
    eventLink: { type: String, required: false },
    sentGmailResUrl: { type: String, required: false },
    timeZone: { type: String, required: false },
    startTime: { type: String, required: false },
    endTime: { type: String, required: false },
    bookedString: { type: String, required: false },
    status: { type: String, required: false },
    updated: {
        type: Date,
        default: Date.now 
    },
    created: {
        type: Date,
        default: Date.now
    }
})

const ScheduleModel = model("bookeddatesinfo", ScheduleSchema)

module.exports = ScheduleModel