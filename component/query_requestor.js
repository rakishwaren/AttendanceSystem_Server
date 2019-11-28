var router = require('express').Router();

router.use(function timeLog(req, res, next) {
  console.log('[Express Server] Access requestor - Time: ', Date.now());
  next();
});

module.exports = router;
