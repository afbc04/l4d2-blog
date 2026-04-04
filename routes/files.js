const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const asyncHandler = require('../utils/errors');

const authController = require('../utils/auth')
const PostController = require("../controllers/post");

// GET - Send files
router.get('/:id/*', authController.noToken, asyncHandler(async (req, res) => {

    const post = await PostController.findById(req.params.id);
    if (!post || post.deleted == true) 
      return res.status(404).send();

    if (post.public == false && !req.token)
      return res.status(403).send();

    const dir = path.join(__dirname, '../uploads/files');
    const fileName = path.normalize(req.params[0]).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(dir, `${post._id}/${fileName}`);

    if (!filePath.startsWith(dir)) {
      return res.status(403).send();
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).send();
    }

    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream';

    const imageTypes = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const videoTypes = ['.mp4', '.webm', '.ogg'];

    if (imageTypes.includes(ext)) contentType = 'image/' + ext.replace('.', '');
    else if (videoTypes.includes(ext)) contentType = 'video/' + ext.replace('.', '');
    else if (ext === '.pdf') contentType = 'application/pdf';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    return res.sendFile(filePath);
  })
);

module.exports = router