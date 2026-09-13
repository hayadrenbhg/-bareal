/**
 * Supabase Database 型定義（Migration と同期）
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';
export type TimingStatus = 'on_time' | 'late';
export type ReactionType = 'fire' | 'muscle' | 'thumbs_up';
export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'reaction'
  | 'daily_event'
  | 'comment';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string;
          birth_date: string | null;
          gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
          gym_name: string | null;
          gym_id: string | null;
          training_experience:
            | 'beginner'
            | 'under_6m'
            | '6m_to_1y'
            | '1_to_3y'
            | '3_to_5y'
            | 'over_5y'
            | null;
          onboarding_completed: boolean;
          occupation: string | null;
          instagram_username: string | null;
          weekly_workout_goal: number | null;
          height_cm: number | null;
          weight_kg: number | null;
          favorite_exercises: string[];
          training_weekdays: number[];
          training_time_of_day:
            | 'morning'
            | 'afternoon'
            | 'evening'
            | 'night'
            | 'flexible'
            | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string;
          birth_date?: string | null;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
          gym_name?: string | null;
          gym_id?: string | null;
          training_experience?:
            | 'beginner'
            | 'under_6m'
            | '6m_to_1y'
            | '1_to_3y'
            | '3_to_5y'
            | 'over_5y'
            | null;
          onboarding_completed?: boolean;
          occupation?: string | null;
          instagram_username?: string | null;
          weekly_workout_goal?: number | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          favorite_exercises?: string[];
          training_weekdays?: number[];
          training_time_of_day?:
            | 'morning'
            | 'afternoon'
            | 'evening'
            | 'night'
            | 'flexible'
            | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string;
          birth_date?: string | null;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
          gym_name?: string | null;
          gym_id?: string | null;
          training_experience?:
            | 'beginner'
            | 'under_6m'
            | '6m_to_1y'
            | '1_to_3y'
            | '3_to_5y'
            | 'over_5y'
            | null;
          onboarding_completed?: boolean;
          occupation?: string | null;
          instagram_username?: string | null;
          weekly_workout_goal?: number | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          favorite_exercises?: string[];
          training_weekdays?: number[];
          training_time_of_day?:
            | 'morning'
            | 'afternoon'
            | 'evening'
            | 'night'
            | 'flexible'
            | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_training_goals: {
        Row: {
          id: string;
          user_id: string;
          goal:
            | 'hypertrophy'
            | 'strength'
            | 'diet'
            | 'health'
            | 'bodymake'
            | 'sports'
            | 'other';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal:
            | 'hypertrophy'
            | 'strength'
            | 'diet'
            | 'health'
            | 'bodymake'
            | 'sports'
            | 'other';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal?:
            | 'hypertrophy'
            | 'strength'
            | 'diet'
            | 'health'
            | 'bodymake'
            | 'sports'
            | 'other';
          created_at?: string;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: FriendshipStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: FriendshipStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          addressee_id?: string;
          status?: FriendshipStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invite_links: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          created_at: string;
          expires_at: string | null;
          is_active: boolean;
          used_count: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          created_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
          used_count?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          created_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
          used_count?: number;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          image_url: string;
          caption: string;
          posted_at: string;
          daily_event_id: string | null;
          timing_status: TimingStatus | null;
          pin_order: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          image_url: string;
          caption?: string;
          posted_at?: string;
          daily_event_id?: string | null;
          timing_status?: TimingStatus | null;
          pin_order?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          image_url?: string;
          caption?: string;
          posted_at?: string;
          daily_event_id?: string | null;
          timing_status?: TimingStatus | null;
          pin_order?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      post_mentions: {
        Row: {
          id: string;
          post_id: string;
          mentioned_user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          mentioned_user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          mentioned_user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          trained_at: string;
          duration_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          trained_at?: string;
          duration_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          trained_at?: string;
          duration_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workout_body_parts: {
        Row: {
          id: string;
          workout_id: string;
          body_part: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          body_part: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workout_id?: string;
          body_part?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_exercises: {
        Row: {
          id: string;
          workout_id: string;
          exercise_name: string;
          exercise_id: string | null;
          sort_order: number;
          sets: number | null;
          reps: number | null;
          weight_kg: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          exercise_name: string;
          exercise_id?: string | null;
          sort_order?: number;
          sets?: number | null;
          reps?: number | null;
          weight_kg?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workout_id?: string;
          exercise_name?: string;
          exercise_id?: string | null;
          sort_order?: number;
          sets?: number | null;
          reps?: number | null;
          weight_kg?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_participants: {
        Row: {
          id: string;
          workout_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workout_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reactions: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          reaction_type: ReactionType;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          reaction_type: ReactionType;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          reaction_type?: ReactionType;
          created_at?: string;
        };
        Relationships: [];
      };
      daily_events: {
        Row: {
          id: string;
          event_date: string;
          notification_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_date: string;
          notification_time: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_date?: string;
          notification_time?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_push_tokens: {
        Row: {
          id: string;
          user_id: string;
          expo_push_token: string;
          device_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          expo_push_token: string;
          device_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          expo_push_token?: string;
          device_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string | null;
          type: NotificationType;
          post_id: string | null;
          friendship_id: string | null;
          message: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          type: NotificationType;
          post_id?: string | null;
          friendship_id?: string | null;
          message?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          actor_id?: string | null;
          type?: NotificationType;
          post_id?: string | null;
          friendship_id?: string | null;
          message?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          blocker_id?: string;
          blocked_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string | null;
          post_id: string | null;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_user_id?: string | null;
          post_id?: string | null;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_user_id?: string | null;
          post_id?: string | null;
          reason?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      are_friends: {
        Args: { user_a: string; user_b: string };
        Returns: boolean;
      };
      get_today_daily_event: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['daily_events']['Row'][];
      };
      is_username_available: {
        Args: { check_username: string };
        Returns: boolean;
      };
      get_invite_preview: {
        Args: { p_token: string };
        Returns: {
          token: string;
          inviter_id: string | null;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          is_valid: boolean;
          reason: string | null;
        }[];
      };
      accept_invite: {
        Args: { p_token: string };
        Returns: Json;
      };
      get_or_create_invite_link: {
        Args: { p_expires_days?: number };
        Returns: {
          token: string;
          expires_at: string | null;
        }[];
      };
      regenerate_invite_link: {
        Args: { p_expires_days?: number };
        Returns: {
          token: string;
          expires_at: string | null;
        }[];
      };
      count_posts_today_jst: {
        Args: { p_user_id?: string };
        Returns: number;
      };
      create_workout_for_post: {
        Args: {
          p_post_id: string;
          p_body_parts: string[];
          p_exercises?: Json;
          p_participant_ids?: string[];
        };
        Returns: string;
      };
      get_workout_profile_stats: {
        Args: { p_user_id: string; p_week_start?: string };
        Returns: Json;
      };
      delete_own_account: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Friendship = Database['public']['Tables']['friendships']['Row'];
export type InviteLink = Database['public']['Tables']['invite_links']['Row'];
export type Post = Database['public']['Tables']['posts']['Row'];
export type PostMention = Database['public']['Tables']['post_mentions']['Row'];
export type PostComment = Database['public']['Tables']['post_comments']['Row'];
export type Workout = Database['public']['Tables']['workouts']['Row'];
export type Reaction = Database['public']['Tables']['reactions']['Row'];
export type DailyEvent = Database['public']['Tables']['daily_events']['Row'];
export type UserPushToken = Database['public']['Tables']['user_push_tokens']['Row'];
export type AppNotification = Database['public']['Tables']['notifications']['Row'];
export type Block = Database['public']['Tables']['blocks']['Row'];
export type Report = Database['public']['Tables']['reports']['Row'];
