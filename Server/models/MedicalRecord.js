const mongoose = require("mongoose");
const {
    normaliseDisease,
    normaliseSymptoms,
    normaliseHospital,
    normaliseProvince
} = require("../utils/normalise");
const { roundTemperature } = require("../utils/vitalSigns");

const medicalRecordSchema = new mongoose.Schema({
    // ============ PATIENT REFERENCE ============
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: true
    },

    /** Point-in-time copy of patient demographics at visit (audit / reporting) */
    patientSnapshot: {
        nationalId: String,
        firstName: String,
        lastName: String,
        dateOfBirth: Date,
        gender: { type: String, enum: ["Male", "Female", "Other"] },
        ageAtVisit: Number,
        contactInfo: {
            phone: String,
            email: String,
            address: String,
            emergencyContact: {
                name: String,
                phone: String,
                relationship: String
            }
        },
        patientProvince: String,
        district: String,
        ward: String,
        insuranceInfo: {
            provider: String,
            policyNumber: String,
            memberId: String,
            coverageType: String
        }
    },
    
    // ============ VISIT INFORMATION ============
    visitNumber: String,
    hospital: {
        type: String,
        required: true
    },
    department: String,
    doctorName: String,
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    visitDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    visitType: {
        type: String,
        enum: ["Emergency", "Outpatient", "Inpatient", "Follow-up", "Consultation", "Home Visit", "Telemedicine"],
        default: "Outpatient"
    },
    visitStatus: {
        type: String,
        enum: ["Draft", "Active", "In Admission", "Discharged", "Finalized"],
        default: "Active"
    },
    admissionId: String,
    dischargeDate: Date,
    
    // ============ FLUID DYNAMICS (Gap: Fluid I/O Fix) ============
    ivBag: {
        totalVolume: Number,    // ml (e.g., 1000)
        currentVolume: Number,  // ml remaining
        startTime: Date,
        dripRate: Number,       // ml/hour (prescribed)
        fluidType: String,      // e.g., "Ringer's Lactate", "Normal Saline"
        status: { 
            type: String, 
            enum: ["Running", "Paused", "Empty", "Completed"],
            default: "Completed"
        }
    },

    // ============ OBSERVATIONS (Dynamic States / Progress Tracking) ============
    observations: [{
        timestamp: { type: Date, default: Date.now },
        vitalSigns: {
            temperature: Number,
            bloodPressure: {
                systolic: Number,
                diastolic: Number
            },
            heartRate: Number,
            respiratoryRate: Number,
            oxygenSaturation: Number,
            painScore: Number
        },
        fluidBalance: {
            intake: Number, // ml
            output: Number, // ml
            type: { type: String } // e.g., "IV Fluids", "Oral", "Urine", "Drainage"
        },
        symptoms: [String],
        notes: String,
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: String // e.g., "Stable", "Improving", "Deteriorating", "Critical"
    }],
    
    // ============ PATIENT COMPLAINTS ============
    presentingComplaints: [{
        symptom: String,
        duration: String,
        severity: Number,
        notes: String
    }],
    historyOfPresentIllness: String,
    
    // ============ SYMPTOMS ============
    symptoms: [String],
    duration: String,
    
    // ============ VITAL SIGNS ============
    vitalSigns: {
        temperature: { type: Number, required: [true, 'Temperature is required'] },
        bloodPressure: {
            systolic: Number,
            diastolic: Number
        },
        heartRate: Number,
        respiratoryRate: Number,
        oxygenSaturation: Number,
        painScore: Number,
        weight: Number,
        height: Number,
        bmi: Number,
        recordedAt: { type: Date, default: Date.now }
    },
    
    // ============ PHYSICAL EXAMINATION ============
    physicalExam: {
        general: String,
        headAndNeck: String,
        cardiovascular: String,
        respiratory: String,
        abdominal: String,
        neurological: String,
        musculoskeletal: String,
        skin: String,
        other: String
    },
    
    // ============ DIAGNOSIS ============
    primaryDiagnosis: {
        name: String,
        code: String,
        notes: String
    },
    secondaryDiagnoses: [{
        name: String,
        code: String,
        notes: String
    }],
    disease: String,
    differentialDiagnosis: [String],
    
    // ============ INVESTIGATIONS ============
    investigations: {
        labTests: [{
            testName: String,
            orderedDate: { type: Date, default: Date.now },
            resultDate: Date,
            result: String,
            referenceRange: String,
            abnormal: Boolean,
            notes: String
        }],
        radiology: [{
            studyType: String,  // Fixed: Now accepts any string, not just enum
            bodyPart: String,
            findings: String,
            impression: String,
            images: [{
                filename: String,
                originalName: String,
                path: String,
                url: String,
                uploadedAt: { type: Date, default: Date.now },
                uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                fileSize: Number,
                mimeType: String
            }],
            reportDate: { type: Date, default: Date.now },
            orderedBy: String,
            performedBy: String,
            notes: String
        }],
        otherTests: [{
            testName: String,
            result: String,
            notes: String
        }]
    },
    
    // ============ TREATMENT ============
    treatmentPlan: {
        plan: String,
        medications: [{
            medication: String,
            dosage: String,
            frequency: String,
            route: String,
            duration: String,
            prescribedBy: String,
            notes: String
        }],
        procedures: [{
            procedure: String,
            date: Date,
            performedBy: String,
            outcome: String,
            notes: String
        }],
        therapies: [{
            type: String,
            frequency: String,
            duration: String,
            notes: String
        }],
        lifestyleAdvice: [String]
    },
    
    // ============ PRESCRIBED MEDICATIONS (simple array) ============
    prescribedMedications: [String],
    
    // ============ REFERRALS ============
    referrals: [{
        to: String,
        department: String,
        reason: String,
        urgency: { type: String, enum: ["Routine", "Urgent", "Emergency"], default: "Routine" },
        date: Date,
        status: { type: String, enum: ["Pending", "Completed", "Cancelled"], default: "Pending" },
        feedback: String
    }],
    
    // ============ FOLLOW-UP ============
    followUp: {
        required: { type: Boolean, default: false },
        date: Date,
        instructions: String,
        provider: String
    },
    
    // ============ DISPOSITION ============
    disposition: {
        type: String,
        enum: ["Discharged", "Admitted", "Transferred", "Left Against Medical Advice", "Deceased"],
        default: "Discharged"
    },
    dischargeInstructions: String,
    dischargeSummary: String,
    
    // ============ ENVIRONMENTAL CONTEXT (Gap B) ============
    environmentalContext: {
        factor: String,         // e.g., "Broken sewage pipe", "Contaminated well", "Standing water"
        severity: { 
            type: String, 
            enum: ["Low", "Moderate", "High", "Critical"] 
        },
        description: String
    },
    
    // ============ CLINICAL NOTES ============
    doctorNotes: String,
    nursingNotes: String,
    
    // ============ LOCATION ============
    province: {
        type: String,
        required: true,
        enum: ['Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central', 
               'Mashonaland East', 'Mashonaland West', 'Masvingo', 
               'Matabeleland North', 'Matabeleland South', 'Midlands']
    },
    district: String,
    facilityLevel: String,
    
    // ============ TELEMEDICINE ============
    isTelemedicine: { type: Boolean, default: false },
    consultationLink: String,
    
    // ============ AUDIT & ACCESS FIELDS ============
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    taggedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    reviewedAt: Date,
    isArchived: { type: Boolean, default: false },
    isConfidential: { type: Boolean, default: false },
    notes: String
    
}, { timestamps: true });


medicalRecordSchema.pre('save', async function () {
    if (this.disease) {
        this.disease = normaliseDisease(this.disease);
    }
    if (this.primaryDiagnosis?.name) {
        this.primaryDiagnosis.name = normaliseDisease(this.primaryDiagnosis.name);
    }
    if (this.secondaryDiagnoses?.length) {
        this.secondaryDiagnoses = this.secondaryDiagnoses.map(d => ({
            ...d,
            name: d.name ? normaliseDisease(d.name) : d.name
        }));
    }

    if (this.symptoms?.length) {
        this.symptoms = normaliseSymptoms(this.symptoms);
    }
    if (this.presentingComplaints?.length) {
        this.presentingComplaints = this.presentingComplaints.map(c => ({
            ...c,
            symptom: c.symptom ? normaliseSymptoms([c.symptom])[0] || c.symptom : c.symptom
        }));
    }

    if (this.hospital) {
        this.hospital = normaliseHospital(this.hospital);
    }

    if (this.province) {
        this.province = normaliseProvince(this.province);
    }

    if (this.vitalSigns?.temperature != null) {
        this.vitalSigns.temperature = roundTemperature(this.vitalSigns.temperature);
    }
});

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);