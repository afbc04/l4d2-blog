const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  _id: { type: Number }, // incremental ID
  title: { type: String, default: "" },
  content: { type: String, default: "" },
  userID: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  public: { type: Boolean, default: false },
  edited: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  deletedBy: { type: String, default: null },
  deletedAt: { type: String, default: null },
  deletedReason: { type: String, default: null },
  tags: [{ type: String }],
  allowComments: { type: Boolean, default: true },
  comments: [
    {
      userID: { type: String, default: null },
      comment: { type: String, default: "" },
      commentedAt: { type: Date, default: Date.now }
    }
  ],
  files: [
    {
      pathReal: { type: String, required: true }, //Path in the fileStore
      pathVirtual: { type: String, required: true }, //Path in URL
      fileName: { type: String, required: true }
    }
  ],
  viewers: [{ type: String }],
  viewsCount: { type: Number, default: 0 }
});

module.exports = mongoose.model("Post", PostSchema, "posts");
