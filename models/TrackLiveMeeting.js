var mongoose = require("mongoose");

var TrackLiveMeeting = new mongoose.Schema(
    {
        trackEventType: { type: String, required: true },
        data: { type: Object },
        visitor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Visitor"
        },
        exhibitor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exhibitor"
        },
        meetingId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        joinTime: {
            type: Date,
        },
        leaveTime: {
            type: Date,
        },
        ip: { type: String },
    },
    {
        timestamps: true,
    }
);

TrackLiveMeeting.index({ trackEvent: 1 });

module.exports = mongoose.model("TrackLiveMeeting", TrackLiveMeeting);
