let url = `${我是接口地址}/`;
let getChannelDetail = url + 'api-device/device/status'; //查询历史记录
let sendCmdtoDevice = url + 'api-device/device/operation'; // 下发指令
let user_info_url = `${url}api-auth/oauth/userinfo`; //获取用户信息

new Vue({
	el: '.index',
	mixins: [common_functions],
	data: {
		html: {
			config_select: 2,
			level_max: 0,
			level_min: -72,
			gain_max: 12,
			gain_min: -72,
			video_buttons: [], //视频控制按钮
			page_select: 0, //选择的显示页
			page: ['矩阵', '自定义'],
			url: '',
			iframe_h: 0,
		},
		configs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], // 场景配置选择
		matrix: [], // 矩阵
		input: [], //输入
		output: [], //输出
		video_matrix: [], //视频矩阵回显
		device_name: '', //显示在页面的设备名
		productId: '', //产品ID
	},
	mounted() {
		if (!location.search) {
			this.token = window.sessionStorage.token;
			this.id = window.sessionStorage.id;
			this.device_name = decodeURIComponent(window.sessionStorage.device_name);
		} else {
			this.get_token();
			this.device_name = decodeURIComponent(this.device_name);
		}
		// 生成视频控制按钮
		for (let row = 0; row < 4; row++) {
			for (let col = 0; col < 4; col++) {
				let t = {
					label: `In${col + 1}->Out${row + 1}`,
					value: [col, row],
				};
				this.html.video_buttons.push(t);
			}
		}
		document.title = '智慧运算中心';
		if (localStorage.hushanwebuserinfo) {
			let obj = JSON.parse(localStorage.hushanwebuserinfo);
			this.ws_name = obj.mqUser;
			this.ws_password = obj.mqPassword;
			this.user_id = obj.id;
			this.link_websocket();
		} else {
			this.get_user_info();
		}
		this.data_ready = false; // 数据结构是否完成了
		window.onresize = () => {
			this.button_h = document.querySelector('.slider_button').offsetHeight;
		};
		this.change_page(0);
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
				this.link_websocket();
			});
		},
		// 切换tab时 断开 以及重连
		link_websocket() {
			this.ws_link = new WebSocket(`${我是websocket地址}`);
			this.stomp_link = Stomp.over(this.ws_link);
			this.stomp_link.debug = null;
			this.stomp_link.connect(this.ws_name, this.ws_password, this.on_message, this.on_error, '/');
		},
		// stomp连接成功的回调
		on_message() {
			let d = {
				closeValue: [0],
				deviceMessageDTO: {
					contentType: 2,
					contents: [
						{
							deviceId: this.id,
							identifier: 'LRPTSRV',
							attributes: {
								LRPT: [1],
							},
						},
					],
				},
				fieldPath: 'LRPT',
				topicId: 11,
			};
			this.request('put', sendCmdtoDevice, this.token, d);
			this.stomp_link.subscribe(
				`/exchange/device-report/device-report.${this.id}`,
				(res) => {
					if (!this.data_ready) {
						return;
					}
					let data = JSON.parse(res.body);
					let data_list = Object.entries(data.contents[0].attributes);
					for (let array of data_list) {
						if (array[0] == 'ILEVEL') {
							for (let i = 0; i < this.input.length; i++) {
								if (array[1][i] / 100 < this.html.level_min) {
									this.input[i].level = this.html.level_min;
								} else if (array[1][i] / 100 > this.html.level_max) {
									this.input[i].level = this.html.level_max;
								} else {
									this.input[i].level = array[1][i] / 100;
								}
							}
						} else if (array[0] == 'OLEVEL') {
							for (let i = 0; i < this.output.length; i++) {
								if (array[1][i] / 100 < this.html.level_min) {
									this.output[i].level = this.html.level_min;
								} else if (array[1][i] / 100 > this.html.level_max) {
									this.output[i].level = this.html.level_max;
								} else {
									this.output[i].level = array[1][i] / 100;
								}
							}
						} else if (array[0] == 'INGS') {
							for (let i = 0; i < this.input.length; i++) {
								this.input[i].gain = Math.floor(array[1][i] / 10 + 0.5) / 10;
								if (this.input[i].gain < this.html.gain_min) {
									this.input[i].gain = this.html.gain_min;
								} else if (this.input[i].gain > this.html.gain_max) {
									this.input[i].gain = this.html.gain_max;
								}
							}
						} else if (array[0] == 'OUTGS') {
							for (let i = 0; i < this.output.length; i++) {
								this.output[i].gain = Math.floor(array[1][i] / 10 + 0.5) / 10;
								if (this.output[i].gain < this.html.gain_min) {
									this.output[i].gain = this.html.gain_min;
								} else if (this.output[i].gain > this.html.gain_max) {
									this.output[i].gain = this.html.gain_max;
								}
							}
						} else if (array[0] == 'INMS') {
							for (let i = 0; i < this.input.length; i++) {
								this.input[i].mute = array[1][i];
							}
						} else if (array[0] == 'OUTMS') {
							for (let i = 0; i < this.output.length; i++) {
								this.output[i].mute = array[1][i];
							}
						} else if (array[0] == 'MIXS') {
							this.matrix = [];
							for (let i = 0; i < 9; i++) {
								let t = (array[1][i * 2] >>> 0).toString(2).split('').reverse();
								let t2 = 12 - t.length;
								for (let k = 0; k < t2; k++) {
									t.push('0');
								}
								this.matrix.push(t);
							}
						} else if (array[0] == 'SCALL') {
							this.html.config_select = array[1][0];
						} else if (array[0] == 'VSWT') {
							this.video_matrix = array[1];
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
			// this.$message.error(error.headers.message);
		},
		// 获取页面参数
		get_device_status() {
			this.matrix = [];
			this.input = [];
			this.output = [];
			this.video_matrix = [];
			this.request('get', `${getChannelDetail}/${this.id}`, this.token, (res) => {
				console.log('一体机数据', res);
				if (res.data.head.code != 200) {
					return;
				}
				this.productId = res.data.data.productId;
				let data = res.data.data.properties;
				for (let i = 0; i < 8; i++) {
					let t = {
						gain: Math.floor(data['INGS'].propertyValue[i] / 10 + 0.5) / 10,
						level: Math.floor(data['ILEVEL'].propertyValue[i] / 100),
						mute: data['INMS'].propertyValue[i],
					};
					if (t.gain < this.html.gain_min) {
						t.gain = this.html.gain_min;
					} else if (t.gain > this.html.gain_max) {
						t.gain = this.html.gain_max;
					}
					if (t.level < this.html.level_min) {
						t.level = this.html.level_min;
					} else if (t.level > this.html.level_max) {
						t.level = this.html.level_max;
					}
					this.input.push(t);
					let t2 = {
						gain: Math.floor(data['OUTGS'].propertyValue[i] / 10 + 0.5) / 10,
						level: Math.floor(data['OLEVEL'].propertyValue[i] / 100),
						mute: data['OUTMS'].propertyValue[i],
					};
					if (t2.gain < this.html.gain_min) {
						t2.gain = this.html.gain_min;
					} else if (t2.gain > this.html.gain_max) {
						t2.gain = this.html.gain_max;
					}
					if (t2.level < this.html.level_min) {
						t2.level = this.html.level_min;
					} else if (t2.level > this.html.level_max) {
						t2.level = this.html.level_max;
					}
					this.output.push(t2);
				}
				for (let i = 0; i < 9; i++) {
					let t = (data['MIXS'].propertyValue[i * 2] >>> 0).toString(2).split('').reverse(); //转换到二进制 切分成数组 反转数组 补零
					let t2 = 12 - t.length;
					for (let k = 0; k < t2; k++) {
						t.push('0');
					}
					this.matrix.push(t);
				}
				this.html.config_select = data['SCALL'].propertyValue[0];
				this.video_matrix = data['VSWT'].propertyValue;
				this.data_ready = true;
				this.$nextTick(() => {
					// this.level_h = document.querySelector('.level').offsetHeight - 4; //图片偏差
					// this.gain_h = document.querySelector('.gain').offsetHeight - 5;
					this.button_h = document.querySelector('.slider_button').offsetHeight;
					this.$forceUpdate();
				});
			});
		},
		// 电平样式
		level(level) {
			let p = (level - this.html.level_min) / (this.html.level_max - this.html.level_min);
			return { height: `${p * 100}%` };
		},
		// 增益样式
		gain_cover(gain) {
			let p = (gain - this.html.gain_min) / (this.html.gain_max - this.html.gain_min);
			return { height: `${p * 100}%` };
		},
		gain_button(gain) {
			let p = (gain - this.html.gain_min) / (this.html.gain_max - this.html.gain_min);
			return { bottom: `calc(${p * 100}% - ${this.button_h / 2}px)` };
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
				this.send_order(key);
			}
		},
		slider_move(obj, key) {
			let dom = document.querySelector('.gain');
			document.onmousemove = (e) => {
				this.slider_turn_to(e, obj, dom);
			};
			document.onmouseup = () => {
				this.send_order(key);
				document.onmousemove = null;
				document.onmouseup = null;
			};
		},
		// 下发指令 设置属性
		send_order(key, ...params) {
			if (typeof key == undefined) {
				return;
			}
			let attributes = {};
			if (key == 'MIXS') {
				this.matrix[params[1]].splice(params[2], 1, Number(params[0]) ? '0' : '1');
				let t = [];
				for (let i = 0; i < this.matrix.length; i++) {
					let t4 = [];
					for (let val of this.matrix[i]) {
						t4.push(val);
					}
					// 将数组反转 合并成字符串 用parseInt舍去前面的0 转换为number类型 再转进制
					let t2 = parseInt(t4.reverse().join(''));
					let t3 = parseInt(t2, 2) >> 0;
					t.push(t3, 0);
				}
				attributes[key] = t;
				console.log(this.matrix);
			} else if (key == 'INMS') {
				params[0].mute = params[0].mute ? 0 : 1;
				let t = [];
				for (let i = 0; i < this.input.length; i++) {
					t.push(this.input[i].mute);
				}
				attributes[key] = t;
			} else if (key == 'OUTMS') {
				params[0].mute = params[0].mute ? 0 : 1;
				let t = [];
				for (let i = 0; i < this.output.length; i++) {
					t.push(this.output[i].mute);
				}
				attributes[key] = t;
			} else if (key == 'INGS') {
				let t = [];
				for (let i = 0; i < this.input.length; i++) {
					t.push(this.input[i].gain * 100);
				}
				attributes[key] = t;
			} else if (key == 'OUTGS') {
				let t = [];
				for (let i = 0; i < this.output.length; i++) {
					t.push(this.output[i].gain * 100);
				}
				attributes[key] = t;
			} else if (key == 'SCALL') {
				attributes[key] = [this.html.config_select];
			} else if (key == 'SSAVE') {
				attributes[key] = [this.html.config_select];
			} else if (key == 'VSWT') {
				// attributes[key] = params[0].value;
				let index = params[1];
				switch (true) {
					case index < 4:
						this.video_matrix.splice(0, 1, index);
						break;
					case index < 8 && index >= 4:
						this.video_matrix.splice(1, 1, index - 4);
						break;
					case index < 12 && index >= 8:
						this.video_matrix.splice(2, 1, index - 8);
						break;
					case index >= 12:
						this.video_matrix.splice(3, 1, index - 12);
						break;
				}
				attributes[key] = this.video_matrix;
			}
			this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
				// if (key == 'SCALL') {
				// 	this.get_device_status();
				// }
			});
		},
		// 视频矩阵回显
		video_matrix_status(index) {
			switch (true) {
				case index < 4:
					if (index === this.video_matrix[0]) {
						return true;
					} else {
						return false;
					}
				case index < 8 && index >= 4:
					if (index - 4 === this.video_matrix[1]) {
						return true;
					} else {
						return false;
					}
				case index < 12 && index >= 8:
					if (index - 8 === this.video_matrix[2]) {
						return true;
					} else {
						return false;
					}
				case index >= 12:
					if (index - 12 === this.video_matrix[3]) {
						return true;
					} else {
						return false;
					}
			}
		},
		// 切换显示页
		change_page(index) {
			this.html.page_select = index;
			switch (index) {
				case 0:
					if (this.ws_link == null) {
						this.link_websocket();
					}
					this.get_device_status();
					break;
				case 1:
					if (this.ws_link != null) {
						this.ws_link.close();
						this.ws_link = null;
					}
					this.html.url = `${候工链接}?type=Visual_Preview&token=${this.token}&deviceId=${this.id}&productId=${this.productId}`;
					break;
			}
		},
	},
});
