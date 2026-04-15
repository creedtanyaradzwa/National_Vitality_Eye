const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
require("dotenv").config();

// Sample data
const provinces = ['Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central', 
                   'Mashonaland East', 'Mashonaland West', 'Masvingo', 
                   'Matabeleland North', 'Matabeleland South', 'Midlands'];

const diseases = ['Malaria', 'Typhoid', 'Cholera', 'Diarrhea', 'Pneumonia', 
                  'Tuberculosis', 'HIV/AIDS', 'Diabetes', 'Hypertension', 'COVID-19'];

const symptoms = ['fever', 'headache', 'chills', 'fatigue', 'cough', 
                  'difficulty breathing', 'nausea', 'vomiting', 'diarrhea'];

const firstNames = ['John', 'Mary', 'Peter', 'Sarah', 'James', 'Elizabeth', 
                    'David', 'Anna', 'Michael', 'Grace', 'Robert', 'Patricia',
                    'William', 'Jennifer', 'Richard', 'Linda', 'Joseph', 'Barbara'];

const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia',
                   'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson'];

const hospitals = ['Harare Central Hospital', 'Parirenyatwa Hospital', 'Chitungwiza Hospital',
                   'Bulawayo Central Hospital', 'Mpilo Hospital', 'Gweru Provincial Hospital',
                   'Mutare Provincial Hospital', 'Masvingo Provincial Hospital', 'Marondera Hospital'];

// Helper functions
const randomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateNationalId = () => {
    const year = randomNumber(50, 99);
    const number = randomNumber(100000, 999999);
    const letter = String.fromCharCode(65 + randomNumber(0, 25));
    const suffix = randomNumber(10, 99);
    return `${year}-${number}-${letter}${suffix}`;
};

const generatePhoneNumber = () => {
    const prefix = randomItem(['077', '078', '071', '073']);
    const number = randomNumber(1000000, 9999999);
    return `${prefix}${number}`;
};

