const fs = require('fs');

async function testOcrSpace() {
  const filePath = 'I:/at/public/uploads/blue_product_crop.png';
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');
  const base64Image = `data:image/png;base64,${base64Data}`;

  const formData = new URLSearchParams();
  formData.append('base64Image', base64Image);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2');

  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      'apikey': 'K88661642888957',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });

  const data = await res.json();
  console.log("OCR.Space Response on Vaseline Crop:", JSON.stringify(data, null, 2));
}

testOcrSpace().catch(console.error);
