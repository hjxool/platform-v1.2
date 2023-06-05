let url = `${我是接口地址}/`;
let user_list = `${url}api-user/users/tenantSimple`;
let place_list = `${url}api-portal/place`;
let device_list = `${url}api-portal/place/device`;
let place_type_url = `${url}api-portal/place/placeType`;
let all_device_url = `${url}api-portal/place/search/devices`;
let set_place_url = `${url}api-portal/place/set`;
let curent_user_name_url = `${url}api-auth/oauth/user/tenant`;
let unbind_device_url = `${url}api-portal/place/delete`;
let devices_status_info_url = `${url}api-portal/deviceAnalyse/ops/search/devices`;
let edit_device_url = `${url}api-device/device`;
let device_alert_url = `${url}api-portal/device-alarm/search`;
let handle_alert_url = `${url}api-portal/device-alarm/deal`;
let limits_url = `${url}api-user/menus/current`; //获取菜单权限

Vue.config.productionTip = false;
new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		token: '',
		html: {
			option: [
				{ name: '设备管理', src_light: './img/设备明.png', src_dark: './img/设备暗.png' },
				{ name: '设备监控', src_light: './img/场景明.png', src_dark: './img/场景暗.png' },
			], //场所选项样式
			option_focus: 0, //场景/设备选项
			product_type: ['直连设备', '网关', '网关子设备'], //产品类型
			edit_place_display: false, //编辑及新增场所时弹窗
			place_icon_display: -1, //鼠标移入时显示场所图标
			place_fold: false, //场所折叠
			page_loading: true, //选项页切换
			distribute_place_display: false, //分配场所页面显示
			popover_loading: false, //分配场所弹窗查询和保存时加载
			turn_to_device: false, //跳转设备弹窗显示
			device_name: '', //设备弹窗下设备名称
			device_url: '', //设备跳转路径
			iconize_device: false, //最小化弹窗
			alert_detail_display: false, //告警详情弹窗
		},
		place_type_list: [], //场所类型
		edit_place_form: {
			type: 1, //编辑场所时所选的场所类型
			name: '',
		},
		// 场所表单验证规则
		place_rules: {
			name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
		},
		// 设备管理
		devices: {
			type: 0, // 在线、离线、未分配设备类型
			search: '', //搜索所有租户下设备
			list: [], //所有设备列表
			select_list: [], //所有设备中勾选的
			table_h: 0, // 表格高度
			total: 0, //当前类型下全部设备条数
			type_total: 0, //全部设备数
			type_unbinding: 0, //未绑定设备数
			type_online: 0, //在线数
			type_offline: 0, //离线数
			// is_check_all: false, //是否点击了全选
			page_size: 10, //一页最大显示条数
		},
		// 设备监控
		status: {
			user_list: [], //租户列表
			user_id: '', //租户id
			user_types: [], //租户设备的状态类型
			place_types: [], //场所设备的状态类型
			place_list: [], //场所列表
			place_id: '', //场所id
			place_devices: [], // 设备列表
			total_alert: 0, //告警总条数
			page_size: 20, //一页最大显示条数
			alert_table_h: 0,
			alert_list: [], //告警列表
		},
		config: {
			device_manage_show: false,
			device_control_show: false,
			add_place_show: false,
			device_bind_show: false,
			rename_device_show: false,
			control_device_show: false,
			del_place_show: false,
			del_device_show: false,
			rename_place_show: false,
		},
	},
	async mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
		} else {
			this.get_token();
		}
		if (!sessionStorage.hushanwebmenuTree) {
			await new Promise((success) => {
				this.request('get', limits_url, this.token, (res) => {
					success();
					if (res.data.head.code !== 200) {
						return;
					}
					sessionStorage.hushanwebmenuTree = JSON.stringify(res.data.data.menuTree);
				});
			});
		}
		// 解析权限树
		let limits, limits2, limits3;
		for (let val of JSON.parse(sessionStorage.hushanwebmenuTree)) {
			if (val.name === '运维中心') {
				limits = val.subMenus;
				for (let val2 of val.subMenus) {
					if (val2.name === '设备管理') {
						limits2 = val2.subMenus;
						continue;
					}
					if (val2.name === '设备监控') {
						limits3 = val2.subMenus;
						continue;
					}
				}
				break;
			}
		}
		this.config.device_manage_show = this.is_element_show(limits, '设备管理');
		this.config.device_control_show = this.is_element_show(limits, '设备监控');
		// 哪个按钮没权限就清除
		if (!this.config.device_manage_show) {
			this.html.option.splice(0, 1);
		}
		if (!this.config.device_control_show) {
			this.html.option.splice(1, 1);
		}
		if (this.config.device_manage_show) {
			this.config.add_place_show = this.is_element_show(limits2, '新增场所');
			this.config.device_bind_show = this.is_element_show(limits2, '设备绑定');
			this.config.rename_device_show = this.is_element_show(limits2, '改名');
		}
		if (this.config.device_control_show) {
			this.config.control_device_show = this.is_element_show(limits3, '查看设备详情');
			this.config.del_place_show = this.is_element_show(limits3, '删除场所');
			this.config.del_device_show = this.is_element_show(limits3, '移除设备');
			this.config.rename_place_show = this.is_element_show(limits3, '重命名');
		}

		this.get_place_type();
		this.option_switch(0);
		window.onresize = () => {
			let dom = document.querySelector('.all_device');
			this.devices.table_h = dom.offsetHeight - 20;
			if (this.html.alert_detail_display) {
				let dom2 = document.querySelector('.alert_body');
				this.status.alert_table_h = dom2.offsetHeight;
			}
		};
	},
	methods: {
		// 解析权限树
		is_element_show(source, key) {
			for (let val of source) {
				if (val.name === key) {
					return true;
				}
			}
			return false;
		},
		// 租户列表
		req_user_list() {
			this.request('get', user_list, this.token, (res) => {
				console.log('租户', res);
				if (typeof res.data.data == 'object' && res.data.data != null) {
					this.status.user_list = res.data.data;
					this.request('put', curent_user_name_url, this.token, (res) => {
						for (let val of this.status.user_list) {
							if (val.companyName == res.data.data) {
								this.status.user_id = val.tenantId;
								this.req_place_list();
							}
						}
					});
				}
			});
		},
		// 租户下场所列表
		req_place_list() {
			this.request('post', `${place_list}/${this.status.user_id}/findAll`, this.token, (res) => {
				console.log('场所', res);
				if (res.data.data != null && typeof res.data.data == 'object' && res.data.data.length > 0) {
					this.status.place_list = res.data.data;
					this.get_place_devices(res.data.data[0].id);
				} else {
					this.$message.info('该租户下无场所');
				}
			});
		},
		// 场所类型获取
		get_place_type() {
			this.request('get', place_type_url, this.token, (res) => {
				console.log('场所类型', res);
				this.place_type_list = res.data.data;
			});
		},
		// 场所下设备列表
		get_place_devices(id) {
			if (id) {
				this.status.place_id = id;
			}
			this.status.place_devices = [];
			this.status.place_types = [
				{ num: 0, type: '全部' },
				{ num: 0, type: '在线' },
				{ num: 0, type: '告警' },
			];
			this.request('post', `${device_list}/${this.status.user_id}/${this.status.place_id}`, this.token, { condition: {} }, (res) => {
				console.log('设备', res);
				if (typeof res.data == 'object' && res.data.data != null) {
					this.status.place_devices = res.data.data;
					for (let i = 0; i < this.status.place_devices.length; i++) {
						let t = this.status.place_devices[i];
						if (t.statusValue != 0) {
							this.status.place_types[0].num++;
							if (t.statusValue == 1) {
								this.status.place_types[1].num++;
							}
							if (t.isAlarm == 1) {
								this.status.place_types[2].num++;
							}
						}
					}
				}
			});
		},
		// 新增场所
		add_place(user_id) {
			this.add_or_edit = 'add';
			this.edit_place_form.type = 1;
			this.edit_place_form.name = '';
			this.add_user_id = user_id;
			this.html.edit_place_display = true;
		},
		// 编辑场所
		edit_place(place_obj) {
			this.add_or_edit = 'edit';
			this.edit_place_form.type = place_obj.placeType;
			this.edit_place_form.name = place_obj.placeName;
			this.edit_place_id = place_obj.id;
			this.html.edit_place_display = true;
		},
		// 新增/编辑场所
		place_submit() {
			this.$refs.edit_place_form.validate((result) => {
				if (result) {
					if (this.add_or_edit == 'add') {
						this.request('post', `${place_list}/${this.add_user_id}/add`, this.token, { placeName: this.edit_place_form.name, placeType: this.edit_place_form.type }, (res) => {
							this.html.edit_place_display = false;
							// if (this.add_user_id == this.status.user_id) {
							// 	this.refresh_place_list();
							// }
							if (res.data.head.code == 200) {
								this.$message.success(`新增 ${this.edit_place_form.name} 场所成功`);
							} else {
								this.$message('新增场所失败');
							}
						});
					} else if (this.add_or_edit == 'edit') {
						this.request(
							'put',
							`${place_list}/${this.status.user_id}/update`,
							this.token,
							{ id: this.edit_place_id, placeName: this.edit_place_form.name, placeType: this.edit_place_form.type },
							() => {
								this.html.edit_place_display = false;
								this.refresh_place_list();
							}
						);
					}
				}
			});
		},
		// 删除场所
		del_place(place_obj) {
			let text = `${place_obj.placeTypeValue}正在使用该场所，删除场所后，场所内设备将变成未分配，是否确认删除？`;
			this.$confirm(text, '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'info',
				center: true,
			}).then(() => {
				this.request('delete', `${place_list}/${this.status.user_id}/${place_obj.id}`, this.token, () => {
					this.req_place_list();
				});
			});
		},
		// 获取场所列表并保持选中的场所
		refresh_place_list() {
			this.request('post', `${place_list}/${this.status.user_id}/findAll`, this.token, (res) => {
				console.log('场所', res);
				if (typeof res.data.data == 'object' && res.data.data != null) {
					this.status.place_list = res.data.data;
				}
			});
		},
		// 拖拽设备
		drag_device(device) {
			this.device_id = device.id;
		},
		// 拖拽放开时清除设备id等
		drop(e) {
			if (e.target.id != 'del_area') {
				this.device_id = '';
			}
		},
		// 拖拽删除场所设备
		del_device() {
			if (this.device_id) {
				this.$confirm('确定删除设备?', '提示', {
					confirmButtonText: '确定',
					cancelButtonText: '取消',
					type: 'info',
					center: true,
				}).then(() => {
					this.request('put', `${unbind_device_url}/${this.status.user_id}/${this.status.place_id}`, this.token, [this.device_id], (res) => {
						if (res.data.head.code == 200) {
							this.$message.success('设备解绑成功');
							this.get_place_devices();
						} else {
							this.$message('设备解绑失败');
						}
						this.device_id = '';
					});
				});
			}
		},
		// 跳转到设备页面
		turn_to_device(device_obj) {
			// if (device_obj.statusValue == 2) {
			// 	this.$message('设备不在线！');
			// 	return;
			// }
			//#region
			// if (type == 0) {
			// 	if (device_obj.visualizedFlag) {
			// 		window.open(`../index.html?type=Visual_Preview&token=${this.token}&deviceId=${device_obj.id}&productId=${device_obj.productId}`);
			// 	} else {
			// 		this.$message('请配置产品可视化界面后再试');
			// 	}
			// } else {
			// 	if (device_obj.productUrl) {
			// 		let name = encodeURIComponent(device_obj.deviceName);
			// 		window.open(`../index.html?type=${device_obj.productUrl}&token=${this.token}&id=${device_obj.id}&device_name=${name}`);
			// 	} else {
			// 		this.$message('请配置产品调控页面前端标识后再试');
			// 	}
			// }
			//#endregion
			// 保存下当前操作的对象
			this.device_obj = device_obj;
			this.html.iconize_device = false;
			if (device_obj.visualizedFlag) {
				this.html.turn_to_device = true;
				let name = encodeURIComponent(device_obj.deviceName);
				this.html.device_name = device_obj.deviceName;
				// window.open(`../index.html?type=Visual_Preview&token=${this.token}&deviceId=${device_obj.id}&productId=${device_obj.productId}&device_name=${name}`);
				this.html.device_url = `../index.html?type=Visual_Preview&token=${this.token}&deviceId=${device_obj.id}&productId=${device_obj.productId}&device_name=${name}`;
			} else {
				if (device_obj.productUrl) {
					this.html.turn_to_device = true;
					let name = encodeURIComponent(device_obj.deviceName);
					this.html.device_name = device_obj.deviceName;
					// window.open(`../index.html?type=${device_obj.productUrl}&token=${this.token}&id=${device_obj.id}&device_name=${name}`);
					this.html.device_url = `../index.html?type=${device_obj.productUrl}&token=${this.token}&id=${device_obj.id}&device_name=${name}`;
				} else {
					this.$message('请配置产品调控页面前端标识后再试');
				}
			}
		},
		// 切换选项查看场所信息
		option_switch(index) {
			this.html.option_focus = index;
			this.req_user_list();
			if (this.html.option[index].name === '设备管理') {
				this.get_all_user_devices();
				this.request('get', user_list, this.token, (res) => {
					console.log('租户', res);
					if (typeof res.data.data == 'object' && res.data.data != null) {
						this.status.user_list = res.data.data;
					}
				});
				this.$nextTick(() => {
					let dom = document.querySelector('.all_device');
					this.devices.table_h = dom.offsetHeight - 20;
				});
			} else if (this.html.option[index].name == '设备监控') {
				this.req_user_list();
			}
		},
		// 查询所有租户设备
		get_all_user_devices(cur_page) {
			this.get_all_devices_status_info();
			let data = {
				condition: {},
				pageSize: this.devices.page_size,
			};
			if (typeof cur_page == 'number') {
				data.pageNum = cur_page;
			} else {
				data.pageNum = 1;
			}
			data.keyword = this.devices.search;
			switch (this.devices.type) {
				case 1:
					data.condition.tenantId = -1;
					break;
				case 2:
					data.condition.statusValue = 1;
					break;
				case 3:
					data.condition.statusValue = 2;
					break;
			}
			this.html.page_loading = true;
			this.request('post', all_device_url, this.token, data, (res) => {
				console.log('所有设备', res);
				this.html.page_loading = false;
				let data = res.data.data;
				if (res.data.head.code != 200) {
					return;
				}
				// if (res.data.head.code == 200 && data.data.length==0) {
				// 	this.devices.type = 0;
				// 	this.devices.search = '';
				// 	this.get_all_user_devices();
				// 	return;
				// }
				this.devices.list = data.data || [];
				this.devices.total = data.total;
			});
		},
		// table勾选事件
		select_device(val) {
			this.devices.select_list = val;
		},
		//#region
		// 单独勾选触发事件
		// row_select(array, row_obj) {
		// 	if (row_obj.companyName !== '未绑定') {
		// 		this.$message('不能勾选已绑定设备');
		// 		this.$refs.devices.toggleRowSelection(row_obj, false);
		// 	}
		// 	this.devices.select_list = [];
		// 	for (let val of array) {
		// 		if (val.companyName === '未绑定') {
		// 			this.devices.select_list.push(val);
		// 		}
		// 	}
		// },
		// 全选触发事件
		// all_select(array) {
		// 	this.devices.select_list = [];
		// 	if (this.devices.is_check_all) {
		// 		this.$refs.devices.clearSelection();
		// 	} else {
		// 		let f = false;
		// 		for (let val of array) {
		// 			if (val.companyName === '未绑定') {
		// 				this.devices.select_list.push(val);
		// 			} else {
		// 				f = true;
		// 				this.$refs.devices.toggleRowSelection(val, false);
		// 			}
		// 		}
		// 		if (f) {
		// 			this.$message('勾选项中有已绑定设备');
		// 		}
		// 	}
		// 	this.devices.is_check_all = !this.devices.is_check_all;
		// 	this.$forceUpdate();
		// },
		//#endregion
		// 当搜索框为空重置搜索内容
		is_empty() {
			if (!this.devices.search) {
				this.get_all_user_devices();
			}
		},
		// 分配场所
		distribute_place() {
			if (this.devices.select_list.length == 0) {
				this.$message('必须勾选设备');
				return;
			}
			this.html.distribute_place_display = true;
			this.status.user_id = '';
			this.status.place_id = '';
		},
		// 选择租户 展开场所列表
		select_user(user_obj) {
			if (this.status.user_id != user_obj.tenantId) {
				this.html.popover_loading = true;
				this.request('post', `${place_list}/${user_obj.tenantId}/findAll`, this.token, (res) => {
					console.log('场所', res);
					this.html.popover_loading = false;
					if (res.data.data != null && typeof res.data.data == 'object' && res.data.data.length > 0) {
						this.status.user_id = user_obj.tenantId;
						this.status.place_list = res.data.data;
					} else {
						this.$message.info('该租户下无场所');
					}
				});
			} else {
				this.status.user_id = -1;
			}
		},
		// 分配未绑定设备到场所 提交按钮
		distribute_sub() {
			this.html.popover_loading = true;
			let array = [];
			for (let val of this.devices.select_list) {
				array.push(val.id);
			}
			this.request('put', `${set_place_url}/${this.status.user_id}/${this.status.place_id}`, this.token, array, (res) => {
				this.html.popover_loading = false;
				if (res.data.head.code == 200) {
					this.html.distribute_place_display = false;
					this.get_all_user_devices();
				}
			});
		},
		// 修改设备名称
		edit_device_name(row_data) {
			this.$prompt('请输入名称', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
			}).then(({ value }) => {
				this.request('put', edit_device_url, this.token, { deviceName: value, id: row_data.id, productId: row_data.productId }, (res) => {
					if (res.data.head.code == 200) {
						this.get_all_user_devices();
					}
				});
			});
		},
		// 获取用户下所有设备状态统计
		get_all_devices_status_info() {
			this.request('get', devices_status_info_url, this.token, (res) => {
				console.log('设备状态统计', res);
				if (res.data.head.code != 200) {
					return;
				}
				let data = res.data.data;
				this.devices.type_total = data.all;
				this.devices.type_online = data.online;
				this.devices.type_offline = data.offline;
				this.devices.type_unbinding = data.initial;
			});
		},
		// 显示和隐藏对应跳转选项
		turn_to_display(index) {
			if (this.html.turn_to_display == index) {
				this.html.turn_to_display = -1;
			} else {
				this.html.turn_to_display = index;
			}
		},
		// 最小化设备窗口
		iconize_device_window() {
			this.html.turn_to_device = false;
			this.html.iconize_device = true;
		},
		// 最大化设备窗口
		full_size() {
			this.turn_to_device(this.device_obj);
		},
		// 关闭设备窗口
		close_device_window() {
			this.html.turn_to_device = false;
			this.html.device_url = '';
		},
		// 告警弹窗显示
		alert_detail(params) {
			// 形参是数字则是翻页 是对象则检索第一页
			let n;
			if (typeof params == 'number') {
				n = params;
			} else {
				n = 1;
				this.alert_device_id = params;
			}
			this.request('post', device_alert_url, this.token, { condition: { deviceId: this.alert_device_id, alarmDeal: false }, pageNum: n, pageSize: this.status.page_size }, (res) => {
				console.log('设别告警', res);
				if (res.data.head.code != 200) {
					return;
				}
				this.html.alert_detail_display = true;
				this.status.alert_list = res.data.data.data;
				this.status.total_alert = res.data.data.total;
				// 第一次点开弹窗要计算高度
				if (typeof params == 'string') {
					this.$nextTick(() => {
						let dom = document.querySelector('.alert_body');
						this.status.alert_table_h = dom.offsetHeight;
					});
				}
			});
		},
		// 处理告警消息
		handle_alert_message(alert_obj) {
			this.request('post', handle_alert_url, this.token, [alert_obj.id], () => {
				this.alert_detail(this.alert_device_id);
			});
		},
		// 关闭告警弹窗后要刷新当前场所
		close_alert_window() {
			if (this.status.total_alert === 0) {
				this.get_place_devices();
			}
			this.html.alert_detail_display = false;
		},
	},
});
