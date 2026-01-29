// Create src/routes/questions.ts

import { Router, Request, Response } from 'express';
import { QuestionModel } from '../../db/questions';

export const questionsRouter = Router();

// GET /api/questions -> list active questions (optional category filter)
    questionsRouter.get('/', async (req: Request, res: Response) => {
        try {
        const { category } = req.query as { category?: string };
        const filter: any = { active: true };
        if (category) filter.category = category;


        const items = await QuestionModel.find(filter)
        .sort({ category: 1, order: 1, questionId: 1 })
        .lean();

        res.json({ items });
        } catch {
        res.status(500).json({ message: 'failed_to_list_questions' });
        }
        });

        // GET /api/questions/:id -> fetch by questionId
    questionsRouter.get('/:id', async (req: Request, res: Response) => {
        try {
        const id = Number(req.params.id);
        const item = await QuestionModel.findOne({ questionId: id }).lean();
        if (!item){
            res.status(404).json({ message: 'not_found' });
            return;
        }
        res.json({ item });
        } catch {
        res.status(500).json({ message: 'failed_to_get_question' });
        }
        });

        // Minimal admin endpoints (protect later with auth)
        // POST /api/questions -> create question
    questionsRouter.post('/', async (req: Request, res: Response) => {
        try {
        const doc = await QuestionModel.create(req.body);
        res.status(201).json({ item: doc });
        } catch (err) {
        res.status(400).json({ message: 'failed_to_create', error: (err as Error).message });
        }
        });

        // PUT /api/questions/:id -> update by questionId
    questionsRouter.put('/:id', async (req: Request, res: Response) => {
        try {
        const id = Number(req.params.id);
        const updated = await QuestionModel.findOneAndUpdate({ questionId: id }, req.body, { new: true });
        if (!updated){
            res.status(404).json({ message: 'not_found' });
            return;
        }
        res.json({ item: updated });
        } catch (err) {
        res.status(400).json({ message: 'failed_to_update', error: (err as Error).message });
        }
        });

        // DELETE /api/questions/:id -> soft delete (active=false)
    questionsRouter.delete('/:id', async (req: Request, res: Response) => {
        try {
        const id = Number(req.params.id);
        const updated = await QuestionModel.findOneAndUpdate({ questionId: id }, { active: false }, { new: true });
        if (!updated) {
            res.status(404).json({ message: 'not_found' });
            return;
        }
        res.json({ item: updated });
        } catch (err) {
        res.status(400).json({ message: 'failed_to_delete', error: (err as Error).message });
        }
    });