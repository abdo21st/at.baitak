const { createWorker } = require('tesseract.js');
const fs = require('fs');

async function testOCR() {
  console.log("Initializing Tesseract OCR worker...");
  const worker = await createWorker('ara+eng');
  
  const testFiles = [
    'I:/at/public/uploads/latest_whatsapp_photo_raw.jpg',
    'I:/at/public/uploads/blue_product_crop.png'
  ];

  for (const file of testFiles) {
    if (fs.existsSync(file)) {
      console.log(`\n--- Running OCR on: ${file} ---`);
      const ret = await worker.recognize(file);
      console.log("OCR Result Text:\n", ret.data.text.trim());
      console.log("Confidence:", ret.data.confidence);
    }
  }

  await worker.terminate();
  console.log("\nWorker terminated successfully.");
}

testOCR().catch(err => console.error("OCR Test Error:", err));
