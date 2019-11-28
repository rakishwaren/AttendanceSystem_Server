const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var sessionSchema = new Schema({
  _id: { type: mongoose.Types.ObjectId },
  sess_token: { type: String },
  sess_date: { type: String },
  usr_id: { type: String },
  auth_token: { type: String },
  auth_type: { type: String },
  sess_type: { type: String },
  dev_id: { type: String }
});

const my_db = mongoose.connection.useDb('Activity');

var SessionModel = my_db.model('SessionCollection', sessionSchema, 'Session');
module.exports = SessionModel;
