(function(global){

	var isReady = false,
		isCEM = (typeof window !== 'undefined' && !!navigator && !!document),
		isOpera = (typeof opera !== 'undefined' && opera.toString() === "[object Opera]"),
		isBrowser = (isCEM || isOpera),
		isNode = (function(){
			return (
				(typeof process !== 'undefined' && typeof module !== 'undefined') 
					&& (process['title'] === 'node' && typeof module['exports'] !== 'undefined')
					&& (typeof process['execPath'] !== 'undefined' && !!process['execPath'].match(/node$/))
				);
		})(),
		defProperty = function(obj,name,fns,properties){
	      if(!obj || !name || typeof fns !== 'object') return; 
	      
	      if(!fns['get']) fns.get = function(){};
	      if(!fns['set']) fns.set = function(){};

	       if(!("defineProperty" in Object) && Object.__defineGetter__ && Object.__defineSetter__){
	        if(fns.get) obj.__defineGetter__(name,fns.get);
	        if(fns.set) obj.__defineSetter__(name,fns.set);
	        if(properties) obj.defineProperty(name,properties);
	        return;
	      }

	      return Object.defineProperty(obj,name,{
	        get: fns.get, set: fns.set
	      },properties);

	    },
	    paths = [
	    	'./assets/js',
		    './modules/js',
		    './modules',
		    './assets',
		    './'
	    ],
	    arr = Array.prototype,
	    obj = Object.prototype,
	    e = {
			exports : null,
			require : function(package){},
			loaded: {},
			paths: paths
	    };

	 //expose require and exports to the environments
	 if(!isNode && isBrowser){	
	 	global.module = e;
	 	global.exports = e.exports; 
	 	global.require = e.require; 
	 };

})(this);
