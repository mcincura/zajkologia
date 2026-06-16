import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { captureAttribution } from '../utils/attribution';

const AttributionTracker = () => {
  const location = useLocation();

  useEffect(() => {
    captureAttribution();
  }, [location.pathname, location.search]);

  return null;
};

export default AttributionTracker;
