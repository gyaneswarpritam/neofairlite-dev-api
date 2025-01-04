var mongoose = require("mongoose");

var exhibitorChildSchema = new mongoose.Schema(
    {
        exhibitor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exhibitor"
        },
        name: { type: String, required: true },
        email: { type: String, required: true },
        companyName: { type: String, required: true },
        companyAddress: { type: String, required: true },
        phone: { type: String, required: true },
        password: { type: String, required: true },
        loggedInTime: { type: String, default: '' },
        loggedInIP: { type: String, default: '' },
        deleted: { type: Boolean, default: false },
        active: { type: Boolean, default: false },
        reject: { type: Boolean, default: false },
        blocked: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

exhibitorChildSchema.index({ email: 1, delete: 1 }, { unique: true });
exhibitorChildSchema.index({ phone: 1 });
exhibitorChildSchema.index({ name: 1 });

module.exports = mongoose.model("ExhibitorChildUser", exhibitorChildSchema);
