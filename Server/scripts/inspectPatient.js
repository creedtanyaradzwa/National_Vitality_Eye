const mongoose = require("mongoose");
const Patient = require("../models/Patient");
require("dotenv").config();

async function inspectPatient() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const patient = await Patient.findOne({ nationalId: { $ne: 'TEST-0001-ZIM' } });
        console.log(JSON.stringify(patient, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

inspectPatient();