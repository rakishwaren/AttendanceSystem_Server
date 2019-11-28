var router = require('express').Router();
var mongoose = require('mongoose');
var crypto = require('crypto');
var formatter = require('dateformat');
var qr_code = require('qrcode');

var challenges = require('../database/challenge_model');
var acc_model = require('../database/account_model');
var sessions = require('../database/session_model');
var logs = require('../database/log_model');

var max_range = 999999;
var min_range = 1;

router.use(function timeLog(req, res, next) {
  console.log('[Express Server] Access requestor - Time: ', Date.now());
  next();
});

router.post('/create_challenge', (req, res) => {
  if (typeof req.body.module_id === 'undefined') {
    console.log('Invalid parameters!');
    res.status(500).json({ result: false });
  } else {
    var dev_id = req.body.module_id;
    var codes = generateChallengeCode();
    var similar = false;

    while (similar == true) {
      var query = challenges.findOne({ challenge_code: codes });
      query.select('challenge_code');
      query.count((err, counts) => {
        if (err) {
          console.log('Unable to verify challenges');
          similar = false;
        } else {
          if (counts > 0) {
            codes = generateChallengeCode();
            similar = true;
          } else {
            similar = false;
          }
        }
      });
    }

    var cur_date = currentDateTime();

    const hashed_challenge = crypto
      .createHash('sha256')
      .update(codes)
      .digest('hex');

    var insertDocs = new challenges({
      _id: new mongoose.Types.ObjectId(),
      challenge_code: hashed_challenge,
      challenge_date: cur_date,
      dev_id: dev_id,
      response_code: '',
      requestor: '',
      requestor_ip: '',
      auth_status: 'USER_WAIT',
      auth_date: ''
    });

    insertDocs.save((err, prod) => {
      if (err) {
        console.log('Unable to create challenges. \n' + err);

        res.status(500).json({ result: false });
      } else {
        console.log('Challenge created!');
        var id = prod.id;

        res.status(200).json({
          result: true,
          data: { challenge_id: codes, pid: id, hashed: hashed_challenge }
        });
      }
    });
  }
});

router.post('/have_target', (req, res) => {
  if (typeof req.body.pid === 'undefined') {
    console.log('Invalid parameters!');
    res.status(500).json({ result: false });
  } else {
    var pid = req.body.pid;

    var query = challenges.findOne({ _id: new mongoose.Types.ObjectId(pid) });
    query.select('auth_status');
    query.exec((err, result) => {
      if (err) {
        console.log('Unable to check target status!');
        res.status(500).json({ result: false });
      } else {
        if (result.auth_status == 'USER_WAIT') {
          console.log("Haven't got target");
          res.status(200).json({ result: true, isTarget: false });
        } else {
          console.log('Found target');
          res.status(200).json({ result: true, isTarget: true });
        }
      }
    });
  }
});

router.post('/verify_qr', (req, res) => {
  if (typeof req.body.pid === 'undefined') {
    console.log('Invalid parameters!');
    res.status(500).json({ result: false });
  } else {
    var pid = req.body.pid;

    var query = challenges.findOne({ _id: new mongoose.Types.ObjectId(pid) });
    query.select('response_code dev_id requestor requestor_ip auth_status');
    query.exec((err, result) => {
      if (err) {
        console.log('Unable to check target status!');
        res.status(500).json({ result: false });
      } else {
        var auth_status = result.auth_status;
        var auth_date = currentDateTime();
        var auth_token = makeAuthToken(pid, auth_date);
        var dev_id = result.dev_id;
        var user_identity = result.requestor;
        var ip_requestor = result.requestor_ip;

        if (auth_status == 'QR_OK') {
          console.log('QR verified, correct!');
          makeSession(
            user_identity,
            auth_date,
            auth_token,
            'AUTH_QR',
            dev_id,
            ip_requestor,
            (makeRes, mode) => {
              console.log(user_identity);
              acc_model.findOne(
                { _id: new mongoose.Types.ObjectId(user_identity) },
                (err, resp) => {
                  if (err) {
                    console.log('Error getting account details!');

                    challenges.deleteOne(
                      { _id: new mongoose.Types.ObjectId(pid) },
                      err => {}
                    );

                    res.status(500).json({ result: false });
                  } else {
                    console.log(resp.name);

                    challenges.deleteOne(
                      { _id: new mongoose.Types.ObjectId(pid) },
                      err => {}
                    );

                    res.status(200).json({
                      result: true,
                      verified: true,
                      fullname: resp.name,
                      punch_mode: mode
                    });
                  }
                }
              );
            }
          );
        } else {
          console.log('Hash incorrect!');
          res.status(200).json({
            result: true,
            verified: false,
            fullname: '',
            punch_mode: ''
          });
        }
      }
    });
  }
});

