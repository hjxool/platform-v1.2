let url = `${我是接口地址}/`;
let device_list = `${url}api-portal/place/device`; // 分页查询场所下的设备
let room_search = `${url}api-portal/place/search`; // 根据应用查询场所(设备监控)
let limits_url = `${url}api-user/menus/current`; //获取菜单权限
let place_gplot_url = `${url}api-portal/device-topo/panel/place`; // 根据场所id查询拓扑图

Vue.config.productionTip = false;
new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			page_select: '', // 页面选择
			page_loading: true, // 加载大页面时loading遮罩
			popup_loading: false, // 加载二级弹窗loading遮罩
			detail_display: false, //设备等信息页面显示
			size: 20, //一页显示总数
			turn_to_device: false, //跳转设备弹窗显示
			device_name: '', //设备弹窗下设备名称
			device_url: '', //设备跳转路径
			iconize_device: false, //最小化弹窗
			gplot_url: '', // 系统拓扑图地址
			control_url: '', // 集中控制地址
		},
		place_list: [], //会议室列表
		device: {
			list: [], // 设备卡片列表
			list_empty: false, //设备列表为空时显示
		},
		config: {
			detail_show: false,
			control_show: false,
			// 页面显示内容
			menus: [
				{ label: '集中管控', value: '1', show: false },
				{ label: '系统拓扑图', value: '2', show: false },
				{ label: '设备管理', value: '3', show: false },
			],
			default_menu: '', // 默认显示
		},
		place_id: '', // 场所id
	},
	async mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
			this.application = decodeURIComponent(window.sessionStorage.application);
		} else {
			this.get_token();
			this.application = decodeURIComponent(this.application);
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
		let limits;
		for (let val of JSON.parse(sessionStorage.hushanwebmenuTree)) {
			if (val.path === '云会管平台') {
				for (let val2 of val.subMenus) {
					if (val2.path === '云会管平台_物联管控') {
						for (let val3 of val2.subMenus) {
							if (val3.path === '云会管平台_物联管控_设备监控') {
								limits = val3.subMenus;
								break;
							}
						}
						break;
					}
				}
				break;
			}
		}
		this.config.detail_show = this.is_element_show(limits, '查看设备详情');
		this.config.control_show = this.is_element_show(limits, '设备操作');
		this.config.menus[0].show = this.is_element_show(limits, '集中管控');
		this.config.menus[1].show = this.is_element_show(limits, '系统拓扑图');
		this.config.menus[2].show = this.is_element_show(limits, '设备管理');
		for (let val of this.config.menus) {
			if (val.show) {
				this.config.default_menu = val.value;
				break;
			}
		}
		this.get_place_list();
		window.onmessage = ({ data: res }) => {
			// 收到子页面发来的设备id 在设备列表中找到对应对象调用方法
			for (let val of this.device.list) {
				if (val.id === res.device_id) {
					this.turn_to_device(val);
					break;
				}
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
		// 获取会议室列表
		get_place_list() {
			this.html.page_loading = true;
			let applicationId;
			switch (this.application) {
				case '云会管平台':
					applicationId = '7';
					break;
				case '智慧音视频广播':
					applicationId = '17';
					break;
			}
			this.request('get', `${room_search}/${applicationId}`, this.token, (res) => {
				console.log('会议室列表', res);
				this.html.page_loading = false;
				if (res.data.head.code != 200) {
					return;
				}
				this.place_list = res.data.data;
			});
		},
		// 场所一切换 设备列表就要更新
		async place_change(place_id) {
			if (!this.config.detail_show) {
				this.$message.error('没权限查看');
				return;
			}
			this.html.page_loading = true;
			this.place_id = place_id;
			this.device.list = [];
			// 判断有权限的页面按钮里哪个在前
			for (let val of this.config.menus) {
				if (val.show) {
					this.html.page_select = val.value;
					break;
				}
			}
			await this.request('post', `${device_list}/${this.place_id}`, this.token, {}, async (res) => {
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
			this.html.control_url = '';
			if (this.config.menus[0].show) {
				this.request('get', `${place_gplot_url}/${place_id}?panelType=1`, this.token, ({ data: res }) => {
					if (res.head.code !== 200 || !res.data?.panelId) {
						return;
					}
					this.html.control_url = `../index.html?type=CentralizedControlPanel&id=${res.data.panelId}&token=${this.token}`;
				});
			}
			this.html.gplot_url = '';
			if (this.config.menus[1].show) {
				// 根据场所id查询绑定的拓扑图
				// 赋值跳转拓扑图url
				this.request('get', `${place_gplot_url}/${place_id}?panelType=2`, this.token, ({ data: res }) => {
					if (res.head.code !== 200 || !res.data?.panelId) {
						return;
					}
					this.html.gplot_url = `../index.html?type=CentralizedControlPanel&id=${res.data.panelId}&token=${this.token}`;
				});
			}
		},
		// 页面选择
		page_switch(page_index) {
			this.html.page_select = page_index;
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
