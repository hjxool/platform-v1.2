let url = `${我是接口地址}/`;
let search_meeting_url = `${url}api-portal/meeting/list`;
let edit_meeting_url = `${url}api-portal/meeting`;
let delay_meeting_url = `${url}api-portal/meeting/delay`;
let user_url = `${url}api-auth/oauth/userinfo`; //获取当前登录用户信息
let cancel_url = `${url}api-portal/meeting/cancel`;

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			loading: true, //页面加载
			search: '', //模糊搜索
			date_options: {
				shortcuts: [
					{
						text: '最近一周',
						onClick(picker) {
							const end = new Date();
							const start = new Date();
							start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
							picker.$emit('pick', [start, end]);
						},
					},
					{
						text: '最近一个月',
						onClick(picker) {
							const end = new Date();
							const start = new Date();
							start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
							picker.$emit('pick', [start, end]);
						},
					},
					{
						text: '最近三个月',
						onClick(picker) {
							const end = new Date();
							const start = new Date();
							start.setTime(start.getTime() - 3600 * 1000 * 24 * 90);
							picker.$emit('pick', [start, end]);
						},
					},
				],
			},
			date: null, //日期范围
			status: 'all', //会议状态
			status_options: [
				// 状态类型
				{ value: 'all', label: '全部' },
				{ value: -1, label: '驳回' },
				{ value: 0, label: '已撤回' },
				{ value: 1, label: '审核中' },
				{ value: 2, label: '审核通过' },
			],
			size: 20, //一页显示条数
			delay_set_show: false, // 延迟弹窗显示
		},
		total_size: 0, //总条数
		tableData: [], //表格数据
		current_user: '', //当前用户id
		delay: {
			text: 15, // 显示设置数值
			min: 15, // 延后最小值
			max: 120, // 延后最大值
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
		window.addEventListener('resize', this.table_height);
		this.get_data();
	},
	methods: {
		// 获取当前登录用户名
		get_current_user() {
			this.request('get', user_url, this.token, (res) => {
				console.log('用户信息', res);
				if (res.data.head.code != 200) {
					this.$message('无法获取用户信息');
					return;
				}
				this.current_user = res.data.data.id;
			});
		},
		// 计算表格最大高度
		table_height() {
			let dom = document.querySelector('.body');
			return dom.offsetHeight;
		},
		// 跳转详情页
		turn_to(id) {
			location.href = `${候工链接}?token=${this.token}&type=meetingDetail&id=${id}&prePage=MeetingList`;
		},
		// 多条件查询
		get_data(type, current) {
			this.html.loading = true;
			if (type == 'page') {
				this.current_page = current;
			}
			let c = {
				// queryType: 0,
			};
			if (this.html.status !== 'all') {
				c.auditStatus = this.html.status;
			}
			if (this.html.date != null) {
				let t1 = this.html.date[0];
				c.startTime = `${t1.getFullYear()}-${t1.getMonth() + 1 < 10 ? '0' + (t1.getMonth() + 1) : t1.getMonth() + 1}-${t1.getDate() < 10 ? '0' + t1.getDate() : t1.getDate()} 00:00:00`;
				let t2 = this.html.date[1];
				c.endTime = `${t2.getFullYear()}-${t2.getMonth() + 1 < 10 ? '0' + (t2.getMonth() + 1) : t2.getMonth() + 1}-${t2.getDate() < 10 ? '0' + t2.getDate() : t2.getDate()} 23:59:59`;
			}
			this.request('post', search_meeting_url, this.token, { condition: c, pageNum: this.current_page || 1, pageSize: this.html.size, keyword: this.html.search }, (res) => {
				console.log('会议列表', res);
				this.html.loading = false;
				if (res.data.head.code != 200) {
					return;
				}
				this.total_size = res.data.data.total;
				this.tableData = res.data.data.data;
			});
		},
		// 撤销会议
		revoke(meeting) {
			this.request('put', edit_meeting_url, this.token, { id: meeting.id, status: -1 }, (res) => {
				if (res.data.head.code == 200) {
					this.$message.success(`撤销 ${meeting.theme} 会议成功`);
				}
				this.get_data();
			});
		},
		// 取消会议
		cancel_meeting(meeting_id) {
			// this.$confirm('取消会议后是否需要重新申请？', '提示', {
			// 	confirmButtonText: '确定',
			// 	cancelButtonText: '取消',
			// 	center: true,
			// })
			// 	.then(() => {
			// 		this.html.loading = true;
			// 		this.request('put', `${cancel_url}/${meeting_id}`, this.token, (res) => {
			// 			this.turn_to_rebook(meeting_id);
			// 		});
			// 	})
			// 	.catch(() => {
			// 		this.request('put', `${cancel_url}/${meeting_id}`, this.token, (res) => {
			// 			this.get_data();
			// 		});
			// 	});
			this.html.loading = true;
			this.request('put', `${cancel_url}/${meeting_id}`, this.token, (res) => {
				this.get_data();
			});
		},
		// 查询会议详情获取生成数据 重新定向到会议预约界面
		turn_to_rebook(meeting_id) {
			this.html.loading = true;
			this.request('get', `${edit_meeting_url}/${meeting_id}`, this.token, (res) => {
				this.html.loading = false;
				console.log('会议信息', res);
				if (res.data.head.code != 200) {
					this.$message.error('无法重新预定会议');
					return;
				}
				let t = res.data.data;
				// 表单数据存到对象里 再存到本地缓存
				let data = {
					roomId: t.roomId,
					name: t.theme,
					start_time: t.startTime.replace(/-/g, '/'),
					end_time: t.endTime.replace(/-/g, '/'),
					reply: t.reply,
					sendMessage: t.sendMessage,
					meetingReminds: t.meetingReminds,
					description: t.description,
					signIn: t.signIn,
					summary: t.summary,
					search_person: [],
					guestList: [],
				};
				for (let val of t.users) {
					if (val.isGuest) {
						data.guestList.push(val);
					} else {
						data.search_person.push(val);
					}
				}
				sessionStorage.meeting_data = JSON.stringify(data);
				// 存好后跳转到会议预约页面 显示并回显表单数据
				let message = {
					type: 'jump',
					name: '会议预约',
				};
				window.parent.postMessage(message);
			});
		},
		// 按钮是否可用
		meeting_button_ban(tag, meeting_obj) {
			switch (tag) {
				case '延迟':
					if (meeting_obj.auditStatus == 2 && (meeting_obj.status === 0 || meeting_obj.status == 1)) {
						return false;
					} else {
						return true;
					}
				case '撤回':
					if (meeting_obj.auditStatus == 1 && meeting_obj.status === 0) {
						return false;
					} else {
						return true;
					}
				case '取消会议':
					if (this.current_user == meeting_obj.createUser && meeting_obj.auditStatus == 2 && meeting_obj.status === 0) {
						return false;
					} else {
						return true;
					}
				case '重新预定':
					if (this.current_user == meeting_obj.createUser && meeting_obj.status === -1 && (meeting_obj.auditStatus === 0 || meeting_obj.auditStatus == -1 || meeting_obj.auditStatus == 2)) {
						return false;
					} else {
						return true;
					}
			}
		},
		// 设置延后
		set_delay(row_obj) {
			this.html.delay_set_show = true;
			this.delay.text = 15;
			this.cur_meeting_obj = row_obj;
		},
		// 会议延后提交
		delay_meeting() {
			// 延后的会议结束时间不能超过当天23点
			let end_hour = parseFloat(this.cur_meeting_obj.endTime.split(' ')[1].split(':')[0]);
			let delay_hour = Number(this.delay.text) / 60;
			if (end_hour + delay_hour > 23) {
				this.$message.error('会议延后结束时间不能超过23点');
				return;
			}
			// let start = new Date(this.cur_meeting_obj.startTime.replace(/-/g, '/')); // 为了兼容safari浏览器
			let end = new Date(this.cur_meeting_obj.endTime.replace(/-/g, '/'));
			let delay_time = Number(this.delay.text) * 60 * 1000; // 延后分钟转换毫秒
			// start = new Date(start.getTime() + delay_time);
			end = new Date(end.getTime() + delay_time);
			// start = `${this.cur_meeting_obj.startTime.split(' ')[0]} ${start.toString().split(' ')[4]}`;
			end = `${this.cur_meeting_obj.endTime.split(' ')[0]} ${end.toString().split(' ')[4]}`;
			this.html.delay_set_show = false;
			this.request('put', delay_meeting_url, this.token, { id: this.cur_meeting_obj.id, startTime: `${this.cur_meeting_obj.startTime}:00`, endTime: end }, (res) => {
				if (res.data.head.code == 200) {
					this.$message.success(`延后 ${this.cur_meeting_obj.theme} 会议成功`);
				}
				this.get_data();
			});
		},
	},
});
