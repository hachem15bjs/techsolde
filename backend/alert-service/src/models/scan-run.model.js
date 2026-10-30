import mongoose from 'mongoose';

// One document per detection scan, so the dashboard can show the real last scan.
const scanRunSchema = new mongoose.Schema(
  {
    trigger: { type: String, enum: ['manual', 'automatic'], required: true },
    status: { type: String, enum: ['success', 'failed'], required: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
    durationMs: { type: Number, default: 0 },
    promotionsChecked: { type: Number, default: 0 },
    couponsChecked: { type: Number, default: 0 },
    conditionsFound: { type: Number, default: 0 },
    created: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    unchanged: { type: Number, default: 0 },
    suppressed: { type: Number, default: 0 },
    autoResolved: { type: Number, default: 0 },
    error: { type: String, default: '' }
  },
  { timestamps: true }
);

export const ScanRun = mongoose.model('ScanRun', scanRunSchema);
