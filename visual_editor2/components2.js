//进行中的会议
Vue.component('current_meeting', {
	template: `
    <div class="cur_meeting col_layout" :style="style(obj)">
      <img v-if="obj.data.backgroundImg" :src="obj.data.backgroundImg" class="bg_img">
      <div class="row_layout">
        <img src="./img/icon18.png" class="icon1">

        <span class="text1" :style="place_color">{{place_name||''}}</span>
      </div>

      <span class="text2" :style="theme_color">{{theme}}</span>

      <div class="box row_layout">
        <img src="./img/icon19.png" class="bg_img">

        <span class="text_ellipsis">下场会议：{{next_meeting}}</span>
      </div>
    </div>
  `,
	mixins: [fn],
	data() {
		return {
			place_id: this.obj.dataConfig.placeId || '',
			place_name: '', // 会议室名称
			roomMeetingInfo: null, //会议室会议详情
			theme: '无', // 会议名
			currentEndTime: '',
			next_meeting: '无', //下场会议
			// token: '',
			componentLoading: false,
			place_color: { color: this.obj.data.roomTextcolor || '' },
			theme_color: { color: this.obj.data.themeTextColor || '' },
		};
	},
	async mounted() {
		// this.get_token();
		this.getMeetingRoomInfo();
		await this.getMeetingInfo();
		window.addEventListener('message', function (event) {
			console.log(event.data);
		});
		setInterval(() => {
			this.getMeetingRoomInfo();
		}, 60000);
	},
	methods: {
		//获取token
		get_token() {
			if (window.sessionStorage.token) {
				this.token = window.sessionStorage.token;
				return;
			}
			let temp = location.search.substring(1).split('&');
			console.log(temp);
			for (var i = 0; i < temp.length; i++) {
				let key = temp[i].split('=')[0];
				let value = temp[i].split('=')[1];
				if (key.indexOf('token') != -1) {
					this.token = value;
					window.sessionStorage.token = this.token;
				} else if (key.indexOf('pageflag' != -1)) {
					this.pageFlag = value;
				}
			}
			let url = location.href.split('?')[0];
			history.replaceState('', '', url);
			this.preparing = true;
		},
		//post请求
		requestPost(method, url, token, data, func) {
			fetch(url, {
				method: method,
				headers: {
					Authorization: `Bearer ${token}`,
					'content-type': 'application/json',
				},
				body: data,
			})
				.then((response) => response.json())
				.then((res) => {
					window.parent.postMessage({
						type: 'Popover mask',
						msg: '',
					});
					window.parent.postMessage({
						type: 'Loading off',
					});
					if (res.head.code == 200) {
						if (typeof func === 'function') {
							func(res);
						}
					} else if (res.head.code == 401) {
						this.$alert(res.head.message, '提示', {
							confirmButtonText: '确定',
							callback: () => {
								window.parent.parent.parent.postMessage({
									type: 'log_out',
								});
							},
						});
					} else {
						this.$alert(res.head.message, '提示', {
							confirmButtonText: '确定',
							callback: () => {
								func();
							},
						});
					}
				});
		},
		//get请求
		request(method, url, token, data, func) {
			fetch(url, {
				method: method,
				data: typeof data === 'object' ? data : typeof data === 'function' ? ((func = data), null) : null,
				headers: {
					Authorization: `Bearer ${token}`,
					'content-type': 'application/json',
				},
			})
				.then((response) => response.json())
				.then((res) => {
					if (res.head.code == 200) {
						if (typeof func === 'function') {
							func(res);
						}
					} else if (res.head.code == 401) {
						this.$alert(res.head.message, '提示', {
							confirmButtonText: '确定',
							callback: () => {
								window.parent.parent.parent.postMessage({
									type: 'log_out',
								});
							},
						});
					} else {
						this.$alert(res.head.message, '提示', {
							confirmButtonText: '确定',
							callback: () => {
								func();
							},
						});
					}
				});
		},
		//查询会议室信息
		getMeetingRoomInfo() {
			if (!this.place_id) {
				return;
			}
			this.request('get', `${我是接口地址}/api-portal/room/search/${this.place_id}`, this.token, (res) => {
				if (res.head.code === 200) {
					this.place_name = res.data.roomName;
				}
			});
		},
		//从服务器查询配置详情
		getMeetingInfo() {
			if (!this.place_id) {
				return;
			}
			return new Promise((resolve, reject) => {
				this.request('get', `${我是接口地址}/api-portal/room/currentAndNextMeeting/${this.place_id}`, this.token, (res) => {
					if (res.head && res.head.code == 200) {
						this.roomMeetingInfo = res.data;
						this.next_meeting = res.data[1] ? res.data[1].theme : '无';
						this.theme = res.data[0] ? res.data[0].theme : '暂无进行中的会议';
						if (res.data[0]) {
							console.log(this.roomMeetingInfo);
							this.currentEndTime = Date.parse(res.data[0].endTime);
						}
						resolve('requestCompelete!');
					} else {
						reject('requestFailed!');
					}
				});
			});
		},
	},
});

//倒计时
// Vue.component('count_down', {
// 	template: `
//     <div class="count_down col_layout" :style="style(obj)">
//       <span class="title">本场会议结束时间</span>

//       <div class="time_box row_layout">
//         <div class="time row_layout">
//           <img src="./img/icon20.png" class="bg_img">
//           <div class="icon">
//             <img src="./img/icon21.png" class="bg_img">
//             <span>{{hh[0]}}</span>
//           </div>
//           <div class="icon">
//             <img src="./img/icon21.png" class="bg_img">
//             <span>{{hh[1]}}</span>
//           </div>
//         </div>

//         <div class="time row_layout">
//           <img src="./img/icon20.png" class="bg_img">
//           <div class="icon">
//             <img src="./img/icon21.png" class="bg_img">
//             <span>{{mm[0]}}</span>
//           </div>
//           <div class="icon">
//             <img src="./img/icon21.png" class="bg_img">
//             <span>{{mm[1]}}</span>
//           </div>
//         </div>

//         <div class="time row_layout">
//           <img src="./img/icon20.png" class="bg_img">
//           <div class="icon">
//             <img src="./img/icon21.png" class="bg_img">
//             <span>{{ss[0]}}</span>
//           </div>
//           <div class="icon">
//             <img src="./img/icon21.png" class="bg_img">
//             <span>{{ss[1]}}</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   `,
// 	mixins: [fn],
// 	computed: {
// 		duration() {
// 			let end = null;
// 			if (this.roomMeetingInfo && this.currentEndTime) {
// 				end = this.currentEndTime - Date.now();
// 			}
// 			console.log('结束：', end);
// 			return Math.round(+end / 1000);
// 		},
// 	},
// 	watch: {
// 		duration() {
// 			this.countDown();
// 		},
// 	},
// 	data() {
// 		return {
// 			place_id: this.obj.dataConfig.placeId,
// 			roomMeetingInfo: null, //会议室会议详情
// 			theme: '无', // 会议名
// 			currentEndTime: '',
// 			token: '',
// 			componentLoading: false,
// 			dd: '00',
// 			hh: '00',
// 			mm: '00',
// 			ss: '00',
// 			timer: null,
// 			curTime: 0,
// 			worker: null,
// 		};
// 	},
// 	async mounted() {
// 		this.worker = new Worker('../../dlc2/components/worker.js');
// 		this.get_token();
// 		await this.getMeetingInfo();
// 		window.addEventListener('message', function (event) {
// 			console.log(event.data);
// 		});
// 	},
// 	beforeDestroy() {
// 		this.getTime = null;
// 		this.worker = null;
// 	},
// 	methods: {
// 		//获取token
// 		get_token() {
// 			if (window.sessionStorage.token) {
// 				this.token = window.sessionStorage.token;
// 				return;
// 			}
// 			let temp = location.search.substring(1).split('&');
// 			console.log(temp);
// 			for (var i = 0; i < temp.length; i++) {
// 				let key = temp[i].split('=')[0];
// 				let value = temp[i].split('=')[1];
// 				if (key.indexOf('token') != -1) {
// 					this.token = value;
// 					window.sessionStorage.token = this.token;
// 				} else if (key.indexOf('pageflag' != -1)) {
// 					this.pageFlag = value;
// 				}
// 			}
// 			let url = location.href.split('?')[0];
// 			history.replaceState('', '', url);
// 			this.preparing = true;
// 		},
// 		//post请求
// 		requestPost(method, url, token, data, func) {
// 			fetch(url, {
// 				method: method,
// 				headers: {
// 					Authorization: `Bearer ${token}`,
// 					'content-type': 'application/json',
// 				},
// 				body: data,
// 			})
// 				.then((response) => response.json())
// 				.then((res) => {
// 					window.parent.postMessage({
// 						type: 'Popover mask',
// 						msg: '',
// 					});
// 					window.parent.postMessage({
// 						type: 'Loading off',
// 					});
// 					if (res.head.code == 200) {
// 						if (typeof func === 'function') {
// 							func(res);
// 						}
// 					} else if (res.head.code == 401) {
// 						this.$alert(res.head.message, '提示', {
// 							confirmButtonText: '确定',
// 							callback: () => {
// 								window.parent.parent.parent.postMessage({
// 									type: 'log_out',
// 								});
// 							},
// 						});
// 					} else {
// 						this.$alert(res.head.message, '提示', {
// 							confirmButtonText: '确定',
// 							callback: () => {
// 								func();
// 							},
// 						});
// 					}
// 				});
// 		},
// 		//get请求
// 		request(method, url, token, data, func) {
// 			fetch(url, {
// 				method: method,
// 				data: typeof data === 'object' ? data : typeof data === 'function' ? ((func = data), null) : null,
// 				headers: {
// 					Authorization: `Bearer ${token}`,
// 					'content-type': 'application/json',
// 				},
// 			})
// 				.then((response) => response.json())
// 				.then((res) => {
// 					if (res.head.code == 200) {
// 						if (typeof func === 'function') {
// 							func(res);
// 						}
// 					} else if (res.head.code == 401) {
// 						this.$alert(res.head.message, '提示', {
// 							confirmButtonText: '确定',
// 							callback: () => {
// 								window.parent.parent.parent.postMessage({
// 									type: 'log_out',
// 								});
// 							},
// 						});
// 					} else {
// 						this.$alert(res.head.message, '提示', {
// 							confirmButtonText: '确定',
// 							callback: () => {
// 								func();
// 							},
// 						});
// 					}
// 				});
// 		},

// 		countDown() {
// 			this.curTime = Date.now();
// 			this.getTime(this.duration);
// 		},
// 		getTime(duration) {
// 			let _this = this;
// 			if (duration < 0) {
// 				return;
// 			}
// 			const { dd, hh, mm, ss } = this.durationFormatter(duration);
// 			this.days = dd || 0;
// 			this.hours = hh || 0;
// 			this.mins = mm || 0;
// 			this.seconds = ss || 0;
// 			this.dd = dd ? `00${dd}`.slice(-2) : '00';
// 			this.hh = hh ? `00${hh}`.slice(-2) : '00';
// 			this.mm = mm ? `00${mm}`.slice(-2) : '00';
// 			this.ss = ss ? `00${ss}`.slice(-2) : '00';
// 			this.curTime = Date.now();
// 			this.worker.postMessage([duration, this.curTime]);
// 			this.worker.onmessage = function (e) {
// 				// console.log(e.data[0]);
// 				_this.getTime(e.data[0]);
// 			};
// 			// console.log(hh + ':' + mm + ':' + ss);
// 		},
// 		durationFormatter(time) {
// 			if (!time) return { ss: 0 };
// 			let t = time;

// 			const ss = t % 60;
// 			t = (t - ss) / 60;
// 			if (t < 1) return { ss };

// 			const mm = t % 60;
// 			t = (t - mm) / 60;
// 			if (t < 1) return { mm, ss };

// 			const hh = t % 24;
// 			t = (t - hh) / 24;
// 			if (t < 1) return { hh, mm, ss };

// 			const dd = t;
// 			return { dd, hh, mm, ss };
// 		},

// 		//从服务器查询配置详情
// 		getMeetingInfo() {
// 			return new Promise((resolve, reject) => {
// 				this.request('get', `${我是接口地址}/api-portal/room/currentAndNextMeeting/${this.place_id}`, this.token, (res) => {
// 					if (res.head && res.head.code == 200) {
// 						this.roomMeetingInfo = res.data;
// 						this.next_meeting = res.data[1] ? res.data[1].theme : '无';
// 						this.theme = res.data[0] ? res.data[0].theme : '暂无进行中的会议';
// 						if (res.data[0]) {
// 							console.log(this.roomMeetingInfo);
// 							this.currentEndTime = Date.parse(res.data[0].endTime);
// 						}
// 						resolve('requestCompelete!');
// 					} else {
// 						reject('requestFailed!');
// 					}
// 				});
// 			});
// 		},
// 	},
// });
//当前日期
Vue.component('current_date', {
	template: `
    <div class="current_date row_layout" :style="cus_style(obj)">
      <span style="margin-right: 20px;">{{currentTime}}</span>
      <span>{{weekDay}}</span>
    </div>
  `,
	mixins: [fn],
	data() {
		return {
			currentTime: '', //本地时间
			weekDay: '', //本地时间周几
			componentLoading: false,
		};
	},
	async mounted() {
		await this.getNowFormatDate();
	},
	methods: {
		getTime(duration) {
			let _this = this;
			if (duration < 0) {
				return;
			}
			const { dd, hh, mm, ss } = this.durationFormatter(duration);
			this.days = dd || 0;
			this.hours = hh || 0;
			this.mins = mm || 0;
			this.seconds = ss || 0;
			this.dd = dd ? `00${dd}`.slice(-2) : '00';
			this.hh = hh ? `00${hh}`.slice(-2) : '00';
			this.mm = mm ? `00${mm}`.slice(-2) : '00';
			this.ss = ss ? `00${ss}`.slice(-2) : '00';
			this.curTime = Date.now();
			this.worker.postMessage([duration, this.curTime]);
			this.worker.onmessage = function (e) {
				// console.log(e.data[0]);
				_this.getTime(e.data[0]);
			};
			// console.log(hh + ':' + mm + ':' + ss);
		},
		durationFormatter(time) {
			if (!time) return { ss: 0 };
			let t = time;

			const ss = t % 60;
			t = (t - ss) / 60;
			if (t < 1) return { ss };

			const mm = t % 60;
			t = (t - mm) / 60;
			if (t < 1) return { mm, ss };

			const hh = t % 24;
			t = (t - hh) / 24;
			if (t < 1) return { hh, mm, ss };

			const dd = t;
			return { dd, hh, mm, ss };
		},
		getNowFormatDate() {
			var date = new Date();
			var month = date.getMonth() + 1;
			var strDate = date.getDate();
			if (month >= 1 && month <= 9) {
				month = '0' + month;
			}
			if (strDate >= 0 && strDate <= 9) {
				strDate = '0' + strDate;
			}
			// 获取星期几
			const weeks = new Array('星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六');
			this.weekDay = weeks[new Date().getDay()];
			this.currentTime = date.getFullYear() + '年' + month + '月' + strDate + '日';
			return new Promise((resolve, reject) => {
				resolve(true);
			});
		},
		cus_style(obj) {
			let t = this.style(obj);
			if (obj.data.fontSize) {
				t.fontSize = Number(obj.data.fontSize) * this.radio + 'px';
			}
			if (obj.data.textColor) {
				t.color = obj.data.textColor;
			}
			return t;
		},
	},
});
