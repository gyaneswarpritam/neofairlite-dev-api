const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

var ses = require("nodemailer-ses-transport");
const hbs = require("nodemailer-express-handlebars");
const crypto = require("crypto");

const awsKeys = {
  key: process.env.AWS_KEY,
  secret: process.env.AWS_SECRET,
};
let nodemailer = require("nodemailer");
const Exhibitor = require("../models/Exhibitor");
const Visitor = require("../models/Visitor");
const { sendPhoneMessage } = require("../utils/otpService");
const ExhibitorChildUser = require('../models/ExhibitorChildUser');
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
const emailController = {};
emailController.sendRegisteredMail = async function (visitorId, baseUrl) {
  try {
    // Generate a verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Update the existing visitor record with the verification token and expiry time
    const visitor = await Visitor.findByIdAndUpdate(
      visitorId,
      {
        verificationToken: verificationToken,
        verificationTokenExpires: Date.now() + 365 * 24 * 60 * 60 * 1000,
      },
      { new: true }
    );

    if (!visitor) {
      throw new Error("Visitor not found");
    }

    // Read and compile the email template
    const templatePath = path.join(__dirname, '../templates', 'REGISTRATION_CONFIRMATION_VISITOR_MAIL.html');
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateSource);

    // Generate verification URL and populate the template
    const verificationUrl = `${baseUrl}/visitor-verify?token=${verificationToken}`;
    const htmlToSend = template({ verificationUrl, name: visitor.name });

    // Send the email
    let info = await transporter.sendMail({
      from: "enquiry@neofairs.com",
      cc: "enquiry@neofairs.com",
      to: visitor.email,
      subject: "DEV - Verify Your Email Address",
      html: htmlToSend,
    });
    return info.messageId;

  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
};
emailController.sendExhibitorRegisteredMail = async function (exhibitorId) {
  try {
    const exhibitor = await Exhibitor.findById(exhibitorId);

    if (!exhibitor) {
      throw new Error("exhibitor not found");
    }

    // Read and compile the email template
    const templatePath = path.join(__dirname, '../templates', 'REGISTRATION_CONFIRMATION_EXHIBITOR_MAIL.html');
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateSource);

    const htmlToSend = template({ name: exhibitor.name });

    // Send the verification email
    let info = await transporter.sendMail({
      from: "enquiry@neofairs.com",
      cc: "enquiry@neofairs.com",
      to: exhibitor.email,
      subject: "DEV - Welcome to Neofairs – Your Registration is Pending Approval",
      html: htmlToSend
    });
    return info.messageId;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
};

emailController.sendExhibitorChildRegisteredMail = async function (exhibitorId) {
  try {
    const exhibitorChild = await ExhibitorChildUser.findById(exhibitorId);

    if (!exhibitorChild) {
      throw new Error("exhibitor not found");
    }

    // Read and compile the email template
    const templatePath = path.join(__dirname, '../templates', 'REGISTRATION_CONFIRMATION_EXHIBITOR_MAIL.html');
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateSource);

    const htmlToSend = template({ name: exhibitorChild.name });

    // Send the verification email
    let info = await transporter.sendMail({
      from: "enquiry@neofairs.com",
      cc: "enquiry@neofairs.com",
      to: exhibitorChild.email,
      subject: "DEV - Welcome to Neofairs – Your Registration is Pending Approval",
      html: htmlToSend
    });
    return info.messageId;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
};
emailController.sendApprovalExhibitorMail = async function (data) {
  // Read and compile the email template
  const templatePath = path.join(__dirname, '../templates', 'REGISTRATION_APPROVAL_MAIL.html');
  const templateSource = fs.readFileSync(templatePath, 'utf-8');
  const template = handlebars.compile(templateSource);

  const htmlToSend = template({ name: data.name });

  let info = await transporter.sendMail({
    from: "enquiry@neofairs.com",
    cc: "enquiry@neofairs.com",
    to: data["email"],
    subject: "DEV - Approval Email",
    html: htmlToSend
  });
  return info.messageId;
};

emailController.sendForgotPassword = async function (data, password) {
  // Read and compile the email template
  const templatePath = path.join(__dirname, '../templates', 'FORGET_PASSWORD_MAIL.html');
  const templateSource = fs.readFileSync(templatePath, 'utf-8');
  const template = handlebars.compile(templateSource);

  const htmlToSend = template({ name: data.name, password });

  let info = await transporter.sendMail({
    from: "enquiry@neofairs.com",
    cc: "enquiry@neofairs.com",
    to: data["email"],
    subject: "DEV -Forgot Password Email",
    html: htmlToSend
  });
  return info.messageId;
};

