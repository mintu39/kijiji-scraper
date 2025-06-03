const puppeteer = require('puppeteer');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/kijiji-ocr', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.includes('kijiji.ca')) {
    return res.status(400).json({ error: 'Missing or invalid Kijiji URL' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const data = await page.evaluate(() => {
      try {
        const getText = (selector) =>
          document.querySelector(selector)?.innerText.trim() || null;

        const findByText = (keyword) =>
          Array.from(document.querySelectorAll('div'))
            .map((el) => el.innerText)
            .find((text) => text?.toLowerCase().includes(keyword)) || null;

        const findListItem = (keyword) =>
          Array.from(document.querySelectorAll('li'))
            .map((el) => el.innerText)
            .find((text) => text?.toLowerCase().includes(keyword)) || null;

        return {
          title: getText('h1'),
          price: getText('[data-testid="listing-price"]') || getText('h3'),
          bedrooms: findByText('bedroom'),
          bathrooms: findByText('bathroom'),
          parking: findByText('parking'),
          furnished: findListItem('furnished'),
          pets_allowed: findByText('pets'),
          rental_agreement: findListItem('rental agreement')
        };
      } catch (e) {
        return { error: 'page.evaluate failed', details: e.message };
      }
    });

    await browser.close();

    console.log("✅ Extracted listing:", data);

    if (data.error) {
      return res.status(500).json({ error: "Scraping logic failed", details: data.details });
    }

    res.json({ extracted: data });
  } catch (err) {
    console.error("❌ Scraping error:", err);
    res.status(500).json({ error: "Failed to scrape listing", details: err.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 Kijiji scraper running on port 3000");
});
