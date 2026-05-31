import pg from "pg";
import fs from "fs";
import path from "path";

// Read DATABASE_URL from api-server .env or root .env
const envPath = path.join(process.cwd(), "artifacts", "api-server", ".env");
let databaseUrl = "";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const match = envContent.match(/DATABASE_URL=(.*)/);
  if (match) {
    databaseUrl = match[1].trim();
  }
}

if (!databaseUrl) {
  // Try root .env as fallback
  const rootEnvPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(rootEnvPath)) {
    const envContent = fs.readFileSync(rootEnvPath, "utf8");
    const match = envContent.match(/DATABASE_URL=(.*)/);
    if (match) {
      databaseUrl = match[1].trim();
    }
  }
}

if (!databaseUrl) {
  console.error("DATABASE_URL topilmadi! .env fayllarini tekshiring.");
  process.exit(1);
}

// Read EXPO_PUBLIC_DOMAIN from smartboss .env for absolute image URLs
const frontendEnvPath = path.join(process.cwd(), "artifacts", "smartboss", ".env");
let domain = "192.168.100.211:8080";
if (fs.existsSync(frontendEnvPath)) {
  const envContent = fs.readFileSync(frontendEnvPath, "utf8");
  const match = envContent.match(/EXPO_PUBLIC_DOMAIN=(.*)/);
  if (match) {
    domain = match[1].trim();
  }
}

const { Client } = pg;
const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false } // Required for Neon
});

const seedTemplates = [
  {
    name: "Dilshodbek Ismoilov",
    phone: "998 90 123 45 67",
    address: "Toshkent sh., Chilonzor tumani",
    debtLimit: "10000000",
    totalDebt: "4500000",
    note: "Doimiy mijoz, to'lovlarni vaqtida qiladi",
    avatarUuid: "d7c6b5a4-3e2d-1c0b-9a8f-7a6b5c4d3e2f" // Mature Male
  },
  {
    name: "Madina Sobirova",
    phone: "998 93 456 78 90",
    address: "Samarqand sh., Registon ko'chasi",
    debtLimit: "5000000",
    totalDebt: "0",
    note: "Qarzi yo'q, naqd hisob-kitob qiladi",
    avatarUuid: "e8a7b6c5-4d3c-2b1a-0e9f-8a7b6c5d4e3f" // Young Female
  },
  {
    name: "Rustam Karimov",
    phone: "998 94 987 65 43",
    address: "Buxoro sh., Bahouddin Naqshband ko'chasi",
    debtLimit: "25000000",
    totalDebt: "18500000",
    note: "Yirik ulgurji xaridor, limit yuqori",
    avatarUuid: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f" // Uzbek Businessman
  },
  {
    name: "Nigora Aliyeva",
    phone: "998 91 234 56 78",
    address: "Farg'ona sh., Mustaqillik ko'chasi",
    debtLimit: "15000000",
    totalDebt: "12000000",
    note: "Do'kon egasi, tovarlarni muddatli to'lovga oladi",
    avatarUuid: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" // Uzbek Woman
  },
  {
    name: "Bahodir Tojiyev",
    phone: "998 97 111 22 33",
    address: "Namangan sh., Uychi tumani",
    debtLimit: "8000000",
    totalDebt: "3500000",
    note: "Oqsoqol, juda ishonchli mijoz",
    avatarUuid: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e" // Uzbek Elder
  },
  {
    name: "Zilola Yusupova",
    phone: "998 99 888 77 66",
    address: "Andijon sh., Bobur shohko'chasi",
    debtLimit: "12000000",
    totalDebt: "0",
    note: "Kredit limiti faol, lekin hozirda qarzi yo'q",
    avatarUuid: "c6b5a4d3-2c1b-0a9f-8e7d-6c5b4a3d2e1f" // Mature Female
  },
  {
    name: "Jahongir Olimov",
    phone: "998 90 999 88 77",
    address: "Toshkent sh., Yunusobod tumani",
    debtLimit: "3000000",
    totalDebt: "2800000",
    note: "Talaba, limiti kamroq, qarz chegarasiga yaqin",
    avatarUuid: "f9b5c3d4-1a2b-3c4d-5e6f-7a8b9c0d1e2f" // Young Male
  },
  {
    name: "Malika Fayzullayeva",
    phone: "998 93 333 44 55",
    address: "Qarshi sh., Islom Karimov ko'chasi",
    debtLimit: "7000000",
    totalDebt: "1500000",
    note: "Yangi mijoz, birinchi marta nasiyaga xarid qildi",
    avatarUuid: "e8a7b6c5-4d3c-2b1a-0e9f-8a7b6c5d4e3f" // Young Female
  },
  {
    name: "Sardor Rahimov",
    phone: "998 94 444 55 66",
    address: "Xiva sh., Ichan Qal'a",
    debtLimit: "20000000",
    totalDebt: "0",
    note: "Turizm sohasida faoliyat yuritadi, naqd hisob qiladi",
    avatarUuid: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f" // Uzbek Businessman
  },
  {
    name: "Shahnoza Xalilova",
    phone: "998 95 555 66 77",
    address: "Guliston sh., Navoiy ko'chasi",
    debtLimit: "4000000",
    totalDebt: "3950000",
    note: "Limitining deyarli hammasini ishlatgan",
    avatarUuid: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" // Uzbek Woman
  },
  {
    name: "Anvar Abdullayev",
    phone: "998 90 777 66 55",
    address: "Nukus sh., Erkinlik ko'chasi",
    debtLimit: "10000000",
    totalDebt: "500000",
    note: "Nafqaxo'r, kichik qarz qoldig'i bor",
    avatarUuid: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e" // Uzbek Elder
  },
  {
    name: "Guli Axmedova",
    phone: "998 91 555 44 33",
    address: "Jizzax sh., Sharof Rashidov ko'chasi",
    debtLimit: "6000000",
    totalDebt: "0",
    note: "Hech qachon qarzini kechiktirmaydi",
    avatarUuid: "c6b5a4d3-2c1b-0a9f-8e7d-6c5b4a3d2e1f" // Mature Female
  },
  {
    name: "Farrux Toshpulatov",
    phone: "998 97 444 33 22",
    address: "Navoiy sh., G'alaba shohko'chasi",
    debtLimit: "15000000",
    totalDebt: "9800000",
    note: "Katta buyurtmalar beradi",
    avatarUuid: "f9b5c3d4-1a2b-3c4d-5e6f-7a8b9c0d1e2f" // Young Male
  },
  {
    name: "Lola Nazarova",
    phone: "998 99 333 22 11",
    address: "Toshkent sh., Mirzo Ulug'bek tumani",
    debtLimit: "8000000",
    totalDebt: "0",
    note: "Qarzi yo'q",
    avatarUuid: "e8a7b6c5-4d3c-2b1a-0e9f-8a7b6c5d4e3f" // Young Female
  },
  {
    name: "Otabek Mo'minov",
    phone: "998 90 222 33 44",
    address: "Termiz sh., Al-Hakim at-Termiziy ko'chasi",
    debtLimit: "12000000",
    totalDebt: "7200000",
    note: "Janubiy hududdagi eng faol hamkorimiz",
    avatarUuid: "d7c6b5a4-3e2d-1c0b-9a8f-7a6b5c4d3e2f" // Mature Male
  }
];

