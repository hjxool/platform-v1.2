// let url = `${我是接口地址}/`;
let url = 'http://192.168.30.45:9201';
let cur_user_url = `${url}/api-auth/oauth/userinfo`; //当前用户
let meeting_url = `${url}/api-portal/meeting/list`; //查询时间段内会议
let tenants_url = `${url}/api-user/users/tenantSimple`; //租户列表
let cur_tenant_url = `${url}/api-auth/oauth/user/tenant`; //当前租户
let rooms_url = `${url}/api-portal/room/find/usage`; //场所列表
let change_tenant_url = `${url}/api-auth/oauth/user/token`; //切换租户token换绑用户
let change_token_url = `${url}/api-auth/oauth/oa/token`; //重庆理工OA获取token

Vue.use(vant.Swipe);
Vue.use(vant.SwipeItem);
Vue.use(vant.Picker);
Vue.use(vant.Popup);

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		loading: false, //加载弹窗
		modules: [
			{ img: './img/icon7.png', name: '会议预约' },
			{ img: './img/icon8.png', name: '我的会议' },
			{ img: './img/icon9.png', name: '会议日历' },
			{ img: './img/icon10.png', name: '会议审批' },
		],
		rooms: [], //会议室
		picker: {
			show: false, //选择器显示
			title: '', //选择器标题
			list: [], //数据
		},
		username: '', // 用户名
		cur_tenant: '', //当前租户
		today: {
			list: [], //今日会议
			total: 0, //会议总数
			page: 1, //查询页
			page_size: 5, //单页数量
		},
	},
	async mounted() {
		// if (!location.search) {
		// 	this.token = sessionStorage.token;
		// } else {
		// 	this.get_token();
		// }
		// 用获取到的token换新token
		this.loading = true;
		await this.change_token();
		this.token = 'd23b585a-27d3-42cf-93c1-dc9ca05f3600';
		this.resize();
		await Promise.all([this.get_cur_user(), this.get_today_meeting(), this.get_tenants()]).catch((err) => err);
		this.loading = false;
	},
	methods: {
		// 浏览器大小改变后执行方法
		resize() {
			let dom = document.documentElement;
			let width = dom.clientWidth;
			let ratio = Math.round((width / 720) * 100) / 100; // 取小数点后两位
			dom.style.fontSize = ratio * 10 + 'px'; //以720分辨率下字体大小10px为基准
		},
		// 显示弹窗
		show_picker(type) {
			this.picker_type = type;
			switch (type) {
				case 'tenant':
					this.picker.title = '选择租户';
					this.picker.show = true;
					this.picker.list = this.tenants;
					break;
			}
		},
		// 选择器选中结果
		async picker_select(value) {
			this.picker.show = false;
			switch (this.picker_type) {
				case 'tenant':
					// 判断是否切换不同租户 是则重新查询会议室列表
					if (this.cur_tenant.id !== value.value.id) {
						// 切换租户后要换绑用户
						let { data } = await this.request('put', `${change_tenant_url}/?tenantName=${value.value.name}`, this.token);
						if (data.head.code !== 200) {
							vant.Toast('切换失败');
							return;
						}
						this.cur_tenant = value.value;
						this.get_room_list();
					}
					break;
			}
		},
		// 根据租户获取会议室
		async get_room_list() {
			let { data } = await this.request('post', rooms_url, this.token, {});
			if (data.head.code !== 200) {
				return;
			}
			this.rooms = data.data;
		},
		// 获取当前用户
		async get_cur_user() {
			let { data: res } = await this.request('get', cur_user_url, this.token);
			if (res.head.code !== 200) {
				return;
			}
			this.username = res.data.nickname;
		},
		// 查询会议
		async get_meeting() {
			let { data } = await this.request('post', meeting_url, this.token, {
				pageNum: this.today.page,
				pageSize: this.today.page_size,
				condition: {
					startTime: this.today_start,
					endTime: this.today_end,
					meetingStatus: '0,1,2',
					auditStatus: 2,
				},
			});
			if (data.head.code !== 200) {
				return;
			}
			this.today.total = data.data.total;
			if (Array.isArray(data.data.data)) {
				for (let val of data.data.data) {
					val.start = val.startTime.split(' ')[1];
					val.end = val.endTime.split(' ')[1];
				}
				this.today.list = data.data.data;
			}
		},
		// 查询今日会议
		get_today_meeting() {
			let date = new Date();
			this.today_start = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 00:00:00`;
			this.today_end = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 23:59:59`;
			return this.get_meeting();
		},
		// 获取租户列表
		async get_tenants() {
			this.tenants = [];
			let { data } = await this.request('get', tenants_url, this.token);
			if (data.head.code !== 200) {
				return;
			}
			for (let val of data.data) {
				let t = {
					text: val.companyName,
					value: {
						id: val.tenantId,
						name: val.companyName,
					},
				};
				this.tenants.push(t);
			}
			// 遍历 找到对应的租户 取得id
			let cur_name = await this.get_cur_tenant();
			for (let val of this.tenants) {
				if (val.text === cur_name) {
					this.cur_tenant = val.value;
					break;
				}
			}
			// 租户列表只查一次 根据当前租户查询会议室列表
			this.get_room_list();
		},
		// 获取当前租户
		async get_cur_tenant() {
			let { data } = await this.request('put', cur_tenant_url, this.token);
			return data.data;
		},
		// 查看是否是数组末尾，是则查询下一页会议
		next_page_meeting(index) {
			// index从0开始
			// 判断是否是当前数组最后一个
			if (index + 1 === this.today.list.length) {
				// 判断是否是总数中最后一个
				if (this.today.list.length < this.today.total) {
					this.today.page++;
					this.get_meeting();
				}
			}
		},
		// 跳转模块
		turn_to_page(type, params) {
			switch (type) {
				case '会议预约':
					if (params) {
						window.location.href = `../meetingReserve/index.html?token=${this.token}&id=${params}`;
					} else {
						window.location.href = `../meetingReserve/index.html?token=${this.token}`;
					}
					break;
				case '我的会议':
					window.location.href = `../myMeeting/index.html?token=${this.token}`;
					break;
				case '会议日历':
					window.location.href = `../meeting_calendar/index.html?token=${this.token}`;
					break;
				case '会议详情':
					window.location.href = `../meeting_detail/index.html?token=${this.token}&id=${params}&prePage=meeting_platform`;
					break;
				case '会议审批':
					window.location.href = `../meeting_audit/index.html?token=${this.token}`;
					break;
			}
		},
		// 换token
		async change_token() {
			let { data: res } = await axios({
				method: 'post',
				url: change_token_url,
				headers: {
					app_type,
					ticket: this.token,
				},
			});
			if (res.head.code !== 200) {
				return;
			}
			this.token = res.data.access_token;
		},
	},
});
