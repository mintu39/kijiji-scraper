// ✅ server.js
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

    const html = await page.content();
    const text = await page.evaluate(() => document.body.innerText);

    const extract = (pattern) => {
      const match = text.match(pattern);
      return match ? match[1].trim() : null;
    };

    const includes = (keywords) => keywords.some(k => text.toLowerCase().includes(k));

    const data = {
      Unit_Type: /\b(\d+\s+bedroom\s+(apartment|duplex|townhome))/i.exec(text)?.[0] || null,
      Available_Date: extract(/Available\s+(from|on|:)?\s*([A-Z][a-z]+ \d{1,2}, \d{4})/) || null,
      Approximate_Sq_Ft: extract(/(\d{3,4})\s*(sq\.?\s*ft|square feet)/i),
      Maximum_Occupants: extract(/(ideal for|maximum)\s+(\d+)/i),
      Property_Condition: includes(['brand new', 'never lived']) ? 'Brand New' :
                         includes(['renovated', 'upgraded']) ? 'Moderate' :
                         includes(['needs work', 'fixer']) ? 'Needs Renovation' : null,
      Year_Last_Renovated: extract(/renovated in (\d{4})/i),
      Number_of_Levels_in_Unit: extract(/(duplex|2-storey|triplex|two levels)/i),
      Unit_Facing: extract(/facing (north|south|east|west)/i),
      Lawn_and_Snow_Care: includes(['snow removal', 'lawn care']) ? 'Lawn care and snow included' : null,
      Furnished: includes(['furnished']) ? 'Furnished' : includes(['unfurnished']) ? 'Unfurnished' : null,
      Basement_Included: includes(['basement access', 'separate basement']) ? 'Yes' : 'No',
      Basement_Details: extract(/(shared laundry in basement|basement includes[^\.]+)/i),
      // Utility checkboxes
      AC_Inclusion: includes(['air conditioning', 'central ac', 'ac provided']),
      Heat_Inclusion: includes(['heating included', 'heat paid']),
      Internet_Inclusion: includes(['wifi included', 'internet included']),
      Cable_Inclusion: includes(['cable included', 'tv included']),
      Phone_Inclusion: includes(['phone line included', 'landline']),
      // Feature checkboxes
      Corner_Unit: includes(['corner unit']),
      Central_Vacuum: includes(['central vacuum']),
      Penthouse: includes(['penthouse', 'top floor']),
      Natural_Sunlight: includes(['natural light', 'sunlight', 'bright']),
      Fireplace_Common_Area: includes(['fireplace', 'living room fireplace']),
      Fireplace_Bedroom: includes(['fireplace in bedroom']),
      Upgraded_Bathrooms: includes(['upgraded bathroom', 'modern bath']),
      Backsplash_Kitchen: includes(['backsplash', 'tile wall']),
      Upgraded_Kitchen: includes(['renovated kitchen', 'modern kitchen']),
      Dishwasher_Included: includes(['dishwasher included', 'built-in dishwasher']),
      // Address block (rough)
      Street_Address: extract(/\d+\s+[^,]+/),
      City: extract(/\b(City of )?(Toronto|Mississauga|Ottawa|Etobicoke)\b/),
      Province: 'Ontario',
      Country: 'Canada'
    };

    await browser.close();
    res.json({ extracted: data });

  } catch (err) {
    console.error("Scraping error:", err);
    res.status(500).json({ error: 'Failed to scrape listing', details: err.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 Kijiji scraper running on port 3000");
});