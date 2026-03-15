import type { SupabaseClient } from '@supabase/supabase-js';

export async function verifyFriendshipExists(
  supabase: SupabaseClient,
  userId: string,
  friendId: string
): Promise<boolean> {
  try {
    const { data: friendship, error } = await supabase
      .from('friends')
      .select('id')
      .or(
        `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
      )
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error verifying friendship:', error);
      return false;
    }

    return !!friendship;
  } catch (error) {
    console.error('Error verifying friendship:', error);
    return false;
  }
}

export async function checkExistingFriendRequest(
  supabase: SupabaseClient,
  requesterId: string,
  targetId: string
): Promise<{ exists: boolean; request?: { id: string } }> {
  try {
    const { data: existingRequest, error } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('requester_id', requesterId)
      .eq('target_id', targetId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return {
      exists: !!existingRequest,
      request: existingRequest || undefined
    };
  } catch (error) {
    console.error('Error checking existing friend request:', error);
    throw error;
  }
}

export async function checkIncomingFriendRequest(
  supabase: SupabaseClient,
  requesterId: string,
  targetId: string
): Promise<{ exists: boolean; isPending: boolean }> {
  try {
    const { data: incomingRequest, error } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('requester_id', targetId)
      .eq('target_id', requesterId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return {
      exists: !!incomingRequest,
      isPending: !!incomingRequest
    };
  } catch (error) {
    console.error('Error checking incoming friend request:', error);
    throw error;
  }
}
