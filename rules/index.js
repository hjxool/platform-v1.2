let url = `${我是接口地址}/`;
let rule_add = `${url}api-device/rule/base/add`;
let rule_list = `${url}api-device/rule/base/list`;
let rule_edit = `${url}api-device/rule/base/edit`;
let trigger_list = `${url}api-device/rule/conf/trigger/list`;
let action_list = `${url}api-device/rule/conf/action/list`;
let trigger_add = `${url}api-device/rule/conf/trigger/add`;
let trigger_delete = `${url}api-device/rule/conf/trigger/delete`;
let trigger_edit = `${url}api-device/rule/conf/trigger/edit`;
let event_add = `${url}api-device/rule/conf/action/add`;
let event_delete = `${url}api-device/rule/conf/action/delete`;
let event_edit = `${url}api-device/rule/conf/action/edit`;
let product_detail = `${url}api-device/product`;
let property_list = `${url}api-device/protocol/property/list`;
let check_model = `${url}api-device/protocol/view`;
let del_rule = `${url}api-device/rule/base/delete`;

Vue.config.productionTip = false;
new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		id: '',
		token: '',
		html: {
			loading: true, //页面加载
			rule_config: false, //规则配置页面
			trigger_config: false, //触发配置显示
			loading_rule_detail: false, //加载条件和事件列表
			event_config: false, //事件表单显示
			trigger_event_conf: false, //事件触发配置显示
			info_type_options: [
				{ name: '只落库', val: 0, ban: false },
				{ name: '消息定向推送', val: 1, ban: false },
				{ name: '发短信', val: 2, ban: true },
				{ name: '发邮件', val: 3, ban: true },
				{ name: '设备联动操作', val: 4, ban: true },
			],
			rule_type: '', // 规则类型 显示按钮功能不同
		},
		rule_list: [], //规则列表
		trigger_and_event_list: [], //事件和条件列表
		// 触发条件表单
		form: {
			enable: false, //全部设备启用
			name: '',
			exp: '', //规则表达式
			condition: [], //占位符个数生成的输入元素
		},
		// 事件触发表单
		event_trigger_form: {
			enable: false, //全部设备启用
			name: '',
			value: '', //选择的事件
		},
		// 响应事件表单
		event_form: {
			enable: false, //全部设备启用
			name: '',
			template: '', //告警内容模板
			fields: [], //占位符生成的输入元素
			info_type: 0, //通知方式
			//通知方式1时用户填写内容
			type1: {
				username: '',
				password: '',
				host: '',
				port: '',
				topic: '',
				routingKey: '',
			},
		},
		protocol_tree: [], //物模型属性树
		tree_conf: {
			children: 'child',
		},
		event_list: [], //物模型事件列表
	},
	mounted() {
		if (!location.search) {
			this.id = sessionStorage.id;
			this.token = sessionStorage.token;
		} else {
			this.get_token();
		}
		this.req_rule_list();
		this.req_property();
		this.req_protocol();
		// 节流标识符
		this.thro_flag = false;
	},
	methods: {
		// 物模型属性树，每层记录路径和标识
		req_property() {
			this.request('get', `${product_detail}/${this.id}`, this.token, (res) => {
				this.request('post', `${property_list}/${res.data.data.currentModelId}`, this.token, (res) => {
					// name字段重复了 不能作为row-key绑定值
					res.data.data.forEach((e) => {
						let tree = {};
						this.get_property_tree(tree, e);
						this.protocol_tree.push(tree);
					});
				});
			});
		},
		get_property_tree(target, source, path) {
			target.name = source.identifier;
			target.id = source.propertyId;
			if (path == undefined) {
				target.path = source.identifier;
			} else {
				target.path = path + source.identifier;
			}
			switch (source.dataType.type) {
				case 'struct':
					target.type = '结构体';
					break;
				case 'array':
					target.type = '数组';
					break;
				default:
					target.type = source.dataType.type;
					break;
			}
			if (source.dataType.type == 'struct') {
				let a = source.dataType.properties;
				target.child = [];
				for (let i = 0; i < a.length; i++) {
					let t = {};
					this.get_property_tree(t, a[i], `${target.path}.`);
					target.child.push(t);
				}
			}
			if (source.dataType.type == 'array' && source.dataType.specs.item.type == 'struct') {
				let a = source.dataType.specs.item.properties;
				target.child = [];
				for (let i = 0; i < a.length; i++) {
					let t = {};
					this.get_property_tree(t, a[i], `${target.path}[num].`);
					target.child.push(t);
				}
			}
		},
		// 物模型事件列表
		req_protocol() {
			this.event_list = [];
			this.request('get', `${product_detail}/${this.id}`, this.token, (res) => {
				this.request('get', `${check_model}/${res.data.data.currentModelId}`, this.token, (res) => {
					res.data.data.events.forEach((e) => {
						let t = { name: e.identifier };
						this.event_list.push(t);
					});
					res.data.data.services.forEach((e) => {
						let t = { name: e.identifier };
						this.event_list.push(t);
					});
				});
			});
		},
		//#region
		// 节流
		// throttle(fun, delay, ...args) {
		// 	if (!this.thro_flag) {
		// 		setTimeout(() => {
		// 			fun(...args);
		// 			this.thro_flag = false;
		// 		}, delay);
		// 	}
		// 	this.thro_flag = true;
		// },
		//#endregion
		req_rule_list() {
			this.request('post', rule_list, this.token, { condition: { groupId: this.id }, pageNum: 1, pageSize: 999 }, (res) => {
				console.log('规则列表', res);
				if (res.data.data.data != null) {
					this.rule_list = res.data.data.data;
				}
				this.html.loading = false;
			});
		},
		// 新增规则按钮
		add_rules() {
			this.$prompt('请输入规则名称', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				inputPattern: /^[\u4E00-\u9FA5A-Za-z0-9_]+$/,
				inputErrorMessage: '不能为空或者输入特殊字符',
			}).then(({ value }) => {
				this.html.loading = true;
				this.request('post', rule_add, this.token, { name: value, productId: this.id }, () => {
					this.req_rule_list();
				});
			});
		},
		// 编辑规则
		edit_rule(list_data) {
			this.$prompt('请输入规则名称', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				inputValue: list_data.name,
				inputPattern: /^[\u4E00-\u9FA5A-Za-z0-9_]+$/,
				inputErrorMessage: '不能为空或者输入特殊字符',
			}).then(({ value }) => {
				this.request('put', rule_edit, this.token, { name: value, productId: this.id, id: list_data.id }, () => {
					this.html.loading = true;
					this.req_rule_list();
				});
			});
		},
		// 查看单条规则下的事件和条件
		check_rule(rule_id, type) {
			this.rule_id = rule_id;
			this.html.rule_type = type;
			this.html.rule_config = true;
			this.html.loading_rule_detail = true;
			if (type == 'alert') {
				this.trigger_and_event_list = [];
				this.request('get', `${trigger_list}?ruleId=${rule_id}`, this.token, (res) => {
					console.log('触发条件列表', res);
					this.request('get', `${action_list}?ruleId=${rule_id}`, this.token, (res) => {
						console.log('响应事件列表', res);
						this.html.loading_rule_detail = false;
						if (res.data.data == null) {
							return;
						}
						res.data.data.forEach((e) => {
							let table = { type: '响应事件' };
							for (let key in e) {
								if (e[key] != null) {
									table[key] = e[key];
								}
							}
							this.trigger_and_event_list.push(table);
						});
						console.log(this.trigger_and_event_list);
					});
					if (res.data.data == null) {
						return;
					}
					res.data.data.forEach((e) => {
						let table = {};
						if (e.confType == 0) {
							table.type = '属性触发条件';
						} else if (e.confType == 1) {
							table.type = '事件触发条件';
						}
						for (let key in e) {
							if (e[key] != null) {
								table[key] = e[key];
							}
						}
						this.trigger_and_event_list.push(table);
					});
				});
			}
		},
		// 删除规则
		del_rule(rule_id) {
			this.$confirm('确认删除？', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'info',
				center: true,
			}).then(() => {
				this.request('delete', `${del_rule}/${rule_id}`, this.token, () => {
					this.html.loading = true;
					this.req_rule_list();
				});
			});
		},
		// 关闭页面任意
		close_page(flag) {
			switch (flag) {
				case 'rule_detail':
					this.html.rule_config = false;
					break;
			}
			flag = false;
		},
		// 清空对象
		clean_object(obj) {
			for (let key in obj) {
				switch (obj[key].constructor) {
					case String:
						obj[key] = '';
						break;
					case Number:
						obj[key] = 0;
						break;
					case Array:
						obj[key] = [];
						break;
					case Object:
						for (let key2 in obj[key]) {
							this.clean_object(obj[key][key2]);
						}
						break;
					case Boolean:
						obj[key] = false;
				}
			}
		},
		// 新增触发条件按钮
		add_trigger() {
			this.add_edit = 'add';
			this.clean_object(this.form);
			this.html.trigger_config = true;
		},
		// 新增事件触发
		add_event_trigger() {
			this.add_edit = 'add';
			this.clean_object(this.event_trigger_form);
			this.event_trigger_form.exp = 'event.identifier == %s';
			this.event_trigger_form.field = 'event.identifier';
			this.html.trigger_event_conf = true;
		},
		// 新增响应事件按钮
		add_event() {
			this.add_edit = 'add';
			this.clean_object(this.event_form);
			this.html.event_config = true;
		},
		// 编辑条件或事件
		edit_trigger_event(list_data) {
			console.log('编辑', list_data);
			this.add_edit = 'edit';
			if (list_data.type == '属性触发条件') {
				this.form.id = list_data.nodeId;
				this.form.name = list_data.nodeName;
				this.form.exp = list_data.expression;
				this.form.enable = list_data.defaultEnabled;
				this.form.condition = [];
				list_data.conditionFields.forEach((e) => {
					let t = { field: e };
					this.form.condition.push(t);
				});
				for (let i = 0; i < list_data.defaultValues.length; i++) {
					this.form.condition[i].default_value = list_data.defaultValues[i];
				}
				this.html.trigger_config = true;
			} else if (list_data.type == '响应事件') {
				this.event_form.id = list_data.nodeId;
				this.event_form.name = list_data.nodeName;
				this.event_form.template = list_data.template;
				this.event_form.enable = list_data.defaultEnabled;
				this.event_form.fields = [];
				list_data.fields.forEach((e) => {
					let t = { field: e };
					this.event_form.fields.push(t);
				});
				this.clean_object(this.event_form.type1);
				this.event_form.info_type = list_data.actionType || 0;
				if (list_data.actionType == 1) {
					// this.event_form.type1.username = list_data.extraParam.username;
					// this.event_form.type1.password = list_data.extraParam.password;
					// this.event_form.type1.host = list_data.extraParam.host;
					// this.event_form.type1.topic = list_data.extraParam.topic;
					// this.event_form.type1.routingKey = list_data.extraParam.routingKey;
					// this.event_form.type1.port = list_data.extraParam.port;
					for (let key in list_data.extraParam) {
						this.event_form.type1[key] = list_data.extraParam[key];
					}
				}
				this.html.event_config = true;
			} else if (list_data.type == '事件触发条件') {
				this.event_trigger_form.id = list_data.nodeId;
				this.event_trigger_form.name = list_data.nodeName;
				this.event_trigger_form.exp = 'event.identifier == %s';
				this.event_trigger_form.field = 'event.identifier';
				this.event_trigger_form.enable = list_data.defaultEnabled;
				this.event_trigger_form.value = list_data.defaultValues[0];
				this.html.trigger_event_conf = true;
			}
		},
		// 删除条件或事件
		del_trigger_event(list_data) {
			this.$confirm(`确认删除？`, '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'info',
				center: true,
			}).then(() => {
				if (list_data.type == '属性触发条件' || list_data.type == '事件触发条件') {
					this.request('put', trigger_delete, this.token, { baseId: this.rule_id, nodeId: list_data.nodeId }, () => {
						this.check_rule(this.rule_id, 'alert');
					});
				} else {
					this.request('put', event_delete, this.token, { baseId: this.rule_id, nodeId: list_data.nodeId }, () => {
						this.check_rule(this.rule_id, 'alert');
					});
				}
			});
		},
		// 检测规则表达式里的特殊符号 并动态生成元素
		identify_symbol(input, flag, last_length, index, count) {
			//#region
			// if (index == undefined) {
			// 	// index等于undefined说明点击了检测按钮 而不是回调 就可以根据上一次数组长度删除末尾 保留前面的
			// 	index = 0;
			// 	if (flag == 'trigger') {
			// 		this.form.condition = [];
			// 	} else if (flag == 'event') {
			// 		this.event_form.fields = [];
			// 	}
			// }
			// index = input.indexOf('%s', index);
			// if (index != -1) {
			// 	if (flag == 'trigger') {
			// 		let t = { field: '', default_value: '' };
			// 		this.form.condition.push(t);
			// 	} else if (flag == 'event') {
			// 		let t = { field: '' };
			// 		this.event_form.fields.push(t);
			// 	}
			// 	this.identify_symbol(input, flag, last_length, index + 2);
			// }
			//#endregion

			if (index == undefined) {
				index = 0;
				count = 0;
			}
			index = input.indexOf('%s', index);
			if (index != -1) {
				count++;
				this.identify_symbol(input, flag, last_length, index + 2, count);
			} else {
				// last_length不等于0 则说明之前有值 新数组需要根据旧数组截取
				if (last_length > count) {
					if (flag == 'trigger') {
						// count后包括count都删除
						this.form.condition.splice(count);
					} else if (flag == 'event') {
						this.event_form.fields.splice(count);
					}
				} else if (last_length < count) {
					if (flag == 'trigger') {
						for (let i = 0; i < count - last_length; i++) {
							let t = { field: '', default_value: '' };
							this.form.condition.push(t);
						}
					} else if (flag == 'event') {
						for (let i = 0; i < count - last_length; i++) {
							let t = { field: '' };
							this.event_form.fields.push(t);
						}
					}
				}
			}
		},
		//#region
		// 检查输入内容
		// form_verify(value, flag) {
		// 	this.html.verify[flag].show = true;
		// 	let reg;
		// 	switch (flag) {
		// 		case 'name':
		// 			reg = /^[\u4E00-\u9FA5A-Za-z0-9_]+$/;
		// 			if (!reg.test(value)) {
		// 				return false;
		// 			}
		// 			break;
		// 	}
		// 	this.html.verify[flag].show = false;
		// 	return true;
		// },
		//#endregion
		// 条件提交
		trigger_submit(flag) {
			let t = {
				baseId: this.rule_id,
				confType: flag,
				conditionFields: [],
				defaultValues: [],
			};
			if (flag == 0) {
				t.name = this.form.name;
				t.expression = this.form.exp;
				t.defaultEnabled = this.form.enable;
				this.form.condition.forEach((e) => {
					t.conditionFields.push(e.field);
					t.defaultValues.push(e.default_value);
				});
			} else {
				t.name = this.event_trigger_form.name;
				t.expression = this.event_trigger_form.exp;
				t.defaultEnabled = this.event_trigger_form.enable;
				t.conditionFields = [this.event_trigger_form.field];
				t.defaultValues = [this.event_trigger_form.value];
			}
			if (this.add_edit == 'add') {
				this.request('post', trigger_add, this.token, t, () => {
					this.html.trigger_config = false;
					this.html.trigger_event_conf = false;
					this.check_rule(this.rule_id, 'alert');
				});
			} else {
				t.nodeId = flag == 0 ? this.form.id : this.event_trigger_form.id;
				this.request('put', trigger_edit, this.token, t, () => {
					this.html.trigger_config = false;
					this.html.trigger_event_conf = false;
					this.check_rule(this.rule_id, 'alert');
				});
			}
		},
		// 事件提交
		event_submit() {
			let t = {
				baseId: this.rule_id,
				name: this.event_form.name,
				template: this.event_form.template,
				actionType: this.event_form.info_type,
				defaultEnabled: this.event_form.enable,
				fields: [],
			};
			this.event_form.fields.forEach((e) => {
				t.fields.push(e.field);
			});
			if (this.event_form.info_type == 1) {
				t.extraParam = {};
				for (let key in this.event_form.type1) {
					t.extraParam[key] = this.event_form.type1[key];
				}
			}
			if (this.add_edit == 'add') {
				this.request('post', event_add, this.token, t, () => {
					this.html.event_config = false;
					this.check_rule(this.rule_id, 'alert');
				});
			} else {
				t.nodeId = this.event_form.id;
				this.request('put', event_edit, this.token, t, () => {
					this.html.event_config = false;
					this.check_rule(this.rule_id, 'alert');
				});
			}
		},
		// 复制内容
		copy_path(path) {
			// navigator.clipboard.writeText(path);
			let temp = document.createElement('textarea');
			temp.innerText = path;
			document.body.appendChild(temp);
			temp.select();
			document.execCommand('copy');
			document.body.removeChild(temp);
			this.$message.success('已复制到剪贴板');
		},
	},
});
