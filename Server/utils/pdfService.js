const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateMedicalReport = async (patient, records) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];
            
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            
            // Header
            doc.fontSize(20)
               .font('Helvetica-Bold')
               .fillColor('#4F46E5')
               .text('National Vitality Eye', { align: 'center' });
            
            doc.fontSize(12)
               .font('Helvetica')
               .fillColor('#666666')
               .text('Medical Report', { align: 'center' });
            
            doc.moveDown();
            doc.lineWidth(1)
               .strokeColor('#CCCCCC')
               .moveTo(50, doc.y)
               .lineTo(550, doc.y)
               .stroke();
            
            doc.moveDown();
            
            // Patient Information
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#333333')
               .text('Patient Information');
            
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor('#666666');
            
            const patientInfo = [
                `Name: ${patient.firstName} ${patient.lastName}`,
                `National ID: ${patient.nationalId}`,
                `Date of Birth: ${new Date(patient.dateOfBirth).toLocaleDateString()}`,
                `Gender: ${patient.gender}`,
                `Province: ${patient.province}`
            ];
            
            patientInfo.forEach(info => {
                doc.text(info);
            });
            
            doc.moveDown();
            
            // Medical Records
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#333333')
               .text('Medical History');
            
            doc.moveDown();
            
            records.forEach((record, index) => {
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .fillColor('#4F46E5')
                   .text(`Visit ${index + 1}: ${new Date(record.visitDate).toLocaleDateString()}`);
                
                doc.fontSize(10)
                   .font('Helvetica')
                   .fillColor('#333333');
                
                doc.text(`Hospital: ${record.hospital || 'N/A'}`);
                doc.text(`Doctor: ${record.doctorName || 'N/A'}`);
                doc.text(`Diagnosis: ${record.primaryDiagnosis?.name || record.diagnosis || 'N/A'}`);
                
                if (record.disease) {
                    doc.text(`Disease Category: ${record.disease}`);
                }
                
                if (record.symptoms && record.symptoms.length > 0) {
                    doc.text(`Symptoms: ${record.symptoms.join(', ')}`);
                }
                
                if (record.prescribedMedications && record.prescribedMedications.length > 0) {
                    doc.text(`Medications: ${record.prescribedMedications.join(', ')}`);
                }
                
                if (record.vitalSigns) {
                    const vitals = [];
                    if (record.vitalSigns.temperature) vitals.push(`Temp: ${record.vitalSigns.temperature}°C`);
                    if (record.vitalSigns.bloodPressure?.systolic) vitals.push(`BP: ${record.vitalSigns.bloodPressure.systolic}/${record.vitalSigns.bloodPressure.diastolic}`);
                    if (record.vitalSigns.heartRate) vitals.push(`HR: ${record.vitalSigns.heartRate} bpm`);
                    if (vitals.length > 0) {
                        doc.text(`Vital Signs: ${vitals.join(' | ')}`);
                    }
                }
                
                if (record.dischargeInstructions) {
                    doc.text(`Discharge Instructions: ${record.dischargeInstructions}`);
                }
                
                doc.moveDown();
                
                if (index < records.length - 1) {
                    doc.lineWidth(0.5)
                       .strokeColor('#EEEEEE')
                       .moveTo(50, doc.y)
                       .lineTo(550, doc.y)
                       .stroke();
                    doc.moveDown();
                }
            });
            
            // Footer
            const pageCount = doc.bufferedPageRange().count;
            for (let i = 0; i < pageCount; i++) {
                doc.switchToPage(i);
                doc.fontSize(8)
                   .fillColor('#999999')
                   .text(`Generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 50, { align: 'center' });
            }
            
            doc.end();
            
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generateMedicalReport };