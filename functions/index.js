const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
require("dotenv").config();

admin.initializeApp();

// Configure nodemailer with your email service
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Push notification function removed; leaving file for other functions only.

exports.notifyNewComment = functions.firestore
  .document("hikes/{hikeId}/comments/{commentId}")
  .onCreate(async (snap, context) => {
    const comment = snap.data();

    // Notify for all new comments

    const hikeId = context.params.hikeId;

    // Get hike name
    let hikeName = "Unknown Hike";
    try {
      const hikeDoc = await admin.firestore().doc(`hikes/${hikeId}`).get();
      if (hikeDoc.exists) {
        hikeName = hikeDoc.data().name || "Unnamed Hike";
      }
    } catch (error) {
      console.error("Error getting hike name:", error);
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.REACT_APP_CONTACT_EMAIL || "dennis.versyck@gmail.com",
      subject: `New comment on GR5 hike: ${hikeName}`,
      html: `
        <h3>New comment pending approval</h3>
        <p><strong>Hike:</strong> ${hikeName}</p>
        <p><strong>Nickname:</strong> ${comment.nickname}</p>
        <p><strong>Comment:</strong></p>
        <p style="background-color: #f5f5f5; padding: 10px; border-left: 4px solid #ccc;">${
          comment.text
        }</p>
        <p><strong>Posted:</strong> ${comment.createdAt
          .toDate()
          .toLocaleString()}</p>
        <p><strong>User ID:</strong> ${comment.uid}</p>
        <p><a href="https://console.firebase.google.com/project/gr-5-4df65/firestore/data/hikes/${hikeId}/comments/${
          context.params.commentId
        }" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Approve in Firebase Console</a></p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(
        "Notification email sent successfully for comment:",
        context.params.commentId,
      );
    } catch (error) {
      console.error("Error sending notification email:", error);
    }
  });
