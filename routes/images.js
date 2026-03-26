const express = require('express');
const router = express.Router();
const path = require('path');

const authController = require('../auth/auth')

// GET - Send image
router.get('/profilePicture/:file', authController.validateAccessToResources, (req, res) => {
  try {
    const dir = path.join(__dirname, '../uploads/profile_pictures');
    const file = req.params.file;
    const filePath = path.join(dir, file);
    const ext = path.extname(file).toLowerCase();

    // Define content type
    let contentType = 'application/octet-stream';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';

    res.setHeader('Content-Type', contentType);
    res.set('Content-Disposition', 'inline');
    res.sendFile(filePath);

  } catch (err) {
    console.error('Error sending profile picture:', err);
    res.status(500).send();
  }
});

module.exports = router