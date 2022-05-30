let express = require('express');
const createError = require("http-errors");
let router = express.Router();

require('dotenv').config();

/* Get login page */
router.get('/', function (req, res, next) {
   if (process.env.AUTH_ENABLE === "true") {
      if (req.cookies['auth_login'] === process.env.AUTH_USER || req.cookies['auth_pass'] === process.env.AUTH_PASS) {
         res.redirect('/');
      }

      if (req.query['login'] === process.env.AUTH_USER && req.query['password'] === process.env.AUTH_PASS) {
         console.log('ok');
         res.cookie('auth_login', req.query['login'], {
            maxAge: 3600+3600*24*7,
         });
         res.cookie('auth_pass', req.query['password'], {
            maxAge: 3600+3600*24*7,
         });
         res.redirect('/');
      }

      res.render('login', { title: 'Авторизация' });
   } else {
      next(createError(404));
   }
});

module.exports = router;