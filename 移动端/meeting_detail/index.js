// let url = `${我是接口地址}/`;
let url = 'http://192.168.30.45:9201';
let meeting_url = `${url}/api-portal/meeting`; //会议详情
let end_meeting_url = `${url}/api-portal/meeting/stop`; //结束会议
let meeting_pass_url = `${url}/api-portal/meeting/transfer`; //转交会议
let delay_meeting_url = `${url}/api-portal/meeting/delay`; //会议延迟
let cur_user_url = `${url}/api-auth/oauth/userinfo`; //当前用户
let handle_meeting_url = `${url}/api-portal/meeting/handle`; //处理会议
let download_summary_url = `${url}/api-portal/meeting/summary/download`; //信息导出
let remove_dup_url = `${url}/api-user/department/deptUsers/distinct`; //用户去重

Vue.use(vant.Popup);
Vue.use(vant.Dialog);
Vue.use(vant.Picker);

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		loading: false, //加载弹窗
		modules: [{ img: './img/icon7.png', name: '信息导出' }],
		buttons: [
			{ name: '结束会议', style: { color: '#E42C2C', background: '#F4CFD1' }, show: true },
			{ name: '转交会议', style: { color: '#0182C0', background: '#B3EBFE' }, show: true },
			{ name: '延时会议', style: { color: '#038D5C', background: '#96F6D4' }, show: true },
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
			delay: 15, //延迟
		},
		pop: {
			title: '', //弹窗标题
			show: false, //弹窗显示
			type: '', //弹窗内容
			url: '', //跳转地址
			list: [], //选项
		},
		confirm: {
			title: '', //弹窗标题
			show: false, //弹窗显示
			type: '', //弹窗内容
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
		this.get_data();
		window.onmessage = async ({ data: res }) => {
			console.log('页面消息', res);
			if (res.type === 'close_pop') {
				this.pop.show = false;
				let d = res.data;
				if (Array.isArray(d)) {
					switch (this.pop.type) {
						case 'person':
							let list = await this.de_weight(d);
							this.meeting.transfer = [];
							for (let val of list) {
								let t = {
									name: val.username,
									id: val.id,
								};
								this.meeting.transfer.push(t);
							}
							break;
					}
				}
			}
		};
		// 生成延迟选项
		this.delays = [];
		for (let i = 1; i <= 8; i++) {
			let t = 15 * i;
			this.delays.push(t);
		}
	},
	methods: {
		// 浏览器大小改变后执行方法
		resize() {
			let dom = document.documentElement;
			let width = dom.clientWidth;
			let ratio = Math.round((width / 360) * 100) / 100; // 取小数点后两位
			dom.style.fontSize = ratio * 10 + 'px'; //以720分辨率下字体大小10px为基准
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
			this.meeting.emcee = res.data.moderatorName;
			this.meeting.room = res.data.roomName;
			this.meeting.door_code = res.data.doorCode || '';
			for (let val of res.data.users) {
				let t = {
					name: val.username,
					reply: val.reply,
					sign_in: val.signIn,
				};
				this.meeting.users.push(t);
			}
			// 未开始/开始 且 需要回复 且 未转交才显示
			if ((res.data.status === 0 || res.data.status === 1) && res.data.reply && !res.data.transferFlag) {
				this.sign_in_show = true;
			} else {
				this.sign_in_show = false;
			}
			// 按钮显示
			if (res.data.status == -1 || res.data.status === 2) {
				// 会议已经取消 结束
				this.buttons[0].show = false;
			}
			if (res.data.transferFlag) {
				// 会议已经转交
				this.buttons[1].show = false;
			}
			if (res.data.moderatorId !== this.cur_user_id) {
				// 不是主持人不能延迟
				this.buttons[2].show = false;
			}
		},
		// 会议功能
		async meeting_fn(type) {
			switch (type) {
				case '结束会议':
					vant.Dialog.confirm({
						title: '提示',
						message: '确认结束会议？',
					})
						.then(async () => {
							this.loading = true;
							let { data: res } = await this.request('put', `${end_meeting_url}/${this.id}`, this.token);
							this.loading = false;
							if (res.head.code != 200) {
								this.info('err');
								return;
							}
							this.info('success', '会议已结束');
							// 结束会议成功后隐藏按钮防止多次结束
							this.buttons[0].show = false;
							// 结束会议后不能延迟和转交
							this.buttons[1].show = false;
							this.buttons[2].show = false;
						})
						.catch(() => {});
					break;
				case '转交会议':
					this.confirm.show = true;
					this.confirm.title = '转交会议';
					this.confirm.type = 'transfer';
					break;
				case '添加人员':
					this.pop.show = true;
					this.pop.type = 'person';
					if (!this.pop.url) {
						this.pop.url = `../add_person/index.html?token=${this.token}`;
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
					this.loading = true;
					let { data: res } = await this.request('post', handle_meeting_url, this.token, { meetingId: this.id, reply: 1, userId: this.cur_user_id });
					this.loading = false;
					if (res.head.code !== 200) {
						this.info('err');
						return;
					}
					this.info('success');
					this.sign_in_show = false;
					this.get_data();
					break;
				case '拒绝':
					this.loading = true;
					let { data: res2 } = await this.request('post', handle_meeting_url, this.token, { meetingId: this.id, reply: 0, userId: this.cur_user_id });
					this.loading = false;
					if (res2.head.code !== 200) {
						this.info('err');
						return;
					}
					this.info('success');
					this.sign_in_show = false;
					this.get_data();
					break;
				case '信息导出':
					this.loading = true;
					axios({
						method: 'get',
						url: `${download_summary_url}/${this.id}`,
						responseType: 'blob',
						headers: { Authorization: `Bearer ${this.token}` },
					}).then((res) => {
						let a = document.createElement('a');
						let href = URL.createObjectURL(res.data);
						a.href = href;
						a.target = '_blank';
						let filename;
						let t = res.headers['content-disposition'].replace(/\s/g, '').split(';');
						for (let val of t) {
							if (val.match(/^filename/) != null) {
								filename = decodeURIComponent(val.split('=')[1]);
							}
						}
						a.download = filename || '';
						document.body.appendChild(a);
						a.click();
						document.body.removeChild(a);
						URL.revokeObjectURL(href);
						this.loading = false;
					});
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
					t.height = '90%';
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
						this.info('err', '转交只能选一人');
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
						this.info('err', '转交失败');
						return;
					}
					this.info('success', '转交成功');
					// 转交后不能 再次转交、结束、和延迟
					this.buttons[0].show = false;
					this.buttons[1].show = false;
					this.buttons[2].show = false;
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
	},
});
