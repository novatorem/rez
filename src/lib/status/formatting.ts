export const formatStatusUpdatedAt = (updatedAt: string | null): string => {
  if (!updatedAt) return '';

  const date = new Date(updatedAt);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {})
  });
};

export const formatStatusUpdatedAtTooltip = (updatedAt: string | null): string => {
  if (!updatedAt) return '';

  const date = new Date(updatedAt);
  const now = new Date();
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    hour: 'numeric',
    minute: '2-digit'
  });
};
