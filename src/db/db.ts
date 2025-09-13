import { link } from 'fs';
import mongoose, {model, Model, Schema} from 'mongoose'
import { title } from 'process';
import { string } from 'zod';

  
mongoose.connect(process.env.MONGO_URL!);
  

const UserSchema = new Schema({
  username: { type: String, unique: true },
  password: String,
  email: String,
});

const ChatSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: String, required: true },
  answer: { type: String }, // Can be updated after answer is generated
  timestamp: { type: Date, default: Date.now }
});

export const ChatModel = model('Chat', ChatSchema);



export const UserModel = model("User", UserSchema );


