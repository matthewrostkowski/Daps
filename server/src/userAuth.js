// src/userAuth.js
import jwt from 'jsonwebtoken';

const { SESSION_SECRET = 'dev-session-secret' } = process.env;

export function signUserSession(user) {
  const payload = { uid: user.id, email: user.email };
  const token = jwt.sign(payload, SESSION_SECRET, { expiresIn: '7d' });
  console.log('[auth] signUserSession → created JWT', {
    uid: user.id,
    email: user.email,
    exp: '7d'
  });
  return token;
}

export function requireUser(req, res, next) {
  try {
    const header = req.get('Authorization') || '';
    console.log('[auth] requireUser header:', header ? 'present' : 'missing');

    if (!header.startsWith('Bearer ')) {
      console.warn('[auth] requireUser → missing Bearer token');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = header.slice(7);
    const decoded = jwt.verify(token, SESSION_SECRET);
    req.user = decoded;
    console.log('[auth] requireUser → ok', { uid: decoded.uid, email: decoded.email });
    next();
  } catch (err) {
    console.error('[auth] requireUser → invalid token', err?.message);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
