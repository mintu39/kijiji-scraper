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

    const title = $('h1').text().trim();

    const priceText = $('[data-testid="listing-price"]').text().trim();
    const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || null;

    const address = $('a[href*="google.com/maps"]').text().trim();

    // Extract specs like Bedrooms, Bathrooms, Parking etc.
    const specMap = {};
    $('[data-testid="listing-key-facts"] li').each((_, el) => {
      const label = $(el).find('div:nth-child(2)').text().trim().toLowerCase();
      const value = $(el).find('div:nth-child(1)').text().trim();
      specMap[label] = value;
    });

    // Appliances and amenities
    const appliances = [];
    $('div:contains("Appliances")').next().find('li').each((_, el) => {
      appliances.push($(el).text().trim());
    });

    // Lease, pets, smoking, etc.
    const tags = {};
    $('[data-testid="listing-attributes"] li').each((_, el) => {
      const label = $(el).find('p:nth-child(1)').text().trim().toLowerCase();
      const value = $(el).find('p:nth-child(2)').text().trim();
      if (label && value) tags[label] = value;
    });

    const data = {
      title: title || null,
      address: address || null,
      price: price || null,
      bedrooms: specMap['bedrooms'] || null,
      bathrooms: specMap['bathrooms'] || null,
      parking_included: specMap['parking'] || null,
      apartment_type: specMap['type'] || null,
      furnished: tags['furnished'] || null,
      rental_agreement: tags['rental agreement'] || null,
      smoking: tags['smoking'] || null,
      pets_allowed: tags['pets'] || null,
      appliances
    };

    res.json(data);
  } catch (err) {
    console.error("Scraping failed:", err.message);
    res.status(500).json({ error: 'Scraping failed', detail: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Scraper running on port ' + listener.address().port);
});
