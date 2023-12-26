let url = `${我是接口地址}/`;
let firmware_list_url = `${url}api-device/firmware/page`;
let product_list_url = `${url}api-device/product/all`;
let edit_firmware_url = `${url}api-device/firmware`;
let upload_firmware_url = `${url}api-device/firmware/upload`;
let upgrade_url = `${url}api-device/firmware/update`;
let del_firmware_url = `${url}api-device/firmware/delete`;
let export_firmware_url = `${url}api-device/firmware/export`;
let device_list_url = `${url}api-device/device/search`;
let limits_url = `${url}api-user/menus/current`; //获取菜单权限
let history_url = `${url}api-device/firmware/upgrade-record`; // 查询升级历史
let history_task_url = `${url}api-device/firmware/upgrade-record/details`; // 查询升级历史详情

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			search: '', //搜索框
			product_selected: '', //选择显示某产品下固件列表
			table_h: 0, //表格最大高度
			firmware_display: false, //创建固件版本弹窗
			popover_loading: false, //弹窗加载遮罩
			page_loading: true, //页面加载
			upgrade_display: false, //固件升级设备弹窗
			tips: '设备之前可能有传输中断的升级文件，选是则会把文件从头开始传',
			fail_c: 0, //上传失败次数
			fail_t: 3, //最多进行3次尝试
		},
		product_list: [], //产品列表
		firmware_list: [], //固件列表
		firmware_total: 0, //固件信息条数
		firmware_cur_page: 1, // 分页当前页
		firmware_form: {
			product: '', //产品id
			name: '', //固件名称
			ver: '', //md5
			file_name: '', //文件名
			load_text: '', //遮罩显示内容
			model: 0, // 模式 0分片 1链接
		},
		firmware_rules: {
			product: [{ required: true, message: '请选择关联产品', trigger: 'change' }],
			name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
			file: { show: false, message: '必须选择文件' },
		},
		upgrade_form: {
			size: '', //文件传到设备切片大小
			force: false, //强制从第一片开始传
			list: [], //同产品的设备
			total: 0, //设备总数
			page_size: 10, //单页显示设备数
			cur_page: 1, //当前页
			search: '', //升级搜索设备
			type: 0, //0分片 1链接
		},
		upgrade_rules: {
			size: [
				{ required: true, message: '请输入切片大小', trigger: 'blur' },
				{ pattern: /\d+/, message: '只能输入整数数字', trigger: 'blur' },
			],
			select: { show: false, message: '至少选择一台设备' },
		},
		add_or_edit: '', //区分新增还是编辑 同时影响页面渲染
		config: {
			update_show: false,
			del_show: false,
			edit_show: false,
			export_show: false,
			create_show: false,
			history_show: true, //升级历史
		},
		history: {
			show: false, // 升级历史显示
			time_range: null, //时间范围
			type: 2, // 按模式检索 0分片 1链接 2全部
			type_options: [
				{ label: '全部', value: 2 },
				{ label: '分片', value: 0 },
				{ label: '链接', value: 1 },
			],
			task_list: [], //任务列表
			task_cur: 1, //任务列表当前页
			task_total: 0, //任务总数
			task_d_show: false, //任务详情显示
			task_d_cur: 1, //任务详情当前页
			task_d_total: 0, //任务详情总数
			device_list: [], // 单条任务下设备列表
		},
	},
	async mounted() {
		if (!location.search) {
			this.token = window.sessionStorage.token;
		} else {
			this.get_token();
		}
		if (!sessionStorage.hushanwebmenuTree) {
			await new Promise((success) => {
				this.request('get', limits_url, this.token, (res) => {
					success();
					if (res.data.head.code !== 200) {
						return;
					}
					sessionStorage.hushanwebmenuTree = JSON.stringify(res.data.data.menuTree);
				});
			});
		}
		// 解析权限树
		let limits;
		for (let val of JSON.parse(sessionStorage.hushanwebmenuTree)) {
			if (val.path === '开发者中心') {
				for (let val2 of val.subMenus) {
					if (val2.path === '开发者中心_升级管理') {
						limits = val2.subMenus;
						break;
					}
				}
				break;
			}
		}
		this.config.update_show = this.is_element_show(limits, '升级');
		this.config.del_show = this.is_element_show(limits, '删除');
		this.config.edit_show = this.is_element_show(limits, '编辑');
		this.config.export_show = this.is_element_show(limits, '导出文件');
		this.config.create_show = this.is_element_show(limits, '创建固件');

		this.get_product_list();
		this.get_firmware_list();
		// mounted只是挂载节点 元素还没渲染前大小都是0
		window.addEventListener('resize', () => {
			this.table_height();
		});
		this.$nextTick(() => {
			this.table_height();
		});
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
		// 获取产品列表
		get_product_list() {
			this.request('post', product_list_url, this.token, { condition: {}, pageNum: 1, pageSize: 1000 }, (res) => {
				console.log('产品列表', res);
				if (res.data.head.code != 200) {
					return;
				}
				this.product_list = res.data.data.data;
			});
		},
		// 获取固件版本列表
		get_firmware_list(cur_page) {
			let data = {
				pageSize: 20,
				keyword: this.html.search,
				condition: {},
			};
			if (typeof cur_page === 'number') {
				data.pageNum = cur_page;
			} else {
				data.pageNum = 1;
			}
			if (this.html.product_selected) {
				data.condition.productId = this.html.product_selected;
			}
			this.html.page_loading = true;
			this.request('post', firmware_list_url, this.token, data, (res) => {
				console.log('固件列表', res);
				this.firmware_list = [];
				this.html.page_loading = false;
				if (res.data.head.code != 200) {
					return;
				}
				let data = res.data.data;
				this.firmware_total = data.total;
				this.firmware_cur_page = cur_page;
				this.firmware_list = data.data;
			});
		},
		// 表格最大高度
		table_height() {
			this.html.table_h = document.querySelector('.table_box').offsetHeight;
		},
		// 创建固件版本
		add_firmware() {
			this.add_or_edit = 'add';
			for (let key in this.firmware_form) {
				if (typeof this.firmware_form[key] == 'number') {
					this.firmware_form[key] = 0;
				} else {
					this.firmware_form[key] = '';
				}
			}
			this.firmware_rules.file.show = false;
			this.html.firmware_display = true;
		},
		// 编辑固件版本
		edit_firmware(row_obj) {
			if (!this.config.edit_show) {
				this.$message.error('没权限操作');
				return;
			}
			this.add_or_edit = 'edit';
			this.firmware_form.name = row_obj.firmwareName;
			this.firmware_form.ver = row_obj.firmwareVersion;
			this.firmware_id = row_obj.id;
			this.firmware_form.product = row_obj.productId;
			this.firmware_form.file_name = row_obj.firmwareUrl;
			this.firmware_rules.file.show = false;
			this.html.firmware_display = true;
			this.firmware_form.model = row_obj.upgradeMode || 0;
		},
		// 固件信息提交
		firm_sub(form_name) {
			this.$refs[form_name].validate((result) => {
				let result2 = true;
				if (this.add_or_edit == 'add' && select_file.files.length == 0) {
					result2 = false;
				}
				this.firmware_rules.file.show = !result2;
				if (result && result2) {
					this.html.popover_loading = true;
					if (this.add_or_edit == 'edit') {
						this.firmware_form.load_text = `等待服务器返回结果`;
						let data = {
							firmwareName: this.firmware_form.name,
							productId: this.firmware_form.product,
							id: this.firmware_id,
							upgradeMode: this.firmware_form.model,
						};
						this.request('put', edit_firmware_url, this.token, data, (res) => {
							this.html.popover_loading = false;
							if (res.data.head.code == 200) {
								this.html.firmware_display = false;
								this.html.search = '';
								this.html.product_selected = '';
								this.get_firmware_list();
							}
						});
					} else {
						let index = 0; //slice_list索引
						this.firmware_form.load_text = `开始上传`;
						setTimeout(() => {
							this.firmware_form.load_text = `上传进度：0%`;
						}, 500);
						this.slice_upload(index);
					}
				}
			});
		},
		// 触发input
		select_file() {
			select_file.click();
		},
		// 选完文件后填充表单 先生成MD5才能进行上传
		file_selected() {
			this.html.popover_loading = true;
			this.firmware_form.load_text = `正在读取文件...`;
			this.file = select_file.files[0];
			let data_stream = new FileReader();
			// 以50M为分隔 小于50M的直接读取 大于的则切片后再合并计算MD5
			let max_size = 1024 * 1024 * 50;
			this.file_size = this.file.size;
			this.slice_list = [];
			if (this.file_size <= max_size) {
				this.slice_size = 1024 * 1024 * 5;
				this.slice_total = Math.ceil(this.file_size / this.slice_size);
				for (let i = 0; i < this.slice_total; i++) {
					let t = this.file.slice(this.slice_size * i, this.slice_size * (i + 1));
					this.slice_list.push(t);
				}
				data_stream.readAsBinaryString(this.file);
				data_stream.onload = (e) => {
					this.firmware_form.ver = SparkMD5.hashBinary(e.target.result);
					this.html.popover_loading = false;
				};
			} else {
				this.firmware_form.load_text = '上传文件过大，读取速度较慢，请耐心等待...';
				this.slice_size = max_size;
				this.slice_total = Math.ceil(this.file_size / this.slice_size);
				for (let i = 0; i < this.slice_total; i++) {
					let t = this.file.slice(this.slice_size * i, this.slice_size * (i + 1));
					this.slice_list.push(t);
				}
				let spark = new SparkMD5.ArrayBuffer();
				let index = 0;
				this.large_file_md5(index, spark);
			}
			this.firmware_form.file_name = this.file.name;
		},
		// 大文件读取分段加入数组缓存 最后合并计算MD5
		large_file_md5(index, spark) {
			let r = new FileReader();
			r.readAsArrayBuffer(this.slice_list[index]);
			this.firmware_form.load_text = `读取进度：${++index}/${this.slice_total}`;
			r.onload = (e) => {
				spark.append(e.target.result);
				if (index < this.slice_total) {
					this.large_file_md5(index, spark);
				} else {
					this.firmware_form.ver = spark.end();
					this.html.popover_loading = false;
				}
			};
		},
		// 下来菜单点击事件
		other_operate(command, row_obj) {
			switch (command) {
				case 'export':
					axios({
						method: 'get',
						url: `${export_firmware_url}/${row_obj.id}`,
						// responseType: 'blob',
						headers: {
							Authorization: `Bearer ${this.token}`,
							// 'Content-Type': 'application/x-download',
						},
					}).then((res) => {
						console.log('下载', res);
						// let b = new Blob([res.data]);
						// let a = document.createElement('a');
						// let href = URL.createObjectURL(b);
						// a.href = href;
						// a.target = '_blank'; //空白页打开
						// a.download = href.split('/').pop(); //返回被删除末尾元素
						// document.body.appendChild(a);
						// a.click();
						// document.body.removeChild(a);
						// let t = res.data.match(/server:\s*"https:\/\/\d{3}\.\d{1,3}.\d{1,3}.\d{1,3}\/\S+"/);
						// let t2 = t[0].replace(/\s/g, '');
						// let url = t2.substring(8, t2.length - 1);
						if (res.data.head) {
							window.open(res.data.head.message);
						}
					});
					break;
				case 'upgrade':
					// 升级时分链接还是分片
					this.upgrade_form.type = row_obj.upgradeMode;
					for (let key in this.upgrade_form) {
						if (typeof this.upgrade_form[key] == 'string') {
							this.upgrade_form[key] = '';
						} else if (typeof this.upgrade_form[key] == 'boolean') {
							this.upgrade_form[key] = false;
						} else if (typeof this.upgrade_form[key] == 'object') {
							this.upgrade_form[key] = [];
						}
					}
					this.firmware_id = row_obj.id;
					this.product_id = row_obj.productId; //记录当前查看的产品
					this.get_product_device_list(1);
					this.upgrade_rules.select.show = false;
					this.html.upgrade_display = true;
					break;
				case 'del':
					this.$confirm('确认删除该固件信息？', '提示', {
						confirmButtonText: '确定',
						cancelButtonText: '取消',
						type: 'info',
						center: true,
					}).then(() => {
						this.html.page_loading = true;
						this.request('delete', `${del_firmware_url}/${row_obj.id}`, this.token, (res) => {
							this.html.page_loading = false;
							if (res.data.head.code == 200) {
								this.html.search = '';
								this.html.product_selected = '';
								this.get_firmware_list();
							}
						});
					});
					break;
			}
		},
		// 升级固件提交
		up_sub(form_name) {
			this.$refs[form_name].validate((result) => {
				let result2 = true;
				if (!this.update_select?.length) {
					// 字段不存在或者长度为0
					result2 = false;
				}
				this.upgrade_rules.select.show = !result2;
				if (result && result2) {
					this.html.popover_loading = true;
					this.request(
						'post',
						upgrade_url,
						this.token,
						{
							chunkSizeKB: this.upgrade_form.size,
							deviceIds: this.update_select.map((e) => e.id),
							firmwareId: this.firmware_id,
							force: this.upgrade_form.force,
						},
						(res) => {
							this.html.popover_loading = false;
							if (res.data.head.code == 200) {
								this.html.upgrade_display = false;
							}
						}
					);
				}
			});
		},
		// 切片上传文件
		slice_upload(index) {
			let form_obj = new FormData();
			// form_obj.append('file_chunksize', slice_list[index].byteLength);
			form_obj.append('file_chunksize', this.slice_list[index].size);
			form_obj.append('file_data', this.slice_list[index]);
			form_obj.append('file_index', index + 1);
			form_obj.append('file_md5', this.firmware_form.ver);
			form_obj.append('file_name', this.firmware_form.file_name);
			form_obj.append('file_size', this.file_size);
			let t = this.firmware_form.file_name.split('.');
			form_obj.append('file_suffix', t[t.length - 1]);
			form_obj.append('file_total', this.slice_total);
			//每个切片的MD5
			let r = new FileReader();
			r.readAsBinaryString(this.slice_list[index]);
			r.onload = (e) => {
				// FileReader是异步 所以要等读取完才发送请求
				form_obj.append('fileChunkMd5', SparkMD5.hashBinary(e.target.result));
				this.request('post', upload_firmware_url, this.token, form_obj, (res) => {
					if (res.data.head.code != 200) {
						this.firmware_form.load_text = '上传失败，将重新上传，请耐心等待';
						if (++this.html.fail_c == fail_t) {
							this.firmware_form.load_text = '重试上传失败';
							this.html.fail_c = 0;
							return;
						}
						this.firm_sub('firmware_form');
						return;
					}
					let per = Math.floor(((index + 1) / this.slice_total) * 100 * 10 + 0.5) / 10;
					this.firmware_form.load_text = `上传进度：${per}%`;
					if (++index < this.slice_total) {
						this.slice_upload(index);
					} else {
						this.firmware_form.load_text = `上传完成`;
						setTimeout(() => {
							this.firmware_form.load_text = `等待服务器返回结果`;
						}, 500);
						// 先上传文件 传完后再更新固件信息
						let data = {
							firmwareByteLength: res.data.data.firmwareByteLength,
							firmwareName: this.firmware_form.name,
							firmwareVersion: res.data.data.firmwareVersion,
							partCount: res.data.data.partCount,
							productId: this.firmware_form.product,
							upgradeMode: this.firmware_form.model,
						};
						this.request('post', edit_firmware_url, this.token, data, (res) => {
							this.html.popover_loading = false;
							if (res.data.head.code == 200) {
								this.html.firmware_display = false;
								this.html.search = '';
								this.html.product_selected = '';
								this.get_firmware_list();
							}
						});
					}
				});
				form_obj = null;
			};
		},
		// 获取同一产品下在线设备列表
		get_product_device_list(params) {
			this.html.popover_loading = true;
			this.upgrade_form.cur_page = params;
			this.request(
				'post',
				device_list_url,
				this.token,
				{ condition: { productId: this.product_id, statusValue: 1 }, pageNum: params, pageSize: this.upgrade_form.page_size, keyword: this.upgrade_form.search },
				(res) => {
					console.log('同一产品设备', res);
					this.html.popover_loading = false;
					if (res.data.head.code != 200) {
						return;
					}
					this.upgrade_form.list = res.data.data.data;
					this.upgrade_form.total = res.data.data.total;
				}
			);
		},
		// 升级勾选设备事件
		select_device(val) {
			this.update_select = val;
		},
		// 升级历史查询
		async update_history(page) {
			this.history.show = true;
			this.html.popover_loading = true;
			let body = {
				pageNum: page,
				pageSize: 20,
				condition: {},
			};
			// 时间选择器置空时为null
			if (this.history.time_range?.length) {
				let s = this.history.time_range[0];
				body.condition.startTime = `${s.getFullYear()}-${s.getMonth() + 1}-${s.getDate()} ${s.toString().split(' ')[4]}`;
				let e = this.history.time_range[1];
				body.condition.endTime = `${e.getFullYear()}-${e.getMonth() + 1}-${e.getDate()} ${e.toString().split(' ')[4]}`;
			}
			if (this.history.type !== 2) {
				body.condition.upgradeMode = this.history.type;
			}
			let { data: res } = await this.request('post', history_url, this.token, body);
			this.html.popover_loading = false;
			if (res.head.code !== 200) {
				return;
			}
			this.history.task_cur = page;
			this.history.task_total = res.data.total;
			this.history.task_list = res.data.data;
		},
		// 查看任务详情
		async task_detail(page, task_id, firmwareId) {
			this.history.device_list = [];
			this.history.task_d_show = true;
			// 如果传了id就记录下
			if (task_id) {
				this.task_id = task_id;
			}
			// 保存固件id用于重试
			if (firmwareId) {
				this.firmwareId = firmwareId;
			}
			let body = {
				pageNum: page,
				pageSize: 20,
				condition: {
					upgradeId: this.task_id,
				},
			};
			let { data: res } = await this.request('post', history_task_url, this.token, body);
			if (res.head.code !== 200) {
				return;
			}
			this.history.task_d_cur = page;
			this.history.task_d_total = res.data.total;
			this.history.device_list = res.data.data;
		},
		// 设备任务重试
		async task_retry(deviceId) {
			let res1 = await this.$confirm('确定重新升级？', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'info',
				center: true,
			}).then(
				() => true,
				() => false
			);
			if (!res1) {
				return;
			}
			let { data: res2 } = await this.request('post', upgrade_url, this.token, { isRetry: true, upgradeId: this.task_id, deviceIds: [deviceId], firmwareId: this.firmwareId });
			if (res2.head.code == 200) {
				this.$message.success('重试成功');
				// 重试后刷新列表
				this.task_detail(1);
			} else {
				this.$message.error('重试失败');
			}
		},
	},
});
