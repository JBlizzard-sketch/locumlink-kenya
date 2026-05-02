import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import specialtiesRouter from "./specialties";
import clinicsRouter from "./clinics";
import locumsRouter from "./locums";
import shiftsRouter from "./shifts";
import applicationsRouter from "./applications";
import bookingsRouter from "./bookings";
import paymentsRouter from "./payments";
import ratingsRouter from "./ratings";
import disputesRouter from "./disputes";
import notificationsRouter from "./notifications";
import analyticsRouter from "./analytics";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(specialtiesRouter);
router.use(clinicsRouter);
router.use(locumsRouter);
router.use(shiftsRouter);
router.use(applicationsRouter);
router.use(bookingsRouter);
router.use(paymentsRouter);
router.use(ratingsRouter);
router.use(disputesRouter);
router.use(notificationsRouter);
router.use(analyticsRouter);
router.use(adminRouter);

export default router;
