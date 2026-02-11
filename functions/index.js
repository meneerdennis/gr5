const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const axios = require("axios");
const { onRequest } = require("firebase-functions/v2/https");
require("dotenv").config();

admin.initializeApp();
const db = admin.firestore();

// Configure nodemailer with your email service
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Push notification function removed; leaving file for other functions only.

// Strava webhook helpers
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;

async function getAccessToken() {
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
    console.error("❌ STRAVA_* environment variables ontbreken");
    throw new Error("Missing STRAVA env vars");
  }

  const resp = await axios.post("https://www.strava.com/api/v3/oauth/token", {
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    refresh_token: STRAVA_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });

  const data = resp.data;
  console.log("✅ Access token (webhook) verkregen, scope:", data.scope);
  return data.access_token;
}

async function importSingleActivity(activityId) {
  const accessToken = await getAccessToken();

  const actResp = await axios.get(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { include_all_efforts: false },
    },
  );
  const act = actResp.data;

  console.log("➡️ Nieuwe GR5-activiteit via webhook:", act.name);

  let photos = [];
  try {
    const photosResp = await axios.get(
      `https://www.strava.com/api/v3/activities/${activityId}/photos`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { size: 600 },
      },
    );

    const items = Array.isArray(photosResp.data) ? photosResp.data : [];
    photos = items
      .map((p) => {
        const urls = p.urls || {};
        const url600 = urls["600"] || urls["0"] || null;
        return {
          id: p.id || p.unique_id || null,
          url: url600,
          caption: p.caption || null,
        };
      })
      .filter((p) => !!p.url);
  } catch (err) {
    if (err.response && err.response.data) {
      console.error("❌ Fout bij ophalen foto's:", err.response.data);
    } else {
      console.error("❌ Fout bij ophalen foto's:", err.message || err);
    }
  }

  const polyline =
    act.map && act.map.summary_polyline ? act.map.summary_polyline : null;

  const hikeData = {
    stravaId: act.id,
    name: act.name,
    description: act.description || "",
    note: act.description || "",
    distanceKm: act.distance ? act.distance / 1000 : null,
    movingTimeSec: act.moving_time || null,
    elapsedTimeSec: act.elapsed_time || null,
    startDate: act.start_date || null,
    type: act.type,
    polyline,
    photos,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("hikes").doc(String(act.id)).set(hikeData, {
    merge: true,
  });

  console.log("✅ GR5-hike opgeslagen vanuit webhook:", act.name);
}

