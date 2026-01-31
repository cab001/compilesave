#!/usr/bin/env node
/**
 * Simple server contract checker for the Gemini server endpoint.
 * Usage:
 *   node test/check_server_contract.js [<url>]
 * or set env var GEMINI_SERVER_URL
 *
 * Exits with code 0 on success (200..299 + valid JSON with `explanation` string).
 * Exits with non-zero code and prints diagnostics on failure.
 */

const https = require('https');
const { URL } = require('url');
const pkg = require('../package.json');

const defaultUrl = process.env.GEMINI_SERVER_URL || (pkg && pkg.contributes && pkg.contributes.configuration && pkg.contributes.configuration.properties && pkg.contributes.configuration.properties['gemini.serverUrl'] && pkg.contributes.configuration.properties['gemini.serverUrl'].default);
const url = process.argv[2] || defaultUrl;

if (!url) {
  console.error('No server URL provided. Use env GEMINI_SERVER_URL or pass as argument.');
  process.exit(2);
}

const body = JSON.stringify({ message: 'server-contract-test' });
let urlObj;
try {
  urlObj = new URL(url);
} catch (err) {
  console.error('Invalid URL:', url);
  process.exit(2);
}

const options = {
  method: 'POST',
  hostname: urlObj.hostname,
  path: urlObj.pathname + (urlObj.search || ''),
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  },
  timeout: 10000
};
if (urlObj.port) options.port = urlObj.port;

console.log(`Checking server URL: ${url}`);

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      console.error(`Server returned status ${res.statusCode}`);
      console.error('Response body:', data);
      process.exit(1);
    }
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed.explanation === 'string') {
        console.log('OK - server returned valid JSON with `explanation`.');
        process.exit(0);
      } else {
        console.error('Invalid response format: missing `explanation` string.');
        console.error('Response body:', data);
        process.exit(1);
      }
    } catch (err) {
      console.error('Failed to parse JSON from server:', err.message);
      console.error('Response body:', data);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('Request failed:', err.message);
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy(new Error('Request timed out'));
});

req.write(body);
req.end();
