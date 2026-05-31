import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, managersTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

const router = Router();

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

// Public GET endpoint to seed test customers
router.get("/customers/seed-test", async (req, res) => {
  try {
    const host = req.headers.host ?? "";
    const protocol = req.headers["x-forwarded-proto"] ?? (req.secure ? "https" : "http");

    // Fetch all managers to seed customers under all managers
    const managers = await db.select().from(managersTable);
    const managerIds: (number | null)[] = managers.length > 0 ? managers.map((m) => m.id) : [null];

    let seededCount = 0;
    let updatedCount = 0;

    for (const managerId of managerIds) {
      for (const template of seedTemplates) {
        const imageUrl = `${protocol}://${host}/api/product-image/${template.avatarUuid}`;

        // Check if customer already exists for this manager by name
        const condition = managerId !== null
          ? and(eq(customersTable.name, template.name), eq(customersTable.managerId, managerId))
          : eq(customersTable.name, template.name);

        const [existing] = await db.select().from(customersTable).where(condition).limit(1);

        if (existing) {
          await db
            .update(customersTable)
            .set({
              phone: template.phone,
              address: template.address,
              debtLimit: template.debtLimit,
              totalDebt: template.totalDebt,
              note: template.note,
              imageUrl,
            })
            .where(eq(customersTable.id, existing.id));
          updatedCount++;
        } else {
          await db.insert(customersTable).values({
            managerId,
            name: template.name,
            phone: template.phone,
            address: template.address,
            debtLimit: template.debtLimit,
            totalDebt: template.totalDebt,
            note: template.note,
            imageUrl,
          });
          seededCount++;
        }
      }
    }

    res.json({
      success: true,
      message: "15 ta test mijozlari muvaffaqiyatli yuklandi!",
      seededCount,
      updatedCount,
      totalManagersSeeded: managerIds.length,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    req.log?.error({ err }, "Mijozlarni seed qilishda xatolik");
    res.status(500).json({ error: `Tizim xatoligi: ${errorMsg}` });
  }
});

export default router;