exports.notifyNewComment = functions.firestore
  .document("hikes/{hikeId}/comments/{commentId}")
  .onCreate(async (snap, context) => {
    const comment = snap.data();

    // Notify for all new comments

    const hikeId = context.params.hikeId;

    // Get hike name + existing commenter list (single read)
    let hikeName = "Unknown Hike";
    let hikeData = {};
    const hikeRef = admin.firestore().doc(`hikes/${hikeId}`);
    try {
      const hikeDoc = await hikeRef.get();
      if (hikeDoc.exists) {
        hikeData = hikeDoc.data() || {};
        hikeName = hikeData.name || "Unnamed Hike";
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

    // Push notifications to users who previously commented on this hike
    try {
      // Push notifications are disabled by default. To re-enable, set:
      // ENABLE_COMMENT_PUSH='true' in your functions environment.
      if (process.env.ENABLE_COMMENT_PUSH !== "true") {
        console.log(
          "Comment push notifications are disabled (ENABLE_COMMENT_PUSH !== true).",
        );
        return null;
      }

      const commentUid = comment?.uid || null;
      const isApproved = comment?.approved !== false;
      if (!isApproved) return;

      if (commentUid) {
        await hikeRef.set(
          {
            commenterUids: admin.firestore.FieldValue.arrayUnion(commentUid),
          },
          { merge: true },
        );
      }

      const storedUids = Array.isArray(hikeData.commenterUids)
        ? hikeData.commenterUids
        : [];
      const updatedUids = commentUid
        ? Array.from(new Set([...storedUids, commentUid]))
        : storedUids;

      const uniqueUids = updatedUids.filter((uid) => uid && uid !== commentUid);

      if (uniqueUids.length === 0) return;

      const tokenDocs = [];
      const tokenRefs = uniqueUids.map((uid) =>
        admin.firestore().collection("userTokens").doc(uid),
      );

      const chunkSize = 20;
      for (let i = 0; i < tokenRefs.length; i += chunkSize) {
        const chunk = tokenRefs.slice(i, i + chunkSize);
        const chunkDocs = await admin.firestore().getAll(...chunk);
        tokenDocs.push(...chunkDocs);
      }

      const rawTokens = tokenDocs.flatMap((doc) => {
        if (!doc.exists) return [];
        const data = doc.data() || {};
        const tokensMeta = data.tokensMeta || {};
        const metaTokens = Object.keys(tokensMeta);
        const tokensArray = Array.isArray(data.tokens) ? data.tokens : [];
        return [...metaTokens, ...tokensArray];
      });

      const normalizedTokens = rawTokens
        .filter((token) => typeof token === "string" && token.trim().length > 0)
        .map((token) => token.trim());
      const tokens = Array.from(new Set(normalizedTokens));

      if (tokens.length === 0) return;

      const nickname = comment?.nickname || "Someone";
      const rawText = comment?.text || "";
      const snippet =
        rawText.length > 120 ? `${rawText.slice(0, 117)}...` : rawText;
      const title = `New comment on ${hikeName}`;
      const body = snippet
        ? `${nickname}: ${snippet}`
        : `${nickname} commented.`;

      const tokenChunks = [];
      const maxTokens = 400;
      for (let i = 0; i < tokens.length; i += maxTokens) {
        tokenChunks.push(tokens.slice(i, i + maxTokens));
      }

      const responses = [];
      for (const chunk of tokenChunks) {
        const response = await admin.messaging().sendEachForMulticast({
          tokens: chunk,
          data: {
            title: String(title),
            body: String(body),
            hikeId: String(hikeId),
            hikeName: String(hikeName || ""),
            type: "comment",
            refreshHikes: "true",
            icon: "/hiker.png",
          },
        });
        responses.push(response);
      }

      const failedTokens = [];
      responses.forEach((response, index) => {
        const chunk = tokenChunks[index] || [];
        response.responses.forEach((res, idx) => {
          if (res.success) return;
          const errorCode = res.error?.code || "";
          if (
            errorCode.includes("registration-token-not-registered") ||
            errorCode.includes("invalid-registration-token")
          ) {
            failedTokens.push(chunk[idx]);
          }
        });
      });

      if (failedTokens.length > 0 && tokenDocs.length > 0) {
        const batch = admin.firestore().batch();
        tokenDocs.forEach((docSnap) => {
          if (!docSnap.exists) return;
          const data = docSnap.data() || {};
          const existingTokens = Array.isArray(data.tokens) ? data.tokens : [];
          const nextTokens = existingTokens.filter(
            (token) => !failedTokens.includes(token),
          );
          const updateData = { tokens: nextTokens };

          const existingMeta = data.tokensMeta || {};
          failedTokens.forEach((token) => {
            if (existingMeta[token]) {
              updateData[`tokensMeta.${token}`] =
                admin.firestore.FieldValue.delete();
            }
          });

          if (
            nextTokens.length !== existingTokens.length ||
            Object.keys(updateData).length > 1
          ) {
            batch.update(docSnap.ref, updateData);
          }
        });
        await batch.commit();
      }

      console.log(
        `Notified ${tokens.length} tokens for comment on hike ${hikeId}.`,
      );
    } catch (error) {
      console.error("Error sending comment push notifications:", error);
    }
  });

// Record a tiny meta doc when hikes change so clients can react to edits/deletes cheaply
exports.trackHikeChanges = functions.firestore
  .document("hikes/{hikeId}")
  .onWrite(async (change, context) => {
    const hikeId = context.params.hikeId;
    const beforeExists = change.before.exists;
    const afterExists = change.after.exists;

    let type = "modified";
    if (!beforeExists && afterExists) type = "added";
    else if (beforeExists && !afterExists) type = "removed";

    try {
      await admin
        .firestore()
        .doc("meta/hikesLatestChange")
        .set(
          {
            id: String(hikeId),
            type,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      console.log(`Recorded hike change: ${hikeId} (${type})`);
    } catch (err) {
      console.error("Error writing hike change meta:", err);
    }

    return null;
  });

exports.updateHikeCommentCount = functions.firestore
  .document("hikes/{hikeId}/comments/{commentId}")
  .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    const beforeApproved = before?.approved === true;
    const afterApproved = after?.approved === true;

    let delta = 0;
    if (!before && afterApproved) {
      delta = 1;
    } else if (before && !after) {
      delta = beforeApproved ? -1 : 0;
    } else if (before && after) {
      if (!beforeApproved && afterApproved) delta = 1;
      if (beforeApproved && !afterApproved) delta = -1;
    }

    if (delta === 0) return null;

    const hikeId = context.params.hikeId;
    const countRef = admin
      .firestore()
      .collection("hikeCommentCounts")
      .doc(hikeId);
    const hikeRef = admin.firestore().doc(`hikes/${hikeId}`);

    return admin.firestore().runTransaction(async (tx) => {
      const countSnap = await tx.get(countRef);
      const currentCount = countSnap.exists
        ? Number(countSnap.data()?.count || 0)
        : 0;
      const nextCount = Math.max(0, currentCount + delta);

      tx.set(
        countRef,
        {
          hikeId,
          count: nextCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.set(hikeRef, { commentsCount: nextCount }, { merge: true });
    });
  });

exports.backfillHikeCommentCounts = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required.",
      );
    }

    const adminEmails = process.env.ADMIN_EMAILS
      ? process.env.ADMIN_EMAILS.split(",").map((email) => email.trim())
      : [];
    const email = context.auth?.token?.email || "";
    if (adminEmails.length > 0 && !adminEmails.includes(email)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Not authorized to run backfill.",
      );
    }

    const hikeSnapshot = await admin.firestore().collection("hikes").get();
    const counts = new Map();

    await Promise.all(
      hikeSnapshot.docs.map(async (doc) => {
        const hikeId = doc.id;
        const commentsSnap = await admin
          .firestore()
          .collection(`hikes/${hikeId}/comments`)
          .where("approved", "==", true)
          .get();
        counts.set(hikeId, commentsSnap.size);
      }),
    );

    const batch = admin.firestore().batch();
    counts.forEach((count, hikeId) => {
      const countRef = admin
        .firestore()
        .collection("hikeCommentCounts")
        .doc(hikeId);
      const hikeRef = admin.firestore().doc(`hikes/${hikeId}`);
      batch.set(
        countRef,
        {
          hikeId,
          count,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      batch.set(hikeRef, { commentsCount: count }, { merge: true });
    });

    await batch.commit();

    return { success: true, updated: counts.size };
  },
);

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
  const rawTokens = tokenSnapshot.docs.flatMap((doc) => {
    const data = doc.data() || {};
    const tokensMeta = data.tokensMeta || {};
    const metaTokens = Object.keys(tokensMeta);
    const tokensArray = Array.isArray(data.tokens) ? data.tokens : [];
    return [...metaTokens, ...tokensArray];
  });
  const normalizedTokens = rawTokens
    .filter((token) => typeof token === "string" && token.trim().length > 0)
    .map((token) => token.trim());
  const tokens = Array.from(new Set(normalizedTokens));

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

  const tokenChunks = [];
  const maxTokens = 400;
  for (let i = 0; i < tokens.length; i += maxTokens) {
    tokenChunks.push(tokens.slice(i, i + maxTokens));
  }

  const responses = [];
  for (const chunk of tokenChunks) {
    const response = await admin.messaging().sendEachForMulticast({
      tokens: chunk,
      data: {
        title: String(title),
        body: String(body),
        hikeId: String(hikeId),
        hikeName: String(hikeName || hike?.name || ""),
        message: String(message || ""),
        type: "hike",
        refreshHikes: "true",
        icon: "/hiker.png",
      },
    });
    responses.push(response);
  }

  responses.forEach((response, index) => {
    const chunk = tokenChunks[index] || [];
    response.responses.forEach((res, idx) => {
      if (res.success) {
        sent += 1;
        return;
      }
      failed += 1;
      const errorCode = res.error?.code || "";
      console.error("Error sending to token:", chunk[idx], errorCode);
      if (
        errorCode.includes("registration-token-not-registered") ||
        errorCode.includes("invalid-registration-token")
      ) {
        tokensToDelete.push(chunk[idx]);
      }
    });
  });

  if (tokensToDelete.length > 0) {
    const batch = admin.firestore().batch();
    tokenSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const existingTokens = Array.isArray(data.tokens) ? data.tokens : [];
      const nextTokens = existingTokens.filter(
        (token) => !tokensToDelete.includes(token),
      );
      const updateData = { tokens: nextTokens };

      const existingMeta = data.tokensMeta || {};
      tokensToDelete.forEach((token) => {
        if (existingMeta[token]) {
          updateData[`tokensMeta.${token}`] =
            admin.firestore.FieldValue.delete();
        }
      });

      if (
        nextTokens.length !== existingTokens.length ||
        Object.keys(updateData).length > 1
      ) {
        batch.update(docSnap.ref, updateData);
      }
    });
    await batch.commit();
  }

  return { sent, failed, removed: tokensToDelete.length, force };
});

exports.stravaWebhook = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    if (req.method === "GET") {
      console.log(
        "✅ Strava webhook verificatie-request ontvangen:",
        req.query,
      );
      return res.json({ "hub.challenge": req.query["hub.challenge"] });
    }

    if (req.method === "POST") {
      const event = req.body;
      console.log("📩 Webhook event:", JSON.stringify(event));

      if (
        event.object_type === "activity" &&
        (event.aspect_type === "create" || event.aspect_type === "update")
      ) {
        try {
          await importSingleActivity(event.object_id);
        } catch (err) {
          console.error("❌ Fout bij verwerken activiteit:", err);
        }
      }

      return res.status(200).send("OK");
    }

    return res.status(405).send("Method not allowed");
  },
);
