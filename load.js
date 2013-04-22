(function(global){

	var isReady = false,
		isCEM = (typeof window !== 'undefined' && !!navigator && !!document),
		isOpera = (typeof opera !== 'undefined' && opera.toString() === "[object Opera]"),
		isBrowser = (isCEM || isOpera),
		canWebSocket = (typeof window !== 'undefined' && !!WebSocket),
	    Arr = Array.prototype,
	    Obj = Object.prototype,
	    rootmtchr =/^\.\//,
	    localmtchr = /^file:\/\/$|^file:\/\/\/$/,
	    addrmatchr = [/^(http:\/\/[^\.www])([\w_-]+)([\.\w\W]+)/,/^(http:\/\/www\.)([\w_-]+)([\.\w\W]+)/],
    	isOffline = localmtchr.test(window.location.origin),
	    addedPath = [],
		typeOf = function(o,type){
			var res = ({}).toString.call(o).replace(/\[object /,'').replace(/\]$/,'').toLowerCase();
			if(type) return (res === type);
			return res;
		},
		Splice = function(arg,b,e){
			return Arr.splice.call(arg,b || 0,e || arg.length);
		},
		getKeys = function(o){
			var keys = [];
			for(var i in o){ keys.push(i); }
			return keys;
		},
		eachSync = function(obj,iterator,complete,scope,breaker){
	          if(!iterator || typeof iterator !== 'function') return false;
	          if(typeof complete !== 'function') complete = function(){};


	          var step = 0, keys = getKeys(obj),fuse;

	          // if(typeof obj === 'string') obj = this.values(obj);

	          if(!keys.length) return false;
	          
	          fuse = function(){
	            var key = keys[step];
	            var item = obj[key];

	            (function(z,a,b,c){
	              if(breaker && (breaker.call(z,a,b,c))){ /*complete.call(z);*/ return; }
	              iterator.call(z,a,b,c,function completer(err){
	                  if(err){
	                    complete.call(z,err);
	                    complete = function(){};
	                  }else{
	                    step += 1;
	                    if(step === keys.length) return complete.call(z);
	                    else return fuse();
	                  }
	              });
	           }((scope || this),item,key,obj));
	          };

	          fuse();
	    },
		Promise = (function(){
			var generator = function(fn){

				var fire = function(arr,args,ctx){
					return eachSync(arr,function(e,i,o,c){
						if(e && typeOf(e,'function')) 
							e.apply(ctx,(typeOf(args,'array') ? args : [args]));
						c(false);
					});
				},
				p = { 
					cfg: {
						resolved: false,
						rejected: false,
					},
					state: function(){
						if(this.cfg.resolved && !this.cfg.rejected) return "resolved";
						if(!this.cfg.resolved && this.cfg.rejected) return "rejected";
						if(!this.cfg.resolved && !this.cfg.rejected) return "pending";
					},
					args: [],
					lists:{	done: [],	fail: [],	notify: [] } 
				};

				p.done = function(fn){
					if(this.cfg.resolved && !this.cfg.rejected){ fn.apply(this.args[1],this.args[0]); return this; };
					if(this.lists.done.indexOf(fn) !== -1) return;
					this.lists.done.push(fn);
					return this;
				};

				p.fail = function(fn){
					if(!this.cfg.resolved && this.cfg.rejected){ fn.apply(this.args[1],this.args[0]); return this; };
					if(this.lists.fail.indexOf(fn) !== -1) return;
					this.lists.fail.push(fn);
					return this;
				};

				p.progress = function(fn){
					if(this.cfg.resolved || this.cfg.rejected){ fn.apply(this.args[1],this.args[0]); return this; };
					if(this.lists.notify.indexOf(fn) !== -1) return;
					this.lists.notify.push(fn);
					return this;
				};

				p.then = function(done,fail,notify){
					return this.done(done).fail(fail).progress(notify);
				};

				p.resolveWith = function(args,ctx){
					if(this.cfg.resolved || this.cfg.rejected) return;
					this.cfg.rejected = false;
					this.cfg.resolved = true;
					this.status = "resolved";
					this.args = [args,ctx];
					fire(this.lists.done,args,ctx);
					fire(this.lists.notify,args,ctx);
					return this;
				};

				p.rejectWith = function(args,ctx){
					if(this.cfg.resolved || this.cfg.rejected) return;
					this.cfg.rejected = true;
					this.cfg.resolved = false;
					this.status = "rejected";
					this.args = [args,ctx];
					fire(this.lists.fail,args,ctx);
					fire(this.lists.notify,args,ctx);
					return this;
				};

				p.notifyWith = function(args,ctx){
					if(this.cfg.resolved || this.cfg.rejected) return;
					// this.cfg = "resolved",
					// this.args = [args,ctx];
					fire(this.lists.notify,args,ctx);
					return this;
				};

				p.resolve = function(){
					var args = Arr.splice.call(arguments,0,arguments.length);
					this.resolveWith(args,this);
					return this;
				};
				p.reject = function(){
					var args = Arr.splice.call(arguments,0,arguments.length);
					this.rejectWith(args,this);
					return this;
				};
				p.notify = function(){
					var args = Arr.splice.call(arguments,0,arguments.length);
					this.notifyWith(args,this);
					return this;
				};
				p.isPromise = function(){ return true; };

				if(fn && typeof fn === 'function'){ fn(p); return p; }
				if(fn && typeof fn !== 'function' && fn !== null && fn !== false && fn !== 'undefined') return p.resolve(fn);
				if(typeof fn !== 'function' && fn === false) return p.reject(fn);

				return p;
			};

			return {
				create: function(fn){
					return generator(fn);
				},
				when: function(){
					var args = Arr.splice.call(arguments,0,arguments.length),
					len = args.length,
					counter = 0,
					// set = [],
					argd = [],
					defer = generator();

					eachSync(args,function(e,i,o,c){
						// if(e && typeof e !== 'function') return c(false);
						var a = (e['isPromise'] && e.isPromise()) ? e : generator(e);
						a.then(function(){
							counter += 1;
							if(counter === len) defer.resolve(argd);
						},function(){
							defer.reject(argd);
						},function(){
							var res = Arr.splice.call(arguments,0,arguments.length);
							argd.push(res.length === 1 ? res[0] : res);
						});

						// set.push(a);
						c(false);
					});

					return defer;
				}
			};
		})(),
		isNode = (function(){
			return (
				(typeof process !== 'undefined' && typeof module !== 'undefined') 
					&& (process['title'] === 'node' && typeof module['exports'] !== 'undefined')
					&& (typeof process['execPath'] !== 'undefined' && !!process['execPath'].match(/node$/))
				);
		})(),
	    defaultMeta = {
	    	platform: 'cross',
	    	path: './modules',
	    	offlinePath:"./"
	    },
	    gethostWithLocation = function(current,meta){
	    	if(isBrowser){ 
	    		if(current.match(addrmatchr[0]) || current.match(addrmatchr[1])) return current;
	    		if(current.match(rootmtchr)) current = current.replace(rootmtchr,'');
	    		return ((isOffline ? meta.offlinePath : '').concat(meta.path.concat('/').concat(current))).replace(/\/+/g,'/');
	    	}
	    	if(isNode){
	    		var path = require('path'),
	    			home = path.resolve(current),
	    			sets = home.split('/'),
	    			track = home.split('/');

	    		eachSync(sets,function(e,i,o,n){
	    			var o = path.resolve(track.join('/'),meta.path);
	    			if(addedPath.indexOf(o) !== -1){
		    			module.paths.unshift(o);
		    			addedPath.push(o);
		    		}
	    			track.pop();
	    			n(false);
	    		});
	    		return home;
	    	}
	    },
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

	    };


	    if(isBrowser){

		  // console.log(gethostWithLocation('./sector5/fusion.js',defaultMeta));

		   var ie_xhr = [
	            'Msxml2.XMLHTTP.6.0',
	            'Msxml2.XMLHTTP.3.0',
	            'Microsoft.XMLHTTP'
		    ],
		    domReady = function(fn){
		    	if(isReady) return (fn && typeof fn === 'function' && fn.call(null));
		    	var span = document.createElement('span'),
		    		o = window.setInterval(function(){
		    			if(isReady){ 
		    				window.clearInterval(o); 
							return (fn && typeof fn === 'function' && fn.call(null));
						}
		    			if(document.body){
		    				if(document.body.appendChild(span) && document.body.removeChild(span)) isReady = true;
		    			}
			    	});
		    },
		    Local = {

			    makeScript: function(fn){
			    	var script = document.createElement('script');
			    	script.setAttribute('data-script-loader','loaderjs');
			    	// script.setAttribute('data-loader-git','http://github.com/influx6/loaderjs');
			    	script.onload = script.onreadystatechange = function(){
			    		if(!script.readyState || script.readyState.match(/^loaded$|^completed$/ig)){
			    			if(fn && typeof fn === 'function')  fn.call(null,null,script);
			    			script.onreadystatechange = script.onload = null;
			    		}
			    	};
			    	script.onerror = function(e){
		    			if(fn && typeof fn === 'function') fn.call(null,new Error('Request Failed!'),script);
		    			script.onerror = null;
			    	};
			    	return script;
			    },

			    request: function(url,fn){
			    	var script = this.makeScript(fn);
			    	script.setAttribute('data-url',url);
			    	script.src = url;

			    	return domReady(function(){
				    	document.head.appendChild(script);
			    	});
			    },
		    },
		    RemoteAjax = {
		    // RemoteAjax.request('./box.js',function(s){ console.log('got script:',s);},function(e,s){ console.log('failed',e,s);})	
		    	request: function(url,done,fail){
	    			if(!typeOf(done,'function') && !typeOf(fail,'function')) throw new Error('Require two functions after URL,one function for success and the other for failures!');
		    		var get = this.ajax(url,function(err,args){
		    			if(err) return fail(err,args);
		    			return done(args);
		    		});
		    		return get;
		    	},
			    successCallback: function(http,fn,ms){
			    	if(typeof ms === 'function'){ fn = ms; ms = 10; }
			    	if(!fn || typeof fn !== 'function') fn = function(){};

			    	//we poll
					var poll = window.setInterval(function(){
			    		if(http && http.readyState === 4){
			    			window.clearInterval(poll);
			    			if(http.status === 200) fn(null,http);
			    			else fn(new Error('Request Failed!'),http);
			    		}
			    	},ms || 10);
			    },
		    	xhr: function(){
			    	if(window.XMLHttpRequest){ return (this.xhr = function(){ return new window.XMLHttpRequest(); }); };
			    	var a,c, cache = function(){ return new window.ActiveXObject(c); };
		    		try{
		    			c = ie_xhr[0];
		    			a = new window.ActiveXObject(c);
		    			loadRemote.xhr = cache;
		    		}
		    		catch(e){
			    		try{
			    			c = ie_xhr[1];
			    			a = new window.ActiveXObject(c);
			    			loadRemote.xhr = cache;
			    		}
			    		catch(e){
				    		try{
				    			c = ie_xhr[2];
				    			a = new window.ActiveXObject(c);
				    			loadRemote.xhr = cache;
				    		}
				    		catch(e){
				    			throw new Error('Ajax Unsupported!');
				    		}
			    		}
		    		}

		    		delete a;
			    }(),
			    ajax: function(url,fn,headers){
			    	var http = this.xhr();
			    	http.open('GET',url,true);
			    	this.successCallback(http,fn);
			    	http.send(null);
			    	return http;
			    }
		    },
		    RemoteSocket = {
		    	request: function(){},
		    	socket: function(uri){
		    		return new WebSocket(uri);
		    	},
		    },
		    Remote = (function(){
	    		//we feature test which methods is best suitable for grabbing remote sources
	    		//but for now we just return ajax

	    		// if(window['WebSocket']) return RemoteSocket;
	    		return RemoteAjax;

		    }()),
		    Package = function(uri,meta){
		    	var defer = Promise.create(),pkg,origin,usingHttp,useScipt;

		    	pkg = gethostWithLocation(uri,meta);
		    	origin = window.location.origin;
		    	usingHttp = uri.match(addrmatchr[0]) || uri.match(addrmatchr[1]);

		    	useScipt = (rootmtchr.test(uri) || localmtchr.test(origin) /*|| (usingHttp && usingHttp[2] !== origin)*/);
		    	console.log(usingHttp,useScipt)
		    	if(useScipt){
		    		Local.request(pkg,function(err,script){
		    			if(err) return defer.reject(err,script);
		    			defer.resolve(script);
		    		});
		    	}else{
		    		Remote.request(pkg,function(http){
		    			// script.text = http.responseText;
			    		return domReady(function(){
				    		// Local.request(pkg,function(err,script){
				    		// 	// if(err) return defer.reject(err,script);
				    		// 	defer.resolve(script);
				    		// });
			    			var script = Local.makeScript();
			    			script.text = http.responseText;
			    			script.onerror = null;
					    	document.head.appendChild(script);
			    			defer.resolve(script,http);
				    	});	
		    		},function(err,http){
		    			defer.reject(err,http);
		    		});
		    	}

		    	return defer;
		    },
		    Usage = function(){
			console.log('LoadjS Usage:','\n',
		  		'\t to use loadjs to work properly on both browser and nodejs','\n',
		  		'\t,simple paste this at the top of each of your js file that uses load','\n',
		  		"\t 'load = (typeof load === 'undefined' ? require('./load') : load);' \n",
		  		'\t with this simple call load as usual!','\n','\t eg:','\n',
		  		'\t if BrowserSide: as a means of simplifying lifes,i opted that loaded/required scripts will run as \n',
		  		'as usual,so no named arguments on the callback function when you load scripts like with the node based \n ',
		  		"option as will be soon showned, for eg \n ",
			  	"	<!doctype html>\n",
				"	<html>\n ",
				"	<head>\n ",
				"		<title>RequireJS Sanity Check!</title>\n ",
				"		<script type='text/javascript' src='./load.js'></script>\n ",
				"		<script type='text/javascript'>\n ",
				"		when using load, if the script location is preceded with a ",
				"		load('fusion.js','jock.js',function(/* there will be no passed arguments,simple expose to global object as usual */){ ",
				"				//code ... will be runned once all are loaded ",
				"		},/*optional meta object*/{ ",
				"			path:'./assets', //allows you to change the default location to look for scripts ",
				"			platform: 'web'","//the platform option defaults to 'cross',which is short for crossplatform(meaning it will run on both node and the web) \n but if to explicitly set it for node \n then set it as node or console and for only web,simple as browser or web",
				"		}); ",
				"		</script>\n ",
				"	</head>\n ",
				"	<body>\n ",
				"	</body>\n ",
				"	</html>\n ",
		  		'\n',
		  		'\t ');
		    },
		    e = { 
		    	util: {
		    		typeOf: typeOf,
		    		splice: Splice
		    	},
		    	usage: Usage,
		    	package: Package,
		    	remoteOptions:{ ajax: RemoteAjax, socket: RemoteSocket },
		    	Remote: Remote,
		    	promise: Promise,
			};

		 	global.module = e;
		 	global.require = function(){};
		 	global.load = load;
	    };


	  if(isNode) module.paths.unshift(require('path').resolve('.','./modules'));

	  function load(){
	  	
	  	var args = Splice(arguments),
	  		count = 0,
	  		loaded = [],
	  		meta = (typeOf(args[args.length - 1],'object') ? Splice(args,-1,arguments.length)[0] : defaultMeta );
	  		fn = (typeOf(args[args.length - 1],'function') ? Splice(args,-1,arguments.length)[0] : function(){});

	  	if(!fn || !typeOf(fn,'function')) throw new Error('please ensure to supply a function after listing the libraries you wish to load');


	  	if(!meta['platform']) meta.platform = 'cross';
	  	if(!meta['path']) meta.path = './modules';
	  	if(!meta['path'].match(/^\.+\//)) meta.path = (('./').concat(meta.path)).replace(/\/+/g,'/');

	  	if(isNode && (meta.platform.match(/^cross$|^node$|^console$/))){
	  		gethostWithLocation('./',meta);
	  		if(fn && typeOf(fn,'function')) eachSync(args,function(e,i,o,n){
	  			loaded.push(require(e)); 
	  			n(false);
	  		},function(){ if(fn) fn.apply({ meta: meta },loaded); });
	  		return;
	  	}


	  	if(isBrowser && (meta.platform.match(/^cross$|^browser$|^web$/))){
		  	if(isOffline && !meta['offlinePath']) throw new Error('Please supply a OfflinePath absolute path to your website root folder in your meta object,as you are offline,');
		  	if(!isOffline && meta['offlinePath']) delete meta.offlinePath;
		  	var when;
	  		if(fn && typeOf(fn,'function')) eachSync(args,function(e,i,o,n){
	  			loaded.push(Package(e,meta));
	  			n(false);
	  		},function(){ 
	  			when = Promise.when.apply(Promise,loaded);
	  			when.done(function(){
	  				var args = Splice(arguments);
	  				fn.apply({ meta: meta },args); 
	  			});
	  		});
	  		return when;
	  	}
	  };

	  // Local.request('./box.js',function(e,s){ console.log('got',e,s); })
	 //expose require and exports to the environments
	 if(isNode){
	 	load.Usage = Usage;
	 	module.exports = load;
	 };

})(this);
