const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema({
    // ============ PATIENT REFERENCE ============
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: true
    },
    
    // ============ VISIT INFORMATION ============
    visitNumber: String,
    hospital: {
        type: String,
        required: true
    },
    department: {
        type: String,
        enum: ["Emergency", "Outpatient", "Inpatient", "Maternity", "Pediatrics", 
               "Surgery", "Internal Medicine", "Cardiology", "Neurology", "Psychiatry", "Other"]
    },
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
        enum: ["Emergency", "Outpatient", "Inpatient", "Follow-up", "Consultation", "Home Visit"],
        default: "Outpatient"
    },
    admissionId: String,
    dischargeDate: Date,
    
    // ============ PATIENT COMPLAINTS ============
    presentingComplaints: [{
        symptom: String,
        duration: String,
        severity: {
            type: Number,
            min: 1,
            max: 10
        },
        notes: String
    }],
    historyOfPresentIllness: String,
    
    // ============ SYMPTOMS (for AI) ============
    symptoms: [String],
    duration: String,
    
    // ============ VITAL SIGNS - PER VISIT (CRITICAL FIX) ============
    vitalSigns: {
        temperature: {
            type: Number,
            description: "Body temperature in Celsius"
        },
        bloodPressure: {
            systolic: {
                type: Number,
                description: "Systolic blood pressure in mmHg"
            },
            diastolic: {
                type: Number,
                description: "Diastolic blood pressure in mmHg"
            }
        },
        heartRate: {
            type: Number,
            description: "Heart rate in beats per minute"
        },
        respiratoryRate: {
            type: Number,
            description: "Respiratory rate in breaths per minute"
        },
        oxygenSaturation: {
            type: Number,
            min: 0,
            max: 100,
            description: "Blood oxygen saturation percentage"
        },
        weight: {
            type: Number,
            description: "Weight in kilograms"
        },
        height: {
            type: Number,
            description: "Height in centimeters"
        },
        bmi: {
            type: Number,
            description: "Body Mass Index (calculated from weight/height)"
        },
        painScore: {
            type: Number,
            min: 0,
            max: 10,
            description: "Patient pain score (0 = no pain, 10 = worst pain)"
        },
        bloodGlucose: {
            type: Number,
            description: "Blood glucose level in mg/dL"
        },
        cholesterol: {
            type: Number,
            description: "Total cholesterol in mg/dL"
        },
        recordedAt: {
            type: Date,
            default: Date.now
        },
        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
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
            orderedDate: Date,
            resultDate: Date,
            result: String,
            referenceRange: String,
            abnormal: Boolean,
            notes: String
        }],
        radiology: [{
            studyType: String,
            orderedDate: Date,
            resultDate: Date,
            findings: String,
            impression: String,
            images: [String]
        }],
        otherTests: [{
            testName: String,
            result: String,
            notes: String
        }]
    },
    
    // ============ TREATMENT ============
    treatmentPlan: {
        plan: {
            type: String,
            description: "Detailed treatment plan description"
        },
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
    
    // ============ PRESCRIBED MEDICATIONS (for quick access) ============
    prescribedMedications: [String],
    
    // ============ REFERRALS ============
    referrals: [{
        to: String,
        department: String,
        reason: String,
        urgency: {
            type: String,
            enum: ["Routine", "Urgent", "Emergency"],
            default: "Routine"
        },
        date: Date,
        status: {
            type: String,
            enum: ["Pending", "Completed", "Cancelled"],
            default: "Pending"
        },
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
    facilityLevel: {
        type: String,
        enum: ["Clinic", "District Hospital", "Provincial Hospital", "Central Hospital", "Private Facility"],
        default: "District Hospital"
    },
    
    // ============ TELEMEDICINE ============
    isTelemedicine: {
        type: Boolean,
        default: false
    },
    consultationLink: String,
    
    // ============ OUTCOME ============
    outcome: {
        status: {
            type: String,
            enum: ["Recovered", "Improved", "No Change", "Worsened", "Deceased", "Referred"],
            default: "Improved"
        },
        notes: String,
        followUpRequired: { type: Boolean, default: false },
        followUpDate: Date
    },
    
    // ============ AUDIT FIELDS ============
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    reviewedAt: Date,
    isArchived: {
        type: Boolean,
        default: false
    },
    isConfidential: {
        type: Boolean,
        default: false
    },
    notes: String
    
}, { timestamps: true });

// Index for faster queries
medicalRecordSchema.index({ patientId: 1, visitDate: -1 });
medicalRecordSchema.index({ disease: 1, visitDate: -1 });
medicalRecordSchema.index({ province: 1, visitDate: -1 });

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);