emailController.sendForgotPasswordSuccess = async function (data) {
  // Read and compile the email template
  const templatePath = path.join(__dirname, '../templates', 'PASSWORD_RESET_SUCCESS_MAIL.html');
  const templateSource = fs.readFileSync(templatePath, 'utf-8');
  const template = handlebars.compile(templateSource);

  const htmlToSend = template({ name: data.name });

  let info = await transporter.sendMail({
    from: "enquiry@neofairs.com",
    cc: "enquiry@neofairs.com",
    to: data["email"],
    subject: "DEV - Password Reset Successfully",
    html: htmlToSend
  });
  return info.messageId;
};

emailController.sendBookingConfirmationMail = async function (data) {
  try {
    const { visitorId, exhibitorId, slotData, status } = data;
    // Fetch the visitor and exhibitor details
    const visitor = await Visitor.findById(visitorId);
    const exhibitor = await Exhibitor.findById(exhibitorId);

    if (!visitor || !exhibitor) {
      throw new Error("Visitor or Exhibitor not found");
    }
    let templatePathVisitor;
    let templatePathExhibitor;
    // Read and compile the email template
    if (status == "approve") {
      templatePathVisitor = path.join(__dirname, '../templates', 'MEETING_CONFIRMATION_VISITOR_MAIL.html');
      templatePathExhibitor = path.join(__dirname, '../templates', 'MEETING_CONFIRMATION_EXHIBITOR_MAIL.html');
    } else {
      templatePathVisitor = path.join(__dirname, '../templates', 'MEETING_DECLINED_VISITOR_MAIL.html');
      templatePathExhibitor = path.join(__dirname, '../templates', 'MEETING_DECLINED_EXHIBITOR_MAIL.html');
    }
    const templateSourceVisitor = fs.readFileSync(templatePathVisitor, 'utf-8');
    const templateVisitor = handlebars.compile(templateSourceVisitor);
    const templateSourceExhibitor = fs.readFileSync(templatePathExhibitor, 'utf-8');
    const templateExhibitor = handlebars.compile(templateSourceExhibitor);

    const htmlToSendVisitor = templateVisitor({
      visitorName: visitor.name,
      visitorEmail: visitor.email,
      visitorCompany: visitor.companyName,
      slotDate: slotData.date,
      exhibitorName: exhibitor.name,
      exhibitorEmail: exhibitor.email,
      exhibitorCompany: exhibitor.companyName,
    });
    const htmlToSendExhibitor = templateExhibitor({
      visitorName: visitor.name,
      visitorCompany: visitor.companyName,
      slotDate: slotData.date,
      exhibitorName: exhibitor.name,
      exhibitorEmail: exhibitor.email,
      exhibitorCompany: exhibitor.companyName,
    });

    if (visitor.email) {
      // Send email to visitor
      let visitorInfo = await transporter.sendMail({
        from: "enquiry@neofairs.com",
        cc: "enquiry@neofairs.com",
        to: visitor.email,
        subject: status == "approve" ? "DEV -Meeting Confirmation" : "DEV - Meeting Declined",
        html: htmlToSendVisitor,
      });
    }


    // Send email to exhibitor
    let exhibitorInfo = await transporter.sendMail({
      from: "enquiry@neofairs.com",
      cc: "enquiry@neofairs.com",
      to: exhibitor.email,
      subject: status == "approve" ? "DEV - Meeting Confirmation" : "DEV - Meeting Declined",
      html: htmlToSendExhibitor,
    });
    visitor.phone && sendPhoneMessage(visitor.phone, `Your slot has been successfully booked with ${exhibitor.name} on ${slotData.date} .`);
    exhibitor && exhibitor?.phone && sendPhoneMessage(exhibitor?.phone, `${visitor?.name} has booked a slot with you on ${slotData.date} .`);
  } catch (error) {
    console.error("Error sending booking confirmation email:", error);
    throw error;
  }
};

emailController.sendBookingRequestMail = async function (data) {
  try {
    const { visitorId, exhibitorId, slotData } = data;
    // Fetch the visitor and exhibitor details
    const visitor = await Visitor.findById(visitorId);
    const exhibitor = await Exhibitor.findById(exhibitorId);

    if (!visitor || !exhibitor) {
      throw new Error("Visitor or Exhibitor not found");
    }

    // Read and compile the email template
    const templatePath = path.join(__dirname, '../templates', 'MEETING_REQUEST_VISITOR_MAIL.html');
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateSource);

    const htmlToSend = template({
      visitorName: visitor?.name,
      exhibitorName: exhibitor?.name,
      exhibitorCompany: exhibitor?.companyName,
      slotDate: slotData?.date,
      exhibitorEmail: exhibitor?.email
    });

    if (visitor.email) {
      // Send email to visitor
      let visitorInfo = await transporter.sendMail({
        from: "enquiry@neofairs.com",
        cc: "enquiry@neofairs.com",
        to: visitor.email,
        subject: "DEV - Meeting Reminder",
        html: htmlToSend,
      });
    }

    // Read and compile the email template
    const templatePathExhibitor = path.join(__dirname, '../templates', 'MEETING_REQUEST_EXHIBITOR_MAIL.html');
    const templateSourceExhibitor = fs.readFileSync(templatePathExhibitor, 'utf-8');
    const templateExhibitor = handlebars.compile(templateSourceExhibitor);

    const htmlToSendExhibitor = templateExhibitor({
      visitorName: visitor?.name,
      visitorEmail: visitor?.email,
      visitorCompany: visitor?.companyName,
      exhibitorName: exhibitor?.name,
      slotDate: slotData?.date,
      exhibitorEmail: exhibitor?.email
    });
    // Send email to exhibitor
    let exhibitorInfo = await transporter.sendMail({
      from: "enquiry@neofairs.com",
      cc: "enquiry@neofairs.com",
      to: exhibitor?.email,
      subject: "DEV - New Meeting Request",
      html: htmlToSendExhibitor,
    });
    visitor.phone && sendPhoneMessage(visitor.phone, `Your request to book a slot with ${exhibitor?.name} on ${slotData.date} has been submitted successfully.`);
    exhibitor && exhibitor?.phone && sendPhoneMessage(exhibitor?.phone, `${visitor?.name} has requested a booking with you on ${slotData.date}.`);
  } catch (error) {
    console.error("Error sending Meeting request email:", error);
    throw error;
  }
};

emailController.sendBookingNotifyVisitorMail = async (req, res) => {
  const { visitorId, exhibitorId, slotDetails, minutesLeft } = req.body;
  try {
    // Fetch the visitor and exhibitor details
    const visitor = await Visitor.findById(visitorId);
    const exhibitor = await Exhibitor.findById(exhibitorId);
    if (!visitor || !exhibitor) {
      throw new Error("Visitor or Exhibitor not found");
    }
    // Read and compile the email template
    const templatePath = path.join(__dirname, '../templates', 'MEETING_REQUEST_NOTIFY_VISITOR_MAIL.html');
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateSource);

    const htmlToSend = template({
      visitorName: visitor.name,
      exhibitorName: exhibitor.name,
      exhibitorCompany: exhibitor.companyName,
      slotDate: slotDetails.Date,
      minutesLeft: minutesLeft,
      exhibitorEmail: exhibitor.email,
    });

    if (visitor.email) {
      // Send email to visitor
      let visitorInfo = await transporter.sendMail({
        from: "enquiry@neofairs.com",
        cc: "enquiry@neofairs.com",
        to: visitor.email,
        subject: "DEV - Meeting Reminder",
        html: htmlToSend,
      });
    }

    visitor.phone && sendPhoneMessage(visitor.phone, `Your meeting with ${exhibitor?.name} on ${slotDetails.Date} will be started in ${minutesLeft} minutes.`);
  } catch (error) {
    console.error("Error sending Meeting request email:", error);
    throw error;
  }
};

emailController.sendBookingNotifyExhibitorMail = async (req, res) => {
  const { visitorId, exhibitorId, slotDetails, minutesLeft } = req.body;
  try {
    // Fetch the visitor and exhibitor details
    const visitor = await Visitor.findById(visitorId);
    const exhibitor = await Exhibitor.findById(exhibitorId);

    if (!visitor || !exhibitor) {
      throw new Error("Visitor or Exhibitor not found");
    }

    // Read and compile the email template
    const templatePathExhibitor = path.join(__dirname, '../templates', 'MEETING_REQUEST_NOTIFY_EXHIBITOR_MAIL.html');
    const templateSourceExhibitor = fs.readFileSync(templatePathExhibitor, 'utf-8');
    const templateExhibitor = handlebars.compile(templateSourceExhibitor);

    const htmlToSendExhibitor = templateExhibitor({
      visitorName: visitor.name,
      visitorEmail: visitor.email,
      visitorCompany: visitor.companyName,
      exhibitorName: exhibitor.name,
      slotDate: slotDetails.Date,
      minutesLeft: minutesLeft,
      exhibitorEmail: exhibitor.email
    });
    // Send email to exhibitor
    let exhibitorInfo = await transporter.sendMail({
      from: "enquiry@neofairs.com",
      cc: "enquiry@neofairs.com",
      to: exhibitor.email,
      subject: "DEV - New Meeting Request",
      html: htmlToSendExhibitor,
    });
    exhibitor && exhibitor?.phone && sendPhoneMessage(exhibitor?.phone, `${visitor?.name} has meeting with you on ${slotDetails.Date} in ${minutesLeft} minutes.`);
  } catch (error) {
    console.error("Error sending Meeting request email:", error);
    throw error;
  }
};

emailController.sendStallVisitSMS = async function (req, res) {
  try {
    const { visitorId, exhibitorId } = req.body;
    // Fetch the visitor and exhibitor details
    const visitor = await Visitor.findById(visitorId);
    const exhibitor = await Exhibitor.findById(exhibitorId);

    exhibitor && exhibitor?.phone && sendPhoneMessage(exhibitor?.phone, `${visitor?.name} has visited the stall now.`);
  } catch (error) {
    console.error("Error sending booking request email:", error);
    throw error;
  }
};


module.exports = emailController;
