const crypto = require('node:crypto');

function reject(res) {
  res.set('WWW-Authenticate', 'Basic realm="n8n Admin", charset="UTF-8"');
  return res.status(401).json({
    success: false,
    error: 'Authentication is required',
  });
}

function equalSecrets(left, right) {
  const leftHash = crypto.createHash('sha256').update(String(left)).digest();
  const rightHash = crypto.createHash('sha256').update(String(right)).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

function basicAuth(config) {
  return (req, res, next) => {
    const header = req.get('authorization');
    if (!header || !header.startsWith('Basic ')) return reject(res);

    let username;
    let password;
    try {
      const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      if (separator < 0) return reject(res);
      username = decoded.slice(0, separator);
      password = decoded.slice(separator + 1);
    } catch {
      return reject(res);
    }

    if (!equalSecrets(username, config.appUsername) || !equalSecrets(password, config.appPassword)) {
      return reject(res);
    }

    req.operator = username;
    return next();
  };
}

module.exports = { basicAuth };
