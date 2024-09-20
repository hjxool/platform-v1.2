let url = `${我是接口地址}/`;
let components_url = `${url}api-device/device/controlPanel/PC`; //根据设备id查询可视化面板
let get_data_url = url + 'api-device/device/status'; //查询数据
let sendCmdtoDevice = url + 'api-device/device/panel/operation'; // 下发指令
let user_info_url = `${url}api-auth/oauth/userinfo`; //获取用户信息
let decive_report_url = `${url}api-device/device/panel/switch`; //打开设备上报

new Vue({
	el: '#index',
	mixins: [common_functions],
	components: {
		customSlider,
		customText,
		customImg,
		customButton,
		customSwitch,
		customProgress,
		customSelector,
		customButtonSwitch,
		customMatrix,
		customRadioGroup,
		customCheckBox,
		customTable,
		customInput,
		customStatus,
		customEchart,
		customPopup,
		customSubmitButton,
		customSlider2,
	},
	data: {
		html: {
			page_loading: true,
		},
		page_id: '', //面板id
		component_list: [], //组件列表
		popup: {
			show: false, //弹窗显示
			style: null, // 弹窗样式数据
			components: [], // 弹窗组件列表
			radio: 1, // 当前面板缩放比例
			title: '', // 弹窗标题
		},
		token: '',
		device_id: '',
		inject_data: null, // 注入组件的数据
		drop: {
			show: false, // 下拉框显示
			show2: false, // 弹窗内的下拉框显示
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
	mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
			this.device_id = sessionStorage.device_id;
			// this.product_id = sessionStorage.product_id;
			document.title = decodeURIComponent(window.sessionStorage.device_name);
		} else {
			this.get_token();
		}
		// 区分是跳转还是本地缓存数据
		if (this.device_id && this.token) {
			// 开启设备实时数据上报
			this.start_report(this.device_id);
			this.get_components();
		} else {
			// 监听父页面传入的缓存数据
			window.onmessage = (data) => {
				if (Array.isArray(data)) {
					this.cache_render(data);
				}
			};
		}
		window.addEventListener('resize', () => {
			// 组件列表初始化好后才能执行
			if (!this.component_list.length) {
				return;
			}
			let dom = document.documentElement;
			let c_w = dom.clientWidth;
			for (let val of this.component_list) {
				val.radio = Math.floor((c_w / val.mb.w) * 100 + 0.5) / 100;
			}
			if (this.popup.show) {
				// 窗口缩放时 弹窗也要缩放
				this.popup_size();
			}
		});
		// 监听下拉框事件
		this.$bus.$on('drop_down_show', ({ list, left, top, id }) => {
			// 区分是弹窗内下拉框还是外层页面下拉框
			if (this.popup.show) {
				this.drop.show2 = true;
			} else {
				this.drop.show = true;
			}
			this.drop.style.left = left;
			this.drop.style.top = top;
			this.drop.options = list;
			// 记录当前显示的对应组件id
			this.drop.id = id;
		});
		// 监听跳转页面事件
		this.$bus.$on('turn_to_page', (page_id) => {
			this.page_id = page_id;
		});
		// 监听弹窗事件
		this.$bus.$on('open_popup_data', (popup_data) => {
			this.popup.style = popup_data.mb;
			this.popup.components = popup_data.data;
			this.popup.show = true;
			this.popup.title = popup_data.name;
			// 打开弹窗后需要重新拉取一次数据
			this.get_data();
		});
	},
	methods: {
		// 获取组件布局
		get_components() {
			this.request('get', `${components_url}/${this.device_id}`, this.token, (res) => {
				if (res.data.head.code != 200 || !res.data.data) {
					this.html.page_loading = false;
					this.$message('未配置产品可视化界面');
					return;
				}
				let dom = document.documentElement;
				let c_w = dom.clientWidth;
				for (let val of res.data.data.panelParam) {
					// 每个面板比例不同
					val.radio = Math.floor((c_w / val.mb.w) * 100 + 0.5) / 100;
				}
				// 数据预处理 取出弹窗面板 将其添加到对应组件上
				let pages = []; // 普通面板
				let popup = []; // 弹窗面板
				// 先将面板分类放置
				for (let val of res.data.data.panelParam) {
					if (val.是否是弹窗面板) {
						popup.push(val);
					} else {
						pages.push(val);
					}
				}
				// 在给弹窗按钮添加属性前 先给提交按钮添加属性 记录所在弹窗面板下有多少可收集数据组件
				// 用于在监听事件回调中下发指令
				for (let val of popup) {
					for (let val2 of val.data) {
						if (val2.type === '提交按钮') {
							let count = 0;
							for (let val3 of val.data) {
								if (val3.是表单组件) {
									count++;
								}
							}
							val2.total = count;
							break;
						}
					}
				}
				// 弹窗按钮上的弹窗数据不需要响应式
				this.component_list = pages;
				// 再遍历组件 找到弹窗按钮 在其身上添加数据
				for (let val of this.component_list) {
					for (let val2 of val.data) {
						if (val2.type === '打开弹窗按钮') {
							for (let val3 of popup) {
								if (val3.id === val2.url) {
									val2.popup_data = val3;
									break;
								}
							}
						}
					}
				}
				this.page_id = this.component_list[0].id;
				this.$nextTick(() => {
					// component_list原本为空，组件尚未初始化，赋值后立即发送消息，组件收不到
					// this.$bus.$emit('common_params', this.token, this.device_id);
					this.get_data(); // 组件初始化结束再去查值 触发事件
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
						this.get_user_info(); // 组件初始化后 建立连接 触发事件
					}
				});
			});
		},
		// 获取数值
		get_data() {
			this.request('get', `${get_data_url}/${this.device_id}`, this.token, (res) => {
				this.html.page_loading = false;
				if (res.data.head.code != 200) {
					return;
				}
				let data = res.data.data.properties;
				// 将整个数据对象发给每个组件 让其自己解析路径 获取对应的值
				this.inject_data = data;
			});
		},
		// 获取用户信息包括 id 连接stomp用户名和密码
		get_user_info() {
			this.request('get', user_info_url, this.token, (res) => {
				console.log('用户', res);
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
			});
		},
		// stomp连接成功的回调
		on_message() {
			this.stomp_link.subscribe(
				`/exchange/device-report/device-report.${this.device_id}`,
				(res) => {
					let data = JSON.parse(res.body);
					this.inject_data = data.contents[0].attributes;
				},
				{ 'auto-delete': true }
			);
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
		resize(page) {
			let height = page.mb.h * page.radio;
			return { background: page.mb.ys, height: height + 'px' };
		},
		// 让设备开始上报
		start_report(device_id) {
			this.request('put', `${decive_report_url}/${device_id}`, this.token);
		},
		// 计算弹窗面板尺寸样式
		popup_size() {
			// 找到当前面板缩放比例
			for (let val of this.component_list) {
				if (val.id === this.page_id) {
					this.popup.radio = val.radio;
					break;
				}
			}
			let height = this.popup.style.h * this.popup.radio;
			let width = this.popup.style.w * this.popup.radio;
			return {
				position: 'relative',
				background: this.popup.style.ys,
				height: height + 'px',
				width: width + 'px',
			};
		},
		// 根据缓存渲染页面
		cache_render(data) {
			let dom = document.documentElement;
			let c_w = dom.clientWidth;
			for (let val of data) {
				val.radio = Math.floor((c_w / val.mb.w) * 100 + 0.5) / 100;
			}
			let pages = []; // 普通面板
			let popup = []; // 弹窗面板
			for (let val of data) {
				if (val.是否是弹窗面板) {
					popup.push(val);
				} else {
					pages.push(val);
				}
			}
			for (let val of popup) {
				for (let val2 of val.data) {
					if (val2.type === '提交按钮') {
						let count = 0;
						for (let val3 of val.data) {
							if (val3.是表单组件) {
								count++;
							}
						}
						val2.total = count;
						break;
					}
				}
			}
			this.component_list = pages;
			for (let val of this.component_list) {
				for (let val2 of val.data) {
					if (val2.type === '打开弹窗按钮') {
						for (let val3 of popup) {
							if (val3.id === val2.url) {
								val2.popup_data = val3;
								break;
							}
						}
					}
				}
			}
			this.page_id = this.component_list[0].id;
		},
		// 下拉框选择
		drop_select(obj) {
			// this.drop.show = false;
			this.drop.select = {
				id: this.drop.id,
				label: obj.label,
				value: obj.value,
			};
		},
		// 关闭需要关闭的弹窗
		close_popup() {
			this.drop.show = this.drop.show2 = false;
		},
	},
});
