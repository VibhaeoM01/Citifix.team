const fs = require('fs');
const path = require('path');

const setupFolders = () => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory at:', uploadsDir);
  }
};

module.exports = {
  setupFolders
};