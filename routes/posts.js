const express = require("express");
const router = express.Router(); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const asyncHandler = require('../utils/errors');

const UserController = require("../controllers/user");
const PostController = require("../controllers/post");
const authController = require("../utils/auth");
const getSequence = require("../utils/sequence");

const upload = multer({
  dest: 'public/uploads/' // Directory when files are going to land
});

// #######################
//     CREATION POST
// #######################

router.get('/create', authController.validateToken, asyncHandler(async (req, res) => {
    return res.render('posts/createPost', { 
      title: "Publish Post",
    });
  })
);

router.post('/create', authController.validateToken, upload.array('attachments'), asyncHandler(async (req, res) => {

    const { title, content, tags, isPublic, disableComments } = req.body;

    const id = await getSequence("posts")

    const newPost = {
      _id: id,
      title,
      content: content || '',
      userID: req.token._id,
      createdAt: new Date().toISOString(),
      public: isPublic === 'on',
      edited: false,
      allowComments: disableComments !== 'on',
      pinned: false,
      deleted: false,
      deletedBy: null,
      deletedAt: null,
      deletedReason: null,
      tags: (tags || "").split(' ').map(t => t.trim()).filter(t => t !== ''),
      comments: [],
      files: [],
      viewers: [req.token._id],
      viewsCount: 0
    };

    await PostController.create(newPost);

    const finalFiles = [];
    if (req.files && req.files.length > 0) {
      const postFolder = path.join('uploads/files', String(id));
      fs.mkdirSync(postFolder, { recursive: true });

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const customName = req.body.attachmentNames?.[i] || `file nº${i+1}`;

        const ext = path.extname(file.originalname);
        const newPath = path.join(postFolder, `file${i}${ext}`);

        try {
          fs.renameSync(file.path, newPath);
        } catch (err) {
          if (err.code === 'EXDEV') {
            fs.copyFileSync(file.path, newPath);
            fs.unlinkSync(file.path);
          } else {
            throw err;
          }
        }

        finalFiles.push({
          fileName: customName,
          pathReal: newPath,
          pathVirtual: `/files/${id}/file${i}${ext}`
        });
      }
    }

    await PostController.updateFiles(id, finalFiles, { replace: true });
    return res.redirect(`/posts/view/${id}`);

  })
);

// #######################
//        VIEW POST
// #######################

router.get('/view/:post', authController.noToken, asyncHandler(async (req, res) => {

    const id = req.params.post;
    const post = await PostController.findById(id);
    if (!post) 
      return res.status(404).render('posts/noPostFound', { title: "Post not found" });

    if (post.public == false && !req.token)
      return res.status(404).render('posts/viewPrivatePost', { title: "Private Post", post });

    if (post.deleted == true)
      return res.status(404).render('posts/viewDeletedPost', { title: `Post ${id}`, post });

    await PostController.incView(id)

    let viewer = null
    if (req.token) {
      viewer = req.token
      await PostController.addViewer(id,req.token._id)
    }

    const usersProfilePictures = await UserController.getProfilePicturesDictionary();
    post.comments = post.comments.filter(c => viewer ? true : !c.userID);

    return res.render('posts/viewPost', { 
      title: `Post ${id}`, 
      post, 
      viewer,
      usersProfilePictures
    });
  })
);

// #######################
//     EDIT POST
// #######################

router.get('/edit/:post', authController.validateToken, asyncHandler(async (req, res) => {

    const id = req.params.post;
    const post = await PostController.findById(id);
    if (!post) 
      return res.status(404).render('posts/noPostFound', { title: "Post not found" });

    if (post.userID != req.token._id)
      return res.status(403).render('posts/editForbiddenPost', { title: `Not allowed`, post });

    if (post.deleted == true)
      return res.status(404).render('posts/viewDeletedPost', { title: `Post ${id}`, post });

    return res.render('posts/editPost', { 
      title: `Edit Post`, 
      post
    });
  })
);

router.post('/edit/:post', authController.validateToken, upload.array('attachments'), asyncHandler(async (req, res) => {

    const { title, content, tags, isPublic, disableComments } = req.body;

    const id = req.params.post;
    const post = await PostController.findById(id);
    if (!post) 
      return res.status(404).render('posts/noPostFound', { title: "Post not found" });

    if (post.userID != req.token._id)
      return res.status(403).render('posts/editForbiddenPost', { title: `Not allowed`, post });

    if (post.deleted == true)
      return res.status(404).render('posts/viewDeletedPost', { title: `Post ${id}`, post });

    const updatedPost = {
      public: isPublic === 'on',
      allowComments: disableComments !== 'on',
      tags: (tags || "").split(' ').map(t => t.trim()).filter(t => t !== ''),
      title: title,
      content: content,
      edited: true
    };

    await PostController.update(id,updatedPost);
    return res.redirect(`/posts/view/${id}`);
  })
);

// #######################
//     DELETE POST
// #######################

router.get('/delete/:id', authController.validateToken, asyncHandler(async (req, res) => {

    const post = await PostController.findById(req.params.id);
    if (!post) return res.status(404).render('posts/noPostFound', { title: "Post not found" });

    if (post.userID != req.token._id && req.token.rank != 'A')
      return res.status(403).render('posts/editForbiddenPost', { title: `Not allowed`, post });

    if (post.deleted == true)
      return res.status(404).render('posts/viewDeletedPost', { title: `Post ${req.params.id}`, post });

    return res.render('posts/deletePost', { title: "Delete post", deletionUser: req.token._id, post });
  })
);

router.post('/delete/:id', authController.validateToken, asyncHandler(async (req, res) => {

    const { deletionReason } = req.body;
    const post = await PostController.findById(req.params.id);
    if (!post) return res.status(404).render('posts/noPostFound', { title: "Post not found" });

    if (post.userID != req.token._id && req.token.rank != 'A')
      return res.status(403).render('posts/editForbiddenPost', { title: `Not allowed`, post });

    if (post.deleted == true)
      return res.status(404).render('posts/viewDeletedPost', { title: `Post ${req.params.id}`, post });

    const deletedPost = {
      content: null,
      allowComments: false,
      comments: [],
      tags: [],
      files: [],
      pinned: false,
      deletedAt: new Date().toISOString(),
      deletedBy: req.token._id,
      deletedReason: deletionReason || null,
      deleted: true,
      viewers: []
    };

    await PostController.update(req.params.id, deletedPost);

    const folderPath = `uploads/files/${req.params.id}`;
    if (fs.existsSync(folderPath)) {
      await fs.promises.rm(folderPath, { recursive: true, force: true });
    }
    return res.redirect(`/`);
  })
);

// #######################
//    POST COMMENT
// #######################

router.post('/comments/:post', authController.noToken, asyncHandler(async (req, res) => {

    const id = req.params.post;
    const post = await PostController.findById(id);

    if (!post) 
      return res.status(404).render('posts/noPostFound', { title: "Post not found" });

    if (post.public == false && !req.token)
      return res.status(404).render('posts/viewPrivatePost', { title: "Private Post" });

    if (post.allowComments == false)
      return res.status(403).send();

    const { comment } = req.body;

    const userID = req.token ? req.token._id : null

    const newComment = {
      userID,
      comment,
      commentAt: new Date().toISOString(),
    }

    await PostController.addComment(id,newComment)
    return res.redirect(`/posts/view/${id}#comments`);
  })
);

// #######################
//     DELETE COMMENT
// #######################

router.post('/deleteComment/:post/:comment', authController.validateToken, asyncHandler(async (req, res) => {

    const postId = req.params.post;
    const commentId = req.params.comment;
    const post = await PostController.findById(postId);
    const comment = await PostController.getComment(postId,commentId)

    if (!post) 
      return res.status(404).render('posts/noPostFound', { title: "Post not found" });

    if (post.public == false && !req.token)
      return res.status(404).render('posts/viewPrivatePost', { title: "Private Post" });

    if (!comment)
      return res.status(404).send();

    if (post.allowComments == false || (comment.userID != req.token._id && post.userID != req.token._id))
      return res.status(403).send();

    await PostController.deleteComment(postId,commentId)
    return res.redirect(`/posts/view/${postId}#comments`);
  })
);

module.exports = router;