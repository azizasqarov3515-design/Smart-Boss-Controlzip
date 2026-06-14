const { Client } = require('pg');

const databaseUrl = 'postgresql://postgres.otkmhnfqmibsyqalzpnj:YDJmMlSdC8grgtaM@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require';

const products = [
  { name: 'AirPods 2 Pro Wireless Earphones', brand: 'Apple', costPrice: '250000', salePrice: '380000', barcode: '4710123456001' },
  { name: 'Baseus Cafule USB-C to USB-C Cable 2m', brand: 'Baseus', costPrice: '35000', salePrice: '60000', barcode: '4710123456002' },
  { name: 'LDNIO A2502Q Quick Fast Charger 30W', brand: 'LDNIO', costPrice: '70000', salePrice: '110000', barcode: '4710123456003' },
  { name: 'Hoco W35 Wireless Bluetooth Headphones', brand: 'Hoco', costPrice: '120000', salePrice: '190000', barcode: '4710123456004' },
  { name: 'JBL GO 3 Portable Bluetooth Speaker', brand: 'JBL', costPrice: '280000', salePrice: '390000', barcode: '4710123456005' },
  { name: 'Remax RP-U37 QC3.0 Fast Adapter', brand: 'Remax', costPrice: '45000', salePrice: '75000', barcode: '4710123456006' },
  { name: 'Baseus Bipow Power Bank 20000mAh 15W', brand: 'Baseus', costPrice: '180000', salePrice: '270000', barcode: '4710123456007' },
  { name: 'Joyroom JR-T03S Pro TWS Earbuds', brand: 'Joyroom', costPrice: '150000', salePrice: '230000', barcode: '4710123456008' },
  { name: 'Anker PowerLine+ II Lightning Cable 1.8m', brand: 'Anker', costPrice: '90000', salePrice: '140000', barcode: '4710123456009' },
  { name: 'Hoco X21 Silicone Type-C Cable 1m', brand: 'Hoco', costPrice: '15000', salePrice: '30000', barcode: '4710123456010' },
  { name: 'Apple 20W USB-C Power Adapter Original', brand: 'Apple', costPrice: '130000', salePrice: '200000', barcode: '4710123456011' },
  { name: 'Silicone Case with MagSafe for iPhone 15 Pro', brand: 'Apple', costPrice: '25000', salePrice: '60000', barcode: '4710123456012' },
  { name: 'Magnetic Leather Card Wallet for iPhone', brand: 'Apple', costPrice: '40000', salePrice: '90000', barcode: '4710123456013' },
  { name: 'Clear MagSafe Case for iPhone 14 Pro Max', brand: 'Apple', costPrice: '30000', salePrice: '70000', barcode: '4710123456014' },
  { name: 'Samsung Galaxy Buds2 Pro Active Noise Cancelling', brand: 'Samsung', costPrice: '950000', salePrice: '1450000', barcode: '4710123456015' },
  { name: 'Samsung 25W Super Fast Charging Adapter', brand: 'Samsung', costPrice: '90000', salePrice: '150000', barcode: '4710123456016' },
  { name: 'Xiaomi Redmi Buds 5 Pro Wireless Earbuds', brand: 'Xiaomi', costPrice: '400000', salePrice: '580000', barcode: '4710123456017' },
  { name: 'Xiaomi 33W Fast Charging Wall Charger', brand: 'Xiaomi', costPrice: '65000', salePrice: '100000', barcode: '4710123456018' },
  { name: 'Joyroom Fast Dual USB Car Charger 45W', brand: 'Joyroom', costPrice: '55000', salePrice: '95000', barcode: '4710123456019' },
  { name: 'Remax RM-510 In-Ear wired Earphones', brand: 'Remax', costPrice: '18000', salePrice: '35000', barcode: '4710123456020' },
  { name: 'Tempered Glass (Laminat) for iPhone 15 Pro Max', brand: 'Hoco', costPrice: '15000', salePrice: '45000', barcode: '4710123456021' },
  { name: '10D Full Glue Cover Glass for Samsung S24 Ultra', brand: 'Borofone', costPrice: '20000', salePrice: '55000', barcode: '4710123456022' },
  { name: 'Ceramic Matte Flexible Screen Protector for Redmi Note 13', brand: 'Joyroom', costPrice: '12000', salePrice: '35000', barcode: '4710123456023' },
  { name: 'Baseus Magnetic Desktop Phone Holder Stand', brand: 'Baseus', costPrice: '50000', salePrice: '90000', barcode: '4710123456024' },
  { name: 'Borofone BH23 Mobile Bedside Stand Holder', brand: 'Borofone', costPrice: '25000', salePrice: '50000', barcode: '4710123456025' },
  { name: 'VGR V-030 Professional Hair Trimmer', brand: 'VGR', costPrice: '110000', salePrice: '180000', barcode: '4710123456026' },
  { name: 'VGR V-228 Vintage Gold T-Blade Clipper', brand: 'VGR', costPrice: '130000', salePrice: '210000', barcode: '4710123456027' },
  { name: 'VGR V-071 IPX7 Waterproof Beard Trimmer', brand: 'VGR', costPrice: '125000', salePrice: '195000', barcode: '4710123456028' },
  { name: 'VGR V-191 Cordless Precision Shaver', brand: 'VGR', costPrice: '95000', salePrice: '150000', barcode: '4710123456029' },
  { name: 'VGR V-085 Professional Hair Clipper Retro', brand: 'VGR', costPrice: '140000', salePrice: '220000', barcode: '4710123456030' },
  { name: 'VGR V-652 Hair Clipper with LED Screen', brand: 'VGR', costPrice: '180000', salePrice: '280000', barcode: '4710123456031' },
  { name: 'VGR V-937 Professional Rechargeable Detailer', brand: 'VGR', costPrice: '155000', salePrice: '245000', barcode: '4710123456032' },
  { name: 'VGR V-331 Twin-Blade Waterproof Shaver', brand: 'VGR', costPrice: '80000', salePrice: '130000', barcode: '4710123456033' },
  { name: 'JBL Charge 5 Waterproof Portable Speaker', brand: 'JBL', costPrice: '1100000', salePrice: '1600000', barcode: '4710123456034' },
  { name: 'JBL Clip 4 Outdoor Mini Bluetooth Speaker', brand: 'JBL', costPrice: '350000', salePrice: '520000', barcode: '4710123456035' },
  { name: 'Hoco BS30 Sport Portable Wireless Speaker', brand: 'Hoco', costPrice: '90000', salePrice: '150000', barcode: '4710123456036' },
  { name: 'Baseus Encok D02 Pro Wireless Headphones Over-Ear', brand: 'Baseus', costPrice: '190000', salePrice: '290000', barcode: '4710123456037' },
  { name: 'Remax Milk Series Power Bank 10000mAh Dual USB', brand: 'Remax', costPrice: '75000', salePrice: '130000', barcode: '4710123456038' },
  { name: 'Shockproof Armor Protective Case for Redmi 12', brand: 'Xiaomi', costPrice: '15000', salePrice: '40000', barcode: '4710123456039' },
  { name: 'Liquid Silicone Protective Case for iPhone 13', brand: 'Apple', costPrice: '18000', salePrice: '45000', barcode: '4710123456040' }
];

