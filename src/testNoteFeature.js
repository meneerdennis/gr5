// Test script to add example note to a hike
// This demonstrates the note feature functionality

const exampleNote = `Er bestaat geen wandelgids van E6 of E3 hier. Kennis over indeling en lengte van etappes komt van de website van de Duitse wandelpionier Heinz Schymura, die de meeste E-paden in zijn land minimaal een keer heeft gelopen. Als vuistregel hanteer ik dat twee van zijn etappes passen in één van mij. Dan had ik vandaag op 36 km moeten uitkomen maar mijn stappenteller komt uit boven de 40 en dat wordt bevestigd door mijn lichaam, vooral na de laatste inspanning steil bergop. Ik maakte de fout om direct na aankomst te willen dineren en het resultaat was ernaar: 20 cm Stau durch eine Vollsperrung bei der Ausfahrt Richtung Magen: 40 Minuten zusetzliche Reisezeit ab Kreuz Schlund. Van mijn volle bord eten kreeg ik slechts 30 % binnen.`;

// Instructions for testing:
// 1. Go to Admin Panel -> Activity Notes
// 2. Select any hiking activity from the dropdown
// 3. Paste the above text in the note field
// 4. Click "Save Note"
// 5. Go back to main page
// 6. Click on the activity in the swiper (the one with 📝 icon)
// 7. The note will appear as a notepad-style overlay in the upper right corner of the map

console.log("Example note text for testing:");
console.log(exampleNote);
console.log("\nNote feature is now ready to test!");
console.log("\nTo test:");
console.log("1. Navigate to /admin/notes in the app");
console.log("2. Add this note to any activity");
console.log("3. View the activity in the swiper to see the note indicator");
console.log("4. Click the activity to see the notepad overlay on the map");

export { exampleNote };
