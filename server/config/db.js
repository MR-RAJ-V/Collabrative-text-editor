const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/collaborative-editor';

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    const hasMultipleAtSigns = (mongoUri.match(/@/g) || []).length > 1;
    const hint = hasMultipleAtSigns
      ? ' Hint: if your MongoDB password contains "@", encode it as "%40" in MONGO_URI.'
      : '';

    throw new Error(`MongoDB connection failed: ${error.message}.${hint}`);
  }
};

module.exports = connectDB;
