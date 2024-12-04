let url = `${我是接口地址}/`;
// let url = 'http://192.168.30.45:9201/';
let meeting_url = `${url}api-portal/meeting`; //会议详情
let end_meeting_url = `${url}api-portal/meeting/cancel`; //结束会议
let meeting_pass_url = `${url}api-portal/meeting/transfer`; //转交会议
let delay_meeting_url = `${url}api-portal/meeting/delay`; //会议延迟
let cur_user_url = `${url}api-auth/oauth/userinfo`; //当前用户
let handle_meeting_url = `${url}api-portal/meeting/handle`; //处理会议
let download_summary_url = `${url}api-portal/meeting/summary/download`; //信息导出
let remove_dup_url = `${url}api-user/department/deptUsers/distinct`; //用户去重
let get_file_img_url = `${url}api-portal/meeting/files/preview`; // 获取会议附件预览地址
let get_audit_process_url = `${url}api-portal/audit-operation/query`; // 根据业务ID查询审核流水
let limits_url = `${url}api-user/menus/current`; //获取菜单权限
let 修改校领导url = `${url}api-portal/meeting/leader`;

Vue.use(vant.Popup);
Vue.use(vant.Dialog);
Vue.use(vant.Picker);
// Vue.use(vant.Swipe);
// Vue.use(vant.SwipeItem);
Vue.use(vant.Lazyload);
Vue.use(vant.Button);

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		loading: false, //加载弹窗
		modules: [{ name: '会议资料', img: './img/icon7.png' }],
		buttons: [
			{ name: '取消会议', style: { color: '#E42C2C', background: '#F4CFD1' }, show: false },
			{ name: '委托参会', style: { color: '#0182C0', background: '#B3EBFE' }, show: false },
			{ name: '延时会议', style: { color: '#038D5C', background: '#96F6D4' }, show: false },
			{ name: '审核详情', style: { color: '#038D5C', background: '#96F6D4' }, show: false },
			{ name: '重新预定', style: { color: '#E42C2C', background: '#B3EBFE' }, show: false },
			{ name: '修改会议状态', style: { color: '#E42C2C', background: '#B3EBFE' }, show: false },
		],
		sign_in_show: false, // 签到按钮显示
		meeting: {
			theme: '', //会议主题
			date: '', //日期
			start: '', //开始
			end: '', //结束
			emcee: '', //主持人
			room: '', //房间
			door_code: '', //开门码
			users: [], //参会人
			transfer: [], //转交人员列表
			delay: 30, //延迟
			files: [], // 文件列表
		},
		pop: {
			title: '', //弹窗标题
			show: false, //弹窗显示
			type: '', //弹窗内容
			url: '', //跳转地址
			list: [], //选项
			content: '', // 文本内容
		},
		confirm: {
			title: '', //弹窗标题
			show: false, //弹窗显示
			type: '', //弹窗内容
		},
		file: {
			show: false, // 文件预览
			page: 0, // 当前页
			imgs: [], // 文件图片
			loading: false,
		},
		audit: {
			进行中: '', // 进行中的索引
			被驳回: [], // 被拒绝的索引数组
			通过: [], // 通过的索引数组
			data: [], // 原始数据
		},
		config: {
			添加校领导: false,
			移除校领导: false,
		},
		校领导: {
			list: [],
			add_ban: false, // 按钮是否可用
			del_ban: false,
		},
	},
	async mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
			this.id = sessionStorage.id; //会议id
			this.prePage = sessionStorage.prePage; // 回退页面
		} else {
			this.get_token();
		}
		this.resize();
		await this.get_cur_user();
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
							if (val3.path === '云会管平台_会议管理_会议详情') {
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
		this.config.添加校领导 = this.is_element_show(limits, '添加校领导');
		this.config.移除校领导 = this.is_element_show(limits, '移除校领导');
		this.get_data();
		// 引入pdf库文件
		// pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.bootcdn.net/ajax/libs/pdf.js/3.10.111/pdf.worker.js';
		window.onmessage = async ({ data: res }) => {
			console.log('页面消息', res);
			if (res.type === 'close_pop') {
				let d = res.data;
				if (Array.isArray(d)) {
					switch (this.pop.type) {
						case 'person':
							if (this.添加人员类型 === '校领导') {
								if (!d.length) {
									this.info('err', '添加不能为空');
									return;
								}
								vant.Dialog.confirm({
									title: '提示',
									message: '确定添加校领导？',
								})
									.then(async () => {
										this.loading = true;
										let { data: res } = await this.request('post', 修改校领导url, this.token, { meetingId: this.id, userIdList: d.map((e) => e.id) });
										this.loading = false;
										if (res.head.code == 200) {
											this.pop.show = false;
											this.get_data();
										}
									})
									.catch(() => {});
							} else {
								let list = await this.de_weight(d);
								this.meeting.transfer = [];
								for (let val of list) {
									let t = {
										name: val.username,
										id: val.id,
									};
									this.meeting.transfer.push(t);
								}
								this.pop.show = false;
							}
							break;
					}
				}
			}
		};
		// 生成延迟选项
		this.delays = [];
		for (let i = 1; i <= 4; i++) {
			let t = 30 * i;
			this.delays.push(t);
		}
	},
	methods: {
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
		// 浏览器大小改变后执行方法
		resize() {
			let dom = document.documentElement;
			let width = dom.clientWidth;
			let ratio = Math.round((width / 360) * 100) / 100; // 取小数点后两位
			dom.style.fontSize = ratio * 10 + 'px'; //以360分辨率下字体大小10px为基准
		},
		// 返回上一页
		turn_back() {
			window.location.href = `../${this.prePage}/index.html?token=${this.token}`;
		},
		// 查询会议详情
		async get_data() {
			this.loading = true;
			let { data: res } = await this.request('get', `${meeting_url}/${this.id}`, this.token);
			this.loading = false;
			if (res.head.code !== 200) {
				return;
			}
			this.meeting.theme = res.data.theme;
			let st = res.data.startTime.split(' ');
			this.meeting.date = st[0];
			this.meeting.start = st[1];
			this.meeting.end = res.data.endTime.split(' ')[1];
			this.meeting.emcee = res.data.createUserName;
			this.meeting.room = res.data.roomName;
			this.meeting_data = res.data;
			this.meeting.door_code = res.data.doorCode || '';
			this.meeting.files = res.data.meetingFiles;
			// 按钮操作会刷新页面数据 必须清理原数组
			this.meeting.users = [];
			this.校领导.list = [];
			for (let val of res.data.users) {
				if (val.userType === 1) {
					let t = {
						name: val.username,
						reply: val.reply,
						sign_in: val.signIn,
						userId: val.userId,
					};
					this.校领导.list.push(t);
				} else {
					let t = {
						name: val.username,
						reply: val.reply,
						sign_in: val.signIn,
						userId: val.userId,
					};
					this.meeting.users.push(t);
				}
			}
			// 未开始/已开始 且 需要回复 且 未转交 且 是参会人 且 未回复
			let find = false;
			for (let val of this.meeting.users) {
				if (val.userId === this.cur_user_id && val.reply === null) {
					find = true;
					break;
				}
			}
			if ((res.data.status === 0 || res.data.status === 1) && res.data.reply && !res.data.transferFlag && find) {
				this.sign_in_show = true;
			} else {
				this.sign_in_show = false;
			}
			// 按钮显示
			if (this.cur_user_id === res.data.createUser && res.data.status === 0) {
				// 创建人 且 会议未开始
				this.buttons[0].show = true;
			}
			if (res.data.isMeetingUser && res.data.auditStatus === 2 && res.data.status === 0 && !res.data.transferFlag) {
				// 参会人员 且 审核通过 会议未开始 未转交
				this.buttons[1].show = true;
			}
			if (this.cur_user_id === res.data.createUser && res.data.auditStatus === 2 && (res.data.status === 0 || res.data.status === 1)) {
				// 主持人 且 审核通过后 且会议结束前
				this.buttons[2].show = true;
			}
			if (res.data.createUser === this.cur_user_id) {
				// 申请人才能看到
				this.buttons[3].show = true;
			}
			if (res.data.createUser === this.cur_user_id && (res.data.auditStatus === -1 || res.data.status === -1)) {
				// 申请人 且 审核被驳回
				this.buttons[4].show = true;
			}
			if (res.data.isMeetingUser && !res.data.transferFlag && res.data.status === 0 && res.data.auditStatus === 2) {
				// 参会人 未转交 会议未开始 审核通过
				this.buttons[5].show = true;
			}
			// 校领导按钮具有权限时设置定时器
			if (this.校领导定时器) {
				clearInterval(this.校领导定时器); // 有定时器则刷新时清除
			}
			if (this.config.添加校领导 || this.config.移除校领导) {
				this.判断校领导按钮是否禁用();
				this.校领导定时器 = setInterval(() => {
					this.判断校领导按钮是否禁用();
				}, 60000);
			}
		},
		// 会议功能
		async meeting_fn(type) {
			switch (type) {
				case '取消会议':
					vant.Dialog.confirm({
						title: '提示',
						message: '确认取消会议？',
					})
						.then(async () => {
							this.loading = true;
							let { data: res } = await this.request('put', `${end_meeting_url}/${this.id}`, this.token);
							this.loading = false;
							if (res.head.code != 200) {
								this.info('err');
								return;
							}
							this.info('success', '会议已取消');
							// 结束会议成功后隐藏按钮防止多次结束
							this.buttons[0].show = false;
							// 结束会议后不能延迟和转交
							this.buttons[1].show = false;
							this.buttons[2].show = false;
							this.get_data();
						})
						.catch(() => {});
					break;
				case '委托参会':
					this.confirm.show = true;
					this.confirm.title = '委托参会';
					this.confirm.type = 'transfer';
					break;
				case '添加人员':
					this.pop.show = true;
					this.pop.type = 'person';
					if (!this.pop.url) {
						this.pop.url = `../add_person_only_person/index.html?token=${this.token}`;
					}
					this.$nextTick(() => {
						let list = [];
						for (let val of this.meeting.transfer) {
							let t = {
								id: val.id,
								name: val.name,
								type: 'person',
							};
							list.push(t);
						}
						document.querySelector('#pop_window').contentWindow.postMessage(list);
					});
					break;
				case '延时会议':
					this.confirm.show = true;
					this.confirm.title = '延时会议';
					this.confirm.type = 'delay';
					break;
				case '延时':
					this.pop.show = true;
					this.pop.title = '延时';
					this.pop.type = 'delay';
					this.pop.list = this.delays;
					break;
				case '参加':
					this.$dialog
						.confirm({
							message: `确认参加吗?`,
							title: '确认',
						})
						.then(async () => {
							this.loading = true;
							let { data: res } = await this.request('post', handle_meeting_url, this.token, { meetingId: this.id, reply: 1, userId: this.cur_user_id });
							this.loading = false;
							this.sign_in_show = false;
							if (res.head.code !== 200) {
								this.info('err');
								return;
							}
							this.info('success');
							this.get_data();
						})
						.catch(() => {});
					break;
				case '请假':
					this.pop.show = true;
					this.pop.type = '请假';
					break;
				case '确认请假':
					if (!this.pop.content) {
						vant.Toast('请假理由不能为空！');
					} else {
						this.$dialog
							.confirm({
								message: `确认要请假吗?`,
								title: '请假',
							})
							.then(async () => {
								this.loading = true;
								this.pop.show = false;
								let { data: res2 } = await this.request('post', handle_meeting_url, this.token, { meetingId: this.id, reply: 2, userId: this.cur_user_id, replyMsg: this.pop.content });
								this.loading = false;
								this.sign_in_show = false;
								if (res2.head.code !== 200) {
									this.info('err');
									return;
								}
								this.info('success');
								this.get_data();
							})
							.catch(() => {});
					}
					break;
				case '会议资料':
					this.pop.show = true;
					this.pop.type = 'files';
					break;
				case '审核详情':
					this.audit.进行中 = '';
					this.audit.被驳回 = [];
					this.audit.通过 = [];
					let { data: res3 } = await this.request('post', `${get_audit_process_url}/${this.id}`, this.token);
					if (res3.head.code !== 200) {
						this.info('err');
						return;
					}
					let index3 = 0;
					for (let val of res3.data) {
						switch (val.status) {
							case 1:
								this.audit.进行中 = index3;
								break;
							case -1:
							case 0:
								this.audit.被驳回.push(index3);
								break;
							case 2:
								this.audit.通过.push(index3);
								break;
						}
						index3++;
					}
					this.audit.data = res3.data;
					this.pop.show = true;
					this.pop.type = '审核流程';
					break;
				case '重新预定':
					// 跳转会议预约界面
					let data = {
						theme: this.meeting_data.theme,
						start_time: this.meeting_data.startTime.replace(/-/g, '/'),
						end_time: this.meeting_data.endTime.replace(/-/g, '/'),
						reply: this.meeting_data.reply,
						sendMessage: this.meeting_data.sendMessage,
						meetingReminds: this.meeting_data.meetingReminds,
						signIn: this.meeting_data.signIn,
						summary: this.meeting_data.summary,
						join: [],
						guestList: [],
						type: this.meeting_data.meetingType,
						template: this.meeting_data.templateId || '',
						leader: [],
						goods: this.meeting_data.meetingThings.map((e) => ({
							name: e.name,
							id: e.id,
							num: e.quantity,
							remark: e.remark,
							unit: e.unit,
						})),
					};
					for (let val of this.meeting_data.users) {
						switch (val.userType) {
							case 0:
								data.join.push(val);
								break;
							case 1:
								data.leader.push(val);
								break;
							case 2:
							case 3:
								data.guestList.push(val);
								break;
						}
					}
					sessionStorage.meeting_data = JSON.stringify(data);
					window.location.href = `../meetingReserve/index.html?token=${this.token}&id=${this.meeting_data.roomId}`;
					break;
				case '修改会议状态':
					this.sign_in_show = true;
					break;
			}
		},
		// 提示信息
		info(type, msg) {
			switch (type) {
				case 'err':
					vant.Notify({ type: 'warning', message: msg || '执行失败' });
					break;
				case 'success':
					vant.Notify({ type: 'success', message: msg || '执行成功' });
					break;
			}
		},
		// 弹窗高度
		pop_style() {
			let t = {
				overflow: 'hidden',
			};
			switch (this.pop.type) {
				case 'person':
				case '审核流程':
					t.height = '90%';
					break;
				case 'files':
					t.height = '60%';
					break;
				case '请假':
					t.height = '30%';
					break;
			}
			return t;
		},
		// 删除人员
		del_person(index) {
			this.meeting.transfer.splice(index, 1);
		},
		// 根据弹窗类型保存
		async dialog_confirm() {
			switch (this.confirm.type) {
				case 'transfer':
					if (this.meeting.transfer.length > 1) {
						this.info('err', '委托只能选一人');
						return;
					}
					if (!this.meeting.transfer.length) {
						this.info('err', '至少选一人');
						return;
					}
					this.loading = true;
					let { data: res } = await this.request('put', `${meeting_pass_url}/${this.id}?transferUserId=${this.meeting.transfer[0].id}`, this.token);
					this.loading = false;
					if (res.head.code !== 200) {
						this.info('err', '委托失败');
						return;
					}
					this.info('success', '委托成功');
					// 转交后不能 再次转交、结束、和延迟
					this.buttons[0].show = false;
					this.buttons[1].show = false;
					this.buttons[2].show = false;
					this.get_data();
					break;
				case 'delay':
					this.loading = true;
					// 防止ios系统出错
					let nd = this.meeting.date.replace(/-/g, '/');
					// 获取时间戳
					let e1 = new Date(`${nd} ${this.meeting.end}`).getTime();
					// 结束时间加延迟毫秒 再转换为日期对象
					let e2 = new Date(e1 + Number(this.meeting.delay) * 60 * 1000);
					let end = `${e2.getFullYear()}-${e2.getMonth() + 1}-${e2.getDate()} ${e2.toString().split(' ')[4]}`;
					let { data: res2 } = await this.request('put', delay_meeting_url, this.token, { id: this.id, startTime: `${this.meeting.date} ${this.meeting.start}:00`, endTime: end });
					this.loading = false;
					if (res2.head.code !== 200) {
						this.info('err');
						return;
					}
					this.info('success');
					this.get_data();
					break;
			}
		},
		// 选择器选中结果
		async picker_select(value) {
			this.pop.show = false;
			this.meeting.delay = value;
		},
		// 获取当前用户
		async get_cur_user() {
			let { data: res } = await this.request('get', cur_user_url, this.token);
			if (res.head.code !== 200) {
				return;
			}
			this.cur_user_id = res.data.id;
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
		// 打开弹窗预览文件
		async open_file(file) {
			// 只有doc,docx,ppt,pptx,pdf文件才支持预览
			let type;
			// 旧文件没有后缀 新上传的才有
			if (file.suffix) {
				type = file.suffix;
			} else {
				type = file.fileName.split('.').pop();
			}
			if (type != 'pdf' && type != 'doc' && type != 'docx' && type != 'ppt' && type != 'pptx') {
				alert('该文件不支持预览');
				return;
			}
			this.file.show = true;
			// this.file.page = 1;
			// this.scale = 0.8;
			// // 第一次打开需要加载文档
			// pdfjsLib.getDocument(file.fileUrl).promise.then((pdf) => {
			// 	// 打开弹窗才能找到容器
			// 	this.pdf_box = document.getElementById('file_box');
			// 	this.pdf = pdf;
			// 	this.render_file();
			// });
			this.file.loading = true;
			this.file.imgs = [];
			this.file.page = 0;
			this.request('get', `${get_file_img_url}?fileId=${file.fileId}&meetingId=${this.id}`, this.token, ({ data: res }) => {
				this.file.loading = false;
				if (res.head.code != 200 || !res.data?.length) {
					return;
				}
				// 每个图片存自己的放大倍数
				for (let val of res.data) {
					let t = {
						scale: 1, //默认初始放大倍数1
						src: val,
					};
					this.file.imgs.push(t);
				}
			});
		},
		// pdf翻页
		pdf_page(num) {
			this.file.page += num;
			// this.render_file();
		},
		// 渲染pdf文件
		render_file() {
			this.pdf_box.innerHTML = ''; // 清空容器
			this.pdf.getPage(this.file.page).then((page) => {
				let view = page.getViewport({ scale: this.scale });
				let canvas = document.createElement('canvas');
				let context = canvas.getContext('2d');
				canvas.width = view.width;
				canvas.height = view.height;
				page.render({
					canvasContext: context,
					viewport: view,
				});
				this.pdf_box.appendChild(canvas);
			});
		},
		// 记录两指位置
		zoom_start(e) {
			if (e.touches.length != 2) {
				// 只允许两指控制
				return;
			}
			// 第一根手指坐标
			let touch1 = e.touches[0];
			// 第二根手指坐标
			let touch2 = e.touches[1];
			// 计算初始间距
			this.init_dis = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch2.clientY);
		},
		// 根据两指移动距离 缩放
		zoom(e) {
			// // 节流
			// if (this.zoom_timer) {
			// 	return;
			// }
			// this.zoom_timer = true;
			// setTimeout(() => {
			// 	this.zoom_timer = false;
			// }, 500);
			if (e.touches.length != 2) {
				// 只允许两指控制
				return;
			}
			let touch1 = e.touches[0];
			let touch2 = e.touches[1];
			// 计算当前间距
			let cur_dis = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch2.clientY);
			// 计算缩放比例
			// this.scale = Math.round((cur_dis / this.init_dis) * 100) / 100;
			let scale = this.file.imgs[this.file.page].scale;
			if (cur_dis > this.init_dis) {
				scale = scale + 0.1;
				if (scale >= 2) {
					scale = 2;
				}
			} else if (cur_dis < this.init_dis) {
				scale = scale - 0.1;
				if (scale <= 0.3) {
					scale = 0.3;
				}
			}
			// this.render_file();
			// 修改当前页的放大系数
			this.file.imgs[this.file.page].scale = scale;
		},
		// 回复文字
		reply_text(reply) {
			switch (reply) {
				case 0:
					return '不参加';
				case 1:
					return '参加';
				case 2:
					return '请假';
				case null:
					return '未回复';
			}
		},
		// 签到文字
		sign_text(sign_in) {
			switch (sign_in) {
				case 0:
					return '未签到';
				case 1:
					return '已签到';
				case 2:
					return '迟到';
			}
		},
		判断校领导按钮是否禁用() {
			let t = new Date(`${this.meeting.date} ${this.meeting.start}`.replace(/\-/g, '/'));
			// 按钮仅可在会前1小时可用
			let t2 = t.getTime() - Date.now();
			let t3 = t2 > 60 * 60 * 1000;
			this.校领导.add_ban = this.config.添加校领导 && t3;
			this.校领导.del_ban = this.config.移除校领导 && t3;
		},
		移除人员(type, user_id) {
			vant.Dialog.confirm({
				title: '提示',
				message: `确定从当前会议移除${type}？`,
			})
				.then(async () => {
					await this.request('delete', `${修改校领导url}/${this.id}?userId=${user_id}`, this.token);
					this.get_data();
				})
				.catch(() => {});
		},
		添加人员(type) {
			this.pop.show = true;
			this.pop.type = 'person';
			this.添加人员类型 = type;
			switch (type) {
				case '校领导':
					this.pop.url = `../add_person/index.html?token=${this.token}&prePage=leader`;
					break;
			}
			this.$nextTick(() => {
				document.querySelector('#pop_window').contentWindow.postMessage([]);
			});
		},
	},
});
