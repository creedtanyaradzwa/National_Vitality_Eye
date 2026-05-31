const mongoose = require('mongoose');
require('dotenv').config();
const MedicalRecord = require('./models/MedicalRecord');

async function getTopSymptoms() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const symptoms = await MedicalRecord.aggregate([
            { $unwind: '$symptoms' },
            { $group: { _id: '$symptoms', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 60 }
        ]);
        console.log('SYMPTOMS_START');
        console.log(JSON.stringify(symptoms.map(s => s._id), null, 2));
        console.log('SYMPTOMS_END');
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

getTopSymptoms();
