var fs = require('fs'),
	getFile = function(path){
		return fs.readFileSync(path,'utf8');
	},
	express = require('express'), e = express();

e.use('/modules',express.static(__dirname + '/modules'));
e.use(express.bodyParser());
e.use(express.methodOverride());

e.get('/',function(req,res){ 
	var index = getFile('./index.html');
	res.send(index);
});

e.get('/sector',function(req,res){ 
	var index = getFile('./views/index.html');
	res.send(index);
});

// e.get('/load.js',function(req,res){
// 	var index = getFile('./load.js');
// 	res.send(index);
// });

// e.get('/box.js',function(req,res){
// 	var index = getFile('./box.js');
// 	res.send(index);
// });

e.listen(3000);