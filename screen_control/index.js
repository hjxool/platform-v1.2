let url = `${我是接口地址}/`;
let sendCmdtoDevice = url + 'api-device/device/operation'; // 下发指令
let get_device_status_url = `${url}api-device/device/status`; // 获取设备状态
let current_task_url = `${url}api-portal/video/rule/currentTask`; //根据设备ID获取拉流设备当前的任务

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		cur_task_name: '', //当前任务名
		cur_play_source: '', //当前播放资源
		total: 0, // 播放总长
		current: 0, //音视频的alreadyPlaySeconds表示当前播放进度 文档的alreadyPlaySeconds表示正在播放的图片的时间
		status: 'pause', //播放暂停按钮状态显示
		volume: 0, // 音量
		play_ctrl_show: false, //单个资源且只有音视频和文档才显示
		loading: false,
		亮屏: 0,
	},
	async mounted() {
		this.get_token();
		this.loading = true;
		await this.get_current_task(await this.get_device_status());
		// 如果设备当前在播放状态 则设置定时器
		if (this.status === 'play') {
			this.add_cur_play_time();
		}
		this.loading = false;
	},
	methods: {
		// 获取设备状态
		get_device_status() {
			return this.request('get', `${get_device_status_url}/${this.id}`, this.token, (res) => {
				if (res.data.head.code !== 200) {
					return;
				}
				let data = res.data.data.properties.currentTask.propertyValue;
				this.cur_task_name = data.taskName.propertyValue || '空';
				this.cur_play_source = data.resName.propertyValue || '空';
				this.volume = Number(res.data.data.properties.volume.propertyValue); // 当前音量
				this.亮屏 = res.data.data.properties.turnBacklight.propertyValue;
			});
		},
		// 获取设备当前任务
		get_current_task(params) {
			return this.request('get', `${current_task_url}/${this.id}`, this.token, (res) => {
				if (res.data.head.code !== 200 || res.data.data === null) {
					return;
				}
				let data = res.data.data;
				if (data.taskType === 4 && data.taskMap.playList?.length === 1) {
					// 0播放 1暂停
					let data2 = params.data.data.properties.pause.propertyValue;
					this.status = data2 ? 'pause' : 'play';
					// 只有类型4的才可以控制 且播放列表长度为1
					let task = data.taskMap.playList[0];
					if (task.fileType !== 4) {
						// 4是图片 除此以外都可以播放
						this.play_ctrl_show = true;
						this.total = parseInt(task.oneCycleDuration);
						if (task.fileTypeString === '文档') {
							// 文档 duration表示单个图片停留时长 docCurrentPlayIndex表示当前播放图片索引(从0开始) alreadyPlaySeconds表示当前索引播放时长
							this.current = parseInt(task.docCurrentPlayIndex) * parseInt(task.duration) + parseInt(task.alreadyPlaySeconds);
						} else {
							this.current = parseInt(task.alreadyPlaySeconds);
						}
					}
				}
			});
		},
		// 定时器 间隔1秒增加当前播放时间
		add_cur_play_time() {
			this.play_timer = setInterval(() => {
				if (this.current < this.total) {
					this.current++;
				} else {
					// 播放结束 从头开始播放
					this.current = 0;
					this.send_order('seekto', this.current);
					clearInterval(this.play_timer);
				}
			}, 1000);
		},
		// 下发指令 设置属性
		send_order(key, value, service) {
			let topic = service ? 11 : 8;
			let body = {
				contentType: service ? 2 : 0,
				contents: [{ deviceId: this.id, attributes: {} }],
			};
			if (service) {
				body.contents[0].identifier = service;
			}
			body.contents[0].attributes[key] = value;
			this.request('put', `${sendCmdtoDevice}/${topic}`, this.token, body);
		},
		// 控制按钮点击频率
		throttle(key, ...params) {
			if (this.control_timer) {
				this.$message('点击太快');
				if (key === 'turnBacklight') {
					this.亮屏 = this.亮屏 ? 0 : 1;
				}
				return;
			}
			this.control_timer = true; // 点击进来就会置为禁止
			this.send_order(key, ...params);
			setTimeout(() => {
				this.control_timer = false;
			}, 1500);
		},
		// 控制播放
		ctrl_play() {
			// 先变状态再判断
			this.status = this.status === 'play' ? 'pause' : 'play';
			if (this.status === 'pause') {
				clearInterval(this.play_timer);
			} else {
				this.add_cur_play_time();
			}
			this.send_order('pause', this.status === 'play' ? 0 : 1);
		},
		// 鼠标按下就跳到对应百分比 并在鼠标任意位置抬起时发送请求
		process_change(e) {
			let dom = this.$refs.play_process;
			let clickP = e.clientX; // 记录点击坐标 计算移动距离
			let startP = e.clientX - dom.getBoundingClientRect().left;
			// 因为只会在可点击范围触发事件所以不用判断点击边界
			let per = Math.round((startP / dom.offsetWidth) * 1000) / 10;
			// 只修改百分比 定时器累加的秒数就会对不上
			this.current = Math.round((per / 100) * this.total);
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
				this.current = Math.round((per2 / 100) * this.total);
			};
			document.onmouseup = (ue) => {
				document.onmousemove = null;
				document.onmouseup = null;
				this.send_order('seekto', this.current);
			};
		},
	},
	computed: {
		// 分钟(补零):秒(补零)
		play_cur_text() {
			let m = Math.floor(this.current / 60);
			m = m < 10 ? '0' + m : m;
			let s = this.current % 60;
			s = s < 10 ? '0' + s : s;
			return `${m}:${s}`;
		},
		play_total_text() {
			let m = Math.floor(this.total / 60);
			m = m < 10 ? '0' + m : m;
			let s = this.total % 60;
			s = s < 10 ? '0' + s : s;
			return `${m}:${s}`;
		},
		// 进度条百分比
		play_percent() {
			let per = Math.round((this.current / this.total) * 1000) / 10;
			return per;
		},
	},
});
