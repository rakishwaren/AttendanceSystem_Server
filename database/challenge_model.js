const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var challengeSchema = new Schema({
  _id: { type: mongoose.Types.ObjectId },
  challenge_code: { type: String },
  challenge_date: { type: String },
  dev_id: { type: String },
  response_code: { type: String },
  requestor: { type: String },
  requestor_ip: { type: String },
  auth_status: { type: String },
  auth_date: { type: String }
});

const my_db = mongoose.connection.useDb('Activity');

var ChallengeModel = my_db.model(
  'ChallengeCollection',
  challengeSchema,
  'Challenges'
);

module.exports = ChallengeModel;
