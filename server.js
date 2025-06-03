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

    // Extract data using selectors instead of OCR where possible
    const listingData = await page.evaluate(() => {
      const extractText = (selector) => document.querySelector(selector)?.innerText || null;
      const extractHref = (selector) => document.querySelector(selector)?.href || null;

      return {
        title: extractText('h1'),
        price: extractText('[data-testid="listing-price"]') || extractText('h3'),
        bedrooms: extractText('[data-testid="bedrooms"]'),
        bathrooms: extractText('[data-testid="bathrooms"]'),
        address: extractText('a[href*="Tara-Drive"]'),
        availableDate: extractText('div:contains("Available")'),
        phoneNumber: extractText('a[href^="tel:"]'),
        adId: extractText('div:contains("Ad ID")')?.replace('Ad ID', '').trim(),
        postedBy: extractText('div:contains("On Kijiji since")')?.split('\n')[0]
      };
    });

    await browser.close();

    res.json({ extracted: listingData });
  } catch (err) {
    console.error("Scraping error:", err);
    res.status(500).json({ error: "Failed to scrape listing", details: err.message });
  }
});

app.listen(3000, () => {
  console.log("✅ Kijiji scraper running on port 3000");
});
