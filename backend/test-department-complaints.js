require('dotenv').config();
const mongoose = require('mongoose');
const Complaint = require('./models/Complaint');

async function checkSanitationComplaints() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const complaints = await Complaint.find({
            category: { $in: ['Sanitation', 'Garbage'] }
        }).lean();

        console.log('Found complaints:', complaints.length);
        complaints.forEach(c => {
            console.log('Category:', c.category);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSanitationComplaints();