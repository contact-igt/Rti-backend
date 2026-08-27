import { Router } from 'express';
import { recommendAuthority } from '../controllers/rti-authority.controller.js';

export const rtiAuthorityRouter = Router();
rtiAuthorityRouter.post('/authority', recommendAuthority);
