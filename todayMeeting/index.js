let url = `${我是接口地址}/`;
let search_meeting_url = `${url}api-portal/meeting/list`;
let user_url = `${url}api-auth/oauth/userinfo`; //获取当前登录用户信息
let cancel_url = `${url}api-portal/meeting/cancel`;

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			loading: false, //页面加载
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
	},
	mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
		} else {
			this.get_token();
		}
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
	},
	methods: {
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
			this.request('put', `${cancel_url}/${meeting_id}`, this.token, (res) => {
				this.get_data(1);
			});
		},
		// 取消会议按钮是否显示
		cancel_meeting_show(row_obj) {
			if (this.current_user == row_obj.createUser) {
				if (row_obj.auditStatus == 2 && row_obj.status === 0) {
					return true;
				} else {
					return false;
				}
			} else {
				return false;
			}
		},
	},
});
