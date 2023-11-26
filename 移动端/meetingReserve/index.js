// let url = `${我是接口地址}/`;
let url = 'http://192.168.30.45:9201';
let room_url = `${url}/api-portal/room/list/all`; //查询会议室列表
let meeting_type_url = `${url}/api-portal/meeting-type/search`; //查询会议室类型
let template_list_url = `${url}/api-portal/displayBoard/template/list`; //获取模板列表
let get_scene_url = `${url}/api-portal/scene-rule/available`; //查询场所可用场景
let meeting_reserve_url = `${url}/api-portal/meeting`; //预约会议
let remove_dup_url = `${url}/api-user/department/deptUsers/distinct`; //用户去重

Vue.use(vant.Step);
Vue.use(vant.Steps);
Vue.use(vant.Picker);
Vue.use(vant.Popup);
Vue.use(vant.DatetimePicker);
Vue.use(vant.Dialog);

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		loading: false, //加载弹窗
		step: {
			cur: 0, //当前进行到第几步
			steps: ['进行中', '通知配置', '模板配置'],
		},
		form: {
			theme: '', //会议主题
			room: '', //会议室
			type: '1', //会议类型id
			start_date: '', //开始年月日
			start_time: '', //开始时间
			end_time: '',
			holder: [], //主持人
			join: [], //参会人
			guest: [], //来宾
			reply: false, //是否回复
			notify: true, //是否通知
			reminds: [], //提醒时间
			signIn: true, //是否签到
			summary: true, //会议纪要
			template: '', //所选模板
			leader: [], //校领导
			lead_dep: [], //牵头单位
			// join_dep: [], //参会部门
		},
		meeting_type: [], //会议类型
		template_list: [], //模板列表
		scene_text: '', //场景提示
		pop_show: false, //弹窗显示
		picker: {
			title: '会议室', //选择器标题
			show: false, //显示
			options: [], //选项
			type: '', //弹窗类型
			date: null, //日期对象
			min_date: null, //最小日期 当天
			url: '', //iframe地址
		},
	},
	async mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
			this.id = sessionStorage.token; //会议室id
		} else {
			this.get_token();
		}
		this.reminds = [
			{ text: '开始时', value: 0 },
			{ text: '开始前15分钟', value: 1 },
			{ text: '开始前30分钟', value: 2 },
			{ text: '开始前1小时', value: 3 },
			{ text: '开始前2小时', value: 4 },
			{ text: '开始前1天', value: 5 },
			{ text: '开始前2天', value: 6 },
			{ text: '自定义', value: 7 },
		];
		this.resize();
		this.picker.min_date = new Date();
		this.loading = true;
		await this.get_room();
		await this.get_meeting_type();
		await this.get_template_list();
		this.loading = false;
		window.onmessage = async (data) => {
			console.log('页面消息', data);
			if (data.data.type === 'close_pop') {
				this.picker.show = false;
				let d = data.data.data;
				if (Array.isArray(d)) {
					let list;
					switch (this.picker.type) {
						case 'holder':
						case 'leader':
						case 'join':
							list = await this.de_weight(d);
							this.form[this.picker.type] = [];
							for (let val of list) {
								let t = {
									name: val.username,
									id: val.id,
									type: 'person',
								};
								this.form[this.picker.type].push(t);
							}
							break;
						case 'lead_dep':
							// case 'join_dep':
							this.form[this.picker.type] = [];
							let find = false;
							for (let val of d) {
								// 只显示部门
								if (val.type === 'stru') {
									let t = {
										name: val.name,
										id: val.id,
										type: 'stru',
									};
									this.form[this.picker.type].push(t);
								} else {
									// 如果选了人员则提示
									find = true;
								}
							}
							if (find) {
								vant.Toast('不能选人员');
							}
							break;
						// case 'join':
						// 	this.form[this.picker.type] = [];
						// 	let find2 = false;
						// 	for (let val of d) {
						// 		// 只显示人员
						// 		if (val.type === 'person') {
						// 			let t = {
						// 				name: val.name,
						// 				id: val.id,
						// 				type: 'person',
						// 			};
						// 			this.form[this.picker.type].push(t);
						// 		} else {
						// 			// 如果选了部门则提示
						// 			find2 = true;
						// 		}
						// 	}
						// 	if (find2) {
						// 		vant.Toast('不能选部门');
						// 	}
						// 	break;
					}
				}
			}
		};
	},
	methods: {
		// 浏览器大小改变后执行方法
		resize() {
			let dom = document.documentElement;
			let width = dom.clientWidth;
			let ratio = Math.round((width / 720) * 100) / 100; // 取小数点后两位
			dom.style.fontSize = ratio * 10 + 'px'; //以720分辨率下字体大小10px为基准
		},
		// 步骤名
		step_name(name, index) {
			switch (true) {
				case this.step.cur === index:
					return '进行中';
				case this.step.cur < index:
					return name;
				case this.step.cur > index:
					return '已完成';
			}
		},
		// 下一步 校验
		next_step() {
			switch (this.step.cur) {
				case 0:
					if (!this.form.theme) {
						vant.Toast('会议名不能为空');
						return;
					}
					if (!this.form.room) {
						vant.Toast('会议室不能为空');
						return;
					}
					if (!this.form.start_date || !this.form.start_time || !this.form.end_time) {
						vant.Toast('时间不能为空');
						return;
					}
					let start = new Date(`${this.form.start_date} ${this.form.start_time}`).getTime();
					let end = new Date(`${this.form.start_date} ${this.form.end_time}`).getTime();
					if (end <= start) {
						vant.Toast('开始时间不能大于结束时间');
						return;
					}
					break;
				case 1:
					if (!this.form.holder.length) {
						vant.Toast('主持人不能为空');
						return;
					}
					if (this.form.holder.length > 1) {
						vant.Toast('主持人只能有一个');
						return;
					}
					if (this.form.notify) {
						if (!this.form.reminds.length) {
							vant.Toast('请添加提醒时间');
							return;
						} else {
							for (let i = 0; i < this.form.reminds.length; i++) {
								if (this.form.reminds[i].value === 7) {
									// 检查是否有选自定义时间但没选时间
									if (!this.form.reminds[i].alert_time) {
										vant.Toast('自定义时间不能为空');
										return;
									}
								} else {
									// 检查是否有重复的时间
									for (let k = i + 1; k < this.form.reminds.length; k++) {
										if (this.form.reminds[i].value === this.form.reminds[k].value) {
											vant.Toast('提醒时间不能重复');
											return;
										}
									}
								}
							}
						}
					}
					if (!this.form.leader.length) {
						vant.Toast('校领导不能为空');
						return;
					}
					if (this.form.lead_dep.length !== 1) {
						vant.Toast('牵头单位有且仅能选一个');
						return;
					}
					// if (!this.form.join_dep.length && !this.form.join.length) {
					// 	vant.Toast('参会部门或人员至少选一个');
					// 	return;
					// }
					if (!this.form.join.length) {
						vant.Toast('参会人至少选一个');
						return;
					}
					break;
				case 2:
					this.get_scene();
					return;
			}
			this.step.cur++;
		},
		// 查询时间段内场景信息
		async get_scene() {
			// 开始结束时间
			let s = new Date(this.form.start_date);
			let y = s.getFullYear();
			let m = s.getMonth() + 1 < 10 ? '0' + (s.getMonth() + 1) : s.getMonth() + 1;
			let d = s.getDate() < 10 ? '0' + s.getDate() : s.getDate();
			this.st = `${y}-${m}-${d} ${this.form.start_time}:00`;
			this.et = `${y}-${m}-${d} ${this.form.end_time}:00`;
			// 提示是否有场景执行 而后提交请求
			this.loading = true;
			this.scene_text = '';
			let res = await this.request('get', `${get_scene_url}/${this.form.room.value}?placeStartDate=${this.st}&placeEndDate=${this.et}`, this.token);
			this.loading = false;
			if (res.data.head.code !== 200) {
				return;
			}
			for (let val of res.data.data) {
				this.scene_text += `${val.sceneName}、`;
			}
			// 如果有场景则显示弹窗
			this.pop_show = this.scene_text ? true : false;
			// 如果不显示弹窗则直接创建
			if (!this.pop_show) {
				this.create_meeting();
			}
		},
		// 创建会议
		async create_meeting() {
			this.loading = true;
			let data = {
				theme: this.form.theme,
				roomId: this.form.room.value,
				meetingType: this.form.type,
				startTime: this.st,
				endTime: this.et,
				moderatorId: this.form.holder[0].id,
				userIds: this.form.join.map((e) => e.id),
				guestList: this.form.guest,
				reply: this.form.reply ? 1 : 0,
				sendMessage: this.form.notify ? 1 : 0,
				meetingReminds: this.form.reminds.map((e) => {
					return { type: e.type, remindTime: e.alert_time };
				}),
				signIn: this.form.signIn ? 1 : 0,
				summary: this.form.summary ? 1 : 0,
				appointmentMode: 0, //默认单次预约
				// 校领导
				leadersIds: this.form.leader.map((e) => e.id),
				// 牵头单位
				leadingAgency: this.form.lead_dep.map((e) => e.id),
			};
			if (this.form.template) {
				data.templateId = this.form.template;
			}
			let res = await this.request('post', meeting_reserve_url, this.token, data);
			this.loading = false;
			if (res.data.head.code !== 200) {
				return false;
			}
			vant.Toast('创建成功');
			return res;
		},
		// 显示弹窗点击确定时创建会议
		async pop_submit(action, done) {
			if (action === 'confirm') {
				let res = await this.create_meeting();
				if (!res) {
					done(false);
					return;
				}
				done();
			} else {
				done();
			}
		},
		// 根据表单填入不同选项
		show_picker(type, params1) {
			// 记录打开弹窗类型 在确认时区分执行方法
			this.picker.type = type;
			this.picker.show = true;
			switch (type) {
				case 'room':
					this.picker.title = '会议室';
					this.picker.options = this.rooms;
					break;
				case 'start_date':
					this.picker.date = this.form.start_date ? new Date(this.form.start_date) : '';
					break;
				case 'start_time':
					this.picker.date = this.form.start_time ? new Date(`${this.form.start_date} ${this.form.start_time}`) : '';
					break;
				case 'end_time':
					this.picker.date = this.form.end_time ? new Date(`${this.form.start_date} ${this.form.end_time}`) : '';
					break;
				case 'holder':
				case 'join':
				case 'leader':
				case 'lead_dep':
					// case 'join_dep':
					// this.picker.url = `../../index.html?type=app_add_person&token=${this.token}`;
					this.picker.url = `../add_person/index.html?token=${this.token}`;
					this.$nextTick(() => {
						let list = [];
						for (let val of this.form[type]) {
							let t = {
								id: val.id,
								name: val.name,
								// 到这一步都是经过去重或者部门和人员分开显示的
								// 所以回显要带上type标识
								type: val.type,
							};
							list.push(t);
						}
						document.querySelector('#pop_window').contentWindow.postMessage(list);
					});
					break;
				case 'alert':
					this.picker.title = '提醒时间';
					this.picker.options = this.reminds;
					this.alert_select = params1; //记录当前操作的提醒数组项
					break;
				case 'cus_alert':
					this.alert_select = params1; //记录当前操作的提醒数组项
					this.picker.date = params1.alert_time ? new Date(params1.alert_time) : '';
					break;
			}
		},
		// 选择器确认
		picker_confirm(value) {
			this.picker.show = false;
			switch (this.picker.type) {
				case 'room':
					this.form.room = value;
					break;
				case 'start_date':
					this.form[this.picker.type] = `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}`;
					break;
				case 'start_time':
				case 'end_time':
					this.form[this.picker.type] = value;
					break;
				case 'alert':
					// 传入的是options对象
					this.alert_select.value = value.value;
					this.init_time(this.alert_select);
					break;
				case 'cus_alert':
					this.custom_time(this.alert_select, value);
					break;
			}
		},
		// 根据提醒时间选项生成字符串时间 用于提交
		init_time(obj) {
			let start = new Date(`${this.form.start_date} ${this.form.start_time}`);
			let t;
			switch (obj.value) {
				case 0:
					t = start;
					break;
				case 1:
					t = new Date(start.getTime() - 15 * 60 * 1000);
					break;
				case 2:
					t = new Date(start.getTime() - 30 * 60 * 1000);
					break;
				case 3:
					t = new Date(start.getTime() - 60 * 60 * 1000);
					break;
				case 4:
					t = new Date(start.getTime() - 2 * 60 * 60 * 1000);
					break;
				case 5:
					t = new Date(start.getTime() - 24 * 60 * 60 * 1000);
					break;
				case 6:
					t = new Date(start.getTime() - 2 * 24 * 60 * 60 * 1000);
					break;
				default:
					return;
			}
			obj.alert_time = `${t.getFullYear()}-${t.getMonth() + 1 < 10 ? '0' + (t.getMonth() + 1) : t.getMonth() + 1}-${t.getDate() < 10 ? '0' + t.getDate() : t.getDate()} ${t.toString().split(' ')[4]}`;
		},
		// 自定义提醒时间
		custom_time(obj, date) {
			obj.alert_time = `${date.getFullYear()}-${date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1}-${date.getDate() < 10 ? '0' + date.getDate() : date.getDate()} ${
				date.toString().split(' ')[4]
			}`;
		},
		// 查询会议室
		async get_room() {
			let { data } = await this.request('post', room_url, this.token);
			if (data.head.code !== 200) {
				return;
			}
			this.rooms = [];
			for (let val of data.data) {
				let t = {
					text: val.roomName,
					value: val.id,
				};
				this.rooms.push(t);
			}
			// 如果收到会议室id则回显
			if (this.id) {
				for (let val of this.rooms) {
					if (this.id === val.value) {
						this.form.room = val;
						break;
					}
				}
			}
		},
		// 查询会议室类型
		async get_meeting_type() {
			let { data } = await this.request('post', meeting_type_url, this.token, {
				condition: {
					status: true,
				},
				pageNum: 1,
				pageSize: 900,
			});
			if (data.head.code !== 200) {
				return;
			}
			this.meeting_type = data.data.data;
			for (let val of this.meeting_type) {
				if (val.isDefault) {
					this.form.type = val.id;
					break;
				}
			}
		},
		// 弹窗样式
		pop_style() {
			let t = {
				overflow: 'hidden',
			};
			switch (this.picker.type) {
				case 'holder':
				case 'join':
				case 'leader':
				case 'lead_dep':
					// case 'join_dep':
					t.height = '90%';
					break;
			}
			return t;
		},
		// 删除人员
		del_person(index, type) {
			this.form[type].splice(index, 1);
		},
		// 触发上传
		upload_click() {
			upload.click();
		},
		// 上传文件后读取人员列表
		upload_guest(e) {
			let file = e.target.files[0];
			// 取完文件后就清除
			upload.value = null;
			let reader = new FileReader();
			reader.readAsBinaryString(file);
			reader.onload = (e2) => {
				try {
					let binary = e2.target.result;
					this.form.guest = []; //在当前表单下有可能重复上传文件 每次要清空之前的列表
					let excel = XLSX.read(binary, { type: 'binary' });
					for (let sheet in excel.Sheets) {
						if (Object.prototype.hasOwnProperty.call(excel.Sheets, sheet)) {
							let single_sheet = XLSX.utils.sheet_to_json(excel.Sheets[sheet]);
							// 生成的是对象数组
							for (let val of single_sheet) {
								let t = Object.entries(val);
								let visitor = {
									guestName: t[0][1], //传的数据是这个字段名 不要改
									guestPhone: t[1][1],
								};
								this.form.guest.push(visitor);
							}
						}
					}
				} catch (err) {
					alert('只能上传Excel文件');
				}
			};
		},
		// 提醒时间显示文字
		reming_text(obj) {
			switch (obj.value) {
				case 0:
					return '开始时';
				case 1:
					return '开始前15分钟';
				case 2:
					return '开始前30分钟';
				case 3:
					return '开始前1小时';
				case 4:
					return '开始前2小时';
				case 5:
					return '开始前1天';
				case 6:
					return '开始前2天';
				case 7:
					return obj.alert_time;
			}
		},
		// 改变是否提醒 清空数组
		change_info() {
			if (this.form.notify == 0) {
				this.form.reminds = [];
			}
		},
		// 添加提醒时间、方式
		add_alert_time() {
			let list = this.form.reminds;
			if (list.length === 3) {
				return;
			}
			let t;
			switch (list.length) {
				case 0:
					t = {
						value: 0,
						type: 0,
						alert_time: '',
					};
					break;
				default:
					t = {
						//自动添加的提醒每次会自动选后一个选项 已经是倒数第二个选项了就只会添加倒数第二个选项
						value: list[list.length - 1].value < 6 ? list[list.length - 1].value + 1 : 6,
						type: 0,
						alert_time: '',
					};
					break;
			}
			this.init_time(t);
			list.push(t);
		},
		// 获取模板列表
		async get_template_list() {
			// industryType 1表示会议模板
			let body = { pageNum: 1, pageSize: 900, condition: { industryType: 1, sysTemp: true } };
			let sys = await this.request('post', template_list_url, this.token, body);
			body.condition.sysTemp = false;
			let cus = await this.request('post', template_list_url, this.token, body);
			if (sys.data.head.code !== 200 || !sys.data.data?.data) {
				sys = [];
			} else {
				sys = sys.data.data.data;
				for (let val of sys) {
					val.title = '系统-' + val.title;
				}
			}
			if (cus.data.head.code !== 200 || !cus.data.data?.data) {
				cus = [];
			} else {
				cus = cus.data.data.data;
				for (let val of cus) {
					val.title = '自定义-' + val.title;
				}
			}
			this.template_list = sys.concat(cus);
		},
		// 返回上一页
		turn_back() {
			window.location.href = `../meeting_platform/index.html?token=${this.token}`;
		},
		// 部门人员去重
		async de_weight(list) {
			this.loading = true;
			let dep = [];
			let user = [];
			for (let val of list) {
				if (val.type === 'person') {
					let t = {
						id: val.id,
						username: val.name,
					};
					user.push(t);
				} else {
					let t = {
						deptId: val.id,
						deptName: val.name,
					};
					dep.push(t);
				}
			}
			let { data } = await this.request('post', remove_dup_url, this.token, { sysDeptVOList: dep, sysUserVOList: user });
			this.loading = false;
			if (data.head.code !== 200) {
				return false;
			}
			return data.data;
		},
		// iframe显示条件
		iframe_show() {
			switch (this.picker.type) {
				case 'holder':
				case 'join':
				case 'leader':
				case 'lead_dep':
					// case 'join_dep':
					return true;
				default:
					return false;
			}
		},
	},
});
