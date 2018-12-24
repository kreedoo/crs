;(function(){
	function copyObject(obj){
		return JSON.parse(JSON.stringify(obj));
	}
    function datatype(obj){
        return Object.prototype.toString.apply(obj)
            .toLowerCase()
            .replace('[object ', '')
            .replace(']', '');
    }
    function today(){
    	let dateObject = new Date();
    	let Y = dateObject.getFullYear();
    	let M = dateObject.getMonth() + 1;
    	let D = dateObject.getDate();

    	return Y + '-' + (M < 10 ? '0' : '') + M + '-' + (D < 10 ? '0' : '') + D;
    }
    function month(){
    	let dateObject = new Date();
    	let Y = dateObject.getFullYear();
    	let M = dateObject.getMonth() + 1;

    	return Y + '-' + (M < 10 ? '0' : '') + M;
    }
    function getStorage(key){
    	let jg = window.localStorage.getItem(key);
    	return jg && JSON.parse(jg);
    }
    function setStorage(key, value){
    	return window.localStorage.setItem(key, JSON.stringify(value));
    }
    function deleteStorage(key){
    	return window.localStorage.removeItem(key);
    }
    function base64(s){
        return window.btoa(unescape(encodeURIComponent(s)));
    }

    window.utils = {
    	copyObject,
    	datatype,
    	today,
    	month,
    	getStorage,
    	setStorage,
    	deleteStorage,
        base64
    };
})();