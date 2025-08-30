import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ depends, locals: { supabase, safeGetSession } }) => {
  depends('supabase:db:status')
  depends('supabase:db:friend_requests')
  depends('supabase:db:friends')
  depends('supabase:db:users')
  depends('supabase:db:profiles')

  const { session } = await safeGetSession()
  const userId = session?.user.id

  // Get user info including username from public.users table
  const { data: userData } = await supabase
    .from('users')
    .select('username')
    .eq('id', userId)
    .single()

  // Get user status from public.profiles table
  const { data: profileData } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', userId)
    .single()

  // Get incoming friend requests
  const { data: friendRequests } = await supabase
    .from('friend_requests')
    .select(`
      id,
      requester_id,
      requester:requester_id(username),
      status
    `)
    .eq('target_id', userId)
    .eq('status', 'pending')

  // Get outgoing friend requests (sent by current user)
  const { data: sentFriendRequests } = await supabase
    .from('friend_requests')
    .select(`
      id,
      target_id,
      target:target_id(username),
      status,
      created_at
    `)
    .eq('requester_id', userId)
    .in('status', ['pending', 'accepted'])

  // Format friend requests for easier use in the template
  const formattedRequests = friendRequests?.map(request => ({
    id: request.id,
    requester_id: request.requester_id,
    requester_username: request.requester?.username || 'Unknown user'
  })) || []

  // Format sent friend requests for easier use in the template
  const formattedSentRequests = sentFriendRequests?.map(request => ({
    id: request.id,
    target_id: request.target_id,
    target_username: request.target?.username || 'Unknown user',
    status: request.status,
    created_at: request.created_at
  })) || []

  // Get all accepted friends (both directions)
  const { data: friends } = await supabase
    .from('friends')
    .select(`
      id,
      user_id,
      friend_id,
      user:user_id(id, username, email),
      friend:friend_id(id, username, email)
    `)
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

  // Get friend IDs to fetch their statuses
  const friendIds = friends?.map(friend => {
    const friendUser = friend.user_id === userId ? friend.friend : friend.user;
    return friendUser.id;
  }) || []

  // Get statuses for all friends
  const { data: friendStatuses } = friendIds.length > 0 ? await supabase
    .from('profiles')
    .select('id, status')
    .in('id', friendIds) : { data: [] }

  // Create a map of friend statuses for easy lookup
  const statusMap = new Map(friendStatuses?.map(profile => [profile.id, profile.status]) || [])

  // Format friends for easier use in the template
  const formattedFriends = friends?.map(friend => {
    // Determine which user is the friend (not the current user)
    const friendUser = friend.user_id === userId ? friend.friend : friend.user;
    return {
      id: friendUser.id,
      username: friendUser.username,
      email: friendUser.email,
      status: statusMap.get(friendUser.id) || null
    };
  }) || []

  return {
    currentUsername: userData?.username || "",
    currentStatus: profileData?.status || "",
    friendRequests: formattedRequests,
    sentFriendRequests: formattedSentRequests,
    friends: formattedFriends
  }
}
