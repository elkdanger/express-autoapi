var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
	res.send({
		message: 'This is a sub route'
	});
});

module.exports = router;