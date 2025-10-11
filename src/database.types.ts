export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
	public: {
		Tables: {
			users: {
				Row: {
					id: string;
					username: string;
					email: string | null;
					display_name: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					username: string;
					email?: string | null;
					display_name?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					username?: string;
					email?: string | null;
					display_name?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			profiles: {
				Row: {
					id: string;
					status: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					status?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					status?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			friend_requests: {
				Row: {
					id: string;
					requester_id: string;
					target_id: string;
					status: string;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					requester_id: string;
					target_id: string;
					status?: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					requester_id?: string;
					target_id?: string;
					status?: string;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'friend_requests_requester_id_fkey';
						columns: ['requester_id'];
						referencedRelation: 'users';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'friend_requests_target_id_fkey';
						columns: ['target_id'];
						referencedRelation: 'users';
						referencedColumns: ['id'];
					}
				];
			};
			friends: {
				Row: {
					id: string;
					user_id: string;
					friend_id: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					friend_id: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					friend_id?: string;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'friends_user_id_fkey';
						columns: ['user_id'];
						referencedRelation: 'users';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'friends_friend_id_fkey';
						columns: ['friend_id'];
						referencedRelation: 'users';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
}
