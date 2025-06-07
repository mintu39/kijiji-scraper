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
    const address = $('a[href*="mapAddress"]').text().trim() || $('span[itemprop="streetAddress"]').text().trim();
    const priceRaw = $('[data-testid="listing-price"]').text().trim();
    const price = parseFloat(priceRaw.replace(/[^0-9.]/g, ''));

    // Dynamic Info Mapping
    const infoMap = {};
    $('[data-testid="attribute-label"]').each((i, el) => {
      const label = $(el).text().trim();
      const value = $(el).next('[data-testid="attribute-value"]').text().trim();
      if (label && value) {
        infoMap[label.toLowerCase()] = value;
      }
    });

    const appliances = [];
    $('[data-testid="amenities-list"] li').each((i, el) => {
      appliances.push($(el).text().trim());
    });

    const data = {
      title: title || null,
      address: address || null,
      price: isNaN(price) ? null : price,
      bedrooms: infoMap['bedrooms'] || null,
      bathrooms: infoMap['bathrooms'] || null,
      apartment_type: infoMap['apartment type'] || null,
      furnished: infoMap['furnished']?.toLowerCase() === 'yes',
      parking_included: infoMap['parking included'] || "Not Available",
      pets_allowed: infoMap['pets'] || null,
      rental_agreement: infoMap['rental agreement'] || null,
      smoking: infoMap['smoking'] || null,
      appliances: appliances,
    };

    res.json(data);
  } catch (err) {
    console.error("Scraping error:", err.message);
    res.status(500).json({ error: 'Failed to scrape data', detail: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Scraper API listening on port ' + listener.address().port);
});
