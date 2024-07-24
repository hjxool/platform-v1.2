let url = `${我是接口地址}/`;
// let room_list = `${url}api-portal/room/search/time`;
let room_list = `${url}api-portal/room/search/date`;
let meeting_reserve = `${url}api-portal/meeting`;
// let user_list = `${url}api-portal/users`;
let upload_files = `${url}api-portal/meeting/upload/files`;
let cur_user_url = `${url}api-auth/oauth/userinfo`;
// let stru_list_url = `${url}api-portal/department/getsubDeptAndCurrentDeptUser`;
let remove_dup_url = `${url}api-user/department/deptUsers/distinct`; //用户去重
let limits_url = `${url}api-user/menus/current`; //获取菜单权限
let get_scene_url = `${url}api-portal/scene-rule/available`; //查询场所可用场景
let meeting_type_url = `${url}api-portal/meeting-type/search`; // 查询会议类型列表
let get_template_list_url = `${url}api-portal/displayBoard/template/list`; //获取模板列表
let get_goods_list_url = `${url}api-portal/things/search`; // 查询物品列表
let place_detail_url = `${url}api-portal/room/search`; // 查询会议室详情
let user_name_url = `${url}api-user/users/nickName`; // 查询所有用户名
let paperless_url = `${无纸化第三方地址}/#/ExternalEditMeeting`; // 无纸化配置页面
let paperless_data_url = `${url}api-portal/paperless/cache`; // 无纸化会议缓存数据
let paperless_meetingId_url = `${url}api-portal/meeting/createMeetingIds`; // 生成会议id

