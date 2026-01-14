require("dotenv").config();

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("../serviceAccountKey.json");

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const db = getFirestore(app);

const quotes = [
  {
    quote: "The journey of a thousand miles begins with a single step.",
    author: "Lao Tzu",
  },
  { quote: "Not all those who wander are lost.", author: "J.R.R. Tolkien" },
  {
    quote: "The best way to predict the future is to create it.",
    author: "Peter Drucker",
  },
  {
    quote: "Life is what happens when you're busy making other plans.",
    author: "John Lennon",
  },
  {
    quote: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
  },
  {
    quote: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
  },
  {
    quote:
      "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
  },
  {
    quote: "You miss 100% of the shots you don't take.",
    author: "Wayne Gretzky",
  },
  {
    quote: "The only impossible journey is the one you never begin.",
    author: "Tony Robbins",
  },
  { quote: "Adventure is worthwhile in itself.", author: "Amelia Earhart" },
  {
    quote: "It's not the destination, it's the journey.",
    author: "Ralph Waldo Emerson",
  },
  {
    quote: "Every mountain top is within reach if you just keep climbing.",
    author: "Barry Finlay",
  },
  {
    quote:
      "The world is a book, and those who do not travel read only one page.",
    author: "Saint Augustine",
  },
  { quote: "Travel far enough, you meet yourself.", author: "David Mitchell" },
  {
    quote:
      "Walking: the most ancient exercise and still the best modern exercise.",
    author: "Carrie Latet",
  },
  {
    quote:
      "Hiking is not escapism; it's realism. The real world is escape enough.",
    author: "David Roberts",
  },
  {
    quote: "In every walk with nature, one receives far more than he seeks.",
    author: "John Muir",
  },
  { quote: "The mountains are calling and I must go.", author: "John Muir" },
  {
    quote:
      "Of all the paths you take in life, make sure a few of them are dirt.",
    author: "John Muir",
  },
  {
    quote:
      "I took the road less traveled, and that has made all the difference.",
    author: "Robert Frost",
  },
];

async function migrateQuotes() {
  try {
    const quotesCollection = db.collection("quotes");

    for (const quote of quotes) {
      await quotesCollection.add({
        quote: quote.quote,
        author: quote.author,
      });
      console.log(`Added quote: "${quote.quote}" by ${quote.author}`);
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error migrating quotes:", error);
  }
}

migrateQuotes();
