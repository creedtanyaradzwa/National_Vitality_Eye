import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Format date for PDF
const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-ZW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Generate PDF from medical records
export const generateMedicalRecordsPDF = async (patient, records) => {
    // Create a temporary div to render the content
    const element = document.createElement('div');
    element.style.width = '800px';
    element.style.padding = '20px';
    element.style.backgroundColor = 'white';
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.color = '#333';
    
    // Build HTML content
    element.innerHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; }
                .header h1 { color: #4F46E5; margin: 0; font-size: 24px; }
                .header p { color: #666; margin: 5px 0 0; }
                .patient-info { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                .patient-info h3 { margin: 0 0 10px; color: #4F46E5; }
                .patient-info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
                .info-item { margin: 5px 0; }
                .info-label { font-weight: bold; color: #555; }
                .section { margin-bottom: 25px; }
                .section-title { background: #4F46E5; color: white; padding: 8px 12px; border-radius: 5px; margin-bottom: 15px; font-size: 16px; }
                .record-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; }
                .record-header { display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
                .record-date { color: #4F46E5; font-weight: bold; }
                .record-type { background: #e0e7ff; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
                .diagnosis { background: #fef3c7; padding: 10px; border-radius: 5px; margin: 10px 0; }
                .diagnosis-title { font-weight: bold; color: #d97706; }
                .vital-signs { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin: 10px 0; }
                .vital-item { background: #f9fafb; padding: 8px; border-radius: 5px; text-align: center; }
                .vital-label { font-size: 11px; color: #6b7280; }
                .vital-value { font-weight: bold; color: #1f2937; }
                .medications { margin: 10px 0; }
                .med-tag { display: inline-block; background: #e0e7ff; padding: 3px 8px; border-radius: 12px; font-size: 11px; margin: 2px; }
                .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏥 National Vitality Eye</h1>
                <p>Patient Medical Records Report</p>
                <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="patient-info">
                <h3>Patient Information</h3>
                <div class="patient-info-grid">
                    <div class="info-item"><span class="info-label">Name:</span> ${patient.name}</div>
                    <div class="info-item"><span class="info-label">National ID:</span> ${patient.nationalId}</div>
                    <div class="info-item"><span class="info-label">Date of Birth:</span> ${formatDate(patient.dateOfBirth)}</div>
                    <div class="info-item"><span class="info-label">Gender:</span> ${patient.gender || 'N/A'}</div>
                    <div class="info-item"><span class="info-label">Province:</span> ${patient.province || 'N/A'}</div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Medical Records (${records.length} records)</div>
                ${records.length === 0 ? '<p>No medical records found.</p>' : records.map((record, index) => `
                    <div class="record-card">
                        <div class="record-header">
                            <span class="record-date">📅 ${formatDate(record.visitDate)}</span>
                            <span class="record-type">${record.visitType || 'Medical Visit'}</span>
                        </div>
                        
                        <div class="diagnosis">
                            <div class="diagnosis-title">Primary Diagnosis</div>
                            <div>${record.primaryDiagnosis?.name || record.diagnosis || 'Not recorded'}</div>
                            ${record.disease ? `<div style="margin-top: 5px;"><strong>Category:</strong> ${record.disease}</div>` : ''}
                        </div>
                        
                        ${record.secondaryDiagnoses?.length > 0 ? `
                            <div><strong>Secondary Diagnoses:</strong></div>
                            <ul style="margin-top: 5px;">
                                ${record.secondaryDiagnoses.map(d => `<li>${d.name}</li>`).join('')}
                            </ul>
                        ` : ''}
                        
                        ${record.symptoms?.length > 0 ? `
                            <div><strong>Symptoms:</strong></div>
                            <div style="margin-top: 5px;">
                                ${record.symptoms.map(s => `<span class="med-tag">${s}</span>`).join('')}
                            </div>
                        ` : ''}
                        
                        ${record.prescribedMedications?.length > 0 ? `
                            <div class="medications"><strong>Prescribed Medications:</strong></div>
                            <div>
                                ${record.prescribedMedications.map(m => `<span class="med-tag">💊 ${m}</span>`).join('')}
                            </div>
                        ` : ''}
                        
                        ${record.vitalSigns && Object.values(record.vitalSigns).some(v => v) ? `
                            <div><strong>Vital Signs:</strong></div>
                            <div class="vital-signs">
                                ${record.vitalSigns.temperature ? `<div class="vital-item"><div class="vital-label">Temperature</div><div class="vital-value">${record.vitalSigns.temperature}°C</div></div>` : ''}
                                ${record.vitalSigns.bloodPressure?.systolic ? `<div class="vital-item"><div class="vital-label">Blood Pressure</div><div class="vital-value">${record.vitalSigns.bloodPressure.systolic}/${record.vitalSigns.bloodPressure.diastolic}</div></div>` : ''}
                                ${record.vitalSigns.heartRate ? `<div class="vital-item"><div class="vital-label">Heart Rate</div><div class="vital-value">${record.vitalSigns.heartRate} bpm</div></div>` : ''}
                                ${record.vitalSigns.weight ? `<div class="vital-item"><div class="vital-label">Weight</div><div class="vital-value">${record.vitalSigns.weight} kg</div></div>` : ''}
                                ${record.vitalSigns.bmi ? `<div class="vital-item"><div class="vital-label">BMI</div><div class="vital-value">${record.vitalSigns.bmi}</div></div>` : ''}
                            </div>
                        ` : ''}
                        
                        ${record.treatmentPlan?.plan ? `
                            <div><strong>Treatment Plan:</strong></div>
                            <div style="margin-top: 5px;">${record.treatmentPlan.plan}</div>
                        ` : ''}
                        
                        ${record.dischargeInstructions ? `
                            <div style="margin-top: 10px; background: #dbeafe; padding: 8px; border-radius: 5px;">
                                <strong>📋 Discharge Instructions:</strong>
                                <div style="margin-top: 5px;">${record.dischargeInstructions}</div>
                            </div>
                        ` : ''}
                        
                        <div style="margin-top: 10px; font-size: 11px; color: #9ca3af;">
                            Hospital: ${record.hospital || 'Not recorded'} | Doctor: Dr. ${record.doctorName || 'Not recorded'}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="footer">
                <p>This is an official medical record from National Vitality Eye. For any discrepancies, please contact your healthcare provider.</p>
                <p>© ${new Date().getFullYear()} National Vitality Eye - AI-Powered Healthcare Intelligence</p>
            </div>
        </body>
        </html>
    `;
    
    // Temporarily add to DOM, render to canvas, then remove
    document.body.appendChild(element);
    
    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            logging: false,
            useCORS: true
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        pdf.save(`${patient.name.replace(/\s/g, '_')}_Medical_Records.pdf`);
    } finally {
        document.body.removeChild(element);
    }
};