let url = `${我是接口地址}/`;
let get_data_url = url + 'api-device/device/status'; //查询数据
let sendCmdtoDevice = url + 'api-device/device/operation'; // 下发指令
let user_info_url = `${url}api-auth/oauth/userinfo`; //获取用户信息

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			page: 0,
			gain_min: -80,
			gain_max: 12,
			page_loading: false, //页面加载
		},
		device_name: '', //设备名
		scene_select: '', //场景选择
		status: [
			{ title: '通道', value: ['CH1', 'CH2', 'CH3', 'CH4'] },
			{ title: '电压', value: ['0.0', '0.0', '0.0', '0.0'] },
			{ title: '温度', value: ['0.0', '0.0', '0.0', '0.0'] },
			{ title: '故障', value: [1, 1, 1, 0] },
		],
		input: [
			{ gain: -10.2, mute: 0 },
			{ gain: -10.2, mute: 1 },
			{ gain: -10.2, mute: 0 },
			{ gain: -10.2, mute: 0 },
		],
		output: [
			{ gain: -10.2, mute: 0 },
			{ gain: -10.2, mute: 0 },
			{ gain: -10.2, mute: 0 },
			{ gain: -10.2, mute: 1 },
		],
	},
	mounted() {
		document.title = '功放设备';
		if (!location.search) {
			this.token = sessionStorage.token;
			this.id = window.sessionStorage.id;
			this.device_name = decodeURIComponent(window.sessionStorage.device_name);
		} else {
			this.get_token();
			this.device_name = decodeURIComponent(this.device_name);
		}
		if (localStorage.hushanwebuserinfo) {
			let obj = JSON.parse(localStorage.hushanwebuserinfo);
			this.ws_name = obj.mqUser;
			this.ws_password = obj.mqPassword;
			this.user_id = obj.id;
			this.ws_link = new WebSocket(`${我是websocket地址}`);
			this.stomp_link = Stomp.over(this.ws_link);
			this.stomp_link.debug = null;
			this.stomp_link.connect(this.ws_name, this.ws_password, this.on_message, this.on_error, '/');
		} else {
			this.get_user_info();
		}
		this.switch_page(this.html.page);
		this.resize();
		window.onresize = this.resize;
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
				this.ws_name = res.data.data.mqUser;
				this.ws_password = res.data.data.mqPassword;
				this.user_id = res.data.data.id;
				this.ws_link = new WebSocket(`${我是websocket地址}`);
				this.stomp_link = Stomp.over(this.ws_link);
				this.stomp_link.debug = null;
				this.stomp_link.connect(this.ws_name, this.ws_password, this.on_message, this.on_error, '/');
			});
		},
		// stomp连接成功的回调
		on_message() {
			this.stomp_link.subscribe(
				`/exchange/device-report/device-report.${this.id}`,
				(res) => {
					let data = JSON.parse(res.body);
					let data_list = Object.entries(data.contents[0].attributes);
					for (let array of data_list) {
						let reg = /^v\d{1}$/;
						let reg2 = /^temp$/;
						let reg3 = /^fault\d{1}$/;
						let reg4 = /^gain_in\d{1}$/;
						let reg5 = /^gain_out\d{1}$/;
						let reg6 = /^mute_in\d{1}$/;
						let reg7 = /^mute_out\d{1}$/;
						if (reg.test(array[0])) {
							let index = Number(array[0].substring(1));
							if (index < this.ch_num) {
								this.status[1].value.splice(index, 1, Math.floor(array[1] * 10) / 10);
							}
						} else if (reg2.test(array[0])) {
							this.status[2].value = [];
							let t = Math.floor(array[1] * 10) / 10;
							for (let i = 0; i < this.ch_num; i++) {
								this.status[2].value.push(t);
							}
						} else if (reg3.test(array[0])) {
							let index = Number(array[0].substring(5));
							if (index < this.ch_num) {
								this.status[3].value.splice(index, 1, array[1]);
							}
						} else if (reg4.test(array[0])) {
							let index = Number(array[0].substring(7));
							if (index < this.ch_num) {
								this.input[index].gain = array[1];
							}
						} else if (reg5.test(array[0])) {
							let index = Number(array[0].substring(8));
							if (index < this.ch_num) {
								this.output[index].gain = array[1];
							}
						} else if (reg6.test(array[0])) {
							let index = Number(array[0].substring(7));
							if (index < this.ch_num) {
								this.input[index].mute = array[1];
							}
						} else if (reg7.test(array[0])) {
							let index = Number(array[0].substring(8));
							if (index < this.ch_num) {
								this.output[index].mute = array[1];
							}
						} else if (array[0].indexOf('scene') != -1) {
							this.scene_select = array[1];
						}
					}
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
			this.$message.error(error.headers.message);
		},
		resize() {
			let dom = document.documentElement;
			let w = dom.clientWidth;
			if (w > 1000 && w <= 1920) {
				let t = w / 1920;
				let fontSize = Math.ceil(t * 16);
				dom.style.fontSize = `${fontSize}px`;
			} else if (w > 1920) {
				dom.style.fontSize = `16px`;
			} else {
				dom.style.fontSize = `10px`;
			}
		},
		// 切换页面显示选项卡
		switch_page(index) {
			this.html.page = index;
			this.html.page_loading = true;
			switch (index) {
				case 0:
					this.get_data();
					break;
			}
		},
		// 获取状态数据
		get_data() {
			this.request('get', `${get_data_url}/${this.id}`, this.token, (res) => {
				console.log('状态数据', res);
				this.html.page_loading = false;
				if (res.data.head.code != 200) {
					return;
				}
				let data = res.data.data.properties;
				this.ch_num = data.channel_num.propertyValue; //通道数量
				// 状态值
				for (let val of this.status) {
					val.value = [];
					switch (val.title) {
						case '通道':
							for (let i = 1; i <= this.ch_num; i++) {
								val.value.push(`CH${i}`);
							}
							break;
						case '电压':
							for (let i = 0; i < this.ch_num; i++) {
								val.value.push(Math.floor(data[`v${i}`].propertyValue * 10) / 10);
							}
							break;
						case '温度':
							let t = Math.floor(data.temp.propertyValue * 10) / 10;
							for (let i = 0; i < this.ch_num; i++) {
								val.value.push(t);
							}
							break;
						case '故障':
							for (let i = 0; i < this.ch_num; i++) {
								val.value.push(data[`fault${i}`].propertyValue);
							}
							break;
					}
				}
				// 静音增益
				this.input = [];
				this.output = [];
				for (let i = 0; i < this.ch_num; i++) {
					let t = {
						gain: data[`gain_in${i}`].propertyValue,
						mute: data[`mute_in${i}`].propertyValue,
						gain_input: data[`gain_in${i}`].propertyValue,
					};
					this.input.push(t);
					let t2 = {
						gain: data[`gain_out${i}`].propertyValue,
						mute: data[`mute_out${i}`].propertyValue,
						gain_input: data[`gain_out${i}`].propertyValue,
					};
					this.output.push(t2);
				}
				this.scene_select = data.scene.propertyValue;
			});
		},
		// 增益样式
		gain_cover(gain) {
			let p = (gain - this.html.gain_min) / (this.html.gain_max - this.html.gain_min);
			return { height: `${p * 100}%` };
		},
		gain_button(gain) {
			let p = (gain - this.html.gain_min) / (this.html.gain_max - this.html.gain_min);
			return { bottom: `calc(${p * 100}% - ${19 / 2}px)` };
		},
		slider_turn_to(e, obj, dom, key) {
			// 是否是跳转操作 只有跳转发指令
			let flag = false;
			if (typeof dom == 'undefined') {
				flag = true;
				dom = document.querySelector('.gain');
			}
			let t = dom.offsetHeight - (e.clientY - dom.getBoundingClientRect().top);
			let p = t / dom.offsetHeight;
			obj.gain = p * (this.html.gain_max - this.html.gain_min) + this.html.gain_min;
			obj.gain = Math.floor(obj.gain * 10) / 10;
			if (obj.gain > this.html.gain_max) {
				obj.gain = this.html.gain_max;
			}
			if (obj.gain < this.html.gain_min) {
				obj.gain = this.html.gain_min;
			}
			if (flag) {
				this.send_order(key, obj.gain);
			}
		},
		slider_move(obj, key) {
			let dom = document.querySelector('.gain');
			document.onmousemove = (e) => {
				this.slider_turn_to(e, obj, dom);
			};
			document.onmouseup = () => {
				this.send_order(key, obj.gain);
				document.onmousemove = null;
				document.onmouseup = null;
			};
		},
		// 下发指令 设置属性
		send_order(key, ...params) {
			if (typeof key == undefined) {
				return;
			}
			let topic = 8;
			let body = {
				contentType: 0,
				contents: [{ deviceId: this.id, attributes: {} }],
			};
			if (key == 'scene') {
				topic = 11;
				body.contentType = 2;
				body.contents[0].identifier = key;
				body.contents[0].attributes[key] = this.scene_select;
			} else if (key.indexOf('mute_') != -1) {
				params[0].mute = params[0].mute ? 0 : 1;
				let t = {
					ch: Number(key[key.length - 1]),
					in_out: key.indexOf('in') == -1 ? 1 : 0,
					options: 'mute',
					value: params[0].mute,
				};
				body.contents[0].attributes = t;
			} else if (key.indexOf('gain_') != -1) {
				let t = {
					in_out: key.indexOf('_in') == -1 ? 1 : 0,
					options: 'gain',
					ch: Number(key[key.length - 1]),
					value: params[0],
				};
				body.contents[0].attributes = t;
			}
			this.request('put', `${sendCmdtoDevice}/${topic}`, this.token, body);
		},
		// 防抖
		debounce(fn, delay, ...params) {
			clearTimeout(this.timer);
			this.timer = setTimeout(() => {
				fn(...params);
			}, delay);
		},
		// 验证滑块输入
		verify_slider_input(obj, key) {
			let reg = /(^\-?\d+$)|(^\+?\d+$)|(^\-?\d+\.\d+$)|(^\+?\d+\.\d+$)/;
			if (reg.test(obj.gain_input)) {
				if (Number(obj.gain_input) < this.html.gain_min) {
					obj.gain = obj.gain_input = this.html.gain_min;
				} else if (Number(obj.gain_input) > this.html.gain_max) {
					obj.gain = obj.gain_input = this.html.gain_max;
				} else {
					obj.gain = Number(obj.gain_input);
				}
				this.send_order(key, obj.gain);
			} else {
				this.$message.error('只能输入数字！');
				obj.gain_input = obj.gain;
			}
		},
	},
});
