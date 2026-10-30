import { CircleAlert, CircleCheck, Clock3, LoaderCircle, Radar, ScanSearch, Timer } from 'lucide-react';
import { formatDateTime, timeAgo } from '../utils/alert-format.js';

export default function DetectionPanel({ status, statusError, scanning, scanError, onScan }) {
  const lastScan = status?.lastScan;
  const lastSuccess = status?.lastSuccessfulScan;
  const enabledRules = status?.rules.filter((rule) => rule.enabled).length ?? 0;

  return (
    <section className="detection-panel">
      <div className="detection-glow" />
      <div className="detection-head">
        <span className={`detection-radar ${scanning ? 'detection-radar-active' : ''}`}><Radar size={24} strokeWidth={1.6} /></span>
        <div>
          <span className="detection-eyebrow">RULE-BASED INTELLIGENCE</span>
          <h3>Smart Alert Detection</h3>
          <p>Reads live promotions and coupons from the Promotion Service, evaluates each rule, and saves what needs attention.</p>
        </div>
        <button className="button button-white scan-button" onClick={onScan} disabled={scanning || !status}>
          {scanning ? <LoaderCircle size={16} className="spin" /> : <ScanSearch size={16} />}
          {scanning ? 'Scanning…' : 'Scan Now'}
        </button>
      </div>

      {statusError && <div className="detection-error"><CircleAlert size={15} /> {statusError}</div>}
      {scanError && !statusError && <div className="detection-error"><CircleAlert size={15} /> Last scan failed: {scanError}</div>}

      <div className="detection-metrics">
        <div><span><Clock3 size={13} /> Last scan</span><strong>{lastScan ? timeAgo(lastScan.finishedAt) : 'Never'}</strong><small>{lastScan ? `${formatDateTime(lastScan.finishedAt)} · ${lastScan.trigger}` : 'Click “Scan Now” to run the rules'}</small></div>
        <div><span><ScanSearch size={13} /> Conditions detected</span><strong>{lastSuccess ? lastSuccess.conditionsFound : '—'}</strong><small>{lastSuccess ? `${lastSuccess.promotionsChecked} promotions · ${lastSuccess.couponsChecked} coupons checked` : 'No successful scan yet'}</small></div>
        <div><span><CircleCheck size={13} /> Last result</span><strong>{lastSuccess ? `+${lastSuccess.created}` : '—'}</strong><small>{lastSuccess ? `new · ${lastSuccess.updated} updated · ${lastSuccess.autoResolved} auto-resolved` : '—'}</small></div>
        <div><span><Timer size={13} /> Automatic scan</span><strong>{status ? (status.autoScanIntervalMinutes > 0 ? `${status.autoScanIntervalMinutes} min` : 'Off') : '—'}</strong><small>{status?.autoScanIntervalMinutes > 0 ? 'Interval set by the Alert Service' : 'Manual scans only'}</small></div>
      </div>

      <div className="detection-rules">
        <span className="detection-rules-title">Detection rules · {enabledRules} of {status?.rules.length ?? 0} enabled</span>
        <ul>
          {(status?.rules ?? []).map((rule) => (
            <li key={rule.type} className={rule.enabled ? '' : 'rule-disabled'} title={rule.description}>
              <i />
              <div><strong>{rule.label}</strong><small>{rule.description}</small></div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
