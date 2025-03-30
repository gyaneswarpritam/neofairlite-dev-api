const path = require("path");
const fs = require("fs");
const handlebars = require("handlebars");
const moment = require("moment");

var ses = require("nodemailer-ses-transport");
const hbs = require("nodemailer-express-handlebars");

const awsKeys = {
    key: process.env.AWS_KEY,
    secret: process.env.AWS_SECRET,
};
let nodemailer = require("nodemailer");
const { sendPhoneMessage } = require("./otpService");
const { BASE_URL_IMAGE_URL, fair_name, insta_url, youtube_url, website_url, facebook_url, linkedin_url, whatsapp_url } = require("../config/config");
var transporter = nodemailer.createTransport(
    ses({
        accessKeyId: awsKeys.key,
        secretAccessKey: awsKeys.secret,
        region: "us-east-1",
    })
);
// point to the template folder
const handlebarOptions = {
    viewEngine: {
        extname: ".hbs",
        layoutsDir: "views/",
        defaultLayout: "email",
    },
    viewPath: "views/",
    extName: ".hbs",
};
// use a template file with nodemailer
transporter.use("compile", hbs(handlebarOptions));

// Send email & WhatsApp notification
const sendNotifyMeetingVisitor = async (visitor, exhibitor, slotTime, minutesLeft) => {
    if (!visitor || !exhibitor) return;

    const templatePath = path.join(__dirname, "../templates", "MEETING_REQUEST_NOTIFY_VISITOR_MAIL.html");
    const templateSource = fs.readFileSync(templatePath, "utf-8");
    const template = handlebars.compile(templateSource);

    const htmlToSend = template({
        visitorName: visitor.name,
        exhibitorName: exhibitor.name,
        exhibitorCompany: exhibitor.companyName,
        slotDate: slotTime ? moment(slotTime).format("YYYY-MM-DD") : slotTime,
        minutesLeft,
        exhibitorEmail: exhibitor.email,
        BASE_URL_IMAGE_URL: BASE_URL_IMAGE_URL,
        fair_name,
        insta_url,
        youtube_url,
        website_url,
        facebook_url,
        linkedin_url,
        whatsapp_url
    });

    if (visitor.email) {
        await transporter.sendMail({
            from: "enquiry@neofairs.com",
            cc: "enquiry@neofairs.com",
            to: visitor.email,
            subject: `Meeting Reminder - ${minutesLeft} Minutes Left`,
            html: htmlToSend,
        });
    }

    visitor.phone && sendPhoneMessage(visitor.phone, `Your meeting with ${exhibitor?.name} is in ${minutesLeft} minutes.`);
};

const sendNotifyMeetingExhibitor = async (visitor, exhibitor, slotTime, minutesLeft) => {
    if (!visitor || !exhibitor) return;

    const templatePath = path.join(__dirname, "../templates", "MEETING_REQUEST_NOTIFY_EXHIBITOR_MAIL.html");
    const templateSource = fs.readFileSync(templatePath, "utf-8");
    const template = handlebars.compile(templateSource);

    const htmlToSend = template({
        visitorName: visitor.name,
        visitorEmail: visitor.email,
        visitorCompany: visitor.companyName,
        exhibitorName: exhibitor.name,
        slotDate: slotTime ? moment(slotTime).format("YYYY-MM-DD") : slotTime,
        minutesLeft,
        exhibitorEmail: exhibitor.email,
        BASE_URL_IMAGE_URL: BASE_URL_IMAGE_URL,
        fair_name,
        insta_url,
        youtube_url,
        website_url,
        facebook_url,
        linkedin_url,
        whatsapp_url
    });

    if (exhibitor.email) {
        await transporter.sendMail({
            from: "enquiry@neofairs.com",
            cc: "enquiry@neofairs.com",
            to: exhibitor.email,
            subject: `Meeting Reminder - ${minutesLeft} Minutes Left`,
            html: htmlToSend,
        });
    }

    exhibitor.phone && sendPhoneMessage(exhibitor.phone, `Meeting with ${visitor?.name} is in ${minutesLeft} minutes.`);
};

module.exports = { sendNotifyMeetingVisitor, sendNotifyMeetingExhibitor };
