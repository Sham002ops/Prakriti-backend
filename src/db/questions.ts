import mongoose, { Schema, model, Document } from 'mongoose';

export type Dosha = 'Vata' | 'Pitta' | 'Kapha';
export type QuestionCategory = 'Darshan' | 'Prashna-Functional' | 'Prashna-Psychological';

export interface IOption {
label: string;
dosha: Dosha;
weight?: number; // optional
}

export interface IQuestion extends Document {
questionId: number; // stable numeric id for client ordering
parameterLabel: string; // e.g., 'Shariram (Body Structure)'
category: QuestionCategory; // 'Darshan' | 'Prashna-Functional' | 'Prashna-Psychological'
question: string; // prompt shown to the patient
options: IOption[]; // list of options
active: boolean; // enable/disable question
order: number; // order inside category
updatedAt: Date;
createdAt: Date;
}

const OptionSchema = new Schema<IOption>({
label: { type: String, required: true },
dosha: { type: String, enum: ['Vata','Pitta','Kapha'], required: true },
weight: { type: Number, default: 1 }
},{ _id:false });

const QuestionSchema = new Schema<IQuestion>({
questionId: { type: Number, required: true, unique: true, index: true },
parameterLabel: { type: String, required: true },
category: { type: String, enum: ['Darshan','Prashna-Functional','Prashna-Psychological'], required: true, index: true },
question: { type: String, required: true },
options: { type: [OptionSchema], default: [] },
active: { type: Boolean, default: true },
order: { type: Number, required: true, index: true }
},{ timestamps: true });

QuestionSchema.index({ category: 1, order: 1 }, { unique: true });

export const QuestionModel = model<IQuestion>('Question', QuestionSchema);