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

exports.sendHikeNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required.",
    );
  }

  const provider = context.auth?.token?.firebase?.sign_in_provider;
  if (provider === "anonymous") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Anonymous users cannot send notifications.",
    );
  }

  const adminEmails = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(",").map((email) => email.trim())
    : [];
  const email = context.auth?.token?.email || "";
  if (adminEmails.length > 0 && !adminEmails.includes(email)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Not authorized to send notifications.",
    );
  }

  const hikeId = data?.hikeId;
  const hikeName = data?.hikeName || "";
  const message = data?.message || "";
  const force = Boolean(data?.force);
  console.log("sendHikeNotification input", {
    hikeId,
    hikeName,
    message,
    force,
  });
  if (!hikeId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing hikeId.");
  }

  const hikeDoc = await admin.firestore().doc(`hikes/${hikeId}`).get();
  if (!hikeDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Hike not found.");
  }

  const hike = hikeDoc.data() || {};
  const title = "New GR5 hike posted";
  const body = message
    ? message
    : hike?.name
      ? `New hike: ${hike.name}`
      : "A new hike is available.";

  const tokenSnapshot = await admin.firestore().collection("userTokens").get();
  const rawTokens = tokenSnapshot.docs
    .flatMap((doc) => doc.data()?.tokens || [])
    .filter((token) => typeof token === "string" && token.trim().length > 0)
    .map((token) => token.trim());
  const tokens = Array.from(new Set(rawTokens));

  console.log("Found tokens:", tokens.length);
  if (tokens.length > 0) {
    console.log("Sample tokens:", tokens.slice(0, 3));
  }
  if (tokens.length === 0) {
    return { sent: 0, failed: 0, message: "No tokens registered." };
  }

  let sent = 0;
  let failed = 0;
  const tokensToDelete = [];

  for (const token of tokens) {
    try {
      await admin.messaging().send({
        token,
        notification: {
          title,
          body,
        },
        data: {
          hikeId: String(hikeId),
          hikeName: String(hikeName || hike?.name || ""),
          message: String(message || ""),
        },
        webpush: {
          notification: {
            icon: "/hiker.png",
          },
        },
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      const errorCode = error?.code || "";
      console.error("Error sending to token:", token, errorCode);
      if (
        errorCode.includes("registration-token-not-registered") ||
        errorCode.includes("invalid-registration-token")
      ) {
        tokensToDelete.push(token);
      }
    }
  }

  if (tokensToDelete.length > 0) {
    const userTokenSnapshot = await admin
      .firestore()
      .collection("userTokens")
      .get();

    const batch = admin.firestore().batch();
    userTokenSnapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      const existingTokens = Array.isArray(data.tokens) ? data.tokens : [];
      const nextTokens = existingTokens.filter(
        (token) => !tokensToDelete.includes(token),
      );
      if (nextTokens.length !== existingTokens.length) {
        batch.set(doc.ref, { tokens: nextTokens }, { merge: true });
      }
    });
    await batch.commit();
  }

  return { sent, failed, removed: tokensToDelete.length, force };
});
