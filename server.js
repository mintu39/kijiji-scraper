// server.js
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
    const rawText = $.text();

    const title = $('h1').text().trim();
    const address = $('a[href*="mapAddress"]').text().trim() || $('span[itemprop="streetAddress"]').text().trim();
    const priceRaw = $('[data-testid="listing-price"]').text().trim();
    const price = parseFloat(priceRaw.replace(/[^0-9.]/g, ''));

    // Info map extraction
    const infoMap = {};
    $('[data-testid="attribute-label"]').each((i, el) => {
      const label = $(el).text().trim();
      const value = $(el).next('[data-testid="attribute-value"]').text().trim();
      if (label && value) {
        infoMap[label.toLowerCase()] = value;
      }
    });

    // Appliances list
    const appliances = [];
    $('[data-testid="amenities-list"] li').each((i, el) => {
      appliances.push($(el).text().trim());
    });

    // Enhanced fields
    const sqftMatch = rawText.match(/([\d,]+)\s*(sq\s?ft|square feet|sqft)/i);
    const approximateSqFt = sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, '')) : null;

    const dateMatch = rawText.match(/Available\s+(?:from\s+)?(?:on\s+)?([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
    const availableDate = dateMatch ? new Date(dateMatch[1]).toISOString().split('T')[0] : null;

    const adIdMatch = rawText.match(/Ad ID\s*(\d{9,})/i);
    const adId = adIdMatch ? adIdMatch[1] : null;

    const parkingMatch = rawText.match(/(\d+)\s+Parking Included/i);
    const parkingIncluded = parkingMatch ? parseInt(parkingMatch[1]) : null;

    let unitType = null;
    if (/apartment|duplex/i.test(title)) unitType = "Multi Unit - Above Ground";

    const data = {
      title: title || null,
      address: address || null,
      price: isNaN(price) ? null : price,
      bedrooms: infoMap['bedrooms'] || null,
      bathrooms: infoMap['bathrooms'] || null,
      apartment_type: infoMap['apartment type'] || null,
      furnished: infoMap['furnished']?.toLowerCase() === 'yes',
      parking_included: parkingIncluded,
      rental_agreement: infoMap['rental agreement'] || null,
      appliances,
      available_date: availableDate,
      square_footage: approximateSqFt,
      ad_id: adId,
      unit_type: unitType
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
