var mongoose = require('mongoose');

var user_id = 'root';
var pwd = 'amgS400gooD';
var host = 'attendancesystem-tp9vy.mongodb.net';

mongoose.connect(`mongodb+srv://${user_id}:${pwd}@${host}/Activity`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;

db.on('error', () => {
  console.error.bind(console, 'MongoDB connection error:');
});

db.once('open', () => {
  console.log('MongoDB Connected!');
});

module.exports = db;
