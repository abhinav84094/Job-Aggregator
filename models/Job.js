import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
    {
        jobKey: {
            type: String,
            required: true,
            unique: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },

        company: {
            type: String,
            required: true,
            trim: true,
        },

        location: {
            type: String,
            required: true,
            trim: true,
        },

        platform: {
            type: String,
            enum: [
                "linkedin",
                "naukri",
                "indeed",
                "internshala",
                "foundit",
            ],
            default: "linkedin",
        },

        jobUrl: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },

        description: {
            type: String,
            default: "",
        },

        requiredSkills: [
            {
                type: String,
                trim: true,
            },
        ],

        requiredExperienceMonths: {
            type: Number,
            default: 0,
        },

        postedDate: {
            type: Date,
            required: true,
        },

        scrapedAt: {
            type: Date,
            default: Date.now,
        },

        employmentType: {
            type: String,
            enum: ['full-time', 'part-time', 'contract', 'internship'],
            default: 'full-time',
        },

        isRemote: {
            type: Boolean,
            default: false,
        },

        status: {
            type: String,
            enum: ["active", "expired"],
            default: "active",
        },

        expiredAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

jobSchema.index(
    {
        platform: 1,
        jobUrl: 1,
    },
    {
        unique: true,
    }
);

jobSchema.index({
    postedDate: -1,
});

jobSchema.index({
    requiredSkills: 1,
});

jobSchema.index({
    status: 1,
});
jobSchema.index(
    { platform: 1, jobKey: 1 },
    { unique: true }
);



export default mongoose.model("Job", jobSchema);