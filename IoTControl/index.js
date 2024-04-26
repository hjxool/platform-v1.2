let url = `${我是接口地址}/`;
let rule_search = `${url}api-portal/online-check-rule/search`;
let update_rule = `${url}api-portal/online-check-rule/saveOrUpdate`;
let device_list = `${url}api-portal/place/device`; // 分页查询场所下的设备
let room_search = `${url}api-portal/place/search`; // 根据应用查询场所(设备监控)
let model_server_search = `${url}api-device/protocol/current/services`;
let record_search = `${url}api-portal/online-check-record/search`;
let all_device_url = `${url}api-device/device/search`;
let limits_url = `${url}api-user/menus/current`; //获取菜单权限
let place_gplot_url = `${url}api-portal/device-topo/panel/place`; // 根据场所id查询拓扑图
let meeting_list_url = `${url}api-portal/meeting/list`; // 查询会议
let device_status_url = `${url}api-device/device/status`; // 查询设备属性值
let sendCmdtoDevice_url = `${url}api-device/device/panel/operation`; // 下发指令
let end_meeting_url = `${url}api-portal/meeting/stop`; //结束会议
let delay_meeting_url = `${url}api-portal/meeting/delay`; // 延迟会议
let bind_device_url = `${url}api-portal/deviceControlConfig/saveOrUpdate`; // 场所下 绑定设备id
let get_place_bind_url = `${url}api-portal/deviceControlConfig`; // 根据场所id查询绑定字段
let decive_report_url = `${url}api-device/device/panel/switch`; //设备开始上报
let get_user_info_url = `${url}api-auth/oauth/userinfo`; //获取用户信息

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
		// 集中控制
		control: {
			// place_name: '', // 会议室名称
			// theme: '无', // 会议名
			// next_meeting: '无', //下场会议
			// 时间
			// times: [
			// 	['0', '0'],
			// 	['0', '0'],
			// 	['0', '0'],
			// ],
			// 底端按钮
			buttons: [
				{ img: './img/icon9.png', title: '一键巡检会议室设备' },
				// { img: './img/icon10.png', title: '一键静音' },
				{ img: './img/icon11.png', title: '一键开启全部设备' },
				{ img: './img/icon12.png', title: '一键关闭全部设备' },
			],
			// 环境系统监控
			env_icon: [
				{ img: './img/icon14.png', title: '温度', value: '', unit: '℃' },
				{ img: './img/icon15.png', title: '湿度', value: '', unit: '%' },
				{ img: './img/icon16.png', title: '光照度', value: '', unit: 'lux' },
				{ img: './img/icon17.png', title: '二氧化碳', value: '', unit: 'PPM' },
				{ img: './img/icon18.png', title: '挥发物', value: '', unit: 'ug/m³' },
				{ img: './img/icon19.png', title: '甲醛', value: '', unit: 'mg/m³' },
			],
			// 灯光按钮
			lights: [
				{ title: '模式一', value: Math.ceil(254 * 0.3) },
				{ title: '模式二', value: Math.ceil(254 * 0.5) },
				{ title: '模式三', value: 254 },
			],
			light_mode: -1, //灯光模式 1~254之间的值
			light_switch: false, // 灯光开关
			// 窗帘按钮
			curtains: [
				{ title: '全闭', value: 0 },
				{ title: '全开', value: 100 },
				{ title: '半开', value: 50 },
			],
			curtain_mode: -1, //窗帘控制
			// 音柱控制
			sounds: [
				{ title: '左侧音柱输出', value: 0, switch: false, tag1: 'sound_left_de', tag2: 'sound_left_add', tag3: 'sound_left_on' },
				{ title: '右侧音柱输出', value: 0, switch: false, tag1: 'sound_right_de', tag2: 'sound_right_add', tag3: 'sound_right_on' },
			],
			sound_button_mute: [0, 0, 0, 0, 0, 0, 0, 0], // 扩声一键静音及开启
			// 扩声按钮
			sound_buttons: [
				// { title: '一键静音', tag: 'sound_mute' },
				{ title: '一键开启', tag: 'sound_open' },
				{ title: '一键关闭', tag: 'sound_close' },
			],
			// 场景系统
			scenes: [
				{ img: './img/icon31.png', title: '音频矩阵', tag: 'scene_sound' },
				{ img: './img/icon32.png', title: '视频矩阵', tag: 'scene_video' },
				// { img: './img/icon33.png', title: '摄像头矩阵', tag: 'scene_camera' },
			],
			// 麦克风系统
			microphones: [
				{ title: '发言人数', value: '', tag: 'voice_person' },
				{ title: '主音量', value: 0, tag: 'voice_main' },
				{ title: '线路输入音量', value: 0, tag: 'voice_line' },
				{ title: '话筒输入音量', value: 0, tag: 'voice_input' },
			],
			mp_p_options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 'ff'], // 麦克风发言人数选项
			// 麦克风 会议模式
			mp_meetings: [
				{ title: '先进先出', value: 0 },
				{ title: '限制发言', value: 1 },
				{ title: '申请发言', value: 2 },
				{ title: '声控发言', value: 3 },
			],
			microphone_mode: -1, //麦克风会议模式
			// microphone_mute: false, //麦克风主音量静音
			// delay_show: true, // 延迟会议按钮是否显示 无会议不显示
			// end_show: true, // 结束会议按钮是否显示 无会议不显示 结束后隐藏
			delay_pop_show: false, // 延迟会议窗口显示
			delay: 0, // 会议延迟时间 单位分钟
			bind_device_show: false, // 绑定设备弹窗显示
			bind: {
				left_sound: '', // 左侧音柱设备id
				right_sound: '', // 右侧音柱设备id
			},
			scene: {
				show: false, // 场景控制显示
				title: '', // 显示名
				sound: [], // 音频矩阵
				video: [], // 视频矩阵
				video1: ['IN1->OUTA', 'IN2->OUTA', 'IN3->OUTA', 'IN4->OUTA', 'IN1->OUTB', 'IN2->OUTB', 'IN3->OUTB', 'IN4->OUTB'], //运算中心一代
				video_matrix: [0, 0, 0, 0], // 视频矩阵回显
				video_matrix1: [1, 1], // 视频矩阵一代回显
				flag: false, // 运算中心一代false 运算中心二代 true
			},
			巡检: {
				show: false, // 弹窗显示
				// 巡检模板数据
				template: [
					{
						messageId: '1751455606081515520',
						deviceId: '1749679430560313344',
						deviceName: '物联会议室-运算中心二代',
						placeName: '智慧会议室',
						serviceName: '自检服务',
						operate: '巡检中',
						operateStatus: '',
					},
					{
						messageId: '1751455606081515521',
						deviceId: '1614154222536761344',
						deviceName: '物联会议室智慧音频终端/17514556060815155211614154222536761344WLYP08A-右',
						placeName: '智慧会议室',
						serviceName: '设备巡检并返回结果',
						operate: '巡检中',
						operateStatus: '',
					},
					{
						messageId: '1751455606089904128',
						deviceId: '1614154255491407872',
						deviceName: '物联会议室智慧音频终端/1751455606089904128 1614154255491407872WLYP08A-左',
						placeName: '智慧会议室',
						serviceName: '设备巡检并返回结果',
						operate: '巡检中',
						operateStatus: '',
					},
					{
						messageId: '1751455606140235776',
						deviceId: '1749617799256010752',
						deviceName: 'POE话筒1',
						placeName: '智慧会议室',
						serviceName: '读取音频链路状态',
						operate: '巡检中',
						operateStatus: '',
					},
					{
						messageId: '1751455606144430080',
						deviceId: '1749614003582857216',
						deviceName: 'POE话筒2',
						placeName: '智慧会议室',
						serviceName: '读取电平',
						operate: '巡检中',
						operateStatus: '',
					},
					{
						messageId: '1751455606148624384',
						deviceId: '1749614699954761728',
						deviceName: 'POE话筒3',
						placeName: '智慧会议室',
						serviceName: '读取电平',
						operate: '巡检中',
						operateStatus: '',
					},
					{
						messageId: '1751455606152818688',
						deviceId: '1749617588076998656',
						deviceName: 'POE话筒4',
						placeName: '智慧会议室',
						serviceName: '读取音频链路状态',
						operate: '巡检中',
						operateStatus: '',
					},
				],
				data: [], // 动态数据 每次切换场所重置为模板数据
				show2: false, // 全部完成提示弹窗
			},
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
		this.get_user_info();
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
		// 生成视频控制按钮
		for (let row = 0; row < 4; row++) {
			for (let col = 0; col < 4; col++) {
				let t = {
					label: `In${col + 1}->Out${row + 1}`,
					value: [col, row],
				};
				this.control.scene.video.push(t);
			}
		}
		// 生成音频矩阵按钮
		for (let k = 0; k < 9; k++) {
			let t = [];
			for (let j = 0; j < 12; j++) {
				t.push('0');
			}
			this.control.scene.sound.push(t);
		}
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
			this.init_control_data();
			await this.request('post', `${device_list}/${this.place_id}`, this.token, {}, async (res) => {
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
				// 先查一下 场所下绑定设备
				await this.get_place_bind();
				this.products = this.init_product_device();
				// 判断是运算中心一代还是二代
				if (this.products.运算中心二代.length) {
					this.control.scene.flag = true;
				} else if (this.products.运算中心.length) {
					this.control.scene.flag = false;
				}
				// 整合设备id
				this.list = [
					{ tag: '音频终端左', id: this.control.bind.left_sound },
					{ tag: '音频终端右', id: this.control.bind.right_sound },
					{ tag: '语音终端', id: this.products.语音终端[0] },
					{ tag: '运算中心', id: this.products.运算中心[0] },
					{ tag: '运算中心二代', id: this.products.运算中心二代[0] },
					{ tag: '电源', id: this.products.电源[0] },
					{ tag: '环境', id: this.products.环境[0] },
					{ tag: 'LED', id: this.products.LED[0] },
					{ tag: '窗帘', id: this.products.窗帘[0] },
				];
				// 让设备开始上报
				for (let { id } of this.list) {
					if (id) {
						this.start_report(id);
					}
				}
				// 链接stomp
				this.link_stomp();
				// 查询各产品下第一台设备的当前值
				// 扩声(音频终端)比较特殊 它是产品下两个设备分别作为左右音柱 因此两个设备都要查 且分左右
				this.get_device_status(this.control.bind.left_sound, '音频终端左');
				this.get_device_status(this.control.bind.right_sound, '音频终端右');
				this.get_device_status(this.products.语音终端[0], '语音终端');
				this.get_device_status(this.products.运算中心[0], '运算中心');
				this.get_device_status(this.products.运算中心二代[0], '运算中心二代');
				this.get_device_status(this.products.电源[0], '电源');
				this.get_device_status(this.products.环境[0], '环境');
				this.get_device_status(this.products.LED[0], 'LED');
				this.get_device_status(this.products.窗帘[0], '窗帘');
				//
			});
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
		// 格式化开关状态
		format_status(row, col) {
			return row.status == 0 ? '关闭' : '开启';
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
		// 下发指令
		send_order(tag, value) {
			let attributes;
			let ids;
			let topic = 8;
			let service;
			let 话筒最小值 = -20;
			let 话筒最大值 = 0;
			let 话筒调节步长 = 1;
			// 临时 指令下发成功提示
			this.$message.success('指令下发成功');
			switch (tag) {
				case '一键开启全部设备':
					ids = this.products.电源;
					service = 'Relay_Set_State_Service';
					topic = 11;
					attributes = {
						control_relay: 4095,
					};
					break;
				case '一键关闭全部设备':
					ids = this.products.电源;
					service = 'Relay_Set_State_Service';
					topic = 11;
					attributes = {
						control_relay: 0,
					};
					break;
				case 'light_switch':
					ids = this.products.LED;
					this.control.light_switch = !this.control.light_switch;
					attributes = {
						'LED_ControlDevice[0].ep': 1,
						'LED_ControlDevice[1].ep': 2,
						'LED_ControlDevice[0].st.on': this.control.light_switch,
						'LED_ControlDevice[1].st.on': this.control.light_switch,
						protocol_code: 1002,
					};
					break;
				case 'light_mode':
					ids = this.products.LED;
					this.control.light_mode = value;
					attributes = {
						'LED_ControlDevice[0].ep': 1,
						'LED_ControlDevice[1].ep': 2,
						'LED_ControlDevice[0].st.bri': value,
						'LED_ControlDevice[1].st.bri': value,
						protocol_code: 1002,
					};
					break;
				case 'curtain_mode':
					ids = this.products.窗帘;
					this.control.curtain_mode = value;
					attributes = {
						'st.pt': value,
						protocol_code: 1002,
						ep: 1,
						id: '',
						serial: 1,
					};
					break;
				case 'env_open':
					ids = this.products.电源;
					service = 'Accord_Order_TO_Control_Relay_Service';
					topic = 11;
					attributes = {
						order_control_relay: [255, 3],
					};
					break;
				case 'env_close':
					ids = this.products.电源;
					service = 'Accord_Order_TO_Control_Relay_Service';
					topic = 11;
					attributes = {
						order_control_relay: [0, 3],
					};
					break;
				case 'sound_left_de':
					// 从接口获取左右音柱设备id再下发指令
					ids = [this.control.bind.left_sound];
					let s1 = Math.floor(Number(this.control.sounds[0].value));
					if (s1 - 5 <= -80) {
						return;
					}
					s1 -= 5;
					attributes = {
						out1_gain: s1,
						out2_gain: s1,
					};
					break;
				case 'sound_left_add':
					ids = [this.control.bind.left_sound];
					let s2 = Math.floor(Number(this.control.sounds[0].value));
					if (s2 + 5 >= 12) {
						return;
					}
					s2 += 5;
					attributes = {
						out1_gain: s2,
						out2_gain: s2,
					};
					break;
				case 'sound_left_on':
					ids = [this.control.bind.left_sound];
					this.control.sounds[0].switch = !this.control.sounds[0].switch;
					attributes = {
						out1_mute: this.control.sounds[0].switch,
						out2_mute: this.control.sounds[0].switch,
					};
					break;
				case 'sound_right_de':
					ids = [this.control.bind.right_sound];
					let s3 = Math.floor(Number(this.control.sounds[1].value));
					if (s3 - 5 <= -80) {
						return;
					}
					s3 -= 5;
					attributes = {
						out1_gain: s3,
						out2_gain: s3,
					};
					break;
				case 'sound_right_add':
					ids = [this.control.bind.right_sound];
					let s4 = Math.floor(Number(this.control.sounds[1].value));
					if (s4 + 5 >= 12) {
						return;
					}
					s4 += 5;
					attributes = {
						out1_gain: s4,
						out2_gain: s4,
					};
					break;
				case 'sound_right_on':
					ids = [this.control.bind.right_sound];
					this.control.sounds[1].switch = !this.control.sounds[1].switch;
					attributes = {
						out1_mute: this.control.sounds[1].switch,
						out2_mute: this.control.sounds[1].switch,
					};
					break;
				case 'sound_mute':
				case '一键静音':
					ids = this.products.运算中心.length ? this.products.运算中心 : this.products.运算中心二代;
					if (this.control.sound_button_mute[0]) {
						this.control.sound_button_mute = [0, 0, 0, 0, 0, 0, 0, 0];
					} else {
						this.control.sound_button_mute = [1, 1, 1, 1, 1, 1, 1, 1];
					}
					attributes = {
						OUTMS: this.control.sound_button_mute,
					};
					break;
				//#region
				// case '一键静音':
				// 	ids = this.products.运算中心.length ? this.products.运算中心 : this.products.运算中心二代;
				// 	attributes = {
				// 		OUTMS: [1, 1, 1, 1, 1, 1, 1, 1],
				// 	};
				// 	break;
				//#endregion
				case 'sound_open':
					ids = this.products.电源;
					service = 'Accord_Order_TO_Control_Relay_Service';
					topic = 11;
					attributes = {
						order_control_relay: [255, 1],
					};
					break;
				case 'sound_close':
					ids = this.products.电源;
					service = 'Accord_Order_TO_Control_Relay_Service';
					topic = 11;
					attributes = {
						order_control_relay: [0, 1],
					};
					break;
				case '麦克风一键开':
					ids = this.products.电源;
					service = 'Accord_Order_TO_Control_Relay_Service';
					topic = 11;
					attributes = {
						order_control_relay: [255, 2],
					};
					break;
				case '麦克风一键关':
					ids = this.products.电源;
					service = 'Accord_Order_TO_Control_Relay_Service';
					topic = 11;
					attributes = {
						order_control_relay: [0, 2],
					};
					break;
				case '一键巡检会议室设备':
					// 因为是多个产品下设备不能用以下方式发送请求
					let list = this.products.运算中心.length ? this.products.运算中心 : this.products.运算中心二代;
					topic = 11;
					for (let val of list) {
						this.request('put', `${sendCmdtoDevice_url}/${topic}`, this.token, {
							contentType: 2,
							deviceId: val,
							service: 'SCHK',
						});
					}
					for (let val of this.products.音频终端) {
						this.request('put', `${sendCmdtoDevice_url}/${topic}`, this.token, {
							contentType: 2,
							deviceId: val,
							service: 'dev_check',
						});
					}
					// 临时 打开巡检弹窗
					this.control.巡检.show = true;
					// 深拷贝模板数据
					this.control.巡检.data = JSON.parse(JSON.stringify(this.control.巡检.template));
					// 刚开始是巡检中 五秒后变为 巡检完成 同时将巡检结果改为 设备运行正常
					setTimeout(() => {
						for (let i = 0; i < this.control.巡检.data.length; i++) {
							// 设备从上到下依次变更数据
							setTimeout(() => {
								this.control.巡检.data[i].operate = '巡检完成';
								setTimeout(() => {
									this.control.巡检.data[i].operateStatus = '设备运行正常';
									if (i === this.control.巡检.data.length - 1) {
										// 如果是最后一台设备检测完成提示弹窗
										this.control.巡检.show2 = true;
									}
								}, 300);
							}, i * 500);
						}
					}, 5000);
					return;
				case 'voice_person':
					ids = this.products.语音终端;
					service = 'fun5_serv';
					topic = 11;
					attributes = {
						'fun5.fun5_para1[0]': this.control.microphones[0].value,
						actual_used_lenth: 1,
					};
					break;
				case 'voice_main':
					ids = this.products.语音终端;
					service = 'fun6_serv';
					topic = 11;
					switch (value) {
						case 'de':
							if (Number(this.control.microphones[1].value) - 话筒调节步长 < 话筒最小值) {
								return;
							}
							this.control.microphones[1].value = Number(this.control.microphones[1].value) - 话筒调节步长;
							break;
						case 'add':
							if (Number(this.control.microphones[1].value) + 话筒调节步长 > 话筒最大值) {
								return;
							}
							this.control.microphones[1].value = Number(this.control.microphones[1].value) + 话筒调节步长;
							break;
					}
					attributes = {
						'fun6.fun6_para1[0]': Math.abs(this.control.microphones[1].value),
						actual_used_lenth: 3,
					};
					break;
				case 'voice_line':
					ids = this.products.语音终端;
					service = 'fun6_serv';
					topic = 11;
					switch (value) {
						case 'de':
							if (Number(this.control.microphones[2].value) - 话筒调节步长 < 话筒最小值) {
								return;
							}
							this.control.microphones[2].value = Number(this.control.microphones[2].value) - 话筒调节步长;
							break;
						case 'add':
							if (Number(this.control.microphones[2].value) + 话筒调节步长 > 话筒最大值) {
								return;
							}
							this.control.microphones[2].value = Number(this.control.microphones[2].value) + 话筒调节步长;
							break;
					}
					attributes = {
						'fun6.fun6_para2[0]': Math.abs(this.control.microphones[2].value),
						actual_used_lenth: 3,
					};
					break;
				case 'voice_input':
					ids = this.products.语音终端;
					service = 'fun6_serv';
					topic = 11;
					switch (value) {
						case 'de':
							if (Number(this.control.microphones[3].value) - 话筒调节步长 < 话筒最小值) {
								return;
							}
							this.control.microphones[3].value = Number(this.control.microphones[3].value) - 话筒调节步长;
							break;
						case 'add':
							if (Number(this.control.microphones[3].value) + 话筒调节步长 > 话筒最大值) {
								return;
							}
							this.control.microphones[3].value = Number(this.control.microphones[3].value) + 话筒调节步长;
							break;
					}
					attributes = {
						'fun6.fun6_para3[0]': Math.abs(this.control.microphones[3].value),
						actual_used_lenth: 3,
					};
					break;
				case '会议模式':
					ids = this.products.语音终端;
					this.control.microphone_mode = value;
					service = 'fun4_serv';
					topic = 11;
					attributes = {
						'fun4.fun4_para1[0]': value,
						actual_used_lenth: 1,
					};
					break;
				case '麦克风一键静音':
					ids = this.products.语音终端;
					service = 'fun6_serv';
					topic = 11;
					// this.control.microphone_mute = !this.control.microphone_mute;
					this.control.microphones[1].value = 话筒最小值;
					// if (this.control.microphone_mute) {
					// 	// 静音时要将主音量设为0
					// }
					attributes = {
						'fun6.fun6_para1[0]': Math.abs(话筒最小值),
						actual_used_lenth: 3,
					};
					break;
				case '音频矩阵':
					this.control.scene.sound[value.row_i].splice(value.col_i, 1, Number(value.value) ? '0' : '1');
					let s_l = [];
					for (let row of this.control.scene.sound) {
						let t = JSON.parse(JSON.stringify(row));
						let t2 = parseInt(t.reverse().join(''));
						let t3 = parseInt(t2, 2) >> 0;
						s_l.push(t3, 0);
					}
					ids = this.products.运算中心.length ? this.products.运算中心 : this.products.运算中心二代;
					attributes = {
						MIXS: s_l,
					};
					break;
				case '视频矩阵':
					if (this.control.scene.flag) {
						ids = this.products.运算中心二代;
						attributes = {
							VSWT: value.value,
						};
						this.control.scene.video_matrix.splice(Math.floor(value.index / 4), 1, value.index % 4);
					} else {
						ids = this.products.运算中心;
						if (value < 4) {
							let t = value + 1;
							attributes = {
								VSWT: [t, 255],
							};
							this.control.scene.video_matrix1.splice(0, 1, t);
						} else {
							let t = value - 3;
							attributes = {
								VSWT: [255, t],
							};
							this.control.scene.video_matrix1.splice(1, 1, t);
						}
					}
					break;
			}
			if (!ids) {
				// 没有设备ids不执行
				return;
			}
			for (let val of ids) {
				if (!val) {
					// 设备id错误不执行
					continue;
				}
				let body = {
					contentType: topic == 8 ? 0 : 2,
					deviceId: val,
				};
				if (topic == 11) {
					body.service = service;
				}
				if (attributes) {
					body.attributeMap = attributes;
				}
				this.request('put', `${sendCmdtoDevice_url}/${topic}`, this.token, body);
			}
		},
		// 集中管控 查询当天会议
		async get_meeting() {
			let t = new Date();
			let year = t.getFullYear();
			let month = t.getMonth() + 1 < 10 ? '0' + (t.getMonth() + 1) : t.getMonth() + 1;
			let day = t.getDate() < 10 ? '0' + t.getDate() : t.getDate();
			let d = `${year}-${month}-${day}`;
			let s = `${d} 00:00:00`;
			let e = `${d} 23:59:59`;
			let { data: res } = await this.request('post', meeting_list_url, this.token, {
				pageNum: 1,
				pageSize: 10,
				condition: {
					auditStatus: 2,
					meetingStatus: '0,1', // 只查进行中和未开始的会议
					startTime: s,
					endTime: e,
				},
			});
			if (res.head.code !== 200 || res.data.data) {
				return;
			}
		},
		// 根据指定产品 对场所下设备列表归类
		init_product_device() {
			let p = {
				音频终端: [],
				语音终端: [],
				运算中心: [],
				运算中心二代: [],
				电源: [],
				环境: [],
				LED: [],
				窗帘: [],
			};
			for (let val of this.device.list) {
				switch (val.productId) {
					case '1691711203071160320':
						p.音频终端.push(val.id);
						break;
					case '1681475253623779328':
						p.语音终端.push(val.id);
						break;
					case '1564171104871739392':
						p.运算中心.push(val.id);
						break;
					case '1722147067370217472':
						p.运算中心二代.push(val.id);
						break;
					case '1574321115531005952':
						p.电源.push(val.id);
						break;
					case '1693892641128378368':
						p.环境.push(val.id);
						break;
					case '1742008176051154944':
						p.LED.push(val.id);
						break;
					case '1714933820427005952':
						p.窗帘.push(val.id);
						break;
				}
			}
			return p;
		},
		// 查询设备属性值
		async get_device_status(id, tag) {
			// 没有设备id不执行
			if (!id) {
				return;
			}
			let { data: res } = await this.request('get', `${device_status_url}/${id}`, this.token);
			if (res.head.code !== 200) {
				return;
			}
			let d = res.data.properties;
			this.set_device_status(tag, d, 0);
		},
		// 处理上报及获取属性值
		set_device_status(tag, obj, type) {
			if (typeof obj !== 'object' || !Object.entries(obj).length) {
				// 如果传入的对象为空不执行
				return;
			}
			// type为0表示从平台获取 type为1表示设备上报
			switch (tag) {
				case '环境':
					if (type && !obj.st) {
						return;
					}
					// 这里要做区分主动查的数据是全部 而上报数据是部分
					if (type) {
						for (let key in obj.st) {
							// 设备上报的不一定是需要读取的属性
							switch (key) {
								case 'mtemp':
									this.control.env_icon[0].value = Math.floor(Number(obj.st.mtemp)) / 100;
									break;
								case 'mhumi':
									this.control.env_icon[1].value = Math.ceil(Number(obj.st.mhumi) / 100);
									break;
								case 'mlux':
									this.control.env_icon[2].value = Math.ceil(Number(obj.st.mlux) / 100);
									break;
								case 'CO2':
									this.control.env_icon[3].value = Math.ceil(Number(obj.st.CO2));
									break;
								case 'voc':
									this.control.env_icon[4].value = Math.ceil(Number(obj.st.voc)) / 100;
									break;
								case 'formaldehyde':
									this.control.env_icon[5].value = Math.ceil(Number(obj.st.formaldehyde)) / 100;
									break;
							}
						}
					} else {
						this.control.env_icon[0].value = Math.floor(Number(obj.st.propertyValue.mtemp.propertyValue)) / 100; // 保留小数点后两位
						this.control.env_icon[1].value = Math.ceil(Number(obj.st.propertyValue.mhumi.propertyValue) / 100); // 一下均向上取整
						this.control.env_icon[2].value = Math.ceil(Number(obj.st.propertyValue.mlux.propertyValue) / 100);
						this.control.env_icon[3].value = Math.ceil(Number(obj.st.propertyValue.CO2.propertyValue));
						this.control.env_icon[4].value = Math.ceil(Number(obj.st.propertyValue.voc.propertyValue)) / 100;
						this.control.env_icon[5].value = Math.ceil(Number(obj.st.propertyValue.formaldehyde.propertyValue)) / 100;
					}
					break;
				case 'LED':
					if (type && !obj.LED_ControlDevice[0].st) {
						return;
					}
					if (type) {
						for (let key in obj.LED_ControlDevice[0].st) {
							switch (key) {
								case 'on':
									this.control.light_switch = obj.LED_ControlDevice[0].st.on;
									break;
								case 'bri':
									this.control.light_mode = Number(obj.LED_ControlDevice[0].st.bri);
									break;
							}
						}
					} else {
						this.control.light_switch = obj.LED_ControlDevice.propertyValue[0].st.propertyValue.on.propertyValue;
						this.control.light_mode = Number(obj.LED_ControlDevice.propertyValue[0].st.propertyValue.bri.propertyValue);
					}
					break;
				case '窗帘':
					if (type && !obj.st) {
						return;
					}
					if (type) {
						for (let key in obj.st) {
							switch (key) {
								case 'pt':
									this.control.curtain_mode = Number(obj.st.pt);
									break;
							}
						}
					} else {
						this.control.curtain_mode = Number(obj.st.propertyValue.pt.propertyValue);
					}
					break;
				case '音频终端左':
					if (type) {
						for (let key in obj) {
							switch (key) {
								case 'out1_gain':
									this.control.sounds[0].value = Math.floor(Number(obj.out1_gain));
									break;
								case 'out1_mute':
									this.control.sounds[0].switch = obj.out1_mute;
									break;
							}
						}
					} else {
						this.control.sounds[0].value = Math.floor(Number(obj.out1_gain.propertyValue));
						this.control.sounds[0].switch = obj.out1_mute.propertyValue;
					}
					break;
				case '音频终端右':
					if (type) {
						for (let key in obj) {
							switch (key) {
								case 'out1_gain':
									this.control.sounds[1].value = Math.floor(Number(obj.out1_gain));
									break;
								case 'out1_mute':
									this.control.sounds[1].switch = obj.out1_mute;
									break;
							}
						}
					} else {
						this.control.sounds[1].value = Math.floor(Number(obj.out1_gain.propertyValue));
						this.control.sounds[1].switch = obj.out1_mute.propertyValue;
					}
					break;
				case '语音终端':
					if (type) {
						if (obj.fun5?.fun5_para1[0] !== undefined) {
							this.control.microphones[0].value = Number(obj.fun5.fun5_para1[0]);
						}
						if (obj.fun6?.fun6_para1[0] !== undefined) {
							this.control.microphones[1].value = Number(`-${Number(obj.fun6.fun6_para1[0])}`);
						}
						if (obj.fun6?.fun6_para2[0] !== undefined) {
							this.control.microphones[2].value = Number(`-${Number(obj.fun6.fun6_para2[0])}`);
						}
						if (obj.fun6?.fun6_para3[0] !== undefined) {
							this.control.microphones[3].value = Number(`-${Number(obj.fun6.fun6_para3[0])}`);
						}
						if (obj.fun4?.fun4_para1[0] !== undefined) {
							this.control.microphone_mode = obj.fun4.fun4_para1[0];
						}
					} else {
						this.control.microphones[0].value = Number(obj.fun5.propertyValue.fun5_para1.propertyValue[0]);
						// 注意 数组取值
						this.control.microphones[1].value = Number(`-${Number(obj.fun6.propertyValue.fun6_para1.propertyValue[0])}`);
						this.control.microphones[2].value = Number(`-${Number(obj.fun6.propertyValue.fun6_para2.propertyValue[0])}`);
						this.control.microphones[3].value = Number(`-${Number(obj.fun6.propertyValue.fun6_para3.propertyValue[0])}`);
						this.control.microphone_mode = obj.fun4.propertyValue.fun4_para1.propertyValue[0];
					}
					break;
				case '运算中心':
				case '运算中心二代':
					if (obj.MIXS) {
						// 音频矩阵处理
						this.control.scene.sound = [];
						let list1 = type ? obj.MIXS : obj.MIXS.propertyValue;
						for (let i = 0; i < 9; i++) {
							let t = (list1[i * 2] >>> 0).toString(2).split('').reverse();
							let t2 = 12 - t.length;
							for (let k = 0; k < t2; k++) {
								t.push('0');
							}
							this.control.scene.sound.push(t);
						}
					}
					if (obj.VSWT) {
						// 视频矩阵
						if (this.control.scene.flag) {
							if (type) {
								if (obj.VSWT.length === 4) {
									this.control.scene.video_matrix = obj.VSWT;
								}
							} else {
								if (obj.VSWT.propertyValue.length === 4) {
									this.control.scene.video_matrix = obj.VSWT.propertyValue;
								}
							}
						} else {
							if (type) {
								if (obj.VSWT.length == 2) {
									this.control.scene.video_matrix1 = obj.VSWT;
								}
							} else {
								if (obj.VSWT.propertyValue.length === 2) {
									this.control.scene.video_matrix1 = obj.VSWT.propertyValue;
								}
							}
						}
					}
					// 静音
					if (obj.OUTMS) {
						this.control.sound_button_mute = obj.OUTMS;
					}
					break;
			}
		},
		// 结束会议
		end_meeting(params) {
			this.$confirm('确认结束会议？', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning',
				center: true,
			}).then(() => {
				this.html.page_loading = true;
				this.request('put', `${end_meeting_url}/${params.id}`, this.token, (res) => {
					this.html.page_loading = false;
					if (res.data.head.code != 200) {
						return;
					}
					// // 结束成功 隐藏按钮 并清空计时
					// this.control.end_show = false;
					// this.control.delay_show = false;
					window.postMessage('会议结束成功');
				});
			});
		},
		// 子组件触发延迟会议
		delay_event(params) {
			this.cur_meeting = params;
			this.control.delay_pop_show = true;
		},
		// 延迟会议
		delay_meeting() {
			// 延后的会议结束时间不能超过当天23点
			let end_hour = parseFloat(this.cur_meeting.endTime.split(' ')[1].split(':')[0]);
			let delay_hour = Number(this.control.delay) / 60;
			if (end_hour + delay_hour > 23) {
				this.$message.error('会议延后结束时间不能超过23点');
				return;
			}
			let end = new Date(this.cur_meeting.endTime.replace(/-/g, '/'));
			let delay_time = Number(this.control.delay) * 60 * 1000; // 延后分钟转换毫秒
			end = new Date(end.getTime() + delay_time);
			end = `${this.cur_meeting.endTime.split(' ')[0]} ${end.toString().split(' ')[4]}`;
			this.request('put', delay_meeting_url, this.token, { id: this.cur_meeting.id, startTime: `${this.cur_meeting.startTime}:00`, endTime: end }, (res) => {
				if (res.data.head.code == 200) {
					this.$message.success(`延后 ${this.cur_meeting.theme} 会议成功`);
				}
				this.control.delay_pop_show = false;
				// 重新获取会议信息 同时重新计算剩余时间
				window.postMessage('延迟会议成功');
			});
		},
		// 绑定设备 到页面特定元素
		async bind_device() {
			let { data: res } = await this.request('post', bind_device_url, this.token, {
				placeId: this.place_id,
				config: {
					left_sound: this.control.bind.left_sound,
					right_sound: this.control.bind.right_sound,
				},
			});
			if (res.head.code !== 200) {
				return;
			}
			this.control.bind_device_show = false;
			// 绑定成功后 查询设备属性并订阅设备消息
			this.get_device_status(this.control.bind.left_sound, '音频终端左');
			this.get_device_status(this.control.bind.right_sound, '音频终端右');
			this.stomp_link.subscribe(
				`/exchange/device-report/device-report.${this.control.bind.left_sound}`,
				(res) => {
					let data = JSON.parse(res.body);
					this.set_device_status('音频终端左', data.contents[0].attributes, 1);
				},
				{ 'auto-delete': true }
			);
			this.stomp_link.subscribe(
				`/exchange/device-report/device-report.${this.control.bind.right_sound}`,
				(res) => {
					let data = JSON.parse(res.body);
					this.set_device_status('音频终端右', data.contents[0].attributes, 1);
				},
				{ 'auto-delete': true }
			);
		},
		// 查询场所下绑定的特殊字段
		async get_place_bind() {
			let { data: res } = await this.request('get', `${get_place_bind_url}/${this.place_id}`, this.token).catch((err) => 'err');
			if (res?.head.code !== 200 || !res.data.length) {
				return;
			}
			let d = res.data[0].config;
			this.control.bind.left_sound = d.left_sound;
			this.control.bind.right_sound = d.right_sound;
		},
		// 让设备开始上报
		start_report(device_id) {
			this.request('put', `${decive_report_url}/${device_id}`, this.token);
		},
		// 获取用户信息包括 id 连接stomp用户名和密码
		async get_user_info() {
			let res = await this.request('get', get_user_info_url, this.token);
			if (res.data.head.code != 200) {
				this.$message('无法获取用户信息');
				return;
			}
			this.ws_name = res.data.data.mqUser;
			this.ws_password = res.data.data.mqPassword;
			this.user_id = res.data.data.id;
		},
		// 链接stomp
		link_stomp() {
			this.ws_link = new WebSocket(`${我是websocket地址}`);
			this.stomp_link = Stomp.over(this.ws_link);
			this.stomp_link.debug = null;
			this.stomp_link.connect(this.ws_name, this.ws_password, this.on_message, this.on_error, '/');
		},
		// stomp连接成功的回调
		on_message() {
			// 订阅多个设备消息
			for (let val of this.list) {
				if (val.id) {
					this.stomp_link.subscribe(
						`/exchange/device-report/device-report.${val.id}`,
						(res) => {
							let data = JSON.parse(res.body);
							this.set_device_status(val.tag, data.contents[0].attributes, 1);
						},
						{ 'auto-delete': true }
					);
				}
			}
			this.stomp_link.subscribe(
				`/exchange/web-socket/tenant.user.${this.user_id}.#`,
				(res) => {
					let data = JSON.parse(res.body);
					// 0等待 1成功 2断开 3超时 4拒绝
					switch (data.replyType) {
						case 0:
							this.$message('等待连接');
							break;
						case 1:
							this.$message.success('连接成功');
							break;
						case 2:
							this.$message.error('断开连接');
							break;
						case 3:
							this.$message('连接超时');
							break;
						case 4:
							this.$message.error('连接被拒');
							break;
					}
				},
				{ 'auto-delete': true }
			);
		},
		// stomp连接失败的回调
		on_error(error) {
			// this.$message.error(error.headers.message);
		},
		// 跳转设备控制弹窗
		control_window(tag) {
			this.control.scene.show = true;
			switch (tag) {
				case 'scene_sound':
					this.control.scene.title = '音频矩阵';
					break;
				case 'scene_video':
					this.control.scene.title = '视频矩阵';
					break;
			}
		},
		// 视频矩阵回显
		video_matrix_status(index) {
			if (this.control.scene.flag) {
				if (this.control.scene.video_matrix[Math.floor(index / 4)] === index % 4) {
					return true;
				} else {
					return false;
				}
			} else {
				if (index < 4) {
					if (index + 1 == this.control.scene.video_matrix1[0]) {
						return true;
					} else {
						return false;
					}
				} else {
					if (index - 3 == this.control.scene.video_matrix1[1]) {
						return true;
					} else {
						return false;
					}
				}
			}
		},
		// 将集中管控页面数据初始化
		init_control_data() {
			for (let val of this.control.env_icon) {
				val.value = '';
			}
			this.control.light_mode = -1;
			this.control.light_switch = false;
			this.control.curtain_mode = -1;
			for (let val of this.control.sounds) {
				val.value = 0;
				val.switch = false;
			}
			this.control.microphone_mode = -1;
			for (let val of this.control.microphones) {
				val.value = 0;
			}
			this.control.microphones[0].value = '';
			this.control.scene.video_matrix = [0, 0, 0, 0];
			this.control.scene.video_matrix1 = [1, 1];
			this.control.scene.sound = [];
			// 生成音频矩阵按钮
			for (let k = 0; k < 9; k++) {
				let t = [];
				for (let j = 0; j < 12; j++) {
					t.push('0');
				}
				this.control.scene.sound.push(t);
			}
			this.control.bind.left_sound = this.control.bind.right_sound = '';
		},
	},
});
