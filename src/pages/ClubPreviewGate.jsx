import { useEffect, useState } from 'react';

import { loadMembershipPreviewAccess } from '../api/client';
import ClubComingSoon from './ClubComingSoon';

const ClubPreviewGate = ({ children, loginOnly = false }) => {
  const [isAllowed, setIsAllowed] = useState(false);

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

  return loginOnly || isAllowed ? children : <ClubComingSoon />;
};

export default ClubPreviewGate;
