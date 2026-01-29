const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: { type: String, required: true, enum: ['Nursery', 'LKG', 'UKG'] },
  sections: [{ type: String, enum: ['A', 'B', 'C', 'D'] }],
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  capacity: { type: Number, default: 30 },
  room: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Class', classSchema);