const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const provinces = [
    'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central',
    'Mashonaland East', 'Mashonaland West', 'Masvingo',
    'Matabeleland North', 'Matabeleland South', 'Midlands'
];

async function forceRedistribute() {
    await mongoose.connect(process.env.MONGO_URI);
    const superPersonaIds = ["29-123456-X-01", "42-987654-Y-22", "18-555444-Z-33", "63-000111-W-99"];
    
    const patients = await Patient.find({});
    console.log(`Force redistributing ${patients.length} patients...`);

    for (let i = 0; i < patients.length; i++) {
        const p = patients[i];
        if (superPersonaIds.includes(p.nationalId)) {
            p.province = "Harare";
            p.currentHospital = "Harare General Hospital";
        } else {
            // Assign a random province
            const province = provinces[Math.floor(Math.random() * provinces.length)];
            p.province = province;
            p.currentHospital = province === "Harare" ? "Harare General Hospital" : `${province} Referral Hospital`;
        }
        await p.save();
        if (i % 1000 === 0) process.stdout.write(`\rProgress: ${i}/${patients.length}...`);
    }
    console.log("\nRedistribution Complete.");
    process.exit(0);
}
forceRedistribute();
