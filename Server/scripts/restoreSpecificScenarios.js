const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const User = require("../models/User");
const Handover = require("../models/Handover");
const edliz = require("../edliz.json");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const HOSPITAL_NAME = "Harare General Hospital";

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function restoreScenarios() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to MongoDB");

        // 1. Get Key Personas
        const kudzai = await Patient.findOne({ nationalId: "29-123456-X-01" });
        const farai = await Patient.findOne({ nationalId: "42-987654-Y-22" });
        const chipo = await Patient.findOne({ nationalId: "18-555444-Z-33" });
        const tendai = await Patient.findOne({ nationalId: "63-000111-W-99" });

        if (!kudzai || !farai) {
            console.error("❌ Key personas not found. Please run simulateAllScenarios first.");
            process.exit(1);
        }

        // 2. Get some staff for creators
        const staff = await User.find({ hospitalName: HOSPITAL_NAME }).limit(5);
        const staffIds = staff.map(s => s._id);
        const doctor = staff.find(s => s.role === 'doctor') || staff[0];

        console.log("🛠️  Restoring 'Critical Triage' Scenario (Kudzai)...");
        // Ensure kudzai is at HGH
        kudzai.currentHospital = HOSPITAL_NAME;
        await kudzai.save();

        await MedicalRecord.create({
            patientId: kudzai._id,
            hospital: HOSPITAL_NAME,
            province: "Harare",
            visitDate: new Date(),
            visitStatus: "In Admission",
            visitType: "Emergency",
            disease: "Severe Sepsis",
            symptoms: ["High Fever", "Confusion", "Hypotension", "Tachycardia"],
            vitalSigns: { 
                temperature: 39.8, 
                bloodPressure: { systolic: 85, diastolic: 50 },
                heartRate: 128, 
                respiratoryRate: 28,
                oxygenSaturation: 89,
                recordedAt: new Date()
            },
            primaryDiagnosis: { name: "Severe Sepsis / Septic Shock" },
            disposition: "Admitted",
            observations: [
                { 
                    timestamp: new Date(Date.now() - 3600000), 
                    status: "Critical", 
                    notes: "Patient unresponsive to verbal stimuli. Initiating aggressive fluid resuscitation.",
                    vitalSigns: { temperature: 40.1, heartRate: 135, oxygenSaturation: 87 }
                },
                { 
                    timestamp: new Date(), 
                    status: "Critical", 
                    notes: "MAP remains below 65mmHg despite fluids. Requesting ICU bed.",
                    vitalSigns: { temperature: 39.8, heartRate: 128, oxygenSaturation: 89 }
                }
            ],
            createdBy: doctor._id,
            visitNumber: "RESTORE-CRIT-001"
        });

        console.log("🛠️  Restoring 'Shift Handover' Scenario (Internal)...");
        const nextDoctor = staff.find(s => s._id.toString() !== doctor._id.toString()) || staff[0];
        
        await Handover.create({
            patientId: kudzai._id,
            creatorId: doctor._id,
            type: "Shift",
            sourceHospital: HOSPITAL_NAME,
            targetHospital: HOSPITAL_NAME,
            shiftType: "Night",
            summaryNote: "Kudzai Ndlovu: Critical sepsis. Fluid responsive but borderline. Monitor MAP and urine output closely. Waiting for ICU vacancy.",
            tasks: [
                { description: "Check urine output at 08:00", status: "Pending", priority: "High" },
                { description: "Repeat FBC and CRP", status: "Pending", priority: "Medium" }
            ],
            assignedUsers: [nextDoctor._id]
        });

        console.log("🛠️  Restoring 'Queue Transfer' Scenario (Inter-Hospital)...");
        // Transfer Farai from HGH to Parirenyatwa for "specialist care"
        await Handover.create({
            patientId: farai._id,
            creatorId: doctor._id,
            type: "Transfer",
            sourceHospital: HOSPITAL_NAME,
            targetHospital: "Parirenyatwa Group of Hospitals",
            summaryNote: "Patient requires advanced nephrology consultation for CKD management not available at HGH.",
            tasks: [
                { description: "Secure ambulance transport", status: "Completed", priority: "High", completedBy: doctor._id, completedAt: new Date() },
                { description: "Confirm receiving facility bed", status: "Pending", priority: "High" }
            ],
            assignedUsers: [] // To be assigned by target admin
        });

        console.log("🛠️  Restoring 'Admission Flow' for Harare patients...");
        // Randomly pick 50 Harare patients and give them active admissions
        const hghPatients = await Patient.find({ currentHospital: HOSPITAL_NAME }).limit(50);
        for (const p of hghPatients) {
            const diseaseObj = randomItem(edliz.data);
            await MedicalRecord.create({
                patientId: p._id,
                hospital: HOSPITAL_NAME,
                province: "Harare",
                visitDate: new Date(),
                visitType: "Inpatient",
                visitStatus: "In Admission",
                disease: diseaseObj.disease,
                vitalSigns: { temperature: 37.2, heartRate: 80, respiratoryRate: 18, oxygenSaturation: 98 },
                disposition: "Admitted",
                observations: [
                    { timestamp: new Date(), status: "Stable", notes: "Routine admission check." }
                ],
                createdBy: randomItem(staffIds),
                visitNumber: `RESTORE-ADM-${p.nationalId.substring(0,5)}`
            });
        }

        console.log("\n✅ SUCCESS: Specific clinical scenarios restored to Harare General Hospital.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Restoration Error:", err);
        process.exit(1);
    }
}

restoreScenarios();
