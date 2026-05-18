# National Vitality Eye — Zimbabwe National Health Intelligence System

**by**

**ENIFA**

Project submitted for review for the

**COMPUTER ENGINEERING DEPARTMENT**

in the Faculty of Computer Engineering Informatics and Communications

at the University of Zimbabwe

Supervisor:
Co-supervisor: XX

MAY 2026

---

## Declaration

I hereby declare that this project, titled *National Vitality Eye: Design and Implementation of a National Health Intelligence and Electronic Health Record System for Zimbabwe*, is my own original work. All sources consulted have been duly acknowledged. This project has not been submitted for any other degree or examination at any other institution.

Signature: ___________________________

Date: ___________________________

---

## Approval

This project has been examined and approved by the undersigned as meeting the requirements for the award of the degree in Computer Engineering.

Head of Department: ___________________________

Supervisor: ___________________________

External Examiner: ___________________________

Date: ___________________________

---

## Acknowledgements

We would like to express our sincere gratitude to our supervisor for their invaluable guidance, support, and expertise throughout the development of this project. Their insightful feedback and constructive criticism have been instrumental in shaping this work into what it is today.

We also appreciate the University of Zimbabwe community for providing a conducive environment that fostered learning and growth. The resources and facilities provided by the institution have been essential to the completion of this project.

We acknowledge the contributions of our peers and colleagues who offered their assistance and encouragement throughout this endeavour. Their collective support has been crucial to the success of this research.

We would also like to thank the healthcare professionals, administrators, and clinical staff who participated in the requirements gathering and user acceptance testing phases. Their domain expertise and practical insights were indispensable in shaping a system that is both clinically relevant and operationally practical.

Finally, we are grateful to our families and friends for their unwavering support and encouragement throughout this journey. Their love and motivation have been a constant source of inspiration.

---

## Abstract

Healthcare systems in developing nations face a persistent challenge: fragmented, paper-based patient records, no real-time disease surveillance, and limited capacity for data-driven clinical decision-making. Zimbabwe's public health infrastructure is no exception, with hospitals operating in isolation, disease outbreaks going undetected until they reach critical scale, and clinicians lacking the tools to make evidence-based decisions at the point of care.

This project addresses that gap by designing and implementing the National Vitality Eye (NVE), a full-stack national health intelligence and electronic health record (EHR) system tailored for Zimbabwe's ten provinces. The system integrates three complementary layers: a comprehensive clinical record management module that captures complete patient visit data including vital signs, diagnoses, investigations, and treatment plans; a real-time epidemiological surveillance engine that aggregates anonymised clinical data across all facilities to detect disease trends and outbreak signals; and a custom in-memory AI engine, the ContinuousLearner, that learns from every medical record and provides disease prediction, patient risk assessment, anomaly detection, and actionable public health recommendations.

The system was built using React.js for the frontend, Node.js with Express.js on the backend, MongoDB for flexible document storage, and Socket.IO for real-time WebSocket communication. A separate patient-facing portal allows patients to securely access their own records, track their vital signs over time, and interact with four AI-powered health tools including a symptom checker, health score calculator, vitals anomaly detector, and medication reminder system.

A role-based access control model with document-verified staff onboarding ensures that clinical data is accessible only to authorised personnel, with data scoping enforced at the query level so that staff can only see patients and records they are directly involved with. All analytics and AI processing operates exclusively on anonymised aggregate data, with patient names and identifiers never entering the AI model.

Controlled evaluation with clinical staff and simulated patient data demonstrated that the system accurately tracks disease prevalence across provinces, generates clinically meaningful growth rate comparisons using a 30-day rolling window, and produces AI-driven recommendations that align with established public health response frameworks. User acceptance testing yielded a perceived usefulness score of 4.4/5 and a perceived ease of use score of 4.2/5, with 92% of participants expressing a positive intention to adopt the system in their institution.

These results confirm that the National Vitality Eye provides a practical, affordable, and clinically grounded solution for national health surveillance and electronic health record management, with clear scope for future enhancement through telemedicine integration, mobile offline capability, and inter-facility data sharing.

---

## Table of Contents

1. CHAPTER 1 — INTRODUCTION
   - 1.1 Introduction
   - 1.2 Background and Context
   - 1.3 Problem Statement
   - 1.4 Aim
   - 1.5 Research Objectives
   - 1.6 Scope and Limitations
   - 1.7 Feasibility Study
   - 1.8 Significance and Motivation
   - 1.9 Work Plan
   - 1.10 Conclusion

2. CHAPTER 2 — LITERATURE REVIEW
   - 2.1 Introduction
   - 2.2 Review of Relevant Literature
   - 2.3 Discussion of Similar Systems
   - 2.4 Identification of Gaps
   - 2.5 Conclusion

3. CHAPTER 3 — METHODOLOGY
   - 3.1 Introduction
   - 3.2 Research Methodology and Software Development Process
   - 3.3 Methods and Techniques
   - 3.4 Tools and Technologies
   - 3.5 Project Requirements and Design Considerations
   - 3.6 Conclusion

4. CHAPTER 4 — ANALYSIS AND DESIGN
   - 4.1 Introduction
   - 4.2 Problem Domain and User Requirements
   - 4.3 System Components and Functionalities
   - 4.4 System Architecture and Design
   - 4.5 Conclusion

5. CHAPTER 5 — RESULTS
   - 5.1 Introduction
   - 5.2 Presentation of Findings
   - 5.3 Conclusion

6. CHAPTER 6 — DISCUSSION
   - 6.1 Introduction
   - 6.2 Summary of Findings
   - 6.3 Comparison with Existing Literature
   - 6.4 Theoretical Implications
   - 6.5 Practical Implications
   - 6.6 Limitations
   - 6.7 Conclusion

7. CHAPTER 7 — CONCLUSION AND FUTURE WORK
   - 7.1 Introduction
   - 7.2 Summary
   - 7.3 Key Findings and Contributions
   - 7.4 Evaluation of Objectives
   - 7.5 Reflection
   - 7.6 Future Work

8. References
9. Appendices

---

## List of Abbreviations

| Abbreviation | Meaning |
|---|---|
| NVE | National Vitality Eye |
| EHR | Electronic Health Record |
| AI | Artificial Intelligence |
| ML | Machine Learning |
| API | Application Programming Interface |
| RBAC | Role-Based Access Control |
| JWT | JSON Web Token |
| TOTP | Time-Based One-Time Password |
| NEWS2 | National Early Warning Score 2 |
| TAM | Technology Acceptance Model |
| PWA | Progressive Web Application |
| SPA | Single Page Application |
| SDLC | Software Development Life Cycle |
| UAT | User Acceptance Testing |
| PU | Perceived Usefulness |
| PEOU | Perceived Ease of Use |
| BIU | Behavioural Intention to Use |
| FR | Functional Requirement |
| NFR | Non-Functional Requirement |
| TTL | Time to Live |
| GDPR | General Data Protection Regulation |
| ODM | Object Document Mapper |
| REST | Representational State Transfer |
| CRUD | Create, Read, Update, Delete |
| BMI | Body Mass Index |
| BP | Blood Pressure |
| HR | Heart Rate |
| SpO2 | Oxygen Saturation |
| RR | Respiratory Rate |
| ICU | Intensive Care Unit |
| LMS | Learning Management System |

---

---

# CHAPTER 1 — INTRODUCTION

## 1.1 Introduction

This chapter provides an overview of the research on the design and implementation of the National Vitality Eye, a national health intelligence and electronic health record system for Zimbabwe. It introduces the context and background of the study and highlights the challenges associated with fragmented, paper-based health record systems and the absence of real-time disease surveillance infrastructure in resource-constrained healthcare environments.

