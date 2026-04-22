/**
 * Institution Dashboard
 *
 * Tabs:
 *   batches   — grid of all batches with trainer list + attendance summary toggle
 *   create    — create a new batch
 *   assign    — assign a trainer to a batch (uses GET /institutions/trainers)
 */

import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const InstitutionDashboard = ({ dbUser }) => {
  const [batches, setBatches] = useState([]);
  const [trainers, setTrainers] = useState([]); // all trainers in this institution
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('batches'); // 'batches' | 'create' | 'assign'
  const [error, setError] = useState('');

  // For inline summary panel
  const [summaryBatchId, setSummaryBatchId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchData = async () => {
    setError('');
    try {
      const [batchRes, trainerRes] = await Promise.all([
        api.get('/batches'),
        api.get('/institutions/trainers'),
      ]);
      setBatches(batchRes.data.batches ?? []);
      setTrainers(trainerRes.data.trainers ?? []);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to load institution data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const loadSummary = async (batchId) => {
    // Toggle off if same batch
    if (summaryBatchId === batchId) {
      setSummaryBatchId(null);
      setSummary(null);
      return;
    }

    setSummaryBatchId(batchId);
    setSummary(null);
    setSummaryLoading(true);

    try {
      const { data } = await api.get(`/batches/${batchId}/summary`);
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="section flex justify-between items-center">
        <div>
          <h1>Institution Dashboard</h1>
          <p>{dbUser.institution?.name ?? 'Your institution'}</p>
        </div>
        <div className="flex gap-1">
          {[
            { key: 'batches', label: 'Batches' },
            { key: 'create', label: '+ New Batch' },
            { key: 'assign', label: 'Assign Trainer' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Create Batch ──── */}
      {tab === 'create' && (
        <CreateBatchForm
          onCreated={async () => {
            await fetchData();
            setTab('batches');
          }}
        />
      )}

      {/* ── Assign Trainer ── */}
      {tab === 'assign' && (
        <AssignTrainerForm batches={batches} trainers={trainers} onAssigned={fetchData} />
      )}

      {/* ── Batch List ──── */}
      {tab === 'batches' &&
        (loading ? (
          <p className="muted">Loading...</p>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : batches.length === 0 ? (
          <div className="alert alert-info">No batches yet. Click "+ New Batch" to create one.</div>
        ) : (
          <div className="grid-2">
            {batches.map((b) => (
              <div key={b.id} className="card">
                <h3>{b.name}</h3>
                <p
                  style={{ margin: '0.2rem 0 0.6rem', fontSize: '0.875rem', color: 'var(--muted)' }}
                >
                  {b._count?.students ?? 0} students · {b._count?.sessions ?? 0} sessions
                </p>

                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                  <strong>Trainers:</strong>{' '}
                  {(b.trainers?.length ?? 0) === 0
                    ? 'None assigned yet'
                    : b.trainers
                        .map((t) => t.trainer?.name)
                        .filter(Boolean)
                        .join(', ')}
                </div>

                <button className="btn btn-ghost btn-sm" onClick={() => loadSummary(b.id)}>
                  {summaryBatchId === b.id ? 'Hide Summary' : 'View Summary'}
                </button>

                {summaryBatchId === b.id && (
                  <div className="mt-2">
                    {summaryLoading ? (
                      <p className="muted" style={{ margin: 0 }}>
                        Loading summary...
                      </p>
                    ) : summary ? (
                      <BatchSummaryPanel summary={summary} />
                    ) : (
                      <p className="muted" style={{ margin: 0 }}>
                        No sessions yet — create sessions to see attendance data.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
};

// Create Batch Form

const CreateBatchForm = ({ onCreated }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/batches', { name: name.trim() });
      onCreated(data.batch);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to create batch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card mb-2" style={{ maxWidth: 440 }}>
      <h2>Create Batch</h2>
      {error && <div className="alert alert-error mb-2">{error}</div>}
      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label>Batch name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Web Dev Cohort A"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create Batch'}
        </button>
      </form>
    </div>
  );
};

// Assign Trainer Form

const AssignTrainerForm = ({ batches, trainers, onAssigned }) => {
  const [batchId, setBatchId] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post(`/batches/${batchId}/trainers`, { trainerId });
      setSuccess('Trainer assigned successfully!');
      setBatchId('');
      setTrainerId('');
      onAssigned(); // refresh batch list so trainer appears
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to assign trainer.');
    } finally {
      setLoading(false);
    }
  };

  if (trainers.length === 0) {
    return (
      <div className="alert alert-info">
        No trainers in your institution yet. Trainers need to sign up and select your institution
        during onboarding.
      </div>
    );
  }

  if (batches.length === 0) {
    return <div className="alert alert-info">Create a batch first before assigning trainers.</div>;
  }

  return (
    <div className="card mb-2" style={{ maxWidth: 440 }}>
      <h2>Assign Trainer to Batch</h2>
      <p>Select a batch and a trainer from your institution.</p>

      {error && <div className="alert alert-error mb-2">{error}</div>}
      {success && <div className="alert alert-success mb-2">{success}</div>}

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label>Batch</label>
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)} required>
            <option value="">Select a batch</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Trainer</label>
          <select value={trainerId} onChange={(e) => setTrainerId(e.target.value)} required>
            <option value="">Select a trainer</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !batchId || !trainerId}
        >
          {loading ? 'Assigning...' : 'Assign Trainer'}
        </button>
      </form>
    </div>
  );
};

// Batch Summary Panel

const BatchSummaryPanel = ({ summary }) => (
  <div>
    <hr className="divider" />
    <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
      <strong>{summary.totalSessions}</strong> sessions · <strong>{summary.totalStudents}</strong>{' '}
      students enrolled
    </p>
    {summary.sessions.length === 0 ? (
      <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
        No sessions yet.
      </p>
    ) : (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Session</th>
              <th>Date</th>
              <th>Present</th>
              <th>Late</th>
              <th>Absent</th>
            </tr>
          </thead>
          <tbody>
            {summary.sessions.map((s) => (
              <tr key={s.id}>
                <td>{s.title}</td>
                <td>{s.date}</td>
                <td>
                  <span className="badge badge-green">{s.present}</span>
                </td>
                <td>
                  <span className="badge badge-yellow">{s.late}</span>
                </td>
                <td>
                  <span className="badge badge-red">{s.absent}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default InstitutionDashboard;
