const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var bindSchema = new Schema({
  _id: { type: mongoose.Types.ObjectId },
  acc_id: { type: mongoose.Types.ObjectId },
  dev_id: { type: String },
  imei: { type: String }
});

const my_db = mongoose.connection.useDb('Users');

const BindModel = my_db.model('BindCollection', bindSchema, 'Binds');

module.exports = BindModel;
