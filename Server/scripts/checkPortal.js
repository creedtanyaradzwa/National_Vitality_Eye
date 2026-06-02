const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function checkPortal() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const portalChipos = await Patient.find({ 
        firstName: /Chipo/i, 
        lastName: /Sibanda/i,
        "portalAccount.hasAccount": true
    });
    
    console.log(`Found ${portalChipos.length} Chipo Sibandas with portal accounts.`);
    
    for (const p of portalChipos) {
        const count = await MedicalRecord.countDocuments({ patientId: p._id });
        console.log(`Patient: ${p.firstName} ${p.lastName} (${p.nationalId}), Records: ${count}, Email: ${p.portalAccount.email}`);
    }

    process.exit(0);
}
checkPortal();
