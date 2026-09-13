import mongoose from 'mongoose';
import dotenv from 'dotenv';

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
};

export default connectDB;