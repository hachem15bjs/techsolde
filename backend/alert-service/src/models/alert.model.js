import mongoose from 'mongoose';

export const ALERT_TYPES = [
  'promotion_expiring',
  'promotion_expired_active',
  'high_discount',
  'coupon_usage',
  'coupon_expiring',
  'custom'
];
export const SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const STATUSES = ['new', 'acknowledged', 'resolved'];
export const SOURCES = ['manual', 'promotion', 'coupon'];
export const SEVERITY_RANK = { low: 1, medium: 2, high: 3, critical: 4 };

const alertSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, default: '', maxlength: 1000 },
    type: { type: String, required: true, enum: ALERT_TYPES },
    severity: { type: String, required: true, enum: SEVERITIES },
    // Numeric copy of the severity so MongoDB can sort "critical first".
    severityRank: { type: Number, min: 1, max: 4 },
    status: { type: String, enum: STATUSES, default: 'new' },
    source: { type: String, required: true, enum: SOURCES },

    // Optional link to a promotion or coupon in the Promotion Service.
    relatedEntityType: { type: String, enum: ['promotion', 'coupon', null], default: null },
    relatedEntityId: { type: String, default: null },
    relatedEntityLabel: { type: String, trim: true, default: '', maxlength: 120 },

    notes: { type: String, trim: true, default: '', maxlength: 1000 },

    // Detection metadata (automatic alerts only).
    // ruleKey = "<rule type>:<promotion or coupon id>" identifies one condition on one record.
    ruleKey: { type: String, default: null },
    // fingerprint = the values that triggered the alert, used to avoid re-raising an alert
    // that an administrator already resolved while nothing important changed.
    fingerprint: { type: String, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastDetectedAt: { type: Date, default: null },

    // true while status is "new" or "acknowledged"; kept in sync by the hook below.
    isOpen: { type: Boolean, default: true },
    acknowledgedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    autoResolved: { type: Boolean, default: false },
    resolutionReason: { type: String, trim: true, default: '', maxlength: 300 }
  },
  { timestamps: true, minimize: false }
);

alertSchema.pre('validate', function syncDerivedFields(next) {
  this.severityRank = SEVERITY_RANK[this.severity];
  this.isOpen = this.status !== 'resolved';

  if (this.source === 'manual' && this.type !== 'custom') {
    this.invalidate('type', 'Manual alerts must use the "custom" type.');
  }
  if (this.source !== 'manual' && !this.ruleKey) {
    this.invalidate('ruleKey', 'Automatic alerts need a rule key.');
  }
  if (this.relatedEntityType && !mongoose.isValidObjectId(this.relatedEntityId)) {
    this.invalidate('relatedEntityId', 'A related promotion or coupon needs a valid ID.');
  }
  next();
});

// MongoDB itself guarantees that only ONE open alert can exist for the same rule + record,
// even if two scans run at the same moment.
alertSchema.index(
  { ruleKey: 1 },
  { unique: true, partialFilterExpression: { isOpen: true, ruleKey: { $type: 'string' } } }
);
alertSchema.index({ status: 1, severityRank: -1, createdAt: -1 });

export const Alert = mongoose.model('Alert', alertSchema);
