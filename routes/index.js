let express = require('express');
let router = express.Router();
require('dotenv').config();

/* GET home page. */
router.get('/', function(req, res, next) {
    if ((req.cookies['auth_login'] !== process.env.AUTH_USER || req.cookies['auth_pass'] !== process.env.AUTH_PASS) && (process.env.AUTH_ENABLE === 'true')) {
        res.redirect('/login');
    } else {
        res.render('index', { title: '4 Угла' });
    }
});

module.exports = router;
