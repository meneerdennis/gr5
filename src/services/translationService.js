const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

export async function translateText(text, targetLang = "en") {
  try {
    // If text is within limit, translate normally
    if (text.length <= 500) {
      const langpair = `nl|${targetLang}`;
      const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=${langpair}&de=dennis.versyc@gmail.com`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      const data = await response.json();
      const translated = data.responseData?.translatedText;

      if (!translated) {
        throw new Error("No translation received");
      }

      return translated;
    }

    // For longer texts, split into chunks and translate each
    const chunks = splitTextIntoChunks(text, 450); // Leave some buffer
    const translatedChunks = await Promise.all(
      chunks.map((chunk) => translateChunk(chunk, targetLang))
    );

    return translatedChunks.join(" ");
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}

function splitTextIntoChunks(text, maxLength) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxLength;

    // Try to break at word boundaries
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(" ", end);
      if (lastSpace > start) {
        end = lastSpace;
      }
    }

    chunks.push(text.substring(start, end));
    start = end;
  }

  return chunks;
}

async function translateChunk(chunk, targetLang) {
  const langpair = `nl|${targetLang}`;
  const url = `${MYMEMORY_URL}?q=${encodeURIComponent(chunk)}&langpair=${langpair}&de=dennis.versyc@gmail.com`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Translation failed: ${response.status}`);
  }

  const data = await response.json();
  return data.responseData?.translatedText || chunk;
}

export function getUserLanguage() {
  return navigator.language.split("-")[0] || "en";
}
