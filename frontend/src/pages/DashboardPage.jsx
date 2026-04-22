/**
 * DashboardPage
 *
 * Shell component: renders the top nav and routes to the
 * correct role-specific dashboard based on dbUser.role.
 */

import { useClerk } from '@clerk/react';
import { useSearchParams } from 'react-router-dom';
import InstitutionDashboard from '../dashboards/InstitutionDashboard.jsx';
import JoinBatchPrompt from '../dashboards/JoinBatchPrompt.jsx';
import ManagerDashboard from '../dashboards/ManagerDashboard.jsx';
import OfficerDashboard from '../dashboards/OfficerDashboard.jsx';
import StudentDashboard from '../dashboards/StudentDashboard.jsx';
import TrainerDashboard from '../dashboards/TrainerDashboard.jsx';

const ROLE_LABELS = {
  STUDENT: 'Student',
  TRAINER: 'Trainer',
  INSTITUTION: 'Institution Admin',
  PROGRAMME_MANAGER: 'Programme Manager',
  MONITORING_OFFICER: 'Monitoring Officer',
};

const DASHBOARDS = {
  STUDENT: StudentDashboard,
  TRAINER: TrainerDashboard,
  INSTITUTION: InstitutionDashboard,
  PROGRAMME_MANAGER: ManagerDashboard,
  MONITORING_OFFICER: OfficerDashboard,
};

/**
 * @param {{ dbUser: object | null }} props
 */
const DashboardPage = ({ dbUser }) => {
  const { signOut } = useClerk();
  const [searchParams] = useSearchParams();

  // Invite link params: /join?token=xxx&batchId=yyy
  const inviteToken = searchParams.get('token');
  const inviteBatchId = searchParams.get('batchId');

  if (!dbUser) {
    return (
      <div className="page">
        <p className="muted">Loading...</p>
      </div>
    );
  }

  // Student opened an invite link → show join prompt before the main dashboard
  if (dbUser.role === 'STUDENT' && inviteToken && inviteBatchId) {
    return (
      <>
        <Nav dbUser={dbUser} onSignOut={() => signOut({ redirectUrl: '/sign-in' })} />
        <JoinBatchPrompt token={inviteToken} batchId={inviteBatchId} />
      </>
    );
  }

  const Dashboard = DASHBOARDS[dbUser.role];

  if (!Dashboard) {
    return (
      <div className="page">
        <p className="muted">Unknown role: {dbUser.role}</p>
      </div>
    );
  }

  return (
    <>
      <Nav dbUser={dbUser} onSignOut={() => signOut({ redirectUrl: '/sign-in' })} />
      <Dashboard dbUser={dbUser} />
    </>
  );
};

/**
 * Shared top navigation bar
 *
 * @param {{ dbUser: object, onSignOut: () => void }} props
 */
const Nav = ({ dbUser, onSignOut }) => (
  <nav className="nav">
    <span className="nav-brand">SkillBridge</span>
    <div className="nav-right">
      <span className="muted" style={{ fontSize: '0.85rem' }}>
        {dbUser.name}
      </span>
      <span className="nav-role">{ROLE_LABELS[dbUser.role]}</span>
      <button className="btn btn-ghost btn-sm" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  </nav>
);

export default DashboardPage;
