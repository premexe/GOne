export function timeAgo(isoDate: string) {
  const diffMinutes = Math.max(1, Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000));
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const hours = Math.floor(diffMinutes / 60);
  return `${hours} hr${hours === 1 ? '' : 's'} ago`;
}

export function readableStatus(status: string) {
  return status.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
