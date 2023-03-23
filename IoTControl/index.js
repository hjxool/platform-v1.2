let url = `${我是接口地址}/`;
let rule_search = `${url}api-portal/online-check-rule/search`;
let update_rule = `${url}api-portal/online-check-rule/saveOrUpdate`;
let device_list = `${url}api-portal/room/device`;
let room_search = `${url}api-portal/room/search/status`;
let model_server_search = `${url}api-device/protocol/current/services`;
let joint_rule_enable = `${url}api-portal/online-check-rule/start`;
let joint_rule_disable = `${url}api-portal/online-check-rule/stop`;
let joint_rule_del = `${url}api-portal/online-check-rule/delete`;
let joint_rule_execute = `${url}api-portal/online-check-rule/execute`;
let record_search = `${url}api-portal/online-check-record/search`;
let all_device_url = `${url}api-device/device/search`;
let user_info_url = `${url}api-user/users/tenantSimple`; //获取租户列表
let current_tenants = `${url}api-user/users/tenants`; //获取当前租户名称

Vue.config.productionTip = false;
new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			page_select: '1', // 页面选择
			page_loading: true, // 加载大页面时loading遮罩
			popup_loading: false, // 加载二级弹窗loading遮罩
			detail_display: false, //设备等信息页面显示
			size: 20, //一页显示总数
			turn_to_device: false, //跳转设备弹窗显示
			device_name: '', //设备弹窗下设备名称
			device_url: '', //设备跳转路径
			iconize_device: false, //最小化弹窗
		},
		place_list: [], //会议室列表
		device: {
			list: [], // 设备卡片列表
			list_empty: false, //设备列表为空时显示
		},
		joint: {
			table_height: 0, // 联检表格高度
			log_search: '', // 记录搜索
			add_rule_display: false, // 添加规则表单
			record_detail_display: false, //记录详情
			device_setting_display: false, //设备配置弹窗
			form: {
				name: '',
				date: [], // 日期范围 数组
				cycle_week: [], // 执行周期 数组
				select_time: '', // 选择时间 注意是Date对象
				isIndeterminate: false, //不全选样式
				checkAll: false, //全选
				search: '', //检索设备名称
			},
			form2: {
				server_list: [], //单个设备服务列表
				serviceIdentifier: '', //设备配置表单选择的服务
			},
			record_devices: [],
			rule_list: [], // 联检规则表
			record_list: [], // 联检记录表
			record_empty: false, //记录表为空
			device_list: [], //联检查询所有设备列表
		},
		polling: {
			apply_place: '', // 应用会议室
			log_select: 0, //全部 待巡检 正常完成
			table_height: 0, // 表格高度
		},
		tableData: [{ a: 1, b: 2, c: 3, d: 4 }],
		option1: [1, 2, 3, 4],
		joint_rules: {
			name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
			date: [{ type: 'array', required: true, message: '请选择日期', trigger: 'change' }],
			cycle_week: [{ type: 'array', required: true, message: '至少选择一个星期', trigger: 'change' }],
			select_time: [{ type: 'date', required: true, message: '请选择时间', trigger: 'change' }],
			device_selected: { show: false, message: '' },
			serviceIdentifier: [{ required: true, message: '请选择物模型服务', trigger: 'change' }],
		},
		total_size: 0, //总页数
		total_size2: 0, //总页数
		current_page: 1, //当前页
		current_page2: 1, //弹窗当前页
	},
	mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
		} else {
			this.get_token();
		}
		this.get_user_info();
		this.get_place_list();
	},
	methods: {
		// 获取用户信息包括 id 连接stomp用户名和密码
		get_user_info() {
			this.request('get', user_info_url, this.token, (res) => {
				console.log('用户', res);
				if (res.data.head.code != 200) {
					this.$message('无法获取用户信息');
					return;
				}
				let data = res.data.data;
				this.request('get', current_tenants, this.token, (res) => {
					if (res.data.head.code != 200) {
						return;
					}
					let n = res.data.data[0];
					for (let val of data) {
						if (val.companyName == n) {
							this.user_id = val.tenantId;
							break;
						}
					}
				});
			});
		},
		// 获取会议室列表
		get_place_list() {
			this.html.page_loading = true;
			this.request('get', room_search, this.token, (res) => {
				console.log('会议室列表', res);
				this.html.page_loading = false;
				if (res.data.head.code != 200 || Object.entries(res.data.data).length == 0) {
					return;
				}
				this.place_list = res.data.data;
			});
		},
		// 场所一切换 设备列表就要更新
		place_change(place_id) {
			this.html.page_loading = true;
			this.place_id = place_id;
			this.device.list = [];
			this.html.page_select = '1';
			this.request('post', `${device_list}/${this.place_id}`, this.token, { condition: {} }, (res) => {
				console.log('设备列表', res);
				this.html.page_loading = false;
				this.html.detail_display = true;
				if (Object.entries(res.data).length == 0 || res.data.data == null) {
					this.$message('无设备信息');
					this.device.list_empty = true;
					return;
				}
				this.device.list = res.data.data;
				this.device.list_empty = false;
			});
		},
		// 页面选择
		page_switch(page_index) {
			this.html.page_select = page_index;
			let type = page_index.split('-')[0];
			if (type == 2) {
				this.joint_select();
			} else if (type == 3) {
				this.polling_select();
			}
		},
		// 联检选择
		joint_select(current_page) {
			this.current_page = current_page || 1;
			if (this.html.page_select == '2-1') {
				this.html.page_loading = true;
				this.joint.rule_list = [];
				this.request('post', rule_search, this.token, { condition: {}, pageNum: this.current_page, pageSize: this.html.size }, (res) => {
					console.log('联检规则表', res);
					this.html.page_loading = false;
					if (Object.entries(res.data.data).length == 0) {
						return;
					}
					this.total_size = res.data.data.total;
					this.joint.rule_list = res.data.data.data;
				});
			} else if (this.html.page_select == '2-2') {
				this.joint.log_search = '';
				this.search_record(current_page);
			}
			this.$nextTick(() => {
				this.joint.table_height = document.querySelector('.joint_table').clientHeight;
			});
		},
		// 联检获取租户下所有设备列表
		get_user_all_device(current_page) {
			this.html.popup_loading = true;
			this.current_page2 = current_page || 1;
			this.request('post', all_device_url, this.token, { condition: { tenantId: this.user_id }, pageNum: this.current_page2, pageSize: this.html.size, keyword: this.joint.form.search }, (res) => {
				console.log('所有设备', res);
				this.html.popup_loading = false;
				let data = res.data.data.data;
				this.total_size2 = 0;
				if (data == null || data.length == 0) {
					return;
				}
				this.total_size2 = res.data.data.total;
				this.joint.devices_length = data.length; // 记录下设备列表长度 勾选时会用
				for (let val of data) {
					val.serviceIdentifier = ''; // 赋值给data中的响应式数据后会自动添加响应式
					val.selected = false; // 选中标识
					for (let val2 of this.edit_devices_checked) {
						let id = val2.deviceId || val2.id;
						if (id == val.id) {
							val.selected = true;
							val.serviceIdentifier = val2.serviceIdentifier;
						}
					}
				}
				this.joint.device_list = data;
				this.check_change();
			});
		},
		// 获取设备服务列表
		get_device_server(device_obj) {
			this.request('post', `${model_server_search}/${device_obj.id}`, this.token, (res) => {
				if (res.data.head.code != 200) {
					this.$message('当前设备无可选服务');
					return;
				}
				this.joint.device_setting_display = true;
				this.device_obj = device_obj;
				this.joint.form2.server_list = res.data.data;
				this.joint.form2.serviceIdentifier = device_obj.serviceIdentifier;
			});
		},
		// 保存设备配置
		save_device_set() {
			this.$refs.joint_form2.validate((result) => {
				if (result) {
					this.device_obj.serviceIdentifier = this.joint.form2.serviceIdentifier;
					this.joint.device_setting_display = false;
				}
			});
		},
		// 添加联检规则
		add_joint_rules() {
			this.joint.rule_id = null;
			this.joint.add_rule_display = true;
			this.joint_rules.device_selected.show = false; // 验证提示隐藏
			for (let key in this.joint.form) {
				if (typeof this.joint.form[key] == 'boolean') {
					this.joint.form[key] = false;
				} else if (typeof this.joint.form[key] == 'object') {
					if (this.joint.form[key].constructor == Date) {
						this.joint.form[key] = '';
					} else {
						this.joint.form[key] = [];
					}
				} else {
					this.joint.form[key] = '';
				}
			}
			this.add_or_edit = 'add';
			this.joint.form.search = '';
			this.edit_devices_checked = [];
			this.get_user_all_device();
		},
		// 编辑联检规则
		edit_joint_rule(rule_obj) {
			// 判断规则id是不是null来区分是编辑还是新增
			this.joint.rule_id = rule_obj.id;
			this.joint.add_rule_display = true;
			this.joint_rules.device_selected.show = false; // 验证提示隐藏
			this.joint.form.name = rule_obj.onlineCheckName;
			this.joint.form.date = [new Date(rule_obj.planDatetimeStart.split(' ')[0]), new Date(rule_obj.planDatetimeEnd.split(' ')[0])];
			// 注意传过来的数组元素是数字 而label是字符串
			this.joint.form.cycle_week = rule_obj.executePeriodDays ? JSON.parse(rule_obj.executePeriodDays) : [];
			// executeTime是时分秒 不能直接转换成Date对象
			let t = new Date();
			this.joint.form.select_time = new Date(`${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()} ${rule_obj.executeTime}`);
			this.add_or_edit = 'edit';
			this.joint.form.search = '';
			this.edit_devices_checked = JSON.parse(JSON.stringify(rule_obj.devicesVOS));
			this.get_user_all_device();
		},
		// 巡检选择
		polling_select() {
			this.$nextTick(() => {
				this.polling.table_height = document.querySelector('.polling_table').clientHeight;
			});
		},
		// 全选传入的数组
		check_all(check_flag) {
			// 全选把当前设备列表全部勾选 并将没添加过的添加进去
			if (check_flag) {
				let flag = false;
				if (this.edit_devices_checked.length) {
					flag = true;
				}
				for (let val of this.joint.device_list) {
					val.selected = true;
					if (flag) {
						for (let val2 of this.edit_devices_checked) {
							// 混杂了编辑时的deviceid和新勾选的id
							let id = val2.id || val2.deviceId;
							if (id != val.id) {
								// id不匹配则压栈
								this.edit_devices_checked.push(val);
							}
						}
					} else {
						this.edit_devices_checked.push(val);
					}
				}
			} else {
				for (let val of this.joint.device_list) {
					val.selected = false;
					for (let index = 0; index < this.edit_devices_checked.length; index++) {
						let t = this.edit_devices_checked[index];
						let id = t.deviceId || t.id;
						if (id == val.id) {
							// id匹配则删除勾选历史中的设备
							this.edit_devices_checked.splice(index, 1);
						}
					}
				}
			}
			this.joint.form.isIndeterminate = false;
		},
		// 多选改变时
		check_change(device_obj) {
			if (device_obj) {
				device_obj.selected = !device_obj.selected;
				// 取消勾选时从勾选历史中删除 新勾选的一定是没在历史列表中的
				if (device_obj.selected) {
					this.edit_devices_checked.push(device_obj);
				} else {
					for (let index = 0; index < this.edit_devices_checked.length; index++) {
						let t = this.edit_devices_checked[index];
						let id = t.deviceId || t.id;
						if (id == device_obj.id) {
							this.edit_devices_checked.splice(index, 1);
							break;
						}
					}
				}
			}
			let count = 0;
			for (let val of this.joint.device_list) {
				if (val.selected) {
					count++;
				}
			}
			// 统计的是当前最多20条的设备列表
			this.joint.form.checkAll = count == this.joint.devices_length;
			this.joint.form.isIndeterminate = count > 0 && count < this.joint.devices_length;
		},
		// 格式化开关状态
		format_status(row, col) {
			return row.status == 0 ? '关闭' : '开启';
		},
		// 规则提交
		joint_rule_submit(form, status) {
			this.$refs.joint_form.validate((valid) => {
				let result = true;
				// 有一个false就不能通过 因此就找那一个false 而不需要对每一个结果进行遍历
				for (let value of this.edit_devices_checked) {
					// 勾选历史中混杂了编辑携带的原始数据 原始数据
					if (value.serviceIdentifier.length == 0) {
						result = false;
						this.joint_rules.device_selected.show = true;
						this.joint_rules.device_selected.message = '所选设备必须选择物模型服务';
						break;
					}
				}
				if (this.edit_devices_checked.length == 0) {
					result = false;
					this.joint_rules.device_selected.show = true;
					this.joint_rules.device_selected.message = '必须勾选设备';
				}
				this.joint_rules.device_selected.show = !result;
				if (valid && result) {
					this.html.popup_loading = true;
					let t_s = form.date[0];
					let t_e = form.date[1];
					let data = {
						onlineCheckName: form.name,
						planDatetimeStart: `${t_s.getFullYear()}-${t_s.getMonth() + 1 < 10 ? '0' + (t_s.getMonth() + 1) : t_s.getMonth() + 1}-${t_s.getDate() < 10 ? '0' + t_s.getDate() : t_s.getDate()} 06:00:00`,
						planDatetimeEnd: `${t_e.getFullYear()}-${t_e.getMonth() + 1 < 10 ? '0' + (t_e.getMonth() + 1) : t_e.getMonth() + 1}-${t_e.getDate() < 10 ? '0' + t_e.getDate() : t_e.getDate()} 23:00:00`,
						status: status,
						executeTime: form.select_time.toString().split(' ')[4],
						executePeriodDays: JSON.stringify(form.cycle_week),
						devicesDTOList: [],
					};
					for (let i = 0; i < this.edit_devices_checked.length; i++) {
						let d = this.edit_devices_checked[i];
						let t = {
							deviceId: d.id || d.deviceId,
							deviceName: d.deviceName,
							serviceIdentifier: d.serviceIdentifier,
						};
						data.devicesDTOList.push(t);
					}
					if (this.joint.rule_id != null) {
						data.id = this.joint.rule_id;
					}
					this.request('post', update_rule, this.token, data, (res) => {
						this.html.popup_loading = false;
						if (res.data.head.code == 200) {
							this.joint.add_rule_display = false;
							this.joint_select();
						}
					});
				}
			});
		},
		// 切换联检规则开关
		switch_joint_rule_status(rule_obj) {
			// change事件时状态值已经变了
			if (rule_obj.status == 1) {
				this.request('post', joint_rule_enable, this.token, [rule_obj.id], () => {
					this.joint_select();
				});
			} else if (rule_obj.status == 0) {
				this.request('post', joint_rule_disable, this.token, [rule_obj.id], () => {
					this.joint_select();
				});
			}
		},
		// 删除联检规则
		del_joint_rule(rule_obj) {
			this.request('post', joint_rule_del, this.token, [rule_obj.id], () => {
				this.joint_select();
			});
		},
		// 手动执行联检
		ex_joint_rule(rule_obj) {
			this.request('post', `${joint_rule_execute}/${rule_obj.id}`, this.token, (res) => {
				if (res.data.head.code == 200) {
					this.$message.success(`${res.data.head.message}`);
				} else {
					this.$message.error(`${res.data.head.message}`);
				}
			});
		},
		// 搜索联检记录
		search_record(current_page) {
			this.current_page = current_page || 1;
			this.html.page_loading = true;
			this.joint.record_list = [];
			this.request('post', record_search, this.token, { condition: {}, pageNum: this.current_page, pageSize: this.html.size, keyword: this.joint.log_search }, (res) => {
				console.log('联检记录表', res);
				this.html.page_loading = false;
				if (Object.entries(res.data.data).length == 0) {
					return;
				}
				this.total_size = res.data.data.total;
				this.joint.record_list = res.data.data.data;
			});
		},
		// 查看联检记录
		check_record(row_data) {
			this.joint.record_detail_display = true;
			this.joint.record_empty = false;
			this.joint.record_devices = [];
			if (row_data.deviceInfoRecords == null) {
				this.joint.record_empty = true;
				return;
			}
			for (let i = 0; i < row_data.deviceInfoRecords.length; i++) {
				let t4 = row_data.deviceInfoRecords[i];
				let t = {
					name: t4.deviceName || '',
					status: t4.statusDesc || '',
					items: [],
				};
				if (t4.itemRecords != null) {
					for (let k = 0; k < t4.itemRecords.length; k++) {
						let t3 = t4.itemRecords[k];
						let t2 = {
							property: t3.itemName || '',
							status: t3.qualified ? '是' : '否',
						};
						t.items.push(t2);
					}
				}
				this.joint.record_devices.push(t);
			}
		},
		// 联检记录禁用日期
		joint_date_options() {
			let t = new Date();
			return {
				disabledDate(time) {
					return time.getTime() < new Date(`${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`).getTime();
				},
			};
		},
		// element card样式
		card_style() {
			return {
				display: 'flex',
				alignItems: 'center',
				height: '100%',
				justifyContent: 'space-between',
			};
		},
		// 跳转到设备页面
		turn_to_device(device_obj) {
			// if (device_obj.statusValue == 2) {
			// 	this.$message('设备不在线！');
			// 	return;
			// }
			this.device_obj = device_obj;
			this.html.iconize_device = false;
			if (device_obj.visualizedFlag) {
				this.html.turn_to_device = true;
				let name = encodeURIComponent(device_obj.deviceName);
				this.html.device_name = device_obj.deviceName;
				this.html.device_url = `../index.html?type=Visual_Preview&token=${this.token}&deviceId=${device_obj.id}&productId=${device_obj.productId}&device_name=${name}`;
			} else {
				if (device_obj.productUrl) {
					this.html.turn_to_device = true;
					let name = encodeURIComponent(device_obj.deviceName);
					this.html.device_name = device_obj.deviceName;
					this.html.device_url = `../index.html?type=${device_obj.productUrl}&token=${this.token}&id=${device_obj.id}&device_name=${name}`;
				} else {
					this.$message('请配置产品调控页面前端标识后再试');
				}
			}
		},
		// 最小化设备窗口
		iconize_device_window() {
			this.html.turn_to_device = false;
			this.html.iconize_device = true;
		},
		// 关闭设备窗口
		close_device_window() {
			this.html.turn_to_device = false;
			this.html.device_url = '';
		},
		// 最大化设备窗口
		full_size() {
			this.turn_to_device(this.device_obj);
		},
	},
});
