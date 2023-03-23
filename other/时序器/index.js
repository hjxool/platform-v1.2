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
		},
		channel: [
			{ v: 0, a: 0, delay: 1, status: 0 },
			{ v: 0, a: 0, delay: 1, status: 0 },
			{ v: 0, a: 0, delay: 1, status: 0 },
			{ v: 0, a: 0, delay: 1, status: 0 },
			{ v: 0, a: 0, delay: 1, status: 0 },
			{ v: 0, a: 0, delay: 1, status: 0 },
			{ v: 0, a: 0, delay: 1, status: 0 },
			{ v: 0, a: 0, delay: 1, status: 0 },
		],
		timing_switch: 0, //时序开关
		device_name: '', //设备名
	},
	mounted() {
		document.title = '时序器';
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
					console.log(data);
					let data_list = Object.entries(data.contents[0].attributes);
					for (let array of data_list) {
						let reg = /^ch\d+$/;
						if (array[0].indexOf('sequence') != -1) {
							this.timing_switch = array[1];
						} else if (reg.test(array[0])) {
							let index = Number(array[0].substring(2));
							let t = {
								v: 0,
								a: 0,
								delay: 1,
								status: array[1],
							};
							this.channel.splice(index - 1, 1, t);
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
				//通道数量
				let reg = /^ch\d+$/;
				this.ch_num = 0;
				for (let key in data) {
					reg.test(key) ? this.ch_num++ : '';
				}
				this.channel = [];
				for (let i = 0; i < this.ch_num; i++) {
					let t = {
						v: 0,
						a: 0,
						delay: 1,
						status: data[`ch${i + 1}`].propertyValue,
					};
					this.channel.push(t);
				}
				this.timing_switch = data.sequence.propertyValue;
			});
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
			let reg = /^ch\d+$/;
			if (key.indexOf('sequence') != -1) {
				this.timing_switch = this.timing_switch ? 0 : 1;
				body.contents[0].attributes[key] = this.timing_switch;
			} else if (reg.test(key)) {
				params[0].status = params[0].status ? 0 : 1;
				body.contents[0].attributes[key] = params[0].status;
			}
			this.request('put', `${sendCmdtoDevice}/${topic}`, this.token, body);
		},
	},
});
