// src/auth.js - Admin auth middleware (shared-secret) with extensive logging

export function requireAdmin(req, res, next) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('[auth:admin] requireAdmin called');
  console.log('[auth:admin] Request path:', req.path);
  console.log('[auth:admin] Request method:', req.method);
  
  const header = req.get('Authorization') || '';
  console.log('[auth:admin] Authorization header present:', !!header);
  console.log('[auth:admin] Authorization header value:', header ? `"${header}"` : 'MISSING');
  console.log('[auth:admin] Header length:', header.length);
  
  const envToken = process.env.ADMIN_TOKEN;
  console.log('[auth:admin] ADMIN_TOKEN from env:', envToken ? `"${envToken}"` : 'NOT SET');
  
  const token = envToken || 'dev-admin-token';
  console.log('[auth:admin] Using token:', `"${token}"`);
  
  const expected = `Bearer ${token}`;
  console.log('[auth:admin] Expected header:', `"${expected}"`);
  console.log('[auth:admin] Expected length:', expected.length);
  
  console.log('[auth:admin] Headers match:', header === expected);
  console.log('[auth:admin] Header starts with "Bearer ":', header.startsWith('Bearer '));
  
  if (header) {
    const parts = header.split(' ');
    console.log('[auth:admin] Header parts:', parts);
    console.log('[auth:admin] Token part:', parts[1] || 'MISSING');
    console.log('[auth:admin] Token matches:', parts[1] === token);
  }
  
  if (header !== expected) {
    console.error('[auth:admin] ❌ AUTHENTICATION FAILED');
    console.error('[auth:admin] Comparison details:');
    console.error('[auth:admin]   Received: ', JSON.stringify(header));
    console.error('[auth:admin]   Expected: ', JSON.stringify(expected));
    console.error('[auth:admin]   Match:    ', header === expected);
    console.log('═══════════════════════════════════════════════════════════════');
    return res.status(401).json({ error: 'Unauthorized - Invalid admin token' });
  }
  
  console.log('[auth:admin] ✅ AUTHENTICATION SUCCESS');
  console.log('═══════════════════════════════════════════════════════════════');
  next();
}

// Back-compat so older imports don't break
export const adminAuth = requireAdmin;
export const requireAuth = requireAdmin;