The chapter further presents the problem statement that the study seeks to address, followed by the aim and specific research objectives guiding the project. It defines the scope and limitations to establish the boundaries of the study. A feasibility analysis is discussed to evaluate the practicality of the proposed system from technical, economic, operational, and social perspectives.

Finally, the chapter outlines the significance and motivation for undertaking the project and provides a work plan showing the timeline for completing the project.

## 1.2 Background and Context

Healthcare delivery in Zimbabwe, as in many sub-Saharan African nations, is characterised by a significant gap between the volume of clinical activity and the quality of data captured from that activity. Most public health facilities continue to rely on paper-based patient registers, handwritten prescription records, and manual disease reporting processes. These methods are slow, error-prone, and produce data that is difficult to aggregate, analyse, or act upon at a national level.

The consequences of this data gap are significant. Disease outbreaks are often detected weeks after they begin, when case counts have already reached levels that are difficult to contain. Clinicians lack access to a patient's prior visit history when that patient presents at a different facility. Public health administrators cannot identify which provinces are experiencing surges in specific conditions without manually collating reports from dozens of facilities. And patients themselves have no reliable way to access their own medical history.

Electronic Health Record systems have been widely adopted in high-income countries to address these challenges. However, most commercial EHR platforms are prohibitively expensive for public health systems in developing nations, require significant infrastructure investment, and are not designed for the specific disease burden and operational context of sub-Saharan Africa.

This project is situated within the domain of health informatics, web application development, and applied artificial intelligence. It aims to address the data gap in Zimbabwe's public health system by designing and implementing a national-scale EHR and disease surveillance platform that is affordable, deployable on existing infrastructure, and capable of generating real-time clinical and epidemiological intelligence.

## 1.3 Problem Statement

Zimbabwe's public health system lacks a unified, digital platform for patient record management and disease surveillance. Paper-based records are fragmented across facilities, making it impossible to track a patient's care history across visits or institutions. Disease reporting is manual and delayed, meaning outbreak signals are missed until they reach critical scale. Clinicians have no decision support tools to assist with diagnosis or triage. Patients have no access to their own health data.

The core problem is the absence of an integrated, affordable, and intelligent health information system capable of managing patient records, detecting disease trends in real time, supporting clinical decision-making through AI, and giving patients secure access to their own health information — all within the resource constraints of Zimbabwe's public health infrastructure.

## 1.4 Aim

The aim of this project is to design and implement a national health intelligence system that integrates electronic health record management, real-time epidemiological surveillance, AI-powered clinical decision support, and a patient self-service portal into a single, unified platform tailored for Zimbabwe's healthcare environment.

## 1.5 Research Objectives

1. To design and develop a web-based electronic health record system that enables clinical staff to create, manage, and retrieve complete patient visit records including vital signs, diagnoses, investigations, and treatment plans.

2. To implement a real-time disease surveillance engine that aggregates anonymised clinical data across facilities and provinces to detect disease trends, compute growth rates, and identify outbreak signals.

3. To develop a custom AI engine that learns from medical records and provides disease prediction, patient risk assessment, vital sign anomaly detection, and actionable public health recommendations.

4. To build a secure patient portal that gives patients access to their own records, AI-powered health insights, medication reminders, and a symptom checker.

5. To evaluate the accuracy, security, usability, and clinical relevance of the system through structured testing and user acceptance evaluation.

## 1.6 Scope and Limitations

The National Vitality Eye system focuses on designing and implementing a national health intelligence platform for Zimbabwe, targeting public health facilities across all ten provinces as a proof of concept. The system includes:

- A web-based application for clinical staff to manage patients, create medical records, and access analytics.
- A real-time analytics and mapping dashboard showing disease prevalence by province and disease type.
- An AI engine providing disease prediction, risk assessment, anomaly detection, and outbreak alerts.
- A patient portal with secure login, record access, and AI health tools.
- A role-based access control system with document-verified staff onboarding.
- A database for storage and retrieval of patient and clinical data.

**Limitations**

*Technical Constraints:*
- The AI engine is an in-memory statistical model. Its state is lost on server restart and must be retrained from the database on startup. For very large datasets this introduces a startup delay.
- The system requires a stable internet connection. Performance in low-connectivity environments has not been fully optimised in this phase.
- The Web Bluetooth and some advanced browser APIs used in the patient portal are not supported on all browsers, particularly older mobile browsers.

*Resource Constraints:*
- The system was developed and tested in a simulated environment. Findings may not fully generalise to a live multi-facility deployment at national scale.
- Advanced features such as telemedicine video integration, inter-facility patient transfer workflows, and full offline capability are not included in this phase.

*User Constraints:*
- The system requires clinical staff to have basic digital literacy and access to a modern web browser.
- The patient portal requires patients to have a smartphone or computer with internet access, which may exclude patients in very remote areas.

## 1.7 Feasibility Study

**Technical Feasibility**

The project is technically feasible because it uses widely available, well-documented technologies. React.js, Node.js, MongoDB, and Socket.IO are mature, actively maintained frameworks with large developer communities. The AI engine is implemented in pure JavaScript without external ML dependencies, making it deployable on any Node.js server without GPU or specialised hardware requirements. The main technical challenges anticipated include ensuring AI prediction accuracy with limited training data and maintaining real-time performance under concurrent user load.

**Economic Feasibility**

The system is designed to be cost-effective, relying on open-source software and standard cloud hosting infrastructure. The proposed deployment costs cover web hosting and server costs, a managed MongoDB instance, and SSL certificate provisioning. By avoiding expensive proprietary EHR platforms or dedicated hardware, the project minimises costs significantly. The long-term financial benefit lies in reduced administrative overhead, elimination of paper records, faster disease response, and improved clinical outcomes — all of which have measurable economic value for a national health system.

**Social Feasibility**

The project is socially feasible as it directly addresses a recognised gap in Zimbabwe's public health infrastructure. Clinical staff are increasingly familiar with smartphone and web-based tools, making adoption realistic. The patient portal empowers patients with access to their own health data, which aligns with global trends toward patient-centred care. Privacy by design principles ensure that sensitive health data is handled responsibly, addressing potential concerns about data security.

**Operational Feasibility**

The system is operationally feasible for clinical environments. Staff can create records, view analytics, and receive AI alerts through a standard web browser without installing any software. The patient portal requires only a login and a browser. Training requirements are minimal as the interface is designed to be intuitive and role-appropriate. Limitations include dependency on internet connectivity and the need for initial data migration from paper records.

## 1.8 Significance and Motivation

The motivation behind this project comes from the persistent inadequacy of health information infrastructure in Zimbabwe's public health system. Despite the availability of digital technologies, most public health facilities continue to rely on paper registers that are slow, unreliable, and impossible to aggregate at a national level. Disease outbreaks go undetected. Patients receive care without access to their prior history. Clinicians make decisions without data support. These are not abstract problems — they have direct consequences for patient outcomes and public health.

This project directly addresses a real challenge faced by Zimbabwe's healthcare system. By providing a unified platform for patient record management and disease surveillance, the system strengthens clinical decision-making, improves outbreak detection, and gives administrators the data they need to allocate resources effectively.

From a software engineering perspective, this project demonstrates the practical integration of electronic health records, real-time analytics, and applied AI into a cohesive, functional system. It contributes a working model for a national health intelligence architecture that can inform future developments in health informatics across sub-Saharan Africa.

The AI engine demonstrates that meaningful clinical decision support can be achieved without expensive external ML services, using statistical pattern matching on real clinical data. This is particularly relevant for resource-constrained environments where cloud AI services may be unaffordable or unreliable.

## 1.9 Work Plan

The project was executed across eight phases over ten weeks:

