let url = `${我是接口地址}/`;
let material_search_url = `${url}api-file/doc/catalogue/shareMaterial/search`;
let upload_file_url = `${url}api-file/doc/file/chunk/create`;
let del_material_url = `${url}api-file/doc/file/delete`;
let device_list_url = `${url}api-portal/video/search/liveDevice`;
let publish_url = `${url}api-portal/video/rule/saveOrUpdate`;

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			search: '', // 搜索框
			page_loading: false, // 页面加载
			load_text: '', // 加载提示文字
		},
		table: {
			h: 0,
			data: [], //表格数据
			total: 0, // 数据总数
			page_size: 10, //单页显示数量
		},
		form: {
			show: false, //发布表单显示
			loading: false, //表单加载
			name: '', // 计划名
			start_time: '', //直播开始时间
			end_time: '', //直播结束时间
			device_list: [], //设备列表
			rules: {
				name: [{ required: true, message: '请输入计划名称', trigger: 'blur' }],
				end_time: [{ type: 'date', required: true, message: '请选择时间', trigger: 'change' }],
				device: [{ required: true, message: '请选择设备', trigger: 'change' }],
			},
			props: {
				value: 'id',
				label: 'nodeName',
				children: 'children',
				multiple: true,
			},
		},
	},
	mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
		} else {
			this.get_token();
		}
		this.get_data(1);
		this.resize();
		window.onresize = () => {
			this.resize();
		};
	},
	methods: {
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
		get_data(page) {
			this.html.page_loading = true;
			this.request('post', material_search_url, this.token, { pageNum: page, pageSize: this.table.page_size, keyword: this.html.search }, (res) => {
				console.log('素材', res);
				this.html.page_loading = false;
				if (res.data.head.code != 200) {
					this.table.total = 0;
					return;
				}
				let data = res.data.data;
				this.table.total = data.total;
				this.table.data = data.data;
			});
		},
		select_file() {
			select_file.click();
		},
		upload_file() {
			Upload({
				id: 'select_file',
				small_file_slice_size: 5,
				large_file_slice_size: 50,
				upload_url: `${upload_file_url}/-1`,
				token: this.token,
				fail_count: 3,
				uploadStart: () => {
					this.html.page_loading = true;
					this.html.load_text = '读取完成，准备开始上传';
				},
				uploadFail: (index) => {
					this.html.load_text = `重试第${index}次`;
					if (index == 3) {
						this.html.page_loading = false;
					}
				},
				uploadProgress: (cur, total) => {
					let per = Math.floor((cur / total) * 1000 + 0.5) / 10;
					this.html.load_text = `上传进度：${per}%`;
				},
				uploadSuccess: () => {
					this.html.load_text = `上传成功`;
					setTimeout(() => {
						this.get_data(1);
					}, 1000);
				},
				readStart: () => {
					this.html.page_loading = true;
					this.html.load_text = '当前文件较大，读取中请耐心等待...';
				},
				readProgress: (cur, total) => {
					this.html.load_text = `读取进度：${cur}/${total}`;
				},
			});
		},
		// 删除素材
		del_material(row_obj) {
			this.$confirm('此操作将永久删除该文件, 是否继续?', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning',
				center: true,
			}).then(() => {
				this.request('post', del_material_url, this.token, [row_obj.id], (res) => {
					this.get_data(1);
				});
			});
		},
		// 下载素材
		download_material(row_obj) {
			axios({
				method: 'get',
				url: row_obj.fileUrl,
				responseType: 'blob',
				header: {
					Authorization: `Bearer ${this.token}`,
					'Content-Type': 'application/x-download',
				},
			}).then((res) => {
				// let b = new Blob([res.data]);
				let a = document.createElement('a');
				let href = URL.createObjectURL(res.data);
				a.download = row_obj.fileName;
				a.href = href;
				a.target = '_blank';
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(href);
			});
		},
		// 发布素材
		publish_show(row_obj) {
			this.material_id = row_obj.id;
			this.form.show = true;
			this.form.loading = true;
			this.request('get', device_list_url, this.token, (res) => {
				console.log('设备列表', res);
				this.form.loading = false;
				if (res.data.head.code != 200) {
					this.$message('设备获取失败');
					return;
				}
				this.form.device_list = res.data.data;
			});
		},
		publish_submit(form) {
			this.$refs.form.validate((result) => {
				if (result) {
					let data = {
						planName: form.name,
						pullDeviceIds: [],
						sourceType: 2, //2表示公共素材
						sourceId: this.material_id,
					};
					for (let val of form.device) {
						data.pullDeviceIds.push(val[val.length - 1]);
					}
					if (form.start_time === '') {
						data.pushStartExecuteTime = '';
					} else {
						let t = form.start_time;
						data.pushStartExecuteTime = `${t.getFullYear()}-${t.getMonth() + 1 < 10 ? '0' + (t.getMonth() + 1) : t.getMonth + 1}-${t.getDate() < 10 ? '0' + t.getDate() : t.getDate()} ${
							t.toString().split(' ')[4]
						}`;
					}
					let t2 = form.end_time;
					data.pushEndExecuteTime = `${t2.getFullYear()}-${t2.getMonth() + 1 < 10 ? '0' + (t2.getMonth() + 1) : t2.getMonth + 1}-${t2.getDate() < 10 ? '0' + t2.getDate() : t2.getDate()} ${
						t2.toString().split(' ')[4]
					}`;
					this.form.loading = true;
					this.request('post', publish_url, this.token, data, (res) => {
						this.form.loading = false;
						if (res.data.head.code != 200) {
							this.$message.error('发布失败');
							return;
						}
						this.form.show = false;
						this.get_data(1);
					});
				}
			});
		},
		// 预约日期不能是当天之前的
		date_options() {
			return {
				disabledDate(curr_time) {
					return curr_time.getTime() < Date.now() - 86400000;
				},
			};
		},
	},
});
