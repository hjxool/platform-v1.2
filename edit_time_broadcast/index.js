let url = `${我是接口地址}/`;
let material_search_url = `${url}api-file/doc/catalogue/shareMaterial/search`; // 素材列表
let device_search_url = `${url}api-portal/place/user/findPlaceDevice`; // 场所设备树
let trigger_search_url = `${url}api-portal/place/user/findDevice`; // 触发设备列表
let get_fileinfo_url = `${url}api-file/doc/catalogue/shareMaterial/filesInfo`; // 根据filepath查文件信息
let send = `${昆仑IP}/`;
let timing_submit_url = `${send}api/addTskInfo`; // 添加定时广播
let fire_submit_url = `${send}api/addAlarmTsk`; // 添加消防广播
let get_timing_url = `${send}api/getTskList`; // 定时广播回显数据
let get_fire_url = `${send}api/getAlarmTskList`; // 消防广播回显数据
let timing_edit_url = `${send}api/editTskInfo`; // 编辑定时广播
let fire_edit_url = `${send}api/editAlarmTsk`; // 编辑消防广播
let tts_input_url = `${send}api/getTTSText`; // 获取文字转语音文本

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		form: {
			name: '', // 任务名
			source_type: 1, // 音源类型
			left_search: '', // 音频文件搜索
			right_search: '', // 右边搜索
			source_list: [], // 音源列表
			device_list: [], // 场所设备树
			audio_collector_list: [], // 音频采集器列表 跟设备树相同
			audio_collector_search: '', //音频采集器搜索
			audio_collector_select: [], //音频采集器勾选
			left_hover: -1, // 左边鼠标悬浮显示
			right_hover: -1, // 右边鼠标悬浮显示
			playtime: { hour: 0, minutes: 0, seconds: 0 }, // 播放时长
			starttime: '', // 开始日期时间
			end_date: '', // 结束日期
			ban_end: false, // 可以设置结束日期
			play_mode: 0, // 播放模式
			work_plan: 0, // 工作计划
			week_plan: [], // 工作计划 周
			vol: 0, // 音量
			skip_date: null, // 跳过节假日
			ban_skip: false, // 默认可以设置跳过节假日
			skip_list: [], // 跳过节日列表
			trigger_device: '', // 触发设备
			trigger_port: '', //触发端口
			select_device: [], // 勾选设备
			select_file: [], // 勾选文件
			tts_input: '', // 文字转语音输入内容
		},
		html: {
			page_loading: false, // 页面加载
			page_size: 15, // 文件列表单页显示数
			left_loading: false, // 左边方框加载
			right_loading: false, // 设备框加载
			file_total: 0, // 文件总数
			cur_page: 1, // 文件当前页
		},
		rules: {
			name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
			starttime: [{ type: 'date', required: true, message: '请选择日期', trigger: 'change' }],
			trigger_device: [{ required: true, message: '请选择设备', trigger: 'change' }],
		},
		props: {
			label: 'name',
			children: 'devices',
		},
		router: '',
		trigger_list: [], // 触发设备列表
		kunlun_product: ['1651429605822386178', '1651430896820768770', '1651431270457757698', '1651482049868681218', '1651482396674707458', '1651482588501200898', '1651482684559151105'], // 昆仑产品id 用于筛选场所及设备
	},
	mounted() {
		this.get_token();
		this.get_data();
		this.resize();
		window.onresize = () => {
			this.resize();
		};
	},
	methods: {
		resize() {
			// 计算根节点子体大小
			let p = window?.parent?.parent || window?.parent;
			let dom;
			if (p) {
				dom = p.document.documentElement;
			} else {
				dom = document.documentElement;
			}
			let width = dom.clientWidth;
			let ratio = Math.floor((width / 1920) * 100 + 0.5) / 100;
			document.documentElement.style.fontSize = ratio * 20 + 'px';
		},
		// 异步获取数据进度
		async get_data() {
			this.html.page_loading = true;
			if (this.id == -1) {
				await this.get_file_list(1);
				await this.get_device_list('all');
				if (this.router === 'Added_edit_fire_alarm') {
					await this.get_trigger_list();
				}
			} else {
				if (this.router === 'Added_edit_fire_alarm') {
					await this.get_trigger_list();
				}
				await this.get_file_list(1);
				await this.get_device_list('all');
				await this.get_timing_fire_data();
				if (this.router === 'Edit_timed_broadcast_added' && this.form.source_type === 2) {
					await this.get_tts_input();
				}
			}
			this.html.page_loading = false;
		},
		// 获取文件列表
		get_file_list(page) {
			// 如果总页面在加载就不显示小窗遮罩
			this.html.left_loading = !this.html.page_loading;
			let body = {
				pageNum: page,
				pageSize: this.html.page_size,
				keyword: this.form.left_search,
				condition: { catalogueId: -1, fileTypeList: [2, 3] },
			};
			return new Promise((success, fail) => {
				this.request('post', material_search_url, this.token, body, (res) => {
					console.log('素材', res);
					success();
					this.html.left_loading = false;
					if (res.data.head.code != 200) {
						this.html.file_total = 0;
						return;
					}
					let data = res.data.data;
					for (let val of data.data) {
						val.check = false; // 添加勾选标识
						for (let val2 of this.form.select_file) {
							if (val2.id === val.id) {
								val.check = true; // 回显
								break;
							}
						}
					}
					this.form.source_list = data.data;
					this.html.file_total = data.total;
					this.html.cur_page = page;
				});
			});
		},
		// 获取场所及设备列表
		get_device_list(flag) {
			switch (flag) {
				case 'left':
					this.html.left_loading = !this.html.page_loading;
					return new Promise((success, fail) => {
						this.request('post', device_search_url, this.token, { keyword: this.form.audio_collector_search, categoryIds: this.kunlun_product }, (res) => {
							success();
							this.html.left_loading = false;
							if (res.data.head.code !== 200) {
								return;
							}
							let list = [];
							for (let val of res.data.data) {
								if (val.devices && val.devices.length) {
									val.name = val.placeName;
									for (let val2 of val.devices) {
										val2.name = val2.deviceName;
									}
									list.push(val);
								}
							}
							this.form.audio_collector_list = list;
						});
					});
				case 'right':
					this.html.right_loading = !this.html.page_loading;
					return new Promise((success, fail) => {
						this.request('post', device_search_url, this.token, { keyword: this.form.right_search, categoryIds: this.kunlun_product }, (res) => {
							success();
							console.log('场所设备', res);
							this.html.right_loading = false;
							if (res.data.head.code !== 200) {
								return;
							}
							let list = [];
							for (let val of res.data.data) {
								if (val.devices && val.devices.length) {
									val.name = val.placeName;
									for (let val2 of val.devices) {
										val2.name = val2.deviceName;
									}
									list.push(val);
								}
							}
							this.form.device_list = list;
						});
					});
				case 'all':
					return new Promise((success, fail) => {
						this.request('post', device_search_url, this.token, { categoryIds: this.kunlun_product }, (res) => {
							success();
							if (res.data.head.code !== 200) {
								return;
							}
							let list = [];
							for (let val of res.data.data) {
								if (val.devices && val.devices.length) {
									val.name = val.placeName;
									for (let val2 of val.devices) {
										val2.name = val2.deviceName;
									}
									list.push(val);
								}
							}
							this.form.audio_collector_list = JSON.parse(JSON.stringify(list));
							this.form.device_list = JSON.parse(JSON.stringify(list));
						});
					});
			}
		},
		// 获取触发设备列表
		get_trigger_list() {
			return new Promise((success, fail) => {
				this.request('post', trigger_search_url, this.token, {}, (res) => {
					success();
					console.log('触发设备', res.data);
					if (res.data.head.code !== 200) {
						return;
					}
					this.trigger_list = res.data.data;
				});
			});
		},
		// 编辑时获取定时/消防数据 回显
		get_timing_fire_data() {
			let url = this.router === 'Edit_timed_broadcast_added' ? get_timing_url : get_fire_url;
			return new Promise((success, fail) => {
				this.send_fn('post', url, this.token, { filter: { tskGuid: this.id } }, async (res) => {
					console.log('编辑', res.data);
					if (res.data.Code !== 1) {
						success();
						return;
					}
					let data = res.data.Data[0];
					if (this.router === 'Edit_timed_broadcast_added') {
						this.form.source_type = data.srcType;
						switch (data.srcType) {
							case 1:
								await this.get_file_info(data.srcsInfo);
								for (let val of this.form.select_file) {
									for (let val2 of this.form.source_list) {
										if (val.id === val2.id) {
											val2.check = true;
											break;
										}
									}
								}
								break;
							case 4:
								this.$refs.audio_collector.setCheckedKeys(data.srcsInfo);
								for (let val of data.srcsInfo) {
									for (let val2 of this.form.audio_collector_list) {
										for (let val3 of val2.devices) {
											if (val === val3.id) {
												this.form.audio_collector_select.push({ id: val3.id, name: val3.name });
												break;
											}
										}
									}
								}
								break;
						}
						this.form.starttime = new Date(data.tskStartTime);
						this.form.end_date = data.tskStopTime ? new Date(data.tskStopTime) : '';
						this.form.ban_end = data.tskStopTime ? true : false;
						this.form.work_plan = data.jobType;
						if (data.jobType == 7) {
							let arr = data.weekData.split('');
							let index = 0;
							for (let val of arr) {
								if (val == '1') {
									this.form.week_plan.push(index);
								}
								index++;
							}
						}
						this.form.skip_date = [];
						this.form.ban_skip = data.hasSkipHoliday ? true : false;
						for (let val of data.HolidayList) {
							this.form.skip_list.push([val.startTime, val.endTime]);
						}
					} else {
						await this.get_file_info(data.srcsInfo);
						for (let val of this.form.select_file) {
							for (let val2 of this.form.source_list) {
								if (val.id === val2.id) {
									val2.check = true;
									break;
								}
							}
						}
						this.form.trigger_device = data.alarmUsrGuid;
						this.form.trigger_port = data.alarmPort;
					}
					this.form.name = data.tskName;
					this.$refs.device_tree.setCheckedKeys(data.dstsUsrGuids);
					for (let val of data.dstsUsrGuids) {
						for (let val2 of this.form.device_list) {
							for (let val3 of val2.devices) {
								if (val === val3.id) {
									this.form.select_device.push({ id: val3.id, name: val3.name });
									break;
								}
							}
						}
					}
					this.form.playtime.seconds = data.tskDuration % 60;
					let t = Math.floor(data.tskDuration / 60);
					this.form.playtime.minutes = t % 60;
					this.form.playtime.hour = Math.floor(t / 60);
					this.form.play_mode = data.flagRandom;
					this.form.vol = data.playVolumn;
					success();
				});
			});
		},
		// 根据编辑回显的文件filepath查询文件信息
		get_file_info(data) {
			return new Promise((success, fail) => {
				this.request('post', get_fileinfo_url, this.token, data, (res) => {
					success();
					if (res.data.head.code !== 200) {
						return;
					}
					this.form.select_file = res.data.data;
				});
			});
		},
		// 获取文字转语音文本内容
		get_tts_input() {
			return new Promise((success, fail) => {
				this.send_fn('post', tts_input_url, this.token, { tskGuid: this.id }, (res) => {
					success();
					if (res.data.Code != 1) {
						return;
					}
					this.form.tts_input = res.data.txtContent;
				});
			});
		},
		// 音频节点勾选
		source_select(file) {
			file.check = !file.check;
			if (file.check) {
				this.form.select_file.push(file);
			} else {
				let i = 0;
				for (let val of this.form.select_file) {
					if (val.id === file.id) {
						this.form.select_file.splice(i, 1);
						break;
					}
					i++;
				}
			}
		},
		source_select_change(check, file) {
			if (check) {
				this.form.select_file.push(file);
			} else {
				let i = 0;
				for (let val of this.form.select_file) {
					if (val.id === file.id) {
						this.form.select_file.splice(i, 1);
						break;
					}
					i++;
				}
			}
		},
		// 删除勾选文件
		del_select_file(index) {
			let t = this.form.select_file.splice(index, 1)[0];
			for (let val of this.form.source_list) {
				if (val.id === t.id) {
					val.check = false;
					break;
				}
			}
		},
		// 清除文件勾选
		clear_file_select() {
			// 把当前查询列表的取消勾选 在清空勾选列
			for (let val of this.form.select_file) {
				for (let val2 of this.form.source_list) {
					if (val2.id === val.id) {
						val2.check = false;
						break;
					}
				}
			}
			this.form.select_file = [];
		},
		// 勾选全部文件
		check_all_file() {
			// 先记录勾选的原长度 只遍历原始长度之前的
			let length = this.form.select_file.length;
			for (let val of this.form.source_list) {
				let find = false;
				val.check = true;
				for (let index = 0; index < length; index++) {
					if (val.id === this.form.select_file[index].id) {
						find = true;
						break;
					}
				}
				if (!find) {
					this.form.select_file.push(val);
				}
			}
		},
		// 播放列表节点勾选
		device_list_select(node, check_list) {
			this.form.select_device = [];
			for (let val of check_list.checkedNodes) {
				if (!val.devices) {
					this.form.select_device.push(val);
				}
			}
		},
		// 音频采集器节点勾选
		audio_list_select(node, check_list) {
			this.form.audio_collector_select = [];
			for (let val of check_list.checkedNodes) {
				if (!val.devices) {
					this.form.audio_collector_select.push(val);
				}
			}
		},
		// 删除勾选设备
		del_select_device(index, flag) {
			let arr = [];
			let list;
			let key;
			switch (flag) {
				case 'left':
					list = this.form.audio_collector_select;
					list.splice(index, 1);
					key = 'audio_collector';
					break;
				case 'right':
					list = this.form.select_device;
					list.splice(index, 1);
					key = 'device_tree';
					break;
			}
			for (let val of list) {
				arr.push(val.id);
			}
			this.$refs[key].setCheckedKeys(arr);
		},
		// 清除设备勾选
		clear_device_select(flag) {
			if (flag === 'left') {
				this.form.audio_collector_select = [];
				this.$refs.audio_collector.setCheckedKeys([]);
			} else {
				this.form.select_device = [];
				this.$refs.device_tree.setCheckedKeys([]);
			}
		},
		// 勾选全部场所设备
		check_all_device(flag) {
			let arr = [];
			let list = flag == 'left' ? this.form.audio_collector_list : this.form.device_list;
			for (let val of list) {
				for (let val2 of val.devices) {
					arr.push(val2.id);
				}
			}
			let key = flag == 'left' ? 'audio_collector' : 'device_tree';
			this.$refs[key].setCheckedKeys(arr);
			let length = flag == 'left' ? this.form.audio_collector_select.length : this.form.select_device.length; // 记录原长度
			let list2 = flag == 'left' ? this.form.audio_collector_select : this.form.select_device;
			for (let val of list) {
				for (let val2 of val.devices) {
					let find = false;
					for (let index = 0; index < length; index++) {
						if (val2.id === list2[index].id) {
							find = true;
							break;
						}
					}
					if (!find) {
						list2.push(val2);
					}
				}
			}
		},
		// 每次改变往跳过列表里添加 清空时跳过
		add_skip_list(data_list) {
			if (!data_list) {
				return;
			}
			let m = data_list[0].getMonth() + 1;
			let t = `${data_list[0].getFullYear()}-${m < 10 ? '0' + m : m}-${data_list[0].getDate() < 10 ? '0' + data_list[0].getDate() : data_list[0].getDate()}`;
			let m2 = data_list[1].getMonth() + 1;
			let t2 = `${data_list[1].getFullYear()}-${m2 < 10 ? '0' + m2 : m2}-${data_list[1].getDate() < 10 ? '0' + data_list[1].getDate() : data_list[1].getDate()}`;
			this.form.skip_list.push([t, t2]);
		},
		// 日期展示文字
		skip_text(array) {
			return `开始：${array[0]} 结束：${array[1]}`;
		},
		// 重置跳过节日
		reset_skip(val) {
			if (val) {
				return;
			}
			this.form.skip_list = [];
			this.form.skip_date = null;
		},
		// 删除某一行日期
		del_skip(index) {
			this.form.skip_list.splice(index, 1);
		},
		// 计算设备树下设备总数
		device_count(flag) {
			let num = 0;
			let list = flag === 'left' ? this.form.audio_collector_list : this.form.device_list;
			for (let val of list) {
				num += val.devices.length;
			}
			return num;
		},
		//根据勾选文件计算总时长
		set_playtime() {
			let time = 0; // 秒为单位
			for (let val of this.form.select_file) {
				time += parseInt(val.duration || 0);
			}
			let seconds = time % 60;
			let t = Math.floor(time / 60);
			let minutes = t % 60;
			let hour = Math.floor(t / 60);
			this.form.playtime = { hour, minutes, seconds };
		},
		// 判断是否输入的数字
		is_num(obj, key) {
			if (isNaN(obj[key])) {
				this.$message.error('只允许输入数字！');
				obj[key] = isNaN(parseInt(obj[key])) ? 0 : parseInt(obj[key]);
			} else {
				obj[key] = Number(obj[key]);
			}
		},
		// 判断是否是1~32
		is_port_max(obj, key) {
			if (isNaN(obj[key])) {
				this.$message.error('只允许输入数字！');
				obj[key] = isNaN(parseInt(obj[key])) ? 0 : parseInt(obj[key]);
			} else {
				obj[key] = parseInt(obj[key]) ? parseInt(obj[key]) : 0;
			}
			if (obj[key] > 100) {
				obj[key] = 100;
			}
		},
		// 请求方法
		send_fn(method, url, token, data, fn) {
			axios({
				method: method,
				url: url,
				data: typeof data == 'object' ? data : typeof data == 'function' ? ((fn = data), null) : null,
				headers: {
					Authorization: `Bearer ${token}`,
					'content-type': 'application/json',
				},
			}).then((res) => {
				if (res.data.Code == 1 && typeof fn == 'function') {
					fn(res);
				} else {
					this.$alert(res.data.Msg, '提示', {
						confirmButtonText: '确定',
						callback: () => {
							if (typeof fn === 'function') {
								fn(res);
							}
						},
					});
				}
			});
		},
		// 提交
		submit() {
			this.$refs.form.validate((result) => {
				switch (this.form.source_type) {
					case 1:
						if (!this.form.select_file.length) {
							this.$message.error('请选择文件');
							return;
						}
						break;
					case 2:
						if (!this.form.tts_input) {
							this.$message.error('请输入文字转语音内容');
							return;
						}
						break;
					case 4:
						if (!this.form.audio_collector_select.length) {
							this.$message.error('请选择音频采集器');
							return;
						}
						break;
				}
				if (!this.form.select_device.length) {
					this.$message.error('请选择设备');
					return;
				}
				if (result) {
					let url;
					switch (this.router) {
						case 'Edit_timed_broadcast_added':
							if (this.id != -1) {
								url = timing_edit_url;
							} else {
								url = timing_submit_url;
							}
							break;
						case 'Added_edit_fire_alarm':
							if (this.id != -1) {
								url = fire_edit_url;
							} else {
								url = fire_submit_url;
							}
							break;
					}
					if (this.router === 'Edit_timed_broadcast_added') {
						if (this.form.ban_end) {
							if (this.form.starttime.getTime() > this.form.end_date.getTime()) {
								this.$message.error('开始时间不能大于结束时间！');
								return;
							}
						}
						let data = {
							tskName: this.form.name,
							srcType: this.form.source_type,
							jobType: this.form.work_plan,
							tskDuration: this.form.playtime.hour * Math.pow(60, 2) + this.form.playtime.minutes * 60 + this.form.playtime.seconds,
							playVolumn: parseInt(this.form.vol),
							flagRandom: this.form.play_mode,
							hasSkipHoliday: this.form.ban_skip ? 1 : 0,
							srcsInfo: [],
							dstsUsrGuids: [],
							fileType: 2,
						};
						let d = this.form.starttime;
						let d_str = d.toString().split(' ')[4];
						data.tskStartTime = `${d.getFullYear()}-${d.getMonth() + 1 < 10 ? '0' + (d.getMonth() + 1) : d.getMonth() + 1}-${d.getDate() < 10 ? '0' + d.getDate() : d.getDate()} ${d_str}`;
						if (this.form.ban_end) {
							let d2 = this.form.end_date;
							data.tskStopTime = `${d2.getFullYear()}-${d2.getMonth() + 1 < 10 ? '0' + (d2.getMonth() + 1) : d2.getMonth() + 1}-${d2.getDate() < 10 ? '0' + d2.getDate() : d2.getDate()} 00:00:00`;
						}
						if (this.form.work_plan == 7) {
							// 格式'0000000' 表示从周日到周六 勾选位置变为1
							let arr = [];
							for (let index = 0; index < 7; index++) {
								arr.push(0);
							}
							for (let val of this.form.week_plan) {
								arr.splice(val, 1, 1);
							}
							data.weekData = arr.join('');
						}
						if (this.form.ban_skip) {
							data.HolidayList = [];
							for (let val of this.form.skip_list) {
								let o = { startTime: val[0], endTime: val[1] };
								data.HolidayList.push(o);
							}
						}
						switch (this.form.source_type) {
							case 1:
								for (let val of this.form.select_file) {
									data.srcsInfo.push(val.filePath);
								}
								break;
							case 2:
								data.txtContent = this.form.tts_input;
								break;
							case 4:
								for (let val of this.form.audio_collector_select) {
									data.srcsInfo.push(val.id);
								}
								break;
						}
						for (let val of this.form.select_device) {
							data.dstsUsrGuids.push(val.id);
						}
						if (this.id != -1) {
							data.tskGuid = this.id;
						}
						this.html.page_loading = true;
						this.send_fn('post', url, this.token, { tskInfo: data }, (res) => {
							this.html.page_loading = false;
							if (res.data.Code != 1) {
								return;
							}
							this.close('创建成功');
							window.parent.postMessage({
								type: 'jump',
								name: '定时广播',
							});
						});
					} else {
						let data = {
							tskName: this.form.name,
							alarmUsrGuid: this.form.trigger_device,
							alarmPort: parseInt(this.form.trigger_port),
							tskDuration: this.form.playtime.hour * Math.pow(60, 2) + this.form.playtime.minutes * 60 + this.form.playtime.seconds,
							playVolumn: parseInt(this.form.vol),
							flagRandom: this.form.play_mode,
							srcsInfo: [],
							dstsUsrGuids: [],
							fileType: 2,
						};
						for (let val of this.form.select_file) {
							data.srcsInfo.push(val.filePath);
						}
						for (let val of this.form.select_device) {
							data.dstsUsrGuids.push(val.id);
						}
						if (this.id != -1) {
							data.tskGuid = this.id;
						}
						this.html.page_loading = true;
						this.send_fn('post', url, this.token, { tskInfo: data }, (res) => {
							this.html.page_loading = false;
							if (res.data.Code != 1) {
								return;
							}
							this.close('创建成功');
							window.parent.postMessage({
								type: 'jump',
								name: '消防报警广播',
							});
						});
					}
				}
			});
		},
		//关闭弹窗
		close(params) {
			window.parent.postMessage({ type: 'Close popup', msg: params ? params : '' });
		},
	},
});
