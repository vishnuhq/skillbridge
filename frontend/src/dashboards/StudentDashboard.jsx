/**
 * Student Dashboard
 *
 * Features:
 *   - Lists all sessions across batches the student is enrolled in
 *   - Shows whether attendance has already been marked for each session
 *   - Button to mark attendance (PRESENT by default)
 */

import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const isSessionExpired = (session) => {
  const endAt = new Date(`${session.date}T${session.endTime}:00`);
  if (Number.isNaN(endAt.getTime())) return false;
  return new Date() >= endAt;
};

const isSessionNotStarted = (session) => {
  const startAt = new Date(`${session.date}T${session.startTime}:00`);
  if (Number.isNaN(startAt.getTime())) return false;
  return new Date() < startAt;
};

const StudentDashboard = ({ dbUser }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null); // sessionId being marked
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSessions = async () => {
    try {
      const { data } = await api.get('/sessions');
      setSessions(data.sessions);
    } catch {
      setError('Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const markAttendance = async (sessionId) => {
    setMarking(sessionId);
    setError('');
    setSuccess('');
    try {
      await api.post('/attendance/mark', { sessionId });
      setSuccess('Attendance marked!');
      // Refresh to update the UI
      fetchSessions();
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to mark attendance.');
    } finally {
      setMarking(null);
    }
  };

  return (
    <div className="container">
      <div className="section">
        <h1>My Sessions</h1>
        <p>Welcome, {dbUser.name}. Mark your attendance for each session below.</p>
      </div>

      {error && <div className="alert alert-error mb-2">{error}</div>}
      {success && <div className="alert alert-success mb-2">{success}</div>}

      {loading ? (
        <p className="muted">Loading sessions...</p>
      ) : sessions.length === 0 ? (
        <div className="alert alert-info">
          You are not enrolled in any batch yet. Ask your trainer for an invite link.
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Batch</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Your Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const attended = s.attendance?.[0]; // My attendance record (if any)
                  const isExpired = isSessionExpired(s);
                  const notStarted = isSessionNotStarted(s);
                  return (
                    <tr key={s.id}>
                      <td>{s.title}</td>
                      <td>{s.batch.name}</td>
                      <td>{s.date}</td>
                      <td>
                        {s.startTime} – {s.endTime}
                      </td>
                      <td>
                        {attended ? (
                          <span
                            className={`badge ${
                              attended.status === 'PRESENT'
                                ? 'badge-green'
                                : attended.status === 'LATE'
                                  ? 'badge-yellow'
                                  : 'badge-red'
                            }`}
                          >
                            {attended.status}
                          </span>
                        ) : (
                          <span className="muted">Not marked</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={!!attended || marking === s.id || isExpired || notStarted}
                          onClick={() => markAttendance(s.id)}
                        >
                          {marking === s.id
                            ? '...'
                            : attended
                              ? 'Done'
                              : notStarted
                                ? 'Not Started'
                                : isExpired
                                  ? 'Closed'
                                  : 'Mark Present'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
