/**
 * Trainer Dashboard
 *
 * Tabs:
 *   sessions   — view all your sessions with expandable attendance detail
 *   create     — create a new session for an assigned batch
 *   batch      — create a new batch (auto-assigns you to it)
 *   invite     — generate an invite link for students
 */

import { Fragment, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const TrainerDashboard = ({ dbUser }) => {
  const [sessions, setSessions] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('sessions');

  const fetchAll = async () => {
    try {
      const [sessRes, batchRes] = await Promise.all([api.get('/sessions'), api.get('/batches')]);
      setSessions(sessRes.data.sessions);
      setBatches(batchRes.data.batches);
    } catch {
      // per-tab fallbacks handle empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading)
    return (
      <div className="container">
        <p className="muted">Loading...</p>
      </div>
    );

  const TABS = [
    { key: 'sessions', label: 'Sessions' },
    { key: 'create', label: '+ New Session' },
    { key: 'batch', label: '+ New Batch' },
    { key: 'invite', label: 'Invite Link' },
  ];

  return (
    <div className="container">
      <div className="section flex justify-between items-center">
        <div>
          <h1>Trainer Dashboard</h1>
          <p>Hello, {dbUser.name}. Manage your sessions and students.</p>
        </div>
        <div className="flex gap-1">
          {TABS.map(({ key, label }) => (
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

      {tab === 'sessions' && <SessionList sessions={sessions} />}

      {tab === 'create' && (
        <CreateSessionForm
          batches={batches}
          onCreated={async () => {
            await fetchAll();
            setTab('sessions');
          }}
        />
      )}

      {tab === 'batch' && (
        <CreateBatchForm
          onCreated={(b) => {
            setBatches((prev) => [b, ...prev]);
            setTab('invite'); // natural next step: generate invite for new batch
          }}
        />
      )}

      {tab === 'invite' && <InviteGenerator batches={batches} />}
    </div>
  );
};

// Session List

const SessionList = ({ sessions }) => {
  const [attendanceMap, setAttendanceMap] = useState({});
  const [openId, setOpenId] = useState(null);
  const [fetchingId, setFetchingId] = useState(null);

  const toggleAttendance = async (sessionId) => {
    if (openId === sessionId) {
      setOpenId(null);
      return;
    }
    setOpenId(sessionId);
    if (attendanceMap[sessionId]) return; // already fetched

    setFetchingId(sessionId);
    try {
      const { data } = await api.get(`/sessions/${sessionId}/attendance`);
      setAttendanceMap((prev) => ({ ...prev, [sessionId]: data }));
    } catch {
      // UI shows fallback message
    } finally {
      setFetchingId(null);
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="alert alert-info">
        No sessions yet. Click "+ New Session" to create one. You need to be assigned to a batch
        first — create a batch with "+ New Batch" or ask your Institution Admin.
      </div>
    );
  }

  return (
    <div className="section">
      <h2>Your Sessions</h2>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Batch</th>
                <th>Date</th>
                <th>Time</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <Fragment key={s.id}>
                  <tr>
                    <td>{s.title}</td>
                    <td>{s.batch.name}</td>
                    <td>{s.date}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {s.startTime} – {s.endTime}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => toggleAttendance(s.id)}
                        disabled={fetchingId === s.id}
                      >
                        {fetchingId === s.id
                          ? '...'
                          : openId === s.id
                            ? 'Hide'
                            : `View (${s._count.attendance})`}
                      </button>
                    </td>
                  </tr>

                  {openId === s.id && (
                    <tr>
                      <td colSpan={5} style={{ background: 'var(--bg)', padding: '1rem' }}>
                        <AttendanceDetail data={attendanceMap[s.id]} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AttendanceDetail = ({ data }) => {
  if (!data) {
    return (
      <p className="muted" style={{ margin: 0 }}>
        Loading attendance data...
      </p>
    );
  }

  const { stats, session } = data;
  return (
    <div>
      <div className="flex gap-2 mb-2" style={{ fontSize: '0.85rem' }}>
        <span className="badge badge-green">Present: {stats.present}</span>
        <span className="badge badge-yellow">Late: {stats.late}</span>
        <span className="badge badge-red">Absent: {stats.absent}</span>
      </div>

      {session.attendance.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          No attendance marked yet.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Status</th>
              <th>Marked at</th>
            </tr>
          </thead>
          <tbody>
            {session.attendance.map((a) => (
              <tr key={a.id}>
                <td>{a.student.name}</td>
                <td>
                  <span
                    className={`badge ${
                      a.status === 'PRESENT'
                        ? 'badge-green'
                        : a.status === 'LATE'
                          ? 'badge-yellow'
                          : 'badge-red'
                    }`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="muted">{new Date(a.markedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Create Session Form

const CreateSessionForm = ({ batches, onCreated }) => {
  const [form, setForm] = useState({
    batchId: '',
    title: '',
    date: '',
    startTime: '',
    endTime: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/sessions', form);
      onCreated(data.session);
    } catch (err) {
      const fields = err.response?.data?.fields;
      setError(
        fields
          ? Object.values(fields).flat().join(' ')
          : (err.response?.data?.error ?? 'Failed to create session.')
      );
    } finally {
      setLoading(false);
    }
  };

  if (batches.length === 0) {
    return (
      <div className="alert alert-info">
        You have no batches assigned. Create one with "+ New Batch", or ask your Institution Admin
        to assign you to an existing batch.
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2>Create Session</h2>
      {error && <div className="alert alert-error mb-2">{error}</div>}
      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label>Batch</label>
          <select value={form.batchId} onChange={setField('batchId')} required>
            <option value="">Select a batch</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Session title</label>
          <input
            type="text"
            value={form.title}
            onChange={setField('title')}
            placeholder="e.g. Introduction to React Hooks"
            required
          />
        </div>
        <div className="field">
          <label>Date</label>
          <input type="date" value={form.date} onChange={setField('date')} required />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Start time</label>
            <input type="time" value={form.startTime} onChange={setField('startTime')} required />
          </div>
          <div className="field">
            <label>End time</label>
            <input type="time" value={form.endTime} onChange={setField('endTime')} required />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create Session'}
        </button>
      </form>
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
      // POST /batches auto-assigns this trainer to the new batch
      const { data } = await api.post('/batches', { name: name.trim() });
      onCreated(data.batch);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to create batch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 440 }}>
      <h2>Create Batch</h2>
      <p>
        You will be automatically assigned to this batch, so you can create sessions and generate
        invite links for it right away.
      </p>
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

// Invite Generator

const InviteGenerator = ({ batches }) => {
  const [batchId, setBatchId] = useState('');
  const [type, setType] = useState('ONE_TIME');
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInviteUrl('');
    try {
      const { data } = await api.post(`/batches/${batchId}/invite`, { type });
      setInviteUrl(data.inviteUrl);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to generate invite link.');
    } finally {
      setLoading(false);
    }
  };

  if (batches.length === 0) {
    return (
      <div className="alert alert-info">
        No batches found. Create a batch first or ask your Institution Admin to assign you.
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2>Generate Invite Link</h2>
      <p>Share this link with students so they can self-enrol into your batch.</p>

      {error && <div className="alert alert-error mb-2">{error}</div>}

      <form className="form" onSubmit={handleGenerate}>
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
          <label>Link type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="ONE_TIME">One-time (single student only)</option>
            <option value="REUSABLE">Reusable (multiple students)</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading || !batchId}>
          {loading ? 'Generating...' : 'Generate Link'}
        </button>
      </form>

      {inviteUrl && (
        <div className="alert alert-success mt-2">
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Invite link ready!</p>
          {/*
           * IMPORTANT: plain <a> tag, NOT React Router <Link>.
           * <Link> only handles in-app relative paths.
           * inviteUrl is a full absolute URL: https://yourapp.vercel.app/join?token=...
           */}
          <a
            href={inviteUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              wordBreak: 'break-all',
              fontSize: '0.8rem',
              display: 'block',
              marginBottom: '0.5rem',
            }}
          >
            {inviteUrl}
          </a>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigator.clipboard.writeText(inviteUrl)}
          >
            Copy to clipboard
          </button>
        </div>
      )}
    </div>
  );
};

export default TrainerDashboard;
