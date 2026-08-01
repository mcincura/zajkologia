import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { loadMembershipPreviewAccess } from '../api/client';
import ClubComingSoon from './ClubComingSoon';
import {
  hasClubPreviewPresentationUnlock,
  unlockClubPreviewPresentation,
} from '../utils/clubPreviewUnlock';

const ClubPreviewGate = ({ children, loginOnly = false }) => {
  const [isAllowed, setIsAllowed] = useState(false);
  const [presentationUnlocked, setPresentationUnlocked] = useState(
    () => hasClubPreviewPresentationUnlock(),
  );

  useEffect(() => {
    if (loginOnly) return undefined;
    let active = true;

    loadMembershipPreviewAccess()
      .then((allowed) => {
        if (active) setIsAllowed(allowed === true);
      })
      .catch(() => {
        if (active) setIsAllowed(false);
      });

    return () => {
      active = false;
    };
  }, [loginOnly]);

  if (loginOnly || isAllowed) return children;

  // The stored value is deliberately a presentation-only escape hatch. It
  // sends a visitor to the OTP surface; protected APIs still require a server
  // session and an active membership.
  if (presentationUnlocked) return <Navigate to="/klub/prihlasenie" replace />;

  return (
    <ClubComingSoon
      onPreviewUnlock={() => {
        unlockClubPreviewPresentation();
        setPresentationUnlocked(true);
      }}
    />
  );
};

export default ClubPreviewGate;
