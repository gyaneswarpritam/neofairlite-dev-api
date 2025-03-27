const cron = require("node-cron");
const Booking = require("./models/Booking"); // Adjust path as needed
const moment = require("moment-timezone");
const { sendNotifyMeetingExhibitor, sendNotifyMeetingVisitor } = require("./utils/notificationService");

// Fetch today's meetings
const fetchTodaysMeetings = async () => {
    const todayStart = moment().startOf("day").toDate();
    const todayEnd = moment().endOf("day").toDate();

    return await Booking.find({
        slotTime: { $gte: todayStart, $lte: todayEnd },
        status: "booked"
    }).populate("visitorId").populate("exhibitorId");
};

// Schedule notifications for a meeting
const scheduleNotifications = (meeting) => {
    const { visitorId, exhibitorId, slotTime, timeZone } = meeting;
    const meetingMoment = moment(slotTime).tz(timeZone);
    const now = moment();

    if (meetingMoment.isBefore(now)) {
        console.log("Meeting already passed. Skipping notifications.");
        return;
    }

    const reminders = [60, 30, 15, 0]; // Minutes before meeting

    reminders.forEach((minBefore) => {
        const reminderTime = meetingMoment.clone().subtract(minBefore, "minutes");
        const delay = reminderTime.diff(now); // Calculate delay in milliseconds

        if (delay > 0) {
            console.log(`Scheduling notification for ${visitorId.email} & ${exhibitorId.email} in ${delay / 60000} minutes`);

            setTimeout(async () => {
                await sendNotifyMeetingVisitor(visitorId, exhibitorId, minBefore);
                await sendNotifyMeetingExhibitor(visitorId, exhibitorId, minBefore);
                console.log(`Notification sent (${minBefore} min before meeting)`);
            }, delay);
        }
    });
};


// cron.schedule("* * * * *", async () => { // Every min
// Run the cron job every midnight to schedule the day's notifications
cron.schedule("0 0 * * *", async () => {
    console.log("Fetching today's meetings...");
    const meetings = await fetchTodaysMeetings();
    meetings.forEach(scheduleNotifications);
});

module.exports = { fetchTodaysMeetings, scheduleNotifications };
