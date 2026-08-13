function getTimestamp() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

function log(module, message) {
  console.log(`[${getTimestamp()}][${module}] ${message}`);
}

function logError(module, message) {
  console.error(`[${getTimestamp()}][${module}] ${message}`);
}

function logInfo(module, message) {
  console.log(`[${getTimestamp()}][${module}] ${message}`);
}

function logWarning(module, message) {
  console.warn(`[${getTimestamp()}][${module}] ${message}`);
}

module.exports = {
  log,
  logError,
  logInfo,
  logWarning,
  getTimestamp
};