const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var accSchema = new Schema({
  _id: { type: mongoose.Types.ObjectId },
  usr_id: { type: String },
  usr_pw: { type: String },
  role: { type: Number },
  name: { type: String },
  log_date: { type: String },
  acc_stat: { type: String }
});

const my_db = mongoose.connection.useDb('Users');

const AccModel = my_db.model('AccountCollection', accSchema, 'Accounts');

module.exports = AccModel;
