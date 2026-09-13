import cron from "node-cron";
import Job from "../models/Job.js";

const ACTIVE_DAYS = Number(process.env.EXPIRE_JOB_DAYS) || 4;
const DELETE_AFTER_EXPIRED_DAYS = 30;

/**
 * Mark jobs older than 10 days as expired
 */
const expireOldJobs = async () => {

    console.log("====================================");
    console.log("Starting Job Expiry...");
    console.log("====================================");

    try {

        const DaysAgo = new Date();

        DaysAgo.setDate(
            DaysAgo.getDate() - ACTIVE_DAYS
        );

        const result = await Job.updateMany(

            {
                status: "active",

                postedDate: {
                    $lt: DaysAgo,
                },

            },

            {
                $set: {

                    status: "expired",

                    expiredAt: new Date(),

                },

            }

        );

        console.log(
            `Expired Jobs : ${result.modifiedCount}`
        );

    }

    catch (err) {

        console.log(err.message);

    }

    console.log("====================================");
    console.log("Job Expiry Finished");
    console.log("====================================");

};

/**
 * Delete expired jobs after 30 days
 */
const deleteExpiredJobs = async () => {

    console.log("====================================");
    console.log("Deleting Old Expired Jobs...");
    console.log("====================================");

    try {

        const thirtyDaysAgo = new Date();

        thirtyDaysAgo.setDate(
            thirtyDaysAgo.getDate() - DELETE_AFTER_EXPIRED_DAYS
        );

        const result = await Job.deleteMany({

            status: "expired",

            expiredAt: {

                $lt: thirtyDaysAgo,

            },

        });

        console.log(
            `Deleted Jobs : ${result.deletedCount}`
        );

    }

    catch (err) {

        console.log(err.message);

    }

    console.log("====================================");
    console.log("Delete Finished");
    console.log("====================================");

};

/**
 * Start Cleanup Scheduler
 */
export const startCleanupCron = () => {

    console.log("Cleanup Scheduler Started");

    /**
     * Every day at 2:00 AM
     * Expire jobs older than 4 days
     */
    cron.schedule(

        "30 20 * * *",

        async () => {

            await expireOldJobs();

        }

    );

    /**
     * Every day at 2:15 AM
     * Delete expired jobs older than 30 days
     */
    cron.schedule(

        "15 8 * * *",

        async () => {

            await deleteExpiredJobs();

        }

    );

};