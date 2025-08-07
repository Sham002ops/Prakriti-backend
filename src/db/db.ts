import { link } from 'fs';
import mongoose, {model, Model, Schema} from 'mongoose'
import { title } from 'process';
import { string } from 'zod';

  
mongoose.connect(process.env.MONGO_URL!);
  

const UserSchema = new Schema({
    username : {type: String, unique: true},
    password : String,
    email: String
})


export const UserModel = model("User", UserSchema );