Vue.config.productionTip = false;
new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		token: '',
		html: {
			block_list: [], //会议室方块状态
			block_list2: [], //选中渲染列表
			year: '', //页面显示时间
			month: '',
			day: '',
			week: '',
			date: '',
			search_meeting: '', //搜索会议名
			new_meeting: false, //新增会议弹窗
			form_loading: false, // 提交表单时加载遮罩
			throttle_flag: false, //节流方法标识
			loading: true, //页面初始加载
			reserve_type: [], //预约方式选项
			week_options: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'], // 自定义星期选择
			bool_options: ['否', '是'],
			meeting_info_show: false, //会议信息显示
			meeting_infos: ['会议主题', '开始时间', '结束时间', '类型'],
			info_type: ['站内消息', '微信公众号', '微信小程序', '钉钉', '短信', '邮件', 'APP'], // 通知方式
			boundary_display: false, //只有当天需要计算边界线
			add_person_display: false, //添加人员弹窗
			add_person_loading: false, //添加人员表单加载
			time_num: 68, //一行时间间隔方块
			add_person_url: '', //添加人员页面
			paperless_url: '', // 无纸化页面
			door_password_options: ['人脸', '随机码', '人脸+随机码'],
		},
		place_list: [], // 会议室及会议列表
		// 新建会议表单
		new_meeting_form: {
			name: '', //会议名
			date: '', //日期
			time_start: '', //起始时间
			time_end: '', //结束时间
			method: 0, // 预约方式
			cus_week: [], //自定义周几 可多选
			reply: 0, //是否需要回复 0否 1是
			sendMessage: 1, //是否通知
			signIn: 1, //是否签到
			summary: 1, //会议纪要
			search_person: [], // 搜索用户名
			cycle_deadline: '', // 周期预约的截止日期
			// files: [], // 存多次上传文件回来的结果
			meetingReminds: [], // 提醒时间 数组
			guestList: [], //来宾列表
			guest_show: false, //来宾列表显示
			description: '', //会议备注
			is_rebook: false, //当从其他页面跳转而来时 需要禁用预约方式
			reminds: ['开始时', '开始前15分钟', '开始前30分钟', '开始前1小时', '开始前2小时', '开始前1天', '开始前2天', '自定义'],
			emcee: [], // 主持人
			step: 0, // 步骤条 0未开始 1~3对应步骤完成
			step_list: [
				{ title: '基本配置', value: 0, show: true },
				{ title: '无纸化配置', value: 1, show: true },
				{ title: '通知配置', value: 2, show: true },
				{ title: '模板配置', value: 3, show: true },
			],
			type: '1', // 会议类型
			type_list: [], // 类型列表
			template: '', // 选择的模板
			//模板列表 整合了系统模板和自定义模板
			template_list: [
				{ label: '系统模板', options: [] },
				{ label: '自定义模板', options: [] },
			],
			door_password: 2, //开门码 0人脸 1随机码 2默认人脸+随机码
			platform: [], //第三方平台
			goods: [], // 物品清单
			operator: [], // 操作员
		},
		// 当前用户信息
		user: {
			name: '',
			id: '',
		},
		// 会议信息
		meeting_info: {
			name: '',
			start_time: '',
			end_time: '',
			type: '',
		},
		col_index_start: null,
		col_index_end: null,
		block_width: 0, //时间方块宽度
		start_move: false, //按下鼠标 焦点方块消失
		// conferee_list: [], //参会人员列表
		file: {
			url: upload_files, //上传地址
			list: [], //文件列表
		},
		// 新建预约会议验证规则
		new_rule: {
			name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
			date: [{ type: 'date', required: true, message: '请选择日期', trigger: 'change' }],
			time_start: [{ required: true, message: '必须选择时间', trigger: 'change' }],
			time_end: [{ required: true, message: '必须选择时间', trigger: 'change' }],
			cus_week: [{ required: true, message: '必须选择星期', trigger: 'change' }],
			search_person: [{ required: true, message: '必须选择与会人员', trigger: 'change' }],
		},
		mouse: {
			row_index: null, //鼠标所在行
			col_index: null, //鼠标所在列
			enter: false, //鼠标移入列表才显示定位
			focus: false,
			top: '', //指示条离顶部距离
			height: '', //指示条高度
			focus_top: '0px', //焦点距离父容器高度
		},
		// 添加参会人表单
		add_person_form: {
			title: '', // 标题
			add_type: '', // 添加主持人或是普通参会人
		},
		config: {
			reserve_show: false,
		},
		goods: {
			show: false, //物品弹窗显示
			page: 1, // 当前页
			pageSize: 20, // 单页数量
			total: 0, // 总数
			search: '', // 物品搜索
			list: [], // 总列表
			select: [], // 已选物品
			max_h: 1000, // 表格最大高度
		},
		place: {
			show: false, // 会议室详情弹窗
			list: [
				{ title: '会议室名称', content: '' },
				{ title: '会议室地址', content: '' },
				{ title: '会议室设备', content: '' },
				{ title: '功能定位', content: '' },
				{ title: '会议室容量', content: '' },
				{ title: '会议室类型', content: '' },
				{ title: '管理员', content: '' },
				{ title: '是否需审批', content: '' },
				{ title: '审批流程', content: '' },
			],
		},
	},
	async mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
		} else {
			this.get_token();
		}
		this.get_meeting_type();
		this.get_template_list();
		this.html.add_person_url = `../index.html?type=search_user&token=${this.token}&theme=light`;
		if (!sessionStorage.hushanwebmenuTree) {
			await this.request('get', limits_url, this.token, (res) => {
				if (res.data.head.code !== 200) {
					return;
				}
				sessionStorage.hushanwebmenuTree = JSON.stringify(res.data.data.menuTree);
			});
		}
		// 解析权限树
		let limits;
		for (let val of JSON.parse(sessionStorage.hushanwebmenuTree)) {
			if (val.path === '云会管平台') {
				for (let val2 of val.subMenus) {
					if (val2.path === '云会管平台_会议管理') {
						for (let val3 of val2.subMenus) {
							if (val3.path === '云会管平台_会议管理_会议预约') {
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
		try {
			this.config.reserve_show = this.is_element_show(limits, '新建会议');
		} catch (error) {
			this.$message.error(error);
		}

		if (localStorage.hushanwebuserinfo) {
			let obj = JSON.parse(localStorage.hushanwebuserinfo);
			this.user = {
				id: obj.id,
				name: obj.nickname,
			};
			if (sessionStorage.meeting_data) {
				this.rebook_meeting(JSON.parse(sessionStorage.meeting_data));
				sessionStorage.removeItem('meeting_data');
			}
		} else {
			this.get_user_info();
		}
		let time = new Date().toString().split(' ')[4];
		let time_list = time.split(':');
		let hour = +time_list[0];
		let minute = +time_list[1];
		// 首先找到当前时间所在方格
		this.boundary = (hour - 6) * 4;
		// 计算当前时间线所在的方格索引 小于这个索引的全部变灰
		switch (true) {
			case minute >= 15 && minute < 30:
				this.boundary = this.boundary + 1;
				break;
			case minute >= 30 && minute < 45:
				this.boundary = this.boundary + 2;
				break;
			case minute >= 45:
				this.boundary = this.boundary + 3;
				break;
		}
		// 小于当天的格子全部灰掉
		// 改变时间后 只有当天才能显示和计算边界值 格式化当天条件为 00点
		let t = new Date();
		this.current_day = new Date(`${t.getFullYear()}/${t.getMonth() + 1}/${t.getDate()}`).getTime();
		this.html.date = new Date(this.current_day);
		// 获取当前时间
		this.display_time(this.html.date);
		window.onresize = () => {
			this.get_boundary();
		};
		setInterval(() => {
			this.get_boundary();
		}, 60000);
		// 横向滚动条相关参数
		this.meeting_boxs = document.querySelector('.meeting_boxs');
		this.scroll = false;
		window.onmessage = async (data) => {
			console.log('页面消息', data);
			if (Array.isArray(data?.data)) {
				if (this.add_person_form.add_type === 'holder') {
					let list = await this.de_weight(data.data);
					this.new_meeting_form.emcee = [];
					for (let val of list) {
						let t = {
							name: val.username,
							id: val.id,
							type: 'person',
						};
						this.new_meeting_form.emcee.push(t);
					}
				} else if (this.add_person_form.add_type === 'join') {
					let list = await this.de_weight(data.data);
					this.new_meeting_form.search_person = [];
					for (let val of list) {
						let t = {
							name: val.username,
							id: val.id,
							type: 'person',
						};
						this.new_meeting_form.search_person.push(t);
					}
				} else if (this.add_person_form.add_type === 'operator') {
					let list = await this.de_weight(data.data);
					this.new_meeting_form.operator = [];
					for (let val of list) {
						let t = {
							name: val.username,
							id: val.id,
							type: 'person',
						};
						this.new_meeting_form.operator.push(t);
					}
				}
			} else {
				if (data.data.type === 'Close popup') {
					this.html.add_person_display = false;
				} else if (data.data.msg === 'Meeting Data Saved') {
					this.paperless_data = true;
				}
			}
		};
		// 步骤条备份
		this.step_list_backup = JSON.parse(JSON.stringify(this.new_meeting_form.step_list));
	},
	methods: {
		// 获取模板列表
		async get_template_list() {
			// industryType 1表示会议模板
			let body = { pageNum: 1, pageSize: 900, condition: { industryType: 1, sysTemp: true } };
			let sys = await this.request('post', get_template_list_url, this.token, body);
			body.condition.sysTemp = false;
			let cus = await this.request('post', get_template_list_url, this.token, body);
			if (sys.data.head.code !== 200 || !sys.data.data?.data) {
				sys = [];
			} else {
				sys = sys.data.data.data;
			}
			if (cus.data.head.code !== 200 || !cus.data.data?.data) {
				cus = [];
			} else {
				cus = cus.data.data.data;
			}
			let a1 = this.new_meeting_form.template_list[0];
			for (let val of sys) {
				a1.options.push(val);
			}
			let a2 = this.new_meeting_form.template_list[1];
			for (let val of cus) {
				a2.options.push(val);
			}
		},
		// 获取会议类型列表
		get_meeting_type() {
			return this.request('post', meeting_type_url, this.token, { condition: { status: true }, pageNum: 1, pageSize: 900 }, (res) => {
				if (res.data.head.code !== 200) {
					return;
				}
				let find = false;
				for (let val of res.data.data.data) {
					if (val.isDefault) {
						this.default_meeting_type = val.id;
						find = true;
					}
					val.disabled = false;
					this.new_meeting_form.type_list.push(val);
				}
				if (!find) {
					this.default_meeting_type = this.new_meeting_form.type_list[1].id;
				}
			});
		},
		// 步骤显示文字
		step_text(step) {
			switch (true) {
				case this.new_meeting_form.step < step.value:
					return step.title;
				case this.new_meeting_form.step === step.value:
					return '进行中';
				case this.new_meeting_form.step > step.value:
					return '已完成';
			}
		},
		// 返回上一步
		pre_step(form) {
			if (form.type != '5' && form.step === 2) {
				// 只有无纸化配置隐藏 且 当前步骤处于2时 才自减2
				form.step -= 2;
			} else {
				// 如果当前正在配置无纸化 返回上一步后要重新配置 即要清空 不能直接点下一步
				if (form.type == '5' && form.step === 1) {
					this.paperless_data = null;
				}
				form.step--;
			}
		},
		// 区分点击下一步还是完成 完成时提交
		step_pass(form) {
			if (form.step === 3) {
				// 最后一步提交
				this.new_submit(form);
			} else {
				if (form.step === 1) {
					// 如果无纸化数据为空则不能进行下一步
					if (!this.paperless_data) {
						this.$message.error('无纸化配置未完成');
						return;
					}
					form.step++;
				} else {
					// 没进行一步验证 通过才能进入下一步
					this.$refs.new_meeting.validate(async (result) => {
						let result2 = true;
						// 此处根据实际
						switch (form.step) {
							case 0:
								if (!form.emcee.length) {
									this.$message.error('主持人不能为空！');
									return;
								}
								if (form.emcee.length > 1) {
									this.$message.error('主持人只能有一个');
									return;
								}
								if (!form.search_person.length) {
									this.$message.error('参会人人不能为空！');
									return;
								}
								// 无纸化才有的配置验证
								if (form.type == '5') {
									if (form.operator.length !== 1) {
										this.$message.error('操作员有且只能有一个');
										return;
									}
									let holder = form.emcee[0].id;
									for (let val of form.search_person) {
										if (val.id === holder) {
											this.$message.error('参会人里不能有主持人');
											return;
										}
									}
									for (let val of form.operator) {
										if (val.id === holder) {
											this.$message.error('操作员不能是主持人');
											return;
										}
									}
								}
								// 进入无纸化步骤前要先存 会议名 预约时间 主持人 参会人员 操作员 会议室id
								if (form.type == '5') {
									// 开始结束时间
									let m = form.date.getMonth() + 1 < 10 ? '0' + (form.date.getMonth() + 1) : form.date.getMonth() + 1;
									let d = form.date.getDate() < 10 ? '0' + form.date.getDate() : form.date.getDate();
									et = `${form.date.getFullYear()}-${m}-${d} ${form.time_end}:00`;
									st = `${form.date.getFullYear()}-${m}-${d} ${form.time_start}:00`;
									// 获取会议id
									let {
										data: { data: meeting_ids },
									} = await this.request('post', paperless_meetingId_url, this.token, {
										roomId: this.roomId || this.place_list[this.row_index].id,
										theme: form.name,
										userIds: form.search_person.map((e) => e.id),
										moderatorId: form.emcee[0].id,
										meetingType: form.type,
										startTime: st,
										endTime: et,
										appointmentMode: 0,
									});
									if (!meeting_ids) {
										return;
									}
									this.paperless_meetingId = meeting_ids;
									let {
										data: { data: code },
									} = await this.request('post', paperless_data_url, this.token, {
										theme: form.name,
										holder: form.emcee.map(({ name, id }) => ({ name, id })),
										operator: form.operator.map(({ name, id }) => ({ name, id })),
										join: form.search_person.map(({ name, id }) => ({ name, id })),
										start_time: st,
										end_time: et,
										room_id: this.place_list[this.row_index].id,
										meetingId: meeting_ids[0],
									});
									// 无纸化配置页面 传入token
									this.html.paperless_url = `${paperless_url}?token=${this.token}&code=${code}`;
								}
								break;
							case 2:
								if (form.sendMessage == 1) {
									if (form.meetingReminds.length == 0) {
										result2 = false;
										this.$message.error('请添加提醒时间');
									} else {
										for (let i = 0; i < form.meetingReminds.length; i++) {
											if (!form.meetingReminds[i].alert_time) {
												this.$message.error('提醒时间不能为空');
												result2 = false;
												break;
											} else {
												for (let k = i + 1; k < form.meetingReminds.length; k++) {
													if (form.meetingReminds[i].alert_time == form.meetingReminds[k].alert_time) {
														this.$message.error('提醒时间不能重复');
														result2 = false;
														break;
													}
												}
												if (!result2) {
													break;
												}
											}
										}
									}
								}
								break;
						}
						if (!result || !result2) {
							return;
						}
						if (form.type != '5' && form.step === 0) {
							// 只有无纸化配置隐藏 且 当前步骤处于0时 才自增2
							form.step += 2;
						} else {
							form.step++;
						}
					});
				}
			}
		},
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
		// 获取当前操作用户信息
		get_user_info() {
			this.request('get', cur_user_url, this.token, (res) => {
				if (res.data.head.code != 200) {
					return;
				}
				let data = res.data.data;
				this.user.name = data.nickname;
				this.user.id = data.id;
				if (sessionStorage.meeting_data) {
					this.rebook_meeting(JSON.parse(sessionStorage.meeting_data));
					sessionStorage.removeItem('meeting_data');
				}
			});
		},
		// 查询会议室及会议详情列表
		req_room_list(meeting_name) {
			let t2 = this.html.month < 10 ? '0' + this.html.month : this.html.month;
			let t3 = this.html.day < 10 ? '0' + this.html.day : this.html.day;
			let t4 = `${this.html.year}-${t2}-${t3}`;
			this.request('post', room_list, this.token, { roomName: meeting_name || '', startTime: `${t4} 06:00:00`, endTime: `${t4} 23:00:00` }, (res) => {
				console.log('会议室及会议', res);
				this.html.loading = false;
				if (res.data.head.code != 200) {
					this.$message('当前用户下无会议室');
					return;
				}
				this.place_list = res.data.data;
				this.block_status();
			});
		},
		select_day() {
			let dom = document.querySelector('#calendar');
			dom.focus();
		},
		// 查询每一个会议室下会议占用情况
		query_block_status(array, time_index) {
			// time_index从0开始
			// let array = Object.entries(place_obj.meetingList)[0][1];
			// 可能会有几种情况 变灰和灰色上同时有会议
			let result = 0;
			if (this.display_day < this.current_day) {
				result = 1;
			}
			if (this.html.boundary_display && time_index < this.boundary) {
				result = 1;
			}
			// 对单个场所下每个时间点 查找是否在任意一个会议时间段内
			for (let i = 0; i < array.length; i++) {
				let start = array[i].startTime.split(' ')[1].split(':');
				let start_hour = +start[0];
				let start_minute = +start[1];
				let start_index = (start_hour - 6) * 4;
				// 时间分隔为15 30 45 00
				switch (true) {
					case start_minute >= 15 && start_minute < 30:
						start_index = start_index + 1;
						break;
					case start_minute >= 30 && start_minute < 45:
						start_index = start_index + 2;
						break;
					case start_minute >= 45:
						start_index = start_index + 3;
						break;
				}
				let end = array[i].endTime.split(' ')[1].split(':');
				let end_hour = +end[0];
				let end_minute = +end[1];
				// 结束时间是分隔线之前 开始时间从分隔线之后
				let end_index = (end_hour - 6) * 4 - 1;
				switch (true) {
					case end_minute >= 15 && end_minute < 30:
						end_index = end_index + 1;
						break;
					case end_minute >= 30 && end_minute < 45:
						end_index = end_index + 2;
						break;
					case end_minute >= 45:
						end_index = end_index + 3;
						break;
				}
				if (time_index >= start_index && time_index <= end_index) {
					// timeType 0表示已过期 1表示已预定 2表示空闲
					// if (array[i].timeType == 0) {
					// 	return 1;
					// } else if (array[i].timeType == 1) {
					// 	return 2;
					// }
					result = 2;
					break;
				}
			}
			// 0表示空闲 1表示已过期 2表示已预定
			return result;
		},
		// 组装二维矩阵 控制方块显示
		block_status() {
			this.html.block_list = [];
			this.html.block_list2 = [];
			// 当前选择时间
			this.display_day = this.html.date.getTime();
			for (let i = 0; i < this.place_list.length; i++) {
				let t = [];
				let t2;
				let t3 = [];
				if (this.place_list[i].meetingList != null) {
					t2 = Object.entries(this.place_list[i].meetingList)[0][1];
				} else {
					t2 = [];
				}
				for (let j = 0; j < this.html.time_num; j++) {
					t[j] = this.query_block_status(t2, j);
					t3[j] = 0;
				}
				this.html.block_list.push(t);
				this.html.block_list2.push(t3);
			}
			this.$nextTick(() => {
				// this.add_exist_meeting_style();
				// vue在页面所需数组未请求回来时 不会渲染 因此找不到数组节点
				this.first_block_position = document.querySelector('.time_box').getBoundingClientRect().left;
				this.get_boundary();
			});
		},
		get_boundary() {
			if (this.html.boundary_display) {
				let time = new Date().toString().split(' ')[4];
				let time_list = time.split(':');
				let hour = +time_list[0];
				let minute = +time_list[1];
				// 首先找到当前时间所在方格
				let boundary = (hour - 6) * 4;
				// 计算分钟在一小时间隔中位置
				let per = minute / 60;
				// 只获取一次time_box数组 给鼠标焦点用
				this.time_box_array = document.querySelectorAll('.time_box');
				let block_position = this.time_box_array[boundary].offsetLeft;
				this.block_width = document.querySelector('.time_box').clientWidth;
				let offset = per * (this.block_width * 4) + block_position;
				let dom = document.querySelector('.current_time');
				dom.style.left = `${offset}px`;
				let dom2 = document.querySelector('.meeting_boxs');
				dom.style.height = `${100 * this.place_list.length}px`; // 100是一行高度
				// this.mouse.top = dom.style.top = dom2.getBoundingClientRect().top + 'px';
				this.mouse.top = dom2.getBoundingClientRect().top + 'px';
				// this.mouse.height = dom.style.height = dom2.clientHeight + 'px';
				this.mouse.height = dom2.clientHeight + 'px';
				// 修改this.boundary 这是控制格子过期的关键
				switch (true) {
					case minute >= 15 && minute < 30:
						boundary = boundary + 1;
						break;
					case minute >= 30 && minute < 45:
						boundary = boundary + 2;
						break;
					case minute >= 45:
						boundary = boundary + 3;
						break;
				}
				this.boundary = boundary;
				for (let i = 0; i < this.html.block_list.length; i++) {
					let list = this.html.block_list[i];
					for (let k = 0; k < list.length; k++) {
						if (k < this.boundary && list[k] === 0) {
							// 当天 格子索引小于时间线 格子是0(白色) 改为灰色
							list.splice(k, 1, 1);
						}
					}
				}
			}
		},
		// 获取选中时间
		display_time(date_obj) {
			this.html.year = date_obj.getFullYear();
			this.html.month = date_obj.getMonth() + 1;
			this.html.day = date_obj.getDate();
			switch (date_obj.getDay()) {
				case 0:
					this.html.week = '星期天';
					break;
				case 1:
					this.html.week = '星期一';
					break;
				case 2:
					this.html.week = '星期二';
					break;
				case 3:
					this.html.week = '星期三';
					break;
				case 4:
					this.html.week = '星期四';
					break;
				case 5:
					this.html.week = '星期五';
					break;
				case 6:
					this.html.week = '星期六';
					break;
			}
			if (date_obj.getTime() == this.current_day) {
				this.html.boundary_display = true;
			} else {
				this.html.boundary_display = false;
			}
			this.req_room_list();
		},
		// 鼠标点下时 只有在当前时间后的才能框选
		area_start(row_index, col_index) {
			if (!this.config.reserve_show) {
				// 如果权限不允许预约会议就返回
				return;
			}
			if (this.html.block_list[row_index][col_index] == 0) {
				this.start_move = true;
				this.row_index = row_index;
				this.col_index_start = col_index;
				this.col_index_end = col_index;
				// 将色块状态改为3 表示选中 在取消创建会议时恢复状态为0
				this.html.block_list2[row_index].splice(col_index, 1, 3);
			}
		},
		// 鼠标滑动时 将开始的end样式去除 给末尾的添加end样式
		area_enter(row_index, col_index, event) {
			this.mouse.enter = true; //触发enter事件后mouse.row_index才有的值
			// 鼠标悬浮的行列高亮显示
			this.mouse.row_index = row_index; //记录下鼠标刚进入方块的旧值
			// this.mouse.row_index_old = this.mouse.row_index = row_index; //记录下鼠标刚进入方块的旧值
			this.mouse.col_index = col_index;
			// 如果是已按下鼠标的状态 则渲染块
			if (this.start_move) {
				if (col_index >= this.col_index_start) {
					// 再把鼠标所在的方块置为end
					this.col_index_end = col_index;
					this.html.block_list2 = [];
					for (let i = 0; i < this.place_list.length; i++) {
						let t = [];
						for (let k = 0; k < this.html.time_num; k++) {
							t[k] = 0;
						}
						this.html.block_list2.push(t);
					}
					let l = this.col_index_end - this.col_index_start;
					for (let i = 0; i <= l; i++) {
						this.html.block_list2[this.row_index].splice(this.col_index_start + i, 1, 3);
					}
				}
			} else {
				// 否则视作鼠标普通悬浮状态 查询块信息
				this.query_meeting_info(event, row_index, col_index);
			}
		},
		// 鼠标悬浮时显示其下会议信息
		query_meeting_info(event, row_index, col_index) {
			if (!this.start_move) {
				this.html.meeting_info_show = false;
				// 先判断鼠标悬停处有没有会议 没有隐藏信息框 有则显示 过期的也不显示
				let t2 = this.html.block_list[row_index][col_index];
				if (t2 != 0 && t2 != 1) {
					let t = Object.entries(this.place_list[row_index].meetingList)[0][1];
					for (let i = 0; i < t.length; i++) {
						let start = t[i].startTime.split(' ')[1].split(':');
						let start_hour = +start[0];
						let start_minute = +start[1];
						let start_index = (start_hour - 6) * 4;
						switch (start_minute) {
							case 15:
								start_index = start_index + 1;
								break;
							case 30:
								start_index = start_index + 2;
								break;
							case 45:
								start_index = start_index + 3;
								break;
						}
						let end = t[i].endTime.split(' ')[1].split(':');
						let end_hour = +end[0];
						let end_minute = +end[1];
						let end_index = (end_hour - 6) * 4 - 1;
						switch (end_minute) {
							case 15:
								end_index = end_index + 1;
								break;
							case 30:
								end_index = end_index + 2;
								break;
							case 45:
								end_index = end_index + 3;
								break;
						}
						if (col_index >= start_index && col_index <= end_index) {
							let info = t[i];
							this.meeting_info.name = info.theme;
							let sd = info.startTime.split(' ')[0];
							this.meeting_info.start_time = `${sd} ${start[0]}:${start[1]}`;
							let ed = info.endTime.split(' ')[0];
							this.meeting_info.end_time = `${ed} ${end[0]}:${end[1]}`;
							switch (info.type) {
								case 0:
									this.meeting_info.type = '视频会议';
									break;
								case 1:
									this.meeting_info.type = '综合会议';
									break;
								case 2:
									this.meeting_info.type = '无纸化会议';
									break;
							}
							this.html.meeting_info_show = true;
							// 根据鼠标位置计算弹窗出现位置 当展示距离不够时 再相反位置出现
							let dom = document.querySelector('.meeting_info_box');
							let box_width = dom.offsetWidth;
							let box_height = dom.offsetHeight;
							if (event.clientX >= box_width) {
								dom.style.left = event.clientX - box_width + 'px';
							} else {
								dom.style.left = event.clientX + 'px';
							}
							let page = document.querySelector('#index');
							if (page.clientHeight - event.clientY >= box_height) {
								dom.style.top = event.clientY + 'px';
							} else {
								dom.style.top = event.clientY - box_height + 'px';
							}
							break;
						}
					}
				}
			}
		},
		// 鼠标滑动结束时 滑动事件条件置为false 并出现弹窗
		area_end() {
			if (this.start_move) {
				this.html.new_meeting = true;
				this.new_meeting_form.date = this.html.date;
				// 计算当前时间
				let t = Math.floor(this.col_index_start / 4) + 6;
				this.new_meeting_form.time_start = `${t}:00`;
				switch (this.col_index_start % 4) {
					case 1:
						this.new_meeting_form.time_start = `${t}:15`;
						break;
					case 2:
						this.new_meeting_form.time_start = `${t}:30`;
						break;
					case 3:
						this.new_meeting_form.time_start = `${t}:45`;
						break;
				}
				let t2 = Math.floor((this.col_index_end + 1) / 4) + 6;
				this.new_meeting_form.time_end = `${t2}:00`;
				switch ((this.col_index_end + 1) % 4) {
					case 1:
						this.new_meeting_form.time_end = `${t2}:15`;
						break;
					case 2:
						this.new_meeting_form.time_end = `${t2}:30`;
						break;
					case 3:
						this.new_meeting_form.time_end = `${t2}:45`;
						break;
				}
				this.change_reserve_type();
				this.new_meeting_form.name = '';
				this.new_meeting_form.method = 0;
				this.new_meeting_form.cus_week = [];
				this.new_meeting_form.reply = 0;
				this.new_meeting_form.sendMessage = 1;
				// 第一条默认提醒时间是会议开始时间
				let d = `${this.html.date.getFullYear()}-${this.html.date.getMonth() + 1 < 10 ? '0' + (this.html.date.getMonth() + 1) : this.html.date.getMonth() + 1}-${
					this.html.date.getDate() < 10 ? '0' + this.html.date.getDate() : this.html.date.getDate()
				} ${this.new_meeting_form.time_start}:00`;
				this.new_meeting_form.meetingReminds = [{ alert_time: d, index: 0, type: 0 }];
				this.new_meeting_form.signIn = 1;
				this.new_meeting_form.summary = 1;
				this.new_meeting_form.search_person = [];
				this.new_meeting_form.emcee = [this.user]; // 默认创建人是主持人
				this.new_meeting_form.cycle_deadline = '';
				this.new_meeting_form.files = [];
				this.html.form_loading = false;
				this.new_meeting_form.guestList = [];
				this.new_meeting_form.guest_show = false;
				this.new_meeting_form.is_rebook = false; //手动触发表单显示时不需要禁用预约方式
				this.roomId = null; // 将外部跳转过来的数据置为空 不然会填入上一次的会议室id
				this.new_meeting_form.step = 0;
				this.new_meeting_form.type = this.default_meeting_type;
				this.new_meeting_form.template = '';
				this.new_meeting_form.door_password = 2;
				this.new_meeting_form.platform = [];
				this.new_meeting_form.goods = [];
				// 无纸化会议参数初始化
				// 取得对应行会议室类型
				for (let val of this.new_meeting_form.type_list) {
					if (val.id == '5') {
						val.disabled = this.place_list[this.row_index].type === 2 ? false : true;
						break;
					}
				}
				this.new_meeting_form.operator = [];
				// 无纸化 显示全部步骤条
				if (this.default_meeting_type == '5') {
					this.new_meeting_form.step_list = this.step_list_backup;
					// 如果不是无纸化会议室 则判断是不是默认会议室是不是无纸化 是则临时将当前会议类型显示为其他
					for (let val of this.new_meeting_form.type_list) {
						if (!val.disabled) {
							this.new_meeting_form.type = val.id;
							break;
						}
					}
				} else {
					// 非无纸化 扣掉无纸化步骤
					this.new_meeting_form.step_list = this.step_list_backup.filter((e) => e.value !== 1);
				}
				// 无纸化页面保存数据 如果为空则不能进行下一步
				this.paperless_data = null;
			}
			this.start_move = false;
		},
		// 每次修改日期修改预定方式里的列表
		change_reserve_type() {
			if (!this.new_meeting_form.date) {
				// 清除日期时也会触发change事件
				return;
			}
			// 获取选择的时间、星期和几号 并填入
			let curr_week;
			switch (this.new_meeting_form.date?.getDay()) {
				case 0:
					curr_week = '天';
					break;
				case 1:
					curr_week = '一';
					break;
				case 2:
					curr_week = '二';
					break;
				case 3:
					curr_week = '三';
					break;
				case 4:
					curr_week = '四';
					break;
				case 5:
					curr_week = '五';
					break;
				case 6:
					curr_week = '六';
					break;
			}
			this.html.reserve_type = [
				'单次预约',
				`每天${this.new_meeting_form.time_start}~${this.new_meeting_form.time_end}`,
				`每周${curr_week}`,
				`每月${this.new_meeting_form.date.getDate()}号`,
				'每年(不可用)',
				`自定义`,
			];
		},
		// 提交新建会议表单 并刷新数据 关闭弹窗
		async new_submit(form) {
			// 开始结束时间
			let m = form.date.getMonth() + 1 < 10 ? '0' + (form.date.getMonth() + 1) : form.date.getMonth() + 1;
			let d = form.date.getDate() < 10 ? '0' + form.date.getDate() : form.date.getDate();
			et = `${form.date.getFullYear()}-${m}-${d} ${form.time_end}:00`;
			st = `${form.date.getFullYear()}-${m}-${d} ${form.time_start}:00`;
			// 提示是否有场景执行 而后提交请求
			this.html.form_loading = true;
			let text = await new Promise((success) => {
				this.request('get', `${get_scene_url}/${this.roomId || this.place_list[this.row_index].id}?placeStartDate=${st}&placeEndDate=${et}`, this.token, (res) => {
					this.html.form_loading = false;
					if (res.data.head.code !== 200) {
						success('error');
						return;
					}
					let t = '';
					for (let val of res.data.data) {
						t += `${val.sceneName}、`;
					}
					success(t);
				});
			});
			// 如果接口报错 不显示提示 且 不继续执行
			if (text === 'error') {
				return;
			}
			if (text) {
				// 文本有内容说明有场景 就提示，否则直接发起请求
				let result3 = await this.$confirm(
					`
                    <div class="col_layout">
                      <div>该会议将执行以下自动或条件场景——${text}</div>
                      <div style="font-size:14px;">如果对此会议有影响，请及时处理</div>
                    </div>
                  `,
					'提示',
					{
						confirmButtonText: '创建',
						cancelButtonText: '取消',
						dangerouslyUseHTMLString: true,
						center: true,
					}
				)
					.then(() => {
						return true;
					})
					.catch(() => {
						return false;
					});
				if (!result3) {
					// 点取消则不发请求
					return;
				}
			}
			let data = {
				appointmentMode: form.method,
				reply: form.reply,
				roomId: this.roomId || this.place_list[this.row_index].id,
				sendMessage: form.sendMessage,
				signIn: form.signIn,
				summary: form.summary,
				theme: form.name,
				userIds: [],
				meetingReminds: [],
				guestList: form.guestList,
				description: form.description,
				moderatorId: form.emcee[0].id,
				meetingType: form.type,
				doorMethod: form.door_password,
			};
			for (let val of form.search_person) {
				data.userIds.push(val.id);
			}
			if (form.method != 0) {
				// 周期截止
				let y = form.cycle_deadline.getFullYear();
				let m = form.cycle_deadline.getMonth() + 1 < 10 ? '0' + (form.cycle_deadline.getMonth() + 1) : form.cycle_deadline.getMonth() + 1;
				let d = form.cycle_deadline.getDate() < 10 ? '0' + form.cycle_deadline.getDate() : form.cycle_deadline.getDate();
				data.appointmentEndTime = `${y}-${m}-${d} 23:00:00`;
			}
			if (form.method == 5) {
				// 自定义周
				let t = form.cus_week.toString();
				data.appointmentPeriod = `${t}`;
			}
			// 开始结束时间
			data.endTime = et;
			data.startTime = st;
			// 提醒时间
			for (let i = 0; i < form.meetingReminds.length; i++) {
				let t2 = {
					type: form.meetingReminds[i].type,
					remindTime: form.meetingReminds[i].alert_time,
				};
				data.meetingReminds.push(t2);
			}
			// 会议模板
			if (form.template) {
				data.templateId = form.template;
			}
			// 第三方会议
			if (form.platform.length) {
				data.meetingThirdProvider = form.platform;
			}
			// 会议物品
			if (form.goods.length) {
				data.meetingThings = [];
				for (let val of form.goods) {
					let t = {
						quantity: Number(val.num),
						thingsId: val.id,
					};
					data.meetingThings.push(t);
				}
			}
			// 无纸化会议不传附件
			if (form.type != '5') {
				data.meetingFiles = form.files;
			}
			// 无纸化会议会预先生成id 所以如果是无纸化需要传会议id
			if (form.type == '5') {
				data.meetingIds = this.paperless_meetingId;
				// 无纸化将操作员加到参会人员列表
				data.userIds.push(form.operator[0].id);
			}
			this.html.form_loading = true;
			this.request('post', meeting_reserve, this.token, data, (res) => {
				this.html.form_loading = false;
				if (res.data.head.code != 200) {
					return;
				}
				this.close_new();
				// this.col_index_start = this.col_index_end = null;
				this.req_room_list();
				// this.html.new_meeting = false;
			});
		},
		close_new() {
			this.html.new_meeting = false;
			if (this.new_meeting_form.is_rebook) {
				return;
			}
			let l = this.col_index_end - this.col_index_start;
			for (let i = 0; i <= l; i++) {
				this.html.block_list2[this.row_index].splice(this.col_index_start + i, 1, 0);
			}
			this.col_index_start = this.col_index_end = null;
		},
		// 周期截止日期 配置项
		cycle_options() {
			return {
				disabledDate(curr_time) {
					return curr_time.getTime() < Date.now() - 86400000 || curr_time.getTime() > Date.now() + 86400000 * 90;
				},
			};
		},
		// 预约日期不能是当天之前的
		date_options() {
			return {
				disabledDate(curr_time) {
					return curr_time.getTime() < Date.now() - 86400000;
				},
			};
		},
		// 预约时间如果是当天，则不能选择当前时刻之前的
		// time_options(flag) {
		// 	let s = '06:00';
		// 	// 86400000是一天的毫秒数
		//   let t = {
		//     step: '00:30',
		// 		end: '23:00',
		//   }
		// 	if (Date.now() - this.new_meeting_form.date.getTime() < 86400000) {
		//     // 小于一天，认为是当天 获取当前时刻
		// 		if (flag == 'start') {
		// 		} else if (flag == 'end') {
		// 		}
		// 		let time = new Date().toString().split(' ')[4];
		// 		let time_list = time.split(':');
		// 		let hour = +time_list[0]; //+号使字符转变为数字
		// 		let minute = +time_list[1];
		// 		if (minute < 30) {
		// 			s = `${hour > 10 ? hour : '0' + hour}:30`;
		// 		} else {
		// 			s = `${++hour > 10 ? hour : '0' + hour}:00`;
		// 		}
		// 	}
		//   return t
		// 	return {
		// 		start: s,
		// 		// maxTime: this.new_meeting_form.time_end,
		// 	};
		// },
		// 删除上传文件时
		file_del(file, file_list) {
			let promise = this.$confirm(`确认删除 ${file.name} ？`);
			let index;
			for (let i = 0; i < file_list.length; i++) {
				if (file_list[i].uid == file.uid) {
					index = i;
					break;
				}
			}
			this.new_meeting_form.files.splice(index, 1);
			return promise;
		},
		// 上传文件返回的数据
		upload_result(res, file_list) {
			console.log('上传结果', res);
			this.new_meeting_form.files.push(res.data);
		},
		// 上传文件头部
		upload_header() {
			return {
				Authorization: `Bearer ${this.token}`,
				// 'content-type': 'application/json',
			};
		},
		// 鼠标移出位置时关闭弹窗
		close_meeting_info_box(event) {
			if (this.place_list.length == 0) {
				return;
			}
			if (event.clientX < this.first_block_position) {
				this.html.meeting_info_show = false;
				return;
			}
			let dom1 = document.querySelector('.time_line_box');
			let t = dom1.getBoundingClientRect().bottom;
			if (event.clientY < t) {
				this.html.meeting_info_show = false;
				return;
			}
			// let dom2 = document.querySelectorAll('.place');
			// let dom3 = dom2[dom2.length - 1];
			let dom3 = document.querySelector('.meeting_boxs');
			let t2 = dom3.getBoundingClientRect().bottom - 10; //减去10 是滚动条高度
			if (event.clientY > t2) {
				this.html.meeting_info_show = false;
				return;
			}
		},
		// 添加提醒时间、方式
		add_alert_time() {
			let t;
			let t3 = this.new_meeting_form.meetingReminds;
			if (t3.length == 3) {
				return;
			}
			switch (t3.length) {
				case 0:
					t = {
						index: 0,
						type: 0,
						alert_time: '',
					};
					break;
				default:
					t = {
						index: t3[t3.length - 1].index < 6 ? t3[t3.length - 1].index + 1 : 6, //自动添加的提醒每次会自动选后一个选项 已经是倒数第二个选项了就只会添加倒数第二个选项
						type: 0,
						alert_time: '',
					};
					break;
			}
			t3.push(t);
			for (let val of t3) {
				this.init_time(val);
			}
		},
		// 切换提醒选项 初始化时间
		init_time(obj) {
			let t = this.new_meeting_form.date;
			let t2 = new Date(`${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()} ${this.new_meeting_form.time_start}`);
			let t3;
			switch (obj.index) {
				case 0:
					t3 = t2;
					break;
				case 1:
					t3 = new Date(t2.getTime() - 15 * 60 * 1000);
					break;
				case 2:
					t3 = new Date(t2.getTime() - 30 * 60 * 1000);
					break;
				case 3:
					t3 = new Date(t2.getTime() - 60 * 60 * 1000);
					break;
				case 4:
					t3 = new Date(t2.getTime() - 2 * 60 * 60 * 1000);
					break;
				case 5:
					t3 = new Date(t2.getTime() - 24 * 60 * 60 * 1000);
					break;
				case 6:
					t3 = new Date(t2.getTime() - 2 * 24 * 60 * 60 * 1000);
					break;
				default:
					return;
			}
			obj.alert_time = `${t3.getFullYear()}-${t3.getMonth() + 1 < 10 ? '0' + (t3.getMonth() + 1) : t3.getMonth() + 1}-${t3.getDate() < 10 ? '0' + t3.getDate() : t3.getDate()} ${
				t3.toString().split(' ')[4]
			}`;
		},
		// 自定义提醒时间
		custom_alert_time(row_obj) {
			row_obj.alert_time = `${row_obj.alert_time.getFullYear()}-${row_obj.alert_time.getMonth() + 1 < 10 ? '0' + (row_obj.alert_time.getMonth() + 1) : row_obj.alert_time.getMonth() + 1}-${
				row_obj.alert_time.getDate() < 10 ? '0' + row_obj.alert_time.getDate() : row_obj.alert_time.getDate()
			} ${row_obj.alert_time.toString().split(' ')[4]}`;
			row_obj.index = row_obj.alert_time;
		},
		// 删除提醒
		del_alert_time(index) {
			this.new_meeting_form.meetingReminds.splice(index, 1);
		},
		// 改变是否提醒 清空数组
		change_info() {
			if (this.new_meeting_form.sendMessage == 0) {
				this.new_meeting_form.meetingReminds = [];
			}
		},
		// 上传来宾信息
		upload_click() {
			upload.click();
		},
		upload_visitor(e) {
			let file = e.target.files[0];
			// 取完文件后就清除
			upload.value = null;
			let reader = new FileReader();
			reader.readAsBinaryString(file);
			reader.onload = (e2) => {
				try {
					let binary = e2.target.result;
					this.new_meeting_form.guestList = []; //在当前表单下有可能重复上传文件 每次要清空之前的列表
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
								this.new_meeting_form.guestList.push(visitor);
							}
						}
					}
				} catch (err) {
					this.$message('只能上传Excel文件');
				}
			};
		},
		// 删除来宾列表中的某人
		del_guest(index) {
			this.new_meeting_form.guestList.splice(index, 1);
		},
		// 删除参会人员
		del_person(index, type) {
			let arr;
			switch (type) {
				case 'join':
					arr = this.new_meeting_form.search_person;
					break;
				case 'holder':
					arr = this.new_meeting_form.emcee;
					break;
				case 'operator':
					arr = this.new_meeting_form.operator;
					break;
			}
			arr.splice(index, 1);
		},
		// 下载excel模板
		download() {
			//#region
			// axios({
			// 	method: 'get',
			// 	url: `${url}api-file/files/view/9ECD2E6B3A604EC5ADBD1A9852CFA67D.xlsx`,
			// 	responseType: 'blob',
			// }).then((res) => {
			// 	// let b = new Blob([res.data], { type: 'application/vnd.ms-excel' });
			// 	let a = document.createElement('a');
			// 	a.href = URL.createObjectURL(res.data);
			// 	a.target = '_blank';
			// 	a.download = '模板.xlsx';
			// 	document.body.appendChild(a);
			// 	a.click();
			// 	document.body.removeChild(a);
			// });
			//#endregion
			let a = document.createElement('a');
			a.href = '../../系统下载模板/会管来宾模板.xlsx';
			a.target = '_blank';
			a.download = '模板.xlsx';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		},
		// 鼠标焦点样式显示
		mouse_focus(event, top) {
			if (this.html.block_list[this.mouse.row_index][this.mouse.col_index] == 0) {
				this.mouse.focus = true;
				this.mouse.focus_top = this.block_top - top + 'px';
			} else {
				this.mouse.focus = false;
			}
		},
		// 鼠标焦点列样式
		mouse_position() {
			if (!this.mouse.enter || !this.time_box_array) {
				return;
			}
			let left = this.time_box_array[this.mouse.col_index].offsetLeft;
			let scroll_left = document.querySelector('.meeting_boxs').scrollLeft;
			return {
				width: this.block_width + 'px',
				height: this.mouse.height,
				top: this.mouse.top,
				left: left + 2 + 12 - scroll_left + 'px', //因为外边框加了padding 而这个是相对于视窗定位 要补上padding和边框宽度的偏差
			};
		},
		// 鼠标焦点样式显示
		mouse_focus_show(event) {
			if (!this.mouse.enter) {
				return;
			}
			let top = document.querySelector('.time_line_box').getBoundingClientRect().bottom;
			let dom = document.querySelector('.meeting_boxs').getBoundingClientRect();
			let bottom = dom.bottom - 10; //减去10 是滚动条高度
			let right = dom.right;
			if (event.clientX > this.first_block_position && event.clientX < right && event.clientY > top + 10 && event.clientY < bottom) {
				// this.mouse.enter = true;
				// 在面板滑动时要计算行的值 列由时间块的mouseenter事件定位 mouseenter第一次定位行列肯定是准的
				// 但是在指示条滑动鼠标时 行发生变化 要计算这个值需要之前定位到的行值 与当前鼠标位置
				// this.block_top = this.time_box_array[this.mouse.row_index * 34 + this.mouse.col_index].getBoundingClientRect().top;
				if (!this.block_top || this.mouse.row_index != this.mouse.row_index_old) {
					// 当行没有变化就不计算block_top减轻计算量;
					this.block_top = this.time_box_array[this.mouse.row_index * this.html.time_num + this.mouse.col_index].getBoundingClientRect().top;
					this.mouse.row_index_old = this.mouse.row_index;
				}
				// 有两种情况 一种鼠标坐标小于block_top-10 行减少1
				// 另一种鼠标坐标比block_top大100 行增加1
				if (event.clientY <= this.block_top - 10) {
					--this.mouse.row_index;
				} else if (event.clientY - this.block_top >= 100) {
					++this.mouse.row_index;
				}
				// 指示条始终显示 但是焦点块只有在鼠标没有按下的时候才能显示
				if (!this.start_move) {
					this.mouse_focus(event, top);
					this.query_meeting_info(event, this.mouse.row_index, this.mouse.col_index);
				} else {
					this.mouse.focus = false;
				}
			} else {
				this.mouse.enter = false;
			}
		},
		// 鼠标指示条出现后 无法滚动因此要获取节点手动滚动
		focus_wheel(e) {
			let dom = document.querySelector('.meeting_boxs');
			let max = dom.scrollHeight - dom.clientHeight;
			if (e.wheelDelta < 0) {
				if (dom.scrollTop === max) {
					return;
				}
				this.mouse.focus = false;
				if (dom.scrollTop + 100 > max) {
					dom.scrollTop = max;
				} else {
					dom.scrollTop += 100;
					this.mouse.row_index++;
				}
			} else {
				if (dom.scrollTop === 0) {
					return;
				}
				this.mouse.focus = false;
				if (dom.scrollTop - 100 < 0) {
					dom.scrollTop = 0;
				} else {
					dom.scrollTop -= 100;
					this.mouse.row_index--;
				}
			}
		},
		// 浮动指示条上触发事件中转变量
		mouse_down() {
			this.area_start(this.mouse.row_index, this.mouse.col_index);
		},
		// 获取列表 初始化 展示添加人员弹窗
		add_person_display(type) {
			this.html.add_person_display = true;
			this.add_person_form.add_type = type; // 标识 用于区别条件
			// 不同类别 从不同数组灌入数据
			let arr;
			switch (type) {
				case 'join':
					arr = this.new_meeting_form.search_person;
					this.add_person_form.title = '添加参会人';
					break;
				case 'holder':
					arr = this.new_meeting_form.emcee;
					this.add_person_form.title = '指定主持人';
					break;
				case 'operator':
					arr = this.new_meeting_form.operator;
					this.add_person_form.title = '指定操作员';
					break;
			}
			let list = [];
			for (let val of arr) {
				let t = {
					id: val.id,
					name: val.name,
					type: 'person',
				};
				list.push(t);
			}
			document.querySelector('#add_person').contentWindow.postMessage(list); //给子页面发送消息回显
		},
		// 重新预约会议
		rebook_meeting(data) {
			this.html.new_meeting = true;
			this.roomId = data.roomId;
			this.new_meeting_form.name = data.name;
			let d_s = new Date(data.start_time);
			let d_e = new Date(data.end_time);
			this.new_meeting_form.date = d_s;
			this.new_meeting_form.time_start = d_s.toString().split(' ')[4].substring(0, 5);
			this.new_meeting_form.time_end = d_e.toString().split(' ')[4].substring(0, 5);
			this.new_meeting_form.method = 0;
			this.change_reserve_type();
			this.new_meeting_form.reply = data.reply;
			this.new_meeting_form.sendMessage = data.sendMessage;
			this.new_meeting_form.signIn = data.signIn;
			this.new_meeting_form.summary = data.summary;
			this.new_meeting_form.description = data.description;
			this.new_meeting_form.is_rebook = true;
			this.new_meeting_form.emcee = data.emcee; // 主持人
			// 提醒时间列表回显
			this.new_meeting_form.meetingReminds = [];
			if (!data.meetingReminds || !data.meetingReminds.length) {
				this.new_meeting_form.sendMessage = 0;
			}
			for (let val of data.meetingReminds) {
				let t = {
					alert_time: val.remindTime,
					index: val.remindTime,
					type: 0,
				};
				this.new_meeting_form.meetingReminds.push(t);
			}
			// 填入参会和来宾 注意要把当前用户放在数组第一位
			this.new_meeting_form.search_person = [this.user];
			for (let val of data.search_person) {
				if (val.userId !== this.user.id) {
					let t = {
						id: val.userId,
						name: val.username,
					};
					this.new_meeting_form.search_person.push(t);
				}
			}
			this.new_meeting_form.guestList = [];
			for (let val of data.guestList) {
				let visitor = {
					guestName: val.guestName, //传的数据是这个字段名 不要改
					guestPhone: val.guestPhone,
				};
				this.new_meeting_form.guestList.push(visitor);
			}
			this.new_meeting_form.type = data.type; // 会议类型
			this.new_meeting_form.step = 0; //重置步骤
			this.new_meeting_form.template = data.template; //临时 暂无存模板字段
			this.new_meeting_form.platform = data.platform; // 回显第三方平台
		},
		// 拖动下方横向滚动条 会连带上边的滚动条移动
		link_scroll() {
			let old_left = this.meeting_boxs.scrollLeft;
			if (!this.scroll) {
				setTimeout(() => {
					let left = this.meeting_boxs.scrollLeft;
					if (Math.abs(left - old_left)) {
						document.querySelector('.time_line_box').scrollLeft = left;
					}
					this.scroll = false;
				}, 30);
			}
			this.scroll = true;
		},
		// 部门人员去重
		async de_weight(list) {
			this.html.loading = true;
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
			this.html.loading = false;
			if (data.head.code !== 200) {
				return false;
			}
			return data.data;
		},
		// 查询并打开物品弹窗
		async goods_show() {
			this.goods.show = true;
			// 清空选项
			this.goods.search = '';
			this.goods.list = [];
			// 将当前选的物品列表深拷贝给临时编辑列表
			this.goods.select = JSON.parse(JSON.stringify(this.new_meeting_form.goods));
			await this.get_goods_list();
			setTimeout(() => {
				let dom = document.getElementById('goods_table');
				this.goods.max_h = dom.offsetHeight;
			}, 500);
		},
		// 查询物品
		async get_goods_list(page) {
			this.html.add_person_loading = true;
			this.goods.page = page || 1;
			let { data: res } = await this.request('post', get_goods_list_url, this.token, {
				condition: {},
				pageNum: this.goods.page,
				pageSize: this.goods.pageSize,
				keyword: this.goods.search,
			});
			this.html.add_person_loading = false;
			if (res.head.code !== 200 || !res.data.data) {
				return;
			}
			this.goods.total = res.data.total;
			this.goods.list = [];
			for (let val of res.data.data) {
				let t = {
					name: val.name,
					id: val.id,
					num: '', // 物品数量由用户选择要几个
					remark: val.remark,
					unit: val.unit,
				};
				this.goods.list.push(t);
			}
			// 回显输入数量
			let list = [];
			for (let val of this.goods.list) {
				for (let val2 of this.goods.select) {
					if (val.id === val2.id) {
						val.num = val2.num;
						list.push(val);
						break;
					}
				}
			}
			this.$nextTick(() => {
				// 回显所选物品
				list.forEach((e) => {
					this.$refs.goods_table.toggleRowSelection(e);
				});
			});
		},
		// 删除物品
		del_goods(index) {
			if (this.goods.show) {
				let t = this.goods.select[index];
				this.goods.select.splice(index, 1);
				// 删除完后 要取消当前页物品列表的勾选
				this.$refs.goods_table.toggleRowSelection(t, false);
			} else {
				this.new_meeting_form.goods.splice(index, 1);
			}
		},
		// 选择物品
		select_goods(selects) {
			// 找出未在当前页勾选列表中的项 再到总勾选列表中找
			// 与自己写的列表不同点在于 自己写的列表可以绑定事件 知道是哪一条触发点击 从而只对这一条进行增减
			// 而element列表 勾选项改变后 只知道哪些勾选了 所以要筛出未勾选的 再与总勾选列表对比
			let list2 = [];
			for (let val of this.goods.list) {
				let find = false;
				for (let val2 of selects) {
					if (val.id === val2.id) {
						find = true;
						break;
					}
				}
				if (!find) {
					list2.push(val);
				}
			}
			for (let val of list2) {
				for (let i = 0; i < this.goods.select.length; i++) {
					if (val.id === this.goods.select[i].id) {
						this.goods.select.splice(i, 1);
						break;
					}
				}
			}
			// 当前页已选列表对比总勾选列表 未找到的就添加到总勾选列表
			let list = [];
			for (let val of selects) {
				let find = false;
				for (let val2 of this.goods.select) {
					if (val.id === val2.id) {
						find = true;
						break;
					}
				}
				if (!find) {
					list.push(val);
				}
			}
			this.goods.select.push(...list);
		},
		// 确认添加选择的物品
		add_goods() {
			for (let val of this.goods.select) {
				if (!this.is_num(val.num, false)) {
					// 提交校验时 不能有不合规的数量
					this.$message.error('物品数量不正确');
					return;
				}
			}
			this.new_meeting_form.goods = this.goods.select;
			this.goods.show = false;
		},
		// 不能输入非数字及小数点
		is_num(input, type) {
			let reg = /^[1-9][0-9]*$/;
			let result = reg.test(input);
			// 只有失去焦点时才提示消息 提交验证时不提示
			if (!result && type) {
				this.$message.error('只能填入整数！');
			}
			return result;
		},
		// 查询会议室详情
		async place_detail(room_id) {
			this.place.show = true;
			this.html.add_person_loading = true;
			for (let val of this.place.list) {
				val.content = '';
			}
			let {
				data: {
					data: { data: users },
				},
			} = await this.request('post', user_name_url, this.token, {
				condition: {},
				pageNum: 1,
				pageSize: 999,
			});
			let { data: res } = await this.request('get', `${place_detail_url}/${room_id}`, this.token);
			this.html.add_person_loading = false;
			if (res.head.code !== 200 || !res.data) {
				return;
			}
			this.place.list[0].content = res.data.roomName;
			this.place.list[1].content = res.data.address;
			this.place.list[2].content = res.data.conferencingEquipment;
			this.place.list[3].content = res.data.functionalPosition;
			this.place.list[4].content = res.data.num;
			this.place.list[5].content = res.data.typeName;
			for (let val of users) {
				if (val.id === res.data.managementUser) {
					this.place.list[6].content = val.username;
				}
			}
			this.place.list[7].content = res.data.approve ? '是' : '否';
			if (res.data.approve) {
				this.place.list[8].content = res.data.auditBranchName;
			}
		},
		// 会议类型改变 切换显示无纸化配置
		meeting_type_change(value) {
			// 无纸化会议室才显示无纸化配置
			if (value == '5') {
				this.new_meeting_form.step_list = this.step_list_backup;
				// 无纸化只能选择单次预约
				this.new_meeting_form.method = 0;
			} else {
				this.new_meeting_form.step_list = this.step_list_backup.filter((e) => e.value !== 1);
			}
		},
		// 全屏
		full_screen() {
			let dom = document.getElementById('reserve');
			if (!document.fullscreenElement) {
				dom.requestFullscreen();
			} else {
				if (document.exitFullscreen) {
					document.exitFullscreen();
				}
			}
		},
	},
	computed: {
		// 模板图片
		template_img() {
			if (this.new_meeting_form.template) {
				for (let val of this.new_meeting_form.template_list) {
					for (let val2 of val.options) {
						if (val2.id === this.new_meeting_form.template) {
							return val2.thumbnails[0];
						}
					}
				}
			} else {
				return '';
			}
		},
	},
});