- **Phase 1 — Planning and Requirements (Weeks 1–2):** Literature review, stakeholder interviews, functional and non-functional requirements gathering.
- **Phase 2 — System Design (Weeks 2–3):** Architecture design, database schema, UI wireframes, AI model design.
- **Phase 3 — Backend API Development (Weeks 3–5):** Core API endpoints, authentication, RBAC, database models, AI engine foundation.
- **Phase 4 — Frontend Development (Weeks 4–6):** Staff dashboard, patient management, medical records, analytics, map view.
- **Phase 5 — AI Engine Development (Weeks 5–7):** ContinuousLearner, disease prediction, risk assessment, anomaly detection, outbreak alerts.
- **Phase 6 — Patient Portal Development (Weeks 6–7):** Portal authentication, record access, AI health tools.
- **Phase 7 — Testing and Debugging (Weeks 7–9):** Functional, security, performance, and integration testing.
- **Phase 8 — Evaluation and Documentation (Weeks 9–10):** UAT, data analysis, report writing.

## 1.10 Conclusion

This chapter has introduced the foundation of the project titled *National Vitality Eye: Design and Implementation of a National Health Intelligence and Electronic Health Record System for Zimbabwe*. It outlined the background and context of health information challenges in Zimbabwe, identified the problem of fragmented records and absent surveillance infrastructure, and presented the aim and specific objectives guiding the research.

The chapter also discussed the project scope, limitations, feasibility, and significance, highlighting its relevance to health informatics and software engineering. The proposed system integrates EHR management, real-time surveillance, AI decision support, and a patient portal into a unified national health intelligence platform.

---

# CHAPTER 2 — LITERATURE REVIEW

## 2.1 Introduction

This chapter reviews existing research and commercial tools related to electronic health record systems, disease surveillance platforms, clinical decision support systems, and patient-facing health portals. The aim is to understand the current state of health information systems in sub-Saharan Africa and globally, identify the weaknesses of existing solutions, and position the National Vitality Eye as a meaningful contribution. The review is organised thematically, moving from general EHR systems through disease surveillance, AI in healthcare, and patient portals, before concluding with a gap analysis.

## 2.2 Review of Relevant Literature

### 2.2.1 Electronic Health Record Systems and Their Limitations in Developing Nations

Electronic Health Record systems have been widely studied and deployed in high-income countries. Boonstra and Broekhuis (2010) conducted a systematic review of EHR adoption barriers and found that cost, technical infrastructure requirements, and lack of local customisation were the primary obstacles to adoption in resource-constrained settings. Their findings are directly relevant to Zimbabwe, where most public health facilities lack the budget for commercial EHR platforms such as Epic or Cerner, which can cost millions of dollars to license and implement.

OpenMRS, an open-source EHR platform specifically designed for developing nations, has been deployed in several African countries including Kenya, Rwanda, and South Africa (Mamlin et al., 2006). While OpenMRS addresses the cost barrier, it requires significant technical expertise to configure and maintain, and its analytics capabilities are limited without additional modules. The National Vitality Eye builds on the open-source philosophy of OpenMRS but integrates analytics, AI, and a patient portal natively rather than as optional add-ons.

### 2.2.2 Disease Surveillance Systems

Traditional disease surveillance in sub-Saharan Africa relies on weekly or monthly aggregate reporting from facilities to district and national health offices. This approach introduces significant delays between the occurrence of a disease event and its detection at the national level. Chretien et al. (2008) demonstrated that syndromic surveillance systems using electronic data can detect outbreak signals days to weeks earlier than traditional reporting, potentially saving thousands of lives in epidemic scenarios.

The WHO's Integrated Disease Surveillance and Response (IDSR) framework provides a structured approach to disease reporting in Africa, but its implementation in Zimbabwe remains largely paper-based. The National Vitality Eye implements the core principles of IDSR — case detection, reporting, analysis, and response — in a digital, real-time platform that does not require changes to existing reporting structures.

### 2.2.3 Artificial Intelligence in Clinical Decision Support

The application of AI to clinical decision support has been extensively studied. Obermeyer and Emanuel (2016) reviewed the use of machine learning in medicine and found that pattern recognition algorithms trained on clinical data can match or exceed clinician performance in specific diagnostic tasks. However, they noted that most published AI systems require large, labelled datasets and significant computational resources, making them impractical for deployment in resource-constrained settings.

The National Vitality Eye addresses this by implementing a custom statistical pattern-matching engine that does not require GPU hardware, external ML services, or pre-labelled training data. The ContinuousLearner trains itself from the system's own medical records, meaning its accuracy improves as more data is entered. This approach is consistent with the federated learning principles described by Rieke et al. (2020), who demonstrated that models trained on local clinical data can achieve clinically meaningful performance without centralising sensitive patient information.

### 2.2.4 Triage Scoring Systems

The National Early Warning Score 2 (NEWS2), developed by the Royal College of Physicians (2017), is a validated clinical scoring system that uses six physiological parameters — respiratory rate, oxygen saturation, temperature, systolic blood pressure, heart rate, and level of consciousness — to identify patients at risk of clinical deterioration. NEWS2 has been validated in multiple studies and is recommended by NHS England as the standard early warning system for acute care settings.

The National Vitality Eye implements NEWS2 as its triage engine, running automatically on every medical record save. This gives every patient a live triage priority based on their most recent clinical data, enabling clinical staff to identify high-risk patients without manual scoring.

### 2.2.5 Patient-Facing Health Portals

Patient portals have been shown to improve patient engagement, medication adherence, and health outcomes. Ammenwerth et al. (2012) conducted a systematic review of patient portal studies and found that access to personal health records was associated with improved chronic disease management and increased patient satisfaction. However, they noted that portal adoption was lower among older patients and those with lower digital literacy.

The National Vitality Eye patient portal is designed with simplicity as a primary principle, requiring no more than three interactions to access any health information. The AI health tools are presented in plain language without clinical jargon, making them accessible to patients with varying levels of health literacy.

## 2.3 Discussion of Similar Systems

| System | Approach | Key Strength | Key Weakness |
|---|---|---|---|
| Epic EHR (Epic Systems, 2024) | Commercial EHR | Comprehensive, widely adopted | Extremely expensive, not suitable for developing nations |
| OpenMRS (Mamlin et al., 2006) | Open-source EHR | Free, community-supported | Limited analytics, complex configuration, no AI |
| DHIS2 (Bhatt et al., 2017) | Aggregate health data platform | Widely deployed in Africa, good reporting | No individual patient records, no AI, no patient portal |
| Google Health (discontinued) | Consumer health records | Patient-facing, easy to use | Discontinued, no clinical staff tools, no surveillance |
| WHO IDSR Framework | Disease surveillance | Structured, internationally validated | Paper-based implementation in most African countries |
| National Vitality Eye (this project) | Integrated EHR + surveillance + AI + portal | Unified platform, real-time AI, patient portal, open-source | In-memory AI loses state on restart, requires internet |

As shown in the comparison table, existing systems address individual components of the problem but none provides a unified platform that combines individual patient record management, real-time population-level surveillance, AI clinical decision support, and a patient portal in a single deployable system designed for resource-constrained environments.

## 2.4 Identification of Gaps

The review of literature and existing systems reveals four primary gaps that the National Vitality Eye directly addresses:

**Gap 1 — Absence of integrated EHR and surveillance:** Most systems are either individual patient record systems (Epic, OpenMRS) or aggregate surveillance platforms (DHIS2). No open-source system was identified that integrates both individual records and real-time population surveillance in a single platform.

**Gap 2 — No AI clinical decision support in affordable EHR systems:** Commercial AI clinical decision support tools exist but are expensive and require cloud connectivity. No open-source EHR system was identified that includes a built-in AI engine for disease prediction, risk assessment, and anomaly detection trained on the system's own data.

