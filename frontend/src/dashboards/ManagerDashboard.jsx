/**
 * Programme Manager Dashboard
 *
 * Features:
 *   - Programme-wide summary (all institutions)
 *   - Drill down into individual institution summaries
 */

import { Fragment, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const ManagerDashboard = () => {
  const [programme, setProgramme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedInst, setSelectedInst] = useState(null);
  const [instSummary, setInstSummary] = useState(null);
  const [instLoading, setInstLoading] = useState(false);

  useEffect(() => {
    api
      .get('/programme/summary')
      .then(({ data }) => setProgramme(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const drillDown = async (instId) => {
    if (selectedInst === instId) {
      setSelectedInst(null);
      setInstSummary(null);
      return;
    }
    setSelectedInst(instId);
    setInstLoading(true);
    try {
      const { data } = await api.get(`/institutions/${instId}/summary`);
      setInstSummary(data);
    } catch {
      setInstSummary(null);
    } finally {
      setInstLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="section">
        <h1>Programme Manager</h1>
        <p>Programme-wide attendance overview. Click an institution to drill down.</p>
      </div>

      {loading ? (
        <p className="muted">Loading...</p>
      ) : !programme ? (
        <div className="alert alert-error">Failed to load data.</div>
      ) : (
        <>
          {/* Totals summary row */}
          <div className="grid-2 mb-2">
            <div className="card text-center">
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                {programme.totals.institutions}
              </div>
              <div className="muted">Institutions</div>
            </div>
            <div className="card text-center">
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{programme.totals.batches}</div>
              <div className="muted">Batches</div>
            </div>
            <div className="card text-center">
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{programme.totals.sessions}</div>
              <div className="muted">Sessions</div>
            </div>
          </div>

          {/* Per-institution table */}
          <div className="card">
            <h2>Institutions</h2>
            {programme.summary.length === 0 ? (
              <p className="muted">No institutions in the programme yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Institution</th>
                      <th>Batches</th>
                      <th>Sessions</th>
                      <th>Attendance Rate</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programme.summary.map((inst) => (
                      <Fragment key={inst.id}>
                        <tr key={inst.id}>
                          <td>{inst.name}</td>
                          <td>{inst.totalBatches}</td>
                          <td>{inst.totalSessions}</td>
                          <td>
                            {inst.attendanceRate !== null ? (
                              <span className="badge badge-green">{inst.attendanceRate}%</span>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => drillDown(inst.id)}
                            >
                              {selectedInst === inst.id ? 'Hide' : 'View'}
                            </button>
                          </td>
                        </tr>
                        {selectedInst === inst.id && (
                          <tr>
                            <td colSpan={5} style={{ background: 'var(--bg)', padding: '1rem' }}>
                              {instLoading ? (
                                <p className="muted">Loading...</p>
                              ) : instSummary ? (
                                <InstitutionDetail data={instSummary} />
                              ) : (
                                <p className="muted">Failed to load.</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
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

const InstitutionDetail = ({ data }) => (
  <div>
    <h3>{data.institution.name} — Batch Breakdown</h3>
    {data.batches.length === 0 ? (
      <p className="muted">No batches.</p>
    ) : (
      <table>
        <thead>
          <tr>
            <th>Batch</th>
            <th>Students</th>
            <th>Sessions</th>
            <th>Attendance Rate</th>
          </tr>
        </thead>
        <tbody>
          {data.batches.map((b) => (
            <tr key={b.id}>
              <td>{b.name}</td>
              <td>{b.totalStudents}</td>
              <td>{b.totalSessions}</td>
              <td>
                {b.attendanceRate !== null ? (
                  <span className="badge badge-green">{b.attendanceRate}%</span>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export default ManagerDashboard;