async function seed() {
  try {
    console.log("Ma'lumotlar bazasiga ulanishga harakat qilinmoqda...");
    await client.connect();
    console.log("Bazaga ulandi!");

    // Fetch all managers
    const managersRes = await client.query("SELECT id FROM managers;");
    const managerIds = managersRes.rows.length > 0 ? managersRes.rows.map(m => m.id) : [null];
    console.log(`Jami topilgan managerlar: ${managersRes.rows.length}`);

    let seeded = 0;
    let updated = 0;

    for (const managerId of managerIds) {
      for (const temp of seedTemplates) {
        // Construct the image URL. Let's use the local IP domain
        const imageUrl = `http://${domain}/api/product-image/${temp.avatarUuid}`;

        // Check if customer exists by name and manager_id
        let checkQuery = "SELECT id FROM customers WHERE name = $1 AND manager_id IS NULL LIMIT 1;";
        let checkParams = [temp.name];
        if (managerId !== null) {
          checkQuery = "SELECT id FROM customers WHERE name = $1 AND manager_id = $2 LIMIT 1;";
          checkParams = [temp.name, managerId];
        }

        const checkRes = await client.query(checkQuery, checkParams);

        if (checkRes.rows.length > 0) {
          // Update
          const updateQuery = `
            UPDATE customers
            SET phone = $1, address = $2, debt_limit = $3, total_debt = $4, note = $5, image_url = $6
            WHERE id = $7;
          `;
          await client.query(updateQuery, [
            temp.phone,
            temp.address,
            temp.debtLimit,
            temp.totalDebt,
            temp.note,
            imageUrl,
            checkRes.rows[0].id
          ]);
          updated++;
        } else {
          // Insert
          const insertQuery = `
            INSERT INTO customers (manager_id, name, phone, address, debt_limit, total_debt, note, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
          `;
          await client.query(insertQuery, [
            managerId,
            temp.name,
            temp.phone,
            temp.address,
            temp.debtLimit,
            temp.totalDebt,
            temp.note,
            imageUrl
          ]);
          seeded++;
        }
      }
    }

    console.log(`\nMuvaffaqiyatli yakunlandi!`);
    console.log(`Yangi kiritilgan mijozlar soni: ${seeded}`);
    console.log(`Yangilangan mijozlar soni: ${updated}`);
    console.log(`Seeding tugallandi.`);

  } catch (err) {
    console.error("Xatolik yuz berdi:", err);
  } finally {
    await client.end();
  }
}

seed();