async function resetDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB\n");

        // ============ CLEAR ALL DATA ============
        console.log("🗑️  Clearing existing data...");
        await User.deleteMany({});
        await Patient.deleteMany({});
        await MedicalRecord.deleteMany({});
        console.log("✅ All data cleared\n");

        // ============ CREATE ADMIN USERS ============
        console.log("👑 Creating admin users...");
        
        const adminPassword = await bcrypt.hash("Admin@2026", 10);
        
        const admins = [
            {
                firstName: "System",
                lastName: "Administrator",
                email: "admin@vitalityeye.health.gov.zw",
                phoneNumber: "+263771234500",
                employeeId: "ADMIN001",
                hospitalName: "Ministry of Health",
                hospitalId: "MOH001",
                province: "Harare",
                position: "System Administrator",
                userId: "SYS1000",
                password: adminPassword,
                role: "admin",
                approvalStatus: "approved",
                isActive: true
            },
            {
                firstName: "Provincial",
                lastName: "Admin",
                email: "provincial@vitalityeye.health.gov.zw",
                phoneNumber: "+263771234501",
                employeeId: "ADMIN002",
                hospitalName: "Ministry of Health",
                hospitalId: "MOH002",
                province: "Harare",
                position: "Provincial Administrator",
                userId: "PROV1000",
                password: adminPassword,
                role: "admin",
                approvalStatus: "approved",
                isActive: true
            }
        ];
        
        for (const admin of admins) {
            await User.create(admin);
            console.log(`   ✅ Created: ${admin.userId} (${admin.firstName} ${admin.lastName})`);
        }

        // ============ CREATE DOCTORS ============
        console.log("\n👨‍⚕️ Creating doctors...");
        
        const doctorPassword = await bcrypt.hash("Doctor@2026", 10);
        const doctors = [];
        
        for (let i = 0; i < 10; i++) {
            const firstName = randomItem(firstNames);
            const lastName = randomItem(lastNames);
            const doctor = {
                firstName,
                lastName,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@hospital.zw`,
                phoneNumber: generatePhoneNumber(),
                employeeId: `DOC${1000 + i}`,
                hospitalName: randomItem(hospitals),
                hospitalId: `HOSP${1000 + i}`,
                province: randomItem(provinces),
                position: randomItem(['Senior Doctor', 'Doctor', 'Medical Officer']),
                userId: `DOC${1000 + i}`,
                password: doctorPassword,
                role: "doctor",
                approvalStatus: "approved",
                isActive: true
            };
            await User.create(doctor);
            doctors.push(doctor);
            console.log(`   ✅ Created: ${doctor.userId} (Dr. ${doctor.firstName} ${doctor.lastName})`);
        }

        // ============ CREATE NURSES ============
        console.log("\n👩‍⚕️ Creating nurses...");
        
        const nursePassword = await bcrypt.hash("Nurse@2026", 10);
        
        for (let i = 0; i < 5; i++) {
            const firstName = randomItem(firstNames);
            const lastName = randomItem(lastNames);
            const nurse = {
                firstName,
                lastName,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@nurse.zw`,
                phoneNumber: generatePhoneNumber(),
                employeeId: `NUR${1000 + i}`,
                hospitalName: randomItem(hospitals),
                hospitalId: `HOSP${2000 + i}`,
                province: randomItem(provinces),
                position: randomItem(['Senior Nurse', 'Registered Nurse', 'Enrolled Nurse']),
                userId: `NUR${1000 + i}`,
                password: nursePassword,
                role: "nurse",
                approvalStatus: "approved",
                isActive: true
            };
            await User.create(nurse);
            console.log(`   ✅ Created: ${nurse.userId} (Nurse ${nurse.firstName} ${nurse.lastName})`);
        }

        // ============ CREATE PATIENTS ============
        console.log("\n👤 Creating patients...");
        
        const patients = [];
        
        for (let i = 0; i < 50; i++) {
            const firstName = randomItem(firstNames);
            const lastName = randomItem(lastNames);
            const dateOfBirth = new Date(1950 + randomNumber(0, 50), randomNumber(0, 11), randomNumber(1, 28));
            
            const patient = new Patient({
                nationalId: generateNationalId(),
                firstName,
                lastName,
                dateOfBirth,
                gender: randomItem(['Male', 'Female']),
                contactInfo: {
                    phone: generatePhoneNumber(),
                    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
                    address: `${randomNumber(1, 100)} ${randomItem(['Main St', 'Park Ave', 'First Ave'])}`,
                    emergencyContact: {
                        name: `${randomItem(firstNames)} ${randomItem(lastNames)}`,
                        phone: generatePhoneNumber(),
                        relationship: randomItem(['Spouse', 'Parent', 'Sibling', 'Child'])
                    }
                },
                province: randomItem(provinces),
                clinicalProfile: {
                    bloodType: randomItem(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']),
                    chronicConditions: [],
                    allergies: []
                },
                isActive: true
            });
            
            // Add some chronic conditions for some patients
            if (randomNumber(1, 100) <= 30) {
                patient.clinicalProfile.chronicConditions.push({
                    condition: randomItem(['Diabetes', 'Hypertension', 'Asthma', 'Arthritis']),
                    diagnosisDate: randomDate(new Date(2010, 0, 1), new Date(2023, 0, 1)),
                    status: randomItem(['Active', 'Controlled', 'Remission']),
                    severity: randomItem(['Mild', 'Moderate', 'Severe'])
                });
            }
            
            // Add some allergies for some patients
            if (randomNumber(1, 100) <= 20) {
                patient.clinicalProfile.allergies.push({
                    allergen: randomItem(['Penicillin', 'Sulfa', 'Peanuts', 'Latex', 'Dust']),
                    reaction: randomItem(['Rash', 'Swelling', 'Difficulty Breathing']),
                    severity: randomItem(['Mild', 'Moderate', 'Severe'])
                });
            }
            
            await patient.save();
            patients.push(patient);
            console.log(`   ✅ Created: ${patient.firstName} ${patient.lastName} (ID: ${patient.nationalId})`);
        }

        // ============ CREATE MEDICAL RECORDS ============
        console.log("\n📋 Creating medical records...");
        
        let totalRecords = 0;
        
        for (const patient of patients) {
            // Number of records per patient (1-8)
            const numRecords = randomNumber(1, 8);
            
            for (let i = 0; i < numRecords; i++) {
                const visitDate = randomDate(new Date(2023, 0, 1), new Date());
                const disease = randomItem(diseases);
                const numSymptoms = randomNumber(2, 5);
                const selectedSymptoms = [];
                for (let s = 0; s < numSymptoms; s++) {
                    const symptom = randomItem(symptoms);
                    if (!selectedSymptoms.includes(symptom)) {
                        selectedSymptoms.push(symptom);
                    }
                }
                
                const numMedications = randomNumber(1, 3);
                const medications = [];
                for (let m = 0; m < numMedications; m++) {
                    if (disease === 'Malaria') {
                        medications.push(randomItem(['Artemether 80mg', 'Lumefantrine 480mg', 'Quinine 600mg']));
                    } else if (disease === 'Hypertension') {
                        medications.push(randomItem(['Lisinopril 10mg', 'Amlodipine 5mg', 'Hydrochlorothiazide 25mg']));
                    } else if (disease === 'Diabetes') {
                        medications.push(randomItem(['Metformin 500mg', 'Insulin', 'Glipizide 5mg']));
                    } else {
                        medications.push(randomItem(['Paracetamol 500mg', 'Ibuprofen 400mg', 'Amoxicillin 500mg']));
                    }
                }
                
                const record = new MedicalRecord({
                    patientId: patient._id,
                    hospital: randomItem(hospitals),
                    doctorName: `Dr. ${randomItem(firstNames)} ${randomItem(lastNames)}`,
                    visitDate,
                    visitType: randomItem(['Outpatient', 'Inpatient', 'Emergency', 'Follow-up']),
                    symptoms: selectedSymptoms,
                    primaryDiagnosis: { name: disease },
                    disease,
                    prescribedMedications: medications,
                    treatmentPlan: {
                        plan: `Treatment plan for ${disease}. ${randomNumber(7, 14)} days course.`,
                        lifestyleAdvice: [
                            'Rest and hydration',
                            'Follow up in 2 weeks',
                            'Take medication as prescribed'
                        ]
                    },
                    disposition: randomItem(['Discharged', 'Admitted', 'Follow-up Required']),
                    dischargeInstructions: `Follow up in ${randomNumber(7, 30)} days. Report any worsening symptoms.`,
                    province: patient.province,
                    vitalSigns: {
                        temperature: randomNumber(360, 390) / 10,
                        bloodPressure: {
                            systolic: randomNumber(100, 160),
                            diastolic: randomNumber(60, 100)
                        },
                        heartRate: randomNumber(60, 120),
                        respiratoryRate: randomNumber(12, 24),
                        oxygenSaturation: randomNumber(92, 100),
                        weight: randomNumber(50, 100),
                        height: randomNumber(150, 190),
                        bmi: randomNumber(18, 35),
                        painScore: randomNumber(0, 10)
                    }
                });
                
                await record.save();
                totalRecords++;
            }
            
            if (patients.indexOf(patient) % 10 === 0) {
                console.log(`   ✅ Processed ${patients.indexOf(patient) + 1}/${patients.length} patients...`);
            }
        }
        
        console.log(`   ✅ Created ${totalRecords} medical records`);

        // ============ CREATE PATIENT PORTAL ACCOUNTS ============
        console.log("\n🔐 Creating patient portal accounts...");
        
        let portalCount = 0;
        for (const patient of patients.slice(0, 30)) { // Create portal for first 30 patients
            const portalPassword = await bcrypt.hash("Patient@123", 10);
            
            patient.portalAccount = {
                hasAccount: true,
                email: `${patient.firstName.toLowerCase()}.${patient.lastName.toLowerCase()}@patient.zw`,
                phoneNumber: patient.contactInfo?.phone || generatePhoneNumber(),
                password: portalPassword,
                createdAt: new Date(),
                consentGiven: true,
                consentDate: new Date(),
                isActive: true,
                isVerified: true,
                auditLog: [{
                    action: "REGISTER",
                    timestamp: new Date(),
                    ipAddress: "127.0.0.1",
                    userAgent: "System Setup"
                }]
            };
            
            await patient.save();
            portalCount++;
            console.log(`   ✅ Portal created for: ${patient.firstName} ${patient.lastName} (Email: ${patient.portalAccount.email} / Password: Patient@123)`);
        }

        // ============ SUMMARY ============
        console.log("\n" + "=".repeat(60));
        console.log("🎉 DATABASE RESET COMPLETE!");
        console.log("=".repeat(60));
        console.log("\n📊 SUMMARY:");
        console.log(`   👑 Admin users: ${admins.length}`);
        console.log(`   👨‍⚕️ Doctors: 10`);
        console.log(`   👩‍⚕️ Nurses: 5`);
        console.log(`   👤 Patients: ${patients.length}`);
        console.log(`   📋 Medical records: ${totalRecords}`);
        console.log(`   🔐 Patient portal accounts: ${portalCount}`);
        
        console.log("\n🔑 LOGIN CREDENTIALS:");
        console.log("-".repeat(40));
        console.log("ADMIN PORTAL:");
        console.log("   User ID: SYS1000");
        console.log("   Password: Admin@2026");
        console.log("");
        console.log("DOCTOR PORTAL (any of these):");
        for (let i = 0; i < 3; i++) {
            console.log(`   User ID: DOC${1000 + i} | Password: Doctor@2026`);
        }
        console.log("");
        console.log("PATIENT PORTAL (any of these):");
        for (let i = 0; i < 3; i++) {
            const patient = patients[i];
            console.log(`   Email: ${patient.firstName.toLowerCase()}.${patient.lastName.toLowerCase()}@patient.zw | Password: Patient@123`);
        }
        
        console.log("\n💡 TIPS:");
        console.log("   • Use SYS1000 to login as Admin");
        console.log("   • Use any DOCxxxx to login as Doctor");
        console.log("   • Use patient emails to login to Patient Portal");
        console.log("   • All data is fresh and ready for testing!");
        
        console.log("\n✅ Database reset complete!\n");
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Error resetting database:", error);
        process.exit(1);
    }
}

resetDatabase();