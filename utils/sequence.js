const mongoose = require("mongoose");

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model("Counter", CounterSchema);

module.exports = async (name) => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}