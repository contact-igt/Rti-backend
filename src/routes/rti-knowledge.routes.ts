import { Router } from 'express';
import { askRTIKnowledge } from '../controllers/rti-knowledge.controller.js';

export const rtiKnowledgeRouter = Router();
rtiKnowledgeRouter.post('/knowledge/ask', askRTIKnowledge);