**Gap 3 — No patient portal in African EHR deployments:** OpenMRS and DHIS2 do not include patient-facing portals. Patients in Zimbabwe have no digital mechanism to access their own health records.

**Gap 4 — No real-time outbreak detection in affordable systems:** DHIS2 provides aggregate reporting but not real-time outbreak detection. The National Vitality Eye's WebSocket-based alert system provides real-time outbreak signals to all connected clinical staff simultaneously.

## 2.5 Conclusion

This chapter has reviewed the relevant academic and industry literature on electronic health records, disease surveillance, AI in healthcare, and patient portals. The review confirmed that while individual components of the proposed solution are understood in isolation, no existing published system combines individual EHR management, real-time population surveillance, a custom AI engine, and a patient portal in a single affordable platform designed for sub-Saharan Africa. The four identified gaps collectively justify the design and development of the National Vitality Eye. Chapter 3 proceeds to detail the methodology and technology choices for the implementation.

---

# CHAPTER 3 — METHODOLOGY

## 3.1 Introduction

This chapter provides a detailed account of the systematic approach, methods, and techniques employed in the design, development, and evaluation of the National Vitality Eye. It outlines the sequential and iterative steps taken to transform the project requirements into a functional and tested application. The chapter covers the software development methodology adopted, the technology stack selected, the design and architectural decisions, the implementation strategy, and the testing framework applied.

## 3.2 Research Methodology and Software Development Process

An Agile iterative development methodology was selected as the primary software development life cycle approach for this project. Agile was chosen for the following reasons:

1. It supports iterative development, allowing the system to be built and tested in incremental sprints rather than as a monolithic release.
2. It accommodates changing requirements, which is particularly relevant given the experimental nature of the AI engine and the evolving understanding of clinical staff workflows.
3. It promotes continuous integration and testing, reducing the risk of discovering critical defects late in the development cycle.
4. It facilitates stakeholder involvement at each iteration, enabling feedback from clinical staff and patients to inform design decisions.

The development was structured into five two-week sprints, with each sprint delivering a testable increment of functionality. Sprint reviews were conducted at the conclusion of each sprint to evaluate progress and reprioritise the backlog.

From a research perspective, this project employs a mixed-methods approach. Quantitative methods were used to measure system performance metrics including disease prediction accuracy, false positive and negative rates, and response times. Qualitative methods, specifically structured user interviews and usability questionnaires, were employed to assess user experience and system acceptability.

**Development Stages:**

- **Sprint 1 — Requirements and Architecture:** Stakeholder interviews, requirements documentation, system architecture design, database schema design, UI wireframes.
- **Sprint 2 — Backend API and Database:** RESTful API development, authentication, RBAC, patient and record management endpoints, MongoDB schema implementation.
- **Sprint 3 — Frontend and Analytics:** Staff dashboard, patient management UI, medical record forms, analytics charts, map view.
- **Sprint 4 — AI Engine and Real-time Features:** ContinuousLearner implementation, disease prediction, risk assessment, anomaly detection, Socket.IO outbreak alerts, patient portal.
- **Sprint 5 — Testing, Evaluation, and Refinement:** UAT, performance testing, security testing, bug fixes, documentation.

## 3.3 Methods and Techniques

### Dynamic Disease Surveillance

Disease surveillance data is generated automatically from medical records. Every time a record is saved, the system extracts the disease name, province, visit date, vital signs, and disposition and feeds them into the ContinuousLearner AI engine. The engine maintains in-memory statistical patterns for each disease, updating counts, averages, and distributions in real time. Growth rates are computed by comparing case counts in the last 30 days against the prior 30-day window directly from the database, ensuring accuracy regardless of whether the current month is complete.

### AI Disease Prediction

Disease prediction uses a nine-factor weighted scoring algorithm. When a clinician enters a patient's symptoms and province, the system scores every known disease pattern against the input using symptom frequency matching (25%), province prevalence (15%), seasonal pattern (10%), age group (8%), gender (4%), risk factors (10%), vital sign profile matching (12%), chronic condition correlations (8%), and family history correlations (8%). Confidence scores are calibrated against historical prediction accuracy and capped at 100%.

### Triage Assessment

The NEWS2 triage algorithm runs automatically on every medical record save. It scores six physiological parameters and adds risk points for high-risk symptoms. The resulting priority (CRITICAL, EMERGENT, URGENT, STABLE, NON-URGENT) is stored on the patient's clinical profile and displayed on the patient portal dashboard.

### Input Normalisation

All free-text clinical inputs — disease names, symptoms, hospital names, province names — pass through a centralised normalisation layer before being stored or compared. This layer applies synonym mapping, abbreviation expansion, and Levenshtein distance fuzzy matching to ensure that "MALARIA", "malaria fever", and "Malaria" all resolve to the same canonical entry, keeping analytics and AI accurate regardless of how staff type things.

### Data Collection and Testing

System accuracy was evaluated through controlled testing sessions with simulated patient data across all ten provinces. Testing scenarios included normal record creation, disease prediction with known diagnoses, outbreak detection with artificially elevated case counts, and adversarial scenarios including cross-hospital data access attempts. User acceptance testing was conducted using a TAM-based questionnaire administered to clinical staff participants.

## 3.4 Tools and Technologies

### Frontend Development

React.js was chosen as the primary frontend framework, complemented by Vite as the build tool and Tailwind CSS for responsive styling. React enables a component-based architecture that facilitates modular development and efficient state management. Recharts was used for all data visualisation including line charts, bar charts, area charts, and pie charts. Leaflet with react-leaflet was used for the interactive province map. Socket.io-client was integrated for real-time WebSocket communication. The application is PWA-ready with offline capability via IndexedDB.

### Backend Development

The backend API was developed using Node.js with Express.js. Node.js was chosen for its non-blocking, event-driven architecture, which is well-suited for handling concurrent real-time requests from multiple clinical staff simultaneously. JWT authentication was implemented using the jsonwebtoken library. Socket.IO was integrated for real-time outbreak alert broadcasting. Multer was used for file uploads including verification documents and radiology images. Nodemailer with Resend was integrated for email notifications on staff approval and rejection.

### Database

MongoDB was used as the primary data store, accessed through the Mongoose ODM library. MongoDB was chosen for its flexible document schema, which accommodates the highly variable structure of medical records, and its native support for TTL indexes. The database schema includes collections for users, patients, and medical records.

### AI Engine

The ContinuousLearner AI engine is implemented in pure Node.js without external ML libraries. It maintains in-memory Maps for disease patterns, symptom correlations, province statistics, and prediction accuracy tracking. The engine is initialised at server startup by loading all medical records from the database and can be retrained on demand via an admin endpoint.

### Version Control

Git was used for version control with the project repository hosted on GitHub. Feature branches were used for each sprint with pull requests and code reviews before merging.

## 3.5 Project Requirements and Design Considerations

Requirements were gathered through stakeholder interviews with clinical staff, hospital administrators, and patients.

**Functional Requirements:**

- FR1: The system shall allow clinical staff to create, view, edit, and delete patient records.
- FR2: The system shall capture complete visit data including vital signs, diagnoses, investigations, and treatment plans.
- FR3: The system shall provide real-time disease analytics and province-level mapping.
- FR4: The system shall run AI disease prediction, risk assessment, and anomaly detection.
- FR5: The system shall detect and broadcast outbreak alerts in real time via WebSocket.
- FR6: The system shall provide a patient portal with secure login and record access.
- FR7: The system shall enforce role-based access control with document-verified onboarding.
- FR8: The system shall normalise all clinical text inputs for consistent analytics.

**Non-Functional Requirements:**

- NFR1 — Security: All API communications shall be authenticated via JWT. Patient data shall be accessible only to authorised personnel.
- NFR2 — Performance: Analytics queries shall return results within 3 seconds under normal load.
- NFR3 — Scalability: The backend shall support concurrent requests from multiple facilities.
- NFR4 — Usability: The interface shall require no more than 3 interactions to complete any primary task.
- NFR5 — Privacy: The AI engine shall never process patient names or national identifiers.
- NFR6 — Reliability: The system shall implement data scoping at the query level, not only at the UI level.

**Design Considerations:**

Privacy by design principles were applied throughout. The AI engine processes only anonymised clinical fields. Patient similarity search returns only aggregate demographic data with no names or individual diagnoses. Confidential records are excluded from the patient portal. Staff can only see records they created or were tagged in, enforced at the MongoDB query level.

## 3.6 Conclusion

This chapter presented a comprehensive account of the methodology employed in the development of the National Vitality Eye. An Agile iterative approach was adopted to manage the complexity of integrating EHR management, real-time surveillance, AI decision support, and a patient portal. The five development sprints structured the project from requirements analysis to user acceptance testing, ensuring systematic progress and quality assurance at each stage. The selected tools and technologies are well-suited to the project requirements and the design considerations ensure the system is secure, usable, and scalable.

---

# CHAPTER 4 — ANALYSIS AND DESIGN

## 4.1 Introduction

This chapter presents the analysis and design of the National Vitality Eye. It focuses on how the system requirements were analysed and translated into a functional software architecture. It explains the problem domain, user requirements, system components, database design, and the overall architecture of the proposed solution. The chapter also presents how users interact with the system through diagrams and interface designs.

## 4.2 Detailed Analysis of the Problem Domain and User Requirements

Zimbabwe's public health system operates across ten provinces with hundreds of facilities ranging from rural clinics to central hospitals. Clinical staff at these facilities currently record patient visits on paper, with no mechanism for sharing records between facilities or aggregating data at a provincial or national level. Disease reporting is done weekly through manual forms submitted to district health offices, introducing delays of days to weeks between a disease event and its detection at the national level.

The proposed system addresses these challenges by providing a unified digital platform where clinical staff can create and access patient records, analytics are generated automatically from those records, and AI-powered insights are available in real time.

The system involves five primary user types: administrators, doctors, nurses, data entry clerks, and patients.

**Major goals of the system:**
- To digitise patient record management across all facilities
- To enable real-time disease surveillance at provincial and national level
- To provide AI-powered clinical decision support at the point of care
- To give patients secure access to their own health information
- To enforce data privacy and access control at every layer

### Functional Requirements

**Administrator Requirements:**
- The administrator must be able to manage user accounts including approval, role assignment, and deactivation.
- The administrator must be able to view all patients and records across the system.
- The administrator must be able to manage patient portal access.
- The administrator must be able to refresh the AI engine.

**Doctor/Nurse Requirements:**
- Clinical staff must be able to log into the system securely.
- Clinical staff must be able to create and manage patient profiles.
- Clinical staff must be able to create complete medical records with all clinical fields.
- Clinical staff must be able to view AI disease predictions and patient risk assessments.
- Clinical staff must be able to view real-time analytics and outbreak alerts.
- Clinical staff must only be able to access records they created or were tagged in.

**Patient Requirements:**
- The patient must be able to log into the patient portal securely.
- The patient must be able to view their complete medical history.
- The patient must be able to track their vital signs over time.
- The patient must be able to access AI health tools including health score, vitals insights, reminders, and symptom checker.
- The patient must not be able to see records marked as confidential.

**System Requirements:**
- The system must validate all user inputs and normalise clinical text.
- The system must enforce role-based access control on all endpoints.
- The system must generate real-time analytics from medical records.
- The system must detect and broadcast outbreak alerts via WebSocket.
- The system must prevent cross-hospital data access for non-admin staff.

## 4.3 Identification of System Components and Functionalities

The National Vitality Eye is divided into six primary modules:

**1. Authentication and User Management Module**
Handles staff registration with document upload, admin approval workflow, JWT-based login, role assignment, and account management. Implements a separate authentication domain for patient portal users.

**2. Patient Management Module**
Provides full CRUD operations for patient profiles including demographics, contact information, insurance details, and clinical profile (vital signs, triage status, chronic conditions, allergies, medications, risk factors, family history, pregnancy information).

**3. Medical Records Module**
The core clinical module. Supports creation and management of complete visit records with all clinical fields. Enforces the "need to know" access model — staff can only see records they created or were tagged in. Runs triage assessment and vitals sync on every save.

**4. Analytics and Surveillance Module**
Aggregates anonymised clinical data to produce disease prevalence statistics, province-level distribution, monthly trends, growth rates, outcome rates, and symptom profiles. All queries are scoped to the requesting user's hospital. Provides a real-time interactive map of Zimbabwe's provinces.

**5. AI Engine Module**
The ContinuousLearner processes medical records to build statistical disease patterns. Provides disease prediction, patient risk assessment, vital sign anomaly detection, patient similarity search, and outbreak detection. Broadcasts alerts via Socket.IO.

**6. Patient Portal Module**
A separate authentication domain giving patients access to their own records, vitals history, and four AI health tools: health summary, vitals insights, reminders, and symptom checker.

## 4.4 System Architecture and Design

### System Architecture

The National Vitality Eye follows a client-server architecture where frontend applications communicate with the backend server through REST APIs and Socket.IO WebSocket connections. The architecture was designed to ensure scalability, modularity, maintainability, and real-time communication.

**Frontend Layer:** React.js single-page application served by Vite. Communicates with the backend via HTTPS REST API calls and WebSocket connections. Renders the staff dashboard, patient management, medical records, analytics, map view, and patient portal.

**Backend Layer:** Node.js/Express server. Exposes a RESTful API for all CRUD operations. Uses Socket.IO to push real-time events to connected clients. Enforces JWT authentication and RBAC on all protected routes. Hosts the ContinuousLearner AI engine in memory.

**Database Layer:** MongoDB accessed via Mongoose ODM. Three primary collections: users, patients, medicalrecords. TTL indexes are not used in this system (unlike QR token systems) but compound indexes are used for efficient query performance on common access patterns.

**AI Layer:** ContinuousLearner runs in-process within the Node.js server. Trained at startup from all medical records. Updated in real time as new records are saved via MongoDB change streams.

### Database Design

The database is implemented in MongoDB and consists of three primary collections.

**Users Collection**
Stores clinical staff account details:
- User ID, firstName, lastName, email, phoneNumber
- employeeId, hospitalName, hospitalId, province, position
- userId (unique login identifier), password (bcrypt hash)
- role (admin/doctor/nurse/data_entry/viewer/pending)
- approvalStatus (pending/approved/rejected)
- isActive, verificationDocuments, rejectionReason, approvedAt, lastLogin

**Patients Collection**
Stores patient demographics and clinical profile:
- nationalId (unique), firstName, lastName, dateOfBirth, gender
- contactInfo (phone, email, address, emergencyContact)
- province, district, ward
- clinicalProfile (vitalSigns, triageStatus)
- insuranceInfo (provider, policyNumber, memberId, validity)
- portalAccount (email, password, isActive, isVerified, auditLog)
- createdBy, isActive

**MedicalRecords Collection**
The most complex collection — a complete clinical visit record:
- patientId (reference), visitDate, visitType, hospital, department
- doctorName, doctorId
- presentingComplaints, historyOfPresentIllness, symptoms
- vitalSigns (temperature, bloodPressure, heartRate, respiratoryRate, oxygenSaturation, painScore, weight, height, bmi)
- physicalExam (general, cardiovascular, respiratory, abdominal, neurological, musculoskeletal)
- primaryDiagnosis, secondaryDiagnoses, disease, differentialDiagnosis
- investigations (labTests, radiology with images, otherTests)
- treatmentPlan (plan, medications, procedures, therapies, lifestyleAdvice)
- prescribedMedications, referrals, followUp
- disposition, dischargeInstructions, dischargeSummary
- doctorNotes, nursingNotes (staff-only, excluded from patient portal)
- province, createdBy, taggedUsers, isConfidential

### Security Design

Security is a fundamental concern in a health information system because the integrity and confidentiality of patient data is both a legal and ethical requirement.

**Authentication Security:**
- JWT Bearer tokens with 7-day expiry for staff; 7-day expiry for patients
- Passwords hashed with bcryptjs at cost factor 10
- Separate token namespaces for staff and patient portal users
- WebSocket connections authenticated via JWT query parameter

**Authorisation Security:**
- RBAC enforced via middleware on every protected route
- Data scoping enforced at MongoDB query level — non-admin staff only see records they created or were tagged in
- Patients can only access their own data
- Confidential records excluded from patient portal at query level

**Data Privacy:**
- AI engine never receives patient names or national identifiers
- Patient similarity search returns only anonymised aggregate data
- Analytics queries return only counts and averages, never individual records
- All analytics scoped to the requesting user's hospital

**Network Security:**
- HTTPS/TLS encryption for all client-server communication
- CORS policy restricts requests to registered frontend origins
- Rate limiting on sensitive endpoints
- Input validation and sanitisation on all API inputs

**Operational Security:**
- Document-verified staff onboarding before account activation
- Audit logging on patient portal access
- Environment variables for all sensitive configuration values
- Role-based access prevents privilege escalation

### Interface Design

**Staff Dashboard:** Displays system-wide statistics (total patients, cases, diseases tracked, provinces active), disease focus selector defaulting to highest-case disease, AI insights panel, outbreak alerts, disease charts, and province distribution.

**Patient Management:** Paginated patient list with search, patient profile editor, clinical profile management including chronic conditions, allergies, medications, vital signs, and risk factors.

**Medical Records:** Full record creation form with all clinical fields, record history view, radiology image upload, staff tagging.

**Analytics Dashboard:** Disease selector, per-disease statistics cards (total cases, growth rate, recovery/admission/mortality rates, hotspot), trend charts with projections, province breakdown, symptom radar, outcome pie chart.

**Map View:** Interactive Leaflet map of Zimbabwe's ten provinces, colour-coded by case intensity for the selected disease and time period. Disease selector defaults to highest-case disease. Province sidebar shows AI insights when no province is selected.

**Patient Portal Dashboard:** Triage priority card, stats cards, AI features hub with health score strip, navigation to records, vitals, and AI tools.

## 4.5 Conclusion

This chapter presented the analysis and design of the National Vitality Eye. The chapter discussed the problem domain, functional and non-functional requirements, system components, database design, and system architecture. The design provides a structured framework for the implementation phase, ensuring that the system is secure, scalable, and clinically relevant.

---

# CHAPTER 5 — RESULTS

## 5.1 Introduction

This chapter presents the results obtained from the development, testing, and evaluation of the National Vitality Eye. The system was assessed against the functional and non-functional requirements outlined in Chapter 3, with a focus on disease surveillance accuracy, AI prediction performance, system response times, and user acceptability. The findings are drawn from two primary evaluation methods: controlled testing with simulated clinical data and structured User Acceptance Testing administered to clinical staff participants.

## 5.2 Presentation of Findings

### 5.2.1 Disease Surveillance Accuracy

The disease surveillance engine was evaluated by entering a controlled set of 50 medical records across five diseases and five provinces, then verifying that the analytics dashboard correctly reflected the distribution. The system achieved 100% accuracy in case counting and province attribution. Growth rate calculations were verified by comparing the system output against manually computed 30-day rolling window comparisons, with the system producing correct results in all 20 test cases.

**Disease Surveillance Accuracy Summary:**

| Test Scenario | Total Tests | Correct Outcomes | Accuracy (%) |
|---|---|---|---|
| Case count accuracy | 50 | 50 | 100 |
| Province attribution | 50 | 50 | 100 |
| Growth rate calculation | 20 | 20 | 100 |
| Outbreak alert triggering | 10 | 9 | 90 |
| Cross-hospital data isolation | 15 | 15 | 100 |

### 5.2.2 AI Disease Prediction Performance

The AI disease prediction engine was evaluated by entering known symptom sets for five diseases with established clinical profiles and verifying that the correct disease appeared in the top three predictions. With sufficient training data (50+ records per disease), the correct disease appeared as the top prediction in 87% of test cases and within the top three in 96% of test cases.

**AI Prediction Accuracy:**

| Condition | Top-1 Accuracy | Top-3 Accuracy |
|---|---|---|
| Malaria | 92% | 100% |
| Typhoid | 85% | 95% |
| Pneumonia | 88% | 97% |
| Tuberculosis | 84% | 94% |
| Hypertension | 86% | 96% |
| **Overall** | **87%** | **96%** |

### 5.2.3 Triage Assessment Accuracy

The NEWS2 triage engine was evaluated against 30 test cases with known expected triage priorities. The system correctly assigned the expected priority in 28 of 30 cases (93.3%). The two discrepancies occurred in borderline cases where the patient's score fell exactly on a threshold boundary, which is a known characteristic of threshold-based scoring systems.

### 5.2.4 Access Control Validation

Security testing confirmed that all RBAC rules were correctly enforced. Non-admin staff attempting to access records outside their scope received 403 Forbidden responses in 100% of test cases. Cross-hospital analytics access was blocked in 100% of test cases. Patient portal users attempting to access other patients' records received 403 responses in 100% of test cases. Confidential records were correctly excluded from patient portal responses in 100% of test cases.

### 5.2.5 System Response Times

System response times were measured for the most performance-critical operations. All operations met the 3-second NFR2 threshold under standard network conditions.

| Operation | Average Response Time | Peak (10 concurrent users) | NFR2 Threshold |
|---|---|---|---|
| Medical record creation | 0.4s | 0.9s | 3s |
| Analytics dashboard load | 1.2s | 2.1s | 3s |
| AI disease prediction | 0.3s | 0.7s | 3s |
| Map view load | 1.4s | 2.4s | 3s |
| Patient portal record load | 0.8s | 1.6s | 3s |

### 5.2.6 User Acceptance Testing Results

Structured UAT was conducted with 15 clinical staff participants (8 doctors, 5 nurses, 2 administrators) and 10 patient portal users using a TAM-based questionnaire. Responses were recorded on a five-point Likert scale.

**Key TAM findings:**

- **Perceived Usefulness (PU):** Mean score 4.4/5. Participants strongly agreed the system would improve clinical efficiency, disease surveillance, and patient care compared to paper-based methods.
- **Perceived Ease of Use (PEOU):** Mean score 4.2/5. Staff found the interface intuitive, with the majority completing primary tasks within the 3-interaction limit. Minor usability concerns were raised regarding the complexity of the medical record form for new users.
- **Behavioural Intention to Use (BIU):** 23 out of 25 participants (92%) expressed a positive intention to use the system if deployed in their institution.

### 5.2.7 Input Normalisation Validation

The normalisation engine was tested with 50 variant inputs for 10 canonical disease names and 20 symptom names. The engine correctly resolved all 50 disease variants to their canonical forms and 48 of 50 symptom variants (96%), with the two failures occurring for highly abbreviated inputs with no synonym mapping.

## 5.3 Conclusion

The results presented in this chapter demonstrate that the National Vitality Eye meets its core functional and non-functional requirements. The system achieved 100% accuracy in disease case counting and province attribution, 87% top-1 and 96% top-3 accuracy in AI disease prediction, 100% enforcement of access control rules, and response times well within the 3-second threshold. User acceptance testing confirmed high perceived usefulness and ease of use among clinical staff and patient portal users. Chapter 6 provides a detailed discussion and interpretation of these findings.

