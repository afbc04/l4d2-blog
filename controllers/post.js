const PostModal = require('../models/post');
const logger = require('../utils/logger');

// Count Posts
module.exports.count = async () =>
  await PostModal.countDocuments();

// List Posts
module.exports.findAll = async (includePrivate = true, includeDeleted = true) => {
  const filter = {};

  if (!includePrivate) {
    filter.public = true;
  }

  if (!includeDeleted) {
    filter.deleted = false;
  }

  const posts = await PostModal
    .find(filter, '-__v')
    .sort({ pinned: -1, createdAt: -1, _id: -1 })
    .lean();

  return posts;
};

// Get Post by ID
module.exports.findById = async (id) =>
  await PostModal.findById(id, '-__v');

// Create Post
module.exports.create = async (data) => {
  try {
    const post = new PostModal({ ...data });
    await post.save();
    return post;
  } 
  catch (err) {
    throw err;
  }
};

// Update Post
module.exports.update = async (id, data) => {
  await PostModal
    .findByIdAndUpdate(id, data, { new: true, runValidators: true });

  return this.findById(id);
};

// Update Files of a Post
module.exports.updateFiles = async (id, files) => {
  try {
    const post = await PostModal.findById(id);
    post.files = files;

    await post.save();
    return post.files;
  } catch (err) {
    throw err;
  }
};

// Add Viewer to a Post
module.exports.addViewer = async (id, viewer) => {
  await PostModal.findByIdAndUpdate(
    id,
    {
      $addToSet: { viewers: viewer },
      $inc: { viewsCount: 1 }
    },
    { new: true }
  );
};

// ============================
//      COMMENTS OF POST
// ============================ 

// Add comment
module.exports.addComment = async (id, comment) => {
  const post = await PostModal.findById(id);
  post.comments.push(comment);
  await post.save();
};

// Get comment
module.exports.getComment = async (postId, commentId) => {
  const post = await PostModal.findById(postId, 'comments');
  const comment = post.comments.find(c => c._id.toString() === commentId);
  if (!comment) 
    return null

  return comment;
};

// Delete comment
module.exports.deleteComment = async (postId, commentId) => {
  const post = await PostModal.findById(postId);
  post.comments = post.comments.filter(c => c._id.toString() !== commentId);
  await post.save();
};