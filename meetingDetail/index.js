let url = `${我是接口地址}/`;
let meeting_url = `${url}api-portal/meeting`;
let download_summary_url = `${url}api-portal/meeting/summary/download`;
let save_summary_url = `${url}api-portal/meeting/summary`;
let add_file_url = `${url}api-portal/meeting/upload/files`;
let edit_file_url = `${url}api-portal/meeting/update/files`;
let user_url = `${url}api-auth/oauth/userinfo`; //获取当前登录用户信息
let end_meeting_url = `${url}api-portal/meeting/stop`; //结束会议

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			loading: false, //页面加载
			user_type: 0, //参会人栏筛选条件
			end_display: false, // 结束会议按钮显示
		},
		meeting_detail: {
			time: '', //时间
			place: '', //地点
			user: '', //主持人
			files: [], //附件
			// download: 0, //0表示不能导出会议纪要
			save: 0, //0表示不能显示和修改会议纪要
			qr_src: '', //
		},
		user_list: [], //参会人员列表
	},
	mounted() {
		if (!location.search) {
			this.id = sessionStorage.id;
			this.token = sessionStorage.token;
			this.prePage = sessionStorage.prePage; // 回退需要知道是哪个页面来的
		} else {
			this.get_token();
		}
		if (localStorage.hushanwebuserinfo) {
			let obj = JSON.parse(localStorage.hushanwebuserinfo);
			this.current_user = obj.id;
			this.get_data();
		} else {
			this.get_current_user();
		}
		let dom = document.querySelectorAll('.echart1');
		this.e1 = echarts.init(dom[0]);
		this.e2 = echarts.init(dom[1]);
		this.e3 = echarts.init(dom[2]);
		// console.log(this.tool.getConfig().toolbarKeys); // 查看默认配置键
		window.addEventListener('resize', this.resize);
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
				this.get_data();
			});
		},
		// 返回上一级
		goBack() {
			location.href = `${候工链接}?type=${this.prePage}&token=${this.token}`;
		},
		// 获取页面数据
		get_data() {
			this.html.loading = true;
			this.html.user_type = 0;
			for (let key in this.meeting_detail) {
				this.meeting_detail[key] = '';
			}
			this.user_list = [];
			this.request('get', `${meeting_url}/${this.id}`, this.token, (res) => {
				console.log('会议信息', res);
				this.html.loading = false;
				if (res.data.head.code != 200) {
					this.$message('无会议详情');
					return;
				}
				this.meeting_obj = res.data.data;
				// 会议信息
				let t = this.meeting_obj.startTime.split(' ');
				let t2 = t[1].substring(0, 5);
				let t3 = this.meeting_obj.endTime.split(' ')[1].substring(0, 5);
				this.meeting_detail.time = `${t[0]} ${t2} - ${t3}`;
				this.meeting_detail.place = this.meeting_obj.roomName;
				this.meeting_detail.user = this.meeting_obj.moderatorName;
				this.meeting_detail.files = this.meeting_obj.meetingFiles.length ? this.meeting_obj.meetingFiles : [];
				// 统计信息
				let reject = 0,
					join = 0,
					sign_in = 0,
					sign_out = 0,
					late = 0,
					no_late = 0;
				let sign_in2 = [],
					sign_out2 = [],
					no_reply = [],
					reply = [];
				for (let val of this.meeting_obj.users) {
					val.reply ? join++ : reject++;
					if (!val.signIn) {
						sign_out++;
						sign_out2.push(val);
					} else if (val.signIn == 1) {
						sign_in++;
						sign_in2.push(val);
					} else if (val.signIn == 2) {
						late++;
					} else {
						no_late++;
					}
					if (!val.reply) {
						no_reply.push(val);
					} else {
						reply.push(val);
					}
				}
				// 参会人员
				this.user_list.push(this.meeting_obj.users, sign_in2, sign_out2, no_reply, reply);
				// 会议纪要
				// this.meeting_detail.download = this.meeting_obj.status == 2 ? (this.meeting_obj.summary ? 1 : 0) : 0;
				this.meeting_detail.save = this.meeting_obj.summary ? 1 : 0;
				// 二维码
				this.meeting_detail.qr_src = this.meeting_obj.qrCodeUrl;
				// 图表
				let data1 = [
					{ value: join, name: '参加' },
					{ value: reject, name: '不参加' },
				];
				let data2 = [
					{ value: sign_in, name: '签到' },
					{ value: sign_out, name: '未签到' },
				];
				let data3 = [
					{ value: late, name: '迟到' },
					{ value: no_late, name: '未迟到' },
				];
				let option = {
					legend: {
						bottom: '5%',
						right: '10%',
						orient: 'vertical',
					},
					series: [
						{
							type: 'pie',
							radius: ['60%', '70%'],
							center: ['30%', '50%'],
							label: {
								show: false,
								position: 'center',
							},
							emphasis: {
								label: {
									show: true,
									fontSize: '20',
									fontWeight: 'bold',
									color: '#000',
									formatter: '{c}',
								},
							},
						},
					],
				};
				option.series[0].data = data1;
				this.e1.setOption(option);
				option.series[0].data = data2;
				option.color = ['#FAFF75', '#01B4FF'];
				this.e2.setOption(option);
				option.series[0].data = data3;
				option.color = ['#FFA500', '#48D1CC'];
				this.e3.setOption(option);
				this.end_meeting_show();
				this.$nextTick(() => {
					// 编辑器
					if (this.meeting_detail.save) {
						if (!this.already_create) {
							this.init_editor();
							this.already_create = true;
						}
						this.editor.setHtml(this.meeting_obj.content || '');
					}
				});
			});
		},
		// 下载会议附件
		download_files(file) {
			axios({
				method: 'get',
				url: file.fileUrl,
				responseType: 'blob',
				headers: { Authorization: `Bearer ${this.token}` },
			}).then((res) => {
				let a = document.createElement('a');
				let href = URL.createObjectURL(res.data);
				a.href = href;
				a.target = '_blank';
				a.download = file.fileName;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(href);
			});
		},
		// 下载会议纪要
		download_summary() {
			axios({
				method: 'get',
				url: `${download_summary_url}/${this.meeting_obj.id}`,
				responseType: 'blob',
				headers: { Authorization: `Bearer ${this.token}` },
			}).then((res) => {
				let a = document.createElement('a');
				let href = URL.createObjectURL(res.data);
				a.href = href;
				a.target = '_blank';
				let filename;
				let t = res.headers['content-disposition'].replace(/\s/g, '').split(';');
				for (let val of t) {
					if (val.match(/^filename/) != null) {
						filename = decodeURIComponent(val.split('=')[1]);
					}
				}
				a.download = filename || '';
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(href);
			});
		},
		// 保存会议纪要
		save_summary(type) {
			if (type) {
				// 提交完重新获取会议详情 并关闭弹窗
				this.$confirm('提交后不能再进行修改，是否继续？', '提示', {
					confirmButtonText: '确定',
					cancelButtonText: '取消',
					type: 'warning',
				}).then(() => {
					this.request('post', save_summary_url, this.token, { content: this.editor.getHtml(), id: this.meeting_obj.id, opType: 1 });
				});
			} else {
				this.request('post', save_summary_url, this.token, { content: this.editor.getHtml(), id: this.meeting_obj.id, opType: 0 });
			}
		},
		// 初始化编辑器
		init_editor() {
			let { createEditor, createToolbar } = window.wangEditor;
			this.config = {
				placeholder: 'Type here...',
				onChange(editor) {
					let html = editor.getHtml();
					console.log('editor content', html);
				},
			};
			this.editor = createEditor({
				selector: '#editor_input',
				html: '<p><br></p>',
				config: this.config,
				mode: 'simple',
			});
			let toolbarConfig = {
				toolbarKeys: [
					'blockquote',
					'header1',
					'header2',
					'header3',
					'|',
					'bold',
					'underline',
					'italic',
					'through',
					'color',
					'bgColor',
					'clearStyle',
					'|',
					'bulletedList',
					'numberedList',
					'todo',
					'justifyLeft',
					'justifyRight',
					'justifyCenter',
					'|',
					'undo',
					'redo',
				],
			};
			this.tool = createToolbar({
				editor: this.editor,
				selector: '#editor_tool',
				config: toolbarConfig,
				mode: 'simple',
			});
		},
		// 伸缩页面
		resize() {
			this.e1.resize();
			this.e2.resize();
		},
		// 触发选择文件
		click_add() {
			add_file.click();
		},
		// 添加附件
		add_file() {
			let file = add_file.files[0];
			let f = new FormData();
			f.append('file', file);
			this.html.loading = true;
			axios({
				method: 'post',
				url: add_file_url,
				data: f,
				headers: {
					Authorization: `Bearer ${this.token}`,
					'content-type': 'multipart/form-data',
				},
			}).then((res) => {
				if (res.data.head.code != 200) {
					return;
				}
				let f = [];
				for (let val of this.meeting_detail.files) {
					f.push(val);
				}
				res.data.data.meetingId = this.id;
				f.push(res.data.data);
				this.request('post', edit_file_url, this.token, { id: this.id, meetingFiles: f }, (res) => {
					this.html.loading = false;
					if (res.data.head.code != 200) {
						return;
					}
					this.get_data();
				});
				// this.get_data();
			});
		},
		// 删除附件
		del_file(obj) {
			let f = [];
			for (let val of this.meeting_detail.files) {
				if (val.fileId !== obj.fileId) {
					f.push(val);
				}
			}
			this.html.loading = true;
			this.request('post', edit_file_url, this.token, { id: this.id, meetingFiles: f }, (res) => {
				this.html.loading = false;
				if (res.data.head.code != 200) {
					return;
				}
				this.get_data();
			});
		},
		// 结束会议是否显示
		end_meeting_show() {
			if ((this.current_user == this.meeting_obj.createUser || this.current_user == this.meeting_obj.moderatorId) && this.meeting_obj.status === 1) {
				// 进行中且是当前用户才显示
				this.html.end_display = true;
			} else {
				this.html.end_display = false;
			}
		},
		// 结束会议
		end_meeting() {
			this.$confirm('确认结束会议？', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning',
				center: true,
			}).then(() => {
				this.html.loading = true;
				this.request('put', `${end_meeting_url}/${this.id}`, this.token, (res) => {
					this.html.loading = false;
					if (res.data.head.code != 200) {
						return;
					}
					this.get_data();
				});
			});
		},
	},
});
