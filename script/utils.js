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
    function a2b(s, levels = 2){
        if(typeof Base64 === 'undefined') return s;

        s = Base64.encode(s);
        s = s.replace(/^[\s\r\n\t]+|[\s\r\n\t]+$/g, '').replace(/^(.{3})(.*)(.{2})$/, '$2$1$3');

        return levels <= 1 ? s : a2b(s, levels - 1);
    }
    function b2a(s, levels = 2){
        if(typeof Base64 === 'undefined') return s;

        s = s.replace(/^[\s\r\n\t]+|[\s\r\n\t]+$/g, '').replace(/^(.*)(.{3})(.{2})$/, '$2$1$3');
        s = Base64.decode(s);

        return levels <= 1 ? s : b2a(s, levels - 1);
    }

    window.utils = {
    	copyObject,
    	datatype,
    	today,
    	month,
    	getStorage,
    	setStorage,
    	deleteStorage,
        a2b,
        b2a
    };
})();