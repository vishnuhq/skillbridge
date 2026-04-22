/**
 * Monitoring Officer Dashboard
 *
 * Read-only view of programme-wide attendance data.
 * The assignment specifies: NO create, edit, or delete actions anywhere in the UI.
 * This component contains ZERO write actions — purely read-only.
 *
 * It reuses the same API endpoint as Programme Manager but renders
 * without any action buttons.
 */

import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const OfficerDashboard = ({ dbUser }) => {
  const [programme, setProgramme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/programme/summary')
      .then(({ data }) => setProgramme(data))
      .catch(() => setError('Failed to load programme data.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <div className="section">
        <h1>Monitoring Officer</h1>
        <p>Read-only programme-wide attendance view. Hello, {dbUser.name}.</p>
        <div className="alert alert-info" style={{ display: 'inline-flex', marginTop: '0.5rem' }}>
          👁 Read-only access — no actions available
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="muted">Loading...</p>}

      {programme && (
        <>
          <div className="grid-2 mb-2">
            <StatCard value={programme.totals.institutions} label="Institutions" />
            <StatCard value={programme.totals.batches} label="Batches" />
            <StatCard value={programme.totals.sessions} label="Sessions" />
          </div>

          <div className="card">
            <h2>Institution Overview</h2>
            {programme.summary.length === 0 ? (
              <p className="muted">No data available.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Institution</th>
                      <th>Batches</th>
                      <th>Sessions</th>
                      <th>Records</th>
                      <th>Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programme.summary.map((inst) => (
                      <tr key={inst.id}>
                        <td>{inst.name}</td>
                        <td>{inst.totalBatches}</td>
                        <td>{inst.totalSessions}</td>
                        <td>{inst.totalRecords}</td>
                        <td>
                          {inst.attendanceRate !== null ? (
                            <span
                              className={`badge ${
                                inst.attendanceRate >= 75
                                  ? 'badge-green'
                                  : inst.attendanceRate >= 50
                                    ? 'badge-yellow'
                                    : 'badge-red'
                              }`}
                            >
                              {inst.attendanceRate}%
                            </span>
                          ) : (
                            <span className="muted">No data</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ value, label }) => (
  <div className="card text-center">
    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{value}</div>
    <div className="muted">{label}</div>
  </div>
);

export default OfficerDashboard;
