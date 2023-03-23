new Vue({
	el: '#temp',
	mixins: [common_functions],
	data() {
		return {
			channel_num: 2, //通道数
			// 总选项卡
			sound_item_options: [
				{ name: '功放参数', light_icon: './img/功放icon亮.png', dark_icon: './img/功放icon暗.png' },
				{ name: 'DSP参数', light_icon: './img/dsp参数亮.png', dark_icon: './img/dsp参数暗.png' },
				{ name: '系统功能', light_icon: './img/系统功能亮.png', dark_icon: './img/系统功能暗.png' },
			],
			option_focus: 0, //总选项卡选中
			// DSP参数
			dsp_option: {
				input: {
					level: 0,
					mute: 0,
					gain: 0,
				},
				output: [],
				geq_title_list: ['60Hz', '230Hz', '910Hz', '4000Hz', '14000Hz'], //geq通道名称
				// limit1_flag: false, //压限打开时轮询标识
				// limit2_flag: false,
			},
			// 系统功能参数
			sys_option: {
				status: [], //通道状态
				power_value: '', //电源电压
				select_time: -1, //选择是天 周 月其一
				select_week: -1, //选择一周中的某天
				select_month: -1, //选择一月中的某天
				weeks: ['周一', '周二', '周三', '周四', '周五', '周六', '周七'],
				day_time: '', //当天时间
				check_ststus: 0, //自检开关状态
			},
			history: {
				history_data_option: 0, //查询历史数据选项
				history_option: ['电压', '电流', '功率', '温度'], //历史记录选项
				output1: {
					// timeList: [], //横轴时间间隔，但不显示
					// currentList: [], //纵轴电流值
					// voltageList: [], //电压
					// powerList: [], //功率
					// temperatureList: [], //温度
					// y_data: [], //Y轴数据是动态的 根据选项卡切换
				},
				output2: {},
				data_null: false,
				history_day: '',
				display_title: '', //不同选项提示框不同
				display_unit: '',
			},
			device_name: '', //显示在页面上的设备名
			// data_ready: false, // 数据结构是否完成了
		};
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
		document.title = '智慧音频终端';
		if (localStorage.hushanwebuserinfo) {
			let obj = JSON.parse(localStorage.hushanwebuserinfo);
			this.ws_name = obj.mqUser;
			this.ws_password = obj.mqPassword;
			this.user_id = obj.id;
		} else {
			this.get_user_info();
		}
		for (let i = 1; i <= 2; i++) {
			// 两个通道同步请求 需要两个标识符
			this[`first_load${i}`] = true;
		}
		// echart设置
		let dom = document.getElementsByClassName('history_echart');
		for (let i = 1; i <= 2; i++) {
			this[`echarts${i}`] = echarts.init(dom[i - 1]); //动态创建对象属性并赋值
		}
		this.ws_link = null;
		this.switch_option(0);
		this.history_timer = setInterval(() => {
			this.history_switch(this.history.history_data_option);
		}, 600000);
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
			});
		},
		// stomp连接成功的回调
		on_message() {
			let d = {
				closeValue: 0,
				deviceMessageDTO: {
					contentType: 2,
					contents: [{ deviceId: this.id, identifier: 'level_report_enable', attributes: { level_switch: 1 } }],
				},
				fieldPath: 'level_switch',
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
						if (array[0] == 'dev_state') {
							for (let i = 0; i < 2; i++) {
								this.sys_option.status[i].splice(i, 1, array[1][`out${i + 1}`]);
							}
						} else if (array[0] == 'in1_gain') {
							this.dsp_option.input.gain = array[1];
						} else if (array[0] == 'in1_mute') {
							this.dsp_option.input.mute = array[1];
						} else if (array[0] == 'level') {
							this.dsp_option.input.level = array[1].in1;
							this.dsp_option.output[0].level = array[1].out1;
							this.dsp_option.output[1].level = array[1].out2;
						} else if (array[0].substring(0, 3) == 'out') {
							let index = array[0].substring(3, 4); // 截取序列号
							let key = array[0].substring(5); // 截取键名
							switch (key) {
								case 'gain':
								case 'mute':
									this.dsp_option.output[index - 1][key] = array[1];
									break;
								case 'th':
									this.dsp_option.output[index - 1].limit_threshold = array[1];
									break;
								case 'th_dyn':
									this.dsp_option.output[index - 1].limit_enable = array[1];
									break;
								default:
									// 只剩下geq 提出索引
									let index2 = key.substring(3, 4);
									this.dsp_option.output[index - 1].geq_list[index2 - 1].gain = array[1];
									break;
							}
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
		on_error(error) {},
		// 总选项选中样式
		option_style(index) {
			let style = {
				background: this.option_focus == index ? '#1431a0' : 'rgba(32, 44, 92, 0.48)',
				border: this.option_focus == index ? '' : '1px solid #1B59CA',
				boxShadow: this.option_focus == index ? '' : '0px 0px 65px 0px rgba(4, 15, 51, 0.8)',
			};
			return style;
		},
		// 切换选项卡同时重新获取节点初始化echart
		switch_option(index) {
			switch (index) {
				case 0:
					if (this.ws_link != null) {
						this.ws_link.close();
						this.ws_link = null;
					}
					this.history_switch(0);
					this.option_focus = index;
					break;
				case 1:
					this.get_device_status(index);
					break;
				case 2:
					this.get_device_status(index);
					break;
			}
		},
		// 获取设备状态
		get_device_status(index) {
			this.dsp_option.output = [];
			this.sys_option.status = [];
			this.request('get', `${getChannelDetail}/${this.id}`, this.token, (res) => {
				console.log('dsp数据', res);
				if (this.ws_link == null) {
					this.ws_link = new WebSocket(`${ws_url}`);
					this.stomp_link = Stomp.over(this.ws_link);
					this.stomp_link.debug = null;
					this.stomp_link.connect(this.ws_name || 'admin', this.ws_password || 'admin', this.on_message, this.on_error, '/');
				}
				this.option_focus = index;
				if (res.data.data == null) {
					return;
				}
				this.dsp_option.input = {
					level: res.data.data.properties.level.propertyValue.in1.propertyValue,
					mute: res.data.data.properties.in1_mute.propertyValue,
					gain: res.data.data.properties.in1_gain.propertyValue,
				};
				let t = {
					level: res.data.data.properties.level.propertyValue.out1.propertyValue,
					gain: res.data.data.properties.out1_gain.propertyValue,
					limit_threshold: res.data.data.properties.out1_th.propertyValue,
					limit_enable: res.data.data.properties.out1_th_dyn.propertyValue,
					mute: res.data.data.properties.out1_mute.propertyValue,
					geq_list: [
						{ gain: res.data.data.properties.out1_geq1.propertyValue },
						{ gain: res.data.data.properties.out1_geq2.propertyValue },
						{ gain: res.data.data.properties.out1_geq3.propertyValue },
						{ gain: res.data.data.properties.out1_geq4.propertyValue },
						{ gain: res.data.data.properties.out1_geq5.propertyValue },
					],
				};
				let t2 = {
					level: res.data.data.properties.level.propertyValue.out2.propertyValue,
					gain: res.data.data.properties.out2_gain.propertyValue,
					limit_threshold: res.data.data.properties.out2_th.propertyValue,
					limit_enable: res.data.data.properties.out2_th_dyn.propertyValue,
					mute: res.data.data.properties.out2_mute.propertyValue,
					geq_list: [
						{ gain: res.data.data.properties.out2_geq1.propertyValue },
						{ gain: res.data.data.properties.out2_geq2.propertyValue },
						{ gain: res.data.data.properties.out2_geq3.propertyValue },
						{ gain: res.data.data.properties.out2_geq4.propertyValue },
						{ gain: res.data.data.properties.out2_geq5.propertyValue },
					],
				};
				this.dsp_option.output.push(t, t2);
				this.sys_option.power_value = res.data.data.properties.amp_msg.propertyValue.power_vol.propertyValue;
				let t3 = {
					dsp_sta: res.data.data.properties.dev_state.propertyValue.out1.propertyValue.dsp_sta.propertyValue,
					amp_sta: res.data.data.properties.dev_state.propertyValue.out1.propertyValue.amp_sta.propertyValue,
					spk_sta: res.data.data.properties.dev_state.propertyValue.out1.propertyValue.spk_sta.propertyValue,
				};
				let t4 = {
					dsp_sta: res.data.data.properties.dev_state.propertyValue.out2.propertyValue.dsp_sta.propertyValue,
					amp_sta: res.data.data.properties.dev_state.propertyValue.out2.propertyValue.amp_sta.propertyValue,
					spk_sta: res.data.data.properties.dev_state.propertyValue.out2.propertyValue.spk_sta.propertyValue,
				};
				this.sys_option.status.push(t3, t4);
				this.data_ready = true;
			});
		},
		// 历史记录选中样式
		history_option_style(index) {
			let style = {
				fontSize: '14px',
				color: this.history.history_data_option == index ? '#FFFFFF' : '#84D5FE',
			};
			return style;
		},
		// 切换历史记录
		history_switch(index) {
			this.history.history_data_option = index;
			switch (index) {
				case 0:
					for (let i = 1; i <= 2; i++) {
						this.res_history(`properties.amp_msg.propertyValue.output${i}.propertyValue.voltage`, `电压output${i}`, i, '电压', 'V');
					}
					break;
				case 1:
					for (let i = 1; i <= 2; i++) {
						this.res_history(`properties.amp_msg.propertyValue.output${i}.propertyValue.current`, `电流output${i}`, i, '电流', 'A');
					}
					break;
				case 2:
					for (let i = 1; i <= 2; i++) {
						this.res_history(`properties.amp_msg.propertyValue.output${i}.propertyValue.power`, `功率output${i}`, i, '功率', 'W');
					}
					break;
				case 3:
					for (let i = 1; i <= 2; i++) {
						this.res_history(`properties.amp_msg.propertyValue.output${i}.propertyValue.tempreture`, `温度output${i}`, i, '温度', '℃');
					}
					break;
			}
		},
		// 每隔十分钟查询历史数据
		res_history(fieldPath, res_name, channel, title, unit) {
			this.request(
				'post',
				device_status_history,
				this.token,
				{
					condition: { deviceId: this.id, fieldPath: fieldPath },
					pageNum: 1,
					pageSize: 100,
				},
				(res) => {
					console.log(res_name, res);
					if (res.data.data.data.length == 0 || res.data.data == null) {
						this.$message.info(res_name + '无历史数据');
						return;
					}
					// 截取时间戳组成新数组
					this.history[`output${channel}`].timeList = [];
					this.history[`output${channel}`].y_data = [];
					for (let e of res.data.data.data) {
						let temp = Math.floor(Number(e.propertyValue) * 10) / 10;
						this.history[`output${channel}`].y_data.push(temp);
						this.history[`output${channel}`].timeList.push(e.created);
					}
					if (this[`first_load${channel}`]) {
						this.history_echart(channel);
						this[`first_load${channel}`] = false;
					} else {
						this[`echarts${channel}`].setOption({
							tooltip: {
								formatter: (value) => {
									let format_text = `
                  日期：${value[0].axisValue.split(' ')[0]}<br>
                  时间：${value[0].axisValue.split(' ')[1]}<br>
                  ${title}：${value[0].data} ${unit}
                `;
									return format_text;
								},
							},
							series: [
								{
									data: this.history[`output${channel}`].y_data,
								},
							],
						});
					}
				}
			);
		},
		// 第一次加载页面时 设置图表配置
		history_echart(index) {
			let option = {
				grid: {
					show: true,
					backgroundColor: 'rgba(7, 61, 44, 0.2)',
					borderColor: '#065950',
				},
				xAxis: {
					type: 'category',
					data: this.history[`output${index}`].timeList,
					// 轴线配置
					axisLine: {
						// 线相关样式
						lineStyle: {
							color: '#0A6D62',
							shadowBlur: 0,
							shadowColor: '#0A6D62',
							shadowOffsetX: 16,
						},
						// 轴线装饰
						symbol: ['none', 'triangle'],
						symbolOffset: [0, 20],
					},
					// 轴线上的刻度
					axisTick: {
						show: false,
						// alignWithLabel: true,//与刻度对齐
					},
					// 轴线上的文字配置
					axisLabel: {
						color: '#4F81FF',
					},
					// 分割线配置
					splitLine: {
						show: true,
						lineStyle: {
							color: '#065950',
						},
					},
				},
				yAxis: {
					type: 'value',
					axisLine: {
						show: true,
						lineStyle: {
							color: '#0A6D62',
							shadowBlur: 0,
							shadowColor: '#0A6D62',
							shadowOffsetY: -16,
						},
						symbol: ['none', 'triangle'],
						symbolOffset: [0, 20],
					},
					axisLabel: {
						color: '#00F2F1',
					},
					splitLine: {
						lineStyle: {
							color: '#065950',
						},
					},
					// 最大最小边界处理方式，即是否留白等等
					boundaryGap: ['0%', '20%'],
				},
				tooltip: {
					trigger: 'axis',
					formatter: (value) => {
						let format_text = `
						  日期：${value[0].axisValue.split(' ')[0]}<br>
						  时间：${value[0].axisValue.split(' ')[1]}<br>
						  电压：${value[0].data} V
						`;
						return format_text;
					},
				},
				series: [
					{
						type: 'line',
						data: this.history[`output${index}`].y_data,
						smooth: true, //平滑显示
						symbol: 'none', //线段上的装饰点
						lineStyle: {
							color: '#E1C506',
						},
						cursor: 'none',
					},
				],
			};
			this[`echarts${index}`].setOption(option);
		},
		// dsp界面按钮控制
		dsp_button(key, value, index) {
			let attributes = {};
			attributes[key] = value ? 0 : 1;
			this.request('put', `${sendCmdtoDevice}/8`, this.token, { contentType: 0, contents: [{ deviceId: this.id, attributes: attributes }] }, (res) => {
				switch (key) {
					case 'in1_mute':
						this.dsp_option.input.mute = value ? 0 : 1;
						break;
					case `out${index + 1}_th_dyn`:
						this.dsp_option.output[index].limit_enable = value ? 0 : 1;
						break;
					case `out${index + 1}_mute`:
						this.dsp_option.output[index].mute = value ? 0 : 1;
						break;
				}
				// 判断是否点下的是压限开关且是否开启 将标识符置为true
				if (key === `out${index + 1}_th_dyn`) {
					this.dsp_option[`limit${index + 1}_flag`] = value ? false : true;
				}
			});
		},
		// 格式化时间 收集数据 在点自检按钮时再发出
		set_time() {
			let params = {
				channel: 0,
				deviceid: this.device_id,
				schedule: {},
			};
			if (this.sys_option.check_ststus == 0) {
				if (JSON.stringify(this.sys_option.day_time).length < 10) {
					this.$message.error('请选择时间');
				} else if (this.sys_option.select_time == -1) {
					this.$message.error('请选择自检类型');
				} else {
					// 开了自检才能发送参数
					params.schedule.sys_check = 1;
					params.schedule.timing_type = this.sys_option.select_time;
					// 格式化时间
					let temp = this.sys_option.day_time.toString();
					params.schedule.check_time = temp.split(' ')[4];
					// 分类发送
					switch (this.sys_option.select_time) {
						case 0:
							this.request('post', schedule, params, '74935343174538', this.loginToken, () => {
								this.sys_option.check_ststus = 1;
							});
							break;
						case 1:
							if (this.sys_option.select_week == -1) {
								this.$message.error('请指定一周中的哪一天');
							} else {
								params.schedule.week = this.sys_option.select_week;
								this.request('post', schedule, params, '74935343174538', this.loginToken, () => {
									this.sys_option.check_ststus = 1;
								});
							}
							break;
						case 2:
							if (this.sys_option.select_month == -1) {
								this.$message.error('请指定每月中的哪一天');
							} else {
								params.schedule.day = this.sys_option.select_month;
								this.request('post', schedule, params, '74935343174538', this.loginToken, () => {
									this.sys_option.check_ststus = 1;
								});
							}
							break;
					}
				}
			} else {
				params.schedule.sys_check = 0;
				this.request('post', schedule, params, '74935343174538', this.loginToken, () => {
					this.sys_option.check_ststus = 0;
				});
			}
		},
		// 自检开关样式
		check_button_style() {
			let style = {
				background: this.sys_option.check_ststus == 1 ? '#1431A0' : 'linear-gradient(0deg, #061c47, #092d73)',
				color: this.sys_option.check_ststus == 1 ? '#fff' : '#84d5fe',
				border: this.sys_option.check_ststus == 1 ? 'none' : '1px solid #325ecb',
			};
			return style;
		},
		// 手动获取通道状态
		get_status() {
			this.request('put', `${sendCmdtoDevice}/11`, this.token, { contentType: 2, contents: [{ deviceId: this.id, identifier: 'dev_check', attributes: {} }] });
		},
	},
});
