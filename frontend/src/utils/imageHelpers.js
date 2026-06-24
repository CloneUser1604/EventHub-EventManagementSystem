export const getImageUrl = (url) => {
  if (!url) return '';
  
  if (url.startsWith('http') || url.startsWith('data:')) {
    return url;
  }
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');
  
  let subDir = '';
  if (!url.includes('/')) {
    if (url.startsWith('event_')) subDir = 'events/';
    else if (url.startsWith('org_')) subDir = 'organizer-docs/';
    else if (url.startsWith('avatar_')) subDir = 'avatars/';
  }
  
  return `${baseUrl}/uploads/${subDir}${url}`;
};