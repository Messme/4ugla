let express = require('express');
let router = express.Router();

/* GET info page */
router.get('/', function(req, res, next) {
  res.send('ООО "КЛИК" Пермь <br> Разработчик: Орлов Александр Ильич <br> "4 Угла" Copyright 2022');
});

module.exports = router;
