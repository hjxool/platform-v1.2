let url = `${我是接口地址}/`;
let devices_status_info_url = `${url}api-portal/deviceAnalyse/ops/search/devices`;
let all_device_url = `${url}api-portal/place/search/devices`;
let edit_device_url = `${url}api-device/device`; // 设备信息相关
let place_list = `${url}api-portal/place`;
let set_place_url = `${url}api-portal/place/set`;
let limits_url = `${url}api-user/menus/current`; //获取菜单权限
let place_type_url = `${url}api-portal/place/placeType`;
let user_list = `${url}api-user/users/tenantSimple`;

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			page_loading: true, //选项页切换
			distribute_place_display: false, //分配场所页面显示
			popover_loading: false, //分配场所弹窗查询和保存时加载
			edit_place_display: false, //编辑及新增场所时弹窗
		},
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
			place_list: [], //场所列表
			place_id: '', //场所id
		},
		edit_place_form: {
			type: 1, //编辑场所时所选的场所类型
			name: '',
		},
		// 场所表单验证规则
		place_rules: {
			name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
		},
		place_type_list: [], //场所类型
		config: {
			add_place_show: false,
			device_bind_show: false,
			rename_device_show: false,
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
		let limits2;
		for (let val of JSON.parse(sessionStorage.hushanwebmenuTree)) {
			if (val.path === '运维中心') {
				for (let val2 of val.subMenus) {
					if (val2.path === '运维中心_设备管理') {
						limits2 = val2.subMenus;
						continue;
					}
				}
				break;
			}
		}
		// 哪个按钮没权限就清除
		this.config.add_place_show = this.is_element_show(limits2, '新增场所');
		this.config.device_bind_show = this.is_element_show(limits2, '设备绑定');
		this.config.rename_device_show = this.is_element_show(limits2, '改名');

		this.get_place_type();
		this.req_user_list();
		this.get_all_user_devices();
		window.onresize = () => {
			let dom = document.querySelector('.all_device');
			this.devices.table_h = dom.offsetHeight - 20;
		};
		this.$nextTick(() => {
			let dom = document.querySelector('.all_device');
			this.devices.table_h = dom.offsetHeight - 20;
		});
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
			this.request('get', place_type_url, this.token, (res) => {
				this.place_type_list = res.data.data;
			});
		},
		// 租户列表
		req_user_list() {
			this.request('get', user_list, this.token, (res) => {
				if (typeof res.data.data == 'object' && res.data.data != null) {
					this.status.user_list = res.data.data;
				}
			});
		},
		// 获取用户下所有设备状态统计
		get_all_devices_status_info() {
			this.request('get', devices_status_info_url, this.token, (res) => {
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
				this.html.page_loading = false;
				let data = res.data.data;
				if (res.data.head.code != 200) {
					return;
				}
				this.devices.list = data.data || [];
				this.devices.total = data.total;
			});
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
		// 新增场所
		add_place(user_id) {
			this.add_or_edit = 'add';
			this.edit_place_form.type = 1;
			this.edit_place_form.name = '';
			this.add_user_id = user_id;
			this.html.edit_place_display = true;
		},
		// table勾选事件
		select_device(val) {
			this.devices.select_list = val;
		},
		// 修改设备名称
		edit_device_name(row_data) {
			this.$prompt('请输入名称', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
			}).then(({ value }) => {
				this.request('put', edit_device_url, this.token, { deviceName: value, id: row_data.id, productId: row_data.productId }, (res) => {
					if (res.data.head.code == 200) {
						row_data.deviceName = value;
					}
				});
			});
		},
		// 选择租户 展开场所列表
		select_user(user_obj) {
			if (this.status.user_id != user_obj.tenantId) {
				this.html.popover_loading = true;
				this.request('post', `${place_list}/${user_obj.tenantId}/findAll`, this.token, (res) => {
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
		// 选中租户下场所 记录所选租户和场所
		select_place(place, user) {
			this.status.place_id = place.id;
			this.userName_log = user.companyName;
			this.place_log = place;
		},
		// 分配未绑定设备到场所 提交按钮
		distribute_sub() {
			if (!this.status.place_id) {
				this.$message.error('请选择要绑定的场所');
				return;
			}
			this.html.popover_loading = true;
			let array = [];
			for (let val of this.devices.select_list) {
				array.push(val.id);
			}
			this.request('put', `${set_place_url}/${this.status.user_id}/${this.status.place_id}`, this.token, array, (res) => {
				this.html.popover_loading = false;
				if (res.data.head.code == 200) {
					this.html.distribute_place_display = false;
					for (let val of this.devices.select_list) {
						val.companyName = this.userName_log;
						val.placeName = this.place_log.placeName;
						val.placeTypeValue = this.place_log.placeTypeValue;
					}
				}
			});
		},
		// 新增/编辑场所
		place_submit() {
			this.$refs.edit_place_form.validate((result) => {
				if (result) {
					if (this.add_or_edit == 'add') {
						this.request('post', `${place_list}/${this.add_user_id}/add`, this.token, { placeName: this.edit_place_form.name, placeType: this.edit_place_form.type }, (res) => {
							this.html.edit_place_display = false;
							if (res.data.head.code == 200) {
								this.$message.success(`新增 ${this.edit_place_form.name} 场所成功`);
							} else {
								this.$message('新增场所失败');
							}
						});
					}
				}
			});
		},
		// 当搜索框为空重置搜索内容
		is_empty() {
			if (!this.devices.search) {
				this.get_all_user_devices();
			}
		},
	},
});
