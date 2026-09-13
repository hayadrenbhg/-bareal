import type { Session, User } from '@supabase/supabase-js';

import type { Profile } from './database';

export type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
};

export type SignUpInput = {
  username: string;
  email: string;
  password: string;
};

export type SignInInput = {
  email: string;
  password: string;
};
