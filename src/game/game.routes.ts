import { Router } from 'express';
import { GameController } from './game.controller.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { generateQuestionsSchema, addPointsSchema, addTokensSchema, addBothSchema } from './game.validation.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();

// Endpoint to generate game questions via Groq AI
// We protect this route to authenticated users using `requireAuth`. If you want it public, you can remove `requireAuth`
router.post(
    '/generate-questions',
    authMiddleware,
    validate(generateQuestionsSchema),
    GameController.generateQuestionsHandler
);

router.post(
    '/add-to-user-points',
    authMiddleware,
    validate(addPointsSchema),
    GameController.addToUserPointsHandler
);

router.post(
    '/add-to-user-tokens',
    authMiddleware,
    validate(addTokensSchema),
    GameController.addToUserTokensHandler
);

router.post(
    '/add-to-user-both',
    authMiddleware,
    validate(addBothSchema),
    GameController.addToUserPointsAndTokensHandler
);

export default router;
