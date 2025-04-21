import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ depends, locals: { supabase, safeGetSession } }) => {
  depends('supabase:db:status')
  depends('supabase:db:friend_requests')
  depends('supabase:db:friends')

  const { session } = await safeGetSession()
  const userId = session?.user.id

  // Get user status
  const { data: statusData } = await supabase
    .from('user_status')
    .select('status')
    .eq('user_id', userId)
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

  // Format friend requests for easier use in the template
  const formattedRequests = friendRequests?.map(request => ({
    id: request.id,
    requester_id: request.requester_id,
    requester_username: request.requester?.username || 'Unknown user'
  })) || []

  // Get all accepted friends
  const { data: friends } = await supabase
    .from('friends')
    .select(`
      id,
      friend:friend_id(id, username, email)
    `)
    .eq('user_id', userId)

  // Format friends for easier use in the template
  const formattedFriends = friends?.map(friend => ({
    id: friend.friend.id,
    username: friend.friend.username,
    email: friend.friend.email
  })) || []

  return {
    currentStatus: statusData?.status || "",
    friendRequests: formattedRequests,
    friends: formattedFriends
  }
}
