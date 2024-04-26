let url = `${我是接口地址}/`;
let components_url = `${url}api-portal/device-topo/panel`; //根据场所id查询可视化面板
let get_data_url = url + 'api-device/device/status'; //查询组件数据
let sendCmdtoDevice = url + 'api-device/device/panel/operation'; // 下发指令
let user_info_url = `${url}api-auth/oauth/userinfo`; //获取用户信息
let decive_report_url = `${url}api-device/device/panel/switch`; //设备开始上报
let online_check_url = `${url}api-portal/centralized-control/onlineCheck/devices`; // 一键巡检
let device_detail_url = `${url}api-device/device`; // 查询单设备详情

new Vue({
	el: '#index',
	mixins: [common_functions],
	components: {
		customContainer,
		customText,
		customSwitch,
		customSlider,
		customSlider2,
		customImg,
		customLine,
		customVideo,
		customDeviceStatus,
		customButton,
		customOnlineCheck,
		customVisualEditor1,
		customSoundMatrix,
		soundMatrix,
		customVideoMatrix,
		videoMatrix1,
		videoMatrix2,
		customButtonSwitch,
		customProgress,
		customInput,
	},
	data: {
		html: {
			page_loading: true,
			random_num: Math.floor(Math.random() * 100),
		},
		page_id: '', //面板id
		component_list: [], //组件列表
		// data_and_path: [], //对象数组 存储数据和路径
		radio: 0, //所有组件缩放比例
		// 设备状态栏
		device_status: {
			show: false, //设备状态显示
			style: {}, // 面板样式
			name: '', //设备名
			is_normal: true, //设备状态
			list: [], //属性列表
		},
		// 巡检
		online_check: {
			show: false,
			list: [], // 巡检列表
			is_checking: false, // 节流标识
		},
		// 音视频矩阵
		matrix: {
			show: false,
			list: [], // 矩阵值
			title: '', // 弹窗标题
			device_id: '', // 下发指令所需设备id
		},
		token: '',
		inject_data: null, // 注入组件的数据
		drop: {
			show: false, // 下拉框显示
			style: {
				left: 0, // 下拉框定位
				top: 0,
			},
			options: [], // 下拉框可选数据
			select: null, // 传入下拉框组件的值
		},
	},
	beforeCreate() {
		Vue.prototype.$bus = this;
	},
	async mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
			this.id = sessionStorage.id;
			this.prePage = sessionStorage.prePage;
		} else {
			this.get_token();
		}
		try {
			this.html.page_loading = true;
			// 区分是跳转还是本地缓存数据
			if (this.prePage === 'preview') {
				this.render_components(JSON.parse(sessionStorage.tempPanelparam));
				// sessionStorage.removeItem('tempPanelparam');
			} else {
				await this.get_components();
			}
			this.html.page_loading = false;
		} catch (error) {
			console.log('err', error);
		}
		window.addEventListener('resize', this.resize());
		// // 监听下拉框事件
		// this.$bus.$on('drop_down_show', ({ list, left, top, id }) => {
		// 	this.drop.show = true;
		// 	this.drop.style.left = left;
		// 	this.drop.style.top = top;
		// 	this.drop.options = list;
		// 	// 记录当前显示的对应组件id
		// 	this.drop.id = id;
		// });
		// 监听跳转页面事件
		this.$bus.$on('turn_to_page', (page_id) => {
			this.page_id = page_id;
		});
		// 监听设备状态弹窗
		this.$bus.$on('device_status', ({ list, show, style, name, is_normal }) => {
			this.device_status.list = list;
			this.device_status.show = show;
			this.device_status.style = style;
			this.device_status.name = name;
			this.device_status.is_normal = is_normal;
		});
		// 监听一件巡检弹窗
		this.$bus.$on('online_check', ({ type, data }) => {
			if (type === 'open') {
				this.online_check.show = true;
				this.online_check.list = data;
			} else if (type === 'update') {
				// 巡检按钮组件只需要遍历自身存的列表 找到对应消息 更新结果
				for (let val of this.online_check.list) {
					if (val.message_id == data.messageId) {
						switch (data.replyType) {
							case 1:
								val.result = '巡检结果正常';
								break;
							default:
								val.result = '巡检结果异常';
								break;
						}
					}
				}
			}
		});
		// 监听矩阵弹窗
		this.$bus.$on('matrix_popup', ({ type, data, title, device_id }) => {
			if (type === 'open') {
				if (!data) {
					this.$message('没有对应数据');
					return;
				}
				this.matrix.show = true;
				this.matrix.title = title;
				this.matrix.list = data;
				this.matrix.device_id = device_id;
			} else if (type === 'update') {
				// 在父页面 判断弹窗打开的情况下再更新弹窗值
				if (!this.matrix.show) {
					return;
				}
				// 只更新当前打开的矩阵
				if (this.matrix.title === title && this.matrix.device_id === device_id) {
					this.matrix.list = data;
				}
			}
		});
	},
	methods: {
		// 视窗大小变化
		resize() {
			// 组件列表初始化好后才能执行
			if (!this.component_list.length) {
				return;
			}
			let dom = document.documentElement;
			let c_w = dom.clientWidth;
			if (c_w >= 1000 && c_w <= 1920) {
				let t = c_w / 1920;
				let fontsize = Math.ceil(t * 16);
				dom.style.fontSize = `${fontsize}px`;
			} else if (c_w < 1000) {
				dom.style.fontSize = `10px`;
			} else if (c_w > 1920) {
				dom.style.fontSize = `16px`;
			}
			for (let val of this.component_list) {
				val.radio = Math.round((c_w / val.mb.w) * 100) / 100;
			}
		},
		// 获取组件布局
		async get_components() {
			let res = await this.request('get', `${components_url}/${this.id}`, this.token);
			if (res.data.head.code != 200 || !res.data.data?.panelParam) {
				this.$message('未配置产品可视化界面');
				return;
			}
			let dom = document.documentElement;
			let c_w = dom.clientWidth;
			// 设备id去重
			this.list = [];
			for (let val1 of res.data.data.allBindDeviceIds) {
				let find = false;
				for (let val2 of this.list) {
					if (val2 === val1) {
						find = true;
						break;
					}
				}
				if (!find) {
					this.list.push(val1);
				}
			}
			for (let val of res.data.data.panelParam) {
				// 每个面板比例不同
				// 连线组件组要将画布拉伸到跟页面大小一样 所以radio要代理
				val.radio = Math.round((c_w / val.mb.w) * 100) / 100;
			}
			this.component_list = res.data.data.panelParam;
			this.page_id = this.component_list[0].id;
			this.$nextTick(async () => {
				await this.count_device_list();
				// 开启设备实时数据上报
				for (let val of this.list) {
					this.start_report(val);
				}
				if (localStorage.hushanwebuserinfo) {
					let obj = JSON.parse(localStorage.hushanwebuserinfo);
					let ws_name = obj.mqUser;
					let ws_password = obj.mqPassword;
					this.user_id = obj.id;
					this.ws_link = new WebSocket(`${我是websocket地址}`);
					this.stomp_link = Stomp.over(this.ws_link);
					this.stomp_link.debug = null;
					this.stomp_link.connect(ws_name, ws_password, this.on_message, this.on_error, '/');
				} else {
					await this.get_user_info(); // 组件初始化后 建立连接 触发事件
				}
			});
		},
		// 获取数值
		async get_data(device_id) {
			let res = await this.request('get', `${get_data_url}/${device_id}`, this.token);
			if (res.data.head.code != 200) {
				return;
			}
			// 将整个数据对象发给每个组件 让其自己解析路径 获取对应的值
			// status 1在线 2离线 除了在线 其他都算离线
			let device_status = res.data.data.status === 1 ? 5 : 4;
			this.$bus.$emit('get_value', { data: res.data.data.properties, device_id: res.data.data.deviceId, device_status });
		},
		// 获取用户信息包括 id 连接stomp用户名和密码
		async get_user_info() {
			let res = await this.request('get', user_info_url, this.token);
			if (res.data.head.code != 200) {
				this.$message('无法获取用户信息');
				return;
			}
			let ws_name = res.data.data.mqUser;
			let ws_password = res.data.data.mqPassword;
			this.user_id = res.data.data.id;
			this.ws_link = new WebSocket(`${我是websocket地址}`);
			this.stomp_link = Stomp.over(this.ws_link);
			this.stomp_link.debug = null;
			this.stomp_link.connect(ws_name, ws_password, this.on_message, this.on_error, '/');
		},
		// stomp连接成功的回调
		on_message() {
			// 订阅多个设备消息
			for (let val of this.list) {
				this.stomp_link.subscribe(
					`/exchange/device-report/device-report.${val}`,
					(res) => {
						let data = JSON.parse(res.body);
						this.$bus.$emit('get_value', { data: data.contents[0].attributes, device_id: val, device_status: data.messageBizType, message: data });
					},
					{ 'auto-delete': true }
				);
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
		// 面板整体尺寸调节
		panel_size(page) {
			//#region
			// let dom = document.documentElement;
			// let c_w = dom.clientWidth;
			// let c_h = dom.clientHeight;
			// let width, height, flag;
			// let mb_scale = this.total_w / this.total_h; // 计算宽高比 当一边100%时 计算另一边像素单位长度
			// let c_scale = c_w / c_h;
			// 计算面板和视窗的比例 面板比例大于视窗比例 则说明宽满铺 否则高满铺
			// if (mb_scale > c_scale) {
			// flag = 1;
			// width = c_w + 'px';
			// height = c_w / mb_scale + 'px';
			// 	this.radio = Math.floor((c_w / this.total_w) * 100 + 0.5) / 100;
			// 	dom2.justifyContent = 'none';
			// 	dom2.alignItems = 'center';
			// } else if (mb_scale < c_scale) {
			// flag = 0;
			// height = c_h + 'px';
			// width = c_h * mb_scale + 'px';
			// 	this.radio = Math.floor((c_h / this.total_h) * 100 + 0.5) / 100;
			// 	dom2.justifyContent = 'center';
			// 	dom2.alignItems = 'none';
			// } else {
			// flag = 2;
			// width = c_w + 'px';
			// height = c_h + 'px';
			// 	this.radio = Math.floor((c_w / this.total_w) * 100 + 0.5) / 100;
			// 	dom2.alignItems = 'none';
			// 	dom2.justifyContent = 'none';
			// }
			// let dom2 = document.querySelector('body').style;
			// switch (flag) {
			// 	case 0:
			// 		dom2.justifyContent = 'center';
			// 		dom2.alignItems = 'none';
			// 		break;
			// 	case 1:
			// 		dom2.justifyContent = 'none';
			// 		dom2.alignItems = 'center';
			// 		break;
			// 	case 2:
			// 		dom2.alignItems = 'none';
			// 		dom2.justifyContent = 'none';
			// 		break;
			// }
			// 无论是高还是宽满铺 面板原始尺寸缩放到视窗大小 宽高缩放比例都是相同的 缩小是视窗小于面板
			// this.radio = Math.floor((c_w / this.total_w) * 100 + 0.5) / 100;
			// return { background: this.bg, width: this.total_w + 'px', height: this.total_h + 'px', transform: `scale(${radio})` };
			//#endregion
			let height = page.mb.h * page.radio;
			let bg = {
				height: height + 'px',
			};
			if (page.mb.ys) {
				bg.backgroundColor = page.mb.ys;
			}
			if (page.mb.tp) {
				bg.backgroundImage = `url(${page.mb.tp})`;
			}
			return bg;
		},
		// 关闭需要关闭的弹窗
		close_popup() {
			this.drop.show = false;
		},
		// 统计所有组件总共涉及的设备id
		async count_device_list() {
			// this.list = []; //存储不同设备的id
			// for (let val of this.component_list) {
			// 	for (let val2 of val.data) {
			// 		if (Array.isArray(val2.attr)) {
			// 			for (let val3 of val2.attr) {
			// 				if (!this.list.length) {
			// 					// 没设备时直接添加
			// 					this.list.push(val3.deviceId);
			// 				} else {
			// 					// 只有不相同的设备id才入栈
			// 					let find = false;
			// 					for (let val4 of this.list) {
			// 						if (val4 === val3.deviceId) {
			// 							find = true;
			// 							break;
			// 						}
			// 					}
			// 					if (!find) {
			// 						this.list.push(val3.deviceId);
			// 					}
			// 				}
			// 			}
			// 		}
			// 	}
			// }
			// 异步请求 请求回来的数据进行广播
			let result = [];
			for (let val of this.list) {
				result.push(this.get_data(val));
			}
			// 全部请求回来后再进行后续 否则可能会覆盖推流数据
			await Promise.all(result).catch((err) => {});
		},
		// 让设备开始上报
		start_report(device_id) {
			this.request('put', `${decive_report_url}/${device_id}`, this.token);
		},
		// 设备属性面板 自定义样式
		device_status_style(style) {
			return style;
		},
		// 巡检节流事件
		checking_event(flag) {
			this.online_check.is_checking = flag;
		},
		// 根据缓存数据渲染组件 无需连websocket 加载初始数据即可
		render_components(data) {
			let dom = document.documentElement;
			let c_w = dom.clientWidth;
			data.radio = Math.round((c_w / data.mb.w) * 100) / 100;
			this.component_list = [data];
			this.page_id = this.component_list[0].id;
		},
		// 下拉框选择
		drop_select(obj) {
			this.drop.select = {
				id: this.drop.id,
				label: obj.label,
				value: obj.value,
			};
		},
	},
});
