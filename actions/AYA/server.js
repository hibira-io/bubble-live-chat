async function(properties, context) {
  const crypto = require('crypto');
  const secret = String((context.keys || {})['Identity secret'] || '').trim();
  const userId = String(properties.user_id || '').trim();
  if (!secret) return { user_hash: '', error: 'Paste the identity secret (lcid_...) in Plugins > Hibira Live Chat. Create it under Settings > Widget > Verified visitors on chat.hibira.io.' };
  if (!userId) return { user_hash: '', error: 'User ID is empty: use Current User\'s unique id, and run this only when the user is logged in.' };
  return { user_hash: crypto.createHmac('sha256', secret).update(userId).digest('hex'), error: '' };
}
