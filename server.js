const puppeteer = require('puppeteer');
const Tesseract = require('tesseract.js');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/kijiji-ocr', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    const screenshotPath = 'kijiji.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });

    await browser.close();

    // OCR
    const result = await Tesseract.recognize(screenshotPath, 'eng', {
      logger: m => console.log(m),
    });

    const rawText = result.data.text;
    console.log("OCR result:", rawText);

    // Parse values
    const data = {
      title: rawText.match(/^[^\n$]+/)?.[0] || null,
      price: rawText.match(/\$\d{1,3}(,\d{3})*(\.\d{2})?/)?.[0] || null,
      bedrooms: rawText.match(/\d+\s+Bedrooms?/)?.[0] || null,
      bathrooms: rawText.match(/\d+\s+Bathrooms?/)?.[0] || null,
      furnished: rawText.match(/Furnished\s*(Yes|No)/i)?.[0] || null,
      pets_allowed: rawText.match(/(Pets|Limited Pets)/i)?.[0] || null,
      parking: rawText.match(/\d+\s+Parking/)?.[0] || null,
      rental_agreement: rawText.match(/Rental agreement\s+.+/)?.[0] || null,
    };

    res.json({ extracted: data });
  } catch (err) {
    console.error("OCR error:", err);
    res.status(500).json({ error: "Failed to scrape via OCR", details: err.message });
  }
});

app.listen(3000, () => {
  console.log("✅ OCR scraper running on port 3000");
});
