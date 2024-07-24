let url = `${我是接口地址}/`;
// let url = 'http://192.168.30.45:9201/';
let meeting_url = `${url}api-portal/meeting/calender/search`; //会议日历

Vue.use(vant.Popup);
Vue.use(vant.DatetimePicker);

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		loading: false, //加载弹窗
		month: {
			time: null, //时间对象,切换月时结合日期发送请求
			text: '', //页面显示文字
			min_date: '', // 最小日期
			max_date: '', // 最大日期
		},
		week: {
			list: [], //所选月的所有天,以及对应星期、日期
			select: '', //所选日期
		},
		pop: {
			show: false, //选择器显示
			title: '选择年月', //选择器标题
		},
		meetings: [], //会议列表
		block_height: 12, //每小时行高
	},
	async mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
		} else {
			this.get_token();
		}
		this.resize();
		// 7点到23点总秒数 用于计算会议时间距离顶部位置
		this.total_time = (23 - 7) * 60 * 60;
		this.first_load = true;
		// 当前日期
		this.month.time = new Date();
		// 只能检索前后一年的
		this.month.min_date = new Date(`${this.month.time.getFullYear() - 1}/${this.month.time.getMonth() + 1}/${this.month.time.getDate()}`);
		this.month.max_date = new Date(`${this.month.time.getFullYear() + 1}/${this.month.time.getMonth() + 1}/${this.month.time.getDate()}`);
		this.init_month_text();
		this.init_week_day();
		this.$nextTick(() => {
			// 记录星期滚动节点
			this.week_box = document.getElementById('week_box');
			// 记录单个方块的宽度
			this.week_width = document.querySelector('.week').offsetWidth;
			// 加载完手动选中今天的日期
			this.select_day(this.week.list[this.month.time.getDate() - 1]);
			this.first_load = false;
		});
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
			window.location.href = `../meeting_platform/index.html?token=${this.token}`;
		},
		// 将时间对象处理成月份文字
		init_month_text() {
			this.month.text = `${this.month.time.getFullYear()}年${this.month.time.getMonth() + 1}月`;
		},
		// 生成整月天数
		init_week_day() {
			let d = this.month.time;
			// 计算当月多少天
			let m = d.getMonth() + 1;
			let total = new Date(d.getFullYear(), m, 0).getDate();
			this.week.list = [];
			// 取当月第一天的星期 之后取余得到对应星期
			let fd = new Date(`${d.getFullYear()}/${m}/1`); //注意是当天00点
			let fw = fd.getDay();
			// 取第一天的时间戳 计算后面的时间戳
			let ft = fd.getTime();
			for (let i = 1; i <= total; i++) {
				let t = {
					week: (fw + (i - 1)) % 7, //回显
					day: `${m}-${i}`, //回显、选中
					time: ft + (i - 1) * 24 * 60 * 60 * 1000, //用于判断是否是当天
					index: i - 1, //定位滚动条中的位置计算滚动距离
				};
				this.week.list.push(t);
			}
			// 判断是否是当前月 是则记录日期 将数组中对应星期改为今天
			this.is_cur_month = 0;
			let nd = new Date();
			if (d.getFullYear() === nd.getFullYear() && m === nd.getMonth() + 1) {
				this.is_cur_month = new Date(`${nd.getFullYear()}/${nd.getMonth() + 1}/${nd.getDate()}`).getTime();
				if (!this.first_load) {
					// 如果是当月 每次初始化星期数组后要将选中日期改为今天
					this.select_day(this.week.list[new Date().getDate() - 1]);
				}
			} else {
				if (!this.first_load) {
					// 如果不是当月 则取第一天
					this.select_day(this.week.list[0]);
				}
			}
		},
		// 生成星期
		init_week(obj) {
			// 先判断是否是否是当月
			if (this.is_cur_month && this.is_cur_month === obj.time) {
				return '今天';
			}
			switch (obj.week) {
				case 0:
					return '周日';
				case 1:
					return '周一';
				case 2:
					return '周二';
				case 3:
					return '周三';
				case 4:
					return '周四';
				case 5:
					return '周五';
				case 6:
					return '周六';
			}
		},
		// 选择对应天
		select_day(obj) {
			this.week.select = obj;
			// 查询会议
			this.get_meeting();
			// 每次选完重置位置
			this.init_day_position();
		},
		// 选中天数要在clientWidth中居中
		init_day_position() {
			// 滚动条最大距离
			let max = this.week_box.scrollWidth - this.week_box.clientWidth;
			// 计算偏移距离
			let offset_w = this.week_box.clientWidth / 2 - this.week_width / 2;
			// 计算当前选中日期左边距
			let total_left = this.week.select.index * this.week_width;
			// 计算移动到可视区域中间滚动距离
			let sl = total_left - offset_w;
			// 首尾附近的节点无法移动到中间
			// 因此计算得的滚动距离既不能比0小 也不能比max大
			if (sl >= 0 && sl <= max) {
				this.week_box.scrollLeft = sl;
			} else {
				// 如果不能居中也要滚动到尽头
				if (sl < 0) {
					this.week_box.scrollLeft = 0;
				} else if (sl > max) {
					this.week_box.scrollLeft = max;
				}
			}
		},
		// 格式化选择器文字
		month_format(type, value) {
			if (type === 'year') {
				return `${value}年`;
			} else if (type === 'month') {
				return `${value}月`;
			}
			return value;
		},
		// 显示弹窗
		show_pop() {
			this.pop.show = true;
		},
		// 选择器确认
		picker_select(obj) {
			this.month.time = obj;
			this.init_month_text();
			this.init_week_day();
			this.pop.show = false;
			this.get_meeting();
		},
		// 查询日期下会议
		async get_meeting() {
			// 查询所选日期会议
			this.meetings = [];
			this.loading = true;
			let date = new Date(this.week.select.time);
			let y = date.getFullYear();
			let m = date.getMonth() + 1;
			let d = date.getDate();
			let st = `${y}-${m}-${d} 06:00:00`;
			let et = `${y}-${m}-${d} 23:00:00`;
			let { data: res } = await this.request('post', meeting_url, this.token, { queryType: 3, startTime: st, endTime: et });
			this.loading = false;
			let list = Object.entries(res.data);
			if (res.head.code !== 200 || !list.length) {
				return;
			}
			let list2 = list[0][1]; // 返回数据是 date:[{},...]的形式
			for (let val of list2) {
				let t = {
					start: val.startTime.split(' ')[1],
					end: val.endTime.split(' ')[1],
					name: val.theme,
					id: val.id,
				};
				this.meetings.push(t);
			}
		},
		// 会议容器距离顶部位置
		meeting_top(obj) {
			let s = obj.start.split(':');
			// 距离顶部位置跟开始时间和总时间相关
			let top = (Number(s[0]) - 7) * 60 * 60 + Number(s[1]) * 60;
			let e = obj.end.split(':');
			// 高度跟会议时间差值相关
			let height = (Number(e[0]) - Number(s[0])) * 60 * 60 + (Number(e[1]) - Number(s[1])) * 60;
			return {
				top: (top / this.total_time) * 100 + '%',
				height: (height / this.total_time) * 16 * this.block_height + 'rem',
			};
		},
		// 跳转模块
		turn_to_page(type, params) {
			switch (type) {
				case '会议详情':
					window.location.href = `../meeting_detail/index.html?token=${this.token}&id=${params}&prePage=meeting_calendar`;
					break;
			}
		},
	},
});
