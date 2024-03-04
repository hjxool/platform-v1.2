let url = `${我是接口地址}/`;
let search_meeting_url = `${url}api-portal/meeting/list`; //查询会议列表
let user_url = `${url}api-auth/oauth/userinfo`; //获取当前登录用户信息
let cancel_url = `${url}api-portal/meeting/cancel`; //取消会议
let limits_url = `${url}api-user/menus/current`; //获取菜单权限
let meeting_pass_url = `${url}api-portal/meeting/transfer`; //转交会议

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			loading: true, //页面加载
			pop_loading: false, //弹窗加载
		},
		total_size: 0, //总条目
		current_user: '', //当前用户id
		calendar: {
			title_year: '', // 年月抬头
			title_month: '', // 年月抬头
			days: [], // 当月天组成的数组
			weeks: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
			select_day: 1, //选择的日期
		},
		body: {
			size: 10, //单页显示数量
			options: [
				{ label: '全部', value: '0,1,2' },
				{ label: '进行中', value: '1' },
				{ label: '未开始', value: '0' },
				{ label: '已结束', value: '2' },
			],
			cur_op: '0,1,2', // 当前所选项
			list: [], // 会议列表
		},
		pass: {
			show: false, // 转交弹窗
			all_show: false, // 总人员弹窗
			list: [], //转交人员列表 只能保留一个
			url: '', // 跳转人员列表地址
		},
		config: {
			cancel_show: false,
			check_show: false,
			pass_on_show: true,
		},
	},
	async mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
		} else {
			this.get_token();
		}
		if (!sessionStorage.hushanwebmenuTree) {
			await new Promise((success) => {
				this.request('get', limits_url, this.token, (res) => {
					success();
					if (res.data.head.code !== 200) {
						return;
					}
					sessionStorage.hushanwebmenuTree = JSON.stringify(res.data.data.menuTree);
				});
			});
		}
		// 解析权限树
		let limits;
		for (let val of JSON.parse(sessionStorage.hushanwebmenuTree)) {
			if (val.path === '云会管平台') {
				for (let val2 of val.subMenus) {
					if (val2.path === '云会管平台_会议管理') {
						for (let val3 of val2.subMenus) {
							if (val3.path === '云会管平台_会议管理_今日会议') {
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
		this.config.cancel_show = this.is_element_show(limits, '取消会议');
		this.config.check_show = this.is_element_show(limits, '查看会议');

		if (localStorage.hushanwebuserinfo) {
			let obj = JSON.parse(localStorage.hushanwebuserinfo);
			this.current_user = obj.id;
		} else {
			this.get_current_user();
		}
		if (sessionStorage.startTime) {
			// 获取其他页面跳转过来的参数
			this.get_day_list(new Date(sessionStorage.startTime));
			sessionStorage.removeItem('startTime');
		} else {
			this.get_day_list(new Date());
		}
		this.get_data(1);
		this.resize();
		window.addEventListener('resize', this.resize);
		this.pass.url = `../index.html?type=search_user&token=${this.token}&theme=light`;
		window.onmessage = (data) => {
			console.log('子页面消息', data);
			if (data?.data?.type === 'Close popup') {
				this.pass.all_show = false;
			}
			if (Array.isArray(data?.data)) {
				this.pass.list = data.data;
			}
		};
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
			let ratio = Math.floor((width / 1920) * 100 + 0.5) / 100; // 取小数点后两位
			dom.style.fontSize = ratio * 20 + 'px'; //以1920分辨率下字体大小20px为基准
		},
		// 计算时间
		get_day_list(time_obj) {
			this.calendar.title_year = time_obj.getFullYear();
			this.calendar.title_month = time_obj.getMonth() + 1;
			let day = time_obj.getDate();
			this.calendar.select_day = day; //传入时间是几号 就点亮日历对应天
			// 推算传入时间当月1号的时间
			if (day > 1) {
				let t = time_obj.getTime() - (day - 1) * 24 * 60 * 60 * 1000;
				time_obj = new Date(t);
			}
			let week = time_obj.getDay(); // 获取当月1号是周几
			// 反推这周周1的日期 如果是周日week等于0 则减去6天 其余时间减week-1天
			let l = week ? week - 1 : 6;
			// let monday_t = time_obj.getTime() - l * 24 * 60 * 60 * 1000;
			// let monday = new Date(monday_t);
			this.calendar.days = [];
			for (let index = 0; index < l; index++) {
				// let t = monday.getDate() + index;
				this.calendar.days.push('');
			}
			let y = time_obj.getFullYear();
			let m = time_obj.getMonth() + 1;
			let total = new Date(y, m, 0).getDate(); // 获取当月总天数
			for (let index = 1; index <= total; index++) {
				this.calendar.days.push(index);
			}
			// 表格是5 x 7的 所以用35 - month_block.length就是下个月要填入数组的个数
			let next_month_day = 35 - this.calendar.days.length;
			for (let index = 1; index <= next_month_day; index++) {
				this.calendar.days.push('');
			}
		},
		// 切换月
		change_month(tag) {
			if (tag < 0) {
				if (this.calendar.title_month == 1) {
					this.calendar.title_year--;
					this.calendar.title_month = 12;
				} else {
					this.calendar.title_month--;
				}
			} else {
				if (this.calendar.title_month == 12) {
					this.calendar.title_year++;
					this.calendar.title_month = 1;
				} else {
					this.calendar.title_month++;
				}
			}
			let t = new Date();
			if (t.getFullYear() === this.calendar.title_year && t.getMonth() + 1 === this.calendar.title_month) {
				this.get_day_list(new Date());
			} else {
				this.get_day_list(new Date(this.calendar.title_year, this.calendar.title_month - 1, 1));
			}
			// 切换月后重新查表
			this.get_data(1);
		},
		// 获取当前登录用户名
		get_current_user() {
			this.request('get', user_url, this.token, (res) => {
				console.log('用户信息');
				if (res.data.head.code != 200) {
					this.$message('无法获取用户信息');
					return;
				}
				this.current_user = res.data.data.id;
			});
		},
		// 页数变化 查询数据
		get_data(current) {
			this.html.loading = true;
			let d = `${this.calendar.title_year}-${this.calendar.title_month < 10 ? '0' + this.calendar.title_month : this.calendar.title_month}-${
				this.calendar.select_day < 10 ? '0' + this.calendar.select_day : this.calendar.select_day
			}`;
			let s = `${d} 00:00:00`;
			let e = `${d} 23:59:59`;
			this.request(
				'post',
				search_meeting_url,
				this.token,
				{ condition: { startTime: s, endTime: e, meetingStatus: this.body.cur_op, auditStatus: 2 }, pageNum: current, pageSize: this.body.size },
				(res) => {
					console.log('会议列表', res);
					this.html.loading = false;
					if (res.data.head.code != 200) {
						return;
					}
					let data = res.data.data;
					this.total_size = data.total;
					for (let val of data.data) {
						val.start_time = val.startTime.split(' ')[1];
						val.end_time = val.endTime.split(' ')[1];
					}
					this.body.list = data.data;
				}
			);
		},
		// 选择当月月中某天
		select_day(day) {
			this.calendar.select_day = day;
			this.get_data(1);
		},
		// 切换会议状态
		select_status(status) {
			this.body.cur_op = status;
			this.get_data(1);
		},
		// 跳转详情页
		turn_to(id) {
			location.href = `${候工链接}?token=${this.token}&type=meetingDetail&id=${id}&prePage=MyBooking`;
		},
		// 取消会议
		cancel_meeting(meeting_id) {
			this.$confirm('确认取消会议?', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning',
				center: true,
			}).then(() => {
				this.request('put', `${cancel_url}/${meeting_id}`, this.token, (res) => {
					this.get_data(1);
				});
			});
		},
		// 取消会议按钮是否显示
		button_show(row_obj, type) {
			switch (type) {
				case '取消':
					if ((this.current_user == row_obj.createUser || this.current_user == row_obj.moderatorId) && this.config.cancel_show && row_obj.auditStatus == 2 && row_obj.status === 0) {
						return true;
					} else {
						return false;
					}
				case '转交':
					// 有权限 会议未开始 未转交
					if (this.config.pass_on_show && row_obj.status === 0 && !row_obj.transferFlag) {
						return true;
					} else {
						return false;
					}
			}
		},
		// 显示转交弹窗
		pass_on_meeting(id) {
			this.meeting_id = id;
			this.pass.show = true;
			this.pass.list = [];
		},
		// 删除转交人员
		del_person(index) {
			this.pass.list.splice(index, 1);
		},
		// 显示总人员列表
		add_person() {
			this.pass.all_show = true;
			let dom = document.querySelector('.user_list');
			for (let val of this.pass.list) {
				val.name = val.username;
				val.type = 'person';
			}
			dom.contentWindow.postMessage(this.pass.list);
		},
		// 提交转交
		pass_submit() {
			if (!this.pass.list.length) {
				this.$message.error('必须选一个转交人');
				return;
			}
			if (this.pass.list.length > 1) {
				this.$message.error('转交人只能选一个');
				return;
			}
			this.html.pop_loading = true;
			this.request('put', `${meeting_pass_url}/${this.meeting_id}?transferUserId=${this.pass.list[0].id}`, this.token, (res) => {
				this.html.pop_loading = false;
				if (res.data.head.code !== 200) {
					return;
				}
				this.pass.show = false;
				this.get_data(1);
			});
		},
	},
});
