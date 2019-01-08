;(function(){
	class Database {
		constructor(structures, initDatafrom){
			this.tableNames = []; // 表的名称列表
			this.structures = {}; // 表的结构
			this.uniqueCode = {}; // 表的唯一字段
			this.tableData = {}; // 表的数据列表
			this.tableNextId = {}; // 表的下一个ID

			this.mapping = {}; // 表的索引

			this.init(structures, initDatafrom);
		}
		init(structures = [], initDatafrom){
			if(initDatafrom === 'storage' && utils.getStorage('structures') !== null){ // from window.localStorage
				this.tableNames = utils.getStorage('tableNames') || [];
				this.structures = utils.getStorage('structures') || {};
				this.uniqueCode = utils.getStorage('uniqueCode') || {};
				this.tableData = utils.getStorage('tableData') || {};
				this.tableNextId = utils.getStorage('tableNextId') || {};

				this.tableNames.forEach(tableName => {
					this._createMapping(tableName);
				});
			}else{
				structures.forEach(item => {
					this.tableNames.push(item.name);
					this.structures[item.name] = item.fields;
					this.uniqueCode[item.name] = [];
					this.tableData[item.name] = [];
					this.tableNextId[item.name] = 0;
					this.mapping[item.name] = {};

					for(let n in item.fields){
						if(item.fields.hasOwnProperty(n) && item.fields[n].isUnique){
							this.uniqueCode[item.name].push(n);
						}
					}

					if(item.initData && item.initData.length > 0){
						item.initData.forEach(data => {
							this.insert(item.name, data);
						});
					}
				});
			}
		}
		generateFieldData(tableName, data){
			if(!this.hasTable(tableName)){
				throw new Error('code000:数据表“' + tableName + '”不存在！');
			}
			let structure = this.structures[tableName];
			let fieldData = {};
			for(let key in structure){
				if(structure.hasOwnProperty(key)){
					fieldData[key] = '';
				}
			}
			for(let key in data){
				if(!data.hasOwnProperty(key)) continue;
				if(structure.hasOwnProperty(key)){
					if(structure[key].isNull !== true && data[key] === ''){
						throw new Error('code001:字段“' + structure[key].note + '”，不应该是空值！');
					}
					if(structure[key].isUnique){
						if(this.has(tableName, data[key])){
							throw new Error('code002:' + structure[key].note + '：“' + data[key] + '”已经存在！');
						}
					}
					if(structure[key].type.indexOf(utils.datatype(data[key])) === -1){
						throw new Error('code003:字段“' + structure[key].note + '”数据类型错误啦！');
					}

					fieldData[key] = data[key];
				}else{
					throw new Error('code004:字段“' + structure[key].note + '”可能不存在!');
				}
			}

			return fieldData;
		}
		_isUniqueCode(tableName, fieldName){
			return !!this.structures[tableName][fieldName].isUnique;
		}
		_isNull(tableName, fieldName){
			return !!this.structures[tableName][fieldName].isNull;
		}
		_createMapping(tableName){
			if(this.hasTable(tableName)){
				this.mapping[tableName] = {};
				this.tableData[tableName].forEach((item, index) => {
					if(typeof this.mapping[tableName][item.id] === 'undefined'){
						this.mapping[tableName][item.id] = index;
					}
					this.uniqueCode[tableName].forEach(uniqueCode => {
						if(uniqueCode !== 'id' && typeof this.mapping[tableName][item[uniqueCode]] === 'undefined'){
							this.mapping[tableName][item[uniqueCode]] = index;
						}
					});
				});
			}
		}
		hasTable(tableName){
			return typeof this.structures[tableName] !== 'undefined';
		}
		has(tableName, uniqueCode){
			if(this.hasTable(tableName)){
				return typeof this.mapping[tableName][uniqueCode] !== 'undefined';
			}

			return false;
		}

		// -1: repeat, 0: false, 1: true
		insert(tableName, data){
			if(this.hasTable(tableName)){
				data.id = typeof data.id === 'undefined' ? this.tableNextId[tableName] : data.id;

				try {
					let fieldData = this.generateFieldData(tableName, data);
					this.tableData[tableName].push(fieldData);
					this.tableNextId[tableName]++;

					return {code: 'code005', content: '添加成功！'};
				}catch(e){
					let matches = e.toString().match(/^Error: (code\d+):(.*)$/);
					return {code: matches[1], content: matches[2]};
				}
			}

			return {code: 'code006', content: '添加失败！'};
		}

		// 0: false, 1: true
		delete(tableName, id){
			if(this.hasTable(tableName)){
				let index = this.mapping[tableName][id];
				this.tableData[tableName].splice(index, 1);

				return {code: 'code005', content: '删除成功！'};
			}

			return {code: 'code006', content: '删除失败！'};
		}
		select(tableName, conditions){
			if(this.hasTable(tableName)){
				if(typeof conditions !== 'function'){
					return this.tableData[tableName];
				}else{
					return this.tableData[tableName].filter(item => {
						return conditions.apply(this, [item]);
					});
				}
			}

			return [];
		}

		// -1: repeat, 0: false, 1: true
		update(tableName, id, data){
			if(this.hasTable(tableName)){
				let index = this.mapping[tableName][id];
				let tableData = this.tableData[tableName][index];

				for(let fieldName in data){
					if(data.hasOwnProperty(fieldName) && fieldName !== 'id' && tableData.hasOwnProperty(fieldName)){
						tableData[fieldName] = data[fieldName];
					}
				}

				this.tableData[tableName][index] = tableData;

				return {code: 'code005', content: '修改成功！'};
			}

			return {code: 'code006', content: '修改失败！'};
		}

		reset(){
			this.tableNames.forEach(tableName => {
				this.mapping[tableName] = {};
				this.tableData[tableName] = [];
				this.tableNextId[tableName] = 0;
			});

			this.save();
		}
		save(){
			utils.setStorage('tableNames', this.tableNames); // 表的名称列表
			utils.setStorage('structures', this.structures); // 表的结构
			utils.setStorage('uniqueCode', this.uniqueCode); // 表的唯一字段
			utils.setStorage('tableData', this.tableData); // 表的数据列表
			utils.setStorage('tableNextId', this.tableNextId); // 表的下一个ID

			this.tableNames.forEach(name => {
				this._createMapping(name);
			});
		}
	}

	function initCRSDB(){
		var $crsdb = new Database([
			{
				name: 'products',
				fields: {
					id: { isUnique: true, type: 'number', note: '产品ID' },
					name: { type: 'string', note: '产品名称(回奶、通乳、熏蒸、骨盆修复)' },
					price: { type: 'array', note: '产品定价和抽成点数' }
				},
				initData: [
					{
						name: '回奶',
						price: [
							[200, 40]
						]
					},
					{
						name: '通乳',
						price: [
							[300, 100]
						]
					},
					{
						name: '熏蒸',
						price: [
							[39, 20]
						]
					},
					{
						name: '骨盆修复',
						price: [
							[39, 20]
						]
					}
				]
			},
			{
				name: 'customers',
				fields: {
					id: { isUnique: true, type: 'number', note: '客户ID' },
					name: { type: 'string', note: '客户名' },
					introducer: { type: 'string', note: '介绍人', isNull: true },
					telephone: { isUnique: true, type: 'number', note: '电话' },
					address: { type: 'string', note: '地址', isNull: true },
					deliveryDate: { type: 'string', note: '分娩日期' }
				}
			},
			{
				name: 'deals',
				fields: {
					id: { isUnique: true, type: 'number', note: '交易ID' },
					customerId: { type: 'number', note: '客户ID' },
					dealDate: { type: 'string', note: '交易日期' },
					products: { type: 'array', note: '产品' },
					quantity: { type: 'number', note: '数量' },
					status: { type: 'string', note: '交易状态' }, // 成交、失单、其他情况
					comment: { type: 'string', note: '备注', isNull: true },
					trafficAllowance: { type: 'string,number', note: '交通补贴', isNull: true },
					companyAllowance: { type: 'string,number', note: '公司补贴', isNull: true }
				}
			},
			{
				name: 'settings',
				fields: {
					id: { isUnique: true, type: 'number', note: '配置ID' },
					key: { isUnique: true, type: 'string', note: '键值' },
					name: { type: 'string', note: '配置名称' },
					value: { type: 'string,number', note: '配置值' }
				},
				initData: [
					{
						key: 'failAllowance',
						name: '失单补贴',
						value: 20
					}
				]
			}
		], 'storage');

		$crsdb.save();
		window.$crsdb = $crsdb;
	}

	window.$crsdb = null;
	window.initCRSDB = initCRSDB;
})();