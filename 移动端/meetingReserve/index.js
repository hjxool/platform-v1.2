// let url = `${我是接口地址}/`;
// let search_meeting_url = `${url}api-portal/meeting/list`; //查询会议列表
let url = 'http://192.168.30.45:9201';
let room_url = `${url}/api-portal/room/list/all`; //查询会议室列表
let meeting_type_url = `${url}/api-portal/meeting-type/search`; //查询会议室类型
let token = '1dcdfb21-b115-4a10-93e0-88a107e2b00a';

Vue.use(vant.Step);
Vue.use(vant.Steps);
Vue.use(vant.Picker);
Vue.use(vant.Popup);
Vue.use(vant.DatetimePicker);

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		loading: false, //加载弹窗
		step: {
			cur: 1, //当前进行到第几步
			steps: ['进行中', '通知配置', '模板配置'],
		},
		form: {
			theme: '', //会议主题
			room: '', //会议室
			type: '', //会议类型id
			start_date: '', //开始年月日
			start_time: '', //开始时间
			end_date: '',
			end_time: '',
		},
		meeting_type: [], //会议类型
		picker: {
			title: '会议室', //选择器标题
			show: false, //显示
			options: [], //选项
			type: '', //弹窗类型
			date: null, //日期对象
			min_date: null, //最小日期 当天
			url: '', //iframe地址
		},
	},
	async mounted() {
		this.resize();
		this.picker.min_date = new Date();
		try {
			this.loading = true;
			await this.get_room();
			await this.get_meeting_type();
			this.loading = false;
		} catch (error) {}
	},
	methods: {
		// 浏览器大小改变后执行方法
		resize() {
			let dom = document.documentElement;
			let width = dom.clientWidth;
			let ratio = Math.round((width / 720) * 100) / 100; // 取小数点后两位
			dom.style.fontSize = ratio * 10 + 'px'; //以720分辨率下字体大小10px为基准
		},
		// 步骤名
		step_name(name, index) {
			switch (true) {
				case this.step.cur === index:
					return '进行中';
				case this.step.cur < index:
					return name;
				case this.step.cur > index:
					return '已完成';
			}
		},
		// 下一步 校验
		next_step() {
			switch (this.step.cur) {
				case 0:
					if (!this.form.theme) {
						vant.Toast('会议名不能为空');
						return;
					}
					if (!this.form.room) {
						vant.Toast('会议室不能为空');
						return;
					}
					if (!this.form.start_date || !this.form.start_time || !this.form.end_date || !this.form.end_time) {
						vant.Toast('时间不能为空');
						return;
					}
					let start = new Date(`${this.form.start_date} ${this.form.start_time}`).getTime();
					let end = new Date(`${this.form.end_date} ${this.form.end_time}`).getTime();
					if (end <= start) {
						vant.Toast('开始时间不能大于结束时间');
						return;
					}
					break;
			}
			this.step.cur++;
		},
		// 根据表单填入不同选项
		show_picker(type) {
			// 记录打开弹窗类型 在确认时区分执行方法
			this.picker.type = type;
			this.picker.show = true;
			switch (type) {
				case 'room':
					this.picker.title = '会议室';
					this.picker.options = this.rooms;
					break;
				case 'start_date':
					this.picker.date = this.form.start_date ? new Date(this.form.start_date) : '';
					break;
				case 'end_date':
					this.picker.date = this.form.end_date ? new Date(this.form.end_date) : '';
					break;
				case 'start_time':
					this.picker.date = this.form.start_time ? new Date(`${this.form.start_date} ${this.form.start_time}`) : '';
					break;
				case 'end_time':
					this.picker.date = this.form.end_date ? new Date(`${this.form.end_date} ${this.form.end_time}`) : '';
					break;
				case 'add_person':
					// this.picker.url = `../../index.html?type=app_add_person&token=${token}`;
					this.picker.url = `../add_person/index.html?token=${token}`;
					this.$nextTick(() => {
						let list = [];
						// for (let val of this.new_meeting_form[type === 'join' ? 'search_person' : 'emcee']) {
						// 	let t = {
						// 		id: val.id,
						// 		name: val.name,
						// 		type: 'person',
						// 	};
						// 	list.push(t);
						// }
						document.querySelector('#pop_window').contentWindow.postMessage(list);
					});
					break;
			}
		},
		// 选择器确认
		picker_confirm(value) {
			this.picker.show = false;
			switch (this.picker.type) {
				case 'room':
					this.form.room = value;
					break;
				case 'start_date':
				case 'end_date':
					this.form[this.picker.type] = `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}`;
					break;
				case 'start_time':
				case 'end_time':
					this.form[this.picker.type] = value;
					break;
			}
		},
		// 查询会议室
		async get_room() {
			let { data } = await this.request('post', room_url, token);
			if (data.head.code !== 200) {
				return;
			}
			this.rooms = [];
			for (let val of data.data) {
				let t = {
					text: val.roomName,
					value: val.id,
				};
				this.rooms.push(t);
			}
		},
		// 查询会议室类型
		async get_meeting_type() {
			let { data } = await this.request('post', meeting_type_url, token, {
				condition: {
					status: true,
				},
				pageNum: 1,
				pageSize: 900,
			});
			if (data.head.code !== 200) {
				return;
			}
			this.meeting_type = data.data.data;
			for (let val of this.meeting_type) {
				if (val.isDefault) {
					this.form.type = val.id;
					break;
				}
			}
		},
	},
});
