const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var logSchema = new Schema({
  _id: { type: mongoose.Types.ObjectId },
  log_date: { type: String },
  sess_type: { type: String },
  sess_date: { type: String },
  sess_token: { type: String },
  usr_id: { type: String },
  usr_ip: { type: String },
  auth_token: { type: String },
  auth_type: { type: String },
  dev_id: { type: String }
});

const my_db = mongoose.connection.useDb('Activity');

var LogModel = my_db.model('LogCollection', logSchema, 'Logs');

module.exports = LogModel;
