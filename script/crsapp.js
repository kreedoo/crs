;(function(){
	window.onload = function(){
		let html = document.documentElement;
		let loading = document.getElementById('page-loading');

		html.className = html.className.replace(/loading/, '');

		loading.parentNode.removeChild(loading);
	};

	var isCustom = window.location.href.indexOf('custom=1') > -1;

	var app = new Vue({
		el: '#app',
		data(){
			return {
				initdatacontent: '',
				inittype: 'cover', // cover/merge

				// nav
				navItems: [
					{
						id: 'deals',
						name: '订单'
					},
					{
						id: 'products',
						name: '产品'
					},
					{
						id: 'customers',
						name: '客户'
					},
					/*{
						id: 'settings',
						name: '配置'
					},*/
					{
						id: 'initdata',
						name: '初始化'
					}
				],
				currentNavItem: isCustom ? 'initdata' : 'deals',

				// prompt
				showedPrompt: false,
				editingMode: false,

				// product
				products: [],
				product: {},

				// customer
				customers: [],
				customer: {},

				// deal
				deals: [],
				deal: {},

				// setting
				settings: [],
				setting: {},

				statusMapping: {
					success: '成交',
					fail: '失单',
					other: '其他情况'
				},

				filterList: [
					{ id: 'month', name: '月份', selected: false},
					{ id: 'all', name: '全部', selected: false },
					{ id: 'introducer', name: '推荐人', selected: false },
					{ id: 'address', name: '地址', selected: false },
					{ id: 'status', name: '订单状态', selected: false },
					{ id: 'telephone', name: '电话', selected: false },
					{ id: 'name', name: '姓名', selected: false },
					{ id: 'products', name: '产品', selected: false}
				],
				filters: [],
				filterSort: {
					field: 'id', // id, name, deliveryDate, telephone, address, introducer, quantity, dealDate, companyAllowance, trafficAllowance
					type: 'desc'
				},

				message: {
					opened: false,
					hasButton: false,
					content: '',
					callback: null
				},

				dealsSearchResult: []
			};
		},
		computed: {
			isCustom(){
				return isCustom;
			},
			navItemsMapping(){
				let mapping = {};
				this.navItems.forEach(item => {
					mapping[item.id] = item;
				});

				return mapping;
			},
			productsMapping(){
				return this.createMapping('products');
			},
			customersMapping(){
				return this.createMapping('customers');
			},
			dealsMapping(){
				return this.createMapping('deals');
			},
			settingsMapping(){
				return this.createMapping('settings');
			},
			filtersListMapping(){
				return this.createMapping('filterList');
			},

			allPoints(){
				let rs = this.calcTotalAllPoints();
				return rs;
			}
		},
		created(){
			this.updateDataFromDB();

			this.resetProduct();
			this.resetCustomer();
			this.resetDeal();

			this.addFilterCondition();
			this.searchDeals();
		},
		watch: {
			currentNavItem(val){
				if(val === 'deals'){
					this.searchDeals();
				}
			},
			'deal.status'(val){
				if(val === 'other'){
					this.initDealProducts();
					this.deal.trafficAllowance = '';
				}else if(val === 'success'){
					this.deal.comment = '';
				}
			},
			'customer.telephone'(val){
				val = val.toString();
				if(val.length > 11){
					this.customer.telephone = parseInt(val.slice(0, 11), 10);
				}
			}
		},
		methods: {
			doFilterTypeChange(filter){
				this.filters = this.filters.map(item => {
					if(item.type === filter.type){
						if(filter.type === 'month'){
							item.value = utils.month();
						}else if(filter.type === 'status'){
							item.value = 'success';
						}else{
							item.value = '';
						}
					}

					return item;
				});

				let ids = this.filters.map(item => item.type);

				this.filterList = this.filterList.map(item => {
					item.selected = ids.indexOf(item.id) > -1;

					return item;
				});
			},
			exportdata(){
				this.initdatacontent = JSON.stringify(window.localStorage);
				this.exportJSON();
			},
			importdata(){
				let x = this.initdatacontent;
				x = x.replace(/^\s+/g, '').replace(/\s+$/g, '');
				if(x === ''){
					return this.msgOpen('不能为空，请输入数据！');
				}

				let obj = JSON.parse(x);
				for(let key in obj){
					if(obj.hasOwnProperty(key)){
						window.localStorage[key] = obj[key];
					}
				}
				this.updateDataFromDB();
				this.initdatacontent = '';
			},
			updateDataFromDB(){
				$crsdb.tableNames.forEach(tableName => {
					this[tableName] = $crsdb.select(tableName);
				});
			},
			emptydb(){
				$crsdb.reset();
				this.updateDataFromDB();
			},
			createMapping(type){
				let ids = {};
				this[type].forEach((item, index) => {
					ids[item.id] = item;
				});

				return ids;
			},

			setFilterCondition(){
				let id = this.filterList.filter(item => !item.selected).map(item => item.id);

				id = id[0];

				let filter;

				if(id){
					filter = {
						type: id,
						value: id === 'month' ? utils.month() : ''
					};
				}

				return filter;
			},
			addFilterCondition(){
				let list = [...this.filters];
				let filter = this.setFilterCondition();

				if(filter){
					list.push(filter);

					this.filters = list;

					this.filtersListMapping[filter.type].selected = true;
				}
			},
			deleteFilterCondition(index){
				let list = [...this.filters];
				let filter = list[index];
				list.splice(index, 1);

				this.filters = list;

				this.filtersListMapping[filter.type].selected = false;
			},
			search(tableName, conditions, list){
				list = utils.datatype(list) === 'array' ? list : this[tableName];
				let rs = [];
				if(utils.datatype(conditions) === 'function'){
					rs = list.filter(item => {
						return conditions.apply(this, [item]);
					});
				}else{
					rs = [...list];
				}
				rs.sort((a, b) => {
					let f = this.filterSort;
					let x1;
					let x2;

					if(['name', 'deliveryDate', 'telephone', 'address', 'introducer'].indexOf(f.field) > -1){
						let ac = this.customersMapping[a.customerId];
						let bc = this.customersMapping[b.customerId];
						x1 = ac[f.field];
						x2 = bc[f.field];
					}else if(f.field === 'quantity'){
						x1 = a.products.length;
						x2 = b.products.length;
					}else{
						x1 = a[f.field];
						x2 = b[f.field];
					}

					if(f.type === 'desc'){
						return x2 > x1 ? 1 : (x2 < x1 ? -1 : 0);
					}else{
						return x1 > x2 ? 1 : (x1 < x2 ? -1 : 0);
					}
				});

				return rs;
			},
			searchDeals(filters, times = 0){
				filters = utils.datatype(filters) !== 'array' ? utils.copyObject(this.filters) : filters;
				let f = filters.shift();
				// let f = this.filters[0];
				let rs = [];
				let list = times > 0 ? this.dealsSearchResult : undefined;

				if(f.type === 'all'){
					rs = this.search('deals', undefined, list);
				}else if(f.type === 'month'){
					let re = new RegExp('^' + f.value);
					rs = this.search('deals', function(item){
						return f.value === '' ? false : re.test(item.dealDate);
					}, list);
				}else if(f.type === 'status'){
					rs = this.search('deals', function(item){
						return item.status === f.value;
					}, list);
				}else if(f.type === 'products'){ // blank multiple
					rs = this.search('deals', function(item){
						let re = new RegExp(f.value.replace(/\s+/g, '|'))
						let pros = $crsdb.select('products', function(x){
							return f.value === '' ? false : re.test(x.name);
						}).map(x => x.id);
						let ids = item.products.filter(p => pros.indexOf(p.id) > -1).map(p => p.id);
						return ids.length > 0;
					}, list);
				}else if(['telephone', 'introducer', 'address', 'name'].indexOf(f.type) > -1){ // blank multiple
					let re = new RegExp(f.value.toString().replace(/\s+/g, '|'));

					let c = $crsdb.select('customers', function(x){
						return f.value === '' ? false : re.test(x[f.type]);
					});
					c = c.map(x => x.id);
					rs = this.search('deals', function(item){
						return c.indexOf(item.customerId) > -1;
					}, list);
				}

				this.dealsSearchResult = rs.map(item => {
					item.openedDetail = false;

					return item;
				});

				if(filters.length > 0){
					this.searchDeals(filters, times + 1);
				}
			},
			startToSearch(){
				this.searchDeals();
			},
			toggleDealDetail(index){
				let list = [...this.dealsSearchResult];
				list[index].openedDetail = !list[index].openedDetail;
				this.dealsSearchResult = list;
			},
			initDealProducts(){
				this.deal.products = this.products.map((item, index) => {
					let p = item.price[0];
					return {
						id: item.id,
						name: item.name,
						price: p[0],
						quantity: index === 2 || index === 3 ? 3 : 1,
						selected: false
					};
				});
			},
			resetProduct(){
				let p = null;
				if(this.editingMode !== false){
					p = this.productsMapping[this.editingMode];
				}

				this.product = p ? {
					name: p.name,
					price: p.price
				} : {
					name: '',
					price: [
						['', '']
					]
				};
			},
			resetCustomer(id){
				let c = null;
				if(this.editingMode !== false){
					c = this.customersMapping[this.editingMode];
				}

				this.customer = c ? {
					name: c.name,
					introducer: c.introducer,
					telephone: c.telephone,
					address: c.address,
					deliveryDate: c.deliveryDate
				} : {
					name: '',
					introducer: '',
					telephone: '',
					address: '',
					deliveryDate: utils.today()
				};
			},
			resetSetting(){
				let s = null;
				if(this.editingMode !== false){
					s = this.settingsMapping[this.editingMode];
				}

				this.setting = s ? {
					name: s.name,
					value: s.value
				} : {
					name: '',
					value: ''
				};
			},
			resetDeal(){
				let d = null;
				if(this.editingMode !== false){
					d = this.dealsMapping[this.editingMode];
				}

				if(d){
					let c = this.customersMapping[d.customerId];

					this.customer = {
						name: c.name,
						introducer: c.introducer,
						telephone: c.telephone,
						address: c.address,
						deliveryDate: c.deliveryDate
					};

					this.deal = {
						newCustomer: true,
						customerId: d.customerId,
						dealDate: d.dealDate,
						products: [],
						status: d.status,
						comment: d.comment,
						trafficAllowance: d.trafficAllowance,
						companyAllowance: d.companyAllowance
					};
					this.initDealProducts();

					this.deal.products = this.deal.products.map(item => {
						let x = d.products.filter(dp => dp.id === item.id);

						if(x.length > 0){
							item.price = x[0].price;
							item.quantity = x[0].quantity;
							item.selected = true;
						}

						return item;
					});
				}else{
					this.resetCustomer();

					this.deal = {
						newCustomer: true,
						customerId: '',
						dealDate: utils.today(),
						products: [],
						status: 'success',
						comment: '',
						trafficAllowance: '',
						companyAllowance: ''
					};
					this.initDealProducts();
				}
			},
			reset(tableName){
				if(typeof tableName === 'undefined'){
					tableName = this.currentNavItem;
				}

				if(tableName === 'products'){
					this.resetProduct();
				}else if(tableName === 'deals'){
					this.resetDeal();
				}else if(tableName === 'customers'){
					this.resetCustomer();
				}else if(tableName === 'settings'){
					this.resetSetting();
				}else{
					this.resetProduct();
					this.resetCustomer();
					this.resetDeal();
					this.resetSetting();
				}
			},
			calcYourPoint(deal){
				let mapping = deal.products.map(p => p.id);

				let point = 0;
				this.products.forEach(p => {
					let pointsMapping = {};
					p.price.forEach(x => {
						pointsMapping[x[0]] = x[1];
					});
					let mappingIndex = mapping.indexOf(p.id);
					if(mappingIndex > -1){
						let pro = deal.products[mappingIndex];
						let singlePoint = pointsMapping[pro.price] || 0;
						point += (singlePoint < 1 ? singlePoint * pro.price : singlePoint) * pro.quantity;
					}
				});

				return point;
			},
			openPrompt(){
				this.showedPrompt = true;
				this.reset(this.currentNavItem);
			},
			closePrompt(){
				this.showedPrompt = false;
				if(this.editingMode !== false){
					this.editingMode = false;
					this.reset(this.currentNavItem);
				}
			},
			addPriceRule(){
				let pro = utils.copyObject(this.product);
				pro.price.push(['', '']);

				this.product = pro;
			},
			deletePriceRule(index){
				let pro = utils.copyObject(this.product);
				pro.price.splice(index, 1);

				this.product = pro;
			},
			edit(id){
				this.openPrompt();
				if(typeof id !== 'undefined'){
					this.editingMode = id;
					this.reset();
				}
			},

			doDelete(id){
				if(typeof id !== 'undefined'){
					let tableName = this.currentNavItem;
					let tableNameCN = this.navItemsMapping[tableName].name;
					let itemName = this[tableName + 'Mapping'][id];
					if(tableName !== 'deals'){
						itemName = itemName.name;
					}else{
						let cId = itemName.customerId;
						itemName = this.customersMapping[cId];
						itemName = itemName.name;
					}

					let msg = '';
					if(tableName === 'deals'){
						msg = '<p>您确定要删除<strong>' + itemName + '的' + tableNameCN + '编号为[' + id + ']的订单</strong>吗？</p>';
					}else{
						msg = '<p>您确定要删除<strong>' + tableNameCN + '[' + itemName + ']</strong>吗？</p>';
					}

					if(tableName === 'customers'){
						msg += '<p>和该<strong>' + tableNameCN + '</strong>相关的订单都会删除哦？</p>';
						msg += '<p><strong>请您再三确认！</strong></p>';
					}

					this.msgOpen(msg, true, () => {
						let additionalTableName = 'deals';
						if(tableName === 'customers'){
							$crsdb.select(additionalTableName, function(item){
								return item.customerId === id;
							}).forEach(item => {
								$crsdb.delete(additionalTableName, item.id);
							});
						}

						let msg = $crsdb.delete(tableName, id);
						if(msg.code !== 'code005'){
							this.msgOpen(msg.content);
						}

						$crsdb.save();

						if(tableName === 'customers'){
							this[additionalTableName] = $crsdb.select(additionalTableName);
						}
						this[tableName] = $crsdb.select(tableName);

						this.startToSearch();
					});
				}
			},

			validateProduct(){
				if(this.product.name === ''){
					return this.msgOpen('产品名称不能是空，请输入产品名称！');
				}

				for(let i = 0, len = this.product.price.length; i < len; i++){
					let item = this.product.price[i];
					let index = i + 1;

					if(item[0] === ''){
						return this.msgOpen('<p>价格规则' + index + '：</p><p>产品价格不能是空，请输入产品价格！</p>');
					}
					if(item[1] === ''){
						return this.msgOpen('<p>价格规则' + index + '：</p><p>抽成点数不能是空，请输入抽成点数！</p>');
					}
				}

				return true;
			},

			validateCustomer(){
				if(this.customer.name === ''){
					return this.msgOpen('姓名不能是空，请输入姓名！');
				}
				if(this.customer.telephone === ''){
					return this.msgOpen('电话不能是空，请输入电话号码！');
				}else{
					let phone = this.customer.telephone;
					if(!/^1[3456789]\d\d{8}$/.test(phone)){
						return this.msgOpen('电话号码不正确，请输入正确的11位手机号码！');
					}
				}

				return true;
			},

			validateDeal(){
				if(!this.deal.newCustomer){
					if(this.deal.customerId === ''){
						return this.msgOpen('请选择客户！');
					}
				}else{
					if(this.validateCustomer() !== true){
						return;
					}
				}

				if(this.deal.status === 'success'){
					let list = this.deal.products.filter(p => p.selected);
					if(list.length === 0){
						return this.msgOpen('请选择产品！');
					}
				}

				return true;
			},

			validateSetting(){
				if(this.setting.name === ''){
					return this.msgOpen('配置名称不能是空，请输入名称！');
				}
				if(this.setting.value === ''){
					return this.msgOpen('配置内容不能是空，请输入内容！');
				}

				return true;
			},

			doUpdate(){
				let tableName = this.currentNavItem;

				if(tableName === 'products'){
					if(this.validateProduct() !== true) return;

					if(this.editingMode === false){
						$crsdb.insert(tableName, this.product);
					}else{
						$crsdb.update(tableName, this.editingMode, this.product);
					}
				}else if(tableName === 'deals'){
					if(this.validateDeal() !== true) return;

					let d = utils.copyObject(this.deal);

					d.newCustomer = undefined;
					delete d.newCustomer;
					d.products = d.products.filter(o => o.selected);

					if(this.deal.newCustomer){
						let c = utils.copyObject(this.customer);

						let additionalTableName = 'customers';
						if(this.editingMode === false){
							let msg = $crsdb.insert(additionalTableName, c);
							if(msg.code !== 'code005'){
								this.msgOpen(msg.content);
								return;
							}
							d.customerId = $crsdb.tableNextId.customers - 1;
						}else{
							let msg = $crsdb.update(additionalTableName, d.customerId, c);
							if(msg.code !== 'code005'){
								this.msgOpen(msg.content);
								return;
							}

						}
						this[additionalTableName] = $crsdb.select(additionalTableName);

						//////

						if(this.editingMode === false){
							let msg = $crsdb.insert(tableName, d);
							if(msg.code !== 'code005'){
								this.msgOpen(msg.content);
								return;
							}
						}else{
							let msg = $crsdb.update(tableName, this.editingMode, d);
							if(msg.code !== 'code005'){
								this.msgOpen(msg.content);
								return;
							}
						}
					}else{
						if(this.editingMode === false){
							let msg = $crsdb.insert(tableName, d);
							if(msg.code !== 'code005'){
								this.msgOpen(msg.content);
								return;
							}
						}else{
							let msg = $crsdb.update(tableName, this.editingMode, d);
							if(msg.code !== 'code005'){
								this.msgOpen(msg.content);
								return;
							}
						}
					}
				}else if(tableName === 'customers'){
					if(this.validateCustomer() !== true) return;

					if(this.editingMode === false){
						let msg = $crsdb.insert(tableName, this.customer);
						if(msg.code !== 'code005'){
							this.msgOpen(msg.content);
							return;
						}
					}else{
						let msg = $crsdb.update(tableName, this.editingMode, this.customer);
						if(msg.code !== 'code005'){
							this.msgOpen(msg.content);
							return;
						}
					}
				}else if(tableName === 'settings'){
					if(this.validateSetting() !== true) return;

					if(this.editingMode === false){
						let msg = $crsdb.insert(tableName, this.setting);
						if(msg.code !== 'code005'){
							this.msgOpen(msg.content);
							return;
						}
					}else{
						let msg = $crsdb.update(tableName, this.editingMode, this.setting);
						if(msg.code !== 'code005'){
							this.msgOpen(msg.content);
							return;
						}
					}
				}

				$crsdb.save();

				this[tableName] = $crsdb.select(tableName);
				this.reset();
				this.startToSearch();

				this.closePrompt();
			},

			// message
			msgOpen(msg, hasButton = false, callback = null){
				this.message.opened = true;
				this.message.content = msg;
				this.message.hasButton = hasButton;
				this.message.callback = callback;
			},
			msgClose(){
				this.message.opened = false;
				this.message.hasButton = false;
				this.message.content = '';
			},
			msgConfirm(){
				this.msgClose();
				this.message.callback && this.message.callback.apply(this);
			},

			formatMonth(month){
				return month.replace(/-/, '年') + '月';
			},
			generateExcelName(){
				let text = this.filters.map(filter => {
					let id = filter.type;
					let item = this.filtersListMapping[id];

					if(id === 'all'){
						title = '';
					}else if(id === 'month'){
						title = this.formatMonth(filter.value);
					}else if(id === 'status'){
						title = item.name + '"' + this.statusMapping[filter.value].name + '"';
					}else{
						title = item.name + '"' + filter.value + '"';
					}

					return title;
				});

				return text.join(' + ');
			},
			calcTotalAllPoints(){
				let successDeals = this.dealsSearchResult.filter(item => item.status === 'success');
				let successDealsTotalPoints = 0;
				successDeals.map(item => {
					let point = this.calcYourPoint(item);
					successDealsTotalPoints += point;
					successDealsTotalPoints += item.companyAllowance || 0;
					successDealsTotalPoints += item.trafficAllowance || 0;
				});

				let failDeals = this.dealsSearchResult.filter(item => item.status === 'fail');
				let failDealsTotalPoints = 0;
				failDeals.map(item => {
					let point = 20;

					failDealsTotalPoints += item.companyAllowance || 0;
				});

				let totalAllPoints = successDealsTotalPoints + failDealsTotalPoints;

				return {
					success: successDealsTotalPoints,
					fail: failDealsTotalPoints,
					total: totalAllPoints
				};
			},
			generateTable(){
				let excelName = this.generateExcelName();
				let productLength = this.products.length;
				let products = this.products.map(item => {
					return `<td align="center" valign="middle" style="height: 40px; background: #effefe;">${item.name}</td>`;
				}).join('\n');

				let successDeals = this.dealsSearchResult.filter(item => item.status === 'success');
				let successDealsTotalPoints = 0;
				let successDealsHTML = successDeals.length > 0 ? successDeals.map(item => {
					let c = this.customersMapping[item.customerId];
					let mapping = item.products.map(p => p.id);

					let ps = this.products.map(p => {
						let mappingIndex = mapping.indexOf(p.id);
						if(mappingIndex > -1){
							let pro = item.products[mappingIndex];
							let text = pro.name === '熏蒸' || pro.name === '骨盆修复' ? pro.quantity : pro.price;
							return `<td align="center" valign="middle" style="height: 40px;">${text}</td>`;
						}else{
							return `<td align="center" valign="middle" style="height: 40px;">&nbsp;</td>`;
						}
					}).join('\n');

					let point = this.calcYourPoint(item);
					successDealsTotalPoints += point;
					successDealsTotalPoints += item.companyAllowance || 0;
					successDealsTotalPoints += item.trafficAllowance || 0;

					if(point === 0){
						point = '&nbsp;';
					}

					return `<tr>
						<td align="center" valign="middle" style="height: 40px;">${c.name}</td>
						<td align="center" valign="middle" style="height: 40px;">${c.introducer}</td>
						<td align="center" valign="middle" style="height: 40px;">${c.telephone}</td>
						<td align="center" valign="middle" style="height: 40px;">${c.address}</td>
						<td align="center" valign="middle" style="height: 40px;">${item.dealDate}</td>
						<td align="center" valign="middle" style="height: 40px;">黄秀红</td>
						${ps}
						<td align="center" valign="middle" style="height: 40px;">${point}</td>
						<td align="center" valign="middle" style="height: 40px;">${item.companyAllowance}</td>
						<td align="center" valign="middle" style="height: 40px;">${item.trafficAllowance}</td>
					</tr>`;
				}).join('\n') : `<tr>
					<td colspan="13" align="center" valign="middle" style="height: 40px;">暂时没有数据！</td>
				</tr>`;

				let failDeals = this.dealsSearchResult.filter(item => item.status === 'fail');
				let failDealsTotalPoints = 0;
				let failDealsHTML = failDeals.length > 0 ? failDeals.map(item => {
					let c = this.customersMapping[item.customerId];

					let point = 20;

					failDealsTotalPoints += item.companyAllowance || 0;

					return `<tr>
						<td align="center" valign="middle" style="height: 40px;">${c.name}</td>
						<td colspan="4" align="center" valign="middle" style="height: 40px;">${c.address}</td>
						<td align="center" valign="middle" style="height: 40px;">${c.telephone}</td>
						<td align="center" valign="middle" style="height: 40px;">&nbsp;</td>
						<td align="center" valign="middle" style="height: 40px;">${item.dealDate}</td>
						<td align="center" valign="middle" style="height: 40px;">&nbsp;</td>
						<td align="center" valign="middle" style="height: 40px;">&nbsp;</td>
						<td align="center" valign="middle" style="height: 40px;">&nbsp;</td>
						<td align="center" valign="middle" style="height: 40px;">${item.companyAllowance}</td>
						<td align="center" valign="middle" style="height: 40px;">&nbsp;</td>
					</tr>`;
				}).join('\n') : `<tr>
					<td colspan="13" align="center" valign="middle" style="height: 40px;">暂时没有数据！</td>
				</tr>`;

				let totalAllPoints = successDealsTotalPoints + failDealsTotalPoints;


				let html = `<table border="1" borderColor="#a1acd6" style="border-collapse: collapse; border-spacing: 0; font-size: 16px;">
					<tr style="font-weight: bold;">
						<td colspan="13" align="center" valign="middle" style="height: 40px; background: #8899dd; color: white;">${excelName} 催乳师明细表</td>
					</tr>
					<tr style="font-weight: bold;">
						<td rowspan="2" align="center" valign="middle" style="height: 40px; background: #effefe;">客户姓名</td>
						<td rowspan="2" align="center" valign="middle" style="height: 40px; background: #effefe;">介绍人</td>
						<td rowspan="2" align="center" valign="middle" style="height: 40px; background: #effefe;">电话</td>
						<td rowspan="2" align="center" valign="middle" style="height: 40px; background: #effefe;">地址</td>
						<td rowspan="2" align="center" valign="middle" style="height: 40px; background: #effefe;">上门日期</td>
						<td rowspan="2" align="center" valign="middle" style="height: 40px; background: #effefe;">催乳师</td>
						<td colspan="${productLength}" align="center" valign="middle" style="height: 40px; background: #effefe;">套餐</td>
						<td rowspan="2" align="center" valign="middle" style="height: 40px; background: #effefe;">抽点</td>
						<td rowspan="2" align="center" valign="middle" style="height: 40px; background: #effefe;">公司补贴</td>
						<td rowspan="2" align="center" valign="middle" style="height: 40px; background: #effefe;">交通补贴</td>
					</tr>
					<tr style="font-weight: bold;">
						${products}
					</tr>
					${successDealsHTML}
					<tr style="font-weight: bold; color: red;">
						<td colspan="12" align="right" valign="middle" style="height: 40px;">小计：</td>
						<td align="center" valign="middle" style="height: 40px;">${successDealsTotalPoints}</td>
					</tr>

					<tr>
						<td colspan="13" align="center" valign="middle" style="height: 80px">&nbsp;</td>
					</tr>

					<tr style="font-weight: bold;">
						<td colspan="13" align="center" valign="middle" style="height: 40px; background: #8899dd; color: white;">失单列表</td>
					</tr>
					<tr style="font-weight: bold;">
						<td align="center" valign="middle" style="height: 40px; background: #effefe;">客户姓名</td>
						<td colspan="4" align="center" valign="middle" style="height: 40px; background: #effefe;">地址</td>
						<td align="center" valign="middle" style="height: 40px; background: #effefe;">电话</td>
						<td align="center" valign="middle" style="height: 40px; background: #effefe;">&nbsp;</td>
						<td align="center" valign="middle" style="height: 40px; background: #effefe;">上门日期</td>
						<td align="center" valign="middle" style="height: 40px; background: #effefe;">&nbsp;</td>
						<td align="center" valign="middle" style="height: 40px; background: #effefe;">&nbsp;</td>
						<td align="center" valign="middle" style="height: 40px; background: #effefe;">&nbsp;</td>
						<td align="center" valign="middle" style="height: 40px; background: #effefe;">公司补贴</td>
						<td align="center" valign="middle" style="height: 40px; background: #effefe;">&nbsp;</td>
					</tr>
					${failDealsHTML}
					<tr style="font-weight: bold; color: red;">
						<td colspan="12" align="right" valign="middle" style="height: 40px;">小计：</td>
						<td align="center" valign="middle" style="height: 40px;">${failDealsTotalPoints}</td>
					</tr>
					<tr>
						<td colspan="13" align="center" valign="middle" style="height: 80px;">&nbsp;</td>
					</tr>
					<tr style="font-weight: bold; color: red;">
						<td colspan="12" align="right" valign="middle" style="height: 40px; background: #effefe;">工资总计：</td>
						<td align="center" valign="middle" style="height: 40px; background: #effefe;">${totalAllPoints}</td>
					</tr>
				</table>`;

				return html;
			},

			// excel
			exportExcel(){
	            let uri = 'data:application/vnd.ms-excel;base64,';
	            let template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>{table}</body></html>';

	            let ctx = {
	            	worksheet: 'Worksheet',
	            	table: this.generateTable()
	            };

	            let excelCode = template.replace(/{(\w+)}/g, (m, p) => ctx[p]);

	            // window.location.href = uri + utils.base64(excelCode);
	            let link = document.createElement('a');
				link.href = uri + utils.base64(excelCode);
				link.download = this.generateExcelName()  + '催乳师明细表.xls';
				link.click();
			},
			exportJSON(){
	            let link = document.createElement('a');
				link.href = URL.createObjectURL(new Blob([JSON.stringify(window.localStorage)]));
				link.download = 'crsdb.txt';
				link.click();
				/*window.location.href = URL.createObjectURL(new Blob([JSON.stringify(window.localStorage)]), {
					type: ''
				});*/
			},


			// 
            uploadData: function(event){
                var selectedFile, fileType, self = this;
                if(event.target.files.length > 0){
                    selectedFile = event.target.files[0];

                    if(selectedFile.size > 100 * 1024 * 1024){
                        this.value = '';
                        this.msgOpen('文件超过100M！');
                        return;
                    }
                    if(!/\/(json|txt)$/.test(selectedFile.type.toLowerCase()) && !/\.(json|txt)$/.test(selectedFile.name.toLowerCase())){
                        this.value = '';
                        this.msgOpen('不支持' + selectedFile.type + '|' + selectedFile.name + '文件格式！');
                        return;
                    }

                    var fr = new FileReader();
                    fr.onload = function(e){
                        self.initdatacontent = e.target.result;
                    }
                    fr.readAsText(selectedFile);
                }
            }
		}
	});
})();