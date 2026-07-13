# NATIONAL VITALITY EYE (NVE) — AI4I PROPOSAL
## DEVELOPMENT TRACK (TRACK 3)

**Track Name:** Track 3 (Development)
**Project Title:** National Vitality Eye (NVE): Sovereign AI-Powered Health Intelligence Framework
**Team Name:** Vitality Eye Engineering Team
**Lead Innovator:** Credence Tanyaradzwa Buzuzi
**Date:** July 4, 2026

---

## SECTION 1: PROBLEM DEFINITION & STRATEGIC ALIGNMENT

### 1.1 Local Problem Profile in Zimbabwe

The Zimbabwean healthcare ecosystem experiences deep operational vulnerabilities driven by structural fragmentation, an absence of longitudinal patient tracking, and a lack of point-of-care analytical guidance.

**Clinical Continuity of Care Fragmentation:** Medical histories do not securely precede individuals across healthcare providers. Patients entering new clinics are effectively treated as complete strangers, forcing staff to re-collect diagnostic histories and yielding missing records, clinical delays, and duplicate diagnostic tests.

**Absence of Point-of-Care Analytical Decision Support:** Frontline nurses and medical officers operate in a data vacuum, relying on manual file lookups without automated risk alerts or algorithmic triage support. This directly increases diagnostic error rates and delays patient triage times.

**Macro Epidemiology Reporting Lags:** National disease surveillance relies heavily on paper-based reporting conduits. This structural delay means public health officials often detect outbreaks weeks too late, undermining rapid containment strategies.

**Citizen Health Marginalisation:** Citizens remain passive recipients of healthcare, lacking digital access to their own physiological trends, prescription sequences, or diagnostic records. NVE resolves this through a dedicated patient-facing portal giving individuals secure access to their complete health history, AI-generated health insights, and anonymous community surveillance tools.

### 1.2 Strategic Alignment with Zimbabwe National AI Policies

NVE addresses these systemic gaps by serving as an automated intelligence tier deployed on top of pre-existing stacks like the national Impilo EHR, or as an independent standalone system for disconnected regional clinics. This aligns with Zimbabwe's National AI Strategy (2026-2030), the national digital health architecture blueprint, and S.I. 155 of 2024.

**National AI Strategy Healthcare Mandate:** Under the AI Adoption and Service Transformation pillar, healthcare is a high-priority domain. The policy mandates a shift to context-driven, homegrown AI solutions capable of delivering precision tools to remote communities while reducing provider workloads. NVE decentralises algorithmic triage and predictive disease surveillance to every connected clinic.

**Data Sovereignty Mandate:** NVE enforces a strict Zim-First sovereign computing model. All machine learning execution, dataset storage, and pipeline iterations are hosted locally. The embedded EDLIZ clinical knowledge base is sourced directly from Zimbabwe's national Essential Drugs List, ensuring all treatment protocols are locally authoritative and not dependent on foreign AI services.

**Infrastructure Resilience:** A Progressive Web App (PWA) architecture with service-worker caching keeps frontline clinics operational during network dropouts, with automatic synchronisation on connectivity restoration.

**Public Procurement Readiness:** The framework complies with PRAZ and POTRAZ Tier 1 Data Controller frameworks, enabling smooth integration within public facilities.

---

## SECTION 2: TECHNICAL DESIGN & PRODUCT LOGIC

### 2.1 Three-Tier System Architecture & Operational Workflows

NVE is constructed on a modern three-tier web architecture tightly coupled with an event-driven, real-time alerting infrastructure powered by WebSockets.

```
[ Client Layer: React 19 Frontend (Axios + Socket.io Client)    ]
                          |   ^
             HTTPS REST   |   |  WebSocket Events
             JSON Payload |   |  (outbreak-alert, triage-alert, ai-update)
                          v   |
[ Application Layer: Node.js / Express 5 Server & Routers      ]
                          |   ^
             Mongoose     |   |  MongoDB Change Stream
             Queries      |   |  (realTimeLearner.js)
                          v   |
        [ Persistence Layer: MongoDB Atlas Cluster             ]
                          |
    [ AI Layer: ContinuousLearner v5.0 (In-Memory)           ]
    [ Pre-trained EDLIZ Baseline  (trainer2.json)            ]
    [ OutbreakDetector  (Hourly Z-Score Surveillance)        ]
```

**Clinical data pipeline on each encounter:**

1. **Frontend Capture** — Clinician enters visit data (symptoms, vitals, exam, investigations, treatment) into MedicalRecords.jsx; dispatched via HTTPS POST to /medical-records.
2. **Middleware Interception** — auth.js verifies the JWT; rbac.js enforces role-based permissions. All clinical text passes through a centralised normalisation layer applying synonym mapping and Levenshtein fuzzy matching.
3. **Database Insertion** — Validated document written to MongoDB via Mongoose. A point-in-time patientSnapshot is embedded in the record for audit continuity.
4. **Change Stream Ingestion** — MongoDB fires a real-time event captured by realTimeLearner.js via a replica set change stream (MedicalRecord.watch()), processing asynchronously without blocking the main pipeline.
5. **Real-Time AI Update** — continuousLearner.js incrementally updates disease pattern statistics, vital sign moving averages, and symptom correlations.
6. **Outbreak Evaluation** — OutbreakDetector evaluates the new record. Zero-tolerance pathogens raise a CONFIRMED alert immediately. Other diseases are evaluated against the 8-week rolling Z-score baseline.
7. **WebSocket Broadcast** — Confirmed anomalies are serialised as alert payloads enriched with EDLIZ treatment protocols and broadcast via Socket.io to all active dashboards. Province and disease room subscriptions allow targeted delivery.

### 2.2 Core Backend Directory Structure

```
/Server
  /ai
    continuousLearner.js    - In-memory 9-factor disease prediction engine (v5.0)
    pretrainer.js           - EDLIZ-backed pre-training baseline loader (120 diseases)
    realTimeLearner.js      - MongoDB change stream listener and live AI updater
    outbreakDetector.js     - Hourly Z-score outbreak surveillance engine (two-tier)
    alertEmitter.js         - Socket.io room management and broadcast orchestrator
  /middleware
    auth.js                 - JWT verification and request decoration
    rbac.js                 - Role-based permission mapping (6 roles, query-level data scoping)
  /models
    Patient.js              - Full clinical profile schema (20+ sub-document fields)
    MedicalRecord.js        - Complete visit record schema (observations, radiology, IV bag)
    Alert.js                - Persistent outbreak alert schema with EDLIZ protocol attachment
    CitizenReport.js        - Anonymous community surveillance submission schema
    Handover.js             - Clinical shift handover schema (shift type, task list)
    User.js                 - Staff account schema with document verification workflow
  /routes
    authRoutes.js           - Registration with document upload, login, admin approval
    patientRoutes.js        - Patient CRUD with query-level data scoping
    medicalRoutes.js        - Medical record CRUD with radiology image upload (Multer)
    aiFeaturesRoutes.js     - Risk assessment, anomaly detection, patient similarity
    realTimeAIRoutes.js     - Disease prediction, analytics, AI status
    patientPortalRoutes.js  - Patient portal auth and 4 AI health tools
    citizenReportRoutes.js  - Anonymous surveillance submissions
    handoverRoutes.js       - Clinical handover creation and management
  /utils
    normalise.js            - Clinical text normalisation (synonym mapping, fuzzy match)
    triageAI.js             - Full NEWS2 implementation with shock index detection
    vitalSigns.js           - Vital sign utilities
  edliz.json               - Zimbabwe Essential Drugs List parsed protocol data
  trainer2.json            - 120-disease EDLIZ-aligned pre-training knowledge base
```
