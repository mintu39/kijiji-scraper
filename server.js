const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/kijiji-listing", async (req, res) => {
  const { url } = req.body;

  if (!url || !url.includes("kijiji.ca")) {
    return res.status(400).json({ error: "Invalid or missing Kijiji URL" });
  }

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const title = $("h1").first().text().trim();
    const priceRaw = $("h3:contains('$')").first().text().trim();
    const price = parseFloat(priceRaw.replace(/[^0-9.]/g, "")) || null;

    const address = $('a[href*="google.com/maps"]').first().text().trim();

    // Extract label-value divs (left side icons: bed, bath, parking, pets)
    const gridItems = {};
    $('div[class*="sc-"][class*="jvYcY"]').each((i, el) => {
      const text = $(el).text().trim().toLowerCase();
      if (text.includes("bedroom")) gridItems.bedrooms = text;
      if (text.includes("bathroom")) gridItems.bathrooms = text;
      if (text.includes("parking")) gridItems.parking_included = text;
      if (text.includes("pets")) gridItems.pets_allowed = text;
      if (text.includes("apartment")) gridItems.apartment_type = "Apartment";
      if (text.includes("townhome")) gridItems.apartment_type = "Townhome";
    });

    // Extract rental agreement, furnished, smoking from attribute list
    const attributes = {};
    $('[data-testid="listing-attributes"] li').each((_, el) => {
      const label = $(el).find("p").eq(0).text().trim().toLowerCase();
      const value = $(el).find("p").eq(1).text().trim();
      if (label && value) {
        attributes[label] = value;
      }
    });

    // Extract appliances from right-hand list under "Appliances"
    const appliances = [];
    $("div:contains('Appliances')")
      .next()
      .find("li")
      .each((_, el) => {
        appliances.push($(el).text().trim());
      });

    // Optional: grab all feature bullets under "Apartment Features"
    const descriptionFeatures = [];
    $("section:contains('Apartment Features')")
      .find("li")
      .each((_, el) => {
        descriptionFeatures.push($(el).text().trim());
      });

    const data = {
      title: title || null,
      address: address || null,
      price: price || null,
      bedrooms: gridItems.bedrooms || null,
      bathrooms: gridItems.bathrooms || null,
      parking_included: gridItems.parking_included || null,
      apartment_type: gridItems.apartment_type || null,
      furnished: attributes["furnished"] || null,
      rental_agreement: attributes["rental agreement"] || null,
      pets_allowed: gridItems.pets_allowed || attributes["pets"] || null,
      smoking: attributes["smoking"] || null,
      appliances,
      apartment_features: descriptionFeatures
    };

    res.json(data);
  } catch (err) {
    console.error("Scraper error:", err.message);
    res.status(500).json({ error: "Scraping failed", detail: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("🔥 Scraper running on port " + listener.address().port);
});
