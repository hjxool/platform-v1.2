let url = `${我是接口地址}/`;
let device_list = `${url}api-portal/place/device`;
let place_list = `${url}api-portal/place`;
let unbind_device_url = `${url}api-portal/place/delete`;
let device_alert_url = `${url}api-portal/device-alarm/search`;
let visual_config_url = `${url}api-device/device/controlPanel/switch`; //专属可视化开关
let handle_alert_url = `${url}api-portal/device-alarm/deal`;
let edit_device_url = `${url}api-device/device`; // 设备信息相关
let limits_url = `${url}api-user/menus/current`; //获取菜单权限
let user_list = `${url}api-user/users/tenantSimple`;
let curent_user_name_url = `${url}api-auth/oauth/user/tenant`;
let place_type_url = `${url}api-portal/place/placeType`;

let vm = new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			product_type: ['直连设备', '网关', '网关子设备'], //产品类型
			edit_place_display: false, //编辑及新增场所时弹窗
			place_icon_display: -1, //鼠标移入时显示场所图标
			place_fold: false, //场所折叠
			turn_to_device: false, //跳转设备弹窗显示
			device_name: '', //设备弹窗下设备名称
			device_url: '', //设备跳转路径
			iconize_device: false, //最小化弹窗
			alert_detail_display: false, //告警详情弹窗
			visualizedFlag: false, //是否显示可视化编辑按钮
			click_frequence: false, //限制点击频率
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
		// 设备监控
		status: {
			user_list: [], //租户列表
			user_id: '', //租户id
			place_types: [], //场所设备的状态类型
			place_list: [], //场所列表
			place_id: '', //场所id
			place_devices: [], // 设备列表
			total_alert: 0, //告警总条数
			page_size: 20, //一页最大显示条数
			alert_table_h: 0,
			alert_list: [], //告警列表
			visual_exclusive_config: [], // 设备专属可视化页面参数
			open_visual_edit: false, // 没打开可视化编辑时区分显示
		},
		config: {
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
		let limits3;
		for (let val of JSON.parse(sessionStorage.hushanwebmenuTree)) {
			if (val.path === '运维中心') {
				for (let val2 of val.subMenus) {
					if (val2.path === '运维中心_设备监控') {
						limits3 = val2.subMenus;
						continue;
					}
				}
				break;
			}
		}
		// 哪个按钮没权限就清除
		this.config.control_device_show = this.is_element_show(limits3, '查看设备详情');
		this.config.del_place_show = this.is_element_show(limits3, '删除场所');
		this.config.del_device_show = this.is_element_show(limits3, '移除设备');
		this.config.rename_place_show = this.is_element_show(limits3, '重命名');

		await this.get_place_type();
		await this.req_user_list();
		await this.req_place_list();
		this.get_place_devices(this.status.place_list[0].id);
		window.onresize = () => {
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
				let t = val.path.split('_');
				if (t[t.length - 1] === key) {
					return true;
				}
			}
			return false;
		},
		// 场所类型获取
		get_place_type() {
			return this.request('get', place_type_url, this.token, (res) => {
				this.place_type_list = res.data.data;
			});
		},
		// 租户列表
		async req_user_list() {
			await this.request('get', user_list, this.token, (res) => {
				if (typeof res.data.data == 'object' && res.data.data != null) {
					this.status.user_list = res.data.data;
				}
			});
			return this.request('put', curent_user_name_url, this.token, (res) => {
				for (let val of this.status.user_list) {
					if (val.companyName == res.data.data) {
						this.status.user_id = val.tenantId;
						break;
					}
				}
			});
		},
		// 场所下设备列表
		get_place_devices(id) {
			if (id) {
				this.status.place_id = id;
				// 只有点击场所时才会传入id 也只有此时才需要给父页面发送消息
				window.parent.postMessage({ id, type: '设备监控切换场所' });
			}
			this.status.place_devices = [];
			this.status.place_types = [
				{ num: 0, type: '全部' },
				{ num: 0, type: '在线' },
				{ num: 0, type: '告警' },
			];
			this.request('post', `${device_list}/${this.status.user_id}/${this.status.place_id}`, this.token, { condition: {} }, (res) => {
				this.status.place_types = [
					{ num: 0, type: '全部' },
					{ num: 0, type: '在线' },
					{ num: 0, type: '告警' },
				];
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
		// 编辑场所
		edit_place(place_obj) {
			this.add_or_edit = 'edit';
			this.edit_place_form.type = place_obj.placeType;
			this.edit_place_form.name = place_obj.placeName;
			this.edit_place_id = place_obj.id;
			this.html.edit_place_display = true;
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
		// 跳转到设备页面
		async turn_to_device(device_obj) {
			// if (device_obj.statusValue == 2) {
			// 	this.$message('设备不在线！');
			// 	return;
			// }
			// 保存下当前操作的对象
			this.device_obj = device_obj;
			this.html.iconize_device = false;
			// 保存设备id、产品id、以及是否可视化 用于回显及传参
			this.html.visualizedFlag = device_obj.visualizedFlag;
			this.status.open_visual_edit = false;
			if (device_obj.visualizedFlag) {
				// 先查专属可视化参数 再显示设备弹窗
				await this.exclusive_visual(device_obj);
				this.device_id = device_obj.id;
				this.product_id = device_obj.productId;
				this.html.turn_to_device = true;
				let name = encodeURIComponent(device_obj.deviceName);
				this.html.device_name = device_obj.deviceName;
				this.html.device_url = `../index.html?type=Visual_Preview&token=${this.token}&deviceId=${device_obj.id}&productId=${device_obj.productId}&device_name=${name}`;
				this.device_url = this.html.device_url;
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
		// 新增/编辑场所
		place_submit() {
			this.$refs.edit_place_form.validate((result) => {
				if (result) {
					if (this.add_or_edit == 'edit') {
						this.request(
							'put',
							`${place_list}/${this.status.user_id}/update`,
							this.token,
							{ id: this.edit_place_id, placeName: this.edit_place_form.name, placeType: this.edit_place_form.type },
							() => {
								this.html.edit_place_display = false;
								this.req_place_list();
							}
						);
					}
				}
			});
		},
		// 获取场所列表并保持选中的场所
		req_place_list() {
			return this.request('post', `${place_list}/${this.status.user_id}/findAll`, this.token, (res) => {
				if (typeof res.data.data == 'object' && res.data.data != null) {
					this.status.place_list = res.data.data;
				} else {
					this.$message.info('该租户下无场所');
				}
			});
		},
		// 编辑设备的专属可视化选项
		exclusive_visual(device) {
			return this.request('get', `${edit_device_url}/${device.id}`, this.token, (res) => {
				this.status.visual_exclusive_config = [];
				if (res.data.head.code !== 200) {
					return;
				}
				let data = res.data.data.controlPanelInfo;
				let pc = {
					label: 'PC',
					value: data.pc,
				};
				let app = {
					label: 'App',
					value: data.app,
				};
				let wechat = {
					label: 'WeChat',
					value: data.wechat,
				};
				this.status.visual_exclusive_config.push(pc, app, wechat);
			});
		},
		// 开关专属可视化
		exclusive_visual_save(obj, value) {
			if (this.html.click_frequence) {
				this.$message('点的太快啦！');
				return;
			}
			this.html.click_frequence = true;
			let pn;
			switch (obj.label) {
				case 'PC':
					pn = 'PC';
					break;
				case 'App':
					pn = 'PHONE';
					break;
				case 'WeChat':
					pn = 'WECHAT';
					break;
			}
			this.request('put', `${visual_config_url}/${pn}/${this.device_id}/${value}`, this.token, (res) => {
				this.html.click_frequence = false;
				if (res.data.head.code !== 200) {
					obj.value = value ? 0 : 1;
					return;
				}
				if (pn === 'PC') {
					this.html.device_url = '';
					this.$nextTick(() => {
						this.turn_to_device(this.device_obj);
					});
				}
			});
		},
		// 跳转设备可视化编辑
		turn_to_visual_edit(type) {
			this.status.open_visual_edit = true;
			this.html.device_url = `../index.html?type=visual_edit&id=${this.product_id}&token=${this.token}&platform=${type}&sbid=${this.device_id}`;
		},
		// 关闭可视化编辑返回之前设备页面
		close_visual_edit() {
			this.status.open_visual_edit = false;
			this.html.device_url = this.device_url;
		},
		// 最小化设备窗口
		iconize_device_window() {
			this.html.turn_to_device = false;
			this.html.iconize_device = true;
		},
		// 最大化设备窗口
		full_size() {
			this.html.turn_to_device = true;
			this.html.iconize_device = false;
		},
		// 关闭告警弹窗后要刷新当前场所
		close_alert_window() {
			if (this.status.total_alert === 0) {
				this.get_place_devices();
			}
			this.html.alert_detail_display = false;
		},
		// 处理告警消息
		handle_alert_message(alert_obj) {
			this.request('post', handle_alert_url, this.token, [alert_obj.id], () => {
				this.alert_detail(this.alert_device_id);
			});
		},
		// 关闭设备窗口
		close_device_window() {
			this.html.turn_to_device = false;
			this.html.device_url = '';
		},
	},
});
// 设备可视化编辑保存后触发方法
function bjqifbc() {
	vm.turn_to_device(vm.device_obj);
}
