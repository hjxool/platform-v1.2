// let url = `${我是接口地址}/`;
let url = 'http://192.168.30.45:9201';
let search_meeting_url = `${url}/api-portal/meeting/list`; //查询会议列表

// 引入vant
Vue.use(vant.DropdownMenu);
Vue.use(vant.DropdownItem);
Vue.use(vant.Search);
Vue.use(vant.Calendar);
Vue.use(vant.Tag);

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		head: {
			search: '', //搜索框
			//会议筛选条件
			types: [
				{ text: '全部会议', value: 0 },
				{ text: '我的会议', value: 1 },
			],
			type: 0, //选择的会议类型
			// 会议状态
			status: [
				{ text: '全部', value: '-1,0,1,2' },
				{ text: '已取消', value: '-1' },
				{ text: '未开始', value: '0' },
				{ text: '进行中', value: '1' },
				{ text: '已结束', value: '2' },
			],
			status_select: '-1,0,1,2', //选择的会议状态
			calendar_show: false, //日历显示
			start_time: '', //开始日期
			end_time: '', //结束日期
		},
		body: {
			page: 1, //第几页
			size: 10, //单页显示数量
			cur_op: '0,1,2', // 当前所选项
			list: [], // 会议列表
		},
		loading: false, //加载弹窗
	},
	async mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
		} else {
			this.get_token();
		}
		this.resize();
		this.loading = true;
		await this.get_data();
		this.loading = false;
		this.dom = document.querySelector('.scroll_box');
	},
	methods: {
		// 浏览器大小改变后执行方法
		resize() {
			let dom = document.documentElement;
			let width = dom.clientWidth;
			let ratio = Math.round((width / 360) * 100) / 100; // 取小数点后两位
			dom.style.fontSize = ratio * 10 + 'px'; //以720分辨率下字体大小10px为基准
		},
		// 选择对应标题显示不同内容
		select_title(index) {
			this.html.title_select = index;
		},
		// 选择日期范围
		select_time(date) {
			// 传入参数 数组 有两个元素 分别表示开始到结束
			let [start, end] = date;
			// 发送请求时携带参数
			this.start_time = `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()} 00:00:00`;
			this.end_time = `${end.getFullYear()}-${end.getMonth() + 1}-${end.getDate()} 00:00:00`;
			this.head.calendar_show = false;
			this.head.start_time = `${start.getMonth() + 1}-${start.getDate()}`;
			this.head.end_time = `${end.getMonth() + 1}-${end.getDate()}`;
			this.search();
		},
		// 查询会议列表
		async get_data() {
			let body = {
				condition: {
					isTransferFlag: 1,
					meetingStatus: this.head.status_select,
				},
				pageNum: this.body.page,
				pageSize: this.body.size,
			};
			// 如果有搜索内容
			if (this.head.search) {
				body.keyword = this.head.search;
			}
			// 如果只看我申请的会议
			if (this.head.type) {
				body.condition.isApplyUser = 1;
			}
			// 如果选择了时间
			if (this.head.start_time) {
				body.condition.startTime = this.start_time;
				body.condition.endTime = this.end_time;
			}
			let { data } = await this.request('post', search_meeting_url, this.token, body);
			if (data.head.code !== 200) {
				return;
			}
			let d = data.data;
			this.total_page = Math.ceil(d.total / 10); // 下拉刷新的最大页数 达到这个页数不再进行请求
			for (let val of d.data) {
				let t = {
					status: val.status,
					start: `${val.startTime.split(' ').pop()}`,
					end: `${val.endTime.split(' ').pop()}`,
					title: val.theme,
					author: val.moderatorName,
					place: val.roomName,
				};
				this.body.list.push(t);
			}
		},
		// 会议标签
		tag_type(status) {
			switch (status) {
				case 0:
					return 'success';
				case 1:
					return 'primary';
				default:
					return 'warning';
			}
		},
		tag_text(status) {
			switch (status) {
				case -1:
					return '已取消';
				case 0:
					return '未开始';
				case 1:
					return '进行中';
				case 2:
					return '已结束';
				case 3:
					return '已过期';
			}
		},
		// 搜索
		async search() {
			// 搜索前要重置列表
			this.body.list = [];
			this.loading = true;
			await this.get_data();
			this.loading = false;
		},
		// 向下滚动时加载下一页
		next_page(e) {
			if (this.timer) {
				return;
			}
			this.timer = true;
			setTimeout(() => {
				this.timer = false;
				// 向下滚动才进行判断 如果当前页等于总页数则不查询
				if (e.wheelDelta < 0 && this.body.page < this.total_page) {
					// 滚动到底部一定距离加载下一页
					if (this.dom.scrollHeight - this.dom.clientHeight - this.dom.scrollTop <= 100) {
						this.body.page++;
						this.get_data();
					}
				}
			}, 700);
		},
		// 返回上一页
		turn_back() {
			window.location.href = `../meeting_platform/index.html?token=${this.token}`;
		},
	},
});
