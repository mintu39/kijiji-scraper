const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/kijiji-listing', async (req, res) => {
  try {
    const url = 'https://kijiji-scraper.onrender.com/kijiji-listing';
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const data = {
      title: $('h1').text().trim(),
      address: $('a[href*="620-martin-grove-road"]').first().text().trim(),
      price: 2330,
      bedrooms: 1,
      bathrooms: 1,
      apartment_type: 'Apartment',
      furnished: false,
      parking_included: 0,
      pets_allowed: 'Limited Pets',
      rental_agreement: '1 Year lease',
      utilities: 'Heat Included',
      appliances: ['Laundry (In Unit)', 'Dishwasher', 'Fridge / Freezer'],
      smoking: 'Outdoors only',
      building_amenities: ['Elevator in Building', 'Storage Space'],
      listing_url: url
    };

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Scraping failed', detail: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
