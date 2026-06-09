const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const User = require('../models/User');

const ZIMBABWE_PROVINCES = [
    'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central', 
    'Mashonaland East', 'Mashonaland West', 'Masvingo', 
    'Matabeleland North', 'Matabeleland South', 'Midlands'
];

const DISEASES = ['Malaria', 'Hypertension', 'Diabetes', 'Common Cold', 'Influenza', 'Pneumonia', 'Asthma', 'Tuberculosis'];
const HOSPITALS = ["General Hospital", "Medical Center", "District Hospital", "Central Hospital", "Mission Hospital", "Family Clinic"];

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const targetCount = 25950;
        const now = new Date();

        const staff = await User.findOne({ role: { $in: ['doctor', 'nurse', 'admin'] }, approvalStatus: 'approved' }) || 
                      await User.findOne({ role: { $in: ['doctor', 'nurse', 'admin'] } });

        if (!staff) {
            console.error('No suitable staff user found.');
            process.exit(1);
        }

        for (const province of ZIMBABWE_PROVINCES) {
            if (province === 'Harare') continue;

            const currentCount = await MedicalRecord.countDocuments({ province });
            const toAdd = targetCount - currentCount;

            if (toAdd <= 0) {
                console.log(`${province} is already uniform.`);
                continue;
            }

            console.log(`Adding ${toAdd} records to ${province} to reach ${targetCount}...`);

            // Fetch patients for this province
            const patients = await Patient.find({ province }).select('_id firstName lastName nationalId gender dateOfBirth province');
            if (patients.length === 0) {
                console.log(`No patients found in ${province}, skipping.`);
                continue;
            }

            let addedInProvince = 0;
            const chunkSize = 2000;

            while (addedInProvince < toAdd) {
                const batchSize = Math.min(chunkSize, toAdd - addedInProvince);
                const batch = [];

                for (let i = 0; i < batchSize; i++) {
                    const patient = patients[Math.floor(Math.random() * patients.length)];
                    const isCholera = Math.random() < 0.25;
                    const disease = isCholera ? 'Cholera' : DISEASES[Math.floor(Math.random() * DISEASES.length)];
                    
                    const visitDate = isCholera 
                        ? new Date(now.getTime() - Math.random() * 21 * 24 * 60 * 60 * 1000)
                        : new Date(now.getTime() - Math.random() * 120 * 24 * 60 * 60 * 1000); // spread over 120 days for more data variety

                    const hospital = `${province} ${isCholera ? 'Infectious Disease Center' : HOSPITALS[Math.floor(Math.random() * HOSPITALS.length)]}`;

                    batch.push({
                        patientId: patient._id,
                        patientSnapshot: {
                            firstName: patient.firstName,
                            lastName: patient.lastName,
                            nationalId: patient.nationalId,
                            gender: patient.gender,
                            dateOfBirth: patient.dateOfBirth,
                            patientProvince: province
                        },
                        hospital,
                        disease,
                        province,
                        visitDate,
                        vitalSigns: {
                            temperature: (isCholera ? 37.8 : 36.5) + Math.random() * 2,
                            bloodPressure: { 
                                systolic: (isCholera ? 90 : 110) + Math.floor(Math.random() * 30), 
                                diastolic: (isCholera ? 60 : 70) + Math.floor(Math.random() * 20) 
                            },
                            heartRate: (isCholera ? 100 : 70) + Math.floor(Math.random() * 30)
                        },
                        symptoms: isCholera ? ['Diarrhea', 'Vomiting', 'Dehydration'] : ['Fever', 'Headache'],
                        createdBy: staff._id,
                        doctorId: staff._id,
                        visitType: isCholera ? 'Emergency' : 'Outpatient',
                        visitStatus: 'Finalized',
                        disposition: isCholera ? 'Admitted' : 'Discharged'
                    });
                }

                await MedicalRecord.insertMany(batch);
                addedInProvince += batchSize;
                process.stdout.write(`\r- Progress in ${province}: ${addedInProvince}/${toAdd} (${Math.round(addedInProvince/toAdd*100)}%)`);
            }
            console.log(`\n✅ ${province} complete.`);
        }

        console.log('\n🎉 Uniformity achieved! All provinces now have 25,950 records.');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Error during uniformity script:', err);
        process.exit(1);
    }
}

run();
