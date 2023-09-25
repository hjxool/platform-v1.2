let url = `${我是接口地址}/`;
let get_device_url = `${url}api-portal/publish/device/getAllDevice`; // 获取设备列表
let get_today_url = `${url}api-portal/publish/device/getDeviceTimeSlot/toDay`; // 获取今天的排期
let get_tomorrow_url = `${url}api-portal/publish/device/getDeviceTimeSlot/tomorrow`; // 获取明天排期
let sendCmdtoDevice = url + 'api-device/device/operation'; // 下发指令
let get_device_status_url = `${url}api-device/device/status`; // 获取设备状态
let limits_url = `${url}api-user/menus/current`; //获取菜单权限
let current_task_url = `${url}api-portal/video/rule/currentTask`; //根据设备ID获取拉流设备当前的任务

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			status_options: [
				{ label: '全部', value: 0 },
				{ label: '在线', value: 1 },
				{ label: '离线', value: 2 },
			], // 筛选状态
			cur_status: 0, // 当前所选状态
			page_loading: true, // 页面加载
			control_show: false, // 控制弹窗显示
			control_loading: false, // 控制下发遮罩
			control_button: false, // 控制按钮点击频率
			play_ctrl_show: false, //单个资源且只有音视频和文档才显示
		},
		cur_task_name: '', //当前任务名
		cur_play_source: '', //当前播放资源
		table: {
			data: [], // 表格数据
			h: 0, // 表格最大高度
			total: 0, // 数据总数
			page_size: 20, // 单页显示数目
			cur_page: 1, // 当前页
		},
		schedule: {
			show: false, // 排期弹窗显示
			loading: true, // 排期加载
			title: '', // 设备名
			active: '', // 切换标签页
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
		config: {
			schedule_show: false,
			control_show: false,
		},
		play_ctrl: {
			total: 0, // 播放总长
			current: 0, //音视频的alreadyPlaySeconds表示当前播放进度 文档的alreadyPlaySeconds表示正在播放的图片的时间
			status: 'pause', //播放暂停按钮状态显示
		},
	},
	async mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
		} else {
			this.get_token();
		}
		if (!sessionStorage.hushanwebmenuTree) {
			await this.request('get', limits_url, this.token, (res) => {
				if (res.data.head.code !== 200) {
					return;
				}
				sessionStorage.hushanwebmenuTree = JSON.stringify(res.data.data.menuTree);
			});
		}
		// 解析权限树
		let limits;
		for (let val of JSON.parse(sessionStorage.hushanwebmenuTree)) {
			if (val.path === '智慧信息发布') {
				for (let val2 of val.subMenus) {
					if (val2.path === '智慧信息发布_屏幕管理') {
						limits = val2.subMenus;
						break;
					}
				}
				break;
			}
		}
		this.config.schedule_show = this.is_element_show(limits, '查看排期');
		this.config.control_show = this.is_element_show(limits, '控制');

		this.get_data();
		this.resize();
		window.onresize = () => {
			this.resize();
		};
		this.total_time_s = 24 * 60 * 60; // 用于计算定位的一天时间秒数
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
		resize() {
			// 计算根节点子体大小
			let dom = document.documentElement;
			let width = dom.clientWidth;
			let ratio = Math.floor((width / 1920) * 100 + 0.5) / 100;
			dom.style.fontSize = ratio * 20 + 'px';
			this.$nextTick(() => {
				this.table.h = document.querySelector('.body').clientHeight;
			});
		},
		// 获取数据
		get_data() {
			this.request('get', get_device_url, this.token, (res) => {
				console.log('设备', res);
				this.html.page_loading = false;
				if (res.data.head.code !== 200) {
					return;
				}
				let data = res.data.data;
				// 以下是存储总数居和不同状态数据
				this.total = [];
				this.online = [];
				this.offline = [];
				this.total_count = 0;
				this.online_count = 0; // 计数 每达到page_size个就分页
				this.offline_count = 0;
				for (let val of data) {
					this.total_count++;
					if (this.total_count % 20 === 1) {
						this.total.push([]);
					}
					this.total[this.total.length - 1].push(val);
					switch (val.status) {
						case '在线':
							this.online_count++;
							if (this.online_count % 20 === 1) {
								this.online.push([]);
							}
							// 如果不能整除 往末尾数组加入
							this.online[this.online.length - 1].push(val);
							break;
						case '离线':
							this.offline_count++;
							if (this.offline_count % 20 === 1) {
								this.offline.push([]);
							}
							this.offline[this.offline.length - 1].push(val);
							break;
					}
				}
				this.table.cur_page = 1;
				this.html.cur_status = 0;
				// 每次查完数据回到状态全部
				this.table.data = this.total[0];
				this.table.total = this.total_count;
			});
		},
		// 切换数据源 切换后回到第一页
		switch_data(option) {
			this.table.cur_page = 1;
			switch (option) {
				case 0:
					this.table.data = this.total[0];
					this.table.total = this.total_count;
					break;
				case 1:
					this.table.data = this.online[0];
					this.table.total = this.online_count;
					break;
				case 2:
					this.table.data = this.offline[0];
					this.table.total = this.offline_count;
					break;
			}
		},
		// 切页
		pagination(page) {
			this.table.cur_page = page;
			switch (this.html.cur_status) {
				case 0:
					this.table.data = this.total[page - 1];
					break;
				case 1:
					this.table.data = this.online[page - 1];
					break;
				case 2:
					this.table.data = this.offline[page - 1];
					break;
			}
		},
		// 显示设备档期
		show_schedule(obj) {
			this.schedule.show = true;
			this.schedule.title = obj.deviceName;
			this.schedule.active = 'today';
			this.schedule.loading = true;
			this.device_id = obj.id;
			this.get_day_data(this.schedule.active);
		},
		// 获取设备当天数据
		get_day_data(params) {
			let url = params == 'today' ? get_today_url : get_tomorrow_url;
			url = `${url}?deviceId=${this.device_id}`;
			this.schedule.left_list = [];
			this.schedule.right_list = [];
			this.request('get', url, this.token, (res) => {
				console.log('排期', res.data);
				this.schedule.loading = false;
				if (res.data.head.code !== 200) {
					return;
				}
				for (let val of res.data.data) {
					let t = {
						name: val.planName,
					};
					this.schedule.left_list.push(t);
					this.schedule.right_list.push([]);
					let t2 = this.schedule.right_list[this.schedule.right_list.length - 1];
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
		// 详情定位
		detail_style() {
			return {
				top: this.schedule.pop_top + 'px',
				left: this.schedule.pop_left + 'px',
			};
		},
		// 悬浮显示详情 定位并判断边界问题
		schedule_detail(obj, row, col) {
			// 获取对应节点 计算高度、边距
			let dom = document.querySelectorAll('.box2_2')[row];
			let dom2 = dom.querySelectorAll('.box2_2_1')[col];
			this.schedule.pop_top = dom.offsetTop + dom2.offsetTop + dom2.offsetHeight;
			this.schedule.pop_left = dom2.offsetLeft;
			this.schedule.pop_show = true;
			this.schedule.pop.name = obj.name;
			let t = new Date();
			this.schedule.pop.start_time = `${t.getFullYear()}/${t.getMonth() + 1}/${t.getDate()} ${obj.start_time}`;
			this.schedule.pop.end_time = `${t.getFullYear()}/${t.getMonth() + 1}/${t.getDate()} ${obj.end_time}`;
			this.$nextTick(() => {
				// 计算挂载到页面上弹窗的宽度 加上 父元素的偏移量是否大于总容器宽度
				let dom3 = document.querySelector('.detail');
				let width = dom3.offsetWidth;
				let total_width = dom.clientWidth;
				if (width + this.schedule.pop_left > total_width) {
					this.schedule.pop_left = total_width - width;
				}
			});
		},
		// 展示控制弹窗 显示当前播放任务
		async control_show(id) {
			this.html.control_show = true;
			this.device_id = id;
			this.html.control_loading = true;
			this.cur_task_name = '空';
			this.cur_play_source = '空';
			let res = await this.get_device_status();
			await this.get_current_task(res);
			// 如果设备当前在播放状态 则设置定时器
			if (this.play_ctrl.status === 'play') {
				this.add_cur_play_time();
			}
			this.html.control_loading = false;
		},
		// 定时器 间隔1秒增加当前播放时间
		add_cur_play_time() {
			this.play_timer = setInterval(() => {
				if (this.play_ctrl.current < this.play_ctrl.total) {
					this.play_ctrl.current++;
				} else {
					// 播放结束 从头开始播放
					this.play_ctrl.current = 0;
					this.send_order('seekto', this.play_ctrl.current);
				}
			}, 1000);
		},
		// 获取设备状态
		get_device_status() {
			return this.request('get', `${get_device_status_url}/${this.device_id}`, this.token, (res) => {
				if (res.data.head.code !== 200) {
					return;
				}
				let data = res.data.data.properties.currentTask.propertyValue;
				this.cur_task_name = data.taskName.propertyValue || '空';
				this.cur_play_source = data.resName.propertyValue || '空';
			});
		},
		// 获取设备当前任务
		get_current_task(params) {
			this.html.play_ctrl_show = false;
			return this.request('get', `${current_task_url}/${this.device_id}`, this.token, (res) => {
				if (res.data.head.code !== 200 || res.data.data === null) {
					return;
				}
				let data = res.data.data;
				if (data.taskType === 4 && data.taskMap.playList?.length === 1) {
					// 0播放 1暂停
					let data2 = params.data.data.properties.pause.propertyValue;
					this.play_ctrl.status = data2 ? 'pause' : 'play';
					// 只有类型4的才可以控制 且播放列表长度为1
					let task = data.taskMap.playList[0];
					if (task.fileType !== 4) {
						// 4是图片 除此以外都可以播放
						this.html.play_ctrl_show = true;
						this.play_ctrl.total = parseInt(task.oneCycleDuration);
						if (task.fileTypeString === '文档') {
							// 文档 duration表示单个图片停留时长 docCurrentPlayIndex表示当前播放图片索引(从0开始) alreadyPlaySeconds表示当前索引播放时长
							this.play_ctrl.current = parseInt(task.docCurrentPlayIndex) * parseInt(task.duration) + parseInt(task.alreadyPlaySeconds);
						} else {
							this.play_ctrl.current = parseInt(task.alreadyPlaySeconds);
						}
					}
				}
			});
		},
		// 控制按钮点击频率
		throttle(key, ...params) {
			if (this.html.control_button) {
				this.$message('点的太快啦！');
				return;
			}
			this.html.control_button = true; // 点击进来就会置为禁止
			this.send_order(key, ...params);
			setTimeout(() => {
				this.html.control_button = false;
			}, 1500);
		},
		// 下发指令 设置属性
		send_order(key, ...params) {
			let topic = 8;
			let body = {
				contentType: 0,
				contents: [{ deviceId: this.device_id, attributes: {} }],
			};
			body.contents[0].attributes[key] = params[0];
			// this.html.control_loading = true;
			this.request('put', `${sendCmdtoDevice}/${topic}`, this.token, body, (res) => {
				// this.html.control_loading = false;
				if (res.data.head.code !== 200) {
					return;
				}
			});
		},
		// 关闭控制弹窗 并清除定时器
		close_ctrl() {
			this.html.control_show = false;
			clearInterval(this.play_timer);
		},
		// 控制播放
		ctrl_play() {
			// 先变状态再判断
			this.play_ctrl.status = this.play_ctrl.status === 'play' ? 'pause' : 'play';
			if (this.play_ctrl.status === 'pause') {
				clearInterval(this.play_timer);
			} else {
				this.add_cur_play_time();
			}
			this.send_order('pause', this.play_ctrl.status === 'play' ? 0 : 1);
		},
		// 鼠标按下就跳到对应百分比 并在鼠标任意位置抬起时发送请求
		process_change(e) {
			let dom = this.$refs.play_process;
			let clickP = e.clientX; // 记录点击坐标 计算移动距离
			let startP = e.clientX - dom.getBoundingClientRect().left;
			// 因为只会在可点击范围触发事件所以不用判断点击边界
			let per = Math.round((startP / dom.offsetWidth) * 1000) / 10;
			// 只修改百分比 定时器累加的秒数就会对不上
			this.play_ctrl.current = Math.round((per / 100) * this.play_ctrl.total);
			document.onmousemove = (me) => {
				let offset = clickP - me.clientX;
				let moveP = startP - offset;
				if (moveP > dom.offsetWidth) {
					moveP = dom.offsetWidth;
				}
				if (moveP < 0) {
					moveP = 0;
				}
				let per2 = Math.round((moveP / dom.offsetWidth) * 1000) / 10;
				this.play_ctrl.current = Math.round((per2 / 100) * this.play_ctrl.total);
			};
			document.onmouseup = (ue) => {
				document.onmousemove = null;
				document.onmouseup = null;
				this.send_order('seekto', this.play_ctrl.current);
			};
		},
	},
	computed: {
		// 分钟(补零):秒(补零)
		play_cur_text() {
			let m = Math.floor(this.play_ctrl.current / 60);
			m = m < 10 ? '0' + m : m;
			let s = this.play_ctrl.current % 60;
			s = s < 10 ? '0' + s : s;
			return `${m}:${s}`;
		},
		play_total_text() {
			let m = Math.floor(this.play_ctrl.total / 60);
			m = m < 10 ? '0' + m : m;
			let s = this.play_ctrl.total % 60;
			s = s < 10 ? '0' + s : s;
			return `${m}:${s}`;
		},
		// 进度条百分比
		play_percent() {
			let per = Math.round((this.play_ctrl.current / this.play_ctrl.total) * 1000) / 10;
			return per;
		},
	},
});