async function seed() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Supabase bazasiga muvaffaqiyatli ulandi!");

    // Fetch all managers
    const managersRes = await client.query('SELECT id, login FROM managers;');
    const managers = managersRes.rows;
    console.log(`Bazada ${managers.length} ta manager aniqlandi:`, managers);

    // If no managers, we use [null] as managerId
    const managerIds = managers.length > 0 ? managers.map(m => m.id) : [null];

    let inserted = 0;
    let updated = 0;

    for (const managerId of managerIds) {
      for (const p of products) {
        // Check if product exists by name and manager_id
        let checkQuery = 'SELECT id FROM products WHERE name = $1 AND manager_id IS NULL LIMIT 1;';
        let checkParams = [p.name];
        if (managerId !== null) {
          checkQuery = 'SELECT id FROM products WHERE name = $1 AND manager_id = $2 LIMIT 1;';
          checkParams = [p.name, managerId];
        }

        const checkRes = await client.query(checkQuery, checkParams);

        if (checkRes.rows.length > 0) {
          // Update product to set exact 200 quantity and new prices
          const updateQuery = `
            UPDATE products
            SET brand = $1, cost_price = $2, sale_price = $3, quantity = $4, unit = $5, barcode = $6
            WHERE id = $7;
          `;
          await client.query(updateQuery, [
            p.brand,
            p.costPrice,
            p.salePrice,
            '200', // 200 quantity
            'dona', // unit = dona
            p.barcode,
            checkRes.rows[0].id
          ]);
          updated++;
        } else {
          // Insert new product
          const insertQuery = `
            INSERT INTO products (manager_id, name, brand, cost_price, sale_price, quantity, unit, barcode)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
          `;
          await client.query(insertQuery, [
            managerId,
            p.name,
            p.brand,
            p.costPrice,
            p.salePrice,
            '200', // 200 quantity
            'dona', // unit = dona
            p.barcode
          ]);
          inserted++;
        }
      }
    }

    console.log(`Muvaffaqiyatli yakunlandi!`);
    console.log(`Yangi kiritilgan tovarlar soni: ${inserted}`);
    console.log(`Yangilangan tovarlar soni: ${updated}`);

  } catch (err) {
    console.error("Xatolik:", err);
  } finally {
    await client.end();
  }
}

seed();
