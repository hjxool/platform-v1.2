let url = `${我是接口地址}/`;
let calender_search = `${url}api-portal/meeting/calender/search`;
let limits_url = `${url}api-user/menus/current`; //获取菜单权限

Vue.config.productionTip = false;
new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			time_option: 0, //切换显示时间周期
			time_display: ['周', '月'],
			week_date: new Date(),
			month_date: new Date(),
			month_block: [], //月显示时当月1号所在周到月末所在周日期
			day_start: '', // 小于这个数的要显示为灰色
			day_end: '', // 大于这个数的显示为灰色
			meeting_type: 3, // 查询的会议类型 3已通过 4全部用户
		},
		week_meeting: [], //周下的会议列表
		month_meeting: [], //月下的会议列表
		meeting_count: [
			// 会议统计
			{ title: '进行中', num: 0 },
			{ title: '未开始', num: 0 },
			{ title: '已结束', num: 0 },
		],
		meeting_list: [], //会议列表
		config: {
			detail_show: false,
			create_show: false,
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
		let limits;
		for (let val of JSON.parse(sessionStorage.hushanwebmenuTree)) {
			if (val.path === '云会管平台') {
				for (let val2 of val.subMenus) {
					if (val2.path === '云会管平台_会议日历') {
						limits = val2.subMenus;
						break;
					}
				}
				break;
			}
		}
		this.config.detail_show = this.is_element_show(limits, '详情');
		this.config.create_show = this.is_element_show(limits, '创建会议');

		this.time_display(this.html.time_option);
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
		time_display(index) {
			this.html.time_option = index;
			for (let val of this.meeting_count) {
				val.num = 0;
			}
			if (index == 0) {
				// this.week_meeting = [];
				// 有多个查询条件 就不每次都计算时间了 不改变时间开始和结束日期就不变 只有在切换周/月显示时需要重新计算时间
				this.start_time = `${this.week_start.getFullYear()}-${this.week_start.getMonth() + 1}-${this.week_start.getDate()} 06:00:00`;
				this.end_time = `${this.week_end.getFullYear()}-${this.week_end.getMonth() + 1}-${this.week_end.getDate()} 23:00:00`;
			} else if (index == 1) {
				// 先获取当前年月 然后算当月的1号是周几 然后根据时间戳算周日的日期
				let d = this.html.month_date.getDate();
				let t_start = this.html.month_date;
				if (d > 1) {
					// 当月1号时间戳
					let t = this.html.month_date.getTime() - (d - 1) * 24 * 60 * 60 * 1000;
					t_start = new Date(t);
				}
				let w = t_start.getDay();
				let t3 = t_start.getTime() - w * 24 * 60 * 60 * 1000;
				let d_start = new Date(t3);
				this.html.month_block = [];
				for (let i = 0; i < w; i++) {
					let t = {
						day: d_start.getDate() + i,
						full_date: `${d_start.getFullYear()}-${d_start.getMonth() + 1 < 10 ? '0' + (d_start.getMonth() + 1) : d_start.getMonth() + 1}-${d_start.getDate() + i}`,
					};
					this.html.month_block.push(t);
				}
				// 记录哪些数字显示灰色
				this.html.day_start = this.html.month_block.length;
				// 计算当月有多少天
				let y = this.html.month_date.getFullYear();
				let m = this.html.month_date.getMonth() + 1;
				let total = new Date(y, m, 0).getDate();
				for (let i = 1; i <= total; i++) {
					let t = {
						day: i,
						full_date: `${y}-${m < 10 ? '0' + m : m}-${i < 10 ? '0' + i : i}`,
					};
					this.html.month_block.push(t);
				}
				this.html.day_end = this.html.month_block.length;
				// 表格是5 x 7的 所以用35 - month_block.length就是下个月要填入数组的个数
				let a = 35 - this.html.month_block.length;
				let t4 = t3 + this.html.month_block.length * 24 * 60 * 60 * 1000;
				let next_month_start = new Date(t4);
				for (let i = 1; i <= a; i++) {
					let t = {
						day: i,
						full_date: `${next_month_start.getFullYear()}-${next_month_start.getMonth() + 1 < 10 ? '0' + (next_month_start + 1) : next_month_start + 1}-${i < 10 ? '0' + i : i}`,
					};
					this.html.month_block.push(t);
				}
				// 发送请求 计算35个方格中开始到结束的日期
				// this.month_meeting = [];
				this.start_time = `${d_start.getFullYear()}-${d_start.getMonth() + 1}-${d_start.getDate()} 06:00:00`;
				let end_day = new Date(d_start.getTime() + 34 * 24 * 60 * 60 * 1000);
				this.end_time = `${end_day.getFullYear()}-${end_day.getMonth() + 1}-${end_day.getDate()} 23:00:00`;
			}
			this.get_meeting_list(index);
		},
		// 获取周会议列表
		get_meeting_list(page_index) {
			this.meeting_list = [];
			this.week_meeting = [];
			this.month_meeting = [];
			let data = {
				queryType: this.html.meeting_type,
				startTime: this.start_time,
				endTime: this.end_time,
			};
			this.request('post', calender_search, this.token, data, (res) => {
				console.log(`${page_index ? '月' : '周'}会议`, res);
				let array = Object.entries(res.data.data);
				if (array.length == 0) {
					return;
				}
				if (page_index) {
					// month_block是全部的日期数组
					for (let i = 0; i < this.html.month_block.length; i++) {
						let flag = false;
						for (let j = 0; j < array.length; j++) {
							if (this.html.month_block[i].full_date == array[j][0]) {
								flag = true;
								for (let val of array[j][1]) {
									val.date = val.startTime.split(' ')[0];
									val.start = val.startTime.split(' ')[1].substring(0, 5);
									val.end = val.endTime.split(' ')[1].substring(0, 5);
									// 说明这个日期有会议 把里面所有会议取出来
									this.meeting_list.push(val);
									if (val.status == 1) {
										this.meeting_count[0].num++;
									} else if (val.status == 0) {
										this.meeting_count[1].num++;
									} else if (val.status == 2) {
										this.meeting_count[2].num++;
									}
								}
								this.month_meeting.push(array[j][1]);
								break;
							}
						}
						if (!flag) {
							this.month_meeting.push([]);
						}
					}
				} else {
					this.block_height = document.querySelector('.week').offsetHeight / 2;
					// 先将页面渲染数组构造出来 再计算位置
					let t_a = [];
					for (let i = 0; i < array.length; i++) {
						let t = new Date(array[i][0]).getDay();
						t_a.push(t); //生成日期数组 用以查看是否有缺的日期
						for (let val of array[i][1]) {
							// 添加几个属性
							val.date = val.startTime.split(' ')[0];
							val.start = val.startTime.split(' ')[1].substring(0, 5);
							val.end = val.endTime.split(' ')[1].substring(0, 5);
							// 返回的数据是日期对象里套数组 数组里才是会议
							this.meeting_list.push(val); // 会议列表不论时间只将有的会议都压栈进去
							// 统计
							if (val.status == 1) {
								this.meeting_count[0].num++;
							} else if (val.status == 0) {
								this.meeting_count[1].num++;
							} else if (val.status == 2) {
								this.meeting_count[2].num++;
							}
						}
					}
					for (let i = 0; i < 7; i++) {
						let flag = false;
						for (let j = 0; j < t_a.length; j++) {
							if (i == t_a[j]) {
								flag = true;
								this.week_meeting.push(array[j][1]);
								break;
							}
						}
						if (!flag) {
							this.week_meeting.push([]);
						}
					}
				}
			});
		},
		// 格式化周的时间显示
		week_format() {
			let w = this.html.week_date.getDay();
			let time3 = this.html.week_date.getTime();
			let time4 = time3 - w * 24 * 60 * 60 * 1000;
			let time5 = new Date(time4);
			// 要算的是周六的日期 6-星期=间隔时间 算时间戳 在转换为日期格式
			let time = this.html.week_date.getTime() + (6 - w) * 24 * 60 * 60 * 1000;
			let time2 = new Date(time);
			this.week_start = time5;
			this.week_end = time2;
			return `${time5.getFullYear()}-${time5.getMonth() + 1}-${time5.getDate()} ~ ${time2.getFullYear()}-${time2.getMonth() + 1}-${time2.getDate()}`;
		},
		// 设置周中每天的会议方块位置 大小
		block_position(obj) {
			let t = {};
			let start = obj.start.split(':');
			let end = obj.end.split(':');
			let s = (Number(start[0]) - 6) * 2;
			if (start[1] == '30') {
				s++;
			}
			let s_p = s * this.block_height;
			t.top = `${s_p}px`;
			let e = (Number(end[0]) - 6) * 2 - 1;
			if (end[1] == '30') {
				e++;
			}
			let offset = e - s + 1;
			let h = offset * this.block_height;
			t.height = `${h}px`;
			return t;
		},
		// 不同日期下点击前/后一天 功能不一样
		pre_date() {
			switch (this.html.time_option) {
				// case 0:
				// 	this.html.date = new Date(this.html.date.getTime() - 24 * 60 * 60 * 1000);
				// 	break;
				case 0:
					this.html.week_date = new Date(this.html.week_date.getTime() - 7 * 24 * 60 * 60 * 1000);
					// this.week_format();
					break;
				case 1:
					let y = this.html.month_date.getFullYear();
					let m = this.html.month_date.getMonth() + 1;
					if (m == 1) {
						m = 12;
						y--;
					} else {
						m--;
					}
					this.html.month_date = new Date(`${y}-${m}`);
					break;
			}
			// 因为周用的是element格式化方法 所以修改完时间后得等组件挂载刷新后再调用time_display
			this.$nextTick(() => {
				this.time_display(this.html.time_option);
			});
		},
		next_date() {
			switch (this.html.time_option) {
				// case 0:
				// 	this.html.date = new Date(this.html.date.getTime() + 24 * 60 * 60 * 1000);
				// 	break;
				case 0:
					this.html.week_date = new Date(this.html.week_date.getTime() + 7 * 24 * 60 * 60 * 1000);
					// this.week_format();
					break;
				case 1:
					let y = this.html.month_date.getFullYear();
					let m = this.html.month_date.getMonth() + 1;
					if (m == 12) {
						m = 1;
						y++;
					} else {
						m++;
					}
					this.html.month_date = new Date(`${y}-${m}`);
					break;
			}
			// 因为周用的是element格式化方法 所以修改完时间后得等组件挂载刷新后再调用time_display
			this.$nextTick(() => {
				this.time_display(this.html.time_option);
			});
		},
		// 跳转到其他页面
		turn_to_page(type, meeting_id) {
			switch (type) {
				case 'meetingDetail':
					location.href = `${候工链接}?token=${this.token}&type=${type}&id=${meeting_id}&prePage=ConferenceRoomUsageStatistics`;
					break;
				default:
					window.parent.postMessage({
						type: 'jump',
						name: type,
					});
					break;
			}
		},
		// 会议列表样式
		list_style(meeting) {
			let color;
			switch (meeting.status) {
				case 0:
					color = '#0770FF';
					break;
				case 1:
					color = '#FF9800';
					break;
				default:
					color = '#4C6490';
					break;
			}
			return `background:${color}`;
		},
	},
});
