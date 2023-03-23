let url = `${我是接口地址}/`;
let rule_list = `${url}api-device/rule/device/list`;
let rule_add = `${url}api-device/rule/device/add`;
let trigger_list = `${url}api-device/rule/device/conf/trigger/list`;
let event_list = `${url}api-device/rule/device/conf/action/list`;
let save_node = `${url}api-device/rule/device/conf/add`;
let del_node = `${url}api-device/rule/device/conf`;
let current_protocol = `${url}api-device/protocol/current`;

Vue.config.productionTip = false;
new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		id: '',
		token: '',
		html: {
			loading: true, //页面加载
			rule_config: false, //节点表单显示
			loading_rule_detail: true, //事件等节点表单
			trigger_form: false, //条件表单显示
			event_form: false, //事件表单显示
			event_trigger_form: false, //事件触发
		},
		rule_list: [], //设备规则列表
		rule_selected: [], //选中的规则
		node_list: [], //事件等列表
		node_selected: [], //选中的事件等
		// 条件表单
		trigger_form: {
			enable: false,
			name: '',
			exp: '',
			fields: [],
			params: [],
		},
		// 事件表单
		event_form: {
			enable: false,
			name: '',
			template: '',
			fields: [],
		},
		// 事件触发
		event_trigger_form: {
			enable: false,
			name: '',
			value: '',
		},
		protocol_tree: [], //物模型树
		tree_conf: {
			children: 'child',
		},
	},
	mounted() {
		if (!location.search) {
			this.id = sessionStorage.id;
			this.token = sessionStorage.token;
		} else {
			this.get_token();
		}
		this.html.loading = true;
		this.req_rule_list();
		this.req_protocol();
	},
	methods: {
		// 物模型树，每层记录路径和标识
		req_protocol() {
			this.request('post', `${current_protocol}/${this.id}`, this.token, (res) => {
				res.data.data.properties.forEach((e) => {
					let tree = {};
					this.get_protocol_tree(tree, e);
					this.protocol_tree.push(tree);
				});
			});
		},
		get_protocol_tree(target, source, path) {
			target.name = source.identifier;
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
					this.get_protocol_tree(t, a[i], `${target.path}.`);
					target.child.push(t);
				}
			}
			if (source.dataType.type == 'array' && source.dataType.specs.item.type == 'struct') {
				let a = source.dataType.specs.item.properties;
				target.child = [];
				for (let i = 0; i < a.length; i++) {
					let t = {};
					this.get_protocol_tree(t, a[i], `${target.path}[num].`);
					target.child.push(t);
				}
			}
		},
		req_rule_list() {
			this.request('get', `${rule_list}?deviceId=${this.id}`, this.token, (res) => {
				console.log('规则列表', res);
				this.html.loading = false;
				if (res.data.data == null) {
					return;
				}
				this.rule_list = res.data.data;
				this.$nextTick(() => {
					this.rule_list.forEach((e) => {
						if (e.enabled == 1) {
							this.$refs.rule_list.toggleRowSelection(e, true);
						}
					});
				});
			});
		},
		// 多选规则
		select_rules(val) {
			this.rule_selected = val;
		},
		// 多选节点
		select_node(val) {
			this.node_selected = val;
		},
		// 保存并修改每条规则状态
		save_rule() {
			let selected = [];
			this.rule_selected.forEach((e) => {
				selected.push(e.ruleId);
			});
			let data = [];
			this.rule_list.forEach((e) => {
				let t = {
					deviceId: this.id,
					ruleId: e.ruleId,
				};
				if (selected.indexOf(e.ruleId) != -1) {
					t.enabled = 1;
				} else {
					t.enabled = 0;
				}
				data.push(t);
			});
			this.request('post', rule_add, this.token, data);
		},
		// 编辑查看规则下节点
		edit_rule(rule_id) {
			this.rule_id = rule_id;
			this.node_list = [];
			this.request('get', `${trigger_list}?deviceId=${this.id}&ruleId=${rule_id}`, this.token, (res) => {
				console.log('条件列表', res);
				this.request('get', `${event_list}?deviceId=${this.id}&ruleId=${rule_id}`, this.token, (res) => {
					console.log('事件列表', res);
					this.html.loading_rule_detail = false;
					if (res.data.data == null || res.data.data == []) {
						return;
					}
					res.data.data.forEach((e) => {
						let t = {
							type: '响应事件',
						};
						t.conf = JSON.parse(e.defaultConfField).conf;
						t.exp = this.joint_params(t.conf.template, t.conf.fields, 0);
						for (let key in e) {
							if (key == 'customConf') {
								t.custom_conf = e[key].condition;
								t.custom_exp = this.joint_params(t.custom_conf.template, t.custom_conf.fields, 0);
							} else if (key != 'defaultConfField') {
								if (key == 'enabled') {
									t[key] = e[key] || false;
								} else {
									t[key] = e[key] || 0;
								}
							}
						}
						//#region
						// let count = 0;
						// t2.template.split('%s').forEach((e) => {
						// 	let t3 = { before: e, input: t2.fields[count], show: false };
						// 	t.exp.push(t3);
						// 	count++;
						// });
						// this.joint_params(t.exp, t2.fields, 0);
						// t.key1 = t2.template;
						// t.key2 = t2.fields;
						//#endregion
						this.node_list.push(t);
					});
					this.html.rule_config = true;
					this.$nextTick(() => {
						this.node_list.forEach((e) => {
							if (e.enabled) {
								this.$refs.node_list.toggleRowSelection(e, true);
							}
						});
						console.log('nodelist', this.node_list);
					});
				});
				if (res.data.data == null || res.data.data == []) {
					return;
				}
				res.data.data.forEach((e) => {
					let t = {};
					if (e.confType == 0) {
						t.type = '属性触发条件';
					} else if (e.confType == 1) {
						t.type = '事件触发条件';
					}
					t.conf = JSON.parse(e.defaultConfField).conf;
					t.exp = this.joint_params(t.conf.exp, t.conf.defaultValues, 0);
					for (let key in e) {
						if (key == 'customConf') {
							t.custom_conf = e[key].condition;
							t.custom_exp = this.joint_params(t.conf.exp, t.custom_conf.defaultValues, 0);
						} else if (key != 'defaultConfField') {
							if (key == 'enabled') {
								t[key] = e[key] || false;
							} else {
								t[key] = e[key] || 0;
							}
						}
					}
					//#region
					// let count = 0;
					// t2.exp.split('%s').forEach((e) => {
					// 	let t3 = { before: e, input: t2.defaultValues[count], show: false };
					// 	t.exp.push(t3);
					// 	count++;
					// });
					// this.joint_params(t.exp, t2.defaultValues, 0);
					//#endregion
					this.node_list.push(t);
				});
			});
		},
		//#region
		// joint_params(target, array, index) {
		// 	target[index].after = array[index];
		// 	if (index + 1 < array.length) {
		// 		this.joint_params(target, array, index + 1);
		// 	}
		// },
		//#endregion
		joint_params(input, array, index) {
			input = input.replace('%s', array[index] || '');
			if (index + 1 < array.length) {
				this.joint_params(input, array, index + 1);
			}
			return input;
		},
		// 更改事件和条件状态
		save_node() {
			let selected = [];
			this.node_selected.forEach((e) => {
				selected.push(e.nodeId);
			});
			let t = [];
			this.node_list.forEach((e) => {
				let t2 = {
					confId: e.nodeId,
					deviceId: this.id,
					ruleId: this.rule_id,
				};
				if (e.type == '属性触发条件' || e.type == '事件触发条件') {
					if (Object.keys(e).indexOf('custom_conf') != -1) {
						t2.condition = {
							defaultValues: e.custom_conf.defaultValues,
						};
					} else {
						t2.condition = {
							defaultValues: e.conf.defaultValues,
						};
					}
				} else if (e.type == '响应事件') {
					if (Object.keys(e).indexOf('custom_conf') != -1) {
						t2.condition = {
							template: e.custom_conf.template,
							fields: e.custom_conf.fields,
						};
					} else {
						t2.condition = {
							template: e.conf.template,
							fields: e.conf.fields,
						};
					}
				}
				if (selected.indexOf(e.nodeId) != -1) {
					t2.enabled = true;
				} else {
					t2.enabled = false;
				}
				t.push(t2);
			});
			this.request('post', save_node, this.token, t, () => {
				this.req_rule_list();
				this.html.rule_config = false;
			});
		},
		// 编辑节点
		edit_node(node_list, node_index) {
			this.node_index = node_index;
			if (node_list.type == '属性触发条件') {
				this.trigger_form.enable = node_list.enabled;
				this.trigger_form.name = node_list.nodeName || '';
				this.trigger_form.exp = node_list.conf.exp || '';
				this.trigger_form.fields = node_list.conf.conditionFields || [];
				this.trigger_form.params = [];
				if (Object.keys(node_list).indexOf('custom_conf') != -1) {
					node_list.custom_conf.defaultValues.forEach((e) => {
						let t = { value: e };
						this.trigger_form.params.push(t);
					});
				} else {
					node_list.conf.defaultValues.forEach((e) => {
						let t = { value: e };
						this.trigger_form.params.push(t);
					});
				}
				this.html.trigger_form = true;
			} else if (node_list.type == '响应事件') {
				this.event_form.enable = node_list.enabled;
				this.event_form.name = node_list.nodeName || '';
				this.event_form.fields = [];
				if (Object.keys(node_list).indexOf('customConf') != -1) {
					this.event_form.template = node_list.custom_conf.template || '';
					node_list.custom_conf.fields.forEach((e) => {
						let t = { value: e };
						this.event_form.fields.push(t);
					});
				} else {
					this.event_form.template = node_list.conf.template || '';
					node_list.conf.fields.forEach((e) => {
						let t = { value: e };
						this.event_form.fields.push(t);
					});
				}
				this.html.event_form = true;
			} else if (node_list.type == '事件触发条件') {
				this.event_trigger_form.enable = node_list.enabled;
				this.event_trigger_form.name = node_list.nodeName;
				this.event_trigger_form.exp = 'event.identifier == %s';
				this.event_trigger_form.field = 'event.identifier';
				if (Object.keys(node_list).indexOf('custom_conf') != -1) {
					this.event_trigger_form.value = node_list.custom_conf.defaultValues[0];
				} else {
					this.event_trigger_form.value = node_list.conf.defaultValues[0];
				}
				this.html.event_trigger_form = true;
			}
		},
		// 条件保存
		trigger_submit(flag) {
			let t = this.node_list[this.node_index];
			let t2 = [
				{
					confId: t.nodeId,
					deviceId: this.id,
					ruleId: this.rule_id,
				},
			];
			if (flag == 0) {
				let array = [];
				this.trigger_form.params.forEach((e) => {
					array.push(e.value);
				});
				t2[0].condition = { defaultValues: array };
				t2[0].enabled = this.trigger_form.enable;
				this.request('post', save_node, this.token, t2, () => {
					this.edit_rule(this.rule_id);
					this.html.trigger_form = false;
				});
			} else {
				t2[0].condition = { defaultValues: [this.event_trigger_form.value] };
				t2[0].enabled = this.event_trigger_form.enable;
				this.request('post', save_node, this.token, t2, () => {
					this.edit_rule(this.rule_id);
					this.html.event_trigger_form = false;
				});
			}
		},
		// 检测规则表达式里的特殊符号 并动态生成元素
		identify_symbol(input, flag, last_length, index, count) {
			//#region
			// if (index == undefined) {
			// 	index = 0;
			// 	if (flag == 'trigger') {
			// 		this.trigger_form.fields = [];
			// 		this.trigger_form.params = [];
			// 	} else if (flag == 'event') {
			// 		this.event_form.fields = [];
			// 	}
			// }
			// index = input.indexOf('%s', index);
			// if (index != -1) {
			// 	if (flag == 'trigger') {
			// 		let t = { value: '' };
			// 		this.trigger_form.params.push(t);
			// 	} else if (flag == 'event') {
			// 		let t = { value: '' };
			// 		this.event_form.fields.push(t);
			// 	}
			// 	this.identify_symbol(input, flag, index + 2);
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
					if (flag == 'event') {
						this.event_form.fields.splice(count);
					}
				} else if (last_length < count) {
					if (flag == 'event') {
						for (let i = 0; i < count - last_length; i++) {
							let t = { value: '' };
							this.event_form.fields.push(t);
						}
					}
				}
			}
		},
		// 事件保存
		event_submit() {
			let t = this.node_list[this.node_index];
			let t2 = [
				{
					confId: t.nodeId,
					deviceId: this.id,
					ruleId: this.rule_id,
					condition: { template: this.event_form.template || t.conf.template },
				},
			];
			let array = [];
			this.event_form.fields.forEach((e) => {
				array.push(e.value);
			});
			t2[0].condition.fields = array;
			t2[0].enabled = this.event_form.enable;
			this.request('post', save_node, this.token, t2, () => {
				this.edit_rule(this.rule_id);
				this.html.event_form = false;
			});
		},
		// 删除节点
		del_node(node_list) {
			this.$confirm(`确认删除？`, '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'info',
				center: true,
			}).then(() => {
				this.request('delete', `${del_node}?deviceId=${this.id}&nodeId=${node_list.nodeId}`, this.token, () => {
					this.edit_rule(this.rule_id);
				});
			});
		},
		// 关闭页面
		close_page() {
			this.html.rule_config = false;
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
