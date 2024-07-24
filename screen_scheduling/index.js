let url = `${我是接口地址}/`;
let get_today_url = `${url}api-portal/publish/device/getDeviceTimeSlot/toDay`; // 获取今天的排期
let get_tomorrow_url = `${url}api-portal/publish/device/getDeviceTimeSlot/tomorrow`; // 获取明天排期
new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		loading: false,
		active: 'today', // 切换标签页
		left_list: [], // 左边栏素材列表
		right_list: [], // 右边时间列表
		pop_show: false, //详情弹窗显示
		pop_left: 0, // 详情窗偏移量
		pop_top: 0, // 详情窗偏移量
		pop: {
			name: '', // 发布名称
			start_time: '', // 开始时间
			end_time: '', // 结束时间
		},
	},
	mounted() {
		this.get_token();
		this.total_time_s = 24 * 60 * 60; // 用于计算定位的一天时间秒数
		this.get_day_data(this.active);
		this.resize();
		window.onresize = () => {
			this.resize();
		};
	},
	methods: {
		// 获取设备当天数据
		get_day_data(params) {
			let url = params == 'today' ? get_today_url : get_tomorrow_url;
			url = `${url}?deviceId=${this.id}`;
			this.left_list = [];
			this.right_list = [];
			this.loading = true;
			this.request('get', url, this.token, (res) => {
				this.loading = false;
				if (res.data.head.code !== 200) {
					return;
				}
				for (let val of res.data.data) {
					let t = {
						name: val.planName,
					};
					this.left_list.push(t);
					this.right_list.push([]);
					let t2 = this.right_list[this.right_list.length - 1];
					// 一行有几个对象
					for (let val2 of val.taskTimeSlots) {
						t2.push(this.init_data(val2, val));
					}
				}
			});
		},
		// 包含当前对象的纵轴开始结束位置坐标、按顺序排布不同色块、详情
		init_data(obj1, obj2) {
			// 详情
			let t = {
				name: obj2.planName,
				file_type: obj2.fileType,
				start_time: obj1.startTime,
				end_time: obj1.endTime,
			};
			//  确定当前对象开始结束位置
			let s = obj1.startTime.split(':'); // 取出时分秒用于计算
			let e = obj1.endTime.split(':');
			let s2 = 0;
			let e2 = 0;
			let i2 = 0;
			for (let i = 2; i >= 0; i--) {
				s2 += Number(s[i2]) * Math.pow(60, i);
				e2 += Number(e[i2]) * Math.pow(60, i);
				i2++;
			}
			// 计算相对容器的百分比位置
			t.left = Math.floor((s2 / this.total_time_s) * 1000 + 0.5) / 10;
			// 计算宽度
			t.width = Math.floor(((e2 - s2) / this.total_time_s) * 1000 + 0.5) / 10;
			// 检索每一个可用、不可用数组看是否在当前时间区间
			t.list = [];
			if (obj2.availableTaskTimeSlot) {
				for (let val of obj2.availableTaskTimeSlot) {
					let k = val.startTime.split(':');
					let k2 = Number(k[0]) * 60 * 60 + Number(k[1]) * 60 + Number(k[2]);
					let left = Math.floor(((k2 - s2) / (e2 - s2)) * 1000 + 0.5) / 10;
					let k3 = val.endTime.split(':');
					let k4 = Number(k3[0]) * 60 * 60 + Number(k3[1]) * 60 + Number(k3[2]);
					let width = Math.floor(((k4 - k2) / (e2 - s2)) * 1000 + 0.5) / 10;
					t.list.push({
						left: left,
						width: width,
					});
				}
			}
			return t;
		},
		resize() {
			// 计算根节点子体大小
			let dom = document.documentElement;
			let width = dom.clientWidth;
			let ratio = Math.floor((width / 1400) * 100 + 0.5) / 100;
			dom.style.fontSize = ratio * 20 + 'px';
		},
		// 行定位
		row_style(index) {
			return {
				top: index * 6 + 'rem',
			};
		},
		// 列定位
		col_style(obj) {
			return {
				left: obj.left + '%',
				width: obj.width + '%',
			};
		},
		// 悬浮显示详情 定位并判断边界问题
		schedule_detail(obj, row, col) {
			// 获取对应节点 计算高度、边距
			let dom = document.querySelectorAll('.box2_2')[row];
			let dom2 = dom.querySelectorAll('.box2_2_1')[col];
			this.pop_top = dom.offsetTop + dom2.offsetTop + dom2.offsetHeight;
			this.pop_left = dom2.offsetLeft;
			this.pop_show = true;
			this.pop.name = obj.name;
			let t = new Date();
			this.pop.start_time = `${t.getFullYear()}/${t.getMonth() + 1}/${t.getDate()} ${obj.start_time}`;
			this.pop.end_time = `${t.getFullYear()}/${t.getMonth() + 1}/${t.getDate()} ${obj.end_time}`;
			this.$nextTick(() => {
				// 计算挂载到页面上弹窗的宽度 加上 父元素的偏移量是否大于总容器宽度
				let dom3 = document.querySelector('.detail');
				let width = dom3.offsetWidth;
				let total_width = dom.clientWidth;
				if (width + this.pop_left > total_width) {
					this.pop_left = total_width - width;
				}
			});
		},
		// 详情定位
		detail_style() {
			return {
				top: this.pop_top + 'px',
				left: this.pop_left + 'px',
			};
		},
	},
});
