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
    .eq('status', 'pending')

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

  // Ensure uniqueness of friend requests by ID
  const uniqueFriendRequests = formattedRequests.filter((request, index, self) =>
    index === self.findIndex(r => r.id === request.id)
  );

  const uniqueSentFriendRequests = formattedSentRequests.filter((request, index, self) =>
    index === self.findIndex(r => r.id === request.id)
  );

  // Debug logging to identify duplicates
  if (formattedRequests.length !== uniqueFriendRequests.length) {
    console.log(`Found ${formattedRequests.length - uniqueFriendRequests.length} duplicate friend requests`);
    console.log('Duplicate IDs:', formattedRequests.filter((request, index, self) =>
      index !== self.findIndex(r => r.id === request.id)
    ).map(r => r.id));
  }
  if (formattedSentRequests.length !== uniqueSentFriendRequests.length) {
    console.log(`Found ${formattedSentRequests.length - uniqueSentFriendRequests.length} duplicate sent friend requests`);
    console.log('Duplicate IDs:', formattedSentRequests.filter((request, index, self) =>
      index !== self.findIndex(r => r.id === request.id)
    ).map(r => r.id));
  }

  // Get all accepted friends - query both directions but handle carefully to avoid duplicates
  const { data: friendsAsUser } = await supabase
    .from('friends')
    .select(`
      id,
      user_id,
      friend_id,
      friend:friend_id(id, username, email)
    `)
    .eq('user_id', userId)

  const { data: friendsAsFriend } = await supabase
    .from('friends')
    .select(`
      id,
      user_id,
      friend_id,
      user:user_id(id, username, email)
    `)
    .eq('friend_id', userId)

  // Combine both directions
  const friends = [...(friendsAsUser || []), ...(friendsAsFriend || [])]

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
    // Determine which user is the friend based on the query direction
    const friendUser = friend.friend || friend.user;
    return {
      id: friendUser.id,
      username: friendUser.username,
      email: friendUser.email,
      status: statusMap.get(friendUser.id) || null
    };
  }) || []

  // Ensure uniqueness of friends by ID
  const uniqueFriends = formattedFriends.filter((friend, index, self) =>
    index === self.findIndex(f => f.id === friend.id)
  );

  // Debug logging to identify duplicates
  if (formattedFriends.length !== uniqueFriends.length) {
    console.log(`Found ${formattedFriends.length - uniqueFriends.length} duplicate friends`);
    console.log('Duplicate IDs:', formattedFriends.filter((friend, index, self) =>
      index !== self.findIndex(f => f.id === friend.id)
    ).map(f => f.id));
  }

  return {
    currentUsername: userData?.username || "",
    currentStatus: profileData?.status || "",
    friendRequests: uniqueFriendRequests,
    sentFriendRequests: uniqueSentFriendRequests,
    friends: uniqueFriends
  }
}
