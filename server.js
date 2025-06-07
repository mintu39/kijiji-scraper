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

    const data = {
      title: $('h1').text().trim(),
      address: $('span[itemprop="streetAddress"]').text().trim() || 'N/A',
      price: 2330, // Optional: Scrape dynamically if available
      bedrooms: 1,
      bathrooms: 1,
      apartment_type: "Apartment",
      furnished: false,
      parking_included: 0,
      pets_allowed: "Limited Pets",
      rental_agreement: "1 Year lease",
      utilities: "Heat Included",
      appliances: ["Laundry (In Unit)", "Dishwasher", "Fridge / Freezer"],
      smoking: "Outdoors only",
      building_amenities: ["Elevator in Building", "Storage Space"]
    };

    res.json(data);
  } catch (err) {
    console.error("Scraping error:", err.message);
    res.status(500).json({ error: 'Failed to scrape data', detail: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('App is running on port ' + listener.address().port);
});
