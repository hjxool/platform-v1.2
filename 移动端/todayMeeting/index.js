// let url = `${我是接口地址}/`;
// let search_meeting_url = `${url}api-portal/meeting/list`; //查询会议列表

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			loading: false, //页面加载
		},
		total_size: 0, //总条目
		calendar: {
			title_year: '', // 年月抬头
			title_month: '', // 年月抬头
			days: [], // 当月天组成的数组
			weeks: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
			select_day: 1, //选择的日期
			pre_day: 0, // 分界索引 上个月的日期要渲染成灰色
			next_day: 0, // 分界索引 下个月的日期要渲染成灰色
			today_year: 0, // 当天的年月日对应的日期要改成 今
			today_month: 0,
			today_day: 0,
		},
		body: {
			size: 10, //单页显示数量
			cur_op: '0,1,2', // 当前所选项
			list: [], // 会议列表
		},
	},
	mounted() {
		this.resize();
		let d = new Date();
		this.calendar.today_year = d.getFullYear();
		this.calendar.today_month = d.getMonth() + 1;
		this.calendar.today_day = d.getDate();
		this.get_day_list(d);
	},
	methods: {
		// 浏览器大小改变后执行方法
		resize() {
			let dom = document.documentElement;
			let width = dom.clientWidth;
			let ratio = Math.round((width / 720) * 100) / 100; // 取小数点后两位
			dom.style.fontSize = ratio * 10 + 'px'; //以1920分辨率下字体大小20px为基准
		},
		// 日期文字
		day_text(day) {
			if (this.calendar.today_year === this.calendar.title_year && this.calendar.today_month === this.calendar.title_month && this.calendar.today_day === day) {
				return '今';
			} else {
				return day;
			}
		},
		// 计算时间
		get_day_list(time_obj) {
			this.calendar.title_year = time_obj.getFullYear();
			this.calendar.title_month = time_obj.getMonth() + 1;
			let day = time_obj.getDate();
			// 推算传入时间当月1号的时间
			if (day > 1) {
				let t = time_obj.getTime() - (day - 1) * 24 * 60 * 60 * 1000;
				time_obj = new Date(t);
			}
			let week = time_obj.getDay(); // 获取当月1号是周几
			// 反推这周周日的日期
			let pre_month_t = time_obj.getTime() - week * 24 * 60 * 60 * 1000;
			let pre_month = new Date(pre_month_t);
			this.calendar.days = [];
			for (let index = 0; index < week; index++) {
				let t = pre_month.getDate() + index;
				this.calendar.days.push(t);
			}
			this.calendar.pre_day = week; // 小于pre_day的索引改色
			let y = time_obj.getFullYear();
			let m = time_obj.getMonth() + 1;
			let total = new Date(y, m, 0).getDate(); // 获取当月总天数
			for (let index = 1; index <= total; index++) {
				this.calendar.days.push(index);
			}
			this.calendar.next_day = this.calendar.days.length - 1; // 大于next_day的索引改色
			// 表格是5 x 7的 所以用35 - month_block.length就是下个月要填入数组的个数
			let next_month_day = 35 - this.calendar.days.length;
			for (let index = 1; index <= next_month_day; index++) {
				this.calendar.days.push(index);
			}
			// 根据当月日期推算 处在列表中索引位置
			this.calendar.select_day = week - 1 + day;
		},
		// 选择当月月中某天
		select_day(index) {
			this.calendar.select_day = index;
			this.get_data(1);
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
				// 如果是当月 切换到对应日期
				this.get_day_list(new Date());
			} else {
				this.get_day_list(new Date(this.calendar.title_year, this.calendar.title_month - 1, 1));
			}
			// 切换月后重新查表
			this.get_data(1);
		},
	},
});
