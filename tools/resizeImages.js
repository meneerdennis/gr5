require("dotenv").config();

const admin = require("firebase-admin");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin
const serviceAccount = require("../serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function resizeImage(buffer, maxWidth = 1920, quality = 80) {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    let resizeOptions = {};
    if (metadata.width > maxWidth) {
      resizeOptions.width = maxWidth;
      resizeOptions.height = Math.round(
        (metadata.height * maxWidth) / metadata.width
      );
      resizeOptions.fit = "inside";
    }

    const resizedBuffer = await image
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(resizeOptions)
      .webp({ quality })
      .toBuffer();

    return resizedBuffer;
  } catch (error) {
    console.error("Error resizing image:", error);
    throw error;
  }
}

async function main() {
  try {
    console.log("Starting image resize process...");

    // List all files in the photos directory
    const [files] = await bucket.getFiles({ prefix: "photos/" });

    console.log(`Found ${files.length} files in storage`);

    // Filter for image files (not thumbnails, not videos)
    const imageFiles = files.filter((file) => {
      const fileName = file.name;
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
      const isThumbnail =
        fileName.includes("/thumb_") || fileName.startsWith("thumb_");
      return isImage && !isThumbnail;
    });

    console.log(`Found ${imageFiles.length} image files to process`);

    const results = [];
    for (const file of imageFiles) {
      try {
        console.log(`Processing file: ${file.name}`);

        // Parse path to get metadata
        const pathParts = file.name.split("/");
        if (pathParts.length < 3) {
          console.log(
            `Skipping file with unexpected path structure: ${file.name}`
          );
          continue;
        }

        const hikeId = pathParts[1];
        const fileName = pathParts.slice(2).join("/");

        // Check if already resized by looking at metadata
        const [metadata] = await file.getMetadata();
        if (metadata.metadata && metadata.metadata.resized === "true") {
          console.log(`Skipping already resized: ${file.name}`);
          continue;
        }

        // Download the file
        const [buffer] = await file.download();
        console.log(`Downloaded ${buffer.length} bytes`);

        // Resize the image
        const resizedBuffer = await resizeImage(buffer);
        console.log(`Resized to ${resizedBuffer.length} bytes`);

        // Upload the resized image back
        await file.save(resizedBuffer, {
          metadata: {
            contentType: "image/webp",
            metadata: {
              resized: "true",
              originalSize: buffer.length.toString(),
              resizedSize: resizedBuffer.length.toString(),
              resizedAt: new Date().toISOString(),
            },
          },
        });

        console.log(`Successfully resized file: ${file.name}`);
        results.push({
          fileName: file.name,
          success: true,
          originalSize: buffer.length,
          newSize: resizedBuffer.length,
        });
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        results.push({
          fileName: file.name,
          success: false,
          error: error.message,
        });
      }

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(
      `Process completed. Successful: ${successful}, Failed: ${failed}`
    );

    // Log summary
    const totalOriginalSize = results
      .filter((r) => r.success)
      .reduce((sum, r) => sum + r.originalSize, 0);
    const totalNewSize = results
      .filter((r) => r.success)
      .reduce((sum, r) => sum + r.newSize, 0);
    const savings = totalOriginalSize - totalNewSize;
    const savingsPercent =
      totalOriginalSize > 0
        ? ((savings / totalOriginalSize) * 100).toFixed(2)
        : 0;

    console.log(`Total size reduction: ${savings} bytes (${savingsPercent}%)`);
  } catch (error) {
    console.error("Error in main process:", error);
  }
}

main()
  .then(() => {
    console.log("Script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
