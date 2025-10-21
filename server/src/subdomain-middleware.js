// src/subdomain-middleware.js - Detect subdomain and inject team config
import { getTeamConfig } from './team-config.js';

export function subdomainMiddleware(req, res, next) {
  // Try multiple methods to get hostname
  let hostname = req.hostname || req.get('host') || req.headers.host || 'localhost';
  
  // Remove port if present
  hostname = hostname.split(':')[0];
  
  console.log('[subdomain] Raw hostname:', hostname);
  console.log('[subdomain] req.hostname:', req.hostname);
  console.log('[subdomain] req.get(host):', req.get('host'));
  console.log('[subdomain] req.headers.host:', req.headers.host);
  
  // Get team config based on subdomain
  const teamConfig = getTeamConfig(hostname);
  
  // Attach to request object
  req.teamConfig = teamConfig;
  req.teamSlug = hostname.split('.')[0];
  
  console.log('[subdomain] ✓', hostname, '→', teamConfig.name, `(${teamConfig.league})`);
  if (teamConfig.teamName) {
    console.log('[subdomain] ✓ Team-specific page:', teamConfig.teamName);
  }
  
  next();
}