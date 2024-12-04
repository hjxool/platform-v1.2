let url = `${我是接口地址}/`;
let components_url = `${url}api-portal/device-topo/panel`; //根据场所id查询可视化面板
let get_data_url = url + 'api-device/device/status'; //查询组件数据
let sendCmdtoDevice = url + 'api-device/device/panel/operation'; // 下发指令
let user_info_url = `${url}api-auth/oauth/userinfo`; //获取用户信息
let decive_report_url = `${url}api-device/device/panel/switch`; //设备开始上报
let online_check_url = `${url}api-portal/centralized-control/onlineCheck/devices`; // 一键巡检
let device_detail_url = `${url}api-device/device`; // 查询单设备详情
let 执行场景规则 = `${url}api-portal/scene-rule/execute`;

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
		customIframeComponent,
		customEnv,
		customCurtain,
		customPowerOpen,
		customSmartSwitch,
		customLoudSound,
		customLight,
		customLcd,
		customMeetingMode,
		customSliderInout,
		customCurrentMeeting,
		customMeetingEndTime,
		customScene,
	},
	data: {
		html: {
			page_loading: true,
			random_num: Math.floor(Math.random() * 100),
		},
		panel: null, // 面板数据
		radio: 0, // 根据视窗缩放比率
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
		mouse_p: null, // 鼠标定位 x y 坐标组成的对象
		line: {
			show: false, // 连线信息弹窗
			list: [], // 信息分类显示
			style: {},
			isBidirect: false, // 如果是双向 则用↔ 否则用→
		},
		路径: [],
		prePage: '',
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
			setTimeout(() => {
				this.html.page_loading = false;
			}, 1500);
		} catch (error) {
			console.log('err', error);
		}
		this.resize();
		window.addEventListener('resize', () => {
			this.resize();
		});
		//#region
		// 监听下拉框事件
		// this.$bus.$on('drop_down_show', ({ list, left, top, id }) => {
		// 	this.drop.show = true;
		// 	this.drop.style.left = left;
		// 	this.drop.style.top = top;
		// 	this.drop.options = list;
		// 	// 记录当前显示的对应组件id
		// 	this.drop.id = id;
		// });
		//#endregion
		// 监听跳转页面事件
		this.$bus.$on('turn_to_page', (panel_id) => {
			// 根绝跳转目标面板id 获取源数据中对应面板数据
			this.panel = this.查询面板对象(panel_id, (this.路径 = []));
			this.面板数据初始化();
			this.$nextTick(() => {
				this.获取面板数据();
				this.订阅设备消息();
			});
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

				// 临时
				let i = 0;
				for (let val of data) {
					setTimeout(() => {
						val.result = '巡检结果正常';
					}, 300 * ++i * (Math.random() + 1));
				}
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
		// 监听鼠标悬浮在线段附近 显示弹窗
		this.$bus.$on('line_info', ({ list: lines, isBidirect, is_in_range }) => {
			if (is_in_range) {
				this.line.list = [];
				for (let val of lines) {
					// 根据线材类型进行分类 list中没有的类型就创建 有就填入
					let find = false;
					for (let val2 of this.line.list) {
						if (val2.type === val.type) {
							find = true;
							val2.list.push(val);
							break;
						}
					}
					if (!find) {
						let t = {
							type: val.type,
							list: [val],
						};
						this.line.list.push(t);
					}
				}
				this.line.isBidirect = isBidirect;
				// 弹窗显示在鼠标右下角 10px的位置
				this.line.show = true;
				this.$nextTick(() => {
					// 如果弹窗在右下角显示不下 则换到左下角
					let { x, y } = this.mouse_p;
					let width = document.getElementById('line_info').offsetWidth;
					let w_width = document.getElementById('index').clientWidth;
					if (x + 10 + width >= w_width) {
						this.line.style = {
							left: `${x - 10 - width}px`,
							top: `${y + 10}px`,
						};
					} else {
						this.line.style = {
							left: `${x + 10}px`,
							top: `${y + 10}px`,
						};
					}
				});
			} else {
				// 每收到一条连线发来的消息 就自增
				this.line_count++;
				// 所有 有信息 的连线都是false则隐藏弹窗
				if (this.line_count === this.panel.line_info_total) {
					this.line.show = false;
				}
			}
		});
	},
	methods: {
		// 视窗大小变化
		resize() {
			// 组件列表初始化好后才能执行
			if (!this.panel) {
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
			// 每个面板比例不同
			this.radio = Math.round((c_w / this.panel.mb.w) * 100) / 100;
		},
		// 获取组件布局
		async get_components() {
			let res = await this.request('get', `${components_url}/${this.id}`, this.token);
			if (res.data.head.code != 200 || !res.data.data?.panelParam) {
				this.$message('未配置产品可视化界面');
				return;
			}
			// 存储源数据
			this.源数据 = res.data.data.panelParam;
			// 取第一个面板数据为初始值
			this.panel = this.源数据[0];
			// 初始加载时的路径
			this.路径 = [this.panel];
			this.面板数据初始化();
			this.$nextTick(async () => {
				await this.获取面板数据();
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
		面板数据初始化() {
			// 设备id去重
			this.panel.deviceIds = [...new Set(this.panel.allBindDeviceIds || [])];
			// 统计连线数量
			this.panel.line_info_total = 0;
			for (let val of this.panel.data) {
				// 判断组件列表中 连线组件是否有接口信息 有则计数
				if (val.type === '连线' && val.rawData?.data?.edgeConfig?.length) {
					this.panel.line_info_total++;
				}
			}
			this.radio = Math.round((document.documentElement.clientWidth / this.panel.mb.w) * 100) / 100;
		},
		async 获取面板数据() {
			await this.count_device_list();
			// 开启设备实时数据上报
			for (let val of this.panel.deviceIds) {
				this.start_report(val);
			}
		},
		// 获取数值
		async get_data(device_id) {
			let res = await this.request('get', `${get_data_url}/${device_id}`, this.token);
			if (res.data.head.code != 200) {
				return;
			}
			// 将整个数据对象发给每个组件 让其自己解析路径 获取对应的值
			// status 1在线 2离线 除了在线 其他都算离线
			let device_status = res.data.data.status === 1;
			this.inject_data = {
				data: res.data.data.properties,
				device_id: res.data.data.deviceId,
				device_status,
			};
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
			this.订阅设备消息();
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
		订阅设备消息() {
			// 每跳转一个面板 订阅当前面板设备
			for (let val of this.panel.deviceIds) {
				this.stomp_link.subscribe(
					`/exchange/device-report/device-report.${val}`,
					(res) => {
						// 上报的是当前面板设备 才继续往下执行
						if (this.panel.deviceIds.includes(val)) {
							let data = JSON.parse(res.body);
							let t = {
								data: data.contents[0].attributes,
								device_id: val,
								message: data,
							};
							// 只有特定消息类型才更新设备状态
							switch (data.messageBizType) {
								case 5:
									t['device_status'] = true;
									break;
								case 6:
									t['device_status'] = false;
									break;
							}
							this.inject_data = t;
						}
					},
					{ 'auto-delete': true }
				);
			}
		},
		// stomp连接失败的回调
		on_error(error) {},
		// 面板整体尺寸调节
		panel_size() {
			let height = this.panel.mb.h * this.radio;
			let bg = {
				height: height + 'px',
			};
			this.panel.mb.ys && (bg.backgroundColor = this.panel.mb.ys);
			this.panel.mb.tp && (bg.backgroundImage = `url(${this.panel.mb.tp})`);
			return bg;
		},
		// 关闭需要关闭的弹窗
		close_popup() {
			this.drop.show = false;
		},
		// 统计所有组件总共涉及的设备id
		async count_device_list() {
			// 异步请求 请求回来的数据进行广播
			let result = [];
			for (let val of this.panel.deviceIds) {
				result.push(this.get_data(val));
			}
			// 全部请求回来后再进行后续 否则可能会覆盖推流数据
			await Promise.all(result).catch((err) => {});
		},
		// 让设备开始上报
		start_report(device_id) {
			this.request('put', `${decive_report_url}/${device_id}`, this.token);
		},
		// 巡检节流事件
		checking_event(flag) {
			this.online_check.is_checking = flag;
		},
		// 根据缓存数据渲染组件 无需连websocket 加载初始数据即可
		render_components(data) {
			// 存储源数据
			this.源数据 = [data];
			this.panel = data;
			this.面板数据初始化();
		},
		// 下拉框选择
		drop_select(obj) {
			this.drop.select = {
				id: this.drop.id,
				label: obj.label,
				value: obj.value,
			};
		},
		// 鼠标移动监测
		mouse_event(e) {
			clearTimeout(this.mouse_timer);
			this.mouse_timer = setTimeout(() => {
				// 存储当前页面的滚动距离 否则向下滚动时鼠标坐标位置会和连线位置错开
				let scroll_top = document.getElementById('index').scrollTop;
				// 检测鼠标位置是否在线上
				this.mouse_p = {
					x: e.clientX,
					y: e.clientY,
					scroll_top,
				};
				// 鼠标移动结束时 清空连线统计计数
				this.line_count = 0;
			}, 500);
		},
		// 鼠标移出 清除事件
		mouse_leave() {
			clearTimeout(this.mouse_timer);
		},
		查询面板对象(panel_id, 路径, list = this.源数据) {
			for (let val of list) {
				if (val.id === panel_id) {
					路径.unshift(val);
					return val;
				} else if (val.children?.length) {
					let result = this.查询面板对象(panel_id, 路径, val.children);
					if (result) {
						路径.unshift(val);
						return result;
					}
				}
			}
			return false;
		},
		路径回退(panel, index) {
			// 重复点击当前面板路径 不进行操作
			if (panel == this.panel) {
				return;
			}
			// 删除回退位置后的路径
			this.路径.splice(index + 1);
			this.panel = panel;
		},
		背景色调() {
			let bg = {};
			this.panel && (bg.backgroundColor = this.panel.mb.ys);
			return bg;
		},
	},
});
