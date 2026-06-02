const mongoose = require('mongoose');
require('dotenv').config();
const Patient = require('./models/Patient');

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const triage = 'CRITICAL';
    const query = { 'clinicalProfile.triageStatus.priority': triage };
    
    const patients = await Patient.find(query)
        .select("firstName lastName nationalId gender dateOfBirth province district currentHospital createdAt clinicalProfile.triageStatus")
        .limit(5)
        .lean();
    
    console.log('Query:', JSON.stringify(query));
    console.log('Found:', patients.length);
    if (patients.length > 0) {
        console.log('Sample Patient Triage:', JSON.stringify(patients[0].clinicalProfile?.triageStatus, null, 2));
    }
    
    process.exit(0);
}

run();
