const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/kijiji-listing', async (req, res) => {
  const { url } = req.body;
  if (!url || !url.includes('kijiji.ca')) {
    return res.status(400).json({ error: 'Invalid or missing Kijiji URL' });
  }

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const title = $('h1').first().text().trim();
    const priceRaw = $('h3:contains("$")').first().text().trim();
    const price = parseFloat(priceRaw.replace(/[^0-9.]/g, '')) || null;

    const address = $('a[href*="google.com/maps"]').first().text().trim();

    // Feature list (like Bedrooms, Bathrooms, Parking, etc.)
    const features = {};
    $('[data-testid="listing-key-facts"] div').each((_, el) => {
      const text = $(el).text().trim();
      if (text.match(/\d+\s*bedroom/i)) {
        features.bedrooms = text;
      }
      if (text.match(/\d+\s*bathroom/i)) {
        features.bathrooms = text;
      }
      if (text.toLowerCase().includes('parking')) {
        features.parking_included = text;
      }
      if (text.toLowerCase().includes('apartment')) {
        features.apartment_type = 'Apartment';
      }
      if (text.toLowerCase().includes('townhome')) {
        features.apartment_type = 'Townhome';
      }
    });

    // Sidebar attributes (like rental agreement, furnished, smoking, etc.)
    const attributes = {};
    $('[data-testid="listing-attributes"] li').each((_, el) => {
      const label = $(el).find('p').eq(0).text().trim().toLowerCase();
      const value = $(el).find('p').eq(1).text().trim();
      attributes[label] = value;
    });

    // Appliances list
    const appliances = [];
    $('div:contains("Appliances")').next().find('li').each((_, el) => {
      appliances.push($(el).text().trim());
    });

    const data = {
      title: title || null,
      address: address || null,
      price: price || null,
      bedrooms: features.bedrooms || null,
      bathrooms: features.bathrooms || null,
      parking_included: features.parking_included || "Not specified",
      apartment_type: features.apartment_type || "Not specified",
      furnished: attributes["furnished"] || null,
      rental_agreement: attributes["rental agreement"] || null,
      pets_allowed: attributes["pets"] || null,
      smoking: attributes["smoking"] || null,
      appliances
    };

    res.json(data);
  } catch (err) {
    console.error("Scraper error:", err.message);
    res.status(500).json({ error: 'Scraping failed', detail: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('✅ Scraper running on port ' + listener.address().port);
});
