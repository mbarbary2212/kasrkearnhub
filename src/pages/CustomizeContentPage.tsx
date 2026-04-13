import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CustomizeContentPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/student-settings?tab=content', { replace: true });
  }, [navigate]);
  return null;
}
