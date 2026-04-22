/**
 * JoinBatchPrompt
 * Shown when a student navigates to /join?token=xxx&batchId=yyy
 * after being sent an invite link by their trainer.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

const JoinBatchPrompt = ({ token, batchId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleJoin = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/batches/${batchId}/join`, { token });
      setMessage(data.message ?? 'Joined successfully!');
      // Redirect to clean dashboard after 2s
      setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to join batch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 420 }}>
        <h2>Join Batch</h2>
        <p>You were invited to join a batch. Click below to confirm.</p>

        {message && <div className="alert alert-success">{message} Redirecting...</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {!message && (
          <div className="flex gap-1 mt-2">
            <button className="btn btn-primary" onClick={handleJoin} disabled={loading}>
              {loading ? 'Joining...' : 'Join Batch'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => navigate('/dashboard', { replace: true })}
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinBatchPrompt;
