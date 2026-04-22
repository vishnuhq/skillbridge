/**
 * Onboarding Page
 *
 * Shown once after Clerk sign-up before the user has a DB record.
 * Collects: name, role, and institution info.
 * On submit → POST /auth/sync → creates DB user → redirects to dashboard.
 *
 * NAME HANDLING:
 *   Clerk's SignUp form collects firstName and lastName separately.
 *   user.fullName is a computed getter: `${firstName} ${lastName}`.trim()
 *   It can be null if both are null. We also try firstName/lastName individually
 *   as a fallback, and leave the field blank (editable) if nothing is available.
 *
 * ROLE → INSTITUTION RULES:
 *   STUDENT / TRAINER           → must pick an existing institution from dropdown
 *   INSTITUTION                 → can create a new institution (by name) OR join existing
 *   PROGRAMME_MANAGER / OFFICER → no institution needed, institutionId stays null in DB
 */

import { useUser } from '@clerk/react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const ROLES = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'TRAINER', label: 'Trainer' },
  { value: 'INSTITUTION', label: 'Institution Admin' },
  { value: 'PROGRAMME_MANAGER', label: 'Programme Manager' },
  { value: 'MONITORING_OFFICER', label: 'Monitoring Officer' },
];

const NEEDS_INSTITUTION = new Set(['STUDENT', 'TRAINER']);
const CAN_CREATE_INST = new Set(['INSTITUTION']);

const OnboardingPage = ({ onComplete }) => {
  const { user: clerkUser, isLoaded } = useUser();

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill name from Clerk once it loads.
  // fullName = computed firstName + lastName; falls back to individual fields.
  useEffect(() => {
    if (!isLoaded || !clerkUser) return;
    const full =
      clerkUser.fullName || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');
    if (full) setName(full);
  }, [isLoaded, clerkUser]);

  // Fetch institution list for the dropdown (public — no auth token needed)
  useEffect(() => {
    api
      .get('/public/institutions')
      .then(({ data }) => setInstitutions(data.institutions))
      .catch(() => {}); // non-fatal: user can still enter name manually
  }, []);

  const handleRoleChange = (e) => {
    setRole(e.target.value);
    setInstitutionId('');
    setInstitutionName('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side pre-validation (server also validates via Zod)
    if (NEEDS_INSTITUTION.has(role) && !institutionId) {
      setError('Please select an institution from the list.');
      return;
    }
    if (CAN_CREATE_INST.has(role) && !institutionId && !institutionName.trim()) {
      setError('Please enter your institution name or select an existing one.');
      return;
    }

    setLoading(true);
    try {
      const payload = { name: name.trim(), role };

      if (NEEDS_INSTITUTION.has(role)) {
        payload.institutionId = institutionId;
      }

      if (CAN_CREATE_INST.has(role)) {
        if (institutionId) {
          payload.institutionId = institutionId;
        } else {
          payload.institutionName = institutionName.trim();
        }
      }

      const { data } = await api.post('/auth/sync', payload);
      // onComplete is App.jsx's setDbUser — it triggers redirect to /dashboard
      onComplete(data.user);
    } catch (err) {
      // Extract the most useful error message from Zod field errors or top-level error
      const fieldErrors = err.response?.data?.fields;
      const topError = err.response?.data?.error;

      if (fieldErrors) {
        setError(Object.values(fieldErrors).flat().join(' '));
      } else if (topError) {
        setError(topError);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div className="card">
          <div className="mb-2">
            <div className="auth-logo" style={{ marginBottom: '0.5rem' }}>
              SkillBridge
            </div>
            <h1>Complete your profile</h1>
            <p>A few quick details to set up your account.</p>
          </div>

          {error && <div className="alert alert-error mb-2">{error}</div>}

          <form className="form" onSubmit={handleSubmit}>
            {/* Full name — pre-filled from Clerk, always editable */}
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                minLength={2}
              />
            </div>

            {/* Role */}
            <div className="field">
              <label htmlFor="role">I am a...</label>
              <select id="role" value={role} onChange={handleRoleChange} required>
                <option value="">Select your role</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* STUDENT / TRAINER: must pick an existing institution */}
            {NEEDS_INSTITUTION.has(role) && (
              <div className="field">
                <label htmlFor="institution">Institution</label>
                <select
                  id="institution"
                  value={institutionId}
                  onChange={(e) => setInstitutionId(e.target.value)}
                  required
                >
                  <option value="">Select your institution</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
                {institutions.length === 0 && (
                  <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>
                    No institutions registered yet. Ask your Institution Admin to sign up first.
                  </p>
                )}
              </div>
            )}

            {/* INSTITUTION: join existing OR create new */}
            {CAN_CREATE_INST.has(role) && (
              <>
                {institutions.length > 0 && (
                  <div className="field">
                    <label htmlFor="existing-inst">Join an existing institution (optional)</label>
                    <select
                      id="existing-inst"
                      value={institutionId}
                      onChange={(e) => {
                        setInstitutionId(e.target.value);
                        if (e.target.value) setInstitutionName('');
                      }}
                    >
                      <option value="">— Create a new institution instead —</option>
                      {institutions.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!institutionId && (
                  <div className="field">
                    <label htmlFor="new-inst">Institution name</label>
                    <input
                      id="new-inst"
                      type="text"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      placeholder="e.g. Govt. Polytechnic College, Chennai"
                    />
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              className="btn btn-primary full-width"
              disabled={loading || !name.trim() || !role}
            >
              {loading ? 'Setting up...' : 'Get started →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
