const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const User = require("../models/User");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function testSearch() {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Simulate a doctor at HGH
    const user = await User.findOne({ hospitalName: "Harare General Hospital", role: "doctor" });
    if (!user) {
        console.log("No HGH doctor found.");
        process.exit(1);
    }
    console.log(`Testing search for User: ${user.firstName} ${user.lastName} (${user.hospitalName})`);

    const search = "Kudzai"; // Should match Kudzai Ndlovu
    
    // access filter logic
    const MedicalRecord = require("../models/MedicalRecord");
    const recordPatients = await MedicalRecord.distinct("patientId", {
        $or: [
            { createdBy: user._id },
            { taggedUsers: user._id }
        ]
    });

    const accessFilter = {
        $or: [
            { createdBy: user._id },
            { _id: { $in: recordPatients } },
            { currentHospital: user.hospitalName }
        ]
    };

    const searchCondition = {
        $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { nationalId: { $regex: search, $options: "i" } }
        ]
    };

    const query = { $and: [accessFilter, searchCondition] };

    const count = await Patient.countDocuments(query);
    console.log(`Search for "${search}" returned ${count} patients.`);

    const sample = await Patient.findOne(query);
    if (sample) {
        console.log(`Sample match: ${sample.firstName} ${sample.lastName} (${sample.nationalId}) at ${sample.currentHospital}`);
    }

    process.exit(0);
}
testSearch();
