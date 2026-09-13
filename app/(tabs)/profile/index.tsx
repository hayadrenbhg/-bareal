import { UserProfileView } from '@/components/profile/UserProfileView';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const { user } = useAuth();

  if (!user) {
    return <LoadingScreen />;
  }

  return <UserProfileView userId={user.id} isOwn />;
}
