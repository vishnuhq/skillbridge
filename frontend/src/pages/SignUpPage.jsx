/**
 * Sign Up Page
 *
 *   We send them to /onboarding because after Clerk sign-up,
 *   they still need to fill in their role + institution
 *   (which creates the DB record via POST /auth/sync).
 */

import { SignUp } from '@clerk/react';

const SignUpPage = () => (
  <div className="page">
    <div className="auth-wrapper">
      <div className="auth-logo">SkillBridge</div>
      <SignUp routing="path" path="/sign-up" afterSignUpUrl="/onboarding" signInUrl="/sign-in" />
    </div>
  </div>
);

export default SignUpPage;