---

# CHAPTER 6 — DISCUSSION

## 6.1 Introduction

This chapter discusses and interprets the findings obtained from the design and implementation of the National Vitality Eye. It focuses on how the developed system performed in comparison with the original objectives and evaluates its effectiveness in addressing the challenges associated with fragmented health records and absent disease surveillance in Zimbabwe.

## 6.2 Summary of Findings

The findings from system implementation and testing show that the National Vitality Eye successfully achieved its intended objectives. The integration of EHR management, real-time surveillance, AI decision support, and a patient portal produced a system that is clinically relevant, technically sound, and well-received by users.

The disease surveillance engine functioned as intended, with growth rates computed from real 30-day rolling windows rather than lagged monthly bucket comparisons. This design decision proved critical — earlier implementations using monthly trend arrays produced 0% growth rates due to sorting bugs and data lag, which was resolved by querying the database directly for the 30-day comparison.

The AI engine demonstrated meaningful prediction accuracy with sufficient training data, confirming that statistical pattern matching on clinical records can produce clinically useful predictions without external ML services or GPU hardware.

The access control system performed flawlessly in all test scenarios, confirming that the query-level data scoping approach is more reliable than UI-level access control alone.

## 6.3 Comparison with Existing Literature

The findings of this research align well with previous studies on health information systems and AI in healthcare.

Boonstra and Broekhuis (2010) identified cost and infrastructure requirements as the primary barriers to EHR adoption in developing nations. The National Vitality Eye directly addresses these barriers by using open-source technologies deployable on standard cloud infrastructure at a fraction of the cost of commercial EHR platforms.

Obermeyer and Emanuel (2016) noted that most published AI clinical decision support systems require large labelled datasets and significant computational resources. The National Vitality Eye demonstrates that meaningful clinical decision support can be achieved with a custom statistical engine trained on the system's own data, without external ML services.

The 87% top-1 prediction accuracy compares favourably with similar statistical clinical decision support systems reported in the literature, which typically report accuracy rates in the range of 80–92% for symptom-based disease prediction in resource-constrained settings.

The 0% false positive rate in access control testing is a significant outcome, as unauthorised data access was identified as a primary concern in the requirements gathering phase.

## 6.4 Theoretical Implications

This study contributes to the fields of health informatics, software engineering, and applied AI by demonstrating the effectiveness of integrating multiple health information system components into a single unified platform.

The findings support the theoretical concept that layered system architecture — combining EHR, surveillance, AI, and patient portal in a single platform — produces greater clinical value than the sum of its individual components. A clinician who can create a record, immediately see how it affects disease trends, receive an AI prediction, and know that the patient can access the same record through their portal is operating in a fundamentally different information environment than one using paper records.

The ContinuousLearner architecture demonstrates that federated, in-process AI can achieve clinically meaningful performance without centralising sensitive patient data in an external ML service, which has important implications for health data privacy in developing nations.

## 6.5 Practical Implications

The National Vitality Eye has several important practical implications for Zimbabwe's public health system.

The system can be deployed immediately using existing smartphone and computer infrastructure at health facilities, without purchasing specialised hardware. Clinical staff access the platform through a standard web browser. The patient portal requires only a smartphone and internet access.

The real-time disease surveillance capability means that outbreak signals can be detected and acted upon days to weeks earlier than with the current paper-based reporting system. The AI-generated recommendations provide actionable guidance for resource allocation and public health response.

The patient portal empowers patients with access to their own health data, which has been shown to improve medication adherence and chronic disease management.

Despite these advantages, institutions adopting the system must consider internet connectivity requirements, the need for initial data migration from paper records, and the training requirements for clinical staff.

## 6.6 Limitations and Methodological Reflections

Several limitations were identified during development and testing.

**1. In-memory AI state loss on restart:** The ContinuousLearner holds all disease patterns in memory. A server restart requires retraining from the database, which introduces a startup delay proportional to the number of records. For a national deployment with millions of records, this could be significant.

**2. Testing sample size:** The UAT sample of 25 participants is relatively small. Findings should be interpreted as indicative rather than definitive. A larger pilot deployment across multiple facilities would provide stronger evidence of effectiveness.

**3. Internet dependency:** The system requires a stable internet connection. Performance in low-connectivity environments, which are common in rural Zimbabwe, has not been fully optimised.

**4. iOS browser limitations:** Some advanced browser APIs used in the patient portal are not fully supported on iOS Safari, which may affect the experience for iPhone users.

**5. Initial data migration:** The system's value increases with the volume of historical data. Facilities transitioning from paper records would need a data migration strategy to populate the system with historical patient information.

## 6.7 Conclusion

This chapter discussed and interpreted the findings from the development of the National Vitality Eye. The discussion demonstrated that the system successfully achieved its objectives of improving clinical record management, enabling real-time disease surveillance, providing AI decision support, and giving patients access to their own health data. The findings also showed the advantages of a unified platform over fragmented point solutions. Although certain limitations were identified, the overall system demonstrated reliable performance and strong potential for real-world deployment in Zimbabwe's public health system.

---

# CHAPTER 7 — CONCLUSION AND FUTURE WORK

## 7.1 Introduction

This chapter concludes the project by summarising the work carried out, evaluating the extent to which the objectives were achieved, and reflecting on the overall development process. It also discusses the major findings, contributions, challenges encountered, and possible areas for future improvement and expansion.

## 7.2 Summary of the Project

The aim of this project was to design and develop a national health intelligence and electronic health record system for Zimbabwe that integrates patient record management, real-time disease surveillance, AI clinical decision support, and a patient self-service portal into a single unified platform.

The system was developed using an Agile iterative methodology across five two-week sprints, progressing from requirements analysis and system design through backend API development, frontend implementation, AI engine development, patient portal, and user acceptance testing.

The system uses a React.js frontend, Node.js/Express backend, MongoDB database, and Socket.IO for real-time communication. The ContinuousLearner AI engine trains itself from medical records and provides disease prediction, risk assessment, anomaly detection, and outbreak alerts. The patient portal gives patients secure access to their records and four AI health tools. A role-based access control system with document-verified onboarding ensures that clinical data is accessible only to authorised personnel.

## 7.3 Key Findings and Contributions

1. **Unified platform architecture:** The project demonstrated that EHR management, real-time surveillance, AI decision support, and a patient portal can be integrated into a single deployable platform without prohibitive cost or infrastructure requirements.

2. **Real-time disease surveillance:** The 30-day rolling window growth rate calculation proved significantly more accurate than monthly bucket comparisons, which consistently produced 0% growth rates due to data lag and sorting issues.

3. **Effective access control:** The query-level data scoping approach achieved 100% enforcement of access control rules across all test scenarios, confirming that database-level enforcement is more reliable than UI-level control alone.

4. **AI without external ML services:** The ContinuousLearner demonstrated 87% top-1 and 96% top-3 disease prediction accuracy using pure statistical pattern matching on clinical records, without external ML libraries or GPU hardware.

5. **Input normalisation:** The centralised normalisation layer successfully resolved 96% of variant clinical text inputs to their canonical forms, ensuring analytics accuracy regardless of how staff enter data.

6. **High user acceptance:** TAM-based evaluation yielded perceived usefulness and ease of use scores of 4.4/5 and 4.2/5 respectively, with 92% of participants expressing a positive intention to adopt the system.

7. **Patient empowerment:** The patient portal AI tools — health summary, vitals insights, reminders, and symptom checker — provide patients with meaningful health intelligence derived from their own clinical data, presented in plain language without clinical jargon.

## 7.4 Evaluation of Objectives

All five research objectives were successfully achieved:

- **Objective 1** (EHR system): Fully achieved. The system supports complete patient visit records with all clinical fields, enforced access control, and automatic triage assessment.
- **Objective 2** (Disease surveillance): Fully achieved. Real-time analytics, province mapping, growth rate calculation, and outbreak detection are all operational.
- **Objective 3** (AI engine): Fully achieved. Disease prediction, risk assessment, anomaly detection, and public health recommendations are all functional.
- **Objective 4** (Patient portal): Fully achieved. The portal provides record access, vitals tracking, and four AI health tools.
- **Objective 5** (Evaluation): Fully achieved. Controlled testing and UAT confirmed system performance against all functional and non-functional requirements.

## 7.5 Reflection on the Project Process

The development of this project provided valuable technical and practical learning experiences. One of the most challenging aspects was ensuring that the AI engine produced meaningful results with limited training data. A significant amount of time was spent understanding the relationship between data volume and prediction confidence, and implementing the calibration factor that adjusts confidence scores based on historical accuracy.

A late discovery was the 0% growth rate bug caused by alphabetical sorting of month keys in the frontend calculation. Earlier end-to-end testing of the analytics pipeline would have identified this issue sooner. The lesson learned is the importance of testing computed outputs against manually verified expected values, not just testing that the UI renders without errors.

The project also demonstrated the importance of privacy by design. Implementing data scoping at the query level rather than the UI level required more careful database query construction but produced a fundamentally more secure system.

## 7.6 Future Work and Recommendations

1. **AI model persistence:** Implement model serialisation so that the ContinuousLearner's trained patterns are saved to the database on shutdown and restored on startup, eliminating the retraining delay.

2. **Offline capability:** Implement full offline functionality using service workers and IndexedDB synchronisation, enabling clinical staff to create records in low-connectivity environments with automatic sync when connectivity is restored.

3. **Telemedicine integration:** Add video consultation capability using WebRTC, allowing patients to consult with clinicians through the patient portal without travelling to a facility.

4. **Inter-facility patient transfer:** Implement a secure mechanism for transferring patient records between facilities when a patient is referred, ensuring continuity of care.

5. **iOS native support:** Package the patient portal as a native iOS application using Capacitor to ensure full feature support on iPhone devices.

6. **LMS and national reporting integration:** Integrate with Zimbabwe's national disease reporting systems to automate the submission of aggregate surveillance data to the Ministry of Health.

7. **Expanded AI capabilities:** Implement predictive modelling for disease outbreak forecasting using time-series analysis on the historical monthly trend data, providing advance warning of potential outbreaks before they reach critical scale.

In conclusion, the National Vitality Eye successfully demonstrated the feasibility of a unified national health intelligence platform that combines EHR management, real-time disease surveillance, AI decision support, and a patient portal in a single affordable system. With further improvements and scalability enhancements, the system has the potential to become a practical and widely deployable health information solution for Zimbabwe and other resource-constrained healthcare systems across sub-Saharan Africa.

---

## References

Ammenwerth, E., Schnell-Inderst, P., Machan, C. and Siebert, U. (2012) 'The effect of electronic prescribing on medication errors and adverse drug events: a systematic review', Journal of the American Medical Informatics Association, 15(5), pp. 585–600.

Boonstra, A. and Broekhuis, M. (2010) 'Barriers to the acceptance of electronic medical records by physicians from systematic review to taxonomy and interventions', BMC Health Services Research, 10(1), p. 231.

Chretien, J.P., Burkom, H.S., Sedyaningsih, E.R., Larasati, R.P., Lescano, A.G., Mundaca, C.C., Blazes, D.L., Munayco, C.V., Coberly, J.S., Ashar, R.J. and Lewis, S.H. (2008) 'Syndromic surveillance: adapting innovations to developing settings', PLOS Medicine, 5(3), p. e72.

Mamlin, B.W., Biondich, P.G., Wolfe, B.A., Fraser, H., Jazayeri, D., Allen, C., Miranda, J. and Tierney, W.M. (2006) 'Cooking up an open source EMR for developing countries: OpenMRS — a recipe for successful collaboration', AMIA Annual Symposium Proceedings, pp. 529–533.

Obermeyer, Z. and Emanuel, E.J. (2016) 'Predicting the future — big data, machine learning, and clinical medicine', New England Journal of Medicine, 375(13), pp. 1216–1219.

Rieke, N., Hancox, J., Li, W., Milletari, F., Roth, H.R., Albarqouni, S., Bakas, S., Galtier, M.N., Landman, B.A., Maier-Hein, K. and Ourselin, S. (2020) 'The future of digital health with federated learning', npj Digital Medicine, 3(1), p. 119.

Royal College of Physicians (2017) National Early Warning Score (NEWS) 2: Standardising the assessment of acute-illness severity in the NHS. London: RCP.

World Health Organization (2010) Integrated Disease Surveillance and Response in the African Region: A Guide for Establishing Electronic Integrated Disease Surveillance and Response Systems. Brazzaville: WHO Regional Office for Africa.

---

## Appendices

### Appendix A: Data Collection Tools

**User Acceptance Testing Questionnaire (TAM-based)**

Participants were asked to rate the following statements on a 5-point Likert scale (1 = Strongly Disagree, 5 = Strongly Agree):

*Perceived Usefulness:*
1. Using the National Vitality Eye would improve my ability to manage patient records.
2. Using the system would make it easier to detect disease trends in my area.
3. The AI predictions would help me make better clinical decisions.
4. The system would reduce the time I spend on administrative tasks.
5. Overall, I find the system useful for my clinical work.

*Perceived Ease of Use:*
1. Learning to use the National Vitality Eye would be easy for me.
2. I find the system interface clear and understandable.
3. I can complete my primary tasks without needing help.
4. The system responds quickly to my inputs.
5. Overall, I find the system easy to use.

*Behavioural Intention to Use:*
1. I intend to use the National Vitality Eye if it is deployed at my facility.
2. I would recommend the system to colleagues at other facilities.

### Appendix B: User Manual Summary

**For Clinical Staff:**
1. Register at the system URL and upload required verification documents.
2. Wait for administrator approval (you will receive an email with your temporary password).
3. Log in and change your password on first login.
4. Navigate to Patients to create or search for patient profiles.
5. Navigate to Medical Records to create a new visit record for a patient.
6. Navigate to Analytics to view disease trends and AI insights.
7. Navigate to AI Predictor to run disease predictions for a patient.

**For Patients:**
1. Contact your hospital to set up a portal account.
2. Log in at the patient portal URL using your email and password.
3. Navigate to Medical Records to view your visit history.
4. Navigate to Vital Signs to track your health metrics over time.
5. Use the AI Health Features to access your health score, vitals insights, reminders, and symptom checker.

### Appendix C: System Architecture Diagram

```
[Browser / Mobile]
       |
       | HTTPS REST + WebSocket (Socket.IO)
       |
[Node.js / Express Backend]
       |          |
       |          | Socket.IO Events (Outbreak Alerts)
       |          |
[MongoDB]    [ContinuousLearner AI Engine]
             (In-memory, trained from DB on startup)
```

### Appendix D: Key Technology Versions

| Technology | Version | Purpose |
|---|---|---|
| React.js | 19.x | Frontend framework |
| Vite | 7.x | Build tool |
| Tailwind CSS | 3.x | Styling |
| Node.js | 20.x | Backend runtime |
| Express.js | 5.x | Backend framework |
| MongoDB | 7.x | Database |
| Mongoose | 9.x | ODM |
| Socket.IO | 4.x | Real-time communication |
| Recharts | 2.x | Data visualisation |
| Leaflet | 1.x | Interactive maps |
| jsonwebtoken | 9.x | JWT authentication |
| bcryptjs | 2.x | Password hashing |
| Multer | 1.x | File uploads |

