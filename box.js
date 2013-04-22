load = (typeof load === 'undefined' ? require('./load') : load);
var box = load('fs','http',function(fs,http){
	console.log(module.paths);
},{
	platform:'console',
	path:'module'
});


