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

// Send Push Notifications to PWA Users
exports.sendHikeNotification = functions.https.onCall(async (data, context) => {
  // Verify admin authorization
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in",
    );
  }

  const { hikeId, hikeName, message } = data;

  if (!hikeId || !hikeName || !message) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required fields: hikeId, hikeName, message",
    );
  }

  try {
    // Get all user tokens from Firestore
    const tokensSnapshot = await admin
      .firestore()
      .collection("userTokens")
      .get();

    const tokens = [];
    tokensSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.tokens && Array.isArray(data.tokens)) {
        tokens.push(...data.tokens);
      }
    });

    if (tokens.length === 0) {
      return {
        success: true,
        successCount: 0,
        failureCount: 0,
        message: "No registered devices found",
      };
    }

    // Prepare the notification payload
    const notificationPayload = {
      notification: {
        title: `New Hike: ${hikeName}`,
        body: message,
        icon: "/hiker.png",
        badge: "/hikersmall.png",
        tag: hikeId,
      },
      data: {
        hikeId: hikeId,
        hikeName: hikeName,
        link: `/hike/${hikeId}`,
        timestamp: new Date().toISOString(),
      },
    };

    // Send notifications in batches (Firebase has a limit)
    const batchSize = 500;
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      try {
        const response = await admin.messaging().sendMulticast({
          tokens: batch,
          notification: notificationPayload.notification,
          data: notificationPayload.data,
          webpush: {
            fcmOptions: {
              link: notificationPayload.data.link,
            },
            notification: {
              title: notificationPayload.notification.title,
              body: notificationPayload.notification.body,
              icon: notificationPayload.notification.icon,
              badge: notificationPayload.notification.badge,
              tag: notificationPayload.notification.tag,
              vibrate: [200, 100, 200],
            },
          },
        });

        successCount += response.successCount;
        failureCount += response.failureCount;

        // Remove failed tokens from Firestore
        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, index) => {
            if (!resp.success) {
              failedTokens.push(batch[index]);
            }
          });

          // Clean up invalid tokens
          for (const failedToken of failedTokens) {
            try {
              const querySnapshot = await admin
                .firestore()
                .collection("userTokens")
                .where("tokens", "array-contains", failedToken)
                .get();

              querySnapshot.forEach((docSnapshot) => {
                const tokens = docSnapshot.data().tokens || [];
                const updatedTokens = tokens.filter((t) => t !== failedToken);
                if (updatedTokens.length > 0) {
                  docSnapshot.ref.update({ tokens: updatedTokens });
                } else {
                  docSnapshot.ref.delete();
                }
              });
            } catch (error) {
              console.error("Error cleaning up token:", failedToken, error);
            }
          }
        }
      } catch (error) {
        console.error("Error sending batch notification:", error);
        failureCount += batch.length;
      }
    }

    // Log the notification
    await admin.firestore().collection("notificationLog").add({
      hikeId: hikeId,
      hikeName: hikeName,
      message: message,
      totalSent: successCount,
      totalFailed: failureCount,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      sentBy: context.auth.uid,
    });

    return {
      success: true,
      successCount: successCount,
      failureCount: failureCount,
      totalSent: successCount + failureCount,
    };
  } catch (error) {
    console.error("Error sending notifications:", error);
    throw new functions.https.HttpsError(
      "internal",
      `Failed to send notifications: ${error.message}`,
    );
  }
});

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