router.post('/verify_response', (req, res) => {
  if (
    typeof req.body.pid === 'undefined' ||
    typeof req.body.responseIdentity === 'undefined'
  ) {
    console.log('Invalid parameters!');
    res.status(500).json({ result: false });
  } else {
    var pid = req.body.pid;
    var identity = req.body.responseIdentity;

    console.log(pid + ' ' + identity);

    var query = challenges.findOne({ _id: new mongoose.Types.ObjectId(pid) });
    query.select('response_code dev_id requestor requestor_ip');
    query.exec((err, result) => {
      if (err) {
        console.log('Unable to check target status!');
        res.status(500).json({ result: false });
      } else {
        var resp_code = result.response_code;
        var auth_date = currentDateTime();
        var auth_token = makeAuthToken(identity, auth_date);
        var dev_id = result.dev_id;
        var user_identity = result.requestor;
        var ip_requestor = result.requestor_ip;

        const hash = crypto
          .createHash('sha256')
          .update(user_identity + '_' + identity)
          .digest('hex');

        if (new String(resp_code).valueOf() == new String(hash).valueOf()) {
          console.log('Hash verified, correct!');
          makeSession(
            user_identity,
            auth_date,
            auth_token,
            'AUTH_CHALLENGE',
            dev_id,
            ip_requestor,
            (makeRes, mode) => {
              console.log(user_identity);
              acc_model.findOne(
                { _id: new mongoose.Types.ObjectId(user_identity) },
                (err, resp) => {
                  if (err) {
                    console.log('Error getting account details!');

                    challenges.deleteOne(
                      { _id: new mongoose.Types.ObjectId(pid) },
                      err => {}
                    );

                    res.status(500).json({ result: false });
                  } else {
                    console.log(resp.name);

                    challenges.deleteOne(
                      { _id: new mongoose.Types.ObjectId(pid) },
                      err => {}
                    );

                    res.status(200).json({
                      result: true,
                      verified: true,
                      fullname: resp.name,
                      punch_mode: mode
                    });
                  }
                }
              );
            }
          );
        } else {
          console.log('Hash incorrect!');
          res.status(200).json({
            result: true,
            verified: false,
            fullname: '',
            punch_mode: ''
          });
        }
      }
    });
  }
});

router.post('/remove_challenge', (req, res) => {
  if (typeof req.body.pid === 'undefined') {
    console.log('Invalid parameters!');
    res.status(500).json({ result: false });
  } else {
    var pid = req.body.pid;

    var query = challenges.deleteOne(
      { _id: new mongoose.Types.ObjectId(pid) },
      err => {
        if (err) {
          console.log('Unable to remove challenge code');
          res.status(500).json({ result: false });
        } else {
          console.log('Challenge code removed');
          res.status(200).json({ result: true });
        }
      }
    );
  }
});

module.exports = router;

/**
 * @returns {String}
 */
function generateChallengeCode() {
  var min = Math.ceil(min_range);
  var max = Math.floor(max_range);

  var code = Math.floor(Math.random() * (max - min)) + min;
  var formatted = null;

  if (code.toString().length == 6) formatted = String(code);
  else if (code.toString().length == 5) formatted = '0' + String(code);
  else if (code.toString().length == 4) formatted = '00' + String(code);
  else if (code.toString().length == 3) formatted = '000' + String(code);
  else if (code.toString().length == 2) formatted = '0000' + String(code);
  else formatted = '00000' + String(code);

  return formatted;
}

/**
 * @returns {String}
 */
function currentDateTime() {
  var d = new Date();

  var dateStr = formatter(d, 'yyyy-mm-dd HH:MM:ss');

  return dateStr;
}

/**
 * @param {String} requestor
 * @param {String} date
 *
 * @returns {String}
 */
function makeAuthToken(requestor, date) {
  var min = Math.ceil(min_range);
  var max = Math.floor(max_range);

  var code = Math.floor(Math.random() * (max - min)) + min;

  var mix = requestor + '_' + date + '_' + code;

  const hash = crypto
    .createHash('sha256')
    .update(mix)
    .digest('hex');

  return hash;
}

/**
 * @param {String} requestor
 * @param {String} date
 *
 * @returns {String}
 */
function makeSessToken(requestor, date) {
  var min = Math.ceil(min_range);
  var max = Math.floor(max_range);

  var code = Math.floor(Math.random() * (max - min)) + min;

  var mix = 'sess_' + requestor + '_' + date + '_' + code;

  const hash = crypto
    .createHash('sha256')
    .update(mix)
    .digest('hex');

  return hash;
}

/**
 *
 * @param {String} requestor
 * @param {String} date
 * @param {String} auth_token
 * @param {String} auth_type
 * @param {String} dev_id
 * @param {String} ip_addr
 * @param {function(Boolean, Boolean):void} callback
 */
function makeSession(
  requestor,
  date,
  auth_token,
  auth_type,
  dev_id,
  ip_addr,
  callback
) {
  var query = sessions.findOne({ usr_id: requestor }, (err, res) => {
    if (err) {
      console.log('Unable to make session!');
    } else {
      if (res === null) {
        var sess_tok = makeSessToken(requestor, date);
        var sess_time = currentDateTime();

        var insertDocs = new sessions({
          _id: new mongoose.Types.ObjectId(),
          sess_token: sess_tok,
          sess_date: sess_time,
          usr_id: requestor,
          auth_token: auth_token,
          auth_type: auth_type,
          sess_type: 'SESS_PUNCH_IN',
          dev_id: dev_id
        });

        insertDocs.save((err, prod) => {
          var logDocs = new logs({
            _id: new mongoose.Types.ObjectId(),
            log_date: currentDateTime(),
            sess_type: 'SESS_PUNCH_IN',
            sess_date: sess_time,
            sess_token: sess_tok,
            usr_id: requestor,
            usr_ip: ip_addr,
            auth_token: auth_token,
            auth_type: auth_type,
            dev_id: dev_id
          });

          logDocs.save((err2, pro) => {
            if (err2) {
              console.log(err2);
              callback(false, true);
            } else callback(true, true);
          });
        });
      } else {
        var prev_sess = {
          sess_id: res._id,
          sess_token: res.sess_token,
          sess_date: res.sess_date,
          usr_id: requestor,
          auth_token: auth_token,
          auth_type: auth_type,
          sess_type: 'SESS_PUNCH_OUT',
          dev_id: dev_id
        };

        sessions.deleteOne(
          { _id: new mongoose.Types.ObjectId(prev_sess.sess_id) },
          err => {
            var logDocs = new logs({
              _id: new mongoose.Types.ObjectId(),
              log_date: currentDateTime(),
              sess_type: 'SESS_PUNCH_OUT',
              sess_date: prev_sess.sess_date,
              sess_token: prev_sess.sess_token,
              usr_id: requestor,
              usr_ip: ip_addr,
              auth_token: auth_token,
              auth_type: auth_type,
              dev_id: dev_id
            });

            logDocs.save((err2, pro) => {
              if (err2) {
                console.log(err2);
                callback(false, false);
              } else callback(true, false);
            });
          }
        );
      }
    }
  });
